# Acompanhamento da implementação

## Escopo e critérios

Aplicação Next.js App Router, TypeScript strict, PostgreSQL e Prisma. Prioridade: dados locais por versão, recomendações determinísticas, persistência real e lacunas explícitas. O pedido original encontra-se no anexo do chat.

## Plano verificável

1. Fundação e banco isolado: instalação, schema, migration e autenticação.
2. Dados: snapshot com commit da PokéAPI; formas, tipos, atributos e learnsets filtrados por version group; importação idempotente e proveniência.
3. Motor: efetividade por jogo, legalidade conservadora, builds, matriz coletiva e beam search com limites.
4. Interface: dashboard, catálogo, detalhes, editor de equipes, gerador, comparador, rankings estimados, favoritos e perfil.
5. Persistência: registro/login/logout, CRUD com autorização, favoritos e configurações.
6. Validação: testes de motor, integração PostgreSQL, fluxos de navegador, build de produção, auditoria contra o escopo.

## Decisões

- Execução local conforme stack e instrução de evitar serviços externos desnecessários. Sem publicação nesta etapa.
- IA generativa permanece desabilitada conforme fallback solicitado; nenhuma chave será criada ou consumida.
- Auth.js Credentials com hashing bcrypt, sessão em JWT/cookie da biblioteca e registro de sessão revogável em PostgreSQL. Dados pessoais no PostgreSQL.
- Informações de distribuição e progressão não inferidas a partir de learnset. Dados sem evidência suficiente permanecem desconhecidos.
- Rankings calculados serão identificados como estimativas. Não atribuir pontuações próprias a fontes externas.

## Estado inicial

- Diretório vazio.
- Node 24 e pnpm disponíveis; PostgreSQL 17 instalado; Docker indisponível.
- Acesso à rede pelo sandbox restrito; downloads exigem execução com permissão de rede.
- Pesquisa de 16/10/2026 confirma version groups 20/21/22 (Sword/Shield), 24 (Arceus), 30/31 (Z-A/Mega Dimension) na fonte.

## Estado atual validado

- Núcleo full-stack implementado: dashboard, catálogo, detalhes, formas com atributos próprios, builds editáveis e salvas, construtor, gerador, comparador, estimativa de tiers, relatório determinístico, contas e favoritos.
- PostgreSQL isolado em `.local/postgres`, porta 54329, somente loopback, credenciais aleatórias em `.env` ignorado. Não altera o serviço PostgreSQL do sistema.
- Três migrations aplicadas. Snapshot fixo com commit, hashes e download de conjunto completo. Reimportação por upserts validada; identificador duplicado de Roseli Berry normalizado.
- Base: 1.025 espécies, 1.351 formas, 919 movimentos globais, 46.475 registros de learnset (inclui 41 entradas curadas em Z-A), 13 fontes.
- Sword: 750 formas compatíveis, 44.204 registros de aprendizado; Arceus: 247 formas e 2.230 registros; Z-A: 373 formas com disponibilidade parcial e seis learnsets parcialmente curados.
- 52 testes unitários/integração passaram; TypeScript strict, lint sem avisos e build de produção passaram. Suíte de navegador de desktop e mobile executada sobre produção; resultado da rodada estendida em AUDITORIA.md.
- Verificação dos 14 arquivos JavaScript enviados ao cliente: zero ocorrências dos valores reais de DATABASE_URL, AUTH_SECRET ou SMTP_URL. A expressão DATABASE_URL presente na interface é somente instrução de configuração, não uma credencial.
- Capturas de desktop e celular em `docs/screenshots`. Sem publicação externa.
- Rodada estendida final: 12/12 testes end-to-end aprovados em 42,5 s, total de 64 testes aprovados. Serviços de validação foram encerrados; banco e credenciais locais preservados. Reinício e parada idempotente do helper PostgreSQL também foram verificados, mantendo contagens e invariantes.

## Pendências reais para retomada

O escopo integral permanece incompleto. Ler [AUDITORIA.md](AUDITORIA.md) antes de continuar: propriedades de Arceus, catálogo completo de Z-A/Mega Dimension, progressão, transformações/itens, regras competitivas, evidências comunitárias, simulação de atributos e integração generativa são pendentes/parciais. SMTP real não configurado nem validado. Não declarar essas partes concluídas.

## Comandos úteis

`pnpm run db:local`, `pnpm run dev`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run start`, `pnpm run test:e2e`. Para auditar os dados: `pnpm exec tsx scripts/audit-data.ts`. Consultar README para configuração e deploy. No Windows, encerrar o servidor antes de regenerar Prisma Client para evitar bloqueio da DLL.

## Problemas resolvidos

Porta 55432 reservada pelo Windows → 54329. Scripts nativos pnpm 11 exigiram allowBuilds no workspace. Prisma Client precisou ser regenerado com o servidor encerrado. Insuficiência de dados no gerador agora retorna validação 400. Na validação estendida, o seletor de alerta foi delimitado para não confundir o aviso do aplicativo com o anunciador de rotas acessível do Next.js.

## Expansão concluída — 16/10/2026

Builds e análises cobrem as 664 espécies/750 formas de Sword, 242/261 de Arceus e 364/511 de Z-A com Mega Dimension: 1.522 formas com movimentos e builds validadas. São 73.915 registros de learnset no total. Arceus tem 177 propriedades nativas e Z-A tem 340; tipo e categoria são próprios do jogo. Fonte, hashes e revisões estão em data/supplemental/manifest.json e docs/FONTES.md.

Validação desta expansão: 91 testes Vitest (34 motor, 20 PostgreSQL incluindo geração exaustiva das 1.522 formas, 28 parsers de propriedades, 4 normalização, 5 fontes). Produção e TypeScript passaram; lint sem avisos. Playwright: 14/14 em desktop e mobile; após a revisão final de TM/DLC, os quatro casos de Tyranitar e geração foram repetidos e passaram em 15,9s. São 105 casos distintos aprovados.

O modo competitivo, a ativação configurável de Mega/Gigantamax, estilos/ordem de ações de Arceus, plus/alcance/Speed de Z-A, progressão completa e catálogo de itens continuam com os limites indicados acima. Esta expansão completa a cobertura de movimentos/builds das espécies compatíveis, não a simulação integral de batalha nem todo o pedido original.

A migração 20261017010000_game_move_properties adiciona category/typeName por jogo. Atualização: data:games, db:migrate, db:generate com servidor parado e db:expand. db:import incorpora a expansão depois dos dados-base. PostgreSQL do usuário foi mantido; o servidor de desenvolvimento foi reiniciado para carregar a atualização.
