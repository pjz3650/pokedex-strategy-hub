import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { selectPokemon } from './helpers';
const origin = process.env.POKETACTICS_TEST_URL ?? 'http://127.0.0.1:3000';
const created = new Set<string>();
async function login(page: Page) {
  const email = 'ux-recovery-' + randomBytes(9).toString('hex') + '@example.test';
  const password = 'Synthetic-' + randomBytes(12).toString('hex');
  const db = new PrismaClient();
  try {
    await db.user.create({
      data: { name: 'Teste recuperação', email, passwordHash: await hash(password, 12) },
    });
    created.add(email);
  } finally {
    await db.$disconnect();
  }
  const { csrfToken } = await (await page.request.get('/api/auth/csrf')).json();
  await page.request.post('/api/auth/callback/credentials', {
    headers: { Origin: origin, 'X-Auth-Return-Redirect': '1' },
    form: { csrfToken, email, password, callbackUrl: origin },
  });
  return (await page.request.get('/api/hub/me')).json();
}
test.afterEach(async () => {
  if (!created.size) return;
  const db = new PrismaClient();
  try {
    await db.user.deleteMany({ where: { email: { in: [...created] } } });
    created.clear();
  } finally {
    await db.$disconnect();
  }
});
test('etapas por jogo hidratam sem sobrescrever edição anterior à resposta da sessão', async ({
  page,
}) => {
  await login(page);
  await page.request.patch('/api/hub/me', {
    headers: { Origin: origin },
    data: {
      name: 'Teste recuperação',
      preferences: {
        game: 'sword',
        stage: 2,
        stages: { sword: 2, arceus: 1, za: 3 },
        theme: 'light',
        history: false,
      },
    },
  });
  const personal = await (await page.request.get('/api/hub/me')).json();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/hub/me', async (route) => {
    await gate;
    await route.fulfill({ json: personal });
  });
  await page.goto('/gerador');
  await page.getByLabel('Jogo selecionado').selectOption('za');
  const stage = page.getByRole('combobox', { name: 'ETAPA DA CAMPANHA', exact: true });
  await stage.selectOption('1');
  release();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).owner),
    )
    .toBe(personal.user.id);
  await expect(stage).toHaveValue('1');
  await page.getByLabel('Jogo selecionado').selectOption('sword');
  await expect(stage).toHaveValue('2');
  await page.getByLabel('Jogo selecionado').selectOption('za');
  await expect(stage).toHaveValue('1');
  await page.reload();
  await expect(stage).toHaveValue('3');
  await page.unroute('**/api/hub/me');
  // Real favorites from a synthetic owner also exercise page 2 and its explicit return origin.
  const catalog = await (await page.request.get('/api/hub/catalog?game=za&page=1')).json();
  const second = await (await page.request.get('/api/hub/catalog?game=za&page=2')).json();
  const db = new PrismaClient();
  try {
    await db.favorite.createMany({
      data: [...catalog.items, ...second.items]
        .slice(0, 40)
        .map((p: { id: number }) => ({ userId: personal.user.id, formId: p.id })),
    });
  } finally {
    await db.$disconnect();
  }
  await page.goto('/favoritos?game=za&page=2&sort=name');
  await expect(page.locator('.pagination')).toContainText('Página 2');
  const card = page.locator('.pokemon-card-link').first();
  const cardId = await card.getAttribute('id');
  await card.click();
  await page.getByRole('link', { name: 'Voltar aos favoritos', exact: true }).click();
  await expect(page.locator('.pagination')).toContainText('Página 2');
  await expect(page.locator('#' + cardId)).toBeFocused();
});
test('storage bloqueado preserva a edição na memória e informa a limitação', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByLabel('Nome da equipe').fill('Somente memória');
  await expect(
    page.getByText('Armazenamento indisponível: o rascunho está apenas na memória.', {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel('Jogo selecionado').selectOption('arceus');
  await page.getByLabel('Jogo selecionado').selectOption('sword');
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Somente memória');
  await expect(page.locator('.team-slot.filled')).toHaveCount(1);
});
test('resposta antiga do gerador é descartada após nova revisão e cancelamento', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route('**/api/hub/generate', async (route) => {
    const first = calls++ === 0;
    const response = await route.fetch();
    if (first) await gate;
    await route.fulfill({ response });
  });
  await page.goto('/gerador');
  await page.getByLabel('Ignorar progresso', { exact: false }).check();
  await page.getByRole('button', { name: 'Gerar minha equipe', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Cancelar processamento', exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'INTEGRANTES', exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Gerar minha equipe', exact: true }).click();
  await expect(page.locator('.generated-members article')).toHaveCount(1);
  release();
  await expect(page.locator('.generated-members article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Outra combinação', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar processamento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gerar minha equipe', exact: true })).toBeEnabled();
  await page.unrouteAll({ behavior: 'wait' });
});
test('último membro removido encerra análise pendente e não mostra métricas antigas', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route('**/api/hub/analyze', async (route) => {
    const response = await route.fetch();
    requested();
    await gate;
    await route.fulfill({ response });
  });
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await started;
  await page.getByRole('button', { name: 'Remover Lucario', exact: true }).click();
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await expect(page.locator('.analysis-status')).not.toContainText('Recalculando');
  await expect(page.getByRole('heading', { name: 'Vamos encontrar as conexões' })).toBeVisible();
});
test('histórico opt-in real atualiza e mantém contexto do relatório após trocar jogo', async ({
  page,
}) => {
  await login(page);
  await page.request.patch('/api/hub/me', {
    headers: { Origin: origin },
    data: {
      name: 'Teste recuperação',
      preferences: { game: 'sword', stage: 0, theme: 'light', history: true },
    },
  });
  await page.goto('/assistente');
  await page.getByLabel('Contexto da análise', { exact: true }).fill('Histórico sintético');
  await page.getByRole('button', { name: 'Gerar análise', exact: true }).click();
  await expect(page.locator('.chat-history button')).toHaveCount(1);
  await page.getByLabel('Jogo selecionado').selectOption('za');
  await expect(page.locator('.chat-message.assistant span')).toContainText('Lucario / Sword');
  await page.reload();
  await page.locator('.chat-history button').click();
  await expect(page.locator('.chat-message.assistant span')).toContainText('Lucario / Sword');
  const personal = await (await page.request.get('/api/hub/me')).json();
  expect(
    personal.conversations[0].messages.find((m: { role: string }) => m.role === 'assistant')
      .context,
  ).toMatchObject({ gameId: 'sword', formId: 448 });
});
test('duas contas reais não compartilham rascunhos privados após logout', async ({ page }) => {
  const a = await login(page);
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByLabel('Nome da equipe').fill('Conta A privada');
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe' })).toBeVisible();
  await page
    .locator('a[href="/perfil"]')
    .first()
    .evaluate((a: HTMLAnchorElement) => a.click());
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route('**/api/hub/me', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    started();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
  await requested;
  const signedOut = page.waitForResponse((response) =>
    response.url().includes('/api/auth/signout'),
  );
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await signedOut;
  await expect(
    page.getByRole('button', { name: 'Entrar na minha conta', exact: true }),
  ).toBeVisible();
  const b = await login(page);
  expect(a.user.id).not.toBe(b.user.id);
  await page.goto('/equipes');
  await expect(page.locator('.team-slot.filled')).toHaveCount(0);
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Minha nova equipe');
  expect((await (await page.request.get('/api/hub/me')).json()).teams).toHaveLength(0);
});
test('fontes termina carregamento nas quatro combinações de sucesso e falha', async ({ page }) => {
  let sourcesFail = false;
  let healthFail = false;
  await page.route('**/api/hub/sources', (route) =>
    sourcesFail
      ? route.fulfill({ status: 503, json: { error: 'Falha sintética' } })
      : route.continue(),
  );
  await page.route('**/api/hub/health', (route) =>
    healthFail
      ? route.fulfill({ status: 503, json: { error: 'Falha sintética' } })
      : route.continue(),
  );
  for (const [s, h] of [
    [true, false],
    [false, true],
    [true, true],
    [false, false],
  ]) {
    sourcesFail = s;
    healthFail = h;
    await page.goto('/fontes');
    if (s)
      await expect(page.getByRole('button', { name: 'Repetir fontes', exact: true })).toBeVisible();
    else await expect(page.locator('.source-row').first()).toBeVisible();
    if (h)
      await expect(page.getByRole('button', { name: 'Repetir estado', exact: true })).toBeVisible();
    else await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
    await expect(page.getByText('Consultando...', { exact: true })).toHaveCount(0);
  }
});
test('layouts e sugestões cabem em 1440, 768, 390 e 320 nos dois temas', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 768, 390, 320])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : width === 768 ? 1024 : 844,
      });
      await page.goto('/equipes');
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        localStorage.setItem('hub-theme', t);
      }, theme);
      await page.getByRole('combobox', { name: 'Adicionar integrante', exact: true }).fill('Luc');
      await expect(page.locator('.picker-popup:not([hidden]) [role=option]').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(width + '-' + theme + '.png'),
        fullPage: true,
      });
      await page
        .getByRole('combobox', { name: 'Adicionar integrante', exact: true })
        .press('Escape');
      await page.getByRole('button', { name: 'Importar', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Importar equipe' })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.keyboard.press('Escape');
    }
});
test('seleção direta funciona com toque emulado', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Toque é exercitado no projeto móvel Chromium.');
  await page.goto('/equipes');
  const picker = page.getByRole('combobox', { name: 'Adicionar integrante', exact: true });
  await picker.tap();
  await picker.fill(' Lucário ');
  await page.locator('.picker-popup:not([hidden]) [role=option]').first().tap();
  await expect(page.locator('.team-slot.filled')).toContainText('Lucario');
});
