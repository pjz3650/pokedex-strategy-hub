'use client';
import { canUse, TYPE_LABELS } from '@/lib/engine';
import { isPermanent, matchesPokemon } from '@/lib/ux-state';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useHub } from './providers';
export function PokemonPicker({
  value,
  onChange,
  label = 'Pokémon',
  exclude = [],
  intent = 'inspect',
}: {
  value: number | undefined;
  onChange: (id: number) => void;
  label?: string;
  exclude?: number[];
  intent?: 'inspect' | 'team' | 'banned';
}) {
  const { catalog, game } = useHub();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = catalog.find((p) => p.id === value);
  useEffect(() => {
    setQ('');
    setOpen(false);
    setActive(null);
  }, [game]);
  const available = catalog.filter(
    (p) =>
      canUse(p, game) &&
      !exclude.includes(p.id) &&
      (intent !== 'banned' || isPermanent(p)) &&
      matchesPokemon(p, q),
  );
  const visible = available.slice(0, 50);
  if (
    !q &&
    selected &&
    available.some((p) => p.id === selected.id) &&
    !visible.some((p) => p.id === selected.id)
  )
    visible.unshift(selected);
  const enabled = visible.filter((p) => intent === 'inspect' || isPermanent(p));
  const activeId = open && enabled.some((p) => p.id === active) ? active : null;
  useEffect(() => {
    if (activeId)
      document.getElementById(uid + '-' + activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId, uid]);
  function choose(id: number) {
    const p = visible.find((p) => p.id === id);
    if (!p || (intent !== 'inspect' && !isPermanent(p))) return;
    onChange(id);
    setQ('');
    setOpen(false);
    setActive(null);
    input.current?.focus();
  }
  return (
    <div className="pokemon-picker">
      <label className="picker-label" htmlFor={uid}>
        {label}
      </label>
      <div className="search-field">
        <Search size={15} />
        <input
          ref={input}
          id={uid}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={uid + '-list'}
          aria-activedescendant={activeId ? uid + '-' + activeId : undefined}
          aria-describedby={uid + '-hint'}
          value={open ? q : (selected?.name ?? q)}
          placeholder="Buscar por nome ou número..."
          onFocus={() => {
            setOpen(true);
            setActive(null);
          }}
          onBlur={() => {
            setOpen(false);
            setActive(null);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(null);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
              setQ('');
              setActive(null);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              const index = enabled.findIndex((p) => p.id === activeId);
              setActive(
                enabled[
                  (index + (e.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
                ]?.id ?? null,
              );
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              if (activeId !== null) choose(activeId);
            }
          }}
        />
      </div>
      <small id={uid + '-hint'}>
        {intent === 'banned'
          ? 'Transformações já ficam fora do pool do gerador.'
          : intent === 'team'
            ? 'Formas temporárias podem ser consultadas, mas não compõem a equipe permanente.'
            : selected
              ? 'Selecionado: ' + selected.name
              : 'Digite e selecione uma sugestão.'}
      </small>
      {intent === 'team' && (
        <small>
          <Link href={'/pokedex?game=' + game}>
            Consultar formas e escolher uma forma permanente
          </Link>
        </small>
      )}
      <div className="picker-popup" hidden={!open} onPointerDown={(e) => e.preventDefault()}>
        <ul ref={list} id={uid + '-list'} role="listbox" aria-label={label}>
          {visible.map((p) => {
            const disabled = intent !== 'inspect' && !isPermanent(p);
            return (
              <li
                key={p.id}
                id={uid + '-' + p.id}
                role="option"
                aria-selected={value === p.id}
                aria-disabled={disabled}
                className={activeId === p.id ? 'active' : ''}
                onPointerMove={() => {
                  if (!disabled) setActive(p.id);
                }}
                onClick={() => choose(p.id)}
              >
                <span>
                  {p.name} · #{String(p.speciesId).padStart(3, '0')}
                </span>
                <small>{p.types.map((t) => TYPE_LABELS[t]).join(' / ')}</small>
                {disabled && (
                  <small>
                    Transformação temporária: escolha uma forma permanente para a equipe.
                  </small>
                )}
              </li>
            );
          })}
        </ul>
        {intent === 'team' && visible.some((p) => !isPermanent(p)) && (
          <p>
            Consulte as{' '}
            <Link href={'/pokedex?game=' + game + '&kind=mega'}>formas temporárias na Pokédex</Link>{' '}
            e escolha uma forma permanente para o time.
          </p>
        )}
        {!visible.length && (
          <p>
            Nenhum Pokémon corresponde à busca.{' '}
            <button
              type="button"
              onClick={() => {
                setQ('');
                input.current?.focus();
              }}
            >
              Limpar busca
            </button>
          </p>
        )}
        <small>
          {available.length} resultados
          {available.length > 50 ? ' · mostrando 50; refine a busca para ver os demais.' : ''}
        </small>
      </div>
    </div>
  );
}
