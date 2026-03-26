import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.Bo_7JCi9.js","_app/immutable/chunks/DOMFhuDP.js","_app/immutable/chunks/DMNAyEs8.js","_app/immutable/chunks/BYsHMPc6.js","_app/immutable/chunks/Dqb7tGq4.js"];
export const stylesheets = ["_app/immutable/assets/0.B9NG2d__.css"];
export const fonts = [];
