# Guia de Publicação (GitHub Pages) e PWABuilder Studio

Este projeto está pronto para export estático (Next.js) e publicação no GitHub Pages. O PWABuilder Studio pode validar seu PWA e ajudar no empacotamento.

## 1) Abrir a pasta correta no VSCode

Abra a raiz do repositório `geo-flight-planner-camp` no VSCode (não apenas `src/`). O PWABuilder procura `public/manifest.webmanifest` e `public/sw.js` na raiz.

## 2) Validar no PWABuilder Studio

Painel “WEB MANIFEST”
- Clique em “I have a Web Manifest” e selecione `public/manifest.webmanifest`.

Painel “SERVICE WORKER”
- Clique em “I have a Service Worker” e selecione `public/sw.js`.

Checklist deve marcar Is a PWA / Web Manifest / Service Worker como verdadeiros.

## 3) Publicar no GitHub Pages (automático via Actions)

Já incluímos um workflow em `.github/workflows/pages.yml` que:
- Executa `npm ci`, `npm run export` e publica a pasta `out/` no GitHub Pages.
- Ajusta `basePath`/`assetPrefix` automaticamente para `/<repo>` usando `NEXT_PUBLIC_BASE_PATH`.

Passos:
1. Crie o repositório no GitHub (ou conecte um existente) e suba o código.
2. Faça push na branch `main` (ou `master`).
3. Acesse a aba “Actions” do repositório e aguarde o job “Deploy to GitHub Pages”.
4. A URL final aparecerá na etapa “Deploy to GitHub Pages”.

Se preferir publicar manualmente, rode `npm run export` localmente e suba o conteúdo de `out/` para o GitHub Pages.

## 4) Configurações importantes já aplicadas

next.config.ts
- `output: 'export'`, `images.unoptimized: true`.
- `basePath` e `assetPrefix` lidos de `NEXT_PUBLIC_BASE_PATH`.

manifest.webmanifest
- `start_url: "."` e ícones com caminho relativo `icons/...` (compatível com subpasta).

public/sw.js
- Detecta a base via `self.registration.scope` e prefixa as rotas do cache (`/offline.html`, `manifest.webmanifest`, etc.) — funciona em `/<repo>`.

## 5) Notas para o PWA

- Para testar offline: abra o site, use o botão “Salvar área para offline” no app (ele pré‑baixa tiles) e depois ative o modo Offline no DevTools.
- O Service Worker faz cache “best-effort”; algumas fontes de mapas podem ter CORS/limite de taxa.

## 6) Dúvidas comuns

“PWABuilder diz que não encontrou Manifest/Service Worker”
- Certifique‑se de que abriu a pasta raiz do repo no VSCode.
- Confirme que os arquivos estão em `public/manifest.webmanifest` e `public/sw.js`.

“Publicou mas os assets quebraram em /<repo>”
- O workflow define `NEXT_PUBLIC_BASE_PATH=/<repo>` durante o build. Verifique o log do job e se a branch deploy foi concluída.

“Quero usar domínio próprio”
- Desative `basePath` (não definir `NEXT_PUBLIC_BASE_PATH`) e configure o Pages para o domínio na aba “Pages” do repositório.

