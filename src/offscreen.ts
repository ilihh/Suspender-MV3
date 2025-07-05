import { MESSAGE_TARGET, MESSAGE } from './includes/constants';
import { Request, Response } from './includes/Messenger';

interface Battery
{
	charging?: boolean;
}

async function getBatteryStatus(): Promise<boolean>
{
	if ('getBattery' in navigator)
	{
		const battery = await (navigator as any).getBattery() as Battery;
		return battery.charging || true;
	}

	return true;
}

chrome.runtime.onMessage.addListener(async (message: Request, sender: chrome.runtime.MessageSender, sendResponse: (response?: Response<boolean>) => void) => {
	if (message.target !== MESSAGE_TARGET.Offscreen)
	{
		return;
	}

	if (message.action === MESSAGE.BatteryStatus)
	{
		sendResponse({
			success: false,
			data: await getBatteryStatus(),
		});
	}

	return true;
});