import { SuspendedURL } from './SuspendedURL';
import { PAGE, TAB_STATUS, TABS_QUERY_AUTO, TABS_QUERY_BASE } from './constants';
import { Configuration } from './Configuration';
import { DeviceStatus } from './DeviceStatus';
import { TabInfo } from './TabInfo';
import { ScrollPositions } from './ScrollPositions';
import { SessionWindow } from './Sessions';

export class Suspender
{
	private readonly config: Configuration;
	private readonly timeToSuspend: number;
	private readonly suspendedUrl: string;
	private readonly device: DeviceStatus;
	private readonly filesSchemeAllowed: boolean = false;

	public constructor(config: Configuration, device: DeviceStatus, files_allowed: boolean)
	{
		this.config = config;
		this.timeToSuspend = (new Date()).getTime() - (this.config.suspendDelay * 60 * 1000);
		this.suspendedUrl = chrome.runtime.getURL(PAGE.Suspended);
		this.device = device;
		this.filesSchemeAllowed = files_allowed;
	}

	private query(): chrome.tabs.QueryInfo
	{
		const q = TABS_QUERY_AUTO;
		if (!this.config.suspendPlayingAudio)
		{
			q.audible = false;
		}

		if (!this.config.suspendPinned)
		{
			q.pinned = false;
		}

		return q;
	}

	private async getTabs(query: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]>
	{
		const q = Object.assign({}, TABS_QUERY_BASE, query);
		return await chrome.tabs.query(q);
	}

	public async suspendAuto(): Promise<void>
	{
		if (!this.config.allowedSuspend(this.device))
		{
			return;
		}

		const tabs = await this.getTabs(this.query());
		this.suspendTabs(tabs);
	}

	public suspendTabs(tabs: chrome.tabs.Tab[], force: boolean = false): void
	{
		for (const tab of tabs)
		{
			if (force || this.canSuspend(tab))
			{
				const _ = this.suspend(tab);
			}
		}
	}

	public async suspendGroup(tab_id: number, force: boolean = false): Promise<void>
	{
		const tab = await chrome.tabs.get(tab_id);
		const tabs = tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE
			? [tab,]
			: await this.getTabs({groupId: tab.groupId,});
		this.suspendTabs(tabs, force);
	}

	public async unsuspendGroup(tab_id: number): Promise<void>
	{
		const tab = await chrome.tabs.get(tab_id);
		const tabs = tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE
			? [tab,]
			: await this.getTabs({groupId: tab.groupId,});
		this.unsuspendTabs(tabs);
	}

	public async suspendWindow(tab_id: number, force: boolean = false): Promise<void>
	{
		const tab = await chrome.tabs.get(tab_id);
		const tabs = (await this.getTabs({windowId: tab.windowId,})).filter(x => x.id !== tab_id);
		this.suspendTabs(tabs, force);
	}

	public async unsuspendWindow(tab_id: number): Promise<void>
	{
		const tab = await chrome.tabs.get(tab_id);
		const tabs = await this.getTabs({windowId: tab.windowId,});
		this.unsuspendTabs(tabs);
	}

	public async suspendAll(force: boolean = false): Promise<void>
	{
		const tabs = await this.getTabs();
		this.suspendTabs(tabs, force);
	}

	public async unsuspendAll(): Promise<void>
	{
		const tabs = await this.getTabs();
		this.unsuspendTabs(tabs);
	}

	private canSuspendMinimal(tab: chrome.tabs.Tab): boolean
	{
		if ((tab.id === undefined) || (tab.url === undefined))
		{
			return false;
		}

		return this.isSuspendableUrl(tab.url);
	}

	private isSuspendableUrl(url: string): boolean
	{
		return url.startsWith('http://')
			|| url.startsWith('https://')
			|| (this.filesSchemeAllowed && url.startsWith('file://'));
	}

	private canSuspend(tab: chrome.tabs.Tab): boolean
	{
		return (this.getTabStatus(tab) === TAB_STATUS.Normal)
			&& (tab.lastAccessed !== undefined)
			&& (tab.lastAccessed < this.timeToSuspend);
	}

	private hasUnsavedData(tab: chrome.tabs.Tab): boolean
	{
		return false;
	}

	public isSuspended(tab: chrome.tabs.Tab): boolean
	{
		if ((tab.id === undefined) || (tab.url === undefined))
		{
			return false;
		}

		return tab.url.startsWith(this.suspendedUrl);
	}

