---
name: Beta mode is for production only
description: PUBLIC_BETA_MODE is for the production launch, not the test/develop environment
type: project
---

The develop/test environment (develop.coati.sh) is not in beta mode — it's a personal testing environment. Beta mode (PUBLIC_BETA_MODE=true) will only be used on the production environment when it initially launches.

**Why:** The test env is for the developer's own testing, not a public beta. Beta mode implies user-facing restrictions/messaging that don't apply during development.

**How to apply:** Don't set PUBLIC_BETA_MODE in dev .env files or test environment configs. Only reference it in production environment setup.
