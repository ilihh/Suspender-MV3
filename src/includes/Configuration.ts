import { DeviceStatus } from './DeviceStatus';
import { createContextMenu } from './context_menu';
import { DataStorage } from './DataStorage';

// Settings
export class Configuration
{
	public static liteVersion: boolean = false;

	// alarm timer, in minutes, hidden, not editable by user
	public timer: number = 3;

	public suspendDelay: number = 60;

	public suspendPinned: boolean = false;

	public suspendUnsavedData: boolean = false;

	public suspendPlayingAudio: boolean = false;

	public suspendOffline: boolean = false;

	public neverSuspendWhenPowerOn: boolean = false;

	public whiteList: string[] = [];

	public restoreScrollPosition: boolean = false;

	public maintainYoutubeTime: boolean = false;

	public discardTabs: boolean = false;

	public enableContextMenu: boolean = true;

	public cleanupHistory: boolean = false;

	public exportSessions: boolean = false;

	// decide against implementation
	public syncProfile: boolean = true;

	// hidden, not editable by user
	public pausedTabsIds: number[] = [];

	public autoSuspend(): boolean
	{
		return this.suspendDelay === 0;
	}

	public enableDimmedIcons(): boolean
	{
		return this.restoreScrollPosition;
	}

	public async init(): Promise<void>
	{
		const _ = await chrome.contextMenus.removeAll();
		if (this.enableContextMenu)
		{
			createContextMenu();
		}
	}

	public alarmConfig(): chrome.alarms.AlarmCreateInfo
	{
		return {
			delayInMinutes: this.timer,
			periodInMinutes: this.timer,
		};
	}

	public allowedSuspend(device: DeviceStatus): boolean
	{
		return this.allowedSuspendOnline(device)
			&& this.allowedSuspendPower(device);
	}

	public allowedSuspendOnline(device: DeviceStatus): boolean
	{
		return device.online || this.suspendOffline;
	}

	public allowedSuspendPower(device: DeviceStatus): boolean
	{
		return !(this.neverSuspendWhenPowerOn && device.powerOn);
	}

	public clearIgnoredTabs(): void
	{
		this.pausedTabsIds = [];
		this.save();
	}

	public isPausedTab(tab_id: number): boolean
	{
		return this.pausedTabsIds.indexOf(tab_id, 0) > -1;
	}

	public pauseTab(tab_id: number): void
	{
		this.pausedTabsIds.push(tab_id);
		this.save();
	}

	public unpauseTab(tab_id: number): void
	{
		const index = this.pausedTabsIds.indexOf(tab_id, 0);
		if (index > -1)
		{
			this.pausedTabsIds.splice(index, 1);
			this.save();
		}
	}

	public togglePauseTab(tab_id: number): void
	{
		if (this.isPausedTab(tab_id))
		{
			this.unpauseTab(tab_id);
		}
		else
		{
			this.pauseTab(tab_id);
		}
	}

	public whitelistDomain(tab: chrome.tabs.Tab): void
	{
		if (tab.url === undefined)
		{
			return;
		}

		const url = new URL(tab.url);
		this.addWhiteList(url.host);
	}

	public whitelistUrl(tab: chrome.tabs.Tab): void
	{
		if (tab.url === undefined)
		{
			return;
		}

		const url = new URL(tab.url);
		this.addWhiteList(url.host + url.pathname);
	}

	private addWhiteList(url: string): void
	{
		if (this.whiteList.indexOf(url) === -1)
		{
			this.whiteList.push(url);
		}

		this.save();
	}

	public inWhiteList(tab: chrome.tabs.Tab): boolean
	{
		if (tab.url === undefined)
		{
			return false;
		}

		const url = new URL(tab.url);
		const base_url = url.host + url.pathname;
		for (const path of this.whiteList)
		{
			if (path === '')
			{
				continue;
			}

			if (base_url.includes(path))
			{
				return true;
			}
		}

		return false;
	}

	public whiteListRemove(tab: chrome.tabs.Tab): void
	{
		if (tab.url === undefined)
		{
			return;
		}

		const url = new URL(tab.url);
		const base_url = url.host + url.pathname;
		this.whiteList = this.whiteList.filter(x => !base_url.includes(x));
		this.save();
	}

	private static _key = 'config';

	public static async load(): Promise<Configuration>
	{
		const config = await DataStorage.load(Configuration._key, Configuration);
		if (Configuration.liteVersion)
		{
			config.restoreScrollPosition = false;
			config.maintainYoutubeTime = false;
		}

		return config;
	}

	public save(): void
	{
		DataStorage.save(Configuration._key, this);
		const _ = this.init();
	}
}