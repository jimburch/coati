---
name: testing
description: Testing conventions and patterns for Vitest unit and integration tests
---

# Testing Conventions

## Framework

We use **Vitest** for all tests. Configuration lives in `vitest.config.ts` at the project root.

## File Naming and Placement

- Colocate tests with source: `src/services/taskService.test.ts`
- Integration tests for routes: `src/routes/tasks.test.ts`
- Shared test utilities: `src/test/helpers.ts`

## Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskService } from "./taskService.js";
import * as db from "../db/client.js";

vi.mock("../db/client.js");

describe("TaskService.getById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the task when it exists", async () => {
    const mockTask = { id: "1", title: "Test task", done: false };
    vi.mocked(db.query).mockResolvedValueOnce([mockTask]);

    const result = await TaskService.getById("1");

    expect(result).toEqual(mockTask);
    expect(db.query).toHaveBeenCalledWith("tasks", { id: "1" });
  });

  it("returns null when the task does not exist", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result = await TaskService.getById("nonexistent");

    expect(result).toBeNull();
  });
});
```

## Integration Test Template

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("POST /api/tasks", () => {
  it("creates a task and returns 201", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "New task" })
      .expect(201);

    expect(res.body.data).toMatchObject({ title: "New task" });
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body).toHaveProperty("code", "VALIDATION_ERROR");
  });
});
```

## Rules

- Every `it` block must contain at least one `expect` assertion.
- Use `vi.clearAllMocks()` in `beforeEach` to prevent test pollution.
- Prefer `toEqual` for object comparison, `toBe` for primitives.
- Never use `any` in test files -- type mocks with `vi.mocked()`.
- Keep tests independent -- no shared mutable state between `it` blocks.
