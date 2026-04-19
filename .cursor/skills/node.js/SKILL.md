---
name: node.js
description: >-
  For docker-Scrape-Web-Page-To-Markdown, never run Node.js on the host (no
  node, npm run, node --check, npx, etc. in the project workspace on the
  machine). Use Docker for any Node execution or verification. Use when editing
  or testing app JavaScript, running linters via Node, or when the user asks to
  avoid local Node.
---

# Node.js on this project (host vs Docker)

## Hard rule

**Do not run Node.js on the host** for this repository (the user’s local machine in the workspace path). That includes, without limitation:

- `node …` (including `node --check`, `node -e`, `node app/index.js`, etc.)
- `npm run …`, `npm test`, `npx …`
- Any script that invokes the host `node` binary against this project’s `app/` or `package.json`

Dependencies and the runtime environment are defined for the **Docker image** (see the **docker-no-local-npm** project skill). The host may not have the correct Node version, `node_modules` layout, or Chromium paths the app expects.

## What to do instead

1. **Run or verify Node inside Docker** (prefix with `sudo` per project convention unless the user opts out), for example:
   - `sudo docker compose run --rm app node --check /app/index.js`
   - `sudo docker compose run --rm app node -e "require('/app/puppet')"`
   - `sudo docker compose up --build` for a full stack run
2. If the user prefers **remote-only** verification, follow the **remote-server-testing** skill and do not rely on host or local Docker runs.

## Relationship to other skills

- **docker-no-local-npm**: no host `npm install`; Node modules and app execution belong in the image.
- **node.js (this skill)**: no host `node` / `npm run` / `npx` for this repo—use containerized Node or skip and let the user verify remotely.

When in doubt, use **`sudo docker compose run --rm app …`** for one-off Node commands instead of the host shell.
