import { FAVICON_MODE, PAGE } from './constants';
import { FavIcon } from './FavIcon';
import { isDataImage } from './functions';

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

	public getIcon(mode: FAVICON_MODE, default_icon: string): FavIcon
	{
		if (this.icon === '')
		{
			return new FavIcon(default_icon, true);
		}

		if (isDataImage(this.icon))
		{
			return new FavIcon(this.icon);
		}

		const domain = (new URL(this.uri)).hostname;
		const google_icon = domain ? `https://www.google.com/s2/favicons?sz=32&domain=${domain}` : default_icon;
		const actual_icon = this.icon === null ? google_icon : this.icon;

		switch (mode)
		{
			case FAVICON_MODE.NoDim:
				return new FavIcon(actual_icon, false);
			case FAVICON_MODE.Google:
				return new FavIcon(google_icon);
			case FAVICON_MODE.Actual:
				return new FavIcon(actual_icon);
			default:
				return new FavIcon(default_icon);
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