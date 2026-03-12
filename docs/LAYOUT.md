# Layout Implementation

## Status: Complete

## What was built

- **Navbar** (`src/lib/components/Navbar.svelte`) — sticky header with logo, search bar, sign in / user menu
- **Footer** (`src/lib/components/Footer.svelte`) — copyright + nav links
- **SearchBar** (`src/lib/components/SearchBar.svelte`) — visual placeholder with search icon, hidden on mobile
- **UserMenu** (`src/lib/components/UserMenu.svelte`) — avatar dropdown with profile/new setup/settings/sign out
- **Root layout server** (`src/routes/+layout.server.ts`) — passes filtered user data to all pages
- **LayoutUser type** (`src/lib/types/index.ts`) — client-safe subset of User

## Decisions

- No icon library — inline SVGs
- No mobile hamburger menu — search hides on small screens, sign in/avatar stays visible
- No dark mode toggle yet — CSS variables support it, toggle is a separate task
- Used `buttonVariants` for the sign-in link (renders as `<a>` styled as button)
- DropdownMenuItem items wrapped in `<a>` tags for navigation (shadcn-svelte v1 doesn't support `href` prop on menu items)
- Added `WithElementRef`, `WithoutChild`, `WithoutChildrenOrChild` utility types to `$lib/utils.ts` (required by shadcn-svelte components)
