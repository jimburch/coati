# /a11y-audit — Run axe against the Storybook dev server

Audits every story in the running Storybook for accessibility violations.

## Prerequisites

- Storybook running on `http://localhost:6006` (start with `pnpm storybook`)
- `@axe-core/playwright` installed (already in devDependencies)

## Steps

1. Check that Storybook is reachable. If not, ask the user to start it.
2. Use the `playwright` MCP server to:
   - Fetch the Storybook index (`http://localhost:6006/index.json`)
   - Enumerate every story
   - For each story, navigate to its iframe URL (`/iframe.html?id=<storyId>&viewMode=story`)
   - Inject `axe-core` and run `axe.run()`
3. Collect violations. Group by:
   - **Severity**: critical, serious, moderate, minor
   - **Rule ID**: `color-contrast`, `label`, `button-name`, etc.
4. For each violation:
   - List the story (title + name)
   - List the failing selector
   - Source file: traverse up from the story to its component (`$storyFile` → import of `./Component`)
   - Propose a concrete fix

## Output

```
Atlas UI a11y audit — 2026-04-23T12:00:00Z

Critical: 0
Serious: 2
  1. color-contrast
     Story: Actions/Button → Ghost
     Selector: button.bg-transparent.text-muted-foreground
     File: src/components/Button/Button.tsx:23
     Fix: ghost variant contrast is 3.8:1 on white — tighten to `text-foreground/80` for 4.8:1

  2. label
     Story: Forms/Input → Icon
     Selector: input[type="search"]
     File: src/components/Input/Input.tsx:41
     Fix: icon-only search input needs aria-label or a visually hidden label

Moderate: 1
Minor: 3
```

## Do not

- Do not fix violations automatically — the user decides which to accept (intentional demos of a11y failures are valid)
- Do not run against Chromatic baselines — use the live Storybook
