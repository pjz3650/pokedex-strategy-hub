# Motor estratégico v1.1.0

O motor é uma heurística de campanha explicável, não um simulador de batalhas ou estimador calibrado de vitória. As notas não são métricas comunitárias e os coeficientes são escolhas editoriais documentadas, abertas a calibração. Nunca são exibidos resultados competitivos sem regulamento importado.

## Tipagem

Tabela completa de 18 tipos importada de `type_efficacy.csv`. Multiplica as relações dos dois tipos. Imunidade resulta em zero. Sword/Z-A usam 4 e 0,25 para dupla fraqueza/resistência; Arceus usa 2,5 e 0,4. STAB: 1,5 em Sword/Z-A, 1,25 em Arceus. Fontes de mecânicas e limites em FONTES.md.

Em Sword, quando a habilidade está selecionada e validada, há efeitos explícitos para Levitate, Water Absorb, Storm Drain, Dry Skin (imunidade Water somente), Volt Absorb, Lightning Rod, Motor Drive, Flash Fire, Sap Sipper e Thick Fat. Outros efeitos e interações não são simulados; em particular o componente Fire de Dry Skin e Wonder Guard não estão modelados. Nenhuma habilidade é aplicada em Arceus/Z-A. A tela geral mostra a defesa sem habilidade; o construtor considera a habilidade selecionada nos casos modelados.

## Valor de movimento

Para ataques com poder conhecido:

`valor = min(150, poder × afinidade × STAB × confiabilidade × recurso)`

- Afinidade = Attack ou Special Attack base dividido pelo maior dos dois. Não simula EVs, IVs, Nature, Effort Levels ou dano real.
- Sword e Arceus: confiabilidade = precisão/100 do próprio jogo; ausência de teste de precisão usa 1. Recurso = 1.
- Z-A: recurso = 8/cooldown base. Cooldown desconhecido resulta em zero, jamais usa PP. O fator 8 é apenas uma referência dimensional para comparar ataques. Confiabilidade não tenta converter precisão em taxa de acerto em tempo real.
- No catálogo e nas alternativas de build de Z-A, alcance e área são apresentados quando a fonte fornece esses campos. Eles ainda não afetam a recomendação: a nota não simula distância, área de acerto, tempo de execução ou reposicionamento em combate.
- Movimento com poder desconhecido ou variável recebe valor conservador 24 × afinidade × STAB; esse termo é somente uma prioridade editorial de seleção, não dano estimado.
- Status usa tabela explícita de utilidade. Recuperação e proteção favorecem estilos defensivos; Swords Dance/Nasty Plot têm valor reduzido quando a estatística favorecida é inadequada. Movimentos não modelados recebem valor baixo. Efeitos secundários, recuo, travas de movimento, setup completo e custos de turno não estão integralmente representados.

## Avaliação de conjunto

- Pressão = maior valor ofensivo / 1,5, limitada a 100.
- Cobertura = quantidade de tipos defensores monotipo atingidos super efetivamente /18 ×100. Não inclui frequências de alvos nem todas as combinações de dois tipos.
- Utilidade = melhor utilidade de status + 25% da segunda, limitada a 100.
- Confiabilidade = média de precisão em Sword ou completude verificada em outros jogos. É um componente de seleção, não taxa de acerto universal.
- Redundância = 4 pontos por ataque adicional do mesmo tipo. Não simula casos em que dois STABs do mesmo tipo servem a finalidades distintas.

| Estilo      | Pressão | Cobertura | Utilidade | Confiabilidade |
| ----------- | ------: | --------: | --------: | -------------: |
| Equilibrado |     45% |       25% |       20% |            10% |
| Ofensivo    |     60% |       23% |        7% |            10% |
| Defensivo   |     25% |       15% |       48% |            12% |
| Suporte     |     20% |       15% |       53% |            12% |

Nota = soma ponderada menos redundância, limitada a 0–100. Os componentes aparecem na interface. Não é garantido que cada estilo gere um conjunto diferente para todo Pokémon.

O seletor retém até dois candidatos por tipo ofensivo, status individual, limita a 26 movimentos e usa beam search de largura 20 por até quatro slots. Avalia o conjunto para que cobertura marginal e oportunidade de status influenciem a seleção. Movimentos de outro jogo e IDs não presentes no learnset são recusados no serviço de domínio. Z-A usa listas específicas do jogo e da forma; não herda learnsets de Sword.

