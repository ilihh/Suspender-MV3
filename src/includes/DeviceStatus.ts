import { Offscreen } from './Offscreen';
import { MESSAGE_TARGET, MESSAGE, PAGE } from './constants';
import { Messenger } from './Messenger';

export class DeviceStatus
{
	public online: boolean;
	public powerOn: boolean;

	private constructor(online: boolean = true, power: boolean = true)
	{
		this.online = online;
		this.powerOn = power;
	}

	public get offline(): boolean
	{
		return !this.online;
	}

	public static async get(): Promise<DeviceStatus>
	{
		await Offscreen.requireOffscreenDocument(PAGE.Offscreen);

		const battery = await Messenger.send<boolean>({
			action: MESSAGE.BatteryStatus,
			target: MESSAGE_TARGET.Offscreen,
		});

		return new DeviceStatus(navigator.onLine, battery.data ?? true);
	}
}