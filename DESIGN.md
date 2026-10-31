# Pokétactics — Type Study

Sistema implementado em 29/10/2026. A fonte visual aprovada é [a composição do Charizard](docs/type-study/reference.png). Este documento descreve código em uso, não uma proposta. A matriz de rotas está em [COVERAGE.md](docs/type-study/COVERAGE.md); evidências e limites da revisão em [REVIEW.md](docs/type-study/REVIEW.md).

## Conceito e direção de arte

Editorial japonês contemporâneo: papel claro, texto quase preto, títulos fortes, informações compactas e Pokémon como protagonistas. Sidebar neutra, busca horizontal, seleção vermelha sólida, divisões finas, diagonal cromática e número nacional sobreposto constituem a assinatura. A assimetria fica concentrada em arte e identificação; tabelas e formulários mantêm leitura regular.

A imagem aprovada determina hierarquia e geometria. A arte em uso continua sendo a arte oficial já integrada via PokeAPI sprites; sua pose difere da ilustração do exemplo. Não foram inventados assets, descrições, licenças ou traduções. Não há textura, pergaminho, molduras antigas ou estética pixel art.

## Organização técnica

- `src/app/globals.css`: fundamentos, temas, estados e layouts. Reutiliza a estrutura operacional existente; declarações antigas sobrescritas foram consolidadas. Tokens estão no início do arquivo.
- `src/app/layout.tsx`: fontes locais com `next/font/local`, idioma e inicialização do tema antes da hidratação.
- `src/lib/pokemon-visual.ts`: paleta de tipos, cores corporais, composição e variáveis CSS determinísticas.
- `src/data/pokemon-visual-metadata.json`: projeção factual versionada de 1.025 espécies e 1.351 formas, gerada por `scripts/generate-visual-metadata.mjs`.
- `src/components/pokemon-hero.tsx`: composição expressiva reutilizável com ações recebidas por composição React.
- `src/components/pokemon-ui.tsx`: imagem/fallback, card, badge de tipo, barras, radar e estado vazio.
- `src/components/ui/button.tsx`: Button com Radix Slot e variantes CVA existentes.
- `shell.tsx`, `dashboard-catalog.tsx`, `pokemon-detail.tsx`, `team-pages.tsx`, `tools-pages.tsx`, `account-page.tsx`: navegação e telas.

Não houve alteração no schema, migrations, algoritmos, regras, autenticação, contratos estratégicos ou critérios de disponibilidade. O acréscimo de metadados é exclusivamente de apresentação.

## Paleta e tokens semânticos

| Papel                       | Token             | Claro     | Escuro    |
| --------------------------- | ----------------- | --------- | --------- |
| Fundo                       | `--bg`            | `#f6f4ef` | `#181a19` |
| Sidebar                     | `--sidebar`       | `#f1efea` | `#1d1f1d` |
| Superfície                  | `--surface`       | `#fcfbf8` | `#202320` |
| Superfície secundária       | `--surface-2`     | `#eeece6` | `#292d29` |
| Trilhas e divisões internas | `--surface-3`     | `#e1ded6` | `#363c35` |
| Texto                       | `--text`          | `#20211f` | `#f4f2eb` |
| Texto secundário            | `--muted`         | `#62635c` | `#b9bcb1` |
| Metadados                   | `--subtle`        | `#62645b` | `#a6aa9d` |
| Divisória                   | `--border`        | `#d8d5cd` | `#3b4038` |
| Ação e seleção              | `--accent`        | `#be3526` | `#ff927b` |
| Hover de ação               | `--accent-strong` | `#a92d21` | `#ffb4a4` |
| Texto sobre ação            | `--accent-ink`    | branco    | `#281711` |
| Erro                        | `--danger`        | `#b62e30` | `#ff9a96` |
| Sucesso                     | `--success`       | `#386544` | `#a4c9a9` |
| Atenção                     | `--warning`       | `#7c5a18` | `#e3c486` |
| Informação                  | `--info`          | `#326b86` | `#9cc5dc` |
| Segunda série do gráfico    | `--comparison`    | `#3a7092` | `#9cc5dc` |

`--graphic-red: #ef593e` é o fundo ilustrativo do destaque inicial. A cor de ação é mais escura para sustentar texto branco. As cores de composição não devem ser usadas como texto pequeno. `--focus-ring` é explícito por tema. `color-scheme` cobre controles nativos.

## Tipografia e japonês

Fontes abertas servidas pelo próprio aplicativo, em `public/fonts`, com os respectivos arquivos OFL. Sem chamada ao Google no navegador ou durante o build.

