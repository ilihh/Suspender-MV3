import { DeviceStatus } from './DeviceStatus';
import { ContextMenu } from './ContextMenu';
import { DataStorage } from './DataStorage';
import { ValidTab } from './ValidTab';
import { FAVICON_MODE } from './constants';

export class Configuration
{
	public version: number = 1;

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

	public faviconsMode: FAVICON_MODE = FAVICON_MODE.NoDim;

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
		return this.suspendDelay > 0;
	}

	public enableDimmedIcons(): boolean
	{
		return this.restoreScrollPosition;
	}

	public async init(): Promise<void>
	{
		return ContextMenu.create(this.enableContextMenu);
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

	public isPausedTab(tabId: number): boolean
	{
		return this.pausedTabsIds.indexOf(tabId, 0) > -1;
	}

	public pauseTab(tabId: number): void
	{
		this.pausedTabsIds.push(tabId);
		this.save();
	}

	public unpauseTab(tabId: number): void
	{
		const index = this.pausedTabsIds.indexOf(tabId, 0);
		if (index > -1)
		{
			this.pausedTabsIds.splice(index, 1);
			this.save();
		}
	}

	public togglePauseTab(tabId: number): void
	{
		if (this.isPausedTab(tabId))
		{
			this.unpauseTab(tabId);
		}
		else
		{
			this.pauseTab(tabId);
		}
	}

	public whitelistDomain(tab: ValidTab): void
	{
		const url = new URL(tab.url);
		this.addWhiteList(url.host);
	}

	public whitelistUrl(tab: ValidTab): void
	{
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

	public inWhiteList(tab: ValidTab): boolean
	{
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

	public whiteListRemove(tab: ValidTab): void
	{
		const url = new URL(tab.url);
		const base_url = url.host + url.pathname;
		this.whiteList = this.whiteList.filter(x => !base_url.includes(x));
		this.save();
	}

	private static _key = 'config';

	public static async load(): Promise<Configuration>
	{
		const config = await DataStorage.load(Configuration._key, Configuration);
		config.upgradeVersion();
		return config;
	}

	private upgradeVersion(): void
	{
		if (this.version === 1)
		{
			this.faviconsMode = this.restoreScrollPosition ? FAVICON_MODE.Actual : FAVICON_MODE.NoDim;
			this.version = 2;
		}
	}

	public save(): void
	{
		DataStorage.save(Configuration._key, this);
		const _ = this.init();
	}
}