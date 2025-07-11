export class TabInfo
{
	private constructor(
		private readonly tabId: number,
		public isPaused: boolean = false,
		public lastAccess: number = 0
	)
	{
	}

	private static key(tabId: number): string
	{
		return `tab-info-${tabId}`;
	}

	public static async get(tabId: number): Promise<TabInfo>
	{
		const key = TabInfo.key(tabId);
		const loaded = await chrome.storage.session.get([key]);
		return Object.assign(new TabInfo(tabId), loaded[key] || {});
	}

	public static async destroy(tabId: number): Promise<void>
	{
		const key = TabInfo.key(tabId);
		await chrome.storage.session.remove(key);
	}

	public static async activated(tabId: number): Promise<TabInfo>
	{
		const info = await TabInfo.get(tabId);
		info.lastAccess = (new Date()).getTime();
		await info.save();

		return info;
	}

	public static async togglePause(tabId: number): Promise<TabInfo>
	{
		const info = await TabInfo.get(tabId);
		info.isPaused = !info.isPaused;
		await info.save();

		return info;
	}

	public static async pause(tabId: number): Promise<TabInfo>
	{
		const info = await TabInfo.get(tabId);
		info.isPaused = true;
		await info.save();

		return info;
	}

	public static async unpause(tabId: number): Promise<TabInfo>
	{
		const info = await TabInfo.get(tabId);
		info.isPaused = false;
		await info.save();

		return info;
	}

	public static async isPaused(tabId: number): Promise<boolean>
	{
		return (await TabInfo.get(tabId)).isPaused;
	}

	public save(): Promise<void>
	{
		const key = TabInfo.key(this.tabId);
		return  chrome.storage.session.set({ [key]: this });
	}
}