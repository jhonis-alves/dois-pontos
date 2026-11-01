import { APP_TIMEZONE } from './config';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: APP_TIMEZONE,
});

const utcDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: APP_TIMEZONE,
});

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: APP_TIMEZONE,
});

const hourFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: 'numeric',
  hour12: false,
  timeZone: APP_TIMEZONE,
});

/** Formata centavos inteiros como moeda brasileira. */
export function formatCurrencyFromCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

/** Formata uma data (YYYY-MM-DD ou ISO completo) como DD/MM/AAAA. */
export function formatDate(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year = 1970, month = 1, day = 1] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return utcDateFormatter.format(date);
  }

  return dateFormatter.format(value instanceof Date ? value : new Date(value));
}

export function formatLongDate(value: Date = new Date()): string {
  const formatted = longDateFormatter.format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatMonthYear(value: Date = new Date()): string {
  const formatted = monthYearFormatter.format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Data de hoje (YYYY-MM-DD) no fuso oficial da aplicação. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: APP_TIMEZONE,
  }).format(new Date());
}

export function greetingForNow(value: Date = new Date()): string {
  const hour = Number(hourFormatter.format(value));
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
