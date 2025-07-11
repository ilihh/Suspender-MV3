import { SuspenderRequest } from './Messenger';

export const isHTMLElement = <T extends HTMLElement>(
	el: Element|EventTarget|null|undefined,
	constructor: { new (...args: any[]): T } = HTMLElement as any): el is T =>
{
	return el instanceof constructor;
}

export function isEnumValue<T extends Record<string, string | number>>(
	enumObj: T,
	value: unknown
): value is T[keyof T]
{
	return Object.values(enumObj).includes(value as T[keyof T]);
}

export async function canDimIcon(icon: string): Promise<boolean>
{
	// can dim own icons and data image
	if (icon.startsWith('img/') || icon.startsWith('data:image/'))
	{
		return true;
	}

	return isUrlAllowed(icon);
}

export async function isUrlAllowed(url: string): Promise<boolean>
{
	const permissions: chrome.permissions.Permissions = {
		origins: [url],
	};
	return await chrome.permissions.contains(permissions);
}

export async function getDimmedIcon(icon: string): Promise<string>
{
	// ensure that icons can be dimmed
	if (!await canDimIcon(icon))
	{
		return icon;
	}

	return new Promise((resolve) => {
		const img = document.createElement('img');
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;

			const ctx = canvas.getContext('2d');
			if (ctx === null)
			{
				resolve(icon);
				return;
			}

			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

			// make semi-transparent
			const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const pixels = data.data;
			for (let x = 0; x < pixels.length; x += 4)
			{
				pixels[x + 3] = Math.round(pixels[x + 3] * 0.5);
			}
			ctx.putImageData(data, 0, 0);

			resolve(canvas.toDataURL());
		}

		img.crossOrigin = 'anonymous';
		img.src = icon;
	});
}

export function setInnerText(element: HTMLElement|null, text: string): void
{
	if (element === null)
	{
		return;
	}

	element.innerText = text;
}

export function i18n(document: Document): void
{
	document.querySelectorAll('[data-i18n]').forEach(e => {
		if (isHTMLElement<HTMLElement>(e) && e.dataset.i18n)
		{
			e.innerText = e.dataset.i18nArgs
				? chrome.i18n.getMessage(e.dataset.i18n, e.dataset.i18nArgs.split(';'))
				: chrome.i18n.getMessage(e.dataset.i18n);
		}
	});
}

export async function getTab(request: SuspenderRequest, sender: chrome.runtime.MessageSender): Promise<chrome.tabs.Tab|null>
{
	if (request.tabId !== undefined)
	{
		return await chrome.tabs.get(request.tabId);
	}

	const tab = sender.tab;
	if ((tab === undefined) || (tab.id === undefined))
	{
		return null;
	}

	return tab;
}

export function string2filename(str: string): string
{
	const replaces = {
		':': '-',
		'?': '-',
		'\\': ' - ',
		'\/': ' - ',
		'|': '_',
		'&#65279;': '',
		'~': '-',
		'"': '-',
		'<': '«',
		'>': '»',
		'–': '-',
		'`': '-',
		'!': '-',
		'@': '-',
		'#': '-',
		'$': '-',
		'%': '-',
		'^': '-',
		';': '-',
		'&': '-',
		'*': '-',
	};

	for (const [k, v] of Object.entries(replaces))
	{
		str = str.split(k).join(v);
	}

	return str.trim();
}