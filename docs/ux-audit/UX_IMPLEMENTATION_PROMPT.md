# Prompt de implementação de UX — Pokétactics

> Estado: especificação para uma etapa futura. Executar somente quando o usuário aprovar explicitamente este plano. A auditoria de 30/10/2026 não autorizou nem implementou as mudanças abaixo.

## A. Contexto e objetivo

Atue como agente implementador no repositório Pokétactics (`pjz3650/pokedex-strategy-hub`). É uma aplicação Next.js 16.4.2/React 19/TypeScript/Prisma 6/PostgreSQL, em PT-BR, para consulta de Pokémon e planejamento de campanha em Sword, Legends: Arceus e Legends: Z-A. O checkout auditado foi e62ce15; revalide divergências antes de editar. O objetivo é preservar trabalho entre ferramentas, prevenir escolhas impossíveis e permitir recuperar erros sem redesenhar o produto. Os vinte IDs abaixo são o escopo completo de decisões funcionais. Não dependem do histórico da conversa.

Leia AGENTS.md, README.md, DESIGN.md, docs/ARQUITETURA.md, MOTOR.md, AUDITORIA.md, SETUP.md e as instruções aplicáveis. **Antes de escrever código, leia os guias relevantes instalados em node_modules/next/dist/docs/**, especialmente navegação, useSearchParams e testes. Esta versão não deve ser implementada de memória como versão antiga de Next. Rotas são um catch-all em src/app/[[...route]]/page.tsx; HubProvider mantém jogo/coleções/rascunho e os componentes de tela estão em src/components. API validada em src/app/api/hub/[...path]/route.ts; motor puro em src/lib/engine.ts; regras em games.ts, contracts.ts, repository.ts, validation.ts e team-service.ts.

## B. Restrições obrigatórias

- Preserve DESIGN.md integralmente e a identidade Type Study: fontes Barlow/Barlow Condensed/Noto Sans JP, cores/tokens, temas claro/escuro, arte/sprites, composição de cards/heroes e linguagem dos componentes. Não redesenhe páginas ou mude paleta/tipografia/layout por gosto. Apresentação nova só quando necessária ao comportamento especificado, usando Button/Notice/EmptyState/dialog e tokens existentes.
- Preserve regras por jogo, dados históricos, fontes, null como desconhecido, validação Zod, autorização por proprietário, Origin, rate limit e segredo no servidor. Não trocar engine, framework, banco, autenticação ou bibliotecas sem necessidade concreta deste escopo. Não alterar schema/migrations para facilitar rascunho ou lixeira.
- Sword aplica habilidades modeladas e PP; Arceus não aplica held items/habilidades convencionais e usa regras próprias; Z-A usa cooldown, não PP. Não implementar estilos/ordem de ação Arceus, plus/alcance efetivo, EVs/IVs, transformações configuradas ou competitivo sem regulamento. Nature/itens continuam com os limites atuais. Pontuação heurística nunca é vitória prevista.
- Formas temporárias (mega/battle/gigantamax) são consultáveis/analisáveis quando disponíveis, porém não membros permanentes. Formas regionais/alternativas permanentes continuam válidas. O construtor manual não tem regra geral de proibir espécies repetidas: não criar Species Clause. O gerador mantém suas regras existentes.
- Builds e análise têm cobertura para 750 disponibilidades Sword, 261 Arceus, 511 Z-A no snapshot auditado. A geração estrita tem lacuna de etapas; não preencher lacunas com outro jogo, inventar obtenção nem habilitar Ignorar progresso/DLC sem escolha explícita. O assistente é template: não integrar IA, criar chave ou simular perguntas livres.
- Rascunho de sessão não significa gravação na conta. Preservação local não concede autorização. Nenhum dado privado de outra conta pode ser restaurado. Não colocar credenciais ou dados pessoais em URL/cache público. Logout/401 confirmado elimina exposição de conta anterior.
- Preserve comportamentos corretos: filtro dinâmico, exclusões do comparador de até quatro, radar dos dois primeiros com aviso, abas da ficha por setas/Home/End, Escape/foco de modais/menu, preferência de tema após reload, fallback de imagem, tabela com rolagem interna, exportação JSON version:1 e geração→construtor com movimentos.
- Não implementar as hipóteses HYP-01 a HYP-05 como se fossem defeitos já testados. Validá-las primeiro; se confirmadas e fora dos vinte itens, registrar proposta e pendência para o usuário sem ampliar silenciosamente o escopo.
- Não publicar, migrar banco real, criar conta real, enviar e-mail ou deletar registros pessoais para testar. Use conta/fixtures sintéticas e banco de desenvolvimento/teste; SMTP deve ser sandbox específico. Mudanças de API opcionais de diagnóstico/estado devem manter compatibilidade e testes, sem enfraquecer regras.

## C. Lista completa de alterações

As seções a seguir são ordens de implementação, não sugestões vagas. Cada ID deve constar da entrega com status e evidência. Caminhos e linhas são pontos de partida do checkout auditado; localize os símbolos novamente. Aceitação tem precedência sobre uma estrutura interna específica quando existir alternativa mais simples com o mesmo comportamento.

### Estado compartilhado, navegação e seleção

#### UX-18 — Falha ao carregar a sessão é apresentada como usuário deslogado (P1)

**Problema original/atual:** O wrapper perde status HTTP ao lançar Error; refresh apaga Personal em qualquer falha e as telas confundem carregamento/falha com ausência de conta.

**Consequência:** O usuário teme que seus dados sumiram ou tenta entrar novamente; uma falha posterior pode substituir a coleção na tela por convite de cadastro.

**Comportamento desejado:** Estados distintos de sessão: carregando, autenticado, visitante confirmado e indisponível. Erro transitório permite repetir sem apagar trabalho local.

**Implemente:** Criar erro tipado com status e estado explícito no provider. Somente 401 confirmado marca visitante; 5xx/rede marcam erro de sincronização. Mostrar último conteúdo pessoal apenas na mesma sessão já validada, como desatualizado; em primeira carga exibir falha e botão repetir. Evitar flicker de cadastro enquanto personalLoading. Em mutação seguida de refresh falho, distinguir “gravação concluída; não foi possível atualizar a lista” de gravação fracassada para evitar duplo POST. 401/logout limpa dados privados e IDs; manter rascunho conforme política de propriedade.

**Componentes/arquivos a inspecionar:** [src/components/providers.tsx](../../src/components/providers.tsx):40–49, 85–96; [src/components/dashboard-catalog.tsx](../../src/components/dashboard-catalog.tsx):498–512; [src/components/account-page.tsx](../../src/components/account-page.tsx):110–126; [src/components/team-pages.tsx](../../src/components/team-pages.tsx):743–753.

**Dependências:** Base para UX-02, UX-11, UX-15; segurança de sessão/ownership existente deve continuar no servidor.

**Casos extremos obrigatórios:** 401; 403; 429; 500; rede offline; JSON inválido; resposta antiga após logout; refresh após salvar; outra conta.

**Risco a prevenir:** Manter conteúdo antigo após logout/401 seria exposição entre contas; descarte obrigatório nesses casos.

**Critérios de aceitação:**

- [ ] 503 em /me mostra erro e Repetir, nunca convite de cadastro como único estado.
- [ ] 401 confirmado apresenta login e elimina conteúdo privado da sessão anterior.
- [ ] Falha de refresh após POST bem-sucedido não permite criar cópia por retry indiscriminado.
- [ ] Nenhum refresh altera campos locais ainda não salvos.

**Testes necessários:** Unitários de erro tipado/status e reducer de sessão; integração estados e mutação+refresh; E2E interceptações 401/503 e reconexão, mais persistência real com conta sintética.

#### UX-02 — O rascunho preserva integrantes, mas perde nome e identidade de edição (P1)

**Problema original/atual:** sessionStorage recebe somente `{game,members}`; nome é estado local e editTeamId existe só em memória. O efeito dependente de `personal` também pode reatribuir o nome durante refresh.

**Consequência:** O usuário pode criar uma cópia involuntária, perder o título e acreditar que está atualizando o registro original.

**Comportamento desejado:** Um envelope versionado de rascunho com identidade, nome e alterações pendentes, recuperável na sessão e separado por conta/jogo.

**Implemente:** Persistir versão, gameId, name, members, editTeamId opcional e estado alterado; manter baseline para comparar salvamento. Migrar o formato legado sem perder members. Restaurar editTeamId apenas depois de confirmar que a equipe pertence à conta atual; se não existir, manter conteúdo como cópia local e explicar. Atualizar nome a partir da conta somente ao abrir explicitamente o registro, nunca a cada refresh.

**Componentes/arquivos a inspecionar:** [src/components/providers.tsx](../../src/components/providers.tsx):75, 102–108, 124–126; [src/components/team-pages.tsx](../../src/components/team-pages.tsx):160, 169–174, 225–229.

**Dependências:** Fundação de UX-01; contratos de Personal e SavedTeam; validação do envelope no cliente.

**Casos extremos obrigatórios:** JSON de sessão corrompido; conta diferente; equipe removida; visitante que faz login; logout; preferência alterada; storage bloqueado.

**Risco a prevenir:** Guardar um ID sem conferir propriedade cria confusão entre contas. Não armazenar credenciais ou usar o ID como autorização.

**Critérios de aceitação:**

- [ ] Reload preserva nome, integrantes e intenção de atualizar a mesma equipe válida.
- [ ] Falha em storage informa que o rascunho está apenas na memória e não impede editar.
- [ ] Logout remove vínculo pessoal e não expõe rascunho privado à próxima conta.
- [ ] Refresh da coleção não substitui um nome digitado e ainda não salvo.

**Testes necessários:** Unitários de migração, validação e dirty state; integração com /me atrasado/401/503; E2E criar rascunho, reload, login e editar registro existente em banco de teste.

#### UX-01 — Trocar de jogo apaga o rascunho sem recuperação (P1)

**Problema original/atual:** `setGame` executa `setDraftState([])`, remove `hub-draft` e zera `editTeamId`. Links para formas de outro jogo e salvar jogo principal também chegam a essa função.

**Consequência:** Um usuário recorrente perde trabalho mesmo quando só pretendia consultar outro jogo; formas relacionadas podem causar a mesma perda indiretamente.

**Comportamento desejado:** Manter um rascunho independente para cada jogo na mesma sessão. Trocar o contexto deve restaurar o rascunho daquele jogo, sem converter integrantes ou movimentos.

**Implemente:** Centralize rascunhos por GameId no provider. Antes de mudar o jogo, guarde o envelope atual; ao entrar no destino, restaure apenas o envelope desse jogo. Faça ações de ficha, dashboard, perfil e equipe salva usar a mesma transição. Mostrar status “Rascunho de Sword preservado nesta sessão” quando existir trabalho. Não perguntar a cada troca se a preservação torna a ação reversível.

**Componentes/arquivos a inspecionar:** [src/components/providers.tsx](../../src/components/providers.tsx):114–126 (`setGame`, `setDraft`); [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):78–84 e 447–449; [src/components/account-page.tsx](../../src/components/account-page.tsx):103.

**Dependências:** UX-02 define o envelope. Aplicar esta base antes de UX-03, UX-04 e UX-09.

**Casos extremos obrigatórios:** Primeira visita a outro jogo; link de forma regional; URL com game; abrir equipe salva; usuário deslogado; armazenamento indisponível; duas equipes no mesmo jogo.

**Risco a prevenir:** A restauração pode contrariar links que hoje limpam o time. Separe mudança de contexto de criação/substituição intencional; revalidar dados restaurados.

**Critérios de aceitação:**

- [ ] Sword → Arceus → Sword restaura mesmos membros, movimentos, nome e origem de edição.
- [ ] Nenhum movimento/habilidade/item atravessa a fronteira de jogos por conversão implícita.
- [ ] Abrir outra equipe no mesmo jogo resolve substituição de rascunho explicitamente, sem sobrescrever o trabalho anterior silenciosamente.

**Testes necessários:** Unitário do redutor/transição por jogo; integração de restauração; E2E via cabeçalho, link de forma e salvar preferências. Verificar os três jogos.

#### UX-06 — O seletor exige filtrar e depois abrir outro controle (P2)

**Problema original/atual:** Há atualização durante a digitação, sem necessidade de confirmar pesquisa. Entretanto a escolha fica num select separado, sem lista dinâmica selecionável no mesmo campo; o picker não busca por número nem explica lista vazia. `toLowerCase()` não remove espaços/acentos.

**Consequência:** A tarefa repetida de seleção exige mudança de controle. Espaços ao colar causam falsos vazios. A navegação de sugestões difere entre ferramentas.

**Comportamento desejado:** Um combobox de seleção direta, consistente entre ferramentas, com resultados locais e estado vazio explícito. Normalização comum de consultas, sem traduzir nomes.

**Implemente:** Evoluir PokemonPicker para input com sugestões selecionáveis: nome completo da forma, número e tipos; lista virtualizada ou limitada com total e refinamento, sem ocultar arbitrariamente o item selecionado. Enter confirma somente opção ativa; Escape fecha sem mudar seleção; Tab segue a página; setas percorrem opções habilitadas. Preservar seleção ao digitar até confirmar outra. Limpar texto após adicionar membro, manter rótulo do escolhido em comparador/analisador. Normalizar trim, caixa e diacríticos de consulta e índice; aceitar número com ou sem #, inclusive zeros iniciais. Manter nomes originais na tela. Reusar helper na Pokédex e busca global. Esta última pode manter botões e Tab; adicionar setas exige o contrato ARIA completo, sem declarar a implementação atual inválida só por não tê-las.

**Componentes/arquivos a inspecionar:** [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):1090–1139; [src/components/dashboard-catalog.tsx](../../src/components/dashboard-catalog.tsx):424–433; [src/components/shell.tsx](../../src/components/shell.tsx):113–128 e 308–351.

**Dependências:** UX-07 define as opções por intenção. Não adicionar dependência visual sem necessidade.

**Casos extremos obrigatórios:** Consulta vazia; zero resultados; nome parcial; espaços; formas regionais/Mega; exclusões; troca de jogo com popup aberto; touch/IME; lista grande; selected fora do filtro.

**Risco a prevenir:** Combobox customizado pode piorar acessibilidade do select nativo. Não entregar sem teclado/leitor de tela; nunca selecionar apenas por blur.

**Critérios de aceitação:**

- [ ] É possível digitar e selecionar diretamente uma sugestão com mouse, toque ou teclado.
- [ ] Luc/lUc/“ Lucario ” e #0448 encontram a forma correta conforme o jogo.
- [ ] Vazio por filtro tem mensagem e ação para limpar; filtro não limpa a seleção confirmada.
- [ ] Combobox tem nome, expanded, controls, active descendant e option selected coerentes; nenhum foco preso.

**Testes necessários:** Unitários de normalização e opções; integração selecionar/cancelar/excluir/trocar contexto; E2E teclado e emulação de toque nos quatro consumidores, e busca global com Tab preservado.

#### UX-07 — Opções de transformação são oferecidas para ações que as recusam (P1)

**Problema original/atual:** O picker filtra somente canUse e exclude. Analisador e comparador podem usar transformações, mas construtor e serviço de geração não as aceitam como integrantes permanentes.

**Consequência:** O controle promete uma escolha impossível e só explica a restrição depois da ação; iniciante confunde consulta de transformação com posse permanente.

**Comportamento desejado:** Opções dependentes da intenção: consulta inclui transformações, composição de equipe explica sua restrição antes de selecionar.

**Implemente:** Adicionar política de seleção ao picker. Em composição/obrigatórios, manter transformações identificadas como não selecionáveis com explicação legível fora de tooltip e link para consultar ou escolher forma permanente compatível. Em proibidos, limitar ao pool permanente que o gerador realmente considera; explicar que transformações já ficam fora do pool. Não ocultar transformações do catálogo, analisador ou comparador. Manter validação no servidor.

**Componentes/arquivos a inspecionar:** [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):1103–1109; [src/components/team-pages.tsx](../../src/components/team-pages.tsx):203–208, 588–608; [src/lib/team-service.ts](../../src/lib/team-service.ts):16–22; [src/app/api/hub/[...path]/route.ts](../../src/app/api/hub/[...path]/route.ts):211–215.

**Dependências:** UX-06; sem ampliar o catálogo factual nem implementar Mega Stones.

**Casos extremos obrigatórios:** Forma alternativa permanente; forma com disponibilidade desconhecida; mega não pertencente ao jogo; limite de seis; visitante; touch sem hover.

**Risco a prevenir:** Não usar apenas kind != base: formas regionais e alternativas permanentes precisam continuar válidas.

**Critérios de aceitação:**

- [ ] 10034 nunca entra no rascunho como permanente e a justificativa é apresentada antes da tentativa.
- [ ] Mega continua consultável em Z-A e pode ser comparada/analisada.
- [ ] Não apresentar desconhecido como indisponibilidade confirmada ou como restrição do usuário.

**Testes necessários:** Unitário da política por intenção; integração UI/serviço; E2E forma temporária e regional permanente, teclado/touch.

#### UX-16 — Voltar da ficha para a Pokédex perde o recorte de pesquisa (P2)

**Problema original/atual:** O link ignora origem, query, ordenação, paginação e contexto de favoritos. Não há serialização do recorte na URL.

**Consequência:** Explorar candidatos exige reconstruir repetidamente filtros e localizar o card; ao partir dos favoritos, o retorno leva ao catálogo geral.

**Comportamento desejado:** Recorte explícito e restaurável, com retorno seguro à origem local conhecida.

**Implemente:** Serializar query, filtros, sort, page e game em searchParams, validando valores. Digitação usa replace sem gerar histórico por tecla; mudanças confirmadas/paginação podem gerar entradas úteis. Card carrega referência local à lista de origem ou o provider guarda contexto validado. Link da ficha retorna à lista/favoritos com recorte e posiciona foco no card de origem. Link direto sem origem usa /pokedex. Não usar back cego que possa sair do produto; não aceitar returnTo arbitrário externo.

**Componentes/arquivos a inspecionar:** [src/components/dashboard-catalog.tsx](../../src/components/dashboard-catalog.tsx):412–421; [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):138–140; [src/components/pokemon-ui.tsx](../../src/components/pokemon-ui.tsx):183.

**Dependências:** Helper de busca UX-06. Ler guias locais Next.js sobre useSearchParams e navegação antes de implementar.

**Casos extremos obrigatórios:** Reload; acesso direto; voltar/avançar navegador; filtros sem resultado no novo jogo; número de página fora do intervalo; origem favoritos sem sessão.

**Risco a prevenir:** URLs não devem conter dados privados da conta; favoritos são identificador de rota, nunca lista de IDs privados.

**Critérios de aceitação:**

- [ ] Retorno explícito conserva pesquisa, filtros, ordenação, página e jogo válidos.
- [ ] Back/Forward percorre estados úteis e reload reproduz a lista.
- [ ] Card/origem recebe foco ou fallback previsível; link externo em returnTo é ignorado.

**Testes necessários:** Unitários de parse/serialize/allowlist; integração roteamento; E2E catálogo e favoritos → ficha → voltar, inclusive na página 2.

### Construtor, builds e coleções

#### UX-03 — “Nova equipe” reabre a equipe em edição (P1)

**Problema original/atual:** O link navega para /equipes sem zerar editTeamId ou criar um novo envelope. A próxima gravação usa PATCH da equipe anterior.

**Consequência:** O rótulo de criação induz o usuário a modificar uma equipe existente; há risco de sobrescrita por engano.

**Comportamento desejado:** Separar “continuar rascunho”, “editar equipe” e “nova equipe”. Nova equipe cria identidade local nova com destino POST.

**Implemente:** Crie ação explícita startNewTeam(game). Se o rascunho corrente estiver alterado, oferecer “Continuar editando”, “Exportar rascunho” ou “Descartar e criar nova”; cancelamento mantém tudo. Sem alterações pendentes, iniciar vazio diretamente. Limpar ID e baseline, restaurar nome padrão e foco no primeiro seletor. A navegação normal para o construtor continua retomando o rascunho.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):729–739 (Link de Nova equipe), 217–229 e 791–798.

**Dependências:** UX-01 e UX-02.

**Casos extremos obrigatórios:** Equipe recém-salva; rascunho vazio; salvar falhou; visitante; voltar do comparador; equipe original de outro jogo.

**Risco a prevenir:** Limpar incondicionalmente criaria uma nova perda de trabalho; oferecer decisão somente quando houver conteúdo pendente.

**Critérios de aceitação:**

- [ ] Nova equipe nunca mantém ID da equipe anterior.
- [ ] Cancelar mantém nome, membros e estado anterior.
- [ ] Salvar a nova equipe faz POST; atualizar uma equipe aberta continua usando PATCH.

**Testes necessários:** Integração das ações do provider; E2E com duas equipes sintéticas e assertiva de método/ID, sem tocar registros reais.

#### UX-08 — Escolher movimento em campo vazio muda sua posição (P2)

**Problema original/atual:** O array é compactado depois de cada seleção/remoção. A interface mostra posições independentes, mas o estado representa apenas uma lista compacta.

**Consequência:** O usuário perde a referência do campo que acabou de editar; configurações mudam de lugar e a ordem é difícil de controlar.

**Comportamento desejado:** Campos estáveis durante a edição; somente a serialização para o contrato atual remove lacunas.

**Implemente:** Manter quatro slots locais (number|null) com identidade estável e adaptador explícito para Member.moves compacto. Atualizar só o slot acionado; limpar não desloca os demais na interface. Preservar ordem relativa na API/exportação. Não mandar null/undefined ao contrato atual. Sincronizar resets externos por identidade/revisão, sem recompatar toda edição no callback do pai. Manter bloqueio de IDs duplicados.

**Componentes/arquivos a inspecionar:** [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):767–780 (`moves[i]`, `splice`, `filter(Boolean)`); [src/lib/contracts.ts](../../src/lib/contracts.ts) (Member.moves); [src/lib/validation.ts](../../src/lib/validation.ts):memberSchema.

**Dependências:** Compartilhado por UX-04 e UX-05; não exige mudança de schema.

**Casos extremos obrigatórios:** Ditto/Unown com menos movimentos; remoção do slot 2; sugestão completa; importação; troca de integrante; desfazer substituição.

**Risco a prevenir:** Contrato compacto não preserva a posição das lacunas entre sessões; documentar que reabrir pode preencher a partir do primeiro slot sem perder a ordem dos movimentos ocupados.

**Critérios de aceitação:**

- [ ] Escolher no campo 4 mantém campos 1–3 vazios enquanto o editor continua aberto.
- [ ] Remover o campo 2 não altera visualmente os campos 3 e 4.
- [ ] Salvar/exportar envia até quatro IDs únicos válidos, na ordem visível dos ocupados.

**Testes necessários:** Unitários do adaptador e reducer de slots; integração edição controlada; E2E campos fora de ordem, remoção e retorno de salvamento.

#### UX-05 — A bancada descarta edição manual ao mudar estilo ou sair da aba (P1)

**Problema original/atual:** Trocar estilo substitui a configuração manual pela recomendação; sair do componente elimina estado local que não foi salvo. Não há aviso ou recuperação.

**Consequência:** Experimentação estratégica custa retrabalho e desestimula consultar o learnset durante a edição.

**Comportamento desejado:** Separar alterar o critério de avaliação de aplicar outra recomendação; conservar rascunho de build na sessão enquanto se consulta outra aba.

**Implemente:** Manter rascunho por conta/jogo/formId/buildId ou chave local nova. Na mudança de estilo, recalcular a avaliação do conjunto manual atual; oferecer botão explícito “Aplicar sugestão deste estilo”. Antes de substituir movimentos editados, mostrar comparação simples e permitir cancelar. Aplicar sugestão altera só movimentos; não zerar item/habilidade/nature sem necessidade. Restaurar rascunho ao voltar e após reload.

**Componentes/arquivos a inspecionar:** [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):430, 900–918, 962–968; [src/components/tools-pages.tsx](../../src/components/tools-pages.tsx):73–80.

**Dependências:** UX-02 como padrão de ciclo de vida, sem compartilhar indevidamente o envelope de equipe. UX-08.

**Casos extremos obrigatórios:** Conjunto automático ainda intacto pode acompanhar estilo automaticamente; edição manual parcial; mesma forma em jogos diferentes; build apagada; navegação entre analisador e builds.

**Risco a prevenir:** Preservar a build não deve fazer a avaliação usar estilo ou jogo antigo; guardar a origem da sugestão e a do critério atual separadamente.

**Critérios de aceitação:**

- [ ] Mudar estilo depois de editar não descarta movimentos manuais.
- [ ] Aplicar sugestão explicitamente substitui os movimentos e permite cancelar antes de perder a edição.
- [ ] Sair da aba, consultar movimentos e voltar conserva nome/configuração não salva.

**Testes necessários:** Unitários das transições auto/manual; integração desmontar/remontar; E2E alternar abas/estilos e voltar de ficha completa.

#### UX-09 — Trocar um integrante exige excluí-lo antes de escolher o substituto (P2)

**Problema original/atual:** O caminho é remover → buscar → adicionar ao fim → reconfigurar; a configuração anterior fica descartada imediatamente.

**Consequência:** Explorar uma alternativa torna-se destrutivo antes de o usuário decidir; comparação exige memorizar a build anterior.

**Comportamento desejado:** Substituição transacional no slot selecionado e restauração do último membro removido.

**Implemente:** Adicionar “Substituir integrante” no editor do slot. Abrir seletor contextual mantendo o time intacto. Ao confirmar nova forma, criar Member vazio e somente então substituir no mesmo índice; nunca copiar golpes ilegais. Se houver rascunho de build compatível explicitamente escolhido, usar UX-04. Cancelar/Escape mantém time e foco. Remover pode manter o último Member e índice em estado temporário até próxima mutação, com ação persistente “Desfazer remoção” no contexto; se outro membro ocupar a vaga, não sobrescrever silenciosamente.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):209–215, 283–286, 325–345, 372–389; [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):127–130.

**Dependências:** UX-01/02 e UX-07; UX-06 facilita escolha.

**Casos extremos obrigatórios:** Seis slots; repetição manual permitida; remoção do selecionado; remoções sequenciais; jogo muda antes de desfazer; nova análise atrasada.

**Risco a prevenir:** Não transformar isto em drag-and-drop/reordenação global ou comparação automática complexa. A melhoria resolve a troca destrutiva observada.

**Critérios de aceitação:**

- [ ] Substituir mantém seis integrantes e o índice escolhido, sem alterar os outros cinco.
- [ ] Cancelar não altera membros, movimentos ou análise válida anterior.
- [ ] Desfazer recupera a configuração removida quando ainda aplicável.
- [ ] Foco volta ao slot/acionador e a análise corresponde à composição confirmada.

**Testes necessários:** Unitários das operações de slot; integração cancelamento e análise; E2E substituir time completo com mouse/teclado/touch.

#### UX-04 — A passagem da build para a equipe perde a configuração (P1)

**Problema original/atual:** A ação do hero adiciona somente formId e movimentos vazios. Builds salvas também não têm ação direta para uso no time; o gerador já transfere movimentos corretamente.

**Consequência:** O usuário repete quatro escolhas e configurações, podendo inserir uma build diferente da que acabou de avaliar.

**Comportamento desejado:** Oferecer “Adicionar esta build à equipe” na bancada, usando o Member exibido. O hero pode continuar adicionando apenas a espécie, deixando isso explícito.

**Implemente:** Adicionar ação contextual ao BuildWorkbench com o membro completo: formId, moves na ordem, itemId, abilityId e nature. Revalidar jogo e forma permanente. Se o time tiver seis, abrir escolha de slot para substituir com confirmação contextual e cancelamento. Não sobrescrever build existente de mesmo Pokémon sem escolha. Oferecer “Abrir construtor” após sucesso. Reutilizar a ação ao abrir build salva.

**Componentes/arquivos a inspecionar:** [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):117–133, 900–995; [src/components/team-pages.tsx](../../src/components/team-pages.tsx):518–522. BuildWorkbench não oferece ação de transferência.

**Dependências:** UX-01, UX-02, UX-07, UX-09 e correção UX-08 da ordem dos campos.

**Casos extremos obrigatórios:** Equipe cheia; mesma forma em mais de um slot manual; forma temporária analisável; um a três movimentos naturais; conta ausente; jogo diferente.

**Risco a prevenir:** Não reaproveitar movimentos entre jogos nem aplicar transformações ainda sem configuração; duplicação manual não deve ser proibida por regra inventada.

**Critérios de aceitação:**

- [ ] O integrante recebe exatamente os campos visíveis na bancada, sem inventar movimentos.
- [ ] Cancelar substituição não altera o time nem a build.
- [ ] Forma temporária permanece consultável, mas não é adicionada como membro permanente.
- [ ] Visitante consegue transferir ao rascunho; salvar na conta continua exigindo autenticação.

**Testes necessários:** Integração do payload Member; E2E com build manual, build salva, time cheio e três jogos. Comparar IDs e ordem, não só o nome do Pokémon.

#### UX-10 — Erros de importação ficam atrás do diálogo (P1)

**Problema original/atual:** O catch usa notify global, fora do top layer do dialog; a mensagem é a exceção de JSON.parse. Limite de 64 KB usa o mesmo toast. Validação de nome usa posteriormente regras distintas do salvamento.

**Consequência:** O usuário percebe que a importação não ocorreu, mas não recebe diagnóstico acessível no lugar da ação; pode repetir sem saber o que corrigir.

**Comportamento desejado:** Erro persistente em português dentro do modal, com foco e vínculo ao conteúdo inválido; rascunho intacto até conclusão válida.

**Implemente:** Criar importError local ao diálogo, role=alert, aria-describedby e aria-invalid no textarea quando pertinente. Traduzir erro de parse sem expor texto técnico ao usuário. Conferir envelope JSON exportado, tamanho, gameId, nome válido para salvar e array de membros antes de consultar legalidade. Suportar formato version:1 existente; não inferir versão nova. Divergência de jogo oferece cancelar ou abrir importação no jogo declarado através de UX-01, com confirmação da substituição do rascunho destino. Falha não fecha modal, não apaga texto e não altera time. File input deve ter rótulo.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):247–264, 411–453; [src/components/providers.tsx](../../src/components/providers.tsx):147–161; [src/lib/security.ts](../../src/lib/security.ts):43–49; [src/lib/validation.ts](../../src/lib/validation.ts):teamSchema.

**Dependências:** UX-01/02, mesmas regras Zod e limite de tamanho já adotados; sem relaxar validateMembers.

**Casos extremos obrigatórios:** JSON quebrado; arquivo >64 KB; jogo diferente; nome vazio; zero/sete integrantes; movimento inválido; falha de rede; cancelar após escolher arquivo.

**Risco a prevenir:** Não comunicar sucesso só porque a análise aceita array vazio; preservar compatibilidade com exportações existentes.

**Critérios de aceitação:**

- [ ] Erro aparece e é anunciado dentro do diálogo, sem depender de toast.
- [ ] Texto e time anterior permanecem intactos após parse/HTTP inválido.
- [ ] Arquivo exportado atual continua importando sem perda de ordem/configuração.
- [ ] Escape/cancelar restaura foco; importar equipe válida pede confirmação se substituir trabalho pendente.

**Testes necessários:** Unitários do envelope/parser e tradução; integração 400/503/arquivo grande; E2E teclado, import/export real de seis e falhas sem side effects.

#### UX-11 — Excluir equipe ou build é imediato e sem recuperação (P1)

**Problema original/atual:** Uma ação em ícone remove definitivamente o registro, e só depois aparece um toast de sucesso.

**Consequência:** Um clique acidental elimina estratégia salva. Ícones próximos a ações de abrir tornam o erro de intenção plausível; frequência real desconhecida.

**Comportamento desejado:** Confirmação explícita com nome e tipo do registro antes da exclusão, mantendo os endpoints atuais.

**Implemente:** Reutilizar dialog nativo com “Excluir equipe/build [nome]?” e consequência; foco inicial em Cancelar, botões nomeados, Escape cancela e restaura foco. Enviar DELETE apenas após confirmar, bloquear dupla submissão e manter erro no modal se falhar. Se o registro aberto para edição for excluído, desvincular ID e preservar conteúdo como rascunho/cópia, avisando que não atualizará registro removido. Não prometer desfazer sem suporte real.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):713–720, 759–767; [src/components/tools-pages.tsx](../../src/components/tools-pages.tsx):106–119; [src/app/api/hub/[...path]/route.ts](../../src/app/api/hub/[...path]/route.ts) (DELETE teams/builds); [prisma/schema.prisma](../../prisma/schema.prisma):315–368.

**Dependências:** UX-02; estados compartilhados com UX-10 e UX-18. Sem lixeira/schema novo nesta fase.

**Casos extremos obrigatórios:** Equipe/build em edição; 404 por já ter sido removida; 401; falha de rede; nome duplicado; duplo clique.

**Risco a prevenir:** Confirmação acrescenta um passo a uma ação rara e irreversível; não acrescentar confirmações a favoritos ou simples seleção.

**Critérios de aceitação:**

- [ ] Um clique no ícone abre confirmação sem enviar DELETE.
- [ ] Cancelar/Escape não altera a coleção.
- [ ] Confirmar envia uma única requisição e remove somente o registro nomeado.
- [ ] Falha preserva registro na UI e oferece repetir; edição não continua apontando para ID apagado.

**Testes necessários:** Integração de modal e métodos HTTP; E2E somente sobre registros sintéticos descartáveis em banco de teste; simular 404/401/503.

### Gerador automático

#### UX-12 — O gerador mostra resultado de critérios anteriores como se fosse atual (P1)

**Problema original/atual:** O resultado não guarda os critérios de origem na UI. Alterar estilo, DLC, etapa, tamanho, obrigatórios ou proibidos não o invalida; resposta em trânsito também pode retornar para critérios já alterados.

**Consequência:** O usuário edita ou salva um time que não atende ao pedido visível, incluindo restrições importantes como DLC ou Pokémon proibido.

**Comportamento desejado:** Todo resultado deve ter snapshot dos critérios e estado atual/desatualizado verificável.

**Implemente:** Guardar criteriaSnapshot e requestId por submissão. Ao mudar qualquer parâmetro funcional, marcar resultado desatualizado e bloquear transferência até nova geração; pode manter visualização identificada como resultado anterior. Invalidar respostas da versão antiga e oferecer cancelar processamento sem perder parâmetros. “Outra combinação” usa os critérios atualmente confirmados; reiniciar variant ao mudar critérios, manter determinismo para mesmos dados/entradas/variante.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):480–516 e handlers 546–608; só o efeito de game invalida resultado/requisição.

**Dependências:** Base de estados assíncronos; UX-13 e UX-15 devem invalidar resultado quando alterarem critérios.

**Casos extremos obrigatórios:** Mudar critérios durante processamento; voltar aos mesmos critérios; erro na nova geração; jogo muda; resposta fora de ordem; navegação para outra rota.

**Risco a prevenir:** Não recalcular automaticamente a cada tecla: geração custa processamento e a decisão de relaxar filtros continua do usuário.

**Critérios de aceitação:**

- [ ] Mudar 6 → 1 identifica o resultado anterior e impede abrir os seis como resultado atual.
- [ ] Alterar banned/DLC em trânsito impede aplicação da resposta antiga.
- [ ] Cancelar preserva parâmetros e não mostra sucesso de resposta abandonada.
- [ ] Nova geração concluída libera transferência somente com snapshot correspondente.

**Testes necessários:** Unitário de assinatura/revisões; integração com duas respostas fora de ordem; E2E alterar cada tipo de parâmetro e abrir no construtor.

#### UX-13 — Contradições de obrigatórios só são explicadas após gerar (P2)

**Problema original/atual:** O próprio formulário permite estado contraditório, apesar de o motor impedir a geração e separar required/banned por IDs.

**Consequência:** O usuário precisa descobrir qual escolha conflitou por tentativa e erro; tempo de processamento é gasto numa impossibilidade verificável.

**Comportamento desejado:** Conflitos visíveis junto ao parâmetro e prevenção de submissão, preservando as escolhas para correção.

**Implemente:** Derivar validações locais de tamanho e elegibilidade factual. Exibir “2 obrigatórios para 1 vaga” com ações “Aumentar para 2” e remover chip específico. Não apagar obrigatórios ao reduzir tamanho. Para DLC/progresso, identificar o Pokémon conflitante e o motivo conhecido; disponibilizar remoção ou ativação explícita da opção correspondente. Se etapa for desconhecida, explicar desconhecido e não dizer que é obtido tarde. Manter servidor como autoridade e mapear mensagens conhecidas para a mesma área. Não inventar Species Clause nova para montagem manual.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):569–608; [src/lib/validation.ts](../../src/lib/validation.ts):generatorSchema; [src/lib/engine.ts](../../src/lib/engine.ts):435–456.

**Dependências:** UX-06/07 e UX-12; dados `availability` existentes bastam para espécie, mas diagnóstico de etapas dos movimentos é separado em UX-14.

**Casos extremos obrigatórios:** required/banned com conflito importado/restaurado; formas da mesma espécie; jogo muda; tamanho reduzido; etapas desconhecidas; limite 100 proibidos.

**Risco a prevenir:** Não replicar o motor inteiro no cliente; validação local é só de contradições comprováveis e não promete existência de solução.

**Critérios de aceitação:**

- [ ] Gerar fica indisponível enquanto required.length > size, com motivo e correção acessíveis.
- [ ] Obrigatório incompatível é identificado por nome, sem desaparecer silenciosamente.
- [ ] Nenhuma opção de DLC/progresso é ativada sem ação do usuário.
- [ ] Servidor continua rejeitando combinações inválidas mesmo se a UI for contornada.

**Testes necessários:** Unitários de preflight de critérios; integração UI/motor; E2E dois obrigatórios/uma vaga, DLC e etapa desconhecida.

#### UX-14 — A recuperação do modo estrito sugere reduzir tamanho sem explicar a lacuna (P2)

**Problema original/atual:** A tela já informa progresso parcial; o erro não distingue ausência de etapas verificadas de equipe impossível por seleção do usuário.

**Consequência:** Iniciante pode repetir vários tamanhos e etapas sem obter resultado. A base limitada é legítima; o atrito é o diagnóstico insuficiente.

**Comportamento desejado:** Diagnóstico factual e recuperação explícita, sem ativar progresso ignorado automaticamente.

**Implemente:** Retornar motivo estruturado e contagens relevantes do domínio para o gerador: candidatos por disponibilidade, com movimentos elegíveis e motivo de obrigatório rejeitado quando identificável. Se zero por etapa desconhecida, dizer que não há dados verificados suficientes para garantir obtenção e que mudar tamanho pode não resolver. Oferecer “Permitir etapas desconhecidas e gerar” como ação explícita que marca a opção e dispara uma nova requisição. Preservar DLC, obrigatórios e demais filtros. Não chamar ausência de dados de indisponibilidade factual.

**Componentes/arquivos a inspecionar:** [src/lib/engine.ts](../../src/lib/engine.ts):257–278, 526–529; [src/components/team-pages.tsx](../../src/components/team-pages.tsx):636–705; docs/MOTOR.md (Geração) e docs/SETUP.md (limitações).

**Dependências:** UX-12/13; pode estender resposta de erro com campos opcionais sem alterar fórmulas ou schema. Não há contagem de progresso no health atual: não fabricá-la no cliente.

**Casos extremos obrigatórios:** Obrigatório conhecido mas seus movimentos desconhecidos; zero por banimentos; dados futuros completos; erro HTTP 500 não relacionado ao motor.

**Risco a prevenir:** Expor contagens não deve sugerir sucesso garantido de beam search nem substituir evidências de progresso.

**Critérios de aceitação:**

- [ ] Falha por etapa desconhecida recebe mensagem específica e ação voluntária.
- [ ] Opt-in não habilita DLC nem remove restrições.
- [ ] Com dados futuros de progresso, diagnóstico reflete o pool real e não texto fixo de “sempre indisponível”.

**Testes necessários:** Unitários de códigos de diagnóstico com fixtures de lacuna/filtros; integração API; E2E modo estrito → opt-in → equipe válida.

#### UX-15 — O gerador não acompanha o progresso salvo do jogo (P2)

**Problema original/atual:** A inicialização pode ocorrer antes de Personal chegar; a etapa fica na anterior/default e as preferências por jogo não são reaplicadas.

**Consequência:** O usuário precisa lembrar e repetir uma preferência que já salvou; os filtros visíveis podem não corresponder ao seu progresso.

**Comportamento desejado:** Inicializar cada jogo com sua etapa salva, preservando ajustes manuais feitos no gerador.

**Implemente:** Criar estado de critérios por jogo com flag de edição manual por campo. Aplicar stages[game] quando preferências carregarem e o campo ainda não foi tocado; fallback stage legado somente para o jogo principal correspondente. Ao trocar jogo, restaurar critérios daquele jogo ou sua preferência. Nunca sobrescrever uma edição local por resposta de /me atrasada. Deixar claro se a etapa foi ajustada só para a geração.

**Componentes/arquivos a inspecionar:** [src/components/team-pages.tsx](../../src/components/team-pages.tsx):467–469, 481–489; [src/components/account-page.tsx](../../src/components/account-page.tsx):42–49 e 173–178; [src/components/providers.tsx](../../src/components/providers.tsx):85–96.

**Dependências:** UX-12; aproveitar política de hidratação de UX-18.

**Casos extremos obrigatórios:** Visitante; preferência antiga stage sem stages; resposta lenta; usuário já editou; etapa fora do intervalo; sair/entrar em outra conta.

**Risco a prevenir:** Não aplicar legacy stage de Sword a Arceus por conveniência; política precisa ser explícita.

**Critérios de aceitação:**

- [ ] Com stages.za=3, primeira entrada não editada em Z-A mostra Pós-jogo.
- [ ] Editar etapa antes da resposta da sessão impede sobrescrita tardia.
- [ ] Trocar entre jogos restaura a etapa correspondente e invalida resultado antigo.

**Testes necessários:** Unitários de precedência salvo/local; integração /me atrasado; E2E perfil com etapas distintas em três jogos.

### Consulta, confiança e assistente

#### UX-17 — Busca de movimentos sem resultado parece falta de dados (P2)

**Problema original/atual:** A mesma mensagem é usada quando a base tem zero movimentos e quando os filtros eliminam todos os existentes; não há ação contextual para limpar filtros.

**Consequência:** O usuário atribui o vazio à curadoria e pode desistir em vez de corrigir a consulta.

**Comportamento desejado:** Distinguir zero na fonte de zero no recorte, mostrando a próxima ação correta.

**Implemente:** Se moves.length > 0 e list.length === 0, mostrar “Nenhum movimento corresponde aos filtros” e “Limpar filtros”, que reseta query/tipo/categoria/método e paginação. Quando moves.length === 0, manter aviso factual da cobertura. Mostrar contagem filtrada/total próxima à tabela e resetar página de carregamento ao mudar filtros para resultado previsível.

**Componentes/arquivos a inspecionar:** [src/components/pokemon-detail.tsx](../../src/components/pokemon-detail.tsx):536–567 e 703–709.

**Dependências:** UX-06 para normalização comum, sem exigir novo buscador de movimentos completo.

**Casos extremos obrigatórios:** Combinação tipo+categoria; lista original vazia; troca de jogo; paginação expandida; query só de espaços.

**Risco a prevenir:** Mensagens não devem afirmar que todos os movimentos são verificados só porque foram cadastrados; preservar flags de propriedades.

**Critérios de aceitação:**

- [ ] 79 movimentos com filtro sem correspondência não é apresentado como learnset ausente.
- [ ] Limpar filtros restaura os registros sem trocar jogo/Pokémon.
- [ ] Zero real da base continua explicitamente desconhecido e não inventa alternativas.

**Testes necessários:** Integração com 0 registros, N registros e 0 após filtro; E2E query e combinação de selects, contagens e limpar.

#### UX-19 — Fontes permanece “Consultando...” depois de uma falha (P2)

**Problema original/atual:** A exceção não finaliza estado de carregamento; ausência é representada como 0 fontes e nenhum controle tenta novamente.

**Consequência:** A página de confiança transmite status contraditório e oculta informação disponível por falha de outra consulta.

**Comportamento desejado:** Estados independentes e terminais para saúde/fontes, com recuperação localizada.

**Implemente:** Separar loading/error/data de cada recurso (Promise.allSettled ou consultas separadas). Após falha, exibir “Não foi possível consultar o estado” e contagem desconhecida como —, nunca zero factual. Conservar fonte já carregada e tabela estática de limites; oferecer Repetir para o recurso afetado. Usar status para carregamento e alert para falha. Evitar afirmar banco desconectado se foi só erro no cliente.

**Componentes/arquivos a inspecionar:** [src/components/tools-pages.tsx](../../src/components/tools-pages.tsx):647–696; efeito usa Promise.all sem estados separados nem retry.

**Dependências:** Pode reutilizar erro tipado de UX-18; sem mudar o conteúdo de DESIGN.md ou inventário factual.

**Casos extremos obrigatórios:** Só sources falha; só health falha; ambos; retry com sucesso; retorno fora de ordem; desmontagem.

**Risco a prevenir:** Separar requests pode mostrar dados com instantes diferentes; indicar último estado sem prometer snapshot transacional.

**Critérios de aceitação:**

- [ ] Depois de 503 não resta indicador “Consultando...” ativo.
- [ ] Sources 200 permanece visível se health falhar.
- [ ] Repetir recupera indicadores sem recarregar toda aplicação.

**Testes necessários:** Integração de quatro combinações de respostas; E2E 503 em health, depois sucesso, e erro em sources.

#### UX-20 — O assistente mistura contexto selecionado e relatório anterior e perde a anotação no erro (P2)

**Problema original/atual:** Mensagens não têm cabeçalho explícito de game/formId por relatório. A resposta menciona a espécie no texto, mas a mudança do seletor não separa contexto atual e anterior. O input é limpo antes do sucesso e não há retry dedicado.

**Consequência:** É fácil atribuir um relatório à seleção errada; falha custa redigitar a anotação. Histórico salvo pode acentuar a ambiguidade.

**Comportamento desejado:** Relatórios com origem explícita e operação recuperável, mantendo o modo determinístico.

**Implemente:** Registrar formId/gameId e anotação no snapshot de cada submissão; exibir nome e jogo no cabeçalho de cada relatório. Trocar seletor não deve relabelar mensagens antigas. Indicar “Contexto da próxima análise” e preservar conversa identificada, sem apagá-la automaticamente. Manter anotação até sucesso ou restaurá-la na falha, com “Tentar novamente” usando snapshot original. Se contexto mudou, informar qual será reprocessado; impedir resposta tardia de se passar pela seleção nova. Tratar HTTP/rede em português. Ao usar histórico legado sem metadados, sinalizar origem não registrada; não inventá-la. Atualizar histórico opt-in após gravação confirmada se o usuário precisar abri-lo na mesma sessão.

**Componentes/arquivos a inspecionar:** [src/components/tools-pages.tsx](../../src/components/tools-pages.tsx):505–546, 562, 572–576; API assistant guarda contexto em ChatMessage, mas Personal.conversations não o tipa/exibe.

**Dependências:** UX-06, UX-18 e revisão de respostas obsoletas de UX-12 como padrão. API já oferece contexto em mensagens; verificar projeção antes de ampliar contrato.

**Casos extremos obrigatórios:** Trocar Pokémon durante cálculo; abrir histórico de outro jogo; anotação vazia; histórico desativado; offline; resposta após desmontagem; legado sem contexto.

**Risco a prevenir:** Não transformar o problema em pedido de chat generativo. Nenhuma API de IA, chave ou custo é necessário.

**Critérios de aceitação:**

- [ ] Relatório de Lucario continua identificado como Lucario/Sword após selecionar Pikachu.
- [ ] Falha preserva anotação e oferece retry inequívoco sem duplicar relatório como sucesso.
- [ ] Resposta antiga não recebe o título do contexto novo.
- [ ] O sistema continua informando que anotação não é interpretada por LLM.

**Testes necessários:** Unitários de snapshots/retry; integração mudança de contexto/histórico; E2E Lucario → Pikachu, falha/retry e troca de jogo.

## D. Ordem de implementação

Implemente em fases pequenas e verificáveis, priorizando os P1. Não espere terminar tudo para verificar comportamento; cada fase deve passar seus cenários antes da seguinte.

1. **Fundação de estado:** UX-18 erro tipado/sessão, UX-02 envelope validado e migração, UX-01 contexto por jogo. Separe armazenamento de ações de tela. Escreva os testes de transição e propriedade antes de conectar fluxos. O estado de rascunho de conta e o de visitante devem ter política explícita; não migrar dados privados entre contas automaticamente.
2. **Integridade de criação/edição:** UX-03 nova equipe, UX-08 slots e UX-05 rascunho de build. Verifique POST vs PATCH e ausência de resets por refresh. UX-08 pode ser entregue isoladamente se o adaptador preservar o contrato.
3. **Seleção e continuidade:** UX-06 combobox/helper de busca, UX-07 elegibilidade, UX-09 substituir/restaurar, UX-04 transferir Member. Só disponibilize a transferência depois de suportar cancelamento e time cheio. UX-16 serialização de recorte/retorno pode ser feita após o helper de consulta.
4. **Erros e ações destrutivas:** UX-10 importação e UX-11 confirmação de exclusão. Podem antecipar-se ao combobox por seu alto impacto e escopo local; dependem apenas da base de rascunho/sessão e dos diálogos nativos. Não crie soft delete sem pedido.
5. **Geração previsível:** UX-12 snapshot/revisão de critérios, UX-13 contradições, UX-14 diagnóstico derivado do pool, UX-15 hidratação das preferências. As quatro alterações devem usar a mesma invalidação; não deixar ações liberadas sobre resultado antigo.
6. **Consulta e recuperação restante:** UX-17 vazio de filtro, UX-19 requests independentes e UX-20 contexto/retry do assistente. UX-17/19 são pequenas e podem antecipar-se sem bloquear outras fases; UX-20 reutiliza estados/erros compartilhados. Termine com as jornadas completas abaixo.

Não interpretar a ordem como obrigação de entregar todos os P2 antes de corrigir P1 local. Documente dependência que não puder ser resolvida sem alterar escopo ou dados.

## E. Requisitos de qualidade

**Arquitetura e dados.** Use funções puras para parse/serialize de URLs/envelopes/slots/assinaturas. Não derive autorização de sessionStorage. Toda gravação continua validada no servidor por jogo/forma/movimento/item/habilidade e usuário. Não modificar score, dados factuais ou alcance da base. Erros estruturados devem ter código estável e mensagem PT-BR, sem detalhes de SQL/stack. Não mapear falha de rede para vazio real.

**Assíncrono.** Toda operação associa resultado ao snapshot que a iniciou. Invalidar/abortar resposta antiga não é cancelar mutação já confirmada no servidor: não prometer rollback de gravação. Desabilitar dupla submissão enquanto pendente, preservar inputs quando falhar e distinguir gravação bem-sucedida de refresh falho. Análise da equipe deve indicar quando métricas correspondem à revisão anterior. Verificar remoção do último integrante sob latência antes de atribuir conformidade ao indicador.

**Acessibilidade.** Conservar navegação existente e validar [WCAG 2.2](https://www.w3.org/TR/WCAG22/) nos critérios funcionais afetados; combobox segue [APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Não substituir selects por controle que só funciona com mouse. Todo erro tem nome/associação/foco ou anúncio adequado. Dialog com nome, Escape/cancelar, foco inicial seguro, contenção e retorno ao acionador; erro de importação dentro do modal. Não usar title/hover como única explicação de restrição. Live regions não devem narrar toda a lista a cada tecla. Preservar skip link, idioma, abas e regiões de rolagem acessíveis. Fazer teste assistivo real antes de alegar conformidade, registrando o que não foi possível.

**Responsividade funcional.** Validar em 1440×1000, 768×1024 e 390×844, e 320px quando campos/modal forem afetados; temas claro/escuro e redução de movimento. Lista de sugestões deve caber no viewport com teclado virtual e manter opção ativa visível; toque não depende de hover. Tabelas podem rolar internamente, documento não. Não trocar a identidade visual para resolver reflow.

**Testes proporcionais.** Unitários devem cobrir transições e invariantes reais, não espelhar JSX. Integração cobre componentes controlados/API, 401/400/429/5xx, falhas de storage, solicitações fora de ordem, migração de envelope e domínio por jogo. E2E cobre persistência real com conta sintética, sessões isoladas, teclado e import/export atual. Simulações servem para falhas determinísticas; marcar claramente que não provam backend real. Não reutilizar credenciais do usuário. Remover fixtures criadas, nunca dados preexistentes. Não rodar testes que sobrescrevem capturas históricas sem redirecionar artefatos.

Comandos existentes a executar conforme a fase e ao fechar (inspecione scripts antes):

```powershell
.\pnpm.cmd run typecheck
.\pnpm.cmd run lint
.\pnpm.cmd run test
# Servidor parado antes de gerar Prisma/build no Windows.
.\pnpm.cmd run build
# Iniciar produção em ambiente local de teste e então:
.\pnpm.cmd run test:e2e
git diff --check
```

Não parar serviço do usuário sem identificar que pertence à sua execução. Se porta 3000 estiver ocupada, conferir instância e ambiente antes de testar. O helper local usa .local/postgres:54329 e não deve reconfigurar serviço global. Não imprimir .env/segredos. Não executar format global ou atualizar dados para uma correção de UX.

## F. Validação final obrigatória

1. Revise cada checkbox dos vinte IDs, incluindo casos extremos e preservação dos comportamentos corretos. Crie uma matriz `ID → alteração → teste → resultado → pendência`. Não marque concluído por compilar apenas.
2. Reproduza as seguintes jornadas de ponta a ponta: (a) buscar com filtros → ficha → editar build → transferir configuração → salvar; (b) montar em Sword → consultar outro jogo/forma → retomar rascunho; (c) gerar estrito → entender lacuna → opt-in → trocar critérios → gerar novamente → substituir em time cheio → salvar; (d) abrir equipe salva → editar → reload → atualizar o mesmo ID → iniciar Nova equipe e criar outro ID; (e) fraqueza → comparar alternativas → voltar ao slot e cancelar/confirmar substituição; (f) catálogo/favoritos página 2 → ficha → retorno com recorte; (g) importar JSON inválido → corrigir → validar → cancelar/substituir rascunho → exportar; (h) /me503 → repetir → recuperar coleção e /me401 → login sem conteúdo de conta anterior; (i) assistente Lucario→Pikachu com relatório identificado e retry sem perder anotação; (j) fontes com uma consulta falhando e outra preservada.
3. Valide persistência autenticada real em banco de teste e separação entre duas contas, além de rascunho de visitante. Não usar só fixture /me como evidência de salvamento.
4. Execute os testes relevantes e registre comandos, contagem real, falhas e ambiente. Build/E2E atuais podem escrever screenshots históricos: redirecione-os ao diretório de artefatos da implementação. Não somar resultados antigos aos atuais.
5. Inspecione desktop/mobile, teclado, modais, sugestões, foco e feedback de erro. Verifique leitor de tela e toque quando disponíveis. Marque limitações explicitamente; não afirmar teste em Safari/iOS por emulação Chromium.
6. Faça revisão crítica como iniciante (entende por que a ação não está disponível e como corrigir?) e avançado (configuração/teclado/liberdade sobreviveram?). Confirme que nenhuma automação relaxa restrições ou elimina decisão útil.
7. Confira diff: DESIGN.md intacto, nenhuma mudança estética oportunista, banco/motor/fonte preservados, sem dados de teste/segredos/temporários. Atualize só documentação operacional realmente necessária, sem reescrever o design system.
8. Entregue lista objetiva das mudanças por ID, testes e evidências, riscos remanescentes e pendências. Se uma aceitação não puder ser atendida, explique o bloqueio em vez de declará-la concluída. Não publicar ou executar etapa de deploy sem solicitação.

A auditoria registrou outros indícios, ainda sem reprodução suficiente: spinner após remover último membro durante análise, estado do comparador em navegação de links sucessivos, atualização do histórico opt-in, coleções volumosas e mensagens de validação autenticadas. Você pode investigá-los com testes; mudanças adicionais exigem evidência e decisão de escopo explícita. Não concluir implementação integral com itens omitidos silenciosamente.
