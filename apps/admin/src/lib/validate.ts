export type FieldErrors = Record<string, string>;

export function required(value: any, label: string): string | null {
  if (value === null || value === undefined) return `${label} is required`;
  if (typeof value === 'string' && !value.trim()) return `${label} is required`;
  if (typeof value === 'number' && isNaN(value)) return `${label} is required`;
  return null;
}

export function minValue(value: string | number, min: number, label: string): string | null {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n) || n < min) return `${label} must be at least ${min}`;
  return null;
}

export function isEmail(value: string, label = 'Email'): string | null {
  if (!value.trim()) return `${label} is required`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${label} must be a valid email address`;
  return null;
}

export function minLength(value: string, min: number, label: string): string | null {
  if (!value || value.length < min) return `${label} must be at least ${min} characters`;
  return null;
}

export function collect(...rules: (string | null)[]): FieldErrors {
  return {};
}

export function hasErrors(errs: FieldErrors): boolean {
  return Object.keys(errs).length > 0;
}

export function firstErrors(errs: FieldErrors): string[] {
  return Object.values(errs);
}
