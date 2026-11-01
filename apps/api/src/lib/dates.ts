import { config } from '../config.js';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje (AAAA-MM-DD) no fuso oficial da aplicação. */
export function todayIso(timeZone: string = config.timezone): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(new Date());
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

/** Soma meses preservando o dia quando possível (31/01 + 1 mês = 28/02). */
export function addMonthsClamped(value: string, months: number): string {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));
  return formatIsoDate(target);
}

export function nextOccurrence(
  value: string,
  frequency: RecurrenceFrequency,
  intervalCount: number,
): string {
  if (frequency === 'daily') return addDays(value, intervalCount);
  if (frequency === 'weekly') return addDays(value, intervalCount * 7);
  return addMonthsClamped(value, intervalCount);
}

/** Início do período atual: dia, segunda-feira ou primeiro dia do mês. */
export function periodStart(
  value: string,
  frequency: RecurrenceFrequency,
): string {
  if (frequency === 'daily') return value;

  const date = parseIsoDate(value);

  if (frequency === 'weekly') {
    const day = date.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    date.setUTCDate(date.getUTCDate() - offset);
    return formatIsoDate(date);
  }

  date.setUTCDate(1);
  return formatIsoDate(date);
}

export function shiftPeriod(
  value: string,
  frequency: RecurrenceFrequency,
  periods: number,
): string {
  if (frequency === 'daily') return addDays(value, periods);
  if (frequency === 'weekly') return addDays(value, periods * 7);
  return addMonthsClamped(value, periods);
}
