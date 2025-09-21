# Paleta de Cores do GeoFlightPlannerCamp

## Cores Principais

| Nome | Cor | Código HEX | Uso |
|------|-----|------------|-----|
| Azul Principal | ![#2563eb](https://placehold.co/15x15/2563eb/2563eb.png) | `#2563eb` | Cor primária do aplicativo, botões padrão |
| Azul Hover | ![#1d4ed8](https://placehold.co/15x15/1d4ed8/1d4ed8.png) | `#1d4ed8` | Hover para elementos azuis |
| Laranja de Destaque | ![#f97316](https://placehold.co/15x15/f97316/f97316.png) | `#f97316` | Cor de acento, botões selecionados |
| Laranja Hover | ![#ea580c](https://placehold.co/15x15/ea580c/ea580c.png) | `#ea580c` | Hover para elementos laranja |

## Cores de Estado para Botões

| Estado | Cor de Fundo | Cor do Texto | Código HEX (Fundo) | Código HEX (Texto) | Descrição |
|--------|--------------|--------------|--------------------|--------------------|-----------|
| Habilitado | Azul Principal | Branco | `#2563eb` | `#FFFFFF` | Cor padrão para botões ativos |
| Desabilitado | Cinza Médio | Cinza Escuro | `#9ca3af` | `#1f2937` | Cor para botões inativos |
| Selecionado | Laranja de Destaque | Branco | `#f97316` | `#FFFFFF` | Cor para botões selecionados/em uso |

## Variáveis CSS

As seguintes variáveis CSS estão definidas no `style.css` para uso consistente em toda a aplicação:

```css
:root {
  --primary-color: #2563eb; /* Azul principal mais vibrante */
  --primary-color-hover: #1d4ed8; /* Azul mais escuro para hover */
  --accent-color: #f97316; /* Laranja de destaque */
  --accent-color-hover: #ea580c; /* Laranja mais escuro para hover */
  --disabled-color: #9ca3af; /* Cinza mais escuro para estado desabilitado */
  --disabled-text-color: #4b5563; /* Cinza mais escuro para texto desabilitado */
  --button-enabled-bg: #2563eb; /* Fundo do botão habilitado (azul) */
  --button-enabled-text: #FFFFFF; /* Texto do botão habilitado */
  --button-disabled-bg: #9ca3af; /* Fundo do botão desabilitado mais visível */
  --button-disabled-text: #1f2937; /* Texto do botão desabilitado */
  --button-selected-bg: #f97316; /* Fundo do botão selecionado (laranja) */
  --button-selected-text: #FFFFFF; /* Texto do botão selecionado */
  --text-color-light: #FFFFFF;
  --text-color-dark: #111827;
}
```

## Diretrizes de Uso

1. **Botões Habilitados**: Devem usar o azul principal (`#2563eb`) como cor de fundo e texto branco para garantir contraste adequado.
2. **Botões Desabilitados**: Devem usar cinza médio (`#9ca3af`) como cor de fundo e cinza escuro (`#1f2937`) para o texto, indicando claramente que não são interativos.
3. **Botões Selecionados/Em Uso**: Devem usar o laranja de destaque (`#f97316`) para indicar claramente que estão ativos ou selecionados.
4. **Efeitos Hover**: Botões habilitados e selecionados devem escurecer ligeiramente ao passar o mouse, usando as cores de hover definidas, e incluir um leve efeito de elevação.
5. **Contraste**: Todas as combinações de cores foram escolhidas para garantir alto contraste e acessibilidade.

Esta paleta de cores combina azul vibrante e laranja intenso, criando uma interface visualmente atraente e coerente com a identidade do aplicativo. As cores mais saturadas e os efeitos visuais ajudam os botões a se destacarem claramente em relação ao fundo.