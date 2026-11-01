import { z } from 'zod';
import { ApiError } from './api-error.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')
  .max(254, 'O e-mail é muito longo.');

const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(200, 'A senha é muito longa.');

const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'Informe um nome com pelo menos 2 caracteres.')
  .max(80, 'O nome é muito longo.');

const genderPaletteSchema = z.enum(['male', 'female']);

const optionalEmailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  emailSchema.optional(),
);

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  genderPalette: genderPaletteSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.').max(200),
});

export const acceptInviteSchema = z.object({
  displayName: displayNameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  genderPalette: genderPaletteSchema.optional(),
});

export const createInviteSchema = z.object({
  email: optionalEmailSchema,
  expiresInDays: z.coerce
    .number()
    .int('O prazo deve ser em dias inteiros.')
    .min(1, 'O prazo mínimo é 1 dia.')
    .max(30, 'O prazo máximo é 30 dias.')
    .optional(),
});

export const tokenParamSchema = z.object({
  token: z.string().min(20, 'Convite inválido.').max(200, 'Convite inválido.'),
});

export const inviteIdParamSchema = z.object({
  id: z.string().min(1, 'Convite inválido.').max(100, 'Convite inválido.'),
});

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, 'Data inválida.');

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o horário no formato HH:MM.');

const nullableText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.string().trim().max(max, 'Texto muito longo.').nullable().optional(),
  );

const taskTitleSchema = z
  .string()
  .trim()
  .min(1, 'Informe o título da tarefa.')
  .max(200, 'O título é muito longo.');

const taskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'done',
  'cancelled',
]);
const scopeSchema = z.enum(['private', 'shared']);

const recurrenceInputSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  intervalCount: z
    .number()
    .int('O intervalo deve ser um número inteiro.')
    .min(1, 'O intervalo mínimo é 1.')
    .max(30, 'O intervalo máximo é 30.')
    .optional(),
  endsOn: isoDateSchema.optional(),
});

export const taskCreateSchema = z.object({
  title: taskTitleSchema,
  description: nullableText(2000),
  scope: scopeSchema.default('shared'),
  assigneeUserId: z.string().uuid('Responsável inválido.').nullable().optional(),
  priority: taskPrioritySchema.default('normal'),
  categoryId: z.string().uuid('Categoria inválida.').nullable().optional(),
  startDate: isoDateSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
  dueTime: timeSchema.nullable().optional(),
  recurrence: recurrenceInputSchema.optional(),
});

export const taskUpdateSchema = z.object({
  title: taskTitleSchema.optional(),
  description: nullableText(2000),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeUserId: z.string().uuid('Responsável inválido.').nullable().optional(),
  categoryId: z.string().uuid('Categoria inválida.').nullable().optional(),
  startDate: isoDateSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
  dueTime: timeSchema.nullable().optional(),
});

export const subtaskCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe o título da subtarefa.')
    .max(200, 'O título é muito longo.'),
});

export const subtaskUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe o título da subtarefa.')
    .max(200, 'O título é muito longo.')
    .optional(),
  done: z.boolean().optional(),
});

export const habitCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe um nome com pelo menos 2 caracteres.')
    .max(120, 'O nome é muito longo.'),
  description: nullableText(1000),
  scope: scopeSchema.default('shared'),
  frequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  targetCount: z
    .number()
    .int('A meta deve ser um número inteiro.')
    .min(1, 'A meta mínima é 1.')
    .max(100, 'A meta máxima é 100.')
    .default(1),
  categoryId: z.string().uuid('Categoria inválida.').nullable().optional(),
  startsOn: isoDateSchema.optional(),
  endsOn: isoDateSchema.nullable().optional(),
});

export const habitUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe um nome com pelo menos 2 caracteres.')
    .max(120, 'O nome é muito longo.')
    .optional(),
  description: nullableText(1000),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  targetCount: z
    .number()
    .int('A meta deve ser um número inteiro.')
    .min(1, 'A meta mínima é 1.')
    .max(100, 'A meta máxima é 100.')
    .optional(),
  categoryId: z.string().uuid('Categoria inválida.').nullable().optional(),
  endsOn: isoDateSchema.nullable().optional(),
});

export const habitEntrySchema = z.object({
  count: z
    .number()
    .int('A quantidade deve ser um número inteiro.')
    .min(0, 'A quantidade não pode ser negativa.')
    .max(100, 'A quantidade máxima é 100.'),
  note: nullableText(500),
});

const accountNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome da conta.')
  .max(120, 'O nome da conta é muito longo.');

const accountTypeSchema = z.enum([
  'checking',
  'digital',
  'cash',
  'savings',
  'reserve',
  'other',
]);

const balanceCentsSchema = z
  .number()
  .int('O saldo deve ser informado em centavos inteiros.')
  .min(-1_000_000_000_000, 'Saldo fora do limite permitido.')
  .max(1_000_000_000_000, 'Saldo fora do limite permitido.');

const amountCentsSchema = z
  .number()
  .int('O valor deve ser informado em centavos inteiros.')
  .min(1, 'O valor deve ser maior que zero.')
  .max(1_000_000_000_000, 'Valor fora do limite permitido.');

const financeTransactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

const financeTransactionStatusSchema = z.enum([
  'planned',
  'pending',
  'paid',
  'received',
  'cancelled',
]);

export const financeAccountCreateSchema = z.object({
  name: accountNameSchema,
  type: accountTypeSchema.default('checking'),
  holderUserId: z.string().uuid('Titular inválido.').nullable().optional(),
  initialBalanceCents: balanceCentsSchema.default(0),
});

export const financeAccountUpdateSchema = z.object({
  name: accountNameSchema.optional(),
  type: accountTypeSchema.optional(),
  holderUserId: z.string().uuid('Titular inválido.').nullable().optional(),
  initialBalanceCents: balanceCentsSchema.optional(),
});

export const financeTransactionCreateSchema = z.object({
  type: financeTransactionTypeSchema,
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição da transação.')
    .max(200, 'A descrição é muito longa.'),
  amountCents: amountCentsSchema,
  competenceDate: isoDateSchema,
  dueDate: isoDateSchema.nullable().optional(),
  paymentDate: isoDateSchema.nullable().optional(),
  status: financeTransactionStatusSchema.optional(),
  categoryId: z.string().uuid('Categoria inválida.').nullable().optional(),
  accountId: z.string().uuid('Conta inválida.'),
  transferAccountId: z
    .string()
    .uuid('Conta de destino inválida.')
    .nullable()
    .optional(),
  responsibleUserId: z
    .string()
    .uuid('Responsável inválido.')
    .nullable()
    .optional(),
  notes: nullableText(1000),
});

export const financeTransactionUpdateSchema = z.object({
  type: financeTransactionTypeSchema.optional(),
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição da transação.')
    .max(200, 'A descrição é muito longa.')
    .optional(),
  amountCents: amountCentsSchema.optional(),
  competenceDate: isoDateSchema.optional(),
  dueDate: isoDateSchema.nullable().optional(),
  paymentDate: isoDateSchema.nullable().optional(),
  status: financeTransactionStatusSchema.optional(),
  categoryId: z.string().uuid('Categoria inválida.').nullable().optional(),
  accountId: z.string().uuid('Conta inválida.').optional(),
  transferAccountId: z
    .string()
    .uuid('Conta de destino inválida.')
    .nullable()
    .optional(),
  responsibleUserId: z
    .string()
    .uuid('Responsável inválido.')
    .nullable()
    .optional(),
  notes: nullableText(1000),
});

const cardNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome do cartão.')
  .max(120, 'O nome do cartão é muito longo.');

const cardDaySchema = z
  .number()
  .int('O dia deve ser um número inteiro.')
  .min(1, 'O dia deve estar entre 1 e 31.')
  .max(31, 'O dia deve estar entre 1 e 31.');

const cardInstitutionSchema = nullableText(120);

const nonNegativeCentsSchema = z
  .number()
  .int('O limite deve ser informado em centavos inteiros.')
  .min(0, 'O limite não pode ser negativo.')
  .max(1_000_000_000_000, 'Limite fora do intervalo permitido.');

export const financeCardCreateSchema = z.object({
  name: cardNameSchema,
  institution: cardInstitutionSchema,
  holderUserId: z.string().uuid('Titular inválido.').nullable().optional(),
  limitCents: nonNegativeCentsSchema.default(0),
  closingDay: cardDaySchema,
  dueDay: cardDaySchema,
  paymentAccountId: z
    .string()
    .uuid('Conta de pagamento inválida.')
    .nullable()
    .optional(),
});

export const financeCardUpdateSchema = z.object({
  name: cardNameSchema.optional(),
  institution: cardInstitutionSchema,
  holderUserId: z.string().uuid('Titular inválido.').nullable().optional(),
  limitCents: nonNegativeCentsSchema.optional(),
  closingDay: cardDaySchema.optional(),
  dueDay: cardDaySchema.optional(),
  paymentAccountId: z
    .string()
    .uuid('Conta de pagamento inválida.')
    .nullable()
    .optional(),
});

export const financePurchaseCreateSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição da compra.')
    .max(200, 'A descrição é muito longa.'),
  totalCents: amountCentsSchema,
  installmentsCount: z
    .number()
    .int('A quantidade de parcelas deve ser um número inteiro.')
    .min(1, 'A compra precisa de pelo menos 1 parcela.')
    .max(48, 'O parcelamento máximo é de 48 parcelas.')
    .default(1),
  purchaseDate: isoDateSchema,
  firstDueDate: isoDateSchema.nullable().optional(),
  categoryId: z.string().uuid('Categoria inválida.'),
  responsibleUserId: z
    .string()
    .uuid('Responsável inválido.')
    .nullable()
    .optional(),
  notes: nullableText(1000),
});

export const financeInvoicePaySchema = z.object({
  paymentAccountId: z
    .string()
    .uuid('Conta de pagamento inválida.')
    .nullable()
    .optional(),
  paymentDate: isoDateSchema.optional(),
});

export const financeMonthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o mês no formato AAAA-MM.')
    .optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
});

export const subtaskParamSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
  subtaskId: z.string().uuid('Identificador inválido.'),
});

export const habitEntryParamSchema = z.object({
  id: z.string().uuid('Identificador inválido.'),
  date: isoDateSchema,
});

/** Valida e devolve os dados ou lança um 400 com a primeira mensagem útil. */
export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      issue?.message ?? 'Dados inválidos.',
    );
  }

  return result.data;
}
