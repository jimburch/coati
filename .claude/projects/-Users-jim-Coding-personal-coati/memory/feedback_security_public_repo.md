---
name: Public repo security awareness
description: Repo is 100% public/open-source — all scripts, workflows, and configs must be hardened against abuse
type: feedback
---

All code in this repo is public and open source. Every script, workflow, and config file must be reviewed for security implications.

**Why:** Public repos can be forked and have workflows triggered by external contributors. Secrets, IPs, and credentials must never be hardcoded. Scripts must not be exploitable if run in unexpected contexts.

**How to apply:** When writing CI workflows, deploy scripts, or any infrastructure code: never hardcode secrets or IPs, validate inputs, use minimal permissions, and consider how a malicious fork/PR could abuse the code.
