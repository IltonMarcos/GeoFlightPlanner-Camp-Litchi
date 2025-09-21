# Orientações do Idealizador

Este Documento não é um documento acabado. Todo desenvolvedor/LLM que ajudar a desenvolver este aplicativo deve:

1.  Percebendo que há coisas no aplicativo que este documento não contempla, acrescentar/modificar/subtrair abaixo o que encontrar.
2.  Qualquer mudança que fizer deve ser devidamente documentada aqui.
3.  Usar preferencialmente linguagem técnica.

---

# **ATENÇÃO: Problema Crítico Conhecido**

**Funcionalidade:** `Seleção por Intervalo (Range)`

**Bug:** Após interagir com a ferramenta "Seleção por Intervalo" (localizada dentro de "Seleção por Atributos") e depois sair ou trocar para outra ferramenta, o conjunto de dados principal (`points`) é apagado, resultando no desaparecimento de todos os pontos do mapa.

**Status Atual:** **NÃO FUNCIONAL E PERIGOSO.** A causa raiz deste bug de corrupção de estado não foi identificada, mesmo após múltiplas tentativas de correção, incluindo uma refatoração arquitetural completa para isolar o estado de pré-visualização.

**Análise e Recomendação:** A suspeita principal recai sobre uma interação imprevista e complexa entre a gestão de estado da pré-visualização ao vivo e o hook `useHistory` que gere o estado principal e o histórico de undo/redo. As tentativas de correção, embora logicamente corretas, não resolveram o problema, indicando uma falha mais profunda.

**Recomendação:** A implementação atual da funcionalidade `Seleção por Intervalo` deve ser considerada instável e com erros. Recomenda-se que a funcionalidade seja **revertida ou completamente reescrita** com uma abordagem diferente que evite a complexidade de estado que está a causar o problema.

---

## **Tentativa de Correção - Não Funcionou**

**Funcionalidade:** `Seleção por Intervalo (Range)`

**Problema Identificado:** Após aplicar a seleção por intervalo, os pontos não estão sendo corretamente selecionados na interface, mesmo que os IDs estejam sendo calculados corretamente. O resultado é "0 Pontos Selecionados" sendo exibido na interface.

**Tentativas de Correção Realizadas:**
1. Verificação e correção da função `calculateIdsFromRange` no componente `RangeSelectorPanel` para garantir que os IDs corretos sejam calculados.
2. Revisão da função `applyBatchSelection` no hook `useFlightData` para garantir que o estado seja atualizado corretamente.
3. Ajustes na passagem de dados entre componentes para garantir que as informações fluam corretamente.
4. Atualização da lógica de renderização no componente `AttributesPanel` para exibir corretamente os pontos selecionados.
5. Adição de logs de depuração para rastrear o fluxo de dados entre componentes.

**Resultado:** Apesar das tentativas, o problema persiste. A funcionalidade ainda não está selecionando pontos corretamente.

**Análise Adicional:**
- A função `calculateIdsFromRange` está calculando os IDs corretamente com base no intervalo fornecido.
- A função `applyBatchSelection` está sendo chamada com os IDs corretos.
- O estado `selectedPoints` no hook `useFlightData` parece estar sendo atualizado, mas a interface não reflete essa seleção.
- Pode haver um problema com a sincronização entre o estado do hook `useFlightData` e o componente `AttributesPanel`.
- É possível que haja um problema com a forma como o estado é propagado entre componentes após a atualização.

**Próximos Passos:**
1. Investigar mais profundamente a passagem de dados entre o hook `useFlightData` e o componente `AttributesPanel`.
2. Verificar se há problemas com a atualização do estado no contexto do `useHistory`.
3. Analisar se há conflitos com outros estados que possam estar interferindo na seleção.

## Documento de Status e Arquitetura - GeoFlightPlannerCamp

Este documento serve como um guia rápido para desenvolvedores que dão continuidade ao desenvolvimento desta aplicação. O objetivo é fornecer uma compreensão da arquitetura, do fluxo de dados e das principais funcionalidades sem a necessidade de ler exaustivamente todo o código-fonte.

### 1. Visão Geral do Projeto

**GeoFlightPlannerCamp** é um editor geoespacial baseado na web, projetado para importar, visualizar, editar e exportar dados de pontos de voo (flight points). A aplicação permite a manipulação de dados tanto numa visualização 2D (mapa) como numa visualização 3D.

**Stack de Tecnologia Principal:**

- **Framework:** React (via Next.js)
- **Linguagem:** TypeScript
- **Mapa:** MapLibre GL JS com o wrapper `react-map-gl`
- **UI:** Componentes de `shadcn/ui` (baseados em Radix UI e Tailwind CSS)
- **Utilitários Geoespaciais:** `turf.js` para cálculos 2D

