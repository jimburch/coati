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

export function printBanner(): void {
	console.log(BANNER);
	console.log();
}
