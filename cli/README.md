# Coati CLI

Command-line tool for cloning, publishing, and managing AI coding setups on [Coati](https://coati.sh).

## Prerequisites

- Node.js 18+
- pnpm

## Install dependencies

```bash
cd cli
pnpm install
```

## Running locally

The CLI defaults to the production API (`https://coati.sh/api/v1`). For local development, point it at your local SvelteKit dev server instead.

### 1. Start the web app

From the repo root:

```bash
pnpm dev
```

This starts the SvelteKit server on `http://localhost:5173`.

### 2. Run CLI commands with `--dev`

The `--dev` flag tells the CLI to use `http://localhost:5173/api/v1`:

```bash
npx tsx src/index.ts --dev login
npx tsx src/index.ts --dev clone owner/setup-name
npx tsx src/index.ts --dev publish
npx tsx src/index.ts --dev init
```

When `--dev` is active, you'll see a banner on stderr:

```
⚠ dev mode → http://localhost:5173/api/v1
```

### Alternative: `--api-base`

Point at any arbitrary URL (e.g. a different port or staging server):

```bash
npx tsx src/index.ts --api-base http://localhost:3000/api/v1 login
```

### Alternative: `MAGPIE_API_BASE` environment variable

Useful for shell aliases or CI scripts:

```bash
export MAGPIE_API_BASE=http://localhost:5173/api/v1
npx tsx src/index.ts login
```

### Precedence

When multiple overrides are set, the CLI resolves the API base in this order (first wins):

1. `--api-base <url>` flag
2. `--dev` flag
3. `MAGPIE_API_BASE` environment variable
4. `apiBase` in `~/.coati/config.json`
5. Hardcoded default (`https://coati.sh/api/v1`)

## Commands

| Command   | Description                                     |
| --------- | ----------------------------------------------- |
| `login`   | Authenticate via GitHub Device Flow             |
| `logout`  | Remove stored credentials                       |
| `clone`   | Clone and install a setup to your local machine |
| `init`    | Scaffold a `setup.json` manifest                |
| `publish` | Publish or update a setup from the current dir  |

Run `coati <command> --help` for command-specific options.

## Auth & config

Credentials are stored in `~/.coati/config.json` (mode `0600`). The same config file is used for both dev and production.

```bash
# Check current config
cat ~/.coati/config.json
```

## Tests

```bash
pnpm test
```

## Build

```bash
pnpm build
```

Outputs to `dist/`. The published npm package uses the built files via `bin/coati.js`.
