# Deployment plan

Same workflow as hello-pip.

## Branches
- `main`: source of truth. Only changed through pull requests from `feat/*` and `fix/*` branches.
- `production`: compiled site only (the contents of `dist/`). Written by CI, never by hand. Hostinger serves this branch.

## Flow
1. Work on a `feat/...` or `fix/...` branch and open a PR.
2. CI (lint, content check, tests, build) runs on the PR; the Preview workflow serves the PR on GitHub Pages so it can be tested on a phone.
3. Merge to `main`. The `Promote to production` workflow runs automatically on every push to `main`: it builds, adds `.htaccess`, and force-publishes `dist/` to `production`.
4. Hostinger's Git integration pulls `production` via the repository webhook and the site updates with no manual step.
5. After each deploy, open the live site and check it for bugs; fix and redeploy.

## Why two branches
Hostinger checks out a branch as-is and has no build step, so the served branch must hold the compiled site. Source stays on `main`.

## One-time setup (later)
- Hostinger hPanel: Websites, Git, connect `mykolasmarkauskas/takeout-fox`, branch `production`, target folder of the chosen domain; enable auto-deploy (webhook).
- GitHub: Settings, Pages, Source = GitHub Actions (for PR previews).
- Workflows: copy `.github/workflows/{ci,preview,promote-production}.yml` from hello-pip, change the promote trigger to `push: branches: [main]`, and skip steps until package.json exists.
- Domain: choose and buy (open decision), then Cloudflare nameservers and Web Analytics, Search Console.
- Optional: protect `main` (require PR and passing CI).

## Release checklist
- Smoke test on a phone: cold load on 4G, play 3 runs, suspend and resume, rotate.
- `.htaccess`: long cache on hashed assets and glb/ogg, no-cache on HTML; serve .glb and .avif with the right MIME types.
- Legal pass: no real names, logos, quotes or lookalike characters.
