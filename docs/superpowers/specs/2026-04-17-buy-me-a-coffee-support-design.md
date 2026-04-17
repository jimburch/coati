# Buy Me a Coffee Support — Design

**Date:** 2026-04-17
**Status:** Draft
**Author:** Jim Burch

## Summary

Add a non-intrusive way for users to financially support Coati via [Buy Me a Coffee](https://buymeacoffee.com/jimburch). The support surface appears on the web app (footer link + dedicated `/support` page) and on the GitHub repo (native `Sponsor` button via `FUNDING.yml`, plus README badge and section).

## Goals

- Give interested users an obvious-but-unobtrusive path to support the project.
- Frame paying as one of several ways to help — never the only one.
- Zero impact on the core product experience: no popups, no banners, no interstitials.
- Single source of truth for the BMC URL so it can be updated in one place.

## Non-Goals

- No recurring subscriptions, tiers, or sponsor perks.
- No per-user sponsor attribution on profiles.
- No CLI surface (`coati` terminal tool) for support links.
- No analytics beyond standard Mixpanel pageviews already applied globally.
- No login/auth coupling — the support page is fully public and static.

## Scope

Three deliverables:

1. **New web page** `/support` — static content, SSR-enabled, public.
2. **Footer link** — add "Support" to the existing nav row in `Footer.svelte`.
3. **GitHub surfaces** — `.github/FUNDING.yml`, README top badge, README "Support" section.

Out of scope: schema changes, API routes, auth coupling, CLI changes.

## Design

### Constant — single source of truth

New file: `src/lib/config/support.ts`

```typescript
export const BMC_URL = 'https://buymeacoffee.com/jimburch';
export const BMC_HANDLE = 'jimburch';
export const GITHUB_REPO_URL = 'https://github.com/jimburch/coati';
```

All references to the BMC URL in Svelte components use `BMC_URL` from this module. The GitHub repo URL is already referenced in the footer; consolidating it here is a small targeted cleanup that serves this work.

### `/support` page

Route: `src/routes/(public)/support/+page.svelte`

- SSR enabled (inherits from the `(public)` layout group).
- No `+page.server.ts` needed — content is fully static.
- Svelte `<svelte:head>` sets `<title>Support Coati</title>` and a meta description for SEO/social.

Content structure (single column, `max-w-2xl` centered, standard page padding):

1. **Heading** — "Support Coati"
2. **Intro paragraph** — "Coati is free and open source. If it's useful to you, here are some ways to help it keep going."
3. **Primary action card** — "☕ Buy me a coffee"
   - Short description: one-time, goes toward hosting + domain.
   - Button: styled with shadcn-svelte `Button` component, `variant="default"`, links to `BMC_URL` with `target="_blank"` and `rel="noopener noreferrer"`.
4. **"Other ways to help" section** — plain list of links, using emoji inline as shown (no lucide-svelte icons, to keep the page dependency-free):
   - ⭐ Star the repo on GitHub → `GITHUB_REPO_URL`
   - 📣 Share a setup you've built → `/new`
   - 🐞 Report a bug or request a feature → `${GITHUB_REPO_URL}/issues/new`
   - 🤝 Contribute on GitHub → `GITHUB_REPO_URL`

All external links open in a new tab with `rel="noopener noreferrer"`.

### Footer link

File: `src/lib/components/Footer.svelte`

Add `<a href="/support" class="hover:text-foreground transition-colors">Support</a>` between the "How to use Coati" and "Privacy" links. Same styling as surrounding siblings — plain text, no icon.

### `.github/FUNDING.yml`

New file:

```yaml
buy_me_a_coffee: jimburch
```

This gives the GitHub repo a native "♥ Sponsor" button at the top of the page and a sponsor link in the sidebar.

### README.md changes

**Top badge** (added to the badge row at the top, after the License badge):

```markdown
[![Buy Me a Coffee](https://img.shields.io/badge/support-buy%20me%20a%20coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jimburch)
```

**Support section** (inserted directly above the `## License` section at the bottom):

```markdown
## Support

Coati is free and open source. If it's useful to you, you can support development at [buymeacoffee.com/jimburch](https://buymeacoffee.com/jimburch), [star the repo](https://github.com/jimburch/coati), or share a setup you've built. See [coati.sh/support](https://coati.sh/support) for more ways to help.
```

## Testing

### Unit test

File: `src/routes/(public)/support/+page.svelte.test.ts`

- Renders the page.
- Asserts the BMC link has `href === BMC_URL`, `target === '_blank'`, `rel === 'noopener noreferrer'`.
- Asserts the four "Other ways to help" links render with their expected hrefs.

### E2E test

File: `src/routes/(public)/support/+page.svelte.e2e.ts` (runs desktop + mobile per `playwright.config.ts`).

- Navigate to `/support` → heading visible, primary BMC button visible.
- Click BMC button → asserts `target="_blank"` and correct `href` (does not follow the link).
- From the home page, click the footer "Support" link → lands on `/support`.

### Visual verification

Per `CLAUDE.md` UI workflow, capture screenshots after implementation:

- `screenshots/support-page-desktop.png` (1280x720)
- `screenshots/support-page-mobile.png` (430x932)

Review both visually for layout, spacing, and button prominence before finalizing.

## Rollout

Single PR. No migration, no feature flag. Once merged and deployed, the footer link appears for everyone and the repo gains the Sponsor button.

## Open Questions

None.
