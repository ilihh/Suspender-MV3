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

export async function isUrlAllowed(url: string): Promise<boolean>
{
	const permissions: chrome.permissions.Permissions = {
		origins: [url],
	};
	return await chrome.permissions.contains(permissions);
}

export function isLocalFilesAllowed(): Promise<boolean>
{
	return chrome.extension.isAllowedFileSchemeAccess();
}

export function setInnerText(element: HTMLElement|null, text: string): void
{
	if (element === null)
	{
		return;
	}

	element.innerText = text;
}

export function escapeHtml(str: string): string
{
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function i18n(document: Document): void
{
	document.querySelectorAll('[data-i18n]').forEach(e => {
		if (isHTMLElement<HTMLElement>(e) && e.dataset['i18n'])
		{
			e.innerText = chrome.i18n.getMessage(e.dataset['i18n']);
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

export function delay(ms: number): Promise<void>
{
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function isDataImage(url: string|null): url is string
{
	return url !== null && url.startsWith('data:image/');
}