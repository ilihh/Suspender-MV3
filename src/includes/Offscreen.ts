export class Offscreen
{
	private static creating: Record<string, Promise<void>> = {};

	public static async requireOffscreenDocument(path: string): Promise<void>
	{
		const url = chrome.runtime.getURL(path);

		const existing = await chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
			documentUrls: [url]
		});

		if (existing.length > 0)
		{
			return;
		}

		if (Offscreen.creating[path] === undefined)
		{
			Offscreen.creating[path] = chrome.offscreen.createDocument({
				url: path,
				reasons: ['BATTERY_STATUS'],
				justification: 'Request battery status',
			});
		}

		await Offscreen.creating[path];
		delete Offscreen.creating[path];
	}
}