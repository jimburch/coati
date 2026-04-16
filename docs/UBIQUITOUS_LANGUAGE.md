# Ubiquitous Language

## Core entities

| Term          | Definition                                                                                    | Aliases to avoid                  |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| **Setup**     | A shareable, installable package of AI coding tool configuration — the platform's atomic unit | Workflow, config, repo, package   |
| **SetupFile** | An individual file within a setup, tagged by component type and optional agent scope          | Asset, attachment, config file    |
| **Manifest**  | The `coati.json` file that describes a setup's metadata, files, and install behavior          | Config, setup.json, package.json  |
| **User**      | A person with a Coati account, authenticated via GitHub OAuth                                 | Account, member, developer        |
| **Tag**       | A freeform lowercase label for categorizing and discovering setups                            | Label, keyword, topic             |
| **Agent**     | An AI coding tool that a setup targets (e.g., Claude Code, Cursor, Windsurf)                  | Tool, assistant, provider, editor |

## File taxonomy (ComponentType)

| Term             | Definition                                                                   | Aliases to avoid          |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------- |
| **Instruction**  | A CLAUDE.md-style file providing project context and guidelines              | Docs, readme, rules       |
| **Command**      | A reusable slash-command prompt template (`.claude/commands/*.md`)           | Action, macro             |
| **Skill**        | A richer command with YAML frontmatter and trigger conditions                | Plugin, extension         |
| **MCP Server**   | An external tool integration configured in settings (Model Context Protocol) | Integration, plugin       |
| **Hook**         | A shell command triggered on AI tool lifecycle events                        | Listener, callback, event |
| **Config**       | A generic configuration file (catch-all for non-specific types)              | Settings                  |
| **Setup Script** | A shell script intended to run during or after installation                  | Installer, post-install   |

## Setup lifecycle (verbs)

| Term        | Definition                                                                  | Aliases to avoid        |
| ----------- | --------------------------------------------------------------------------- | ----------------------- |
| **Publish** | Upload a setup from local disk to the Coati platform via CLI or API         | Upload, push, deploy    |
| **Clone**   | Download and install a setup's files to the local machine                   | Download, install, pull |
| **Star**    | Bookmark a setup as a favorite (one per user per setup, toggleable)         | Like, favorite, upvote  |
| **Follow**  | Subscribe to another user's activity (one per pair, toggleable)             | Subscribe, watch        |
| **Feature** | Admin action to editorially highlight a setup (sets `featuredAt` timestamp) | Promote, pin, spotlight |

## Placement and scope

| Term          | Definition                                                                                 | Aliases to avoid    |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| **Placement** | Where a setup's files install: **global** (`~/`) or **project** (`./`)                     | Scope, target, mode |
| **Global**    | Placement value meaning files install to the user's home directory, shared across projects | System-wide, user   |
| **Project**   | Placement value meaning files install to the current working directory                     | Local, repo-level   |

## Discovery and ranking

| Term         | Definition                                                                                 | Aliases to avoid      |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------- |
| **Trending** | Algorithmically ranked setups using time-decayed scoring of stars, clones, and comments    | Popular, hot          |
| **Featured** | Admin-curated setups highlighted on the platform (distinct from algorithmic trending)      | Promoted, editorial   |
| **Category** | A fixed classification for setups: web-dev, mobile, data-science, devops, systems, general | Type, genre           |
| **Explore**  | The browsable, filterable, sortable page for discovering setups                            | Browse, search, index |

## Social features

| Term         | Definition                                                                        | Aliases to avoid    |
| ------------ | --------------------------------------------------------------------------------- | ------------------- |
| **Comment**  | User-authored discussion on a setup, supporting single-level threading via parent | Reply, review, note |
| **Activity** | An audit-log entry recording a user action (star, clone, comment, follow, create) | Event, action, log  |
| **Feed**     | Chronological list of activities from users the current user follows              | Timeline, stream    |

## Authentication

| Term             | Definition                                                                         | Aliases to avoid               |
| ---------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| **Session**      | An authenticated connection, stored in the database and validated on every request | Token (ambiguous), login state |
| **Device Flow**  | OAuth 2.0 Device Authorization Grant used by the CLI for GitHub login              | CLI auth, device code login    |
| **Bearer Token** | The session token sent by the CLI as `Authorization: Bearer <token>`               | API key, access token          |

## Environment naming (canonical)

| Term           | Definition                                                                                               | Aliases to avoid            |
| -------------- | -------------------------------------------------------------------------------------------------------- | --------------------------- |
| **local**      | A developer's own machine, running the app against a local database and local environment variables      | dev, development, localhost |
| **test**       | Ephemeral environments spun up by CI/CD pipelines to run automated test suites; torn down after each run | ci, integration, automated  |
| **staging**    | A persistent environment that mirrors production configuration; used for pre-release verification and QA | preview, pre-prod, uat      |
| **production** | The live service at coati.sh serving real users; the only environment where real user data is stored     | prod, live, main            |

