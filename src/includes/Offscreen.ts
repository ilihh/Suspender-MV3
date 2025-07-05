export class Offscreen
{
	private static creating: Promise<void>|null = null;

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

		if (Offscreen.creating == null)
		{
			Offscreen.creating = chrome.offscreen.createDocument({
				url: path,
				reasons: ['BATTERY_STATUS'],
				justification: 'reason for needing the document',
			});
		}

		await Offscreen.creating;
		Offscreen.creating = null;
	}
}