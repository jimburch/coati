import "clsx";
function Nav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<header class="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg"><nav class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"><a href="/" class="text-xl font-bold tracking-tight text-primary">Coati</a> <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">Get early access</button></nav></header>`);
  });
}
function Footer($$renderer) {
  $$renderer.push(`<footer class="border-t border-border/50 py-8"><div class="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground"><p>© 2026 Coati. All rights reserved.</p></div></footer>`);
}
function _layout($$renderer, $$props) {
  const { children } = $$props;
  $$renderer.push(`<div class="flex min-h-screen flex-col">`);
  Nav($$renderer);
  $$renderer.push(`<!----> <main class="flex-1">`);
  children($$renderer);
  $$renderer.push(`<!----></main> `);
  Footer($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  _layout as default
};
