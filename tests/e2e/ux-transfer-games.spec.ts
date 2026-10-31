import { expect, test } from '@playwright/test';
test('transferência de build conserva configuração e ordem nos três jogos', async ({ page }) => {
  for (const game of ['sword', 'arceus', 'za']) {
    await page.goto('/pokemon/25?game=' + game);
    await page.getByRole('tab', { name: 'Builds estratégicas', exact: true }).click();
    await page.getByLabel('Movimento 2', { exact: true }).selectOption('');
    await page.getByRole('combobox', { name: 'NATURE', exact: true }).selectOption('Hardy');
    if (game === 'sword') {
      const ability = page.getByRole('combobox', { name: 'HABILIDADE', exact: true });
      const id = await ability.locator('option').nth(1).getAttribute('value');
      await ability.selectOption(id!);
    }
    if (game !== 'arceus') {
      const item = page.getByRole('combobox', { name: 'ITEM', exact: true });
      const id = await item.locator('option').nth(1).getAttribute('value');
      await item.selectOption(id!);
    }
    const source = await page.evaluate(
      (g) => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).builds['current:' + g].member,
      game,
    );
    await page.getByRole('button', { name: 'Adicionar esta build à equipe', exact: true }).click();
    await page.getByRole('link', { name: 'Abrir construtor', exact: true }).click();
    const member = await page.evaluate(
      (g) => JSON.parse(sessionStorage.getItem('hub-drafts-v2')!).drafts[g].members[0],
      game,
    );
    expect(member).toEqual(source);
    expect(member.moves).toHaveLength(3);
    if (game === 'arceus') {
      expect(member.itemId).toBeUndefined();
      expect(member.abilityId).toBeUndefined();
    }
    if (game === 'za') expect(member.abilityId).toBeUndefined();
  }
});
