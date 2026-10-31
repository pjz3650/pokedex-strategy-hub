import { expect, type Page } from '@playwright/test';
export async function selectPokemon(page: Page, label: string, id: string) {
  const game = await page
    .getByLabel('Jogo selecionado', { exact: true })
    .filter({ visible: true })
    .inputValue();
  const response = await page.request.get('/api/hub/pokemon/' + id + '?game=' + game);
  expect(response.ok()).toBeTruthy();
  const detail = await response.json();
  const picker = page.getByRole('combobox', { name: label, exact: true }).filter({ visible: true });
  await picker.fill(detail.pokemon.name);
  const listId = await picker.getAttribute('aria-controls');
  const option = page
    .locator('[role="listbox"]')
    .filter({ visible: true })
    .getByRole('option')
    .filter({ hasText: detail.pokemon.name + ' · #' });
  expect(listId).toBeTruthy();
  await option.first().click();
}
