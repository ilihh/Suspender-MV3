import { PAGE, SUSPEND_MODE, TABS_QUERY_AUTO, TABS_QUERY_BASE } from './constants';
import { Configuration } from './Configuration';

export class Tabs
{
	private readonly suspendedUrl: string;

	public constructor(
		private readonly config: Configuration,
	)
	{
		this.suspendedUrl = chrome.runtime.getURL(PAGE.Suspended);
	}

	private query(mode: SUSPEND_MODE): chrome.tabs.QueryInfo
	{
		if (mode !== SUSPEND_MODE.Auto)
		{
			return TABS_QUERY_AUTO;
		}

		const q = Object.assign({}, TABS_QUERY_AUTO);
		if (!this.config.data.suspendActive)
		{
			q.active = false;
		}

		if (!this.config.data.suspendPlayingAudio)
		{
			q.audible = false;
		}

		if (!this.config.data.suspendPinned)
		{
			q.pinned = false;
		}

		return q;
	}

	public async suspended(query: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]>
	{
		const q = Object.assign({}, TABS_QUERY_BASE, query);
		q.url = this.suspendedUrl;
		return await chrome.tabs.query(q);
	}

	public async unsuspended(mode: SUSPEND_MODE, filesSchemeAllowed: boolean, query: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]>
	{
		const q = Object.assign({}, this.query(mode), query);

		if (q.url !== undefined)
		{
			return await chrome.tabs.query(q);
		}

		// assumption: there much more suspended tabs (chrome-extension:// urls) than unsuspended tabs (https://, http://, file://),
		// so making 2-3 queries to get only suspendable tabs is much faster than one query with all tabs
		// - 1 query with all tabs + filter = ~60ms (~600 ms on first run)
		// - 3 queries with suspendable tabs = ~8-10ms (~120 ms on first run)
		q.url = 'https://*/*';
		const secure = await chrome.tabs.query(q);

		q.url = 'http://*/*';
		const unsecure = await chrome.tabs.query(q);

		q.url = 'file://*/*';
		const file = filesSchemeAllowed
			? await chrome.tabs.query(q)
			: [];

		return secure.concat(unsecure, file);
	}

	public static get(tabId: number): Promise<chrome.tabs.Tab>
	{
		return chrome.tabs.get(tabId);
	}

	public static async active(): Promise<chrome.tabs.Tab | undefined>
	{
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
		return tabs[0];
	}

	public static create(properties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>
	{
		return chrome.tabs.create(properties);
	}

	public static update(tabId: number, properties: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab | undefined>
	{
		return chrome.tabs.update(tabId, properties);
	}

	public static discard(tabId: number): Promise<chrome.tabs.Tab>
	{
		return chrome.tabs.discard(tabId);
	}

	public static async ofExtension(extensionId: string): Promise<chrome.tabs.Tab[]>
	{
		if ((extensionId.length !== 32) || (extensionId === chrome.runtime.id))
		{
			return [];
		}

		return chrome.tabs.query({url: `chrome-extension://${extensionId}/*`});
	}
}