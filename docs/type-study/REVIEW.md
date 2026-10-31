# Revisão Type Study — Pokétactics

29/10/2026 · branch `design/type-study-redesign` · execução local, sem publicação externa.

## Entrega

A identidade Type Study está aplicada às 14 áreas funcionais existentes e aos estados compartilhados. Sidebar, busca, botões, formulários, tabelas, abas, cards, modais, feedback e páginas de erro usam o novo sistema. A [matriz de cobertura](COVERAGE.md) relaciona as rotas aos módulos e comportamentos preservados.

A ficha segue a composição aprovada: número nacional, nome japonês dominante, nome internacional, badges, informação à esquerda e arte sobre diagonal cromática à direita, com número sobreposto. Abaixo, dados operacionais continuam completos por seções e abas. A [referência](reference.png), a [comparação lado a lado](reference-comparison.png) e as [capturas iniciais](before/) permitem comparar a substituição da identidade grafite/menta.

## O que foi construído

- Paleta clara em off-white/preto/vermelho e tema escuro em neutros esverdeados/coral; cores semânticas e contraste contextual.
- Barlow para interface, Barlow Condensed para números e Noto Sans JP para os nomes oficiais, com arquivos locais e licenças OFL. Nenhuma dependência adicionada.
- `PokemonHero`, cards contextuais, badges com ícone/nome, barras compactas, radar em domínio fixo 0–255, slots de equipe e painéis comparativos.
- Engine visual central em `src/lib/pokemon-visual.ts`, com seis variantes de silhueta, tipos próprios da forma, cores corporais, dimensões e exceções pontuais documentadas.
- Projeção factual versionada: 1.025 espécies e 1.351 formas. O teste de integração configura todas as 1.351 formas reais, sem precisar gerar imagens individuais.
- Tema persistente corrigido na inicialização, favorito pendente enquanto a sessão é consultada, navegação de abas por teclado e proteção do foco contra o cabeçalho fixo.
- Grid e modal móveis corrigidos após testar a importação de seis integrantes; tabelas conservam rolagem dentro da região de dados.

O motor, algoritmos, contratos estratégicos, schema, autenticação e regras de disponibilidade permanecem preservados. Ajustes de interface não criam previsões de vitória ou resultados estratégicos novos.

## Validação técnica

| Verificação                          | Resultado final                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `pnpm run typecheck`                 | Aprovado                                                                            |
| `pnpm run lint`                      | Aprovado                                                                            |
| `pnpm run test`                      | 96 testes aprovados em 6 arquivos                                                   |
| `pnpm run build`                     | Build de produção aprovado, incluindo TypeScript                                    |
| `pnpm run test:e2e`                  | 18 testes aprovados, desktop e mobile                                               |
| `node scripts/verify-type-study.mjs` | 90 vistas de rota + 48 de espécies; zero falhas registradas em `browser-audit.json` |
| `git diff --check`                   | Aprovado                                                                            |

Os testes E2E usam PostgreSQL real e contas sintéticas de desenvolvimento. Exercitam login/cadastro/logout, isolamento entre contas, favoritos, equipes/builds, geração real, disponibilidade, formas, comparação, tema, menu móvel e estados de indisponibilidade. Os novos cenários verificam persistência do tema após recarregar, nome japonês, setas/Home/End nas abas, busca modal e exportação/importação real de seis integrantes.

A suíte Vitest inclui o motor e a cobertura completa de builds por jogo já existente. Os testes visuais acrescentam contraste dos 18 badges, nomes japoneses, variantes, fallback e a configuração de toda a base de formas.

## Capturas e responsividade

A matriz de navegador percorre 15 destinos (14 áreas e rota inválida), em 1440×1000, 768×1024 e 390×844, nos dois temas: 90 vistas de rota. A amostra adicional contém 12 espécies/formas em desktop/mobile e nos dois temas: 48 vistas. Capturas com mesmo nome da ficha podem ser compartilhadas entre a matriz de rotas e a amostra; 138 verificações não significam 138 arquivos distintos.

Amostra: Bulbasaur, Charizard, Pikachu, Gengar, Giratina Altered, Rayquaza, Wailord, Exeggcute, Unown, Giratina Origin, Mega Charizard X e Ninetales Alola. A configuração de todas as 1.351 formas é validada por código; a inspeção visual detalhada limita-se a esta amostra e às telas de ferramentas.

Evidências principais:

- [Charizard claro](after/desktop-light-charizard.png), [escuro](after/desktop-dark-charizard.png), [tablet](after/tablet-light-charizard.png), [celular](after/mobile-light-charizard.png).
- [Catálogo](after/desktop-light-pokedex.png), [inicial](after/desktop-light-dashboard.png), [inicial móvel](after/mobile-light-dashboard.png).
- [Equipe com seis integrantes](after/desktop-six-member-team.png), [equipe móvel](after/mobile-six-member-team.png), [importação móvel](after/mobile-import-dialog.png).
- [Builds](after/desktop-light-builds.png), [comparação](after/desktop-light-comparador.png), [perfil](after/desktop-light-perfil.png), [fontes](after/desktop-light-fontes.png).
- [Prancha de espécies desktop](desktop-species-contact.png), [prancha móvel](mobile-species-contact.png).

## Acessibilidade

Texto e ícones acompanham cor; tipos e multiplicadores permanecem explícitos. O foco é visível, há skip link e diálogos nativos. O menu móvel contém o foco, fecha com Escape e retorna ao acionador. Abas da ficha têm seleção e painel identificados, roving tabindex, setas e Home/End. Controles principais têm 44px; ícones auxiliares, 36–40px. Movimento reduzido é respeitado e o radar não anima.

A auditoria de contraste calcula cor de texto contra superfícies sólidas e considera a opacidade, excluindo conteúdo oculto/decorativo e controles desabilitados. Não substitui uma avaliação completa com leitores de tela ou uma certificação WCAG. Os 18 badges têm também teste unitário de contraste ≥4,5:1. O registro final distingue medidas de documento, imagens visíveis, nomes de botões, erros de execução e contraste.

O detector do Impeccable registra um aviso heurístico na borda superior do perfil. A superfície efetiva tem raio zero, explicitado no CSS; não é uma borda grossa sobre card arredondado. O resultado bruto está em `detector.json`, sem ocultar o aviso.

## Problemas encontrados e correções

1. A preferência de tema podia ser sobrescrita pelo estado inicial. A persistência agora aguarda a leitura e o tema é aplicado antes da hidratação.
2. A identificação da sessão podia terminar depois do clique em favorito. O botão aguarda a consulta, conservando o fluxo de login existente.
3. Estilos antigos faziam a arte cobrir o texto da inicial móvel. A composição móvel agora empilha leitura/ações e arte em regiões próprias.
4. A coluna de análise crescia pela largura mínima da tabela após importar uma equipe. Colunas usam `minmax(0, 1fr)` e os painéis mantêm largura contida.
5. O modal de importação precisava de limites de altura, centralização e tamanho móvel do texto. Foram acrescentados sem mudar a validação/importação.
6. O cabeçalho podia cobrir controles após rolagem. Foram definidos `scroll-padding-top` e margens de rolagem.
7. A auditoria encontrou textos com contraste de aproximadamente 4,17–4,37:1 em fundos secundários. Os tokens de destaque e metadados foram escurecidos.
8. Um teste selecionava também controles de uma página inativa durante navegação. O seletor passou a usar o papel acessível de combobox visível, conforme o comportamento observado e a documentação local do Next.
9. Capturas iniciais de equipe e Fontes registravam carregamento. As capturas finais aguardam imagens, análise e consulta de fontes.

Houve rodadas intermediárias com falhas; os números apresentados na tabela são da rodada final, não uma soma de execuções parciais.

## Revisão independente

Parecer final: `ship`. A revisão sem histórico da implementação conferiu as capturas estáveis e não encontrou correções materiais pendentes no escopo. A matriz de fidelidade e os limites estão em [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md).

## Documentação e manutenção

`DESIGN.md` substitui a direção antiga e descreve os tokens e componentes em uso, fontes/japonês, imagens, composição contextual, layouts, breakpoints, temas, interações, acessibilidade e regras para evolução. `PRODUCT.md` registra restrições do produto. README aponta para as novas evidências; a revisão de 17/10 em `docs/DESIGN_REVIEW.md` foi marcada como histórica. Licenças e procedência das fontes foram acrescentadas a `THIRD_PARTY_NOTICES.md`.

Os scripts de metadados e auditoria são reproduzíveis. A configuração visual e o motor permanecem independentes. Novas exceções de enquadramento pertencem ao módulo visual central, com justificativa e teste.

## Limites

- A pose da arte oficial já integrada difere da imagem aprovada. O resultado reproduz a linguagem editorial, hierarquia e composição, sem alegar cópia pixel a pixel da ilustração.
- Imagens Pokémon continuam dependendo da rede. Há fallback de arte para sprite e ausência explícita; não houve criação de um novo acervo/licenciamento de arte.
- Não houve inspeção visual individual de 1.351 formas, simulação de batalha nova ou ampliação das lacunas de dados/mecânicas descritas em `/fontes` e `docs/AUDITORIA.md`.
- A revisão de acessibilidade cobre semântica, foco, teclado, contraste e responsividade nos cenários registrados; não inclui validação externa ou leitores de tela em todas as plataformas.
- Alterações e commits são locais. Nenhum push ou deploy foi executado.
