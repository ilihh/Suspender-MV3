import { MESSAGE, MESSAGE_TARGET } from './includes/constants';
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

function dimIcon(url: string): Promise<string>
{
	return new Promise((resolve) =>
	{
		const img = document.createElement('img');

		img.addEventListener('load', () =>
		{
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;

			const ctx = canvas.getContext('2d');
			if (ctx === null)
			{
				resolve(url);
				return;
			}

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			// make semi-transparent
			const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const pixels = data.data;
			for (let x = 0; x < pixels.length; x += 4)
			{
				pixels[x + 3] = Math.round((pixels[x + 3] ?? 0) * 0.5);
			}
			ctx.putImageData(data, 0, 0);

			resolve(canvas.toDataURL());
		});

		img.crossOrigin = 'anonymous';
		img.src = url;
	});
}

async function processMessage(message: SuspenderRequest): Promise<SuspenderResponse<boolean> | SuspenderResponse<string>>
{
	let data: boolean | string = false;
	if (message.action == MESSAGE.BatteryStatus)
	{
		data = await getBatteryStatus();
	}
	else if ((message.action == MESSAGE.OffscreenDimIcon) && ('url' in message) && (typeof message.url === 'string'))
	{
		data = await dimIcon(message.url);
	}

	return {
		success: true,
		data: data,
	};
}

chrome.runtime.onMessage.addListener((
	message: SuspenderRequest,
	_sender: chrome.runtime.MessageSender,
	sendResponse: (response?: SuspenderResponse<boolean> | SuspenderResponse<string>) => void
) =>
{
	if (message.target !== MESSAGE_TARGET.Offscreen)
	{
		return;
	}

	if ((message.action === MESSAGE.BatteryStatus)
		|| (message.action === MESSAGE.OffscreenDimIcon))
	{
		processMessage(message).then(sendResponse);
	}

	return true;
});