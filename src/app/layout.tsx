import { HubProvider } from '@/components/providers';
import { Shell } from '@/components/shell';
import { getCatalog } from '@/lib/repository';
import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Pokétactics — Sua próxima jogada começa aqui', template: '%s · Pokétactics' },
  description:
    'Pokédex e análise estratégica para Pokémon Sword, Legends: Arceus e Legends: Z-A. Construa equipes com dados por jogo e critérios explicáveis.',
};
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let catalog: Awaited<ReturnType<typeof getCatalog>> = [];
  try {
    catalog = await getCatalog();
  } catch {
    console.error(JSON.stringify({ event: 'catalog_unavailable' }));
  }
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <HubProvider catalog={catalog}>
          <Shell>{children}</Shell>
        </HubProvider>
      </body>
    </html>
  );
}
