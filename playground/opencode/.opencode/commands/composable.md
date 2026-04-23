---
description: Scaffold a Vue composable with typed returns and a colocated test
args: <name> [--async]
---

# /composable

Create a new composable in `app/composables/<name>.ts`.

## Steps

1. Normalize name: must start with `use`. If `$1` is `dateRange`, create `useDateRange`.
2. Check for collision with an existing file or an auto-imported utility.
3. Scaffold the composable:

```typescript
import { ref, computed, watch, type Ref } from 'vue';

export interface UseDateRangeOptions {
  initialRange?: 'last-7-days' | 'last-30-days' | 'custom';
}

export interface UseDateRangeReturn {
  start: Ref<Date>;
  end: Ref<Date>;
  label: Ref<string>;
  setRange: (range: 'last-7-days' | 'last-30-days' | 'custom', start?: Date, end?: Date) => void;
}

export function useDateRange(opts: UseDateRangeOptions = {}): UseDateRangeReturn {
  const start = ref<Date>(new Date());
  const end = ref<Date>(new Date());
  const label = computed(() => formatRange(start.value, end.value));

  function setRange(range, customStart, customEnd): void {
    // …
  }

  return { start, end, label, setRange };
}
```

4. For `--async`, include loading/error state in the return type:
   ```typescript
   { data: Ref<T | null>; pending: Ref<boolean>; error: Ref<Error | null>; refresh: () => Promise<void> }
   ```
5. Write a colocated test at `app/composables/<name>.test.ts`:
   - Returns expected initial state
   - Each method updates state correctly
   - `computed` values recalculate
   - For async: `pending` transitions correctly, errors surface to `error`
6. Run `pnpm typecheck && pnpm test:unit`.

## Rules

- Composables return an object of refs and functions — never return unwrapped values
- Return type has an explicit interface named `Use<Name>Return`
- Inputs are a single options object, not a positional argument list
- No side effects at module load — all work happens inside the function body
- If the composable uses `onMounted` / `onUnmounted`, document that it must be called during setup
