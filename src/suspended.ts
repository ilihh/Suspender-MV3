import { SuspendedURL } from './includes/SuspendedURL';
import { FAVICON_MODE, MESSAGE } from './includes/constants';
import { Messenger } from './includes/Messenger';
import { getDimmedIcon, i18n, isHTMLElement, setInnerText } from './includes/functions';
import { Configuration } from './includes/Configuration';

async function unsuspend_page(): Promise<void>
{
	await Messenger.action<void>(MESSAGE.UnsuspendTab);
}

async function init()
{
	const info = SuspendedURL.fromSuspendedUrl(document.location.href);
	const config = await Configuration.load();

	const [navigationEntry] = performance.getEntriesByType('navigation');
	if (('type' in navigationEntry) && (navigationEntry.type === 'reload'))
	{
		if (info.update)
		{
			info.update = false;
			document.location.hash = info.hash;
		}
		else
		{
			await unsuspend_page();
			return;
		}
	}

	i18n(document);

	document.title = info.title;
	setInnerText(document.getElementById('title'), info.title);

	const u = new URL(info.uri);
	const url_el = document.getElementById('url');
	if (isHTMLElement<HTMLAnchorElement>(url_el))
	{
		url_el.innerText = u.host + (u.pathname !== '/' ? u.pathname : '');
		url_el.href = info.uri;
	}

	const unsuspend = document.getElementById('suspended');
	if (unsuspend !== null)
	{
		unsuspend.addEventListener('click', unsuspend_page);
	}

	const shortcuts = document.getElementById('shortcuts');
	if (isHTMLElement<HTMLAnchorElement>(shortcuts))
	{
		shortcuts.href = chrome.runtime.getURL(shortcuts.href);
	}

	await setIcons(info, config);
}

async function setIcons(info: SuspendedURL, config: Configuration)
{
	const img_icon = document.getElementById('favicon');
	const link_icon = document.getElementById('favicon-url');
	if (isHTMLElement<HTMLImageElement>(img_icon) && isHTMLElement<HTMLLinkElement>(link_icon))
	{
		const { icon, dim } = info.getIcon(config.data.faviconsMode, img_icon.src);

		img_icon.src = icon;
		link_icon.href = dim ? await getDimmedIcon(icon) : icon;
	}
}

window.addEventListener('DOMContentLoaded', () => init());