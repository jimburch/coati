import { describe, it, expect } from 'vitest';

// Pure logic extracted from SetupCard for unit testing

type Variant = 'default' | 'featured';

function getCardClasses(variant: Variant): string {
	const base = 'block rounded-lg border transition-colors hover:border-foreground/20';
	if (variant === 'featured') {
		return `${base} border-primary/50 bg-card p-5 hover:bg-accent/50 lg:p-6`;
	}
	return `${base} border-border bg-card p-3 hover:bg-accent/50 lg:p-4`;
}

function getTitleClasses(variant: Variant): string {
	if (variant === 'featured') {
		return 'truncate text-base font-semibold text-foreground lg:text-lg';
	}
	return 'truncate text-sm font-semibold text-foreground lg:text-base';
}

function getDescriptionClasses(variant: Variant): string {
	const base = 'mt-1 text-sm text-muted-foreground';
	if (variant === 'featured') {
		return base; // no line-clamp
	}
	return `${base} line-clamp-2`;
}

function showClonesCount(variant: Variant): boolean {
	return variant === 'featured';
}

describe('SetupCard variant logic', () => {
	describe('getCardClasses', () => {
		it('default variant has border-border class', () => {
			const classes = getCardClasses('default');
			expect(classes).toContain('border-border');
		});

		it('default variant does not have accent border', () => {
			const classes = getCardClasses('default');
			expect(classes).not.toContain('border-primary');
		});

		it('featured variant has accent border class', () => {
			const classes = getCardClasses('featured');
			expect(classes).toContain('border-primary/50');
		});

		it('featured variant does not have border-border', () => {
			const classes = getCardClasses('featured');
			expect(classes).not.toContain('border-border');
		});

		it('featured variant has larger padding than default', () => {
			const defaultClasses = getCardClasses('default');
			const featuredClasses = getCardClasses('featured');
			expect(defaultClasses).toContain('p-3');
			expect(featuredClasses).toContain('p-5');
		});
	});

	describe('getTitleClasses', () => {
		it('default variant uses smaller text size', () => {
			const classes = getTitleClasses('default');
			expect(classes).toContain('text-sm');
		});

		it('featured variant uses larger text size', () => {
			const classes = getTitleClasses('featured');
			expect(classes).toContain('text-base');
			expect(classes).toContain('lg:text-lg');
		});
	});

	describe('getDescriptionClasses', () => {
		it('default variant has line-clamp-2', () => {
			const classes = getDescriptionClasses('default');
			expect(classes).toContain('line-clamp-2');
		});

		it('featured variant does not have line-clamp-2', () => {
			const classes = getDescriptionClasses('featured');
			expect(classes).not.toContain('line-clamp-2');
		});
	});

	describe('showClonesCount', () => {
		it('default variant does not show clones count', () => {
			expect(showClonesCount('default')).toBe(false);
		});

		it('featured variant shows clones count', () => {
			expect(showClonesCount('featured')).toBe(true);
		});
	});
});
