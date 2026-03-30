# My TypeScript App

A REST API service built with Express and TypeScript.

## Setup

```bash
npm install
npm run dev
```

## Testing Coati Clone

This is a clean project with no AI agent config files installed. Use it to test fresh `coati clone` workflows:

```bash
# Clone a setup into this project
pnpm coati clone <owner>/<slug>

# Reset to clean state (removes all untracked files, restores originals)
pnpm reset
```

The `reset` script runs `git checkout -- .` and `git clean -fd .` to restore this directory to its committed state, removing any files added by a clone.
