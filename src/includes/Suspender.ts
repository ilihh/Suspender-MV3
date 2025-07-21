import { SuspendedURL } from './SuspendedURL';
import { PAGE, SUSPEND_MODE, TAB_STATUS, TABS_QUERY_AUTO, TABS_QUERY_BASE } from './constants';
import { Configuration } from './Configuration';
import { DeviceStatus } from './DeviceStatus';
import { PageInfo } from './PageInfo';
import { ScrollPositions } from './ScrollPositions';
import { SessionWindow } from './Sessions';
import { isValidTab, ValidTab } from './ValidTab';
import { TabInfo } from './TabInfo';
import { isDataImage, isLocalFilesAllowed, isUrlAllowed } from './functions';
import { MigrationTab } from './MigrationTab';

export class Suspender
{
	private readonly timeToSuspend: number;
	private readonly suspendedUrl: string;
	private readonly loadFavIconsAsDataImage: boolean = false;
	private _device: DeviceStatus|undefined = undefined;
	private _filesSchemeAllowed: boolean|undefined = undefined;

	public constructor(
		private readonly config: Configuration,
	)
	{
		this.timeToSuspend = (new Date()).getTime() - (this.config.data.suspendDelay * 60 * 1000);
		this.suspendedUrl = chrome.runtime.getURL(PAGE.Suspended);
	}

	private async device(): Promise<DeviceStatus>
	{
		if (this._device == null)
		{
			this._device = await DeviceStatus.get();
		}

		return this._device;
	}

	private async filesSchemeAllowed(): Promise<boolean>
	{
		if (this._filesSchemeAllowed == null)
		{
			this._filesSchemeAllowed = await isLocalFilesAllowed();
		}

		return this._filesSchemeAllowed;
	}

	private query(): chrome.tabs.QueryInfo
	{
		const q = TABS_QUERY_AUTO;
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

	private async getTabs(query: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]>
	{
		const q = Object.assign({}, TABS_QUERY_BASE, query);
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
		const file = await this.filesSchemeAllowed()
			? await chrome.tabs.query(q)
			: [];

		return secure.concat(unsecure, file);
	}

	public async suspendAuto(): Promise<void>
	{
		if (!this.config.allowedSuspend(await this.device()))
		{
			return;
		}

		const tabs = await this.getTabs(this.query());
		return this.suspendTabs(tabs);
	}

	public async suspendTabs(tabs: chrome.tabs.Tab[], mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		for (const tab of tabs)
		{
			if (isValidTab(tab) && await this.canSuspend(tab, mode))
			{
				await this.suspend(tab);
			}
		}
	}

	public async suspendGroup(tabId: number, mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE
			? [tab,]
			: await this.getTabs({groupId: tab.groupId,});
		return this.suspendTabs(tabs, mode);
	}

	public async unsuspendGroup(tabId: number): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = tab.groupId == chrome.tabGroups.TAB_GROUP_ID_NONE
			? [tab,]
			: await this.getTabs({groupId: tab.groupId, url: this.suspendedUrl});
		return this.unsuspendTabs(tabs);
	}

	public async suspendWindow(tabId: number, mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = (await this.getTabs({windowId: tab.windowId, })).filter(x => x.id !== tabId);
		return this.suspendTabs(tabs, mode);
	}

	public async unsuspendWindow(tabId: number): Promise<void>
	{
		const tab = await chrome.tabs.get(tabId);
		const tabs = await this.getTabs({windowId: tab.windowId, url: this.suspendedUrl});
		return this.unsuspendTabs(tabs);
	}

