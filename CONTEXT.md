# Coati — Domain Context

## Core entities

| Term          | Definition                                                                                                                    | Aliases to avoid                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Setup**     | A shareable, installable package of AI coding tool configuration — the platform's atomic unit                                 | Workflow, config, repo, package   |
| **SetupFile** | An individual file within a setup, tagged by component type and optional agent scope                                          | Asset, attachment, config file    |
| **Setup Metadata** | The descriptive attributes of a **Setup** owned by the platform: name, description, category, tags, license, agents, post-install commands, prerequisites, visibility, team | Manifest, coati.json, config, settings |
| **Revision**  | The record a **Publish** creates: the set of file paths and their content hashes at that moment. Numbered sequentially per **Setup** (e.g. `alice/x@7`); only the latest keeps full file contents. Editing **Setup Metadata** never creates one, and publishing files identical to the latest **Revision** doesn't either, unless it comes from a new **Repo fingerprint** | Version, commit, snapshot, release |
| **Local copy** | A **Setup**'s files as they exist on one machine: its project files under one root directory, plus its global files under `~/` — whether the owner published from it or a user cloned into it. Each git worktree and each sandbox checkout is a separate **Local copy**, even when they share a **Repo fingerprint** | Working copy, install, checkout, "a clone" |
| **Repo fingerprint** | An opaque identifier of where a **Revision** was published from: its git remote plus its directory within that repo. It lets **Publish** recognize a **Local copy**'s **Setup** without anything stored on disk | Repo ID, link, binding, remote |
| **User**      | A person with a Coati account, authenticated via GitHub OAuth                                                                 | Account, member, developer        |
| **Team**      | A named group of users that can co-own setups and share private setups among its members (appears as `org` in URL paths only) | Organization, workspace, group    |
| **Tag**       | A freeform lowercase label for categorizing and discovering setups                                                            | Label, keyword, topic             |
| **Agent**     | An AI coding harness whose config files a **Setup** targets (e.g., Claude Code, Codex, Cursor), identified by the files it reads. The same harness running in a terminal, an IDE, a cloud sandbox or a background job is one **Agent** | Tool, assistant, provider, editor, IDE |

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

| Term        | Definition                                                                           | Aliases to avoid             |
| ----------- | ------------------------------------------------------------------------------------ | ---------------------------- |
| **Publish** | Upload a **Local copy**'s files to the Coati platform via CLI or API, creating a new **Revision** | Upload, push, deploy         |
| **Clone**   | Download and install a setup's files to the local machine                            | Download, install, pull      |
| **Star**    | Bookmark a setup as a favorite (one per user per setup, toggleable)                  | Like, favorite, upvote       |
| **Follow**  | Subscribe to another user's activity (one per pair, toggleable)                      | Subscribe, watch             |
| **Feature** | Admin action to editorially highlight a setup (sets `featuredAt` timestamp)          | Promote, pin, spotlight      |
| **Share**   | Grant a specific user direct access to a **private** setup owned by the current user | Invite-to-setup, give access |

## Visibility and access

| Term           | Definition                                                                                                                      | Aliases to avoid                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Visibility** | A setup's access mode: **public** (listed and cloneable by anyone) or **private** (hidden from discovery)                       | Privacy, mode, access            |
| **Public**     | Visibility value meaning the setup appears in Explore, search, and trending, and is cloneable by anyone                         | Open, listed                     |
| **Private**    | Visibility value meaning the setup is accessible only to its owner, its **Team** members, and users it has been **Shared** with | Hidden, unlisted, draft          |
| **SetupShare** | A direct per-user grant of access to a private setup, created by its owner                                                      | Share link, invite, access grant |

## Teams

| Term              | Definition                                                                                                                      | Aliases to avoid             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Team**          | A named group of users that owns a shared roster of setups (public or private)                                                  | Org, organization, workspace |
| **Team Owner**    | The single **User** who created a **Team**; has full control and cannot be removed                                              | Org admin, founder           |
| **Team Member**   | A **User** who belongs to a **Team**, holding either the **Admin** or **Member** role                                           | Participant, collaborator    |
| **Admin** (role)  | Team role that can manage members, invites, and team settings                                                                   | Maintainer, manager          |
| **Member** (role) | Default team role that can view and contribute to team setups but not manage the team                                           | Contributor, collaborator    |
| **Team Invite**   | A pending request for a **User** (or email address) to join a **Team**; has a status of pending, accepted, declined, or expired | Invitation link, join token  |
| **Team Setup**    | A **Setup** whose `teamId` is set — co-owned by the team and visible to all team members regardless of **Visibility**           | Shared setup, org setup      |

