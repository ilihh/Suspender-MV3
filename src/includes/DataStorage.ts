export class DataStorage
{
	public static async load<T extends object>(key: string, ctor: { new (): T }): Promise<T>
	{
		const loaded = await chrome.storage.local.get([key]);
		const raw: T = JSON.parse(loaded[key] || '{}');

		return Object.assign(new ctor(), raw);
	}

	public static save<T extends object>(key: string, data: T): void
	{
		const _ = chrome.storage.local.set({ [key]: JSON.stringify(data) });
	}
}