| Uso                                          | Família / variável                                | Pesos         |
| -------------------------------------------- | ------------------------------------------------- | ------------- |
| Interface, títulos internacionais e conteúdo | Barlow / `--font-ui`, consumida por `--font-sans` | 400, 600, 700 |
| Números editoriais, índices, métricas        | Barlow Condensed / `--font-display`               | 700           |
| Nomes japoneses e assinatura                 | Noto Sans JP / `--font-japanese`                  | 900           |

Noto foi reduzida aos caracteres dos nomes oficiais do snapshot e da assinatura. Regenerar o subconjunto ao ampliar o conteúdo japonês. O arquivo local tem cerca de 45 KB e não recebe preload global. Barlow e Barlow Condensed usam `next/font/local`, `display: swap` e fallback gerado pelo Next.

Corpo 15px/1,55; conteúdo explicativo 13–15px; controles móveis 16px quando herdados dos formulários; metadados 10–12px. H1 varia de 30 a 46px; nome japonês de 35 a 70px no desktop (76px acima de 1600px); nome internacional de 26 a 38px. O celular recebe nome japonês fluido de 36 a 62px e internacional de 30px. Números e tabelas usam algarismos tabulares. `dexNumber()` preenche até três dígitos, sem truncar as espécies de quatro dígitos.

Os nomes japoneses vêm de `pokemon_species_names.csv`, `local_language_id=11`, revisão `5ee47a9a9c1229632ec4b473a9c1c53026e005dd` do PokéAPI. São nomes da espécie, inclusive nas formas; o nome internacional distingue a forma. `lang="ja"` marca o conteúdo. Ausência de tradução usa somente o nome internacional; nunca caracteres aleatórios.

## Espaçamento, grids e superfícies

Escala de referência `--space-1..7`: 4, 8, 12, 16, 24, 32 e 48px. Grades operacionais preservam medidas específicas onde necessárias. Painéis: superfícies sólidas, divisória superior de 1px, sem sombra; cards e controles usam 3–4px de raio. Pills pertencem aos tipos. Modal/toast recebem raio curto; o toast tem sombra funcional discreta.

Sidebar de 204px, conteúdo de até 1580px, margem interna desktop de 40px, 28px abaixo de 1250px, 24px no tablet e 16px no celular. Cards do catálogo: quatro colunas em desktop, duas no celular; paginação existente de 36 itens. Destaques mantêm rolagem horizontal interna.

Breakpoints operacionais existentes: 1250, 1100, 960, 760, 480 e 380px. A composição Type Study refina principalmente 1250, 960, 760 e 380px e amplia a ficha acima de 1600px. Não usar os breakpoints como mera redução proporcional.

## Sistema visual contextual

`getPokemonVisual(pokemon)` recebe identidade de forma, espécie, tipos e nome. Retorna `japanese`, `composition` e `style: CSSProperties`. Não depende de estado aleatório, rede em tempo de renderização ou condições espalhadas por tela.

Metadados da espécie: nome japonês, classificação de silhueta e cor corporal da PokéAPI. Metadados da forma: altura e peso. Tipos vêm da própria forma consultada. O conjunto completo pode usar o sistema; há teste de integração em todas as 1.351 formas reais. Isso não equivale a inspeção visual individual de todas elas.

| Variável contextual  | Papel                                                         |
| -------------------- | ------------------------------------------------------------- |
| `--poke-color`       | Fundo primário da composição                                  |
| `--poke-secondary`   | Segundo tipo e faixa geométrica                               |
| `--poke-body`        | Cor corporal factual, aplicada à faixa secundária do card     |
| `--poke-ink`         | Cor acessível do tipo, usada em dados destacados              |
| `--art-scale`        | Escala do enquadramento                                       |
| `--art-x`, `--art-y` | Posicionamento da imagem                                      |
| `--art-cut`          | Inclinação da diagonal                                        |
| `--ground-strength`  | Intensidade do fundo dos cards, reforçada em espécies brancas |

Seis composições: `balanced`, `upright`, `wide`, `serpentine`, `cluster`, `winged`. A tabela central `SHAPES` usa IDs factuais de forma corporal. Charizard é classificado como vertical pela fonte; Butterfree representa a variante com asas. Giratina Altered e Origin têm ajustes centrais de composição; Zygarde Complete também. Wailord tem ajuste de escala por causa da margem interna da arte oficial. São exceções documentadas em `FORM_COMPOSITION` e `ART_SCALE`, sem condições nas telas. Espécies muito altas recebem contenção; todas as imagens conservam proporções.

