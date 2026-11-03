'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { DashboardStats } from '../api';

type Point = DashboardStats['series'][number];

const HEIGHT = 260;
const M = { top: 14, right: 16, bottom: 30, left: 38 };

const dayShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDay = (iso: string, long = false) => (long ? dayLong : dayShort).format(new Date(`${iso}T00:00:00Z`));

/** Axis maximum with 4 equal integer steps (counts are whole numbers). */
function niceScale(max: number) {
  const raw = Math.max(1, max) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow);
  return { step, top: step * 4 };
}

/**
 * Patients added per day: ONE series on ONE axis. Hand-built SVG, so every mark follows the spec
 * (2px line, 10% wash, hairline solid grid, 8px end-dot with a 2px surface ring) and the whole
 * hover layer is ours: a crosshair snapped to the nearest day plus one tooltip, also on keyboard.
 */
export function PatientsAreaChart({ series }: { series: Point[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series.length;
  const geo = useMemo(() => {
    const iw = width - M.left - M.right;
    const ih = HEIGHT - M.top - M.bottom;
    const { step, top } = niceScale(Math.max(0, ...series.map((p) => p.count)));
    const x = (i: number) => M.left + (n <= 1 ? 0 : (i * iw) / (n - 1));
    const y = (v: number) => M.top + ih - (v / top) * ih;
    const base = M.top + ih;
    const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join('');
    const area = `${line}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z`;
    const ticks = Array.from({ length: 5 }, (_, i) => i * step);
    const labelCount = width < 480 ? 4 : 7;
    const labelIdx = [...new Set(Array.from({ length: labelCount }, (_, i) => Math.round((i * (n - 1)) / (labelCount - 1))))];
    return { iw, ih, x, y, base, line, area, ticks, labelIdx };
  }, [series, n, width]);

  const total = series.reduce((s, p) => s + p.count, 0);
  const peak = series.reduce((best, p) => (p.count > best.count ? p : best), series[0] ?? { date: '', count: 0 });
  const summary = `Patients added per day. ${total} in total${total ? `, peak of ${peak.count} on ${fmtDay(peak.date)}` : ''}.`;

  const indexFromPointer = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    return Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1))));
  };

  const onKey = (e: KeyboardEvent) => {
    const cur = active ?? n - 1;
    const next = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  };

  const pt = active !== null ? series[active] : undefined;
  const flip = active !== null && geo.x(active) > width / 2;

  return (
    <div>
      <div
        ref={wrap}
        className="relative outline-offset-4"
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to read each day.`}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={HEIGHT} role="img" aria-label={summary} className="block overflow-visible">
          {/* Hairline, solid, recessive grid */}
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={geo.y(t)} y2={geo.y(t)} stroke={t === 0 ? 'var(--color-line-strong)' : 'var(--color-line)'} strokeWidth={1} />
              <text x={M.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="tabular" fill="var(--color-ink-subtle)" fontSize={12}>
                {t}
              </text>
            </g>
          ))}
          {geo.labelIdx.map((i) => (
            <text key={i} x={geo.x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fill="var(--color-ink-subtle)" fontSize={12}>
              {fmtDay(series[i]!.date)}
            </text>
          ))}

          <path d={geo.area} fill="var(--color-primary-600)" fillOpacity={0.1} />
          <path d={geo.line} fill="none" stroke="var(--color-primary-600)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* End marker (>= 8px, 2px surface ring) when nothing is hovered */}
          {active === null && n > 0 && (
            <circle cx={geo.x(n - 1)} cy={geo.y(series[n - 1]!.count)} r={4} fill="var(--color-primary-600)" stroke="var(--color-surface)" strokeWidth={2} />
          )}

          {active !== null && pt && (
            <g pointerEvents="none">
              <line x1={geo.x(active)} x2={geo.x(active)} y1={M.top} y2={geo.base} stroke="var(--color-ink-subtle)" strokeWidth={1} />
              <circle cx={geo.x(active)} cy={geo.y(pt.count)} r={4.5} fill="var(--color-primary-600)" stroke="var(--color-surface)" strokeWidth={2} />
            </g>
          )}

          {/* Hit layer: wider than any mark, finds the nearest day */}
          <rect
            x={M.left}
            y={M.top}
            width={geo.iw}
            height={geo.ih}
            fill="transparent"
            onPointerMove={(e) => setActive(indexFromPointer(e))}
            onPointerDown={(e) => setActive(indexFromPointer(e))}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          />
        </svg>

        {pt && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-input border border-line bg-surface px-3 py-2 shadow-float"
            style={{ left: geo.x(active), transform: `translateX(${flip ? 'calc(-100% - 12px)' : '12px'})` }}
          >
            <p className="text-xs text-ink-muted">{fmtDay(pt.date, true)}</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full bg-primary-600" aria-hidden />
              <span className="tabular text-sm font-semibold">{pt.count}</span>
              <span className="text-xs text-ink-muted">{pt.count === 1 ? 'patient' : 'patients'}</span>
            </p>
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {pt ? `${fmtDay(pt.date, true)}: ${pt.count} patients` : ''}
        </span>
      </div>

      {/* Table view: every value is reachable without hovering */}
      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 text-[13px] font-medium text-primary-700 hover:bg-primary-600/10">
          View data as table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-input border border-line">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Patients added per day</caption>
            <thead className="sticky top-0 bg-canvas text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Patients added</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((p) => (
                <tr key={p.date} className="border-t border-line">
                  <td className="px-3 py-1.5">{fmtDay(p.date, true)}</td>
                  <td className="tabular px-3 py-1.5 text-right font-mono">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
