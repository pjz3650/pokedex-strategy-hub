import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Esta rota ainda não foi descoberta.</h1>
      <p>Volte para a Pokédex e continue explorando.</p>
      <Link className="button button-primary" href="/pokedex">
        Abrir Pokédex
      </Link>
    </div>
  );
}
