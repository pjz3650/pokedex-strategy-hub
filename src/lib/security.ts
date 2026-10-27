import { createHash } from 'node:crypto';
import { db } from './db';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function rateLimit(scope: string, identifier: string, limit = 10, windowMs = 900000) {
  const key = createHash('sha256').update(`${scope}:${identifier}`).digest('hex');
  const now = new Date();
  const result = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","expires") VALUES (${key},1,${new Date(now.getTime() + windowMs)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expires" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "expires"=CASE WHEN "RateLimit"."expires" < ${now} THEN ${new Date(now.getTime() + windowMs)} ELSE "RateLimit"."expires" END RETURNING "count"`;
  if (result[0].count > limit)
    throw new HttpError(429, 'Muitas tentativas. Aguarde e tente novamente.');
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (!origin || origin !== expected)
    throw new HttpError(403, 'Origem da requisição não autorizada.');
}
export async function parseBody(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 64000) throw new HttpError(413, 'Requisição muito grande.');
  const text = await request.text();
  if (text.length > 64000) throw new HttpError(413, 'Requisição muito grande.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}
