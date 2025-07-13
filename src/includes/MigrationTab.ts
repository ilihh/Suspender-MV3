import { SuspendedURL } from './SuspendedURL';
import { isValidTab } from './ValidTab';

export class MigrationTab
{
	constructor(
		public readonly tabId: number,
		public readonly url: SuspendedURL,
	)
	{
	}

	public static async create(extension_id: string): Promise<MigrationTab[]>
	{
		if ((extension_id.length !== 32) || (extension_id === chrome.runtime.id))
		{
			return [];
		}

		const result: MigrationTab[] = [];
		const tabs = await chrome.tabs.query({url: `chrome-extension://${extension_id}/*`});
		for (const tab of tabs)
		{
			const url = SuspendedURL.fromSuspendedUrl(tab.url ?? '');
			if (!isValidTab(tab) || (url.uri === ''))
			{
				continue;
			}

			result.push(new MigrationTab(tab.id, url))
		}

		return result;
	}
}