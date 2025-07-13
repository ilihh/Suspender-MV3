export class AboutUI
{
	private readonly version: HTMLElement;

	constructor(private readonly root: HTMLElement)
	{
		this.version = this.root.querySelector<HTMLElement>('#version')!;
		this.build();
	}

	private build(): void
	{
		const manifest = chrome.runtime.getManifest();
		this.version.innerText = `${manifest.name} v${manifest.version}`;
	}
}