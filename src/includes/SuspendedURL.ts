import { FAVICON_MODE, PAGE } from './constants';

export class SuspendedURL
{
	public constructor(
		public uri: string = '',
		public title: string = '',
		public scrollPosition: number = 0,
		public icon: string|null = null,
		public update: boolean = false,
	)
	{
	}

	public getIcon(mode: FAVICON_MODE, default_icon: string): { icon: string, dim: boolean }
	{
		if (this.icon === '')
		{
			return {icon: default_icon, dim: true};
		}

		const domain = (new URL(this.uri)).hostname;
		const google_icon = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
		let actual_icon = this.icon === null ? google_icon : this.icon;

		switch (mode)
		{
			case FAVICON_MODE.NoDim:
				return { icon: actual_icon, dim: actual_icon.startsWith('data:image/') };
			case FAVICON_MODE.Google:
				return { icon: google_icon, dim: true };
			case FAVICON_MODE.Actual:
				return { icon: actual_icon, dim: true };
			default:
				return { icon: default_icon, dim: true };
		}
	}

	public get hash(): string
	{
		const p = new URLSearchParams();
		p.set('uri', this.uri);
		p.set('ttl', this.title);
		p.set('pos', this.scrollPosition.toString());
		if (this.icon !== null)
		{
			p.set('icon', this.icon);
		}

		if (this.update)
		{
			p.set('update', 'update');
		}

		return '#' + p.toString();
	}

	public static fromSuspendedUrl(url: string): SuspendedURL
	{
		const params = new URLSearchParams((new URL(url)).hash.substring(1));
		return new SuspendedURL(
			params.get('uri') ?? params.get('url') ?? '',
			params.get('ttl') ?? params.get('title') ?? '',
			parseInt(params.get('pos') ?? '0'),
			params.get('icon'),
			params.has('update'),
		);
	}

	public toString(): string
	{
		return chrome.runtime.getURL(PAGE.Suspended) + this.hash;
	}
}