	public async suspendAll(mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<void>
	{
		const tabs = await this.getTabs();
		return this.suspendTabs(tabs, mode);
	}

	public async unsuspendAll(): Promise<void>
	{
		const tabs = await this.getTabs({url: this.suspendedUrl});
		await this.unsuspendTabs(tabs);
	}

	private async isSuspendableUrl(url: string): Promise<boolean>
	{
		return url.startsWith('http://')
			|| url.startsWith('https://')
			|| (await this.filesSchemeAllowed() && url.startsWith('file://'));
	}

	private async canSuspend(tab: ValidTab, mode: SUSPEND_MODE = SUSPEND_MODE.Auto): Promise<boolean>
	{
		switch (mode)
		{
			case SUSPEND_MODE.Auto:
				if ((await this.getTabStatus(tab) !== TAB_STATUS.Normal) || (tab.lastAccessed === undefined))
				{
					return false;
				}

				const time = Math.max(tab.lastAccessed, (await TabInfo.get(tab.id)).lastAccess);
				return time < this.timeToSuspend;
			case SUSPEND_MODE.Normal:
				return await this.getTabStatus(tab) === TAB_STATUS.Normal;
			case SUSPEND_MODE.Forced:
				return true;
			default:
				return false;
		}
	}

	private async hasUnsavedData(tab: ValidTab): Promise<boolean>
	{
		const info = await PageInfo.get(tab, this.config.data);
		return info !== false && info.changedFields;
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
		if (!await this.isSuspendableUrl(tab.url))
		{
			return undefined;
		}

		if (this.config.data.discardTabs)
		{
			return chrome.tabs.discard(tab.id);
		}
		else
		{
			const url = await this.getTabSuspendedUrl(tab);
			if (url === false)
			{
				return undefined;
			}

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

		if (this.config.data.cleanupHistory)
		{
			await this.cleanupHistory(suspended_url, original.uri);
		}

		await (await ScrollPositions.load()).set(tab.id, original.scrollPosition);
		const updated_tab = await chrome.tabs.update(tab.id, {
			url: original.uri,
		});

		if (isValidTab(updated_tab))
		{
			void TabInfo.activated(updated_tab.id);
			void this.updateTabActionIcon(updated_tab);
		}

		return updated_tab;
	}

	private async cleanupHistory(suspendedUrl: string, originalUrl: string)
	{
		await chrome.history.deleteUrl({url: suspendedUrl});
		const visits = await chrome.history.getVisits({url: originalUrl});

		void visits.pop(); // latest
		const previous = visits.pop();
		if ((previous !== undefined) && (previous.visitTime !== undefined))
		{
			chrome.history.deleteRange(
				{
					startTime: previous.visitTime - 0.1,
					endTime: previous.visitTime + 0.1,
				},
				() => { },
			);
		}
	}

	private async getFavIcon(url: string | undefined): Promise<string>
	{
		if (url === undefined)
		{
			return '';
		}

		if (this.loadFavIconsAsDataImage && await isUrlAllowed(url))
		{
			const response = await fetch(url);
			const blob = await response.blob();

			const data_image = await new Promise((resolve: (result: string) => void) =>
			{
				const reader = new FileReader();
				reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
				reader.onerror = () => resolve('');
				reader.readAsDataURL(blob);
			});

			return isDataImage(data_image) ? data_image : url;
		}
		else
		{
			return url;
		}
	}

	private async getTabSuspendedUrl(tab: ValidTab): Promise<SuspendedURL|false>
	{
		const icon = await this.getFavIcon(tab.favIconUrl);
		const data = new SuspendedURL(tab.url, tab.title || '', 0, icon);

		if (this.config.data.restoreScrollPosition || this.config.data.maintainYoutubeTime)
		{
			const info = await PageInfo.get(tab, this.config.data);
			if (info === false)
			{
				return false;
			}

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

	public async getTabStatus(tab: ValidTab): Promise<TAB_STATUS>
	{
		if (!isValidTab(tab))
		{
			return TAB_STATUS.Error;
		}

		if (this.isSuspended(tab))
		{
			return TAB_STATUS.Suspended;
		}

		if (this.config.data.suspendLocalFiles && tab.url.startsWith('file://'))
		{
			return TAB_STATUS.LocalFile;
		}

		if (!await this.isSuspendableUrl(tab.url))
		{
			return TAB_STATUS.Special;
		}

		if (!this.config.autoSuspend())
		{
			return TAB_STATUS.Disabled;
		}

		const device = await this.device();
		if (!this.config.allowedSuspendOnline(device))
		{
			return TAB_STATUS.Offline;
		}

		if (!this.config.allowedSuspendPower(device))
		{
			return TAB_STATUS.PowerConnected;
		}

		if (!this.config.data.suspendPinned && tab.pinned)
		{
			return TAB_STATUS.Pinned;
		}

		if (!this.config.data.suspendPlayingAudio && tab.audible)
		{
			return TAB_STATUS.PlayingAudio;
		}

		if (await TabInfo.isPaused(tab.id))
		{
			return TAB_STATUS.SuspendPaused;
		}

		if (this.config.inWhiteList(tab))
		{
			return TAB_STATUS.WhiteList;
		}

		if (!this.config.data.suspendActive && tab.active)
		{
			return TAB_STATUS.Active;
		}

		if (tab.lastAccessed !== undefined)
		{
			return this.config.data.neverSuspendUnsavedData && await this.hasUnsavedData(tab)
				? TAB_STATUS.UnsavedForm
				: TAB_STATUS.Normal;
		}

		return TAB_STATUS.Error;
	}

	public async migrate(extension_id: string): Promise<void>
	{
		const migrations = await MigrationTab.create(extension_id);
		for (const migration of migrations)
		{
			await this.suspendTab(migration.tabId, migration.url);
		}
	}

	public async createTab(url: string, suspend: boolean, opener_id: number|undefined, index: number|undefined = undefined, active: boolean = false, window_id: number|undefined = undefined): Promise<void>
	{
		const tab_url = suspend && await this.isSuspendableUrl(url)
			? (new SuspendedURL(url)).toString()
			: url;

		const created = await chrome.tabs.create({
			url: tab_url,
			openerTabId: opener_id,
			active: active,
			index: index,
			windowId: window_id,
		});
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

	public async updateTabActionIcon(tab: ValidTab): Promise<void>
	{
		const suffix = await this.getTabStatus(tab) === TAB_STATUS.Normal
			? '_active'
			: '_off';

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