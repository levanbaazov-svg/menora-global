'use client';

import { useFormStatus } from 'react-dom';

// Shared form atoms for onboarding. Clockout-influenced:
// - softer borders, bigger touch targets, gold focus glow
// - chip / radio variants feel like physical tappable pills
// - all accept an `error` prop and render inline error below input

const inputBase =
  'w-full px-4 py-3 text-base bg-white rounded-2xl border border-(--color-border) ' +
  'placeholder:text-(--color-fg-subtle) ' +
  'transition-all duration-200 ' +
  'hover:border-(--color-border-strong) ' +
  'focus:outline-none focus:border-(--color-gold) focus:ring-4 focus:ring-(--color-gold)/15 ' +
  'aria-[invalid=true]:border-(--color-danger) aria-[invalid=true]:ring-(--color-danger)/15';

const labelBase = 'text-sm font-semibold text-(--color-fg) block mb-2';
const errorBase = 'text-xs text-(--color-danger) mt-1.5 block';

export function Field({
  label, name, type = 'text', required, placeholder, defaultValue, error,
}: {
  label: string; name: string; type?: string; required?: boolean;
  placeholder?: string; defaultValue?: string; error?: string;
}) {
  return (
    <label className="block">
      <span className={labelBase}>
        {label}{required && <span className="text-(--color-gold-dark) ml-0.5">*</span>}
      </span>
      <input
        name={name} type={type} placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        aria-invalid={!!error}
        className={inputBase}
      />
      {error && <span className={errorBase}>{error}</span>}
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
      <span className={labelBase}>
        {label}{required && <span className="text-(--color-gold-dark) ml-0.5">*</span>}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        aria-invalid={!!error}
        className={inputBase + ' appearance-none cursor-pointer pr-10'}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='none' stroke='%2394A0B0' stroke-width='2' d='M1 1l5 5 5-5'/></svg>\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 16px center',
        }}
      >
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {error && <span className={errorBase}>{error}</span>}
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
      <span className={labelBase}>
        {label}{required && <span className="text-(--color-gold-dark) ml-0.5">*</span>}
      </span>
      <textarea
        name={name} rows={rows} placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        aria-invalid={!!error}
        className={inputBase + ' resize-y leading-relaxed'}
      />
      {error && <span className={errorBase}>{error}</span>}
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
      <legend className={labelBase}>{label}</legend>
      <div className={`grid gap-2 ${columns === 1 ? '' : 'grid-cols-2'}`}>
        {options.map(([value, title]) => (
          <label
            key={value}
            className="group relative cursor-pointer"
          >
            <input
              type="radio" name={name} value={value}
              defaultChecked={defaultValue === value}
              className="peer sr-only"
            />
            <span className={`
              flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
              border-2 border-(--color-border) bg-white text-sm font-medium
              transition-all duration-200
              hover:border-(--color-gold)/40 hover:bg-(--color-bg-muted)/50
              peer-checked:bg-(--color-gold) peer-checked:border-(--color-gold) peer-checked:text-(--color-deep) peer-checked:font-semibold
              peer-focus-visible:ring-4 peer-focus-visible:ring-(--color-gold)/30
            `}>
              {title}
            </span>
          </label>
        ))}
      </div>
      {error && <span className={errorBase}>{error}</span>}
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
      <legend className={labelBase}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((key) => (
          <label key={key} className="cursor-pointer">
            <input
              type="checkbox" name={name} value={key}
              defaultChecked={set.has(key)}
              className="peer sr-only"
            />
            <span className={`
              inline-block px-4 py-2 rounded-full text-sm font-medium
              border-2 border-(--color-border) bg-white text-(--color-fg-muted)
              transition-all duration-200
              hover:border-(--color-gold)/40 hover:text-(--color-deep)
              peer-checked:bg-(--color-gold) peer-checked:border-(--color-gold) peer-checked:text-(--color-deep)
              peer-focus-visible:ring-4 peer-focus-visible:ring-(--color-gold)/30
            `}>
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
    <label className="
      group flex items-center gap-3 p-4 rounded-2xl border-2 border-(--color-border) bg-white
      cursor-pointer transition-all duration-200
      hover:border-(--color-gold)/40 hover:bg-(--color-bg-muted)/50
      has-[input:checked]:bg-(--color-gold-soft)/40 has-[input:checked]:border-(--color-gold)
    ">
      <input
        type="checkbox" name={name} defaultChecked={defaultChecked}
        className="w-5 h-5 accent-(--color-gold)"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 bg-(--color-danger-soft) border border-(--color-danger)/30 rounded-2xl text-sm text-(--color-danger) spring-in">
      {message}
    </div>
  );
}

export function SubmitButton({
  children, variant = 'dark',
}: { children: React.ReactNode; variant?: 'dark' | 'gold' }) {
  const { pending } = useFormStatus();
  const styles = variant === 'gold'
    ? 'bg-(--color-gold) text-(--color-deep) shadow-[var(--shadow-gold)]'
    : 'bg-(--color-deep) text-white shadow-[var(--shadow-md)]';
  return (
    <button
      type="submit"
      disabled={pending}
      className={`
        ${styles}
        w-full h-14 rounded-full font-semibold text-base
        transition-all duration-200
        hover:opacity-95 hover:shadow-[var(--shadow-lg)]
        active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        focus-visible:outline-(--color-gold) focus-visible:outline-offset-2
      `}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
          Сохраняю
        </span>
      ) : (
        <>
          {children} <span className="inline-block ml-1">→</span>
        </>
      )}
    </button>
  );
}

export function SkipButton({ children = 'Пропустить' }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formNoValidate
      disabled={pending}
      className="
        w-full h-12 rounded-full text-sm font-medium text-(--color-fg-muted)
        hover:text-(--color-deep) hover:bg-(--color-bg-muted)/50
        transition-all duration-200
        disabled:opacity-50
      "
    >
      {children} →
    </button>
  );
}
