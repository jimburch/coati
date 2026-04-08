import { a1 as attr, e as escape_html, a2 as attributes, a3 as clsx, a4 as ensure_array_like, a5 as element, a6 as spread_props, a7 as head } from "../../chunks/index.js";
import "clsx";
function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
function EmailSignup($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let status = "idle";
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form class="flex w-full max-w-md gap-2"><input type="email"${attr("value", email)} placeholder="you@example.com" required="" class="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"/> <button type="submit"${attr("disabled", status === "loading", true)} class="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">${escape_html("Get notified")}</button></form> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function SetupJsonMock($$renderer) {
  $$renderer.push(`<div class="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"><div class="flex items-center gap-2 border-b border-border px-4 py-3"><span class="size-3 rounded-full bg-red-500/60"></span> <span class="size-3 rounded-full bg-yellow-500/60"></span> <span class="size-3 rounded-full bg-green-500/60"></span> <span class="ml-2 text-xs text-muted-foreground">setup.json</span></div> <div class="overflow-x-auto p-5 font-mono text-[13px] leading-loose"><pre><span class="text-muted-foreground">{</span>
  <span class="text-primary">"name"</span>: <span class="text-accent">"typescript-fullstack"</span>,
  <span class="text-primary">"version"</span>: <span class="text-accent">"1.0.0"</span>,
  <span class="text-primary">"description"</span>: <span class="text-accent">"Full-stack TypeScript workflow"</span>,
  <span class="text-primary">"tools"</span>: [<span class="text-accent">"claude-code"</span>, <span class="text-accent">"eslint"</span>, <span class="text-accent">"prettier"</span>],
  <span class="text-primary">"mcp_servers"</span>: [<span class="text-accent">"filesystem"</span>, <span class="text-accent">"postgres"</span>, <span class="text-accent">"github"</span>],
  <span class="text-primary">"files"</span>: <span class="text-muted-foreground">{</span>
    <span class="text-primary">"CLAUDE.md"</span>: <span class="text-accent">"configs/CLAUDE.md"</span>,
    <span class="text-primary">".cursorrules"</span>: <span class="text-accent">"configs/.cursorrules"</span>
  <span class="text-muted-foreground">}</span>
<span class="text-muted-foreground">}</span></pre></div></div>`);
}
function TerminalDemo($$renderer) {
  $$renderer.push(`<div class="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"><div class="flex items-center gap-2 border-b border-border px-4 py-3"><span class="size-3 rounded-full bg-red-500/60"></span> <span class="size-3 rounded-full bg-yellow-500/60"></span> <span class="size-3 rounded-full bg-green-500/60"></span> <span class="ml-2 text-xs text-muted-foreground">Terminal</span></div> <div class="p-5 font-mono text-sm leading-relaxed"><p><span class="text-muted-foreground">$</span> <span class="text-foreground">coati clone jsmith/typescript-fullstack</span></p> <p class="mt-2 text-primary">✓ Cloned setup.json</p> <p class="text-primary">✓ Installed 3 MCP servers</p> <p class="text-primary">✓ Applied .claude/settings.json</p> <p class="text-primary">✓ Copied CLAUDE.md and .cursorrules</p> <p class="mt-2 text-foreground">Done! Your workspace is ready.</p></div></div>`);
}
function FeatureCard($$renderer, $$props) {
  const { icon: Icon2, title, description } = $$props;
  $$renderer.push(`<div class="rounded-xl border border-border bg-card p-6"><div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">`);
  if (Icon2) {
    $$renderer.push("<!--[-->");
    Icon2($$renderer, { class: "size-5 text-primary" });
    $$renderer.push("<!--]-->");
  } else {
    $$renderer.push("<!--[!-->");
    $$renderer.push("<!--]-->");
  }
  $$renderer.push(`</div> <h3 class="text-base font-semibold text-foreground">${escape_html(title)}</h3> <p class="mt-2 text-sm leading-relaxed text-muted-foreground">${escape_html(description)}</p></div>`);
}
function SectionHeading($$renderer, $$props) {
  const { title, subtitle = "" } = $$props;
  $$renderer.push(`<div class="mb-12 text-center"><h2 class="text-3xl font-bold tracking-tight text-foreground">${escape_html(title)}</h2> `);
  if (subtitle) {
    $$renderer.push("<!--[0-->");
    $$renderer.push(`<p class="mt-3 text-lg text-muted-foreground">${escape_html(subtitle)}</p>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></div>`);
}
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
function Icon($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const {
      name,
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth = false,
      iconNode = [],
      children,
      $$slots,
      $$events,
      ...props
    } = $$props;
    $$renderer2.push(`<svg${attributes(
      {
        ...defaultAttributes,
        ...props,
        width: size,
        height: size,
        stroke: color,
        "stroke-width": absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        class: clsx(["lucide-icon lucide", name && `lucide-${name}`, props.class])
      },
      void 0,
      void 0,
      void 0,
      3
    )}><!--[-->`);
    const each_array = ensure_array_like(iconNode);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [tag, attrs] = each_array[$$index];
      element($$renderer2, tag, () => {
        $$renderer2.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
      });
    }
    $$renderer2.push(`<!--]-->`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></svg>`);
  });
}
function Download($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M12 15V3" }],
      ["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
      ["path", { "d": "m7 10 5 5 5-5" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "download" },
      /**
       * @component @name Download
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgMTVWMyIgLz4KICA8cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNCIgLz4KICA8cGF0aCBkPSJtNyAxMCA1IDUgNS01IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/download
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Search($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "m21 21-4.34-4.34" }],
      ["circle", { "cx": "11", "cy": "11", "r": "8" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "search" },
      /**
       * @component @name Search
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMjEgMjEtNC4zNC00LjM0IiAvPgogIDxjaXJjbGUgY3g9IjExIiBjeT0iMTEiIHI9IjgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/search
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Terminal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M12 19h8" }],
      ["path", { "d": "m4 17 6-6-6-6" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "terminal" },
      /**
       * @component @name Terminal
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgMTloOCIgLz4KICA8cGF0aCBkPSJtNCAxNyA2LTYtNi02IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/terminal
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Upload($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M12 3v12" }],
      ["path", { "d": "m17 8-5-5-5 5" }],
      ["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "upload" },
      /**
       * @component @name Upload
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgM3YxMiIgLz4KICA8cGF0aCBkPSJtMTcgOC01LTUtNSA1IiAvPgogIDxwYXRoIGQ9Ik0yMSAxNXY0YTIgMiAwIDAgMS0yIDJINWEyIDIgMCAwIDEtMi0ydi00IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/upload
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Users($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
      ["path", { "d": "M16 3.128a4 4 0 0 1 0 7.744" }],
      ["path", { "d": "M22 21v-2a4 4 0 0 0-3-3.87" }],
      ["circle", { "cx": "9", "cy": "7", "r": "4" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "users" },
      /**
       * @component @name Users
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTYgMjF2LTJhNCA0IDAgMCAwLTQtNEg2YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8cGF0aCBkPSJNMTYgMy4xMjhhNCA0IDAgMCAxIDAgNy43NDQiIC8+CiAgPHBhdGggZD0iTTIyIDIxdi0yYTQgNCAwIDAgMC0zLTMuODciIC8+CiAgPGNpcmNsZSBjeD0iOSIgY3k9IjciIHI9IjQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/users
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Video($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"
        }
      ],
      [
        "rect",
        { "x": "2", "y": "6", "width": "14", "height": "12", "rx": "2" }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "video" },
      /**
       * @component @name Video
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTYgMTMgNS4yMjMgMy40ODJhLjUuNSAwIDAgMCAuNzc3LS40MTZWNy44N2EuNS41IDAgMCAwLS43NTItLjQzMkwxNiAxMC41IiAvPgogIDxyZWN0IHg9IjIiIHk9IjYiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxMiIgcng9IjIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/video
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function _page($$renderer) {
  head("1uha8ag", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Coati - Discover and Clone AI Coding Workflows</title>`);
    });
    $$renderer2.push(`<meta name="description" content="The best AI coding setups exist — now you can use them. Discover, clone, and run complete developer workflows for Claude Code, Cursor, Copilot, and more with a single command."/> <link rel="canonical" href="https://coati.sh"/> <meta property="og:type" content="website"/> <meta property="og:url" content="https://coati.sh"/> <meta property="og:title" content="Coati - Discover and Clone AI Coding Workflows"/> <meta property="og:description" content="The best AI coding setups exist — now you can use them. Discover and clone complete developer workflows with a single command."/> <meta property="og:image" content="https://coati.sh/og.png"/> <meta name="twitter:card" content="summary_large_image"/> <meta name="twitter:title" content="Coati - Discover and Clone AI Coding Workflows"/> <meta name="twitter:description" content="The best AI coding setups exist — now you can use them. Discover and clone complete developer workflows with a single command."/> <meta name="twitter:image" content="https://coati.sh/og.png"/> ${html(`<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Coati",
      url: "https://coati.sh",
      description: "Discover, clone, and run complete AI coding workflows. Like GitHub for your AI dev setup."
    })}<\/script>`)}`);
  });
  $$renderer.push(`<section class="relative overflow-hidden"><div class="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl"></div> <div class="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-20 pt-20 md:grid-cols-2 md:gap-16 md:pt-28"><div><h1 class="text-4xl font-bold leading-tight tracking-tight md:text-5xl">The best AI coding setups are shared here. <span class="text-primary">Now you can use them.</span></h1> <p class="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">Developers are building incredible workflows with Claude Code, Cursor, and Copilot. Coati
				lets you discover their complete setup and clone it to your machine in one command.</p> <div class="mt-8">`);
  EmailSignup($$renderer);
  $$renderer.push(`<!----></div> <p class="mt-3 text-xs text-muted-foreground">Free and open source. Be the first to know when we launch.</p></div> <div class="hidden md:block">`);
  SetupJsonMock($$renderer);
  $$renderer.push(`<!----></div></div></section> <section class="border-t border-border/50 bg-card/50"><div class="mx-auto max-w-3xl px-4 py-20 text-center"><h2 class="text-3xl font-bold tracking-tight">Sharing AI workflows is still a mess</h2> <div class="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground"><p>Someone posts their Claude Code setup on Twitter. It looks amazing. But recreating it means
				hunting through screenshots, copying config snippets, manually installing MCP servers, and
				hoping you didn't miss anything.</p> <p>Dotfiles repos help, but they weren't built for AI tooling. They don't capture MCP configs,
				custom skills, project-specific prompts, or the context that makes a workflow actually work.</p></div></div></section> <section class="border-t border-border/50"><div class="mx-auto max-w-5xl px-4 py-20">`);
  SectionHeading($$renderer, {
    title: "One command. Entire workflow.",
    subtitle: "Coati packages everything — configs, scripts, MCP servers, skills, docs — into a single shareable setup. Clone any developer's complete workflow instantly."
  });
  $$renderer.push(`<!----> <div class="mx-auto max-w-2xl">`);
  TerminalDemo($$renderer);
  $$renderer.push(`<!----></div></div></section> <section class="border-t border-border/50 bg-card/50"><div class="mx-auto max-w-5xl px-4 py-20">`);
  SectionHeading($$renderer, { title: "How it works" });
  $$renderer.push(`<!----> <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">`);
  FeatureCard($$renderer, {
    icon: Search,
    title: "Discover",
    description: "Browse trending setups from the developer community. Filter by tool, language, or use case to find what fits your workflow."
  });
  $$renderer.push(`<!----> `);
  FeatureCard($$renderer, {
    icon: Download,
    title: "Clone",
    description: "Install any setup to your machine with a single CLI command. Configs, MCP servers, skills — everything lands in the right place."
  });
  $$renderer.push(`<!----> `);
  FeatureCard($$renderer, {
    icon: Upload,
    title: "Share",
    description: "Package your own workflow into a setup.json and publish it. Let other developers benefit from what you've built."
  });
  $$renderer.push(`<!----> `);
  FeatureCard($$renderer, {
    icon: Terminal,
    title: "CLI-first",
    description: "Search, clone, star, and publish directly from your terminal. The Coati CLI integrates into the workflow you already have."
  });
  $$renderer.push(`<!----></div></div></section> <section class="border-t border-border/50"><div class="mx-auto max-w-5xl px-4 py-20">`);
  SectionHeading($$renderer, { title: "Built for AI-native developers" });
  $$renderer.push(`<!----> <div class="grid grid-cols-1 gap-4 md:grid-cols-3"><div class="rounded-xl border border-border bg-card p-6"><div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">`);
  Terminal($$renderer, { class: "size-5 text-primary" });
  $$renderer.push(`<!----></div> <h3 class="text-base font-semibold">Claude Code users</h3> <p class="mt-2 text-sm leading-relaxed text-muted-foreground">Share your CLAUDE.md, MCP servers, custom skills, and hooks. Clone setups that make Claude
					Code even more powerful.</p></div> <div class="rounded-xl border border-border bg-card p-6"><div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">`);
  Users($$renderer, { class: "size-5 text-primary" });
  $$renderer.push(`<!----></div> <h3 class="text-base font-semibold">Cursor &amp; IDE users</h3> <p class="mt-2 text-sm leading-relaxed text-muted-foreground">Package your .cursorrules, extensions, and AI configurations. Discover setups tuned for
					your stack and editor.</p></div> <div class="rounded-xl border border-border bg-card p-6"><div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">`);
  Video($$renderer, { class: "size-5 text-primary" });
  $$renderer.push(`<!----></div> <h3 class="text-base font-semibold">Content creators</h3> <p class="mt-2 text-sm leading-relaxed text-muted-foreground">Link your audience directly to your setup. One command to clone means no more "how do I set
					this up?" in the comments.</p></div></div></div></section> <section id="signup" class="border-t border-border/50"><div class="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background"><div class="mx-auto max-w-3xl px-4 py-20 text-center"><h2 class="text-3xl font-bold tracking-tight">Be the first to know when Coati launches</h2> <p class="mt-3 text-lg text-muted-foreground">Join the waitlist and get early access to the platform and CLI.</p> <div class="mt-8 flex justify-center">`);
  EmailSignup($$renderer);
  $$renderer.push(`<!----></div></div></div></section>`);
}
export {
  _page as default
};
