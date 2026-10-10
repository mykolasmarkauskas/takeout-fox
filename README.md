# Takeout Fox

3D lane-based endless runner. Marm the fox courier delivers food across the rooftops of Lanternfall.

## Workflow (same as hello-pip)
- Work happens on short-lived branches (`feat/...`, `fix/...`) and is merged to `main` by pull request, so each branch can be previewed and tested on a phone first.
- `main` is the deploy branch: Hostinger's GitHub integration will serve it automatically once connected. Never push broken builds to `main`.
- The Vite build output must be committed to the deployed branch or built by CI (see docs/DEPLOYMENT.md).

## Layout
- `src/` game code (Vite + TypeScript + Three.js)
- `content/` JSON content (lines, chunks, customers)
- `public/` static files
- `art/` source art from Gemini (`ART_<group>_<nn>_<short>.png`)
- `docs/` plans and checklists

Design doc: Claude Docs "Takeout Fox".
