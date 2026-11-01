import { describe, expect, it } from 'vitest';
import {
  addMonthsClamped,
  nextOccurrence,
  periodStart,
  shiftPeriod,
} from './lib/dates.js';

describe('cálculo de datas de rotina', () => {
  it('preserva o dia do mês quando possível e limita ao último dia', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-02-28', 1)).toBe('2026-03-28');
    expect(addMonthsClamped('2026-01-15', 2)).toBe('2026-03-15');
  });

  it('avança recorrências diárias, semanais e mensais', () => {
    expect(nextOccurrence('2026-10-28', 'daily', 2)).toBe('2026-10-30');
    expect(nextOccurrence('2026-10-28', 'weekly', 1)).toBe('2026-11-04');
    expect(nextOccurrence('2026-10-28', 'monthly', 1)).toBe('2026-11-28');
  });

  it('calcula o início da semana na segunda-feira', () => {
    expect(periodStart('2026-10-28', 'weekly')).toBe('2026-10-26');
    expect(periodStart('2026-11-01', 'weekly')).toBe('2026-10-26');
    expect(periodStart('2026-10-28', 'monthly')).toBe('2026-10-01');
  });

  it('recua períodos para o cálculo de sequência', () => {
    expect(shiftPeriod('2026-10-28', 'daily', -1)).toBe('2026-10-27');
    expect(shiftPeriod('2026-10-26', 'weekly', -1)).toBe('2026-10-19');
    expect(shiftPeriod('2026-10-01', 'monthly', -1)).toBe('2026-09-01');
  });
});