### 2. Arquitetura Principal

A aplicação segue uma arquitetura de componentes centralizada, com um hook customizado a gerir todo o estado.

- **`src/components/GeoEditor.tsx`**: Este é o componente principal da aplicação. Ele atua como um orquestrador, inicializando o hook de estado e conectando os sub-componentes (Toolbar, MapPanel, AttributePanel).

- **`src/hooks/useFlightData.ts`**: O coração da aplicação. Este hook customizado gere todo o estado da aplicação (pontos, seleções, modos de ferramenta, etc.). Ele utiliza um outro hook, `useHistory`, para fornecer a funcionalidade de desfazer/refazer (undo/redo). **Toda a lógica de negócio e manipulação de dados reside aqui.**

- **`src/components/MapPanel.tsx`**: Responsável por renderizar o mapa MapLibre. Ele recebe os dados e o estado da seleção do `GeoEditor` e traduz isso em camadas visuais no mapa (pontos 2D, modelos 3D, extrusões 3D, etc.).

- **`src/components/AttributePanel.tsx`**: O painel lateral que exibe informações sobre os pontos selecionados. É um componente dinâmico que muda o seu conteúdo com base no `selectionMode` atual (ex: mostrando propriedades de um ponto, ferramentas de edição em lote ou as ferramentas de seleção por atributo/intervalo).

- **`src/components/Toolbar.tsx`**: A barra de ferramentas superior. Contém os botões para todas as ferramentas e ações (importar/exportar, zoom, modos de seleção, etc.). É um componente "burro" que recebe o seu estado e funções de callback do `GeoEditor`.

### 3. Gestão de Estado (`useFlightData.ts`)

O fluxo de dados é unidirecional:

1.  O `useFlightData` expõe o estado atual (ex: `points`, `selectedPoints`) e funções para modificar esse estado (ex: `togglePointSelection`, `setSelectionMode`).
2.  O `GeoEditor` consome este hook.
3.  Os componentes da UI (como `Toolbar` ou `MapPanel`) recebem fatias do estado e as funções de que precisam como props.
4.  Ações do utilizador na UI (ex: um clique num botão) chamam essas funções.
5.  As funções atualizam o estado central dentro do `useFlightData`.
6.  O React propaga o novo estado para baixo, e a UI é re-renderizada de acordo.

### 4. Funcionalidades Implementadas

As seguintes funcionalidades foram recentemente implementadas e são cruciais para a aplicação.

#### Ferramentas de Seleção

Existem três ferramentas principais de seleção, que são complementadas por "modos cumulativos".

- **Seleção Individual, por Polígono e por Atributos:** Ferramentas padrão para selecionar pontos.
- **Modos Cumulativos (Adição `+` / Subtração `-`):**
  - Estes botões na Toolbar atuam como "teclas fixas" (sticky keys).
  - Quando o **Modo Adição** está ativo, qualquer nova seleção feita com qualquer uma das três ferramentas é **adicionada** à seleção já existente.
  - Quando o **Modo Subtração** está ativo, os pontos da nova seleção são **removidos** da seleção existente.
  - **Proteção da Seleção:** Enquanto um destes modos estiver ativo, a seleção atual fica protegida e não é limpa por cliques acidentais no mapa.

#### Visualização e Seleção 3D

- A visualização 3D é ativada através dos botões "Ativar Terreno" e "Altitude Relativa ao Terreno" na Toolbar.
- A **seleção de pontos individual funciona tanto em 2D como em 3D** (clicando nos cones ou barras 3D).
- O **zoom automático na seleção foi desativado no modo 3D** para evitar movimentos de câmara bruscos e desorientadores.

#### Ferramenta de Seleção por Intervalo (Range)

**AVISO: Esta funcionalidade está com um bug crítico que causa perda de dados e não deve ser usada.**

Como alternativa à complexa seleção por polígono em 3D, foi criada uma ferramenta de seleção em lote por intervalo.

- **Localização:** É uma sub-ferramenta dentro do painel "Seleção por Atributos", ativada pelo seletor "Por Intervalo".
- **Conceito:** Baseia-se na "ordem natural" dos pontos, ou seja, a sua ordem no ficheiro CSV original (o seu índice no array de dados).
- **Arquitetura (Refatorada):** A pré-visualização é gerida por um estado separado (`previewIds` em `GeoEditor.tsx`), que é passado para o `MapPanel.tsx` para renderização numa cor distinta. O `AttributePanel` calcula localmente os IDs da pré-visualização. Ao clicar em "Aplicar", uma função genérica `applyBatchSelection` no hook `useFlightData` é chamada para fundir a seleção de forma segura. Embora arquitetonicamente sólida, esta implementação ainda sofre do bug de perda de dados mencionado acima.
## Atualização — 19/09/2025: Problema Corrigido

