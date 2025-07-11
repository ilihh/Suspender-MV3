export class DataStorage
{
	public static async load<T extends object>(key: string, ctor: { new (): T }, type: 'local' | 'session' = 'local'): Promise<T>
	{
		const loaded = await chrome.storage[type].get([key]);
		const data = loaded[key];
		const raw: T = typeof data === 'string'
			? JSON.parse(data || '{}')
			: data;

		return Object.assign(new ctor(), raw);
	}

	public static save<T extends object>(key: string, data: T, type: 'local' | 'session' = 'local'): Promise<void>
	{
		return chrome.storage[type].set({ [key]: data });
	}
}