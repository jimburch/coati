import pc from 'picocolors';

/* prettier-ignore */
const BANNER =
	'\n' +
	pc.green(' ██████╗  ██████╗  █████╗ ████████╗██╗') + '\n' +
	pc.green('██╔════╝ ██╔═══██╗██╔══██╗╚══██╔══╝██║') + '\n' +
	pc.green('██║      ██║   ██║███████║   ██║   ██║') + '\n' +
	pc.green('██║      ██║   ██║██╔══██║   ██║   ██║') + '\n' +
	pc.green('╚██████╗ ╚██████╔╝██║  ██║   ██║   ██║') + '\n' +
	pc.green(' ╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝') + '\n' +
	pc.dim(' Share, discover, and clone AI coding setups');

export function printBanner(version?: string): void {
	console.log(BANNER);
	if (version) {
		console.log(pc.dim(` v${version}`));
	}
	console.log();
}
