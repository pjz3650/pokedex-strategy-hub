import { expect,test } from '@playwright/test';
import { randomBytes } from 'node:crypto';
const origin = 'http://127.0.0.1:3000';

test('Tyranitar e Mega Tyranitar exibem builds e análise de Z-A', async ({ page }) => {
  await page.goto('/builds');
  await page.getByLabel('Jogo selecionado').selectOption('za');
  await page.getByLabel('Pokémon para analisar', { exact: true }).selectOption('248');
  await expect(page.getByRole('heading', { name: 'Tyranitar', exact: true })).toBeVisible();
  await expect(page.getByLabel('Movimento 1', { exact: true })).not.toHaveValue('');
  await expect(page.getByLabel('Movimento 4', { exact: true })).not.toHaveValue('');
  await page.getByLabel('Pokémon para analisar', { exact: true }).selectOption('10049');
  await expect(page.getByRole('heading', { name: 'Tyranitar · Mega', exact: true })).toBeVisible();
  await expect(page.getByLabel('Movimento 1', { exact: true })).not.toHaveValue('');
  await expect(page.getByLabel('Movimento 4', { exact: true })).not.toHaveValue('');
  await expect(page.getByRole('button', { name: 'Salvar build' })).toBeDisabled();
  await page.goto('/analisador');
  await page.getByLabel('Pokémon para analisar', { exact: true }).selectOption('248');
  await expect(page.getByLabel('Movimento 1', { exact: true })).not.toHaveValue('');
  await page.getByLabel('Jogo selecionado').selectOption('arceus');
  await expect(
    page.getByLabel('Pokémon para analisar', { exact: true }).locator('option[value="248"]'),
  ).toHaveCount(0);
});
test('dashboard, filtros, troca de jogo e detalhe real', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Toda grande equipe começa aqui.' }),
  ).toBeVisible();
  await page.goto('/pokedex');
  await page.getByLabel('Pesquisar Pokémon', { exact: true }).fill('Lucario');
  await expect(page.getByRole('heading', { name: 'Lucario', exact: true })).toBeVisible();
  await page.getByLabel('Jogo selecionado').selectOption('arceus');
  await expect(page.getByText('Pokémon Legends: Arceus.', { exact: false }).first()).toBeVisible();
  await page.goto('/pokemon/448?game=za');
  await expect(page.getByRole('heading', { name: 'Lucario', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Movimentos' }).click();
  await expect(page.getByRole('cell', { name: 'Aura Sphere', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Cooldown' })).toBeVisible();
});
test('layout sem overflow horizontal e menu mobile funcional', async ({ page, isMobile }) => {
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir navegação' }).click();
    await page.getByRole('link', { name: 'Construtor de equipes', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Encontre o equilíbrio do seu time.' }),
    ).toBeVisible();
  }
});
test('registro, login, equipes, builds, favoritos e autorização', async ({ page, request }) => {
  const suffix = randomBytes(5).toString('hex');
  const email = `e2e-${suffix}@example.test`;
  const password = `Test-${randomBytes(14).toString('hex')}`;
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByLabel('SEU NOME', { exact: true }).fill('Treinador de teste');
  await page.getByLabel('E-MAIL', { exact: true }).fill(email);
  await page.getByLabel('SENHA', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByRole('heading', { name: 'Sua jornada, suas escolhas.' })).toBeVisible();
  await page.goto('/equipes');
  await page.getByLabel('Adicionar integrante', { exact: true }).selectOption('448');
  await page.getByRole('button', { name: 'Sugerir movimentos' }).click();
  await page.getByLabel('Nome da equipe').fill(`Teste ${suffix}`);
  await page.getByRole('button', { name: 'Salvar equipe', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atualizar equipe' })).toBeVisible();
  const me = await page.request.get('/api/hub/me');
  expect(me.ok()).toBeTruthy();
  const personal = await me.json();
  const team = personal.teams.find((t: { name: string }) => t.name === `Teste ${suffix}`);
  expect(team.members).toHaveLength(1);
  expect(team.members[0].config.moves).toHaveLength(4);
  const unauthorized = await request.patch(`/api/hub/teams/${team.id}`, {
    headers: { Origin: origin },
    data: { name: 'Hijack', gameId: 'sword', members: [{ formId: 25, moves: [] }] },
  });
  expect(unauthorized.status()).toBe(401);
  const otherEmail = `other-${suffix}@example.test`;
  expect(
    (
      await request.post('/api/hub/register', {
        headers: { Origin: origin },
        data: { name: 'Outra conta de teste', email: otherEmail, password },
      })
    ).status(),
  ).toBe(201);
  const csrf = await (await request.get('/api/auth/csrf')).json();
  await request.post('/api/auth/callback/credentials', {
    headers: { Origin: origin, 'X-Auth-Return-Redirect': '1' },
    form: { csrfToken: csrf.csrfToken, email: otherEmail, password, callbackUrl: origin },
  });
  expect((await request.get('/api/hub/me')).status()).toBe(200);
  expect(
    (
      await request.patch(`/api/hub/teams/${team.id}`, {
        headers: { Origin: origin },
        data: {
          name: 'Tentativa entre contas',
          gameId: 'sword',
          members: [{ formId: 25, moves: [] }],
        },
      })
    ).status(),
  ).toBe(404);
  expect(
    (await request.delete(`/api/hub/teams/${team.id}`, { headers: { Origin: origin } })).status(),
  ).toBe(404);
  await page.goto('/pokedex');
  await page.getByLabel('Pesquisar Pokémon', { exact: true }).fill('Lucario');
  await page.getByRole('button', { name: 'Adicionar Lucario aos favoritos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remover Lucario dos favoritos', exact: true }),
  ).toBeVisible();
  await page.goto('/pokemon/448?game=sword');
  await page.getByRole('tab', { name: 'Builds estratégicas' }).click();
  await page.getByRole('button', { name: 'Salvar build', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Build salva');
  await page.goto('/builds');
  await page.getByRole('button', { name: 'Editar build', exact: true }).click();
  await page.getByLabel('NOME DA BUILD', { exact: true }).fill(`Build editada ${suffix}`);
  await page.getByRole('button', { name: 'Atualizar build', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Build salva');
  expect((await (await page.request.get('/api/hub/me')).json()).builds[0].name).toBe(
    `Build editada ${suffix}`,
  );
  await page.goto('/minhas-equipes');
  await expect(page.getByRole('heading', { name: `Teste ${suffix}` })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir no construtor' }).click();
  await page.getByLabel('Nome da equipe').fill(`Editado ${suffix}`);
  await page.getByRole('button', { name: 'Atualizar equipe' }).click();
  await expect(page.getByRole('status')).toContainText('Equipe salva');
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Um lugar para guardar suas estratégias.' }),
  ).toBeVisible();
  expect((await page.request.get('/api/hub/me')).status()).toBe(401);
  await page.getByLabel('E-MAIL', { exact: true }).fill(email);
  await page.getByLabel('SENHA', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page.getByRole('heading', { name: 'Sua jornada, suas escolhas.' })).toBeVisible();
  expect((await (await page.request.get('/api/hub/me')).json()).favorites).toContain(448);
  // Only synthetic records created by this test are deleted.
  const final = await (await page.request.get('/api/hub/me')).json();
  for (const b of final.builds)
    expect(
      (await page.request.delete(`/api/hub/builds/${b.id}`, { headers: { Origin: origin } })).ok(),
    ).toBeTruthy();
  expect(
    (await page.request.delete(`/api/hub/teams/${team.id}`, { headers: { Origin: origin } })).ok(),
  ).toBeTruthy();
});
test('limites de disponibilidade e funcionamento sem IA', async ({ page, request }) => {
  const illegal = await request.post('/api/hub/analyze', {
    headers: { Origin: origin },
    data: { gameId: 'arceus', members: [{ formId: 25, moves: [], itemId: 1 }] },
  });
  expect(illegal.status()).toBe(400);
  const crossOrigin = await request.post('/api/hub/register', {
    headers: { Origin: 'https://attacker.example' },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
  const unavailable = await request.post('/api/hub/generate', {
    headers: { Origin: origin },
    data: {
      gameId: 'za',
      mode: 'story',
      stage: 0,
      dlc: false,
      ignoreProgress: false,
      style: 'balanced',
      required: [],
      banned: [],
      size: 6,
    },
  });
  expect(unavailable.status()).toBe(400);
  await page.goto('/assistente');
  await page.getByRole('button', { name: 'Analisar o Pokémon selecionado' }).click();
  await expect(
    page.getByText(/Assistente generativo desabilitado. Análise determinística/),
  ).toBeVisible();
  await page.goto('/tiers');
  await page.getByRole('button', { name: 'Referências comunitárias' }).click();
  await expect(
    page.getByRole('heading', { name: 'Evidências insuficientes para agregar' }),
  ).toBeVisible();
});
test('geração real, formas e capturas de validação', async ({ page, request }, testInfo) => {
  const response = await request.post('/api/hub/generate', {
    headers: { Origin: origin },
    data: {
      gameId: 'za',
      mode: 'story',
      stage: 3,
      dlc: false,
      ignoreProgress: true,
      style: 'balanced',
      required: [448],
      banned: [],
      size: 6,
      variant: 0,
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const result = await response.json();
  expect(result.members).toHaveLength(6);
  expect(new Set(result.members.map((m: { formId: number }) => m.formId)).size).toBe(6);
  await page.goto('/pokemon/10034?game=za');
  await expect(
    page.getByRole('heading', { name: 'Charizard · Mega X', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('TRANSFORMAÇÃO TEMPORÁRIA', { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Toda grande equipe começa aqui.' }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('troca de forma regional, comparação e tema claro', async ({ page }) => {
  await page.goto('/pokemon/38?game=sword');
  await page.getByRole('tab', { name: 'Formas e obtenção' }).click();
  await page.getByRole('link').filter({ hasText: 'Ninetales · Alola' }).click();
  await expect(page.getByRole('heading', { name: 'Ninetales · Alola', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Visão geral', exact: true }).click();
  await expect(page.getByText('Gelo', { exact: true }).first()).toBeVisible();
  await page.goto('/comparador');
  await expect(
    page.getByRole('heading', { name: 'Duas escolhas. Contextos diferentes.' }),
  ).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Tipo do ataque' })).toBeVisible();
  await page.getByRole('button', { name: 'Ativar tema claro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await page
    .getByLabel('E-MAIL', { exact: true })
    .fill(`missing-${randomBytes(5).toString('hex')}@example.test`);
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'SMTP' })).toBeVisible();
});
