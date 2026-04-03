---
name: docker-no-local-npm
description: >-
  For docker-Scrape-Web-Page-To-Markdown, installs Node/npm dependencies only
  inside the Docker image (never npm install on the host); run Docker with sudo;
  write project documentation (README.md, PROJECT.md, etc.) in English. Use when
  editing package.json, Dockerfile, docs, running the app, debugging containers,
  or when the user mentions local node_modules, npm install, Docker, or doc
  language for this repo.
---

# docker-Scrape-Web-Page-To-Markdown

## Hard rules

1. **Do not install project dependencies on the host**  
   - Do not run or recommend `npm install`, `npm ci`, `yarn`, `pnpm install`, etc. in the project directory on the host.  
   - Runtime modules are installed by **`Dockerfile`** via **`npm install --omit=dev`** at **image build time** (under `/node_modules` in the image).  
   - Application code is mounted at `/app`; Node resolves packages from `/node_modules` above `/app`.

2. **Prefix Docker commands with `sudo`**  
   - Use `sudo docker …` and `sudo docker compose …` (including `build`, `up`, `run`, `exec`, `logs`, etc.).  
   - When the agent runs terminal commands for this project, **default to `sudo`**, unless the user explicitly says they are in the `docker` group and do not want `sudo`.

## Documentation language

- **README.md**, **PROJECT.md**, and other **repository-facing explanatory documentation** (top-level guides, architecture notes meant for contributors) must be written in **English**.  
- When creating or updating those files, use clear, conventional technical English (complete sentences, accurate commands and paths).  
- Chat replies to the user may follow the user’s language preference; **the repo docs stay English**.

## Workflow when changing dependencies

1. Edit **`package.json`** `dependencies` as needed.  
2. Rebuild the image: `sudo docker compose build app`  
3. Optional check:  
   `sudo docker compose run --rm app node -e "require('express');require('cheerio');require('turndown');console.log('deps ok')"`  
   (Same idea as `npm run docker:verify-deps`; add `sudo` if the script omits it.)

## Run and test

- Start: `sudo docker compose up --build` (or `npm start` if it wraps Compose; still use `sudo` when invoking Docker directly).  
- API smoke test: `scripts/self-test.sh` with `BASE_URL` pointing at the service; ensure the stack is up with `sudo docker compose up` first.

## Agent alignment

- If modules appear “missing” on the host, assume the **image was not rebuilt**—do not suggest host `npm install`.  
- Example Docker commands in answers or in docs should **include `sudo`** where this project expects it.  
- Any new or updated **project documentation** in the repo: **English only**, per the section above.