O hero conserva identificação à esquerda e arte à direita no desktop/tablet; no celular, identificação e ações precedem uma área de arte de 310px. Variantes largas e em grupo ajustam altura e posição do número. Números são decorativos na arte (`aria-hidden`); a identificação textual está disponível separadamente.

## Prévia de Mega Evolução

A visão geral da ficha também preserva a prévia de Mega Evolução integrada da `main`: em Z-A, formas base compatíveis mostram as Megas da mesma espécie, marcadores de atributos comparados e mudanças defensivas expansíveis. O radar e a composição editorial permanecem disponíveis. Essa prévia usa os tokens de superfície, raio e espaçamento do Type Study e não configura nem libera transformações em batalha.

## Cores dos tipos

`TYPE_PALETTE` é a única tabela de cores dos 18 tipos. Cada entrada possui `color` para composição e `ink` para fundo do badge com texto branco. Há teste de contraste ≥4,5:1 para os 18 badges. Cor, ícone Lucide e nome em português comunicam o tipo juntos. Multiplicadores aparecem numericamente. Não deduzir vantagem apenas pela cor.

## Imagens e iconografia

Artes e sprites mantêm URLs do repositório PokeAPI sprites já usado pelo projeto. Não se atribui licença comercial às imagens Pokémon. Next Image mantém dimensões declaradas e `unoptimized`; arte principal usa `preload`, demais imagens usam carregamento normal/tardio. Se falhar, tenta o sprite próprio da forma, depois mostra indisponibilidade com nome acessível. Sprite de fallback no hero é limitado a 96px, para evitar ampliá-lo como arte grande.

`object-fit: contain` preserva proporção. Recortes do painel fazem parte da composição expressiva; nunca ocultar a identificação ou controles. Falhas de imagem não removem dados e ações. Ícones Lucide com traço consistente, normalmente 16–18px na navegação e 12px nos badges. Nenhum emoji substitui ícones.

## Componentes e contratos

- **Button**: variantes principal, secundária, ghost, destrutiva; tamanhos normal, pequeno, ícone; `asChild` preserva links. `disabled` e texto pendente continuam nativos.
- **PokemonHero**: recebe `Pokemon`, `genus` e `children`; ações e seleção de jogo continuam em DetailPage.
- **PokemonCard**: número, favorito independente, arte contextual, nome, tipos, forma e BST. Link aponta para a forma e jogo; botão de favorito preserva autenticação.
- **TypeBadge**: tipo e multiplicador opcional; ícone, texto e valor numérico.
- **StatBars**: atributos reais, escala fixa 255 e marcador da comparação quando fornecida. Na ficha, usa a cor contextual; nas ferramentas, a ação do tema.
- **StatsRadar**: duas séries existentes; domínio fixo 0–255, sem animação de entrada; barras e tabelas oferecem leitura textual dos valores.
- **PageHeading / SectionHeading**: títulos e textos reais, ação/link opcional; heading principal recebe divisor editorial.
- **PokemonPicker / MemberEditor / BuildWorkbench**: contratos funcionais preservados; formulários compactos e resultados separados visualmente.
- **Notice / EmptyState / toast**: informações parciais, ausência, erro e retorno da operação. Toast com `role=status` e botão de fechar.
- **Dialog**: busca global e importação usam `dialog` nativo, backdrop e fechamento acessível. Não foi adicionada biblioteca de dropdown, tooltip ou notificações.

## Layouts por área

- **Inicial**: título, hero do Charizard com diagonal e número, acesso ao gerador, seleção dos três jogos, totais reais, cards e equipes. A arte não substitui controles.
- **Pokédex/favoritos**: busca, filtros, ordenação, forma/jogo e resultados; os cards reaproveitam regras contextuais na densidade de catálogo.
- **Ficha**: hero, medidas/função, abas, atributos e quatro movimentos da recomendação equilibrada do motor existente. Radar, habilidades e defesas continuam na visão geral. Moves abre o learnset completo; builds abre a bancada; formas e obtenção conservam relações e fontes.
- **Equipes**: seis slots, campos de nome, rascunho, importação/exportação, editor e matriz de cobertura. Slots preenchidos usam cores da forma; seleção tem borda e marca inferior. Slots vazios levam ao seletor.
- **Gerador**: critérios e resultados com arte contextual; matrizes e avisos de progresso preservados.
- **Analisador/builds**: seletor contextual, edição de movimentos, alternativas e avaliação heurística. Sem apresentação de pôster na área de dados.
- **Comparador**: dois a quatro painéis contextuais, atributos, tabelas, radar dos dois primeiros. Nenhum vencedor universal é inventado.
- **Tiers**: faixas semânticas de S a F, mantendo cálculo, filtros e aviso de insuficiência das fontes comunitárias.
- **Assistente**: contexto, mensagens, formulário e histórico. Modo generativo continua desabilitado; relatório real por regras.
- **Perfil**: login, cadastro e recuperação no mesmo formulário; preferências e tema para usuários autenticados. A história visual lateral some em larguras menores.
- **Equipes salvas/fontes**: mesmo sistema de superfícies, títulos, tabelas, ações e ausência. Não existe rota separada de guias neste checkout.
- **Loading/error/not-found**: usam as mesmas fontes, superfícies, ações e estados globais.

