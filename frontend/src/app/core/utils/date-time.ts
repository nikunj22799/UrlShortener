import {
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

export function futureDateValidator(
  control: AbstractControl<string>,
): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  const timestamp = new Date(control.value).getTime();

  return Number.isFinite(timestamp) && timestamp > Date.now()
    ? null
    : { futureDate: true };
}

export function toLocalDateTimeInput(
  value: string | Date | null,
): string {
  if (value === null) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}
