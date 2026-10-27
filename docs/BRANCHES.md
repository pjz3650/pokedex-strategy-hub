# Mapa de branches

A publicação inicial organiza o código existente em módulos. Cada branch tem seus commits e foi integrada à `main` com merge explícito. Os nomes não usam o prefixo `codex`.

A sequência acompanha as dependências entre módulos: dados → motor → API/contas → interface → ferramentas → design → testes → documentação. Os pontos intermediários preservam essa montagem; use `main` para executar o produto completo.

| Branch                      | Principais arquivos                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `feature/data-pipeline`     | `prisma/`, `data/`, download/importação, `db.ts`, parsers de learnsets e propriedades por jogo                  |
| `feature/strategy-engine`   | `engine.ts`, `repository.ts`, `team-service.ts`, `contracts.ts`, `validation.ts`, `games.ts`, `type-chart.json` |
| `feature/accounts-api`      | `auth.ts`, `security.ts`, `app/api/`, `account-page.tsx`                                                        |
| `feature/pokedex`           | `app/layout.tsx`, rotas, providers, shell, catálogo/dashboard e detalhe de Pokémon                              |
| `feature/team-builder`      | `team-pages.tsx`: montagem, geração, importação/exportação e equipes salvas                                     |
| `feature/analysis-tools`    | `tools-pages.tsx`: análise, builds, comparação, tiers, assistente e fontes                                      |
| `feature/modern-design`     | Tema, CSS responsivo, navegação acessível, sistema visual e capturas                                            |
| `test/quality-suite`        | `tests/`, configuração Vitest e Playwright                                                                      |
| `docs/project-presentation` | README, guia operacional, mapa de branches e documentação geral                                                 |

## Trabalhando a partir da versão integrada

```sh
git switch main
git pull --ff-only
git switch -c feature/minha-feature
```

As branches de publicação são marcos da organização inicial, não uma reconstrução datada de cada sessão de desenvolvimento. As diferenças de cada módulo podem ser consultadas pelos commits e pelos merges no histórico.
