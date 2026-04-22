interface ViewState {
	isOwner: boolean;
	readmeHtml: string | null;
}

export function shouldRenderReadmeSection({ isOwner, readmeHtml }: ViewState): boolean {
	return isOwner || !!readmeHtml;
}

export function shouldShowAddReadmeCard({ isOwner, readmeHtml }: ViewState): boolean {
	return isOwner && !readmeHtml;
}

interface SaveState {
	/** Whether the editor was opened from an existing README (Edit) or from the null state (Add a README). */
	sourceHadReadme: boolean;
	textareaContent: string;
	saving: boolean;
}

export function isSaveDisabled({ sourceHadReadme, textareaContent, saving }: SaveState): boolean {
	if (saving) return true;
	if (sourceHadReadme) return false;
	return textareaContent.trim() === '';
}
