import { HubProvider } from '@/components/providers';
import { Shell } from '@/components/shell';
import { getCatalog } from '@/lib/repository';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const uiFont = localFont({
  src: [
    { path: '../../public/fonts/Barlow-Regular.ttf', weight: '400' },
    { path: '../../public/fonts/Barlow-SemiBold.ttf', weight: '600' },
    { path: '../../public/fonts/Barlow-Bold.ttf', weight: '700' },
  ],
  variable: '--font-ui',
  display: 'swap',
});
const displayFont = localFont({
  src: '../../public/fonts/BarlowCondensed-Bold.ttf',
  weight: '700',
  variable: '--font-display',
  display: 'swap',
});
const japaneseFont = localFont({
  src: '../../public/fonts/NotoSansJP-Black.woff2',
  weight: '900',
  variable: '--font-japanese',
  display: 'swap',
  preload: false,
});
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
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${uiFont.variable} ${displayFont.variable} ${japaneseFont.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('hub-theme')==='dark'?'dark':'light'}catch{}",
          }}
        />
      </head>
      <body>
        <HubProvider catalog={catalog}>
          <Shell>{children}</Shell>
        </HubProvider>
      </body>
    </html>
  );
}