These four tiers are the only canonical environment names. All scripts, configuration files, environment variables, and documentation must use exactly these names.

## Moderation

| Term       | Definition                                                               | Aliases to avoid |
| ---------- | ------------------------------------------------------------------------ | ---------------- |
| **Report** | A user-submitted flag on a setup (malicious, spam, inappropriate, other) | Flag, complaint  |

## Identifiers

| Term              | Definition                                                                                | Aliases to avoid |
| ----------------- | ----------------------------------------------------------------------------------------- | ---------------- |
| **Slug**          | A URL-safe, lowercase, hyphen-separated identifier (used for usernames and setups)        | Handle, URL name |
| **Setup path**    | The `owner/slug` URL pattern that uniquely identifies a setup (e.g., `alice/my-workflow`) | URL, route       |
| **Search vector** | PostgreSQL `tsvector` column enabling full-text search on setup name and description      | Index, FTS field |

---

## Relationships

- A **User** owns zero or more **Setups**
- A **Setup** contains one or more **SetupFiles**, each tagged with a **ComponentType**
- A **Setup** has one **Manifest** (`coati.json`) that describes it
- A **Setup** is associated with one or more **Agents** (which AI tools it targets)
- A **Setup** has zero or more **Tags** for discovery
- A **Setup** has exactly one **Placement** (global or project)
- A **Setup** belongs to exactly one **Category** (optional but recommended)
- A **User** can **Star** a **Setup** exactly once
- A **User** can **Follow** another **User** exactly once
- A **Comment** belongs to one **Setup** and one **User**; a **Comment** may reply to one parent **Comment** (single-level threading only)
- An **Activity** records one action by one **User**, optionally referencing a **Setup**, target **User**, or **Comment**
- A **SetupFile** may be scoped to a specific **Agent** (only installed when that agent is detected during **Clone**)

---

## Example dialogue

> **Dev:** "When a user runs `coati clone alice/my-workflow`, what actually happens?"
>
> **Domain expert:** "The CLI fetches the **Setup** metadata and its **SetupFiles** from the API. It checks the **Placement** — if it's **global**, files go to `~/`; if **project**, they go to `./`. Before writing, it checks for conflicts with existing files."
>
> **Dev:** "What if the **Setup** targets multiple **Agents** — say Claude Code and Cursor?"
>
> **Domain expert:** "Each **SetupFile** can optionally declare an **Agent** scope. During **Clone**, the CLI detects which **Agents** are installed locally and only writes the relevant files. A file with no agent scope is always installed."
>
> **Dev:** "And how does the **Manifest** fit in?"
>
> **Domain expert:** "The **Manifest** is the `coati.json` file. On **Publish**, the CLI reads it to know what to upload. After **Clone**, the CLI writes clone-tracking metadata back into a local `coati.json` so we know where the **Setup** came from."
>
> **Dev:** "Is a **Clone** the same as a **Star**?"
>
> **Domain expert:** "No. A **Star** is a bookmark — it's just a social signal, like a GitHub star. A **Clone** actually installs the files. Both increment counters on the **Setup**, but they're independent actions."

---

## Flagged ambiguities

- **"Agent"** is overloaded. In the database and manifest it means an AI coding tool (Claude Code, Cursor). In casual discussion and some older docs, "tool" is used interchangeably. **Recommendation:** Always use **Agent** for AI coding tools; use **MCP Server** for external tool integrations.
- **"Tool"** appeared in early documentation (`"tool"` field in SETUP.md) to mean what is now called **Agent**. Code has been migrated to "agent" but stale docs may still say "tool." **Recommendation:** Update remaining docs; never use "tool" for this concept.
- **"Clone"** is used as both a verb ("clone a setup") and implicitly as a noun ("clone count"). This is generally clear from context but could confuse in logging. **Recommendation:** Use "clone" as a verb and "clone count" for the metric; avoid "a clone" as a noun referring to the installed copy.
- **"Post-install"** suggests a single command, but the field is actually an array of shell commands. **Recommendation:** Refer to "post-install commands" (plural) in docs and UI copy.
- **"Explore" vs "Search"** — the Explore page includes search functionality, and a separate search API exists. **Recommendation:** Use **Explore** for the browsable UI page; use **Search** for the full-text query operation within it.
- **"Version"** exists in the **Manifest** schema but is not persisted server-side. The platform stores only the current state of a **Setup** with no version history. **Recommendation:** Acknowledge this is a client-side-only field for MVP; do not imply version tracking exists on the platform.
