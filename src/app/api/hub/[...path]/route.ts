import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
canUse,
ENGINE_VERSION,
evaluateBuild,
generateTeam,
recommendBuild,
role,
} from '@/lib/engine';
import { getCatalog,getDataCoverage,getDetail,getGameMovePool } from '@/lib/repository';
import { checkOrigin,HttpError,parseBody,rateLimit } from '@/lib/security';
import { validateMembers } from '@/lib/team-service';
import {
buildSchema,
gameSchema,
generatorSchema,
memberSchema,
passwordSchema,
registerSchema,
teamSchema,
} from '@/lib/validation';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createHash,randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
type Context = { params: Promise<{ path: string[] }> };
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
async function userId() {
  const session = await auth();
  if (!session?.user?.id)
    throw new HttpError(401, 'Entre na sua conta para salvar e recuperar seus dados.');
  return session.user.id;
}
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  const [resource, id] = path;
  const url = new URL(request.url);
  const method = request.method;
  if (method !== 'GET') {
    checkOrigin(request);
    await rateLimit('mutations', 'global', 300, 60000);
  }
  if (method === 'GET' && resource === 'catalog') {
    let list = await getCatalog();
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const game = url.searchParams.get('game');
    const type = url.searchParams.get('type');
    const secondary = url.searchParams.get('secondary');
    const generation = Number(url.searchParams.get('generation'));
    const kind = url.searchParams.get('kind');
    list = list.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || String(p.speciesId) === q.replace('#', '')) &&
        (!game || p.availability.some((a) => a.gameId === game)) &&
        (!type || p.types.includes(type)) &&
        (!secondary || p.types[1] === secondary) &&
        (!generation || p.generation === generation) &&
        (!kind || p.kind === kind),
    );
    const sort = url.searchParams.get('sort');
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'speed') list.sort((a, b) => b.stats.speed - a.stats.speed);
    if (sort === 'attack') list.sort((a, b) => b.stats.attack - a.stats.attack);
    const page = Math.max(1, Math.min(1000, Number(url.searchParams.get('page')) || 1));
    return json({ total: list.length, page, items: list.slice((page - 1) * 36, page * 36) });
  }
  if (method === 'GET' && resource === 'pokemon') {
    const game = gameSchema.parse(url.searchParams.get('game') ?? 'sword');
    const detail = await getDetail(z.coerce.number().int().positive().parse(id), game);
    if (!detail) throw new HttpError(404, 'Pokémon não encontrado.');
    return json(detail);
  }
  if (method === 'GET' && resource === 'sources') {
    return json(await db.rankingSource.findMany({ orderBy: { name: 'asc' } }));
  }
  if (method === 'GET' && resource === 'health') {
    await db.$queryRaw`SELECT 1`;
    return json({
      database: 'ok',
      engine: ENGINE_VERSION,
      generativeAI: false,
      coverage: await getDataCoverage(),
      lastImport: await db.dataImportRun.findFirst({
        where: { status: 'complete' },
        orderBy: { finishedAt: 'desc' },
        select: { commit: true, finishedAt: true, counts: true },
      }),
    });
  }
  if (method === 'POST' && resource === 'register') {
    const data = registerSchema.parse(await parseBody(request));
    await rateLimit('register', data.email, 3);
    await rateLimit('register-global', 'all', 30);
    const passwordHash = await hash(data.password, 12);
    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists)
      throw new HttpError(
        400,
        'Não foi possível cadastrar esta conta. Tente entrar ou recuperar a senha.',
      );
    await db.user.create({ data: { name: data.name, email: data.email, passwordHash } });
    return json({ ok: true }, 201);
  }
  if (method === 'POST' && resource === 'recover') {
    const { email } = z
      .object({ email: z.email().transform((s) => s.toLowerCase()) })
      .parse(await parseBody(request));
    await rateLimit('recover', email, 3);
    await rateLimit('recover-global', 'all', 20);
    if (!process.env.SMTP_URL || !process.env.SMTP_FROM)
      throw new HttpError(
        503,
        'Recuperação por e-mail indisponível: configure o envio SMTP no servidor.',
      );
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const digest = createHash('sha256').update(token).digest('hex');
      await db.passwordResetToken.create({
        data: { id: digest, userId: user.id, expires: new Date(Date.now() + 1800000) },
      });
      await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Redefinir senha · Strategy Hub',
        text: `Redefina sua senha em ${process.env.AUTH_URL}/perfil?token=${token}\nEste link expira em 30 minutos.`,
      });
    }
    return json({
      message: 'Se houver uma conta para este endereço, você receberá as instruções.',
    });
  }
  if (method === 'POST' && resource === 'reset') {
    const data = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema })
      .parse(await parseBody(request));
    await rateLimit('reset', 'all', 30);
    const id = createHash('sha256').update(data.token).digest('hex');
    const passwordHash = await hash(data.password, 12);
    await db.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({ where: { id } });
      if (!token || token.expires < new Date())
        throw new HttpError(400, 'Link inválido ou expirado.');
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id, expires: { gt: new Date() } },
      });
      if (consumed.count !== 1) throw new HttpError(400, 'Link inválido ou expirado.');
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.session.deleteMany({ where: { userId: token.userId } });
    });
    return json({ ok: true });
  }
  if (method === 'POST' && resource === 'analyze') {
    const data = z
      .object({ gameId: gameSchema, members: z.array(memberSchema).max(6) })
      .parse(await parseBody(request));
    return json((await validateMembers(data.members, data.gameId)).analysis);
  }
  if (method === 'POST' && resource === 'build-evaluate') {
    const data = buildSchema.parse(await parseBody(request));
    const validated = await validateMembers([data.member], data.gameId);
    return json(
      evaluateBuild(
        validated.members[0].pokemon,
        validated.members[0].moves,
        data.gameId,
        data.style,
      ),
    );
  }
  if (method === 'POST' && resource === 'generate') {
    const data = generatorSchema.parse(await parseBody(request));
    await rateLimit('generator', 'all', 15, 60000);
    const catalog = (await getCatalog()).filter(
      (p) => canUse(p, data.gameId) && !['mega', 'battle', 'gigantamax'].includes(p.kind),
    );
    const pool = await getGameMovePool(catalog, data.gameId);
    try {
      return json(generateTeam(pool, data.gameId, data));
    } catch (error) {
      throw new HttpError(
        400,
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar uma equipe com estes critérios.',
      );
    }
  }
  if (resource === 'assistant' && method === 'POST') {
    const data = z
      .object({
        gameId: gameSchema,
        formId: z.number().int().positive(),
        question: z.string().trim().min(1).max(1000),
      })
      .parse(await parseBody(request));
    await rateLimit('assistant', 'all', 60, 60000);
    const detail = await getDetail(data.formId, data.gameId);
    if (!detail || !canUse(detail.pokemon, data.gameId))
      throw new HttpError(400, 'Pokémon incompatível.');
    const build = recommendBuild(detail.pokemon, detail.moves, data.gameId);
    const answer = `Assistente generativo desabilitado. Análise determinística de ${detail.pokemon.name}: ${role(detail.pokemon)}. ${build.explanations.join(' ')} ${build.warnings.join(' ')}`;
    const session = await auth();
    if (session?.user?.id) {
      const prefs = await db.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
      });
      if ((prefs?.preferences as { history?: boolean })?.history) {
        await db.chatConversation.create({
          data: {
            userId: session.user.id,
            title: data.question.slice(0, 80),
            messages: {
              create: [
                { role: 'user', content: data.question },
                {
                  role: 'assistant',
                  content: answer,
                  context: { gameId: data.gameId, formId: data.formId, engine: ENGINE_VERSION },
                },
              ],
            },
          },
        });
      }
    }
    return json({
      answer,
      generative: false,
      sources: [...new Set(detail.moves.map((m) => m.sourceUrl))],
    });
  }
  const uid = await userId();
  if (resource === 'me') {
    if (method === 'GET') {
      const [user, teams, builds, favorites, history, conversations] = await Promise.all([
        db.user.findUnique({
          where: { id: uid },
          select: { id: true, name: true, email: true, preferences: true },
        }),
        db.team.findMany({
          where: { userId: uid },
          include: { members: { orderBy: { slot: 'asc' } } },
          orderBy: { updatedAt: 'desc' },
        }),
        db.build.findMany({
          where: { userId: uid },
          include: { moves: { orderBy: { slot: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.favorite.findMany({ where: { userId: uid } }),
        db.analysisHistory.findMany({
          where: { userId: uid },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
        db.chatConversation.findMany({
          where: { userId: uid },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);
      return json({
        user,
        teams,
        builds,
        favorites: favorites.map((f) => f.formId),
        history,
        conversations,
      });
    }
    if (method === 'PATCH') {
      const data = z
        .object({
          name: z.string().trim().min(2).max(60),
          preferences: z.object({
            game: gameSchema,
            stage: z.number().int().min(0).max(3),
            stages: z.partialRecord(gameSchema, z.number().int().min(0).max(3)).optional(),
            theme: z.enum(['dark', 'light']),
            history: z.boolean(),
          }),
        })
        .parse(await parseBody(request));
      await db.user.update({ where: { id: uid }, data });
      if (!data.preferences.history)
        await db.$transaction([
          db.analysisHistory.deleteMany({ where: { userId: uid } }),
          db.chatConversation.deleteMany({ where: { userId: uid } }),
        ]);
      return json({ ok: true });
    }
  }
  if (resource === 'history' && method === 'POST') {
    const data = z
      .object({ formId: z.number().int().positive(), gameId: gameSchema })
      .parse(await parseBody(request));
    const user = await db.user.findUnique({ where: { id: uid }, select: { preferences: true } });
    if ((user?.preferences as { history?: boolean })?.history)
      await db.analysisHistory.create({ data: { ...data, userId: uid } });
    return json({ ok: true });
  }
  if (resource === 'favorites') {
    const formId = z.coerce.number().int().positive().parse(id);
    if (method === 'POST')
      await db.favorite.upsert({
        where: { userId_formId: { userId: uid, formId } },
        create: { userId: uid, formId },
        update: {},
      });
    else if (method === 'DELETE') await db.favorite.deleteMany({ where: { userId: uid, formId } });
    else throw new HttpError(405, 'Método não permitido.');
    return json({ ok: true });
  }
  if (resource === 'teams') {
    if (method === 'DELETE') {
      const result = await db.team.deleteMany({ where: { id, userId: uid } });
      if (!result.count) throw new HttpError(404, 'Equipe não encontrada.');
      return json({ ok: true });
    }
    if (method === 'POST' || method === 'PATCH') {
      const data = teamSchema.parse(await parseBody(request));
      const validation = await validateMembers(data.members, data.gameId);
      const members = data.members.map((m, slot) => ({
        formId: m.formId,
        slot,
        config: {
          moves: m.moves,
          itemId: m.itemId ?? null,
          abilityId: m.abilityId ?? null,
          nature: m.nature ?? null,
        },
      }));
      const team = await db.$transaction(async (tx) => {
        if (method === 'PATCH') {
          const own = await tx.team.findFirst({ where: { id, userId: uid } });
          if (!own) throw new HttpError(404, 'Equipe não encontrada.');
          await tx.teamMember.deleteMany({ where: { teamId: id } });
          return tx.team.update({
            where: { id },
            data: {
              name: data.name,
              gameId: data.gameId,
              mode: data.mode,
              members: { create: members },
              analyses: { create: { engineVersion: ENGINE_VERSION, result: validation.analysis } },
            },
          });
        }
        return tx.team.create({
          data: {
            userId: uid,
            name: data.name,
            gameId: data.gameId,
            mode: data.mode,
            members: { create: members },
            analyses: { create: { engineVersion: ENGINE_VERSION, result: validation.analysis } },
          },
        });
      });
      return json({ id: team.id }, method === 'POST' ? 201 : 200);
    }
  }
  if (resource === 'builds') {
    if (method === 'DELETE') {
      const result = await db.build.deleteMany({ where: { id, userId: uid } });
      if (!result.count) throw new HttpError(404, 'Build não encontrada.');
      return json({ ok: true });
    }
    if (method === 'POST' || method === 'PATCH') {
      const data = buildSchema.parse(await parseBody(request));
      await validateMembers([data.member], data.gameId);
      const build = await db.$transaction(async (tx) => {
        if (method === 'PATCH') {
          const own = await tx.build.findFirst({ where: { id, userId: uid } });
          if (!own) throw new HttpError(404, 'Build não encontrada.');
          await tx.buildMove.deleteMany({ where: { buildId: id } });
          return tx.build.update({
            where: { id },
            data: {
              name: data.name,
              formId: data.member.formId,
              gameId: data.gameId,
              style: data.style,
              config: {
                itemId: data.member.itemId ?? null,
                abilityId: data.member.abilityId ?? null,
                nature: data.member.nature ?? null,
              },
              moves: { create: data.member.moves.map((moveId, slot) => ({ moveId, slot })) },
            },
          });
        }
        return tx.build.create({
          data: {
            userId: uid,
            name: data.name,
            formId: data.member.formId,
            gameId: data.gameId,
            style: data.style,
            config: {
              itemId: data.member.itemId ?? null,
              abilityId: data.member.abilityId ?? null,
              nature: data.member.nature ?? null,
            },
            moves: { create: data.member.moves.map((moveId, slot) => ({ moveId, slot })) },
          },
        });
      });
      return json({ id: build.id }, 201);
    }
  }
  throw new HttpError(404, 'Recurso não encontrado.');
}
async function route(request: Request, context: Context) {
  try {
    return await handle(request, context);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json(
        { error: error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') },
        400,
      );
    console.error(
      JSON.stringify({
        event: 'request_failed',
        path: new URL(request.url).pathname,
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    return json(
      { error: 'Não foi possível concluir a operação. Verifique o banco e tente novamente.' },
      500,
    );
  }
}
export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
