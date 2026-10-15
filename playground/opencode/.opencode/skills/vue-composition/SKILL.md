---
name: Vue 3 Composition API
description: Teaches OpenCode how Kite uses `<script setup>`, composables, and reactive primitives.
---

# Vue 3 Composition API

Kite uses `<script setup>` with TypeScript everywhere. The Options API is
forbidden — no `data()`, no `methods:`, no `computed:`.

## Component template

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Site } from '~/types';

interface Props {
  site: Site;
  showUsage?: boolean;
}

interface Emits {
  (e: 'select', siteId: string): void;
  (e: 'archive', siteId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  showUsage: false
});

const emit = defineEmits<Emits>();

const isSelected = ref(false);
const displayName = computed(() => props.site.name || props.site.domain);

watch(
  () => props.site.id,
  () => {
    isSelected.value = false;
  }
);

function onSelect(): void {
  isSelected.value = true;
  emit('select', props.site.id);
}
</script>

<template>
  <article class="site-card" :class="{ 'is-selected': isSelected }">
    <h3>{{ displayName }}</h3>
    <p v-if="showUsage">{{ site.monthlyEvents.toLocaleString() }} events / mo</p>
    <button type="button" @click="onSelect">Select</button>
  </article>
</template>
```

## Reactivity primitives

- `ref()` for primitives (string, number, boolean, null)
- `reactive()` for objects whose shape is stable
- `shallowRef()` for large immutable objects (charts data, tree structures) — reactivity doesn't traverse
- `readonly()` for props you want to pass down without allowing mutation
- `computed()` for derived values — never call a computed's getter in a template expression

## Watchers

- `watch(source, cb)` — runs on source change, not immediately
- `watch(source, cb, { immediate: true })` — runs once at setup plus on change
- `watchEffect(fn)` — runs immediately and re-runs when any reactive ref it reads changes. Use sparingly — it's easy to over-trigger.
- Always clean up: `const stop = watch(...)` then `onUnmounted(stop)` if the watcher outlives the component (rare)

## Composables

A composable is a function starting with `use` that encapsulates reactive
logic. It returns refs and functions.

```typescript
// app/composables/useDebouncedRef.ts
import { customRef } from 'vue';

export function useDebouncedRef<T>(value: T, delay = 300) {
  let timeout: ReturnType<typeof setTimeout>;
  return customRef<T>((track, trigger) => ({
    get() {
      track();
      return value;
    },
    set(newValue) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        value = newValue;
        trigger();
      }, delay);
    }
  }));
}
```

Rules:
- Composables return refs, not unwrapped values — consumers need reactivity
- Composables can call other composables
- Composables can call `onMounted` / `onUnmounted` (they run in the calling component's context)
- Composables must be called at the top of setup, not inside conditionals or loops

## Template ref

Use for DOM access:

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const inputRef = useTemplateRef<HTMLInputElement>('input');

onMounted(() => {
  inputRef.value?.focus();
});
</script>

<template>
  <input ref="input" />
</template>
```

Use `useTemplateRef` (Vue 3.5+) over the old `ref('input')` string pattern —
it's typed.

## Slots

Prefer slots over prop-driven rendering when the consumer should control
content:

```vue
<!-- bad -->
<KCard :title="'Sites'" :action-label="'New'" @action="onNew" />

<!-- good -->
<KCard>
  <template #title>Sites</template>
  <template #action>
    <KButton @click="onNew">New</KButton>
  </template>
  <SiteList />
</KCard>
```

## Don't

- Don't use `v-for` on an element with `v-if` — put `v-if` inside a `<template v-for>`
- Don't mutate props — copy into a local `ref`
- Don't destructure props (`const { site } = defineProps(...)`) — destructuring strips reactivity
- Don't access `.value` inside a template — Vue unwraps refs automatically
- Don't use `h()` render functions unless the component is a generic wrapper — templates are easier to read
- Don't register global components — use auto-imports via the Nuxt config
