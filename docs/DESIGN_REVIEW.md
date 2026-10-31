# Revisão visual anterior do Pokétactics

Registro histórico da identidade de 17/10/2026. O sistema atual está em [DESIGN.md](../DESIGN.md), com cobertura e validação Type Study em [type-study/REVIEW.md](type-study/REVIEW.md).

Revisão concluída em 17/10/2026. Tema escuro preservado, com destaque verde menta autorizado pelo usuário. A direção e os tokens estão em [DESIGN.md](../DESIGN.md).

## 1. Leitura e hierarquia

As capturas iniciais mostravam textos e controles muito pequenos, principalmente no celular. A interface agora usa corpo de 15px, descrições de 14px, metadados de 12px e campos móveis de 16px. Títulos, espaçamento e superfícies seguem um padrão compartilhado. Foram retiradas grades, círculos e etiquetas decorativas que disputavam atenção com os dados.

Evidências: [visão geral antes](design-review/before-dashboard.png), [visão geral depois](design-review/final-dashboard.png), [celular antes](design-review/before-mobile-dashboard.png), [celular depois](design-review/after-mobile-dashboard.png).

## 2. Navegação e acesso

Menu organizado em Explorar, Planejar e analisar e Sua coleção. A rota ativa tem indicação semântica. No celular, o menu contém o foco, impede a rolagem do fundo, fecha com Escape e devolve o foco ao botão de abertura. Busca, troca de jogo e tema continuam disponíveis. O tema claro foi preservado e conferido.

Evidências: [catálogo desktop](design-review/after-desktop-catalog.png), [catálogo celular](design-review/after-mobile-catalog.png).

## 3. Edição, builds e equipes

Campos e seletores passam a uma coluna no celular. As áreas de atributos, sugestões e análise mantêm seu conteúdo. O editor reutiliza o detalhe já carregado na bancada de builds, evitando uma consulta duplicada e a oscilação de carregamento. Slots vazios do construtor são botões funcionais; o novo atalho Adicionar Pokémon leva o foco ao seletor de integrantes.

Conferidos na interface: inclusão de Lucario e Tyranitar, sugestão de movimentos, análise de equipe, abertura e fechamento da importação, busca global por Tyranitar, abas de movimentos e builds e seleção de estilo ofensivo. O gerador criou seis integrantes incluindo Tyranitar e apresentou a análise com cobertura de 17/18 tipos. Não foi necessário salvar dados pessoais para esses testes.

Evidências: [builds](design-review/after-desktop-builds.png), [build de Tyranitar no celular](design-review/after-mobile-tyranitar-build.png), [construtor](design-review/after-desktop-teams.png), [gerador](design-review/after-desktop-generator.png).

## 4. Dados, tabelas e comparação

Tabelas têm regiões próprias de rolagem, acessíveis por teclado. Textos longos da página de fontes quebram linha. O comparador mantém atributos, gráfico e efetividade defensiva; Tyranitar e Lucario foram selecionados e seus resultados conferidos. As cores dos tipos e os avisos de cobertura continuam presentes.

Evidências: [comparador](design-review/after-desktop-compare.png), [fontes](design-review/after-desktop-sources.png), [fontes no celular](design-review/after-mobile-sources.png).

## 5. Perfil e estados sem conteúdo

Login, cadastro, favoritos e equipes salvas receberam a mesma base visual. As abas Entrar e Criar conta foram conferidas sem submeter credenciais. Estados de visitante e avisos continuam explicando como acessar a persistência pessoal. Fluxos autenticados de gravação não foram reexecutados nesta revisão visual.

Evidências: [perfil](design-review/after-desktop-profile.png), [favoritos](design-review/after-mobile-favorites.png), [equipes salvas](design-review/after-mobile-saved.png).

## 6. Validação e limites

- 14 telas conferidas em 1440×1000, 768×1024 e 390×844: visão geral, Pokédex, analisador, builds, construtor, gerador, comparador, tiers, assistente, equipes salvas, favoritos, perfil, fontes e detalhe do Tyranitar. Nenhuma apresentou rolagem horizontal do documento; tabelas e a faixa de destaques mantêm rolagem interna intencional. [Medições](design-review/responsive-checks.json).
- Build de produção com `next build`: aprovado, incluindo verificação TypeScript.
- ESLint em `src/components` e `src/app`: aprovado.
- Detector visual manual do Impeccable: nenhuma ocorrência. [Resultado](design-review/detector.json).
- As capturas representam o aplicativo local com PostgreSQL conectado. Regras, dados e cálculos dos jogos foram preservados. Esta revisão não implementa simulação de batalha nem amplia a cobertura de mecânicas pendentes, que continuam descritas na página Fontes.

As verificações no navegador foram feitas pela interface do aplicativo. Não houve publicação externa nem criação de contas.