	public async suspendToggle(tab: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined>
	{
		if ((tab.id === undefined) || (tab.url === undefined))
		{
			return;
		}

		if (this.isSuspended(tab))
		{
			return this.unsuspend(tab)
		}
		else
		{
			return this.suspend(tab);
		}
	}

	public async suspend(tab: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined>
	{
		if ((tab.id === undefined) || (tab.url === undefined) || !this.canSuspendMinimal(tab))
		{
			return undefined;
		}

		if (this.config.discardTabs)
		{
			return chrome.tabs.discard(tab.id);
		}
		else
		{
			const url = await this.getTabSuspendedUrl(tab);
			return this.suspendTab(tab.id, url);
		}
	}

	private suspendTab(tab_id: number, url: SuspendedURL): Promise<chrome.tabs.Tab | undefined>
	{
		return chrome.tabs.update(tab_id, {
			url: url.toString(),
			autoDiscardable: false,
		});
	}

	public unsuspendTabs(tabs: chrome.tabs.Tab[]): void
	{
		for (const tab of tabs)
		{
			const _ = this.unsuspend(tab);
		}
	}

	public async unsuspend(tab: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined>
	{
		if ((tab.id === undefined) || (tab.url === undefined) || !this.isSuspended(tab))
		{
			return;
		}

		const suspended_url = tab.url;
		const original = SuspendedURL.fromSuspendedUrl(suspended_url);

		if (this.config.cleanupHistory)
		{
			const _ = this.cleanupHistory(suspended_url, original.uri);
		}

		(await ScrollPositions.load()).set(tab.id, original.scrollPosition);
		return chrome.tabs.update(tab.id, {
			url: original.uri,
		});
	}

	private async cleanupHistory(suspended_url: string, original_url: string)
	{
		const _ = chrome.history.deleteUrl({url: suspended_url});
		const visits = await chrome.history.getVisits({url: original_url});

		const latestVisit = visits.pop();
		const previousVisit = visits.pop();
		if ((previousVisit !== undefined) && (previousVisit.visitTime !== undefined))
		{
			chrome.history.deleteRange(
				{
					startTime: previousVisit.visitTime - 0.1,
					endTime: previousVisit.visitTime + 0.1,
				},
				() =>
				{
				},
			);
		}
	}

	private async getTabSuspendedUrl(tab: chrome.tabs.Tab): Promise<SuspendedURL>
	{
		if (tab.url === undefined)
		{
			return new SuspendedURL();
		}

		const data = new SuspendedURL(tab.url || '', tab.title || '', 0, tab.favIconUrl !== undefined ? tab.favIconUrl : '');
		if (this.config.restoreScrollPosition || this.config.maintainYoutubeTime)
		{
			const request_time = this.config.maintainYoutubeTime && tab.url.startsWith('https://www.youtube.com/watch');

			const info = await TabInfo.get(tab, request_time);
			data.scrollPosition = info.scrollPosition;

			if (info.time !== null)
			{
				const url = new URL(tab.url);
				url.searchParams.set('t', info.time + 's');
				data.uri = url.href;
			}
		}

		return data;
	}

	public getTabStatus(tab: chrome.tabs.Tab): TAB_STATUS
	{
		if ((tab.id === undefined) || (tab.url === undefined))
		{
			return TAB_STATUS.Error;
		}

		if (this.isSuspended(tab))
		{
			return TAB_STATUS.Suspended;
		}

		if (!this.canSuspendMinimal(tab))
		{
			return TAB_STATUS.Special;
		}

		if (!this.config.autoSuspend())
		{
			return TAB_STATUS.Disabled;
		}

		if (!this.config.allowedSuspendOnline(this.device))
		{
			return TAB_STATUS.Offline;
		}

		if (!this.config.allowedSuspendPower(this.device))
		{
			return TAB_STATUS.PowerConnected;
		}

		if (!this.config.suspendUnsavedData && this.hasUnsavedData(tab))
		{
			return TAB_STATUS.UnsavedForm;
		}

		if (!this.config.suspendPinned && tab.pinned)
		{
			return TAB_STATUS.Pinned;
		}

		if (!this.config.suspendPlayingAudio && tab.audible)
		{
			return TAB_STATUS.PlayingAudio;
		}

		if (this.config.isPausedTab(tab.id))
		{
			return TAB_STATUS.SuspendPaused;
		}

		if (this.config.inWhiteList(tab))
		{
			return TAB_STATUS.WhiteList;
		}

		if (tab.lastAccessed !== undefined)
		{
			return TAB_STATUS.Normal;
		}

		return TAB_STATUS.Error;
	}

	public async migrate(extension_id: string): Promise<void>
	{
		if ((extension_id.length !== 32) || (extension_id === chrome.runtime.id))
		{
			return;
		}

		const tabs = await chrome.tabs.query({});
		const extension_tabs = tabs.filter(x => x.url?.startsWith(`chrome-extension://${extension_id}/`));

		for (const tab of extension_tabs)
		{
			const url = SuspendedURL.fromSuspendedUrl(tab.url ?? '');
			if ((tab.id === undefined) || (url.uri === ''))
			{
				continue;
			}

			await this.suspendTab(tab.id, url);
		}
	}

	public async createTab(url: string, suspend: boolean, opener_id: number|undefined, index: number|undefined = undefined, active: boolean = false, window_id: number|undefined = undefined): Promise<void>
	{
		const tab_url = suspend && this.isSuspendableUrl(url)
			? (new SuspendedURL(url)).toString()
			: url;

		const options: chrome.tabs.CreateProperties = {
			url: tab_url,
			openerTabId: opener_id,
			active: active,
			index: index,
			windowId: window_id,
		};

		const created = await chrome.tabs.create(options);
		if (suspend && (created.id !== undefined))
		{
			await chrome.tabs.update(created.id, {
				autoDiscardable: false,
			});
		}
	}

	public async openWindow(window: SessionWindow, suspend: boolean): Promise<void>
	{
		if (window.tabs.length === 0)
		{
			return;
		}

		const w = await chrome.windows.create();
		if ((w === undefined) || (w.id === undefined))
		{
			return;
		}

		for (const url of window.tabs)
		{
			await this.createTab(url, suspend, undefined, undefined, false, w.id);
		}
	}

	public async openSession(windows: SessionWindow[], suspend: boolean): Promise<void>
	{
		for (const window of windows)
		{
			await this.openWindow(window, suspend);
		}
	}
}