import { HubPage } from '@/components/hub-page';
import { notFound } from 'next/navigation';
const routes = [
  'pokedex',
  'analisador',
  'builds',
  'equipes',
  'gerador',
  'tiers',
  'comparador',
  'assistente',
  'minhas-equipes',
  'favoritos',
  'perfil',
  'fontes',
  'pokemon',
];
export default async function Page({ params }: { params: Promise<{ route?: string[] }> }) {
  const { route = [] } = await params;
  if (
    route.length &&
    (!routes.includes(route[0]) ||
      (route[0] !== 'pokemon' && route.length > 1) ||
      (route[0] === 'pokemon' && (route.length !== 2 || !/^\d+$/.test(route[1]))))
  )
    notFound();
  return (
    <HubPage
      section={route[0] ?? 'dashboard'}
      pokemonId={route[0] === 'pokemon' ? Number(route[1]) : undefined}
    />
  );
}
