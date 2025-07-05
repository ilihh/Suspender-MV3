import { PAGE } from './constants';

export class SuspendedURL
{
	public uri: string;
	public title: string;
	public scrollPosition: number;
	public icon: string|null;

	public constructor(uri: string = '', title: string = '', scroll_position: number = 0, icon: string|null = null)
	{
		this.uri = uri;
		this.title = title;
		this.scrollPosition = scroll_position;
		this.icon = icon;
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
			//return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
			return `https://${domain}/favicon.ico`;
		}

		return this.icon;
	}

	public static fromSuspendedUrl(url: string): SuspendedURL
	{
		const params = new URLSearchParams((new URL(url)).hash.substring(1));
		return new SuspendedURL(
			params.get('uri') ?? params.get('url') ?? '',
			params.get('ttl') ?? params.get('title') ?? '',
			parseInt(params.get('pos') ?? '0'),
			params.get('icon')
		);
	}

	public toString(): string
	{
		const base = chrome.runtime.getURL(PAGE.Suspended);
		const icon = this.icon !== null ? `&icon=${encodeURIComponent(this.icon)}` : '';
		return `${base}#uri=${encodeURIComponent(this.uri)}&ttl=${encodeURIComponent(this.title)}&pos=${encodeURIComponent(this.scrollPosition)}${icon}`;
	}
}