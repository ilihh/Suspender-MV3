import { SuspendedURL } from './SuspendedURL';
import { PAGE, SUSPEND_MODE, TAB_STATUS, TABS_QUERY_AUTO, TABS_QUERY_BASE } from './constants';
import { Configuration } from './Configuration';
import { DeviceStatus } from './DeviceStatus';
import { TabInfo } from './TabInfo';
import { ScrollPositions } from './ScrollPositions';
import { SessionWindow } from './Sessions';
import { isValidTab, ValidTab } from './ValidTab';


export class Suspender
{
	private readonly config: Configuration;
	private readonly timeToSuspend: number;
	private readonly suspendedUrl: string;
	private readonly device: DeviceStatus;
	private readonly filesSchemeAllowed: boolean = false;

	public constructor(config: Configuration, device: DeviceStatus, filesSchemeAllowed: boolean)
	{
		this.config = config;
		this.timeToSuspend = (new Date()).getTime() - (this.config.suspendDelay * 60 * 1000);
		this.suspendedUrl = chrome.runtime.getURL(PAGE.Suspended);
		this.device = device;
		this.filesSchemeAllowed = filesSchemeAllowed;
	}

	public static async create(config: Configuration): Promise<Suspender>
	{
		const files_allowed = await chrome.extension.isAllowedFileSchemeAccess();
		const device = await DeviceStatus.get();
		return new Suspender(config, device, files_allowed);
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

	public suspendTabs(tabs: chrome.tabs.Tab[], mode: SUSPEND_MODE = SUSPEND_MODE.Auto): void
	{
		for (const tab of tabs)
		{
			if (isValidTab(tab) && this.canSuspend(tab, mode))
			{
				const _ = this.suspend(tab);
			}
		}
	}

	public async suspendGroup(tabId: number, mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE
			? [tab,]
			: await this.getTabs({groupId: tab.groupId,});
		this.suspendTabs(tabs, mode);
	}

	public async unsuspendGroup(tabId: number): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE
			? [tab,]
			: await this.getTabs({groupId: tab.groupId,});
		this.unsuspendTabs(tabs);
	}

	public async suspendWindow(tabId: number, mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = (await this.getTabs({windowId: tab.windowId,})).filter(x => x.id !== tabId);
		this.suspendTabs(tabs, mode);
	}

	public async unsuspendWindow(tabId: number): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = await this.getTabs({windowId: tab.windowId,});
		this.unsuspendTabs(tabs);
	}

	public async suspendAll(mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		const tabs = await this.getTabs();
		this.suspendTabs(tabs, mode);
	}

	public async unsuspendAll(): Promise<void>
	{
		const tabs = await this.getTabs();
		await this.unsuspendTabs(tabs);
	}

	private isSuspendableUrl(url: string): boolean
	{
		return url.startsWith('http://')
			|| url.startsWith('https://')
			|| (this.filesSchemeAllowed && url.startsWith('file://'));
	}

	private canSuspend(tab: ValidTab, mode: SUSPEND_MODE = SUSPEND_MODE.Auto): boolean
	{
		switch (mode)
		{
			case SUSPEND_MODE.Auto:
				return (this.getTabStatus(tab) === TAB_STATUS.Normal)
					&& (tab.lastAccessed !== undefined)
					&& (tab.lastAccessed < this.timeToSuspend);
			case SUSPEND_MODE.Normal:
				return this.getTabStatus(tab) === TAB_STATUS.Normal;
			case SUSPEND_MODE.Forced:
				return true;
			default:
				return false;
		}
	}

	private hasUnsavedData(tab: ValidTab): boolean
	{
		return false;
	}

	public isSuspended(tab: ValidTab): boolean
	{
		return tab.url.startsWith(this.suspendedUrl);
	}

	public async suspendToggle(tab: ValidTab): Promise<chrome.tabs.Tab | undefined>
	{
		if (this.isSuspended(tab))
		{
			return this.unsuspend(tab)
		}
		else
		{
			return this.suspend(tab);
		}
	}

	public async suspend(tab: ValidTab): Promise<chrome.tabs.Tab | undefined>
	{
		if (!this.isSuspendableUrl(tab.url))
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

	private async suspendTab(tabId: number, url: SuspendedURL): Promise<chrome.tabs.Tab | undefined>
	{
		const tab = await chrome.tabs.update(tabId, {
			url: url.toString(),
			autoDiscardable: false,
		});

		if (isValidTab(tab))
		{
			await this.updateTabActionIcon(tab);
		}

		return tab;
	}

	public async unsuspendTabs(tabs: chrome.tabs.Tab[]): Promise<void>
	{
		for (const tab of tabs)
		{
			if (isValidTab(tab))
			{
				await this.unsuspend(tab);
			}
		}
	}

	public async unsuspend(tab: ValidTab): Promise<chrome.tabs.Tab | undefined>
	{
		if (!this.isSuspended(tab))
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
		const updated_tab = await chrome.tabs.update(tab.id, {
			url: original.uri,
		});

		if (isValidTab(updated_tab))
		{
			await this.updateTabActionIcon(updated_tab);
		}

		return updated_tab;
	}

	private async cleanupHistory(suspendedUrl: string, originalUrl: string)
	{
		const _ = chrome.history.deleteUrl({url: suspendedUrl});
		const visits = await chrome.history.getVisits({url: originalUrl});

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

	private async getTabSuspendedUrl(tab: ValidTab): Promise<SuspendedURL>
	{
		const data = new SuspendedURL(tab.url, tab.title || '', 0, tab.favIconUrl !== undefined ? tab.favIconUrl : '');
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

	public getTabStatus(tab: ValidTab): TAB_STATUS
	{
		if (!isValidTab(tab))
		{
			return TAB_STATUS.Error;
		}

		if (this.isSuspended(tab))
		{
			return TAB_STATUS.Suspended;
		}

		if (!this.isSuspendableUrl(tab.url))
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
			if (!isValidTab(tab) || (url.uri === ''))
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

	public async reloadTabs(): Promise<void>
	{
		const windows = await chrome.windows.getAll({ populate: true, });

		for (const window of windows)
		{
			if (window.tabs === undefined)
			{
				continue;
			}

			for (const tab of window.tabs)
			{
				if ((tab.favIconUrl === '') && isValidTab(tab) && this.isSuspended(tab))
				{
					const s = SuspendedURL.fromSuspendedUrl(tab.url);
					s.update = true;
					await this.suspendTab(tab.id, s);
				}
			}
		}
	}

	public updateTabActionIcon(tab: ValidTab): Promise<void>
	{
		const suffix = this.getTabStatus(tab) === TAB_STATUS.Normal
			? ''
			: 'off';

		return chrome.action.setIcon({
			path: {
				'16': `img/16${suffix}.png`,
				'32': `img/32${suffix}.png`,
				'48': `img/48${suffix}.png`,
				'128': `img/128${suffix}.png`,
			},
			tabId: tab.id,
		});
	}
}