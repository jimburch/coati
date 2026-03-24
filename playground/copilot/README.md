# GitHub Copilot Playground

A test environment for the Magpie CLI that simulates a real TypeScript project with a full GitHub Copilot configuration.

## Purpose

This playground is used to test Magpie's `init` and `clone` commands against a realistic project structure. It represents how a team would configure GitHub Copilot across all its supported configuration surfaces.

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js project manifest (TypeScript + Express) |
| `.github/copilot-instructions.md` | Project-level Copilot instructions — coding conventions, architecture, testing patterns, preferred libraries |
| `.github/copilot/instructions.md` | Extended code generation instructions — naming conventions, error handling patterns, import ordering, documentation standards |
| `.github/copilot/mcp.json` | MCP (Model Context Protocol) server configuration — filesystem and fetch servers |
| `.github/copilot/prompts/review.md` | Reusable prompt for structured code reviews with severity ratings |
| `.github/copilot/prompts/test-generation.md` | Reusable prompt for generating comprehensive Vitest test suites |
| `.github/copilot/prompts/refactor.md` | Reusable prompt for safe code refactoring with before/after output |
| `.github/copilot/agents.json` | Custom agent definitions — reviewer, architect, migrator, debugger |
| `.github/copilot/firewall.json` | Network access rules restricting the coding agent to npm registry and GitHub API |
| `.github/copilot/setup.sh` | Environment setup script for the Copilot coding agent (installs deps, runs checks) |
| `.vscode/settings.json` | VS Code workspace settings referencing Copilot instruction files and editor preferences |

## File Tree

```
copilot/
├── package.json
├── README.md
├── .github/
│   ├── copilot-instructions.md
│   └── copilot/
│       ├── instructions.md
│       ├── mcp.json
│       ├── agents.json
│       ├── firewall.json
│       ├── setup.sh
│       └── prompts/
│           ├── review.md
│           ├── test-generation.md
│           └── refactor.md
└── .vscode/
    └── settings.json
```

## Usage with Magpie

```bash
# Initialize a Magpie setup from this directory
cd playground/copilot
magpie init

# Clone this setup into another project
magpie clone <username>/copilot-setup --target /path/to/project
```
