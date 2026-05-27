'use client';

import { useFormStatus } from 'react-dom';

// Shared form atoms used across onboarding steps.
// All accept an `error` prop and render inline error text in red below input.

export function Field({
  label, name, type = 'text', required, placeholder, defaultValue, error,
}: {
  label: string; name: string; type?: string; required?: boolean;
  placeholder?: string; defaultValue?: string; error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        name={name} type={type} placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        aria-invalid={!!error}
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-(--color-gold) ${
          error ? 'border-red-500' : ''
        }`}
      />
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

export function Select({
  label, name, required, defaultValue, options, error,
}: {
  label: string; name: string; required?: boolean; defaultValue?: string;
  options: [string, string][]; error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        aria-invalid={!!error}
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-(--color-gold) bg-white ${
          error ? 'border-red-500' : ''
        }`}
      >
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

export function Textarea({
  label, name, rows = 4, required, placeholder, defaultValue, error,
}: {
  label: string; name: string; rows?: number; required?: boolean;
  placeholder?: string; defaultValue?: string; error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <textarea
        name={name} rows={rows} placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        aria-invalid={!!error}
        className={`w-full px-4 py-2.5 border rounded-lg ${error ? 'border-red-500' : ''}`}
      />
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </label>
  );
}

export function RadioGroup({
  label, name, defaultValue, options, error, columns = 2,
}: {
  label: string; name: string; defaultValue?: string;
  options: [string, string][]; error?: string; columns?: 1 | 2;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium mb-2">{label}</legend>
      <div className={`grid gap-2 ${columns === 1 ? '' : 'grid-cols-2'}`}>
        {options.map(([value, title]) => (
          <label
            key={value}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-(--color-muted-bg) ${
              error ? 'border-red-500' : ''
            }`}
          >
            <input
              type="radio" name={name} value={value}
              defaultChecked={defaultValue === value}
              className="w-4 h-4"
            />
            <span className="text-sm">{title}</span>
          </label>
        ))}
      </div>
      {error && <span className="text-xs text-red-600 mt-1 block">{error}</span>}
    </fieldset>
  );
}

export function ChipCheckboxes({
  label, name, defaultValues = [], options, labels,
}: {
  label: string; name: string;
  defaultValues?: readonly string[];
  options: readonly string[];
  labels: Record<string, string>;
}) {
  const set = new Set(defaultValues);
  return (
    <fieldset>
      <legend className="text-sm font-medium mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((key) => (
          <label key={key} className="cursor-pointer">
            <input
              type="checkbox" name={name} value={key}
              defaultChecked={set.has(key)}
              className="peer hidden"
            />
            <span className="px-4 py-2 rounded-full border text-sm peer-checked:bg-(--color-gold) peer-checked:border-(--color-gold) inline-block">
              {labels[key]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Check({
  name, label, defaultChecked,
}: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-(--color-muted-bg)">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {message}
    </div>
  );
}

export function SubmitButton({
  children, variant = 'dark',
}: { children: React.ReactNode; variant?: 'dark' | 'gold' }) {
  const { pending } = useFormStatus();
  const base = 'px-8 py-3 rounded-full font-semibold disabled:opacity-50';
  const styles = variant === 'gold'
    ? 'bg-(--color-gold) text-(--color-deep)'
    : 'bg-(--color-deep) text-white';
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles} hover:opacity-90`}>
      {pending ? '...' : children}
    </button>
  );
}

export function SkipButton({ children = 'Пропустить →' }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formNoValidate
      disabled={pending}
      className="px-6 py-3 text-(--color-muted) text-sm hover:text-(--color-deep) disabled:opacity-50"
    >
      {children}
    </button>
  );
}
