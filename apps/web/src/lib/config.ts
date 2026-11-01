export const APP_NAME = 'Dois Pontos';
export const APP_VERSION = '0.1.0';
export const APP_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_SHARED_SPACE_NAME = 'Nosso Espaço';

export const PHASES = [
  { number: 1, title: 'Fundação', status: 'done' },
  { number: 2, title: 'Autenticação e espaço', status: 'done' },
  { number: 3, title: 'Rotina', status: 'done' },
  { number: 4, title: 'Financeiro', status: 'current' },
  { number: 5, title: 'Dashboard e configurações', status: 'planned' },
  { number: 6, title: 'PWA e qualidade', status: 'planned' },
] as const;
