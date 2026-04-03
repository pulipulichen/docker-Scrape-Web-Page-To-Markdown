# docker-Scrape-Web-Page-To-Markdown

A Dockerized web scraping service: it loads and renders pages with Puppeteer, extracts main content using configurable Cheerio selector rules, converts the result to Markdown, and exposes it over an HTTP API. Conceptually similar to reader-mode / article extractors such as [Mercury Parser](https://github.com/postlight/mercury-parser).

For architecture and module roles, see [PROJECT.md](PROJECT.md).

## Prerequisites

- Docker installed, with **`sudo docker`** and **`sudo docker compose`** as the normal way to run commands (the shell scripts in this repo assume that).
- **Do not** run `npm install` in the project directory on the host. Runtime dependencies are installed **only when building the Docker image** (see `Dockerfile`).

## Quick start

From the repository root:

```bash
sudo docker compose up --build
```

By default the service listens on **`http://0.0.0.0:3000`** (on the host, usually **`http://127.0.0.1:3000`**). Change the port with the `PORT` environment variable (see `docker-compose.yml`).

Run in the background:

```bash
sudo docker compose up --build -d
```

Stop and remove containers:

```bash
sudo docker compose down
```

## Shell scripts in this repo

| File | Purpose |
|------|---------|
| [startup.sh](startup.sh) | Runs `docker compose down`, then `git pull`, then `up --build -d` in the background; after 5 seconds runs [logs.sh](logs.sh). Intended for deploy hosts (update + restart). |
| [logs.sh](logs.sh) | If Compose services are not up, runs `up -d`; then **`docker compose logs -f`**. |

Ensure they are executable: `chmod +x startup.sh logs.sh`.

## API usage

### Health check

```bash
curl -sS http://127.0.0.1:3000/health
```

Example response: `{"ok":true}`

### Parse a URL and get Markdown

**GET** (query parameter `url`):

```bash
curl -sS -G 'http://127.0.0.1:3000/api/parse' \
  --data-urlencode 'url=https://example.com'
```

**POST** (JSON body):

```bash
curl -sS -X POST 'http://127.0.0.1:3000/api/parse' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

On success, the JSON body includes:

- `url` — requested URL  
- `title` — page title (from rules and fallbacks)  
- `content` — main body as a **Markdown string**

Errors may return `400` (e.g. missing or invalid `url`) or `502` (fetch/extract failed; body includes `error` and `detail`).

Only **`http:`** and **`https:`** URLs are allowed.

## Self-test (curl)

With the service running, from the repository root:

```bash
BASE_URL=http://127.0.0.1:3000 bash scripts/self-test.sh
```

Or, if the port matches:

```bash
npm run test:curl
```

Set `BASE_URL` for a remote host or another port, e.g. `BASE_URL=http://your-host:3000`.

## Extraction rules (per domain)

Rule files live under **`app/rules/`**:

- **`default.json`** — global defaults (required).  
- **`{hostname}.json`** — overrides for that hostname, e.g. `blog.pulipuli.info.json`. The file name (without `.json`) is the match key; subdomains of that domain also match (e.g. with `example.com.json`, `www.example.com` uses that rule).

After editing JSON, **restart the container** so rules reload (they are read once at process startup).

For field meanings and merge semantics, see the “Rule files (`app/rules/`)” section in [PROJECT.md](PROJECT.md).

## After changing npm dependencies

If you change **`dependencies`** in the root **`package.json`**:

```bash
sudo docker compose build app
sudo docker compose up -d
```

Optional: verify modules load inside the image (after a successful build):

```bash
npm run docker:verify-deps
```

If you must use `sudo` for Docker but the npm script does not include it, run:

```bash
sudo docker compose build app && sudo docker compose run --rm app node -e "require('express');require('cheerio');require('turndown');console.log('deps ok')"
```

## Shell inside the container

```bash
sudo docker compose run --rm app bash
```

The app entrypoint is **`node /app/index.js`** (source is bind-mounted from `./app` to `/app`).

## Other `package.json` scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Same as `docker compose up --build` (foreground). Add `sudo` manually if needed. |
| `npm run d0.build` | `docker compose build` |
| `npm run d1.crawl.bash` | Interactive shell in the `app` service |
| `npm run d2.crawl.up` | One-off `node /app/index.js` in the container |

## License

See [LICENSE](LICENSE).
