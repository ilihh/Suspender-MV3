import { PAGE } from './constants';

export class SuspendedURL
{
	public uri: string;
	public title: string;
	public scrollPosition: number;
	public icon: string|null;
	public update: boolean = false;

	public constructor(uri: string = '', title: string = '', scroll_position: number = 0, icon: string|null = null, update: boolean = false)
	{
		this.uri = uri;
		this.title = title;
		this.scrollPosition = scroll_position;
		this.icon = icon;
		this.update = update;
	}

	public getIcon(default_icon: string): string
	{
		if (this.icon === '')
		{
			return default_icon;
		}

		if (this.icon === null)
		{
			const domain = (new URL(this.uri)).hostname;
			return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
			// return `https://${domain}/favicon.ico`;
		}

		return this.icon;
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