- Funcionalidade: Seleção por Intervalo (Range).
- Status: Corrigido. Ao clicar em “Aplicar Intervalo”, agora os pontos do intervalo (ordem natural) são corretamente selecionados no mapa e o painel entra em “Edição em Lote”.
- Causa raiz: duas atualizações de estado em sequência no handler do botão (“aplicar seleção” e, logo após, “trocar modo”), que, combinadas com o `useHistory`, faziam a segunda atualização sobrescrever a primeira, apagando `selectedPoints`.
- Correção: em `components/AttributePanel.tsx` (RangeSelectorPanel.handleApply) removida a chamada redundante `onToolFinish('batch-edit')`. A seleção é aplicada apenas via `onApplyBatchSelection(ids)`, que já define `selectionMode = 'batch-edit'` e atualiza `selectedPoints`. Mantida a limpeza de pré‑visualização com `setPreviewIds(new Set())`.
- Validação: testado com diferentes intervalos e com modos “Adicionar”/“Subtrair” ativos; seleção permanece e a UI muda para “Edição em Lote” automaticamente.

Nota: As seções anteriores mantêm o histórico do problema antes da correção.

## Atualização — 19/09/2025: Aplicar Filtro Corrigido

- Funcionalidade: Seleção por Atributos — botão “Aplicar Filtro”.
- Status: Corrigido. Ao aplicar o filtro, os pontos que satisfazem os critérios são selecionados e a interface muda para “Edição em Lote”.
- Causa raiz: duas atualizações de estado em sequência (aplicar seleção e troca de modo) geravam colisão no `useHistory`, sobrescrevendo `selectedPoints`.
- Correção: em `components/AttributePanel.tsx` (AttributeSelectorPanel.handleApply) removida a chamada `onToolFinish('single')` para evitar troca de modo extra; e em `hooks/useFlightData.ts` (applyAttributeSelection) passamos a definir `selectionMode = 'batch-edit'` quando a seleção resultar em ao menos um ponto, garantindo a troca correta de modo.
- Validação: testado com operadores “entre”, “igual”, “diferente”, “in”, “>=” e “<=”; seleção respalda os modos “Adicionar/Subtrair” e UI alterna para a edição em lote.

## Atualização — 19/09/2025: Paleta de Cores Atualizada

- Funcionalidade: Sistema de cores do aplicativo.
- Status: Implementado. Definida uma paleta de cores coerente com azul e laranja para todo o aplicativo.
- Detalhes:
  - Criadas variáveis CSS para padronizar o uso de cores em toda a aplicação.
  - Definidas cores específicas para botões em diferentes estados (habilitado, desabilitado, selecionado).
  - Atualizado o componente Button.vue para usar as novas variáveis de cores.
  - Criado documento de referência em `docs/color-palette.md` com todas as cores e diretrizes de uso.
- Validação: Cores aplicadas consistentemente em todos os botões da interface, com contraste adequado para acessibilidade.

## Atualização — 19/09/2025: Cores Mais Vibrantes

- Funcionalidade: Aprimoramento do sistema de cores.
- Status: Implementado. Cores ajustadas para serem mais vibrantes e contrastantes.
- Detalhes:
  - Atualizadas as variáveis CSS com tons mais vibrantes de azul e laranja.
  - Ajustadas as cores para estado desabilitado para melhor visibilidade.
  - Modificado o fundo da aplicação para um tom mais escuro, aumentando o contraste.
  - Aprimorado o componente Button.vue com efeitos visuais (sombra, elevação) para maior destaque.
  - Atualizado o documento de paleta de cores com as novas especificações.
- Validação: Cores mais vibrantes destacam melhor os botões em relação ao fundo, melhorando a usabilidade.

## Atualização — 19/09/2025: Remoção do Modo Subtração

- Funcionalidade: Remoção do modo de seleção "Subtração" (Remover da Seleção).
- Status: Implementado. O modo de seleção por subtração foi completamente removido da aplicação.
- Detalhes:
  - Removido o botão de modo subtração da barra de ferramentas.
  - Removida toda a lógica de subtração do hook useFlightData.
  - Atualizados os componentes GeoEditor e Toolbar para refletir a remoção.
  - Simplificada a lógica de seleção para usar apenas o modo de adição ou seleção única.
  - Atualizados os documentos de especificação para refletir a mudança.
- Validação: Testado o funcionamento correto dos modos de seleção restantes (individual, polígono, atributos, adição).
