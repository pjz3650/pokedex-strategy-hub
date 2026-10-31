import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { selectPokemon } from './helpers';
const origin = process.env.POKETACTICS_TEST_URL ?? 'http://127.0.0.1:3000';
const synthetic = new Set<string>();
async function account(page: Page) {
  const email = 'ux-' + randomBytes(9).toString('hex') + '@example.test';
  const password = 'Synthetic-' + randomBytes(12).toString('hex');
  const db = new PrismaClient();
  try {
    await db.user.create({
      data: { name: 'Teste UX', email, passwordHash: await hash(password, 12) },
    });
    synthetic.add(email);
  } finally {
    await db.$disconnect();
  }
  const { csrfToken } = await (await page.request.get('/api/auth/csrf')).json();
  await page.request.post('/api/auth/callback/credentials', {
    headers: { Origin: origin, 'X-Auth-Return-Redirect': '1' },
    form: { csrfToken, email, password, callbackUrl: origin },
  });
  expect((await page.request.get('/api/hub/me')).status()).toBe(200);
  return { email, password };
}
test.afterEach(async () => {
  if (!synthetic.size) return;
  const db = new PrismaClient();
  try {
    await db.user.deleteMany({ where: { email: { in: [...synthetic] } } });
    synthetic.clear();
  } finally {
    await db.$disconnect();
  }
});
async function navigate(page: Page, href: string) {
  await page
    .locator('a[href="' + href + '"]')
    .first()
    .evaluate((a: HTMLAnchorElement) => a.click());
}
test('rascunhos por jogo, nome e slots estáveis sobrevivem ao reload', async ({ page }, info) => {
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByLabel('Nome da equipe').fill('Sword preservado');
  const fourth = page.getByLabel('Movimento 4', { exact: true });
  await expect(fourth.locator('option').nth(1)).toBeAttached();
  const options = await fourth
    .locator('option')
    .evaluateAll((items) => items.map((i) => (i as HTMLOptionElement).value).filter(Boolean));
  await fourth.selectOption(options[0]);
  await expect(page.getByLabel('Movimento 1', { exact: true })).toHaveValue('');
  await expect(fourth).toHaveValue(options[0]);
  await page.getByLabel('Movimento 2', { exact: true }).selectOption(options[1]);
  await page.getByLabel('Movimento 2', { exact: true }).selectOption('');
  await expect(fourth).toHaveValue(options[0]);
  for (const game of ['arceus', 'za']) {
    await page.getByLabel('Jogo selecionado', { exact: true }).selectOption(game);
    await expect(page.locator('.team-slot.filled')).toHaveCount(0);
    await selectPokemon(page, 'Adicionar integrante', '25');
    await page.getByLabel('Nome da equipe').fill(game + ' preservado');
  }
  await page.getByLabel('Jogo selecionado', { exact: true }).selectOption('sword');
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Sword preservado');
  await page.reload();
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Sword preservado');
  await expect(page.getByLabel('Movimento 1', { exact: true })).toHaveValue(options[0]);
  await page.screenshot({ path: info.outputPath('draft.png'), fullPage: true });
});
test('combobox confirma somente opção ativa e explica transformações antes da escolha', async ({
  page,
}) => {
  await page.goto('/analisador');
  const picker = page.getByRole('combobox', { name: 'Pokémon para analisar', exact: true });
  await picker.fill(' #0448 ');
  await picker.press('Enter');
  await expect(picker).toHaveAttribute('aria-expanded', 'true');
  await picker.press('ArrowDown');
  await expect(picker).toHaveAttribute('aria-activedescendant', /.+/);
  await picker.press('Enter');
  await expect(picker).toHaveValue('Lucario');
  await picker.fill('Pikachu');
  await picker.press('Escape');
  await expect(picker).toHaveValue('Lucario');
  await page.goto('/equipes');
  await page.getByLabel('Jogo selecionado').selectOption('za');
  const team = page.getByRole('combobox', { name: 'Adicionar integrante', exact: true });
  await team.fill('Charizard');
  await expect(page.getByRole('option').filter({ hasText: 'Charizard · Mega X' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(
    page.getByText('Transformação temporária: escolha uma forma permanente para a equipe.').first(),
  ).toBeVisible();
  await team.press('Escape');
  await page.getByLabel('Jogo selecionado').selectOption('sword');
  await selectPokemon(page, 'Adicionar integrante', '10104');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await expect(page.locator('.team-slot.filled')).toHaveCount(3);
  await page.goto('/comparador');
  const compare = page.getByRole('combobox', { name: 'Pokémon 1', exact: true });
  await compare.fill('Pikachu');
  await compare.press('ArrowDown');
  await compare.press('Enter');
  await expect(compare).toHaveValue('Pikachu');
  await page.getByRole('combobox', { name: 'Pokémon 2', exact: true }).fill('Pikachu');
  await expect(
    page
      .locator('.picker-popup:not([hidden]) [role=option]')
      .filter({ hasText: /^Pikachu · #025/ }),
  ).toHaveCount(0);
  await page.goto('/pokemon/10034?game=za');
  await expect(
    page.getByRole('button', { name: 'Adicionar espécie à equipe', exact: true }),
  ).toBeDisabled();
});
test('sessão 503 permite repetir; 401 elimina coleção e rascunhos privados', async ({ page }) => {
  let status = 503;
  await page.route('**/api/hub/me', (route) =>
    route.fulfill({ status, json: { error: 'Falha sintética' } }),
  );
  await page.goto('/minhas-equipes');
  await expect(
    page.getByText('Não foi possível sincronizar a sessão.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar ou criar conta' })).toHaveCount(0);
  status = 401;
  await page.getByRole('button', { name: 'Repetir', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Entrar ou criar conta' })).toBeVisible();
  await page.unroute('**/api/hub/me');
  await account(page);
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByLabel('Nome da equipe').fill('Privada A');
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe', exact: true })).toBeVisible();
  await page.route('**/api/hub/me', (route) =>
    route.fulfill({ status: 401, json: { error: 'Sessão encerrada' } }),
  );
  await page.reload();
  await expect(page.locator('.team-slot.filled')).toHaveCount(0);
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Minha nova equipe');
});
test('gravação com refresh falho mantém ID, PATCH e nome local; Nova equipe faz POST', async ({
  page,
}) => {
  await account(page);
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByLabel('Nome da equipe').fill('Primeira equipe');
  let fail = true;
  await page.route('**/api/hub/me', (route) =>
    fail ? route.fulfill({ status: 503, json: { error: 'Falha de refresh' } }) : route.continue(),
  );
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.locator('.toast')).toContainText('Gravação concluída');
  await expect(page.getByRole('button', { name: 'Atualizar equipe', exact: true })).toBeVisible();
  await page.getByLabel('Nome da equipe').fill('Nome ainda não salvo');
  fail = false;
  await page.getByRole('button', { name: 'Repetir', exact: true }).click();
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Nome ainda não salvo');
  const first = (await (await page.request.get('/api/hub/me')).json()).teams[0];
  await page.reload();
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Nome ainda não salvo');
  const patch = page.waitForRequest(
    (r) => r.url().includes('/api/hub/teams/') && r.method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Atualizar equipe', exact: true }).click();
  expect((await patch).url()).toContain(first.id);
  await expect(page.locator('.toast')).toContainText('Equipe salva');
  await page.getByLabel('Nome da equipe').fill('Alteração pendente');
  await navigate(page, '/minhas-equipes');
  await page.getByRole('button', { name: 'Nova equipe', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Substituir rascunho', exact: true }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Nova equipe', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar e abrir', exact: true }).click();
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Minha nova equipe');
  await selectPokemon(page, 'Adicionar integrante', '25');
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe', exact: true })).toBeVisible();
  const teams = (await (await page.request.get('/api/hub/me')).json()).teams;
  expect(teams).toHaveLength(2);
  expect(teams.map((t: { id: string }) => t.id)).toContain(first.id);
  await navigate(page, '/builds');
  await page.getByRole('button', { name: 'Salvar build', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar build', exact: true })).toBeVisible();
  const build = (await (await page.request.get('/api/hub/me')).json()).builds[0];
  await page.getByRole('button', { name: 'Excluir build ' + build.name, exact: true }).click();
  const deletion = page.getByRole('dialog', { name: 'Excluir build ' + build.name + '?' });
  await deletion.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await (await page.request.get('/api/hub/me')).json()).builds).toHaveLength(1);
  await page.getByRole('button', { name: 'Excluir build ' + build.name, exact: true }).click();
  await deletion.getByRole('button', { name: 'Excluir build', exact: true }).click();
  await expect(deletion).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar build', exact: true })).toBeVisible();
});
test('exclusão pede confirmação, mantém erro no modal e desvincula a equipe aberta', async ({
  page,
}) => {
  await account(page);
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByLabel('Nome da equipe').fill('Equipe descartável');
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe', exact: true })).toBeVisible();
  await navigate(page, '/minhas-equipes');
  let deletes = 0;
  let failure = true;
  await page.route('**/api/hub/teams/*', (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();
    deletes++;
    return failure
      ? route.fulfill({ status: 503, json: { error: 'Falha sintética de exclusão' } })
      : route.continue();
  });
  const trigger = page.getByRole('button', {
    name: 'Excluir equipe Equipe descartável',
    exact: true,
  });
  await trigger.click();
  expect(deletes).toBe(0);
  const modal = page.getByRole('dialog', { name: 'Excluir equipe Equipe descartável?' });
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(deletes).toBe(0);
  await trigger.click();
  await modal.getByRole('button', { name: 'Excluir equipe', exact: true }).click();
  await expect(modal.getByRole('alert')).toHaveText('Falha sintética de exclusão');
  failure = false;
  await modal.getByRole('button', { name: 'Excluir equipe', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(deletes).toBe(2);
  await navigate(page, '/equipes');
  await expect(page.getByRole('button', { name: 'Salvar equipe', exact: true })).toBeVisible();
  await expect(page.locator('.team-slot.filled')).toHaveCount(1);
});
test('build manual conserva configuração, estilo e transferência completa', async ({ page }) => {
  await page.goto('/pokemon/448?game=sword');
  await page.getByRole('tab', { name: 'Builds estratégicas' }).click();
  await page.getByLabel('NOME DA BUILD', { exact: true }).fill('Minha build local');
  const first = page.getByLabel('Movimento 1', { exact: true });
  await first.selectOption('');
  const before = await page.getByLabel('Movimento 2', { exact: true }).inputValue();
  await page.getByLabel('Estilo da build').selectOption('defensive');
  await expect(first).toHaveValue('');
  await expect(page.getByLabel('Movimento 2', { exact: true })).toHaveValue(before);
  await page.getByRole('button', { name: 'Aplicar sugestão deste estilo', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(first).toHaveValue('');
  await page.getByRole('tab', { name: /^Movimentos/ }).click();
  await page.getByRole('tab', { name: 'Builds estratégicas' }).click();
  await expect(page.getByLabel('NOME DA BUILD', { exact: true })).toHaveValue('Minha build local');
  await page.reload();
  await page.getByRole('tab', { name: 'Builds estratégicas' }).click();
  const expected = await page.evaluate(() => {
    const saved = JSON.parse(sessionStorage.getItem('hub-drafts-v2')!);
    return saved.builds['sword:448:new'].member;
  });
  await page.getByRole('button', { name: 'Adicionar esta build à equipe', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir construtor', exact: true }).click();
  const actual = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).drafts.sword.members[0],
  );
  expect(actual).toEqual(expected);
  await navigate(page, '/analisador');
  await selectPokemon(page, 'Pokémon para analisar', '248');
  await page.getByLabel('NOME DA BUILD', { exact: true }).fill('Tyranitar ainda em edição');
  await page.getByRole('link', { name: 'Ficha completa', exact: false }).click();
  await page.goBack();
  await expect(
    page.getByRole('combobox', { name: 'Pokémon para analisar', exact: true }),
  ).toHaveValue('Tyranitar');
  await expect(page.getByLabel('NOME DA BUILD', { exact: true })).toHaveValue(
    'Tyranitar ainda em edição',
  );
});
test('time cheio permite cancelar/substituir e desfazer remoção sem perder configuração', async ({
  page,
}) => {
  await page.goto('/equipes');
  for (const id of ['1', '6', '25', '94', '448', '248'])
    await selectPokemon(page, 'Adicionar integrante', id);
  await page.getByRole('button', { name: 'Substituir integrante', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.team-slot.filled')).toHaveCount(6);
  await page.getByRole('button', { name: 'Substituir integrante', exact: true }).click();
  await selectPokemon(page, 'Novo integrante', '38');
  await expect(page.locator('.team-slot.filled').last()).toContainText('Ninetales');
  await page.getByRole('button', { name: 'Remover Ninetales', exact: true }).click();
  await page.getByRole('button', { name: 'Desfazer remoção', exact: true }).click();
  await expect(page.locator('.team-slot.filled')).toHaveCount(6);
  await navigate(page, '/builds');
  await page.getByRole('button', { name: 'Adicionar esta build à equipe', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Adicionar build ao time cheio' });
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar esta build à equipe', exact: true }).click();
  await modal
    .getByRole('combobox', { name: 'Integrante para substituir', exact: true })
    .selectOption('0');
  await modal.getByRole('button', { name: 'Confirmar substituição', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir construtor', exact: true }).click();
  await expect(page.locator('.team-slot.filled')).toHaveCount(6);
  await expect(page.locator('.team-slot.filled').first()).toContainText('Lucario');
});
test('importação inválida preserva texto, time e erro dentro do diálogo', async ({ page }) => {
  await page.goto('/equipes');
  await selectPokemon(page, 'Adicionar integrante', '448');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Importar equipe', exact: true });
  const input = modal.getByLabel('JSON da equipe', { exact: true });
  await modal.getByLabel('Arquivo JSON da equipe').setInputFiles({
    name: 'grande.json',
    mimeType: 'application/json',
    buffer: Buffer.from(' '.repeat(65000)),
  });
  await expect(modal.getByRole('alert')).toContainText('64 KB');
  await input.fill('{ quebrado');
  await modal.getByRole('button', { name: 'Validar e importar' }).click();
  await expect(modal.getByRole('alert')).toContainText('JSON inválido');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveValue('{ quebrado');
  await input.fill(
    JSON.stringify({
      version: 1,
      name: 'Importada',
      gameId: 'arceus',
      members: [{ formId: 25, moves: [] }],
    }),
  );
  await modal.getByRole('button', { name: 'Validar e importar' }).click();
  let fail = true;
  await page.route('**/api/hub/analyze', (route) =>
    route.request().postDataJSON().gameId === 'arceus' && fail
      ? route.fulfill({ status: 503, json: { error: 'Falha sintética de validação' } })
      : route.continue(),
  );
  await modal.getByRole('button', { name: 'Confirmar importação' }).click();
  await expect(modal.getByRole('alert')).toContainText('Falha sintética de validação');
  await expect(page.getByLabel('Jogo selecionado')).toHaveValue('sword');
  await expect(input).toHaveValue(/"gameId":"arceus"/);
  fail = false;
  await modal.getByRole('button', { name: 'Confirmar importação' }).click();
  await expect(page.getByLabel('Jogo selecionado')).toHaveValue('arceus');
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Importada');
  await page.getByLabel('Jogo selecionado').selectOption('sword');
  await expect(page.locator('.team-slot.filled')).toContainText('Lucario');
});
test('catálogo página 2 volta com filtros, jogo e foco no card de origem', async ({ page }) => {
  await page.goto('/pokedex?game=sword&sort=name&page=2');
  await expect(page.locator('.pagination')).toContainText('Página 2');
  const card = page.locator('.pokemon-card-link').first();
  const cardId = await card.getAttribute('id');
  await card.click();
  await page.getByRole('link', { name: 'Voltar à Pokédex', exact: true }).click();
  await expect(page.locator('.pagination')).toContainText('Página 2');
  await expect(page.getByLabel('Ordenar Pokémon')).toHaveValue('name');
  await expect(page.locator('#' + cardId)).toBeFocused();
  await page.getByLabel('Pesquisar Pokémon').fill(' Lucário ');
  await expect(page.locator('.pokemon-card')).toHaveCount(1);
  await page.getByLabel('Ordenar Pokémon').selectOption('bst');
  await page.goBack();
  await expect(page.getByLabel('Ordenar Pokémon')).toHaveValue('name');
  await expect(page.getByLabel('Pesquisar Pokémon')).toHaveValue(' Lucário ');
});
test('movimentos distingue vazio filtrado e permite limpar filtros', async ({ page }) => {
  await page.goto('/pokemon/448?game=sword');
  await page.getByRole('tab', { name: /^Movimentos/ }).click();
  await page.getByLabel('Pesquisar movimentos').fill('zzzzz');
  await expect(
    page.getByRole('heading', { name: 'Nenhum movimento corresponde aos filtros' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
test('fontes e estado têm falhas independentes e recuperação localizada', async ({ page }) => {
  let fail = true;
  await page.route('**/api/hub/health', (route) =>
    fail ? route.fulfill({ status: 503, json: { error: 'Falha sintética' } }) : route.continue(),
  );
  await page.goto('/fontes');
  await expect(page.getByRole('button', { name: 'Repetir estado', exact: true })).toBeVisible();
  await expect(page.locator('.source-row').first()).toBeVisible();
  await expect(page.getByText('Consultando...', { exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Repetir estado', exact: true }).click();
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
});
test('assistente identifica relatórios e retry preserva a anotação original', async ({ page }) => {
  await page.goto('/assistente');
  await page.getByLabel('Contexto da análise', { exact: true }).fill('Minha anotação');
  let fail = true;
  await page.route('**/api/hub/assistant', (route) =>
    fail ? route.fulfill({ status: 503, json: { error: 'Falha sintética' } }) : route.continue(),
  );
  await page.getByRole('button', { name: 'Gerar análise', exact: true }).click();
  await expect(page.getByLabel('Contexto da análise', { exact: true })).toHaveValue(
    'Minha anotação',
  );
  await selectPokemon(page, 'Pokémon em contexto', '25');
  fail = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.locator('.chat-message.assistant span')).toContainText('Lucario / Sword');
  await expect(page.getByRole('combobox', { name: 'Pokémon em contexto' })).toHaveValue('Pikachu');
});
test('gerador explica modo estrito e invalida resultado ao mudar critérios', async ({ page }) => {
  await page.goto('/gerador');
  await page.getByRole('button', { name: 'Gerar minha equipe', exact: true }).click();
  await expect(page.locator('.error-notice[role=alert]')).toContainText(
    'etapas verificados suficientes',
  );
  await expect(page.getByLabel('Ignorar progresso', { exact: false })).not.toBeChecked();
  await page
    .getByRole('button', { name: 'Permitir etapas desconhecidas e gerar', exact: true })
    .click();
  await expect(page.locator('.generated-members article')).toHaveCount(6);
  await page.getByRole('combobox', { name: 'INTEGRANTES', exact: true }).selectOption('1');
  await expect(page.getByText('Resultado anterior:', { exact: false })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ajustar no construtor', exact: false }),
  ).toBeDisabled();
  await selectPokemon(page, 'Pokémon obrigatórios (opcional)', '448');
  await selectPokemon(page, 'Pokémon obrigatórios (opcional)', '25');
  await expect(page.locator('.error-notice[role=alert]')).toContainText(
    '2 obrigatórios para 1 vaga',
  );
  await expect(
    page.getByRole('button', { name: 'Gerar minha equipe', exact: true }),
  ).toBeDisabled();
});

test('jornada completa: filtro, build, salvar, gerar novamente, comparar e substituir', async ({
  page,
}) => {
  test.setTimeout(120000);
  await account(page);
  await page.goto('/pokedex?game=sword');
  await page.getByLabel('Pesquisar Pokémon').fill(' Lucário ');
  await page.getByLabel('Filtrar por tipo').selectOption('fighting');
  await page.locator('.pokemon-card-link').click();
  await page.getByRole('tab', { name: 'Builds estratégicas', exact: true }).click();
  await page.getByRole('combobox', { name: 'NATURE', exact: true }).selectOption('Adamant');
  const source = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).builds['current:sword'].member,
  );
  await page.getByRole('button', { name: 'Adicionar esta build à equipe', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir construtor', exact: true }).click();
  await page.getByLabel('Nome da equipe').fill('Jornada da build');
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe', exact: true })).toBeVisible();
  const saved = (await (await page.request.get('/api/hub/me')).json()).teams[0];
  expect(saved.members[0].config.moves).toEqual(source.moves);
  expect(saved.members[0].config.nature).toBe('Adamant');
  await page.getByLabel('Jogo selecionado').selectOption('arceus');
  await page.getByLabel('Jogo selecionado').selectOption('sword');
  await expect(page.getByLabel('Nome da equipe')).toHaveValue('Jornada da build');
  await navigate(page, '/gerador');
  await page.getByRole('button', { name: 'Gerar minha equipe', exact: true }).click();
  await page
    .getByRole('button', { name: 'Permitir etapas desconhecidas e gerar', exact: true })
    .click();
  await expect(page.locator('.generated-members article')).toHaveCount(6);
  await page.getByRole('combobox', { name: 'INTEGRANTES', exact: true }).selectOption('1');
  await expect(
    page.getByRole('button', { name: 'Ajustar no construtor', exact: false }),
  ).toBeDisabled();
  await page.getByRole('combobox', { name: 'INTEGRANTES', exact: true }).selectOption('6');
  await page.getByRole('button', { name: 'Gerar minha equipe', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Ajustar no construtor', exact: false }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Ajustar no construtor', exact: false }).click();
  await expect(page.locator('.team-slot.filled')).toHaveCount(6);
  const before = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).drafts.sword.members,
  );
  await page.getByRole('link', { name: 'Analisar Pokémon', exact: false }).click();
  await page.getByRole('link', { name: 'Comparar', exact: true }).click();
  await selectPokemon(page, 'Pokémon 1', '38');
  await navigate(page, '/equipes');
  await page.getByRole('button', { name: 'Substituir integrante', exact: true }).click();
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).drafts.sword.members,
    ),
  ).toEqual(before);
  await page.getByRole('button', { name: 'Substituir integrante', exact: true }).click();
  await selectPokemon(page, 'Novo integrante', '25');
  await expect(page.locator('.team-slot.filled').first()).toContainText('Pikachu');
  await page.getByLabel('Nome da equipe').fill('Jornada gerada');
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe', exact: true })).toBeVisible();
  const teams = (await (await page.request.get('/api/hub/me')).json()).teams;
  expect(teams).toHaveLength(2);
  expect(teams.find((t: { name: string }) => t.name === 'Jornada gerada').members).toHaveLength(6);
});
