---
description: Check if the project is ready for deployment
arguments: []
---

# Deployment Readiness Check

Run through a comprehensive checklist to verify the project is ready to deploy.
Report each check as PASS, FAIL, or WARN with details.

## Checks to perform

### 1. Build
Run `npm run build` and verify it completes without errors.
- FAIL if the build has TypeScript errors
- WARN if there are TypeScript warnings (e.g., unused variables caught by tsc)

### 2. Tests
Run `npm run test` and verify all tests pass.
- FAIL if any test fails
- WARN if no tests exist at all

### 3. Lint
Run `npm run lint` and verify no errors.
- FAIL if there are lint errors
- WARN if there are only lint warnings

### 4. Type Safety Audit
Search the codebase for unsafe patterns:
- Any usage of `any` type (search for `: any`, `as any`, `<any>`)
- Any usage of `@ts-ignore` or `@ts-expect-error`
- Any usage of non-null assertions (`!.` or `!,`)
- WARN for each occurrence found, listing file and line number

### 5. Environment Variables
Check that all required environment variables are documented:
- Search for `process.env.` references in the source code
- Verify each one is listed in `.env.example` (if it exists)
- FAIL if env vars are used but no `.env.example` exists
- WARN if `.env.example` is missing entries

### 6. Dependencies
Check for obvious dependency issues:
- Verify `package-lock.json` exists and is up to date
- Check for any `devDependencies` imported in production source files
- WARN if lockfile is missing or outdated

### 7. Security Basics
Scan for common security issues:
- Hardcoded secrets, API keys, or tokens in source files
- `.env` files that are not gitignored
- Overly permissive CORS settings
- FAIL for hardcoded secrets, WARN for the rest

## Output Format

```
Deployment Readiness Report
===========================

Build .............. PASS
Tests .............. PASS
Lint ............... WARN (2 warnings)
Type Safety ........ WARN (1 instance of `as any` in src/utils/logger.ts:14)
Env Variables ...... PASS
Dependencies ....... PASS
Security ........... PASS

Overall: READY (with 2 warnings)
```

After the summary, provide details for any FAIL or WARN items with actionable
next steps. If everything passes, confirm the project is ready to deploy.
