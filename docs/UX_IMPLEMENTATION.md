# Implementação de continuidade e recuperação de UX

Plano de `docs/ux-audit/UX_IMPLEMENTATION_PROMPT.md`, aprovado explicitamente pelo usuário em 30/10/2026. Base: `e62ce15`. Este relatório descreve esta implementação; os relatórios históricos da auditoria não foram reescritos.

## UX Brief

Atender quem consulta candidatos, experimenta builds e monta equipes de campanha em português. O objetivo é conservar configuração e intenção entre ferramentas, explicar restrições antes da ação e recuperar erros. A identidade Type Study, dados e regras por jogo permanecem como estavam. Nenhuma integração de IA, migration ou publicação foi adicionada.

## UX States Matrix

| Estado           | Gatilho                                                     | Resposta da interface                                             | Recuperação                                                           |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Carregando       | Primeira consulta de sessão, detalhe, análise ou recurso    | Estado explícito; conta privada aguarda validação                 | Aguardar ou cancelar processamento no gerador                         |
| Vazio            | Coleção realmente vazia ou filtro sem correspondência       | Mensagens distintas para ausência de dados e filtro vazio         | Criar, refinar ou limpar filtros                                      |
| Erro recuperável | Rede, JSON inválido, 403, 429, 5xx                          | Erro HTTP tipado; conteúdo anterior identificado quando aplicável | Repetir o recurso ou a submissão com o snapshot original              |
| Sessão encerrada | 401 confirmado ou logout                                    | Coleção, IDs e rascunhos privados removidos                       | Login; dados persistidos continuam sujeitos à autorização do servidor |
| Sucesso          | Mutação confirmada                                          | ID preservado mesmo se o refresh falhar                           | Continuar editando; nova gravação usa PATCH                           |
| Pendente         | Salvar, importar, excluir ou calcular                       | Botões impedem dupla submissão; erros permanecem no contexto      | Aguardar; cancelar quando a operação admite cancelamento local        |
| Desatualizado    | Critérios mudaram, análise pendente ou sincronização falhou | Resultado anterior identificado                                   | Recalcular, gerar novamente ou repetir sincronização                  |

## Visual Direction

Reutilizados Button, Notice, EmptyState, diálogos nativos, superfícies e tokens de `globals.css`. O único CSS novo atende a lista limitada do combobox; não altera paleta, fontes, hero, cards ou gráficos. `DESIGN.md` permanece intacto.

## Component Contracts

- `ApiError` mantém status, código e diagnóstico opcional; apenas 401 confirma visitante. Respostas antigas são invalidadas por revisão.
- `TeamDraft` v2 contém jogo, nome, membros, ID opcional de edição, baseline e dirty calculado. A exportação continua v1, com o contrato compacto de `Member`.
- O armazenamento de sessão tem proprietário e rascunhos separados por jogo. Conteúdo privado fica em quarentena até validar a conta. Logout/401 descarta o conteúdo privado. Rascunho anônimo pode acompanhar login explícito; outra conta nunca recebe rascunho privado anterior.
- `PokemonPicker` recebe intenção de consulta, composição ou proibição. Digitação não muda a escolha confirmada; Enter exige opção ativa; Escape cancela; Tab sai. Transformações permanecem consultáveis.
- `MemberEditor` mantém quatro slots locais; somente a serialização remove lacunas. Ao reabrir, os movimentos compactos podem ocupar os primeiros campos, conservando a ordem relativa.
- Geração associa resultado a assinatura/revisão dos critérios. Diagnóstico deriva do pool real; não altera os pesos nem a busca do motor. Ignorar progresso continua exigindo ação explícita.
- Relatórios do assistente guardam o contexto de cada submissão. Histórico legado sem metadados informa origem não registrada.

## File Plan

Novos helpers puros em `src/lib/ux-state.ts`, `client-api.ts`, `catalog-url.ts` e `generation-ux.ts`; combobox, confirmação de exclusão e hook de recurso independente em componentes próprios. Fluxos conectados nos componentes existentes. A API de geração recebeu diagnóstico opcional compatível. Configuração permite build/servidor de teste isolados. Schema, migrations, fonte factual e `engine.ts` não foram alterados.

