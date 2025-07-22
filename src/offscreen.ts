import { MESSAGE_TARGET, MESSAGE } from './includes/constants';
import { SuspenderRequest, SuspenderResponse } from './includes/Messenger';

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

async function processMessage(): Promise<SuspenderResponse<boolean>>
{
	return {
		success: true,
		data: await getBatteryStatus(),
	};
}

chrome.runtime.onMessage.addListener((
	message: SuspenderRequest,
	_sender: chrome.runtime.MessageSender,
	sendResponse: (response?: SuspenderResponse<boolean>) => void
) =>
{
	if (message.target !== MESSAGE_TARGET.Offscreen)
	{
		return;
	}

	if (message.action === MESSAGE.BatteryStatus)
	{
		processMessage().then(sendResponse);
	}

	return true;
});