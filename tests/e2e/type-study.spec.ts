import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('prévia Mega de Z-A preserva a ficha Type Study e o radar', async ({ page }) => {
  await page.goto('/pokemon/6?game=za');
  await expect(page.getByRole('heading', { name: 'Charizard', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Perfil de atributos', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Prévia de Mega Evolução', exact: true }),
  ).toBeVisible();
  const preview = page.locator('.mega-preview-panel:visible');
  await expect(preview.getByText('Charizard · Mega X', { exact: true })).toBeVisible();
  await expect(preview.getByText('Charizard · Mega Y', { exact: true })).toBeVisible();
  await preview.locator('summary').first().click();
  await expect(preview.locator('.mega-defense-change').first()).toBeVisible();
  await page.getByRole('combobox', { name: 'Jogo selecionado', exact: true }).selectOption('sword');
  await expect(
    page.getByRole('heading', { name: 'Prévia de Mega Evolução', exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Perfil de atributos', exact: true }),
  ).toBeVisible();
});

test('Type Study mantém o tema salvo, nomes japoneses e abas por teclado', async ({ page }) => {
  await page.goto('/pokemon/6?game=sword');
  await expect(page.getByRole('heading', { name: 'Charizard', exact: true })).toBeVisible();
  await expect(page.locator('.japanese-name')).toHaveText('リザードン');
  await expect(page.locator('.japanese-name')).toHaveAttribute('lang', 'ja');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const overview = page.getByRole('tab', { name: 'Visão geral', exact: true });
  await overview.focus();
  await overview.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Movimentos' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'pokemon-tab-moves');
  await page.getByRole('tab', { name: 'Movimentos' }).press('End');
  await expect(page.getByRole('tab', { name: 'Formas e obtenção' })).toBeFocused();
  await page.getByRole('button', { name: 'Buscar Pokémon', exact: true }).click();
  await page.getByLabel('Busca global', { exact: true }).filter({ visible: true }).fill('Gengar');
  await expect(
    page
      .getByRole('dialog', { name: 'Buscar Pokémon' })
      .getByRole('button', { name: /Gengar/ })
      .first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Buscar Pokémon' })).not.toBeVisible();
});

test('seis integrantes conservam edição, exportação e importação', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/equipes');
  for (const id of ['1', '6', '25', '94', '448', '248']) {
    await page
      .getByLabel('Adicionar integrante', { exact: true })
      .filter({ visible: true })
      .selectOption(id);
    await expect(page.locator('.team-slot.filled')).toHaveCount(
      ['1', '6', '25', '94', '448', '248'].indexOf(id) + 1,
    );
  }
  await page.getByRole('button', { name: 'Sugerir movimentos', exact: true }).click();
  await expect(
    page.getByLabel('Movimento 4', { exact: true }).filter({ visible: true }),
  ).not.toHaveValue('');
  await expect(page.getByRole('button', { name: 'Adicionar Pokémon', exact: true })).toBeDisabled();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const file = await (await downloading).path();
  const json = await readFile(file!, 'utf8');
  expect(JSON.parse(json).members).toHaveLength(6);
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.getByLabel('JSON da equipe', { exact: true }).filter({ visible: true }).fill(json);
  await page.screenshot({
    path: `docs/type-study/after/${testInfo.project.name}-import-dialog.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Validar e importar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Equipe importada e validada');
  await expect(page.locator('.team-slot.filled')).toHaveCount(6);
  await page.getByRole('button', { name: 'Fechar aviso', exact: true }).click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>('.team-slot img')]
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode().catch(() => {})),
    );
  });
  await expect(page.locator('.analysis-status:visible')).toContainText('Análise atualizada');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: `docs/type-study/after/${testInfo.project.name}-six-member-team.png`,
    fullPage: true,
    animations: 'disabled',
  });
});