## Implementation

| ID    | Alteração                                                                                          | Evidência de teste                                                          | Resultado / pendência                                                    |
| ----- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| UX-01 | Rascunho por jogo, transição centralizada e aviso de preservação                                   | `ux.spec`: Sword → Arceus → Z-A → Sword; reload                             | Implementado; revalidação final registrada abaixo                        |
| UX-02 | Envelope v2, migração legada, baseline, nome e conferência do proprietário/ID                      | `ux-state.test`; E2E reload, POST/PATCH, storage e duas contas              | Implementado                                                             |
| UX-03 | Nova equipe sem ID anterior; decisão sobre alterações pendentes e exportação                       | E2E cancelamento, nova equipe e dois IDs reais no banco                     | Implementado                                                             |
| UX-04 | Transferência do Member completo, validação no servidor e escolha de slot no time cheio            | E2E compara payload/ordem e cancela/confirma time cheio                     | Implementado                                                             |
| UX-05 | Rascunho de build por jogo/forma/origem; estilo conserva edição; sugestão explícita com comparação | E2E estilo, cancelar sugestão, alternar abas e reload                       | Implementado                                                             |
| UX-06 | Combobox direto, busca normalizada por nome/número, teclado e seleção preservada                   | Unitário; E2E teclado, consumidores e toque emulado                         | Implementado; leitor de tela físico não verificado                       |
| UX-07 | Política por intenção; temporárias desabilitadas na composição e explicadas antes de escolher      | E2E Mega em Z-A, forma regional e duplicação manual permitida               | Implementado                                                             |
| UX-08 | Slots estáveis com adaptador compacto e bloqueio de duplicatas                                     | Unitário e E2E escolher slot 4, limpar slot 2 e exportar                    | Implementado; lacunas não fazem parte do contrato persistido             |
| UX-09 | Substituição no mesmo índice; cancelamento; desfazer última remoção enquanto aplicável             | E2E time de seis, cancelamento e restauração; latência na análise           | Implementado                                                             |
| UX-10 | Parser v1 com tamanho/nome/jogo/membros; erro dentro do modal; confirmação de destino/substituição | Unitários e E2E JSON inválido, troca de jogo, importação/exportação de seis | Implementado                                                             |
| UX-11 | Confirmação nomeada, foco seguro, um DELETE e erro local; conteúdo aberto vira cópia               | E2E Escape/foco, falha 503, retry e desvinculação                           | Implementado; sem promessa de lixeira/desfazer                           |
| UX-12 | Snapshot/revisão, resultado anterior bloqueado e cancelamento de processamento local               | E2E mudança de critérios, respostas fora de ordem e cancelamento            | Implementado; cancelar não desfaz uma operação já processada no servidor |
| UX-13 | Conflitos locais nomeados e correção de quantidade sem apagar chips                                | Unitário e E2E dois obrigatórios/uma vaga; servidor preservado              | Implementado                                                             |
| UX-14 | Código e contagens derivados do pool; opt-in explícito permite nova geração                        | Unitários incluindo dados futuros/banimentos; E2E estrito → opt-in          | Implementado; não há garantia de solução ou obtenção                     |
| UX-15 | Etapa por jogo, política legada explícita e prioridade à edição local                              | Unitários; E2E `/me` atrasado, etapas distintas e reload                    | Implementado                                                             |
| UX-16 | URL validada para busca, filtros, ordem, página e jogo; retorno local com foco                     | Unitários anti-returnTo externo; E2E página 2, retorno e Back               | Implementado                                                             |
| UX-17 | Vazio factual separado de vazio filtrado, contagem e limpar filtros                                | E2E learnset real filtrado até zero e recuperação                           | Implementado                                                             |
| UX-18 | Sessão explícita, erro tipado, retry, proteção contra respostas antigas e save/refresh separados   | Unitários HTTP; E2E 401/503, refresh após POST, PATCH e duas contas reais   | Implementado                                                             |
| UX-19 | Saúde/fontes com loading/error/data independentes e retry localizado                               | E2E quatro combinações de falha/sucesso e recuperação                       | Implementado                                                             |
| UX-20 | Cabeçalho por relatório, anotação preservada, retry do snapshot e histórico opt-in atualizado      | E2E Lucario → Pikachu; histórico real entre jogos                           | Implementado; modo permanece determinístico                              |

## Verification

Simulações HTTP exercitam falhas determinísticas; salvamento, autorização e histórico também são verificados contra PostgreSQL real com contas sintéticas removidas após cada teste. As fixtures novas de UX são preparadas diretamente no banco, com hash de senha, e passam pelo login Credentials e endpoints reais; os testes existentes continuam cobrindo cadastro pela interface e API. Nenhum rate limit foi desabilitado, limpo ou alterado. Não foram usadas credenciais do usuário.

Ambiente: Windows, Node 24, Next 16.4.2, PostgreSQL local do projeto em 54329 e Chrome/Chromium. O servidor preexistente na porta 3000 foi preservado. O script `build` encontra a DLL do Prisma bloqueada por essa instância; a compilação Next usa o cliente já gerado, sem alterações de schema, em `.local/next-ux`, servida na porta 3001 com AUTH_URL correspondente. Capturas e traces novos ficam em `.local/ux-evidence`, sem sobrescrever as evidências históricas.

```powershell
.\pnpm.cmd run typecheck
.\pnpm.cmd run lint
.\pnpm.cmd run test
$env:POKETACTICS_DIST_DIR='.local/next-ux'
$env:AUTH_URL='http://127.0.0.1:3001'
.\pnpm.cmd exec next build
.\pnpm.cmd exec next start --hostname 127.0.0.1 --port 3001
```

Em outro terminal:

```powershell
$env:POKETACTICS_TEST_URL='http://127.0.0.1:3001'
.\pnpm.cmd run test:e2e --output=.local/ux-evidence/final-run
git diff --check
```

As dimensões cobertas são 1440×1000, 768×1024, 390×844 e 320×844, nos dois temas e com redução de movimento. Emulação móvel Chromium não prova Safari/iOS físico nem comportamento de teclado virtual real. Não houve teste com usuário ou leitor de tela real; não é declaração de conformidade WCAG.

### Jornadas finais

| Jornada da especificação                                                                  | Reprodução e evidência                                                                                                           |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| a — catálogo → ficha → build → equipe → salvar                                            | `ux.spec`: jornada integrada com filtro por tipo e nome normalizado, Nature manual, transferência e verificação do registro real |
| b — Sword → outro jogo → retomar                                                          | Jornada integrada e teste de rascunhos: membros, movimentos, nome e identidade preservados nos três jogos                        |
| c — estrito → diagnóstico → opt-in → mudar critérios → nova geração → substituir → salvar | Jornada integrada gera novamente após invalidar os critérios; cria seis integrantes, substitui e grava novo ID real              |
| d — editar registro → reload → PATCH → Nova equipe → POST                                 | `ux.spec`: captura método e ID, preserva nome não salvo, cancela Nova equipe e cria outro registro                               |
| e — consultar/analisar → comparar → retornar ao slot → cancelar/confirmar                 | Jornada integrada conserva o time ao cancelar e troca somente o primeiro slot ao confirmar                                       |
| f — catálogo/favoritos página 2 → ficha → retorno                                         | Catálogo em `ux.spec`; favoritos reais de conta sintética em `ux-recovery.spec`, com foco no card                                |
| g — JSON inválido → corrigir → validar → importar/exportar                                | Testes de upload maior que 64 KB, parse, falha 503, destino em outro jogo e round-trip de seis integrantes                       |
| h — /me503 → retry; /me401 → visitante                                                    | Erros simulados, gravação real com refresh falho, duas contas reais e resposta antiga depois de logout                           |
| i — Lucario → Pikachu, retry e troca de jogo                                              | Snapshot original no retry e histórico opt-in persistido com metadados do relatório                                              |
| j — fontes/saúde independentes                                                            | Quatro combinações de sucesso/falha e retry localizado                                                                           |

### Resultados executados

- Vitest: **121/121**, em 9 arquivos, incluindo 21 testes com PostgreSQL e geração de builds para todas as 1.522 disponibilidades do snapshot. Rodada final: 29,73 s.
- Playwright, rodada principal atual: **65 aprovados, 1 ignorado, 0 falhas**, em 66 casos, 4,6 min. O caso ignorado é exclusivamente o teste de toque no perfil desktop; ele passou no perfil móvel. Evidências em `.local/ux-evidence/final-run`.
- Verificação complementar, no mesmo build: **2/2 aprovados** em 14,8 s, com transferência de três movimentos, Nature, item/habilidade aplicáveis e ordem em Sword, Arceus e Z-A. Evidências em `.local/ux-evidence/three-games`. O inventário atual contém 68 casos; estes dois não foram somados a rodadas históricas.
- TypeScript: aprovado com os arquivos de configuração normais restaurados após a compilação isolada.
- ESLint: aprovado, sem avisos.
- Build Next de produção: aprovado em `.local/next-ux`, com o Prisma Client existente. O comando padrão `run build` foi tentado e interrompido por `EPERM` na DLL utilizada pela instância preexistente; ela não foi encerrada nem o cliente substituído à força.
- `git diff --check`: aprovado. `DESIGN.md`, motor, schema/migrations, validação e controles de segurança sem diff. Os dois arquivos gerados automaticamente pelo Next foram restaurados, sem ajustes de configuração oportunistas.
- Limpeza: consulta somente de contagem no banco local confirmou **0 contas sintéticas restantes desta execução**. Nenhum registro pessoal preexistente foi removido.
- As rodadas intermediárias localizaram uma falha real de retorno de foco no diálogo e casos de retomada/401, corrigidos antes do fechamento. Também houve correções de fixtures de preferências e seletores de testes, incluindo a distinção entre forma escolhida e outras formas da mesma espécie. A contagem final não soma resultados intermediários.

As evidências novas ficam em `.local/ux-evidence/final-run`, e o relatório HTML padrão em `playwright-report/`. Capturas históricas em `docs/screenshots`, `docs/type-study` e `docs/ux-audit/evidence` foram preservadas.

Os vinte IDs da matriz estão implementados, com os testes indicados aprovados. Isso não substitui as verificações assistivas e físicas listadas nas pendências. A transferência nos três jogos tem teste próprio em `tests/e2e/ux-transfer-games.spec.ts`; os cenários completos e de recuperação ficam em `ux.spec.ts` e `ux-recovery.spec.ts`.

## PR Summary

Continuidade de equipes/builds e identidade de edição deixam de depender de componentes efêmeros. Falhas de rede não se passam por logout ou ausência factual; ações destrutivas e substituição de trabalho têm decisões recuperáveis. Regras, disponibilidade, servidor como autoridade e design existente foram preservados.

Na revisão como iniciante, foram conferidos os motivos de restrição, a diferença entre dados desconhecidos e filtros sem resultado e a próxima ação possível. Na revisão como usuário avançado, foram conferidos teclado, ordem dos movimentos, configuração completa, liberdade de repetição manual, retorno da ficha e ausência de relaxamento automático dos critérios. Trata-se de revisão técnica e heurística, sem participação de usuários reais.

### Hipóteses e limites de escopo

- HYP-01: a remoção do último integrante durante análise foi incluída no teste de latência por fazer parte da exigência assíncrona e de UX-09. O indicador deve terminar e a análise vazia prevalecer.
- HYP-03: atualização de histórico opt-in e metadados pertence explicitamente a UX-20 e tem teste com persistência real.
- HYP-02 e HYP-04: não foi adicionada persistência de comparações nem paginação de coleções; falta evidência de jornada/volume para ampliar o escopo.
- HYP-05: mensagens gerais de validação autenticada continuam fora desta implementação. O parser de importação tem tradução própria; os endpoints mantêm a validação existente. Uma revisão geral de associação de erros a campos deve ser proposta separadamente.
- Leitor de tela, dispositivo físico, Safari/iOS e teclado virtual continuam como verificação manual pendente. Esses limites não são substituídos por testes de DOM.

Nenhum deploy, envio de e-mail, migration, nova biblioteca ou alteração factual foi executado.