## Navegação, temas e estados interativos

Sidebar fixa no desktop; abaixo de 960px vira menu modal com foco contido, Escape, bloqueio do scroll e retorno ao acionador. Detalhes de Pokémon mantêm Pokédex ativa. Fontes recebe acesso próprio. Pesquisa global mantém Ctrl/Cmd+K, input com rótulo e fechamento por Escape.

Tema claro é padrão. Tema escuro usa neutros esverdeados e coral claro, mantendo o fundo cromático da arte. A preferência `hub-theme` é lida antes da hidratação; a gravação no provider aguarda sua leitura para não sobrescrever a escolha durante a inicialização. Alternar tema preserva o contexto de jogo e rascunho.

Hover usa cor e borda; não desloca cards. Foco usa anel de 2px e offset de 3px. Desabilitado usa semântica nativa, cursor e opacidade. Erros usam `role=alert` onde já previsto; sucessos usam status. Textos reais explicam ausência e limitações.

## Responsividade e acessibilidade

WCAG 2.2 AA é a referência; não há declaração de certificação. O texto principal e os badges foram definidos para contraste; a revisão automatizada registra os valores e limites medidos. Nome e ícone acompanham cores de tipos; fraquezas têm multiplicadores, cobertura tem contagens/texto e índices têm ressalvas.

Abas da ficha usam roving tabindex, setas esquerda/direita, Home/End, `aria-selected`, `aria-controls` e identificação do painel. Controles principais usam 44px; ícones auxiliares 36–40px, superiores ao mínimo de 24px. Tabelas mantêm rolagem interna focável; documento não deve rolar horizontalmente. `scroll-padding-top` e `scroll-margin-block` protegem o foco contra o cabeçalho fixo. Skip link, idioma da página e títulos semânticos são preservados.

Movimento reduzido desativa transições e animações; radar é estático. Transições normais de cor, fundo e borda duram 150ms. Nenhuma animação em massa ou de entrada dos cards. Scrollbars, seleção, caret e controles nativos usam os tokens.

## Convenções de manutenção

1. Reutilizar os tokens antes de adicionar cores ou superfícies.
2. Componentes operacionais devem privilegiar leitura; a diagonal pertence a áreas de imagem.
3. Nunca inferir nome japonês, disponibilidade, estatísticas, descrição ou mecânica sem fonte.
4. Novas formas usam a configuração automática. Adicionar exceção somente no módulo visual, com justificativa e teste.
5. Ao atualizar o snapshot, executar `node scripts/generate-visual-metadata.mjs` e atualizar o subconjunto japonês se surgirem novos caracteres.
6. Testar contraste das novas paletas e enquadramento em desktop/mobile, nos dois temas.
7. Registrar novos componentes/rotas aqui e na matriz de cobertura. Não documentar abstrações inexistentes como implementadas.
8. Preservar os limites funcionais descritos em `docs/AUDITORIA.md` e `/fontes`.

## Verificação reproduzível

Com PostgreSQL e aplicação local em execução:

```powershell
.\pnpm.cmd run typecheck
.\pnpm.cmd run lint
.\pnpm.cmd run test
.\pnpm.cmd run build
.\pnpm.cmd run test:e2e
node scripts/verify-type-study.mjs
```

O build deve ocorrer com o servidor parado no Windows por causa da DLL do Prisma. A auditoria de navegador registra rotas/temas/tamanhos e 12 formas/espécies representativas; a validação automatizada de configuração usa as 1.351 formas do banco. Resultados efetivamente executados e pendências ficam em `docs/type-study/REVIEW.md`, não são presumidos pelos comandos acima.
