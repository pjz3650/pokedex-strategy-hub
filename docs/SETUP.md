# Instalação e operação do Pokétactics

Aplicação web local com Next.js App Router, TypeScript strict, PostgreSQL, Prisma e Auth.js. Catálogo, análise por regras, builds editáveis, equipes persistidas, geração heurística, comparação, favoritos e preferências. Interface em português brasileiro; nomes de Pokémon, movimentos, habilidades e itens mantidos em inglês.

**O núcleo é funcional, mas o escopo integral do documento original não está concluído.** A cobertura por jogo e as pendências estão explícitas na aplicação em `/fontes` e em [AUDITORIA.md](AUDITORIA.md). A aplicação não substitui dados ausentes por valores fictícios.

## Instalação do zero

Requisitos: Node.js 24+, pnpm 11 e PostgreSQL 17. Chrome instalado para a suíte end-to-end atual.

No Windows com PostgreSQL instalado, em um checkout sem `.env` e sem cluster local:

```powershell
pnpm install --frozen-lockfile
pnpm run db:local
pnpm run db:generate
pnpm run db:migrate
pnpm run data:download
pnpm run data:games
pnpm run db:import
pnpm run dev
```

`db:local` gera uma senha aleatória e `AUTH_SECRET` e grava `.env`. Se já houver `.env` sem cluster, o script interrompe para não sobrescrever credenciais. Para usar um PostgreSQL existente, copie `.env.example` para `.env`, crie um banco exclusivo para o projeto e configure `DATABASE_URL`, `AUTH_SECRET` e `AUTH_URL`. Execute os demais passos sem `db:local`.

Exemplo para criar o banco com uma conta autorizada do PostgreSQL, sem escrever a senha na linha de comando:

```text
createdb -h 127.0.0.1 -p 5432 -U seu_usuario -W pokedex
```

Em Linux/macOS, use um PostgreSQL local ou gerenciado e a mesma sequência de migrations/importação; o helper `local-postgres.mjs` é específico de Windows. Em produção, use uma conta de banco com privilégios mínimos de aplicação, separada da conta de migrations. O usuário do cluster de desenvolvimento é proprietário/superusuário do cluster local, não um perfil adequado para produção.

## Dados e atualização

O downloader consulta a fonte pública PokéAPI e fixa um commit. Valida a origem e o formato dos CSVs, gera hashes SHA-256 e só troca a pasta ativa quando o snapshot estiver completo. Um snapshot anterior é preservado em `data/.previous-snapshot-*`. Dados brutos, snapshots de trabalho e backups não são versionados no Git.

```powershell
pnpm run data:download
pnpm run db:import
```

Para reutilizar exatamente o snapshot já baixado, sem declarar um commit novo para arquivos antigos:

```powershell
node scripts/download-data.mjs --cached
pnpm run db:import
```

O importador aplica upserts por IDs estáveis em lotes de até1000, registra o resultado em DataImportRun e mantém procedência. Pequenas curadorias específicas ficam em `data/curated-*.json`. O identificador duplicado `roseli-berry` da fonte é normalizado para a primeira identidade, sem criar duas entidades conflitantes.

**Execute atualizações em janela de manutenção e faça backup do banco.** O download troca snapshots completos, mas a importação SQL ainda usa lotes independentes e não faz rollback global ou remoção automática de registros retirados pela fonte. Reinicie a aplicação após importar para invalidar o cache público de uma hora. Em produção, acrescente uma estratégia explícita de troca de snapshots/transação global.

A base normalizada contém 1.025 espécies e 1.351 formas. Builds e análise de movimentos cobrem todas as espécies compatíveis dos três jogos: **Sword/Shield: 664 espécies e 750 formas; Arceus: 242 espécies e 261 formas; Z-A/Mega Dimension: 364 espécies e 511 formas**. Todas as 1.522 formas disponíveis possuem movimentos e geram uma build. Sword mantém 44.204 registros específicos da PokéAPI; Arceus tem 5.448 e Z-A tem 24.263 registros da fonte Fortelle, com mapeamento de formas e deduplicação de cosméticos. TMs sem item real são excluídas. Movimentos de Z-A distinguem base/DLC.

As propriedades são próprias de cada jogo: 637 movimentos Sword, 177 parâmetros de Arceus publicados por Kaphotics e 340 movimentos normais de Z-A extraídos das tabelas Project Pokémon. Tipo/categoria também são separados por jogo, incluindo Double Hit como status em Arceus. A cobertura não significa simulação completa de batalha ou disponibilidade de todas as espécies nacionais em cada jogo.

Para atualizar somente esta expansão sobre a base já importada:

```powershell
.\pnpm.cmd run data:games
.\pnpm.cmd run db:migrate
.\pnpm.cmd run db:generate
.\pnpm.cmd run db:expand
```

Pare o servidor antes de regenerar o Prisma no Windows. Os snapshots suplementares fixam revisões e hashes em `data/supplemental/manifest.json`; o relatório fica em `docs/COBERTURA_JOGOS.json` e a cobertura ao vivo está em `/api/hub/health` e na tela Fontes.

## O que é utilizável

- Dashboard com números reais do catálogo e coleções do usuário.
- Pokédex com busca, tipos primário/secundário, geração, formas, evolução geral, disponibilidade e ordenação; paginação de36 cards.
- Ficha de Pokémon, formas com sprites próprios, atributos, radar, fraquezas/resistências/imunidades por jogo e movimentos específicos disponíveis.
- Builds de campanha com quatro slots, estilos, explicação, alternativas, edição manual e recálculo. CRUD de builds na conta.
- Construtor de até seis integrantes, movimentos validados, habilidades aplicáveis, itens curados, matriz coletiva e índice explicável. Exportação/importação JSON validada.
- Gerador por beam search com obrigatórios/proibidos, estilo, DLC e progresso. Progresso incompleto causa exclusão conservadora; há opção explícita de ignorá-lo.
- Comparador de atributos e defesa de dois Pokémon; sem vencedor universal.
- Estimativa de atributos em classes S/A/B/C/D/F, identificada separadamente de ranking comunitário.
- Cadastro, login, logout, revogação de sessão, favoritas, perfil, progresso selecionado por jogo e histórico opt-in.
- Assistente por template com análise determinística. Chat generativo explicitamente desabilitado.

## Limitações principais

- Sem fontes comunitárias agregadas suficientes; não há tier comunitária fabricada.
- Sem regulamentos históricos ou temporadas importados; competitivo indisponível para análise automatizada. Arceus não recebe modo competitivo inventado.
- Progresso de encontros parcial: iniciais dos três jogos e Route1 de Sword. Etapas de movimentos/itens desconhecidas; a geração estrita não produz equipes na base atual, porque todas as etapas de movimentos permanecem desconhecidas.
- Arceus: movimentos e propriedades normais importados; sem simulação de Agile/Strong, ordem de ações ou Effort Levels.
- Z-A: movimentos de todas as espécies compatíveis e poder/cooldown base importados, incluindo Mega Dimension; sem simulação de alcance/área/frames/Speed efetivo ou movimentos plus.
- Formas Mega são consultáveis, mas configuração de transformação, Mega Stones, Dynamax, Gigantamax e Max Moves no time ainda são pendentes.
- Nature pode ser salva, mas IVs/EVs/Effort Levels e atributos efetivos não são calculados. Efeitos de itens não alteram o índice de movimentos.
- Relações evolutivas gerais consultáveis; métodos e condições por jogo incompletos. Formas puramente cosméticas que compartilham `pokemon_id` não têm identidade individual nesta versão.
- Imagens dependem de rede; o catálogo textual e o motor usam o banco local.
- Recuperação de senha depende de SMTP; sem configuração, o fluxo informa indisponibilidade. Entrega real de e-mail não foi testada.
- Rate limiting global conservador; coleções pessoais ainda precisam de paginação para grandes volumes. Não foi feito teste de carga nem auditoria externa de segurança.

## Recuperação de senha

Configure no servidor:

```dotenv
SMTP_URL="smtp://usuario:senha@servidor:587"
SMTP_FROM="Pokétactics <conta@seudominio.com>"
```

Credenciais devem ser fornecidas por variáveis de ambiente ou arquivo ignorado. O link enviado usa `AUTH_URL`, token de uso único e validade de30 minutos. O servidor guarda somente o hash do token e revoga sessões após a troca da senha.

## IA opcional

Nenhuma chave de API é necessária ou criada. A análise principal é determinística. O relatório do assistente usa templates e declara que a geração por modelo está desabilitada. **A integração com LLM ainda não está implementada; definir uma chave por si só não a habilita.** O próximo passo é adicionar um provedor no servidor com contexto validado do motor, validação de saída, limites por usuário e orçamento; nunca aceitar fatos gerados como verdade da base.

## Testes e build

Com o PostgreSQL inicializado e os dados importados:

```powershell
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run start
```

Em outro terminal, com a aplicação servindo na porta3000:

```powershell
pnpm run test:e2e
```

Os testes de integração usam o banco configurado em `DATABASE_URL`; execute-os em ambiente de desenvolvimento/teste. A suíte de navegador cria contas sintéticas em `example.test`, equipes e builds locais; não envia e-mails. Chrome é usado nos perfis desktop e viewport/emulação móvel. Isso não equivale a um teste em Safari/iOS físico. Os traces de falhas e o relatório HTML ficam ignorados em `test-results` e `playwright-report`.

No Windows, encerre o servidor antes de regenerar o Prisma Client: a DLL do engine pode estar bloqueada pelo processo em execução. `db:migrate` usa migrations versionadas, não `db push`.

## Deploy

1. Provisionar PostgreSQL com TLS, backups e conta de aplicação sem privilégios administrativos.
2. Instalar dependências pelo lockfile e configurar segredos no ambiente do servidor. `AUTH_URL` deve ser o domínio HTTPS exato; `AUTH_SECRET` aleatório; `AUTH_TRUST_HOST` apenas atrás de host/proxy confiável.
3. Executar `pnpm run db:migrate`, baixar/importar os dados em manutenção e validar o inventário de licenças.
4. Com o servidor encerrado, executar `pnpm run build`; iniciar `pnpm run start` atrás de proxy HTTPS. O comando padrão escuta em loopback; o proxy deve encaminhar para ele.
5. Verificar `/api/hub/health`, login, autorização e persistência. Configurar SMTP somente se o recurso for oferecido.
6. Acrescentar limites na borda, limpeza de tokens/sessões/buckets expirados, observabilidade e validação das lacunas de dados antes de anunciar cobertura integral.

O código está publicado no GitHub; não há instância web hospedada configurada neste repositório. É uma aplicação Node/PostgreSQL; exportação estática não suporta os recursos de conta e persistência.

## Documentação

- [Arquitetura](ARQUITETURA.md)
- [Fórmulas e pesos do motor](MOTOR.md)
- [Fontes, licenças e lacunas](FONTES.md)
- [Acompanhamento para retomada](ACOMPANHAMENTO.md)
- [Auditoria do escopo e resultados de testes](AUDITORIA.md)
- [Avisos de terceiros](../THIRD_PARTY_NOTICES.md)
