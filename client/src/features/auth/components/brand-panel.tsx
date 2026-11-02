import { Logo } from '@/components/shared/logo';

const PREVIEW_BARS = [
  { name: 'Cardiology', value: 62, width: '88%' },
  { name: 'Neurology', value: 48, width: '68%' },
  { name: 'Orthopedics', value: 37, width: '52%' },
  { name: 'Pediatrics', value: 29, width: '41%' },
];

/** Left side of the login screen. Purely decorative: hidden from assistive tech. */
export function BrandPanel() {
  return (
    <aside
      aria-hidden
      className="relative hidden flex-col justify-between overflow-hidden bg-night p-12 text-on-night lg:flex"
    >
      {/* Concentric rings: quiet depth without gradients or stock imagery. */}
      <svg
        className="pointer-events-none absolute -right-40 -top-40 size-[640px] text-primary-500"
        viewBox="0 0 640 640"
        fill="none"
        stroke="currentColor"
      >
        {[120, 190, 260, 330].map((r, i) => (
          <circle key={r} cx="320" cy="320" r={r} strokeOpacity={0.22 - i * 0.045} />
        ))}
      </svg>

      <Logo tone="dark" className="relative" />

      <div className="relative max-w-[460px]">
        <h2 className="text-[38px] font-medium leading-[1.15] tracking-tight">
          Every doctor. Every patient. One calm place.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-on-night-muted">
          A focused workspace to manage your doctors, follow their patients and see how your numbers
          move over time.
        </p>

        <div className="mt-10 rounded-card border border-night-line bg-night-raised p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-on-night">Patients by specialization</span>
            <span className="text-xs text-on-night-muted">Preview</span>
          </div>
          <ul className="mt-5 space-y-3.5">
            {PREVIEW_BARS.map((bar) => (
              <li key={bar.name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-on-night-muted">{bar.name}</span>
                  <span className="tabular font-mono text-on-night">{bar.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-night-line">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: bar.width }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="relative text-xs text-on-night-muted">Doctor Tracker · Admin portal</p>
    </aside>
  );
}
