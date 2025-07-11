import { Offscreen } from './Offscreen';
import { MESSAGE_TARGET, MESSAGE, PAGE } from './constants';
import { Messenger } from './Messenger';

export class DeviceStatus
{
	private constructor(
		public online: boolean = true,
		public powerOn: boolean = true,
	)
	{
	}

	public static async get(): Promise<DeviceStatus>
	{
		await Offscreen.requireOffscreenDocument(PAGE.Offscreen);

		const battery = await Messenger.send<boolean>({
			action: MESSAGE.BatteryStatus,
			target: MESSAGE_TARGET.Offscreen,
		});

		const b = battery !== undefined
			? (battery?.data ?? true)
			: true;
		return new DeviceStatus(navigator.onLine, b);
	}
}