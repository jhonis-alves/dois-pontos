/**
 * Erro de domínio que o handler global do Fastify converte em resposta JSON.
 * `statusCode` e `code` são usados pelo handler para montar a resposta.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
