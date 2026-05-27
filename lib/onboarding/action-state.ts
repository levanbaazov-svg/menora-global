// Shared shape that server actions return to client forms.
// `errors` is a flat field-name → first-error-message map (Zod flatten).
// `values` echoes back what the user typed so we don't lose it on validation error.

import type { ZodError } from 'zod';

export interface ActionState {
  ok?: boolean;
  errors?: Record<string, string>;
  values?: Record<string, unknown>;
  formError?: string;     // top-level error (e.g. "не удалось сохранить")
}

export const INITIAL_STATE: ActionState = {};

export function zodErrorsToMap<T>(error: ZodError<T>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_';
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

// Re-hydrate the raw form values from FormData so the form can restore them.
export function formValues(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of new Set(fd.keys())) {
    const all = fd.getAll(k);
    out[k] = all.length > 1 ? all.map(String) : String(all[0] ?? '');
  }
  return out;
}
