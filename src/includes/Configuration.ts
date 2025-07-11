import { DeviceStatus } from './DeviceStatus';
import { ContextMenu } from './ContextMenu';
import { DataStorage } from './DataStorage';
import { ValidTab } from './ValidTab';
import { FAVICON_MODE } from './constants';
import { ConfigurationData } from './ConfigurationData';

export class Configuration
{
	private constructor(
		public data: ConfigurationData = new ConfigurationData(),
	)
	{
	}

	public autoSuspend(): boolean
	{
		return this.data.suspendDelay > 0;
	}

	public init(): Promise<void>
	{
		return ContextMenu.create(this.data.enableContextMenu);
	}

	public alarmConfig(): chrome.alarms.AlarmCreateInfo
	{
		return {
			delayInMinutes: this.data.timer,
			periodInMinutes: this.data.timer,
		};
	}

	public allowedSuspend(device: DeviceStatus): boolean
	{
		return this.allowedSuspendOnline(device)
			&& this.allowedSuspendPower(device);
	}

	public allowedSuspendOnline(device: DeviceStatus): boolean
	{
		return device.online || this.data.suspendOffline;
	}

	public allowedSuspendPower(device: DeviceStatus): boolean
	{
		return !(this.data.neverSuspendWhenPowerOn && device.powerOn);
	}

	public whitelistDomain(tab: ValidTab): Promise<void>
	{
		const url = new URL(tab.url);
		if (url.protocol === 'file:')
		{
			return this.whitelistDomain(tab);
		}
		else
		{
			return this.addWhiteList(url.host);
		}
	}

	public whitelistUrl(tab: ValidTab): Promise<void>
	{
		const url = new URL(tab.url);
		return this.addWhiteList(url.host + url.pathname);
	}

	private async addWhiteList(url: string): Promise<void>
	{
		url = url.trim();
		if (url === '')
		{
			return;
		}

		if (this.data.whiteList.indexOf(url) === -1)
		{
			this.data.whiteList.push(url);
		}

		return this.save();
	}

	public inWhiteList(tab: ValidTab): boolean
	{
		const url = new URL(tab.url);
		const base_url = url.host + url.pathname;
		for (const path of this.data.whiteList)
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

	public whiteListRemove(tab: ValidTab): Promise<void>
	{
		const url = new URL(tab.url);
		const base_url = url.host + url.pathname;
		this.data.whiteList = this.data.whiteList.filter(x => !base_url.includes(x));
		return this.save();
	}

	public static readonly StorageKey = 'config';

	public static async load(): Promise<Configuration>
	{
		const config = new Configuration();
		config.data = await DataStorage.load(Configuration.StorageKey, ConfigurationData);
		config.upgradeVersion();
		return config;
	}

	private upgradeVersion(): void
	{
		if (this.data.version === 1)
		{
			this.data.faviconsMode = this.data.restoreScrollPosition ? FAVICON_MODE.Actual : FAVICON_MODE.NoDim;
			this.data.version = 2;
		}
	}

	public async save(): Promise<void>
	{
		await DataStorage.save(Configuration.StorageKey, this.data);
		return this.init();
	}
}