'use client';
import { AccountPage } from './account-page';
import { Catalog,Dashboard } from './dashboard-catalog';
import { DetailPage } from './pokemon-detail';
import { EmptyState } from './pokemon-ui';
import { useHub } from './providers';
import { Generator,SavedTeams,TeamBuilder } from './team-pages';
import { Analyzer,Assistant,Comparator,Sources,Tiers } from './tools-pages';
export function HubPage({ section, pokemonId }: { section: string; pokemonId?: number }) {
  const { catalog } = useHub();
  if (!catalog.length)
    return (
      <EmptyState
        title="A base de dados ainda não está disponível"
        text="Configure DATABASE_URL, execute as migrations e importe os dados seguindo o README. Nenhum catálogo fictício será exibido."
      />
    );
  switch (section) {
    case 'dashboard':
      return <Dashboard />;
    case 'pokedex':
      return <Catalog />;
    case 'favoritos':
      return <Catalog favorites />;
    case 'pokemon':
      return <DetailPage key={pokemonId} id={pokemonId!} />;
    case 'analisador':
      return <Analyzer />;
    case 'builds':
      return <Analyzer builds />;
    case 'equipes':
      return <TeamBuilder />;
    case 'gerador':
      return <Generator />;
    case 'minhas-equipes':
      return <SavedTeams />;
    case 'comparador':
      return <Comparator />;
    case 'tiers':
      return <Tiers />;
    case 'assistente':
      return <Assistant />;
    case 'perfil':
      return <AccountPage />;
    case 'fontes':
      return <Sources />;
    default:
      return <Dashboard />;
  }
}
