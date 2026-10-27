# Fontes e licenças — consulta em 16/10/2026

## Importação em lote

- [PokéAPI](https://pokeapi.co/docs/v2/), [repositório](https://github.com/PokeAPI/pokeapi), commit `5ee47a9a9c1229632ec4b473a9c1c53026e005dd`. CSVs públicos; identificadores, espécies, formas com atributos próprios, tipos, atributos atuais/históricos, nomes em inglês, learnsets e catálogo global de itens. [Licença BSD-3-Clause](https://github.com/PokeAPI/pokeapi/blob/master/LICENSE.md), reproduzida em THIRD_PARTY_NOTICES.md. A licença do software/base não transfere direitos sobre marcas/artes Pokémon.
- Arquivos regionais: Galar 27, Isle of Armor28, Crown Tundra29, Hisui30, Lumiose34, Hyperspace35. Version groups20/21/22,24,30/31. O snapshot possui 44.204 registros de learnset20 e2.230 do24; zero nos30/31. A existência de identificador de versão não prova cobertura da API.
- [Sprites/arte](https://github.com/PokeAPI/sprites): URLs de arte e sprite específicas por pokemon_id. Direitos sobre personagens e arte pertencem aos titulares Nintendo/Creatures/GAME FREAK/The Pokémon Company. Uso de exibição em projeto de fãs; ausência de imagem tem fallback explícito. Não há modelo3D nem alegação de licença comercial da arte.

## Expansão de movimentos dos três jogos

- [Fortelle/pokemon-learnsets](https://github.com/Fortelle/pokemon-learnsets/tree/79351bcf414276f82efda89c474f9de6e837af06), revisão `79351bcf414276f82efda89c474f9de6e837af06`. Listas específicas de Arceus e Z-A 2.0.0/Mega Dimension, incluindo métodos e formas. São 242 e 364 espécies respectivamente. Sword já possui as 664 espécies compatíveis na importação PokéAPI. Repositório sem licença explícita; usamos referências factuais, sem textos editoriais. Cosméticos com a mesma identidade PokéAPI são deduplicados. Cinco linhas de chefes Nobres de Arceus sem identidade própria não são criadas como Pokémon capturáveis.
- Para Z-A, entradas `tm` sem referência `TMnnn` são flags de compatibilidade sem item disponível e são excluídas. A presença em arquivos nativos não basta para afirmar que existe uma TM. Arquivos da versão 1.0.0 identificam métodos do jogo base; o restante é marcado como Mega Dimension. Níveis não são convertidos em etapas da campanha.
- [Project Pokémon/za-textport](https://github.com/projectpokemon/za-textport/tree/0eb14d75de5282f33b783854e1a5aca8c168d83c), revisão `0eb14d75de5282f33b783854e1a5aca8c168d83c`, tabelas `personal_waza_param_array.json` e `waza_param_array.json`, atualizadas para Z-A 2.0.0. Apenas `ExtentionType=0` e IDs normais: 340 golpes, poder, tipo, categoria e cooldown base. Variantes plus/chefes são separadas e não entram nas builds. Não usamos PP como cooldown nem interpretamos `HitPer` como precisão tradicional. [Licença MIT](https://github.com/projectpokemon/za-textport/blob/0eb14d75de5282f33b783854e1a5aca8c168d83c/LICENSE), aviso em THIRD_PARTY_NOTICES.md.
- [Kaphotics — PLA Move Data](https://pastebin.com/YyGpUYLc), publicado em 27/01/2022: tabela factual TSV com 177 movimentos habilitados em Arceus. Usamos `CanUseMove=True`, `Index=MoveID`, `FPower/FAccuracy/FPP/FType/FCategory`. A coleta é fixada pelo SHA-256 `2c0dd91cc4a1289264c12b6fa2807964faf386310100c4cc02708eea23992eca`. Precisão sentinela 101 significa sem teste convencional; prioridade antiga não representa ordem de ações. Campos de estilos e ordem dinâmica não são simulados. Referência sem licença editorial explícita, sem reprodução de descrições.
- [PKHeX FormConverter](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/Util/Conversion/FormConverter.cs): conferência dos índices nativos de formas (incluindo Pumpkaboo e Zygarde). O importador relaciona o índice com `pokemon_forms.form_order - 1`, preservando cada identidade de atributos e deduplicando cosméticos.

`scripts/download-game-data.mjs` baixa somente estas fontes fixadas e registra hashes por arquivo. `scripts/import-game-data.ts` valida hashes/cobertura, substitui learnsets de Arceus e Z-A em transações por jogo e preserva dados pessoais. A importação principal também executa essa expansão depois dos dados-base. Os números atuais constam em COBERTURA_JOGOS.json e VALIDACAO_DADOS.json.

## Curadoria inicial preservada para referência

Sem scraping automatizado nem reprodução de textos editoriais. Os JSONs locais contêm apenas pequenos conjuntos de fatos com referência ao documento consultado; não constituem uma cópia do banco de terceiros. Confiança média, data de coleta explícita. Revisão de direitos de redistribuição continua necessária antes de disponibilização comercial.

- A curadoria inicial de seis Pokémon em `curated-za.json` permanece como referência histórica. A expansão substitui seus learnsets e parâmetros pelas fontes completas acima.
- Itens [Leftovers](https://www.serebii.net/itemdex/leftovers.shtml) e [Life Orb](https://www.serebii.net/itemdex/lifeorb.shtml): presença e métodos em Sword/Z-A. Etapas exatas desconhecidas; descrições locais em português são sínteses próprias.
- Encontros: [Route1 de Galar](https://www.serebii.net/pokearth/galar/route1.shtml), oito espécies, etapa inicial. Taxas e níveis de encontro não são reproduzidos.

## Mecânicas e referências oficiais

- [Z-A gameplay oficial](https://legends.pokemon.com/en-us/gameplay): tempo real e Mega Evolução.
- [Z-A Battle Club](https://legends.pokemon.com/en-us/news/z-a-battle-club-ranked-battles): existência de Ranked Battles. Nenhuma temporada específica é declarada ativa na aplicação.
- [Pokémon de Z-A](https://legends.pokemon.com/en-ca/story-world/pokemon): escolha de Chikorita, Tepig ou Totodile. As escolhas não provam posse dos três ao mesmo tempo.
- [Arceus gameplay oficial](https://legends.arceus.pokemon.com/en-gb/gameplay/): ordem de ações e Agile/Strong Style.
- [Arceus, produto oficial](https://www.pokemon.com/us/pokemon-video-games/pokemon-legends-arceus/): contexto e mecânicas próprias.
- [Type chart](https://www.serebii.net/games/typexy.shtml), [Arceus battles](https://www.serebii.net/legendsarceus/battles.shtml), [documentação comunitária de tipos](https://bulbapedia.bulbagarden.net/wiki/Type): referência de mecânicas especiais. A matriz importada cobre tipagem geral; o código mantém a exceção2,5/0,4 de Arceus.

## Ranking: referências, não evidências agregadas

- [Dexerto, Grass Z-A](https://www.dexerto.com/wikis/pokemon-legends-z-a/all-grass-type-pokemon-tier-list/): referência editorial indicada no pedido. Não copiada, não convertida em ranking completo.
- [Smogon SS](https://www.smogon.com/dex/ss/): referência de formatos comunitários. Não é equivalente a regulamento oficial da Nintendo. Sem importador de evidências nesta versão.
- Pokémon HOME: não foi identificada/implementada uma API pública autorizada de estatísticas para todos os recortes. Nenhum dado privado de HOME é consultado.

## Lacunas e política

NULL representa desconhecido. Não inferir disponibilidade de captura de um learnset; learnset confirma apenas compatibilidade no jogo e pode incluir troca/transferência. Não inferir obtenção de Mega Stone pela presença da espécie. Não extrapolar movimento antigo para jogo novo. Não misturar campeonato comunitário, campanha e temporada oficial. As datas de publicação que a fonte não forneceu ficam NULL.

## Documentação técnica consultada

[Next.js](https://nextjs.org/docs/app/getting-started/installation), documentação embutida em `node_modules/next/dist/docs`, [Auth.js Credentials](https://authjs.dev/getting-started/authentication/credentials), [Prisma PostgreSQL](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql). Versões instaladas são registradas no lockfile.
