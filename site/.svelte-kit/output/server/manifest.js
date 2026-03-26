export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg","robots.txt","sitemap.xml"]),
	mimeTypes: {".svg":"image/svg+xml",".txt":"text/plain",".xml":"text/xml"},
	_: {
		client: {start:"_app/immutable/entry/start.x0jHUSJg.js",app:"_app/immutable/entry/app.Co49C3ZZ.js",imports:["_app/immutable/entry/start.x0jHUSJg.js","_app/immutable/chunks/CtoV-1Y8.js","_app/immutable/chunks/DMNAyEs8.js","_app/immutable/chunks/DS5iOw6b.js","_app/immutable/entry/app.Co49C3ZZ.js","_app/immutable/chunks/DMNAyEs8.js","_app/immutable/chunks/B1ZJaWCi.js","_app/immutable/chunks/DOMFhuDP.js","_app/immutable/chunks/DS5iOw6b.js","_app/immutable/chunks/DTLNFPCL.js","_app/immutable/chunks/Dqb7tGq4.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
