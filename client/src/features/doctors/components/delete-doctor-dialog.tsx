'use client';

import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/shared/error-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { plural } from '@/lib/format';
import type { Doctor, HasPatientsDetails } from '../api';
import { useDeleteDoctor, useReassignAndDelete, useReassignCandidates } from '../hooks';

/**
 * The doctor delete flow (Master-plan section 6). One dialog, three states:
 *   confirm  -> DELETE /doctors/:id
 *   reassign -> server answered 409 DOCTOR_HAS_PATIENTS: pick a same-specialization doctor
 *   (no candidates) -> point the admin to "Add doctor"; they retry the delete afterwards
 * The server re-validates everything, so this dialog only guides.
 */
type Step = { kind: 'confirm' } | ({ kind: 'reassign' } & HasPatientsDetails);

interface Props {
  doctor: Doctor;
  /** Called after the exit animation, whether the dialog was dismissed or the doctor was deleted. */
  onClose: () => void;
  /** Called only when the doctor was actually deleted (e.g. leave the detail page). */
  onDeleted?: () => void;
}

export function DeleteDoctorDialog({ doctor, onClose, onDeleted }: Props) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<Step>({ kind: 'confirm' });
  const [targetId, setTargetId] = useState('');
  const closeTimer = useRef<number | undefined>(undefined);

  const del = useDeleteDoctor();
  const move = useReassignAndDelete();
  const busy = del.isPending || move.isPending;

  const candidates = useReassignCandidates(doctor.id, step.kind === 'reassign');

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /** Close with the exit animation, then let the parent unmount us. */
  const close = () => {
    setOpen(false);
    closeTimer.current = window.setTimeout(onClose, 160);
  };

  const confirmDelete = () =>
    del.mutate(doctor.id, {
      onSuccess: () => {
        toast.success(`${doctor.name} deleted`);
        onDeleted?.();
        close();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'DOCTOR_HAS_PATIENTS') {
          setStep({ kind: 'reassign', ...(err.details as HasPatientsDetails) });
        } else if (err instanceof ApiError && err.status === 404) {
          toast.error('This doctor was already deleted');
          close();
        } else {
          toast.error(err.message);
        }
      },
    });

  const confirmMove = () =>
    move.mutate(
      { id: doctor.id, targetDoctorId: targetId },
      {
        onSuccess: (r) => {
          toast.success(`${plural(r.movedCount, 'patient')} moved to ${r.targetDoctor.name}, ${r.deletedDoctor.name} deleted`);
          onDeleted?.();
          close();
        },
        onError: (err) => {
          toast.error(err.message);
          // The target may have been deleted or changed meanwhile: reload the choices.
          if (err instanceof ApiError && err.status !== 0) void candidates.refetch();
          setTargetId('');
        },
      },
    );

  const title =
    step.kind === 'confirm' ? `Delete ${doctor.name}?` : `${doctor.name} has ${plural(step.patientCount, 'patient')}`;
  const description =
    step.kind === 'confirm'
      ? 'The doctor is removed from the list and from analytics.'
      : `Move them to another ${step.specialization} doctor to continue.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent title={title} description={description}>
        {/* Keyed so each step fades/slides in when the content swaps. */}
        <div key={step.kind} className="animate-swap">
          {step.kind === 'confirm' && (
            <Footer>
              <DialogClose asChild>
                <Button variant="ghost" disabled={busy}>
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="danger" onClick={confirmDelete} loading={del.isPending}>
                Delete doctor
              </Button>
            </Footer>
          )}

          {step.kind === 'reassign' && (
            <>
              <div className="px-6 py-5">
                {candidates.isPending && (
                  <div className="space-y-2" aria-label="Loading doctors" role="status">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-11 w-full rounded-input" />
                  </div>
                )}

                {candidates.isError && (
                  <ErrorState
                    title="Couldn't load doctors"
                    message={candidates.error.message}
                    onRetry={() => candidates.refetch()}
                    retrying={candidates.isFetching}
                  />
                )}

                {candidates.data && candidates.data.candidates.length === 0 && (
                  <div className="rounded-input bg-warning-50 px-4 py-3.5 text-sm text-warning-700">
                    <p className="font-medium">No other {step.specialization} doctor available</p>
                    <p className="mt-1">
                      Add one first, then come back and delete {doctor.name}. Their patients will be waiting to move.
                    </p>
                  </div>
                )}

                {candidates.data && candidates.data.candidates.length > 0 && (
                  <>
                    <Label htmlFor="reassign-target">Move patients to</Label>
                    <Select
                      id="reassign-target"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select a doctor</option>
                      {candidates.data.candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.hospital} · {plural(c.patientCount ?? 0, 'patient')}
                        </option>
                      ))}
                    </Select>
                  </>
                )}
              </div>

              <Footer>
                <DialogClose asChild>
                  <Button variant="ghost" disabled={busy}>
                    Cancel
                  </Button>
                </DialogClose>
                {candidates.data && candidates.data.candidates.length === 0 ? (
                  <Link
                    href={`/doctors/new?specialization=${encodeURIComponent(step.specialization)}`}
                    className={buttonVariants({ variant: 'primary' })}
                  >
                    <UserPlus className="size-4" aria-hidden />
                    Add doctor
                  </Link>
                ) : (
                  <Button variant="danger" onClick={confirmMove} disabled={!targetId} loading={move.isPending}>
                    Move patients and delete
                  </Button>
                )}
              </Footer>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap justify-end gap-3 px-6 pb-5 pt-1">{children}</div>
);