## Equipes

Cada linha da matriz conta fraquezas, resistências e imunidades àquele tipo de ataque. A cobertura ofensiva é outra coluna, baseada nos movimentos selecionados. Uma fraqueza compartilhada sem nenhuma resistência/imunidade na equipe gera recomendação explicada.

Função estimada: parede quando HP × (Defense+Special Defense)>23000; atacante misto quando diferença entre ataques é menor que 15; senão físico/especial. Esses limiares são editoriais, não rótulos oficiais ou calibrados. Distribuição física/especial usa diferença maior que 14. Índice de composição: 40% cobertura, até 20 pontos por diversidade de três funções, 20% equilíbrio físico/especial, 20 pontos base, menos 5 por fraqueza compartilhada sem resposta. A nota não aumenta automaticamente só por selecionar Pokémon com BST alto, mas ainda é uma simplificação.

## Geração

1. Filtra jogo, formas permanentes, DLC, etapa, obrigatórios/proibidos.
2. Dados de espécie ou movimento com etapa desconhecida são excluídos, salvo opt-in explícito para ignorar progresso.
3. Pré-seleciona até 100 candidatos: preserva obrigatórios e até quatro representantes de cada tipo. Completa com qualidade base composta de 40% maior ataque, 40% bulk geométrico e 20% Speed.
4. Calcula builds legais de até quatro movimentos. Pokémon que possuem naturalmente menos movimentos são aceitos com seu conjunto real; ausência total de movimentos elegíveis causa exclusão.
5. Beam search largura 12, até seis slots, sem espécies repetidas. Objetivo = 65% índice coletivo +35% média das builds.
6. A variante seleciona uma solução entre as retidas. Mesmos dados/entradas/variante são determinísticos. Não há força bruta exponencial irrestrita.

Atualmente o mapeamento de etapas dos movimentos é desconhecido, e o de encontros cobre apenas iniciais e Route 1 de Sword. Assim, a geração estrita atualmente retorna insuficiência de dados, pois nenhum movimento tem etapa verificada. Ao ignorar progresso, a geração funciona com dados compatíveis com o jogo, mas não promete acessibilidade na campanha. Iniciais são escolhas alternativas no começo; não existe inventário que prove posse simultânea.

## Itens e transformações

Curadoria de Leftovers e Life Orb em Sword/Z-A, com localização e efeito textual por jogo. Recomendação compara permanência defensiva versus pressão com custo de HP. Etapas desconhecidas não entram em seleção estrita. Os efeitos dos itens não alteram o índice de movimentos nesta versão. Arceus rejeita held items. Mega Stones, transformação configurável, Dynamax/Max Moves e otimização de um único candidato Mega ainda são pendentes; formas temporárias não são aceitas como membros permanentes para evitar falsa legalidade.

## Rankings

Agregador aceita apenas fontes distintas com mesmo jogo, formato e recorte, peso positivo e tier S/A/B/C/D/F. Exige pelo menos duas fontes. Média ponderada ordinal não permite atribuir os ajustes do motor à fonte. Ainda não há evidências comunitárias importadas: a interface não fabrica um agregado.

A estimativa exibida em Tier Lists é separada e usa atributos: 45% maior ataque normalizado por 180, 35% sqrt(HP×média das defesas) normalizado por180, 20% Speed/180. Componentes limitados a100. Intervalos S80/A65/B50/C40/D30/F abaixo30. É apenas uma estimativa de atributos, com limiares editoriais explícitos.

## Expansão de cobertura — 16/10/2026

O motor 1.1.0 gera builds para todas as 1.522 formas disponíveis nos três jogos. Arceus usa categoria/tipo/poder/PP/precisão próprios do estilo normal; Z-A usa categoria/tipo/poder/cooldown do movimento normal. A precisão de Arceus entra na heurística. As propriedades antigas de Sword não são herdadas. Pokémon com um a três movimentos naturais, como Ditto e Unown, podem entrar no gerador sem receber golpes inventados. Transformações podem ser analisadas individualmente, mas ainda exigem a forma permanente para salvar equipes/builds. Etapas de campanha desconhecidas continuam excluídas no modo estrito.