## Placement and scope

| Term          | Definition                                                                                 | Aliases to avoid    |
| ------------- | ------------------------------------------------------------------------------------------ | ------------------- |
| **Placement** | Where a **SetupFile** installs: **global** (under `~/`) or **project** (under the **Local copy**'s root). Set per file, not per **Setup**; a global file's path starts with `~/` | Scope, target, mode |
| **Global**    | Placement value meaning the file installs to the user's home directory, shared across projects | System-wide, user   |
| **Project**   | Placement value meaning the file installs relative to the **Local copy**'s root: the directory **Publish** or **Clone** runs in | Local, repo-level   |

## Discovery and ranking

| Term         | Definition                                                                                         | Aliases to avoid      |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------- |
| **Trending** | Algorithmically ranked **public** setups using time-decayed scoring of stars, clones, and comments | Popular, hot          |
| **Featured** | Admin-curated **public** setups highlighted on the platform (distinct from algorithmic trending)   | Promoted, editorial   |
| **Category** | A fixed classification for setups: web-dev, mobile, data-science, devops, systems, general         | Type, genre           |
| **Explore**  | The browsable, filterable, sortable page for discovering **public** setups                         | Browse, search, index |

## Social features

| Term         | Definition                                                                                      | Aliases to avoid    |
| ------------ | ----------------------------------------------------------------------------------------------- | ------------------- |
| **Comment**  | User-authored discussion on a setup, supporting single-level threading via parent               | Reply, review, note |
| **Activity** | An audit-log entry recording a user action (star, clone, comment, follow, create, team-related) | Event, action, log  |
| **Feed**     | Chronological list of activities from users the current user follows                            | Timeline, stream    |

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

| Term              | Definition                                                                                      | Aliases to avoid |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| **Slug**          | A URL-safe, lowercase, hyphen-separated identifier (used for usernames, team names, and setups) | Handle, URL name |
| **Setup path**    | The `owner/slug` URL pattern that uniquely identifies a setup (e.g., `alice/my-workflow`)       | URL, route       |
| **Search vector** | PostgreSQL `tsvector` column enabling full-text search on setup name and description            | Index, FTS field |

---

## Relationships

- A **User** owns zero or more **Setups**
- A **User** owns zero or more **Teams** (as **Team Owner**) and belongs to zero or more **Teams** (as **Team Member**)
- A **Team** has exactly one **Team Owner** and zero or more **Team Members**, each with a role of **Admin** or **Member**
- A **Team** issues zero or more **Team Invites**, each targeting either a **User** or an email address
- A **Setup** is owned by exactly one **User** and optionally belongs to one **Team**
- A **Setup** has exactly one **Visibility** (**public** or **private**)
- A **private** **Setup** is accessible to its owner, the members of its **Team** (if any), and any **User** named in a **SetupShare** for it
- A **Setup** contains one or more **SetupFiles**, each tagged with a **ComponentType**
- A **Setup** has one set of **Setup Metadata**, owned and edited on the platform (never stored in a file on disk)
- A **Setup** has one or more **Revisions**; each **Publish** that changes its files creates one
- A **Setup** may have many **Local copies**, identified by its **Setup path** — nothing on disk records which **Setup** a **Local copy** belongs to
- A **Revision** has zero or one **Repo fingerprint** (none when published from outside a git repo with a remote)
- A **Setup** is associated with one or more **Agents** (which AI tools it targets)
- A **Setup** has zero or more **Tags** for discovery
- Each **SetupFile** has exactly one **Placement** (global or project); a **Setup** may mix both
- A **Setup** belongs to exactly one **Category** (optional but recommended)
- A **User** can **Star** a **Setup** exactly once
- A **User** can **Follow** another **User** exactly once
- A **Comment** belongs to one **Setup** and one **User**; a **Comment** may reply to one parent **Comment** (single-level threading only)
- An **Activity** records one action by one **User**, optionally referencing a **Setup**, target **User**, **Comment**, or **Team**
- A **SetupFile** may be scoped to a specific **Agent** (only installed when that agent is detected during **Clone**)

---

## Example dialogue

> **Dev:** "If I make a **Setup** **private**, who can still **Clone** it?"
>
> **Domain expert:** "Only the owner, plus anyone explicitly granted access via a **SetupShare**. If the **Setup** also has a `teamId`, every **Team Member** of that **Team** can view and **Clone** it too."
>
> **Dev:** "So a **Team Setup** that's **private** is effectively shared across the whole **Team** without needing individual **SetupShares**?"
>
> **Domain expert:** "Right. **Team** membership grants access; **SetupShare** is the one-off mechanism for users outside the **Team**. A **public** **Team Setup** is just a normal discoverable **Setup** that happens to be co-owned by the **Team**."
>
> **Dev:** "How does someone join a **Team**?"
>
> **Domain expert:** "The **Team Owner** or an **Admin** creates a **Team Invite** — either targeting a specific **User** or an email address. When accepted, the invitee becomes a **Team Member** with the **Member** role by default."
>
> **Dev:** "And does a **private** **Setup** show up in **Trending** or **Explore**?"
>
> **Domain expert:** "Never. **Explore**, **Trending**, and **Featured** only surface **public** setups. Private setups are only reachable via direct URL by users with access."

---

## Flagged ambiguities

- **"Agent"** is overloaded. In the database and manifest it means an AI coding tool (Claude Code, Cursor). In casual discussion and some older docs, "tool" is used interchangeably. **Recommendation:** Always use **Agent** for AI coding tools; use **MCP Server** for external tool integrations.
- **"Tool"** appeared in early documentation (`"tool"` field in SETUP.md) to mean what is now called **Agent**. Code has been migrated to "agent" but stale docs may still say "tool." **Recommendation:** Update remaining docs; never use "tool" for this concept.
- **"Clone"** is used as both a verb ("clone a setup") and implicitly as a noun ("clone count"). This is generally clear from context but could confuse in logging. **Recommendation:** Use "clone" as a verb and "clone count" for the metric; avoid "a clone" as a noun referring to the installed copy.
- **"Post-install"** suggests a single command, but the field is actually an array of shell commands. **Recommendation:** Refer to "post-install commands" (plural) in docs and UI copy.
- **"Explore" vs "Search"** — the Explore page includes search functionality, and a separate search API exists. **Recommendation:** Use **Explore** for the browsable UI page; use **Search** for the full-text query operation within it.
- **"Version"** was a semver field in the retired `coati.json` and was never persisted. **Recommendation:** Say **Revision** for the platform-created record of each **Publish**; don't use "version" for setups.
- **"Manifest"** (`coati.json`) is retired. A **Setup**'s descriptive attributes are **Setup Metadata**, owned by the platform; its file list lives in its latest **Revision**. **Recommendation:** Never imply a setup needs a file on disk to describe it.
- **"Org" vs "Team"** — the URL path segment for team pages and team-owned setups uses `org` (e.g., `/org/<team-slug>`), so "org" and **Team** refer to the same entity in routing context. **Recommendation:** Use **Team** in all user-facing copy, docs, and code identifiers; treat `org` as a URL-only synonym and do not introduce it into UI labels or conversation.
- **"Share"** is overloaded. It can mean the generic social act of linking a setup ("share this URL"), or the specific **SetupShare** grant to a user for a **private** setup. **Recommendation:** Use **SetupShare** (or "share access") for the access-granting action; prefer "link" or "copy URL" for the social act.
- **"Admin"** is overloaded. At the platform level (`users.isAdmin`) it means a Coati site administrator; at the team level it is a **Team Member** role. **Recommendation:** Say **Platform Admin** when referring to `users.isAdmin`; use **Admin** alone only in a team context, or qualify as **Team Admin**.
- **"Member"** can refer to any authenticated **User** colloquially or specifically to the non-admin **Team Member** role. **Recommendation:** Use **User** for any Coati account holder; reserve **Member** for the team role.
- **"Private"** means access-restricted, not "draft" or "unpublished." A private setup is still a published, installable setup — just not discoverable. **Recommendation:** Don't equate **private** with "work in progress."
