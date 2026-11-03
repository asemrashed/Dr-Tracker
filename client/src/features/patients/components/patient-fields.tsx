import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CONDITIONS, GENDERS } from '@/lib/constants';
import { fieldProps } from '@/lib/forms';
import type { PatientFormValues } from '../schemas';

interface Props {
  register: UseFormRegister<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
  /** Keeps element ids unique when two forms could exist on one page. */
  idPrefix: string;
}

/** The five patient fields, shared by the add (doctor page) and edit (patients page) slide-overs. */
export function PatientFields({ register, errors, idPrefix }: Props) {
  const id = (n: string) => `${idPrefix}-${n}`;
  return (
    <>
      <Field label="Full name" htmlFor={id('name')} error={errors.name?.message}>
        <Input {...fieldProps(id('name'), errors.name)} autoComplete="off" {...register('name')} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age" htmlFor={id('age')} error={errors.age?.message}>
          <Input {...fieldProps(id('age'), errors.age)} inputMode="numeric" autoComplete="off" className="tabular" {...register('age')} />
        </Field>
        <Field label="Gender" htmlFor={id('gender')} error={errors.gender?.message}>
          <Select {...fieldProps(id('gender'), errors.gender)} {...register('gender')}>
            <option value="">Select</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g[0]?.toUpperCase() + g.slice(1)}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Phone" htmlFor={id('phone')} error={errors.phone?.message}>
        <Input {...fieldProps(id('phone'), errors.phone)} type="tel" inputMode="tel" autoComplete="off" placeholder="+880 1700 000000" className="font-mono text-sm" {...register('phone')} />
      </Field>
      <Field label="Condition" htmlFor={id('condition')} error={errors.condition?.message}>
        <Select {...fieldProps(id('condition'), errors.condition)} {...register('condition')}>
          <option value="">Select condition</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </Field>
    </>
  );
}
