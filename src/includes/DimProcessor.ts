import { DataStorage } from './DataStorage';
import { Messenger } from './Messenger';
import { MESSAGE, MESSAGE_TARGET, PAGE } from './constants';
import { Offscreen } from './Offscreen';

class Cache
{
	value: string = '';
	expires: number = 0;

	public constructor(value: string = '', expires: number = 0)
	{
		this.value = value;
		this.expires = expires;
	}
}

export class DimProcessor
{
	static _cache_days = 7;

	static _promises: Map<string, Promise<string>> = new Map<string, Promise<string>>();

	public static dim(url: string): Promise<string>
	{
		const saved_promise = DimProcessor._promises.get(url);
		if (saved_promise !== undefined)
		{
			return saved_promise;
		}

		const promise = DimProcessor.load(url);

		DimProcessor._promises.set(url, promise);

		promise.finally(() => DimProcessor._promises.delete(url));

		return promise;
	}

	private static async load(url: string): Promise<string>
	{
		const key = 'dim-cache-' + url;

		const cache = await DataStorage.load(key, Cache);
		if (cache.expires > Date.now())
		{
			return cache.value;
		}

		await Offscreen.requireOffscreenDocument(PAGE.Offscreen);

		const response = await Messenger.send<string>({
			action: MESSAGE.OffscreenDimIcon,
			target: MESSAGE_TARGET.Offscreen,
			url: url,
		});

		const dimmed_icon = response.data ?? url;

		// return obsoleted dimmed icon from cache if dim failed
		if ((dimmed_icon === url) && (cache.value !== ''))
		{
			return cache.value;
		}

		const date = new Date();
		date.setDate(date.getDate() + DimProcessor._cache_days);
		await DataStorage.save(key, new Cache(dimmed_icon, date.valueOf()));

		return dimmed_icon;
	}
}