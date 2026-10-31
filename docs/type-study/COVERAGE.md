# Cobertura Type Study

Diagnóstico de 29/10/2026, antes da implementação. Rotas resolvidas por `src/app/[[...route]]/page.tsx`; conteúdo em `HubPage`. Não existem rotas independentes de login, cadastro ou guias: autenticação/configurações pertencem a `/perfil`, documentação de fontes a `/fontes`.

| Rota                           | Módulo                    | Intervenção visual                                           | Comportamento preservado                                      |
| ------------------------------ | ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `/`                            | Dashboard                 | Hero editorial, arte diagonal, métricas e destaques          | Jogos, totais reais, resumo de equipe                         |
| `/pokedex`                     | Catalog / PokemonCard     | Cards contextuais, títulos, filtros compactos                | Pesquisa, filtros, ordenação, 36 por página                   |
| `/pokemon/:id`                 | DetailPage                | Nome japonês, hero assimétrico, atributos e movimentos, abas | Formas, evolução, learnsets, builds, defesas, disponibilidade |
| `/equipes`                     | TeamBuilder               | Seis slots editoriais, bancada e matriz                      | Edição, salvamento, importação/exportação, cálculo            |
| `/gerador`                     | Generator                 | Formulário e resultados editoriais                           | Restrições, progresso, obrigatórios/proibidos, geração        |
| `/analisador`                  | Analyzer                  | Seleção contextual, bancada e leitura de índices             | Sugestão, edição e recálculo                                  |
| `/builds`                      | Analyzer / BuildWorkbench | Mesma bancada, componentes e alternativas                    | Builds salvas e estilos                                       |
| `/comparador`                  | Comparator                | Painéis contextuais e tabelas                                | Dois a quatro Pokémon, radar dos dois primeiros               |
| `/tiers`                       | Tiers                     | Quadro e filtros no novo sistema                             | Heurística e insuficiência de evidências                      |
| `/assistente`                  | Assistant                 | Contexto, chat e estados                                     | Relatório determinístico, histórico opt-in                    |
| `/minhas-equipes`              | SavedTeams                | Coleção e estados vazios                                     | Abrir/editar/excluir                                          |
| `/favoritos`                   | Catalog                   | Mesmo catálogo editorial                                     | Favoritos vinculados à conta                                  |
| `/perfil`                      | AccountPage               | História editorial e formulário compacto                     | Login/cadastro/recuperação, preferências                      |
| `/fontes`                      | Sources                   | Hierarquia de leitura, tabelas e procedência                 | Cobertura real e limites                                      |
| Inválida / erro / carregamento | app boundaries            | Estados com tokens compartilhados                            | Recuperação, navegação, status                                |

## Arquitetura auditada

- CSS global compartilhado, sem biblioteca de componentes externa além de Button (Radix Slot/CVA). Recharts para radar; Lucide para ícones. Tailwind 4 está instalado; a interface usa classes CSS nomeadas.
- Shell fornece sidebar, cabeçalho, pesquisa modal, seleção de jogo e tema em todas as rotas. Menu móvel com Escape, foco contido e retorno ao acionador.
- Dados reais via repositório Prisma e API `/api/hub`; catálogo no provider, learnsets por jogo em consultas independentes. Arte oficial via PokeAPI sprites com fallback para sprite e ausência explícita.
- Antigo sistema: grafite/menta, Segoe UI, painéis arredondados e títulos de peso médio. Substituir tokens e tratamentos, preservando os grids operacionais e a lógica.
- Capturas novas do estado inicial em `before/`: dashboard, catálogo, Charizard, equipes e builds, desktop 1440×1000. Capturas antigas de outubro em `docs/design-review` são históricas.

## Estados compartilhados

| Estado                | Resposta                                     | Recuperação                                |
| --------------------- | -------------------------------------------- | ------------------------------------------ |
| Carregando            | Skeleton com área reservada e status textual | Conclusão da consulta                      |
| Vazio                 | EmptyState com ação contextual               | Limpar filtros, escolher Pokémon ou entrar |
| Erro recuperável      | Notice / alert com mensagem real             | Repetir ação ou alterar seleção            |
| Erro de página        | Boundary com botão de tentar novamente       | Reset do boundary                          |
| Sucesso               | Conteúdo atualizado e toast role=status      | Continuar edição                           |
| Pendente/desabilitado | Texto de ação e disabled nativo              | Aguardar ou satisfazer restrição           |
| Dados parciais        | Desconhecido explícito e referência da fonte | Selecionar outro jogo / consultar Fontes   |
