# Arquitetura

## Aplicação

Next.js 16 App Router, React, TypeScript strict. O layout servidor consulta o catálogo público em PostgreSQL; os componentes cliente implementam navegação, filtros, rascunhos, gráficos Recharts e editores. Tailwind 4 e CSS semântico sustentam o tema; o Button segue a composição shadcn/ui com Radix Slot e CVA. Ícones Lucide. A interface tem tema claro/escuro, breakpoints, foco visível, diálogo nativo com contenção de foco e respeito a movimento reduzido.

`src/lib/contracts.ts` define os contratos serializáveis. `games.ts` centraliza regras incompatíveis. `engine.ts` é um módulo puro e determinístico. `repository.ts` contém consultas e projeções. `team-service.ts` valida recursos com dados do banco. As rotas em `src/app/api/hub/[...path]/route.ts` são a fronteira HTTP validada com Zod. O catch-all de páginas não é usado para executar ações de servidor.

## Dados e privacidade

Prisma 6.19.3 foi mantido deliberadamente para usar seu conector PostgreSQL consolidado e schema com `DATABASE_URL`, sem dependência de um serviço hospedado. O lockfile fixa as resoluções. Migrations SQL incluem relações, índices, chaves compostas e constraints de slots/recursos.

Espécie e forma são entidades distintas. Cada identidade de Pokémon da PokéAPI é uma forma local, incluindo formas com atributos próprios. Variações cosméticas presentes apenas em `pokemon_forms.csv` que compartilham `pokemon_id` ainda não têm identidades individuais no catálogo. Atributos históricos corrigem diferenças da geração 8 em Sword/Arceus; dados atuais são mantidos para Z-A. Não existe cálculo de atributos efetivos.

Learnsets têm chave composta de forma, movimento, version group, método e nível. Os dados do movimento têm chave movimento/jogo. As propriedades de Sword nunca preenchem as lacunas de Arceus/Z-A. Disponibilidade na espécie não prova disponibilidade de uma forma regional. Formas Mega aparecem como transformações e não são aceitas como membros permanentes.

O importador baixa um snapshot fixo por commit. A importação registra sucesso/falha e usa lotes limitados com upserts por chaves estáveis. Os arquivos originais ficam ignorados em `data/raw`; a curadoria factual está versionada em `data/curated-*.json`. Nenhuma página de terceiros é raspada durante requisições. Importações devem ser executadas em janela de manutenção, com backup: lotes são idempotentes, mas a operação inteira ainda não possui troca atômica de snapshot, rollback global ou remoção automática de registros ausentes em um snapshot novo.

## Autenticação e autorização

Auth.js 5 Credentials valida cadastro/login, faz compare bcrypt com hash de custo 12 e emite a sessão em cookie HTTP-only gerenciado pela biblioteca. A versão do Auth.js ainda é beta e está explicitamente fixada. Um registro Session no PostgreSQL permite revogação: toda sessão privada é verificada no banco. Logout e redefinição invalidam sessões. Tokens de recuperação são aleatórios, armazenados somente como SHA-256, expiram em 30 minutos e são consumidos atomicamente. Sem SMTP, a recuperação retorna indisponibilidade explícita.

As rotas privadas derivam userId da sessão, nunca do corpo. Equipes e builds são atualizadas/excluídas com conferência de proprietário dentro de transação. Favoritos usam chave usuário/forma. Mutations exigem Origin igual a AUTH_URL. Rate limiting atômico no PostgreSQL protege cadastro, login, recuperação, geração e demais mutações. O limite global é conservador e compartilhado entre usuários; não confia em X-Forwarded-For controlável pelo cliente. Em produção deve ser complementado por limite na borda e política de expiração/manutenção dos buckets.

Segredos não são serializados. `.env`, banco local, logs e traces de teste são ignorados pelo Git. Preferências de tema/jogo ficam no navegador; rascunhos não salvos ficam em sessionStorage e são identificados como rascunhos. Persistência pessoal efetiva exige login e usa PostgreSQL. Histórico é opt-in e é excluído quando o usuário desabilita e salva.

## Desempenho e operação

Catálogo público com cache de uma hora, sem dados pessoais. O catálogo é pequeno o suficiente para filtragem e paginação de 36 cards no cliente; isso transfere a projeção do catálogo inteiro no carregamento inicial. A API pública também pagina a mesma projeção. Para bases maiores, migrar filtros/paginação para consultas SQL específicas. O gerador consulta movimentos e learnsets em lote, evitando N+1. Consultas pessoais são limitadas e indexadas, mas paginação de coleções pessoais ainda é pendente.

Imagens usam Next Image com fallback de arte para sprite, carregamento tardio padrão e resolução declarada. Nesta versão os arquivos são servidos pelo repositório público de sprites, com `unoptimized` para não depender de acesso externo do otimizador local. Ausência de imagem gera ícone de indisponibilidade. Os dados textuais e o motor funcionam sem acesso à fonte depois da importação; imagens ainda exigem rede.

Logs de falhas HTTP usam evento, caminho e classe do erro, sem conteúdo de credenciais. `/api/hub/health` faz uma consulta real ao banco e retorna versão do motor e último import concluído. Não há telemetria de produto, dashboard operacional ou tracing distribuído implementados.

## Integração generativa

Desabilitada nesta entrega. O assistente informa a situação e produz um relatório determinístico por template, sem interpretar perguntas livres. Pode persistir contexto/histórico opt-in. Não há chamada OpenAI, chave necessária ou consumo de tokens. Integração com um provedor deve ser feita posteriormente usando apenas contexto validado, limites de custo e validação da saída; não está sendo apresentada como funcionalidade pronta.
