# Pokétactics — sistema visual

Interface de consulta e planejamento de equipes. O usuário pediu uma revisão moderna, mantendo as funcionalidades e o tema escuro; autorizou mudar a cor de destaque. Refinamento da identidade existente, sem alterar regras dos jogos, dados pessoais ou fluxos de autenticação.

## Direção

Grafite com verde menta, arte oficial dos Pokémon e cores semânticas dos 18 tipos. A cor de destaque indica ações e seleção; os tipos mantêm sua identidade. Superfícies sólidas, bordas discretas, sem brilho, grades decorativas ou animações de entrada em massa. Componentes de operação priorizam leitura e consistência.

## Tokens

Fonte de verdade: `src/app/globals.css`. Tema escuro: fundo #0e1317, painel #171f24, borda #2c3941, texto #ecf2f5, secundário #a3b0b8, destaque #85e0b1. Tema claro preservado com superfícies neutras e destaque #166e4d. Uma família de interface: Segoe UI com fallback Helvetica Neue/Arial. Pesos 400 e 600. Números de dados tabulares.

## Padrões

- Corpo de 15px; descrições de 14px; metadados de 12px; títulos principais de 32px no desktop e 27px no celular.
- Botões e campos principais de pelo menos 44px; ícones auxiliares de 36–40px. Controles móveis com fonte de 16px para evitar zoom involuntário.
- Raios: 12px para painéis, 8px para controles, 5px para indicadores pequenos. Sem sombras decorativas ou movimento no hover.
- Navegação fixa de 244px no desktop; menu modal abaixo de 960px, com fechamento por Escape, foco contido e bloqueio do scroll de fundo.
- Conteúdo em grade responsiva, sem reduzir tipografia para caber. Tabelas rolam dentro da sua própria região. Seletores e filtros se empilham quando necessário.
- Catálogo com quatro colunas no desktop e duas no celular. Destaques em faixa com rolagem horizontal. Comparador, edição e análise passam a uma coluna em telas menores.
- Foco visível, seleção de texto temática, estados de hover/desabilitado/erro/sucesso e redução de movimento preservados.

## Escopo preservado

Todas as rotas e ferramentas existentes, seleção de jogo, cálculos de builds, equipes, importação/exportação, catálogo e filtros, favoritos, coleções, perfil, login, histórico, fontes e avisos de cobertura. A revisão não apresenta mecânicas ainda pendentes como se estivessem implementadas.
