import { SuspendedURL } from './SuspendedURL';
import { isValidTab } from './ValidTab';
import { Tabs } from './Tabs';

export class MigrationTab
{
	constructor(
		public readonly tabId: number,
		public readonly url: SuspendedURL,
	)
	{
	}

	public static async create(extensionId: string): Promise<MigrationTab[]>
	{
		const result: MigrationTab[] = [];
		const tabs = await Tabs.ofExtension(extensionId);
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