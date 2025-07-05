import { SuspendedURL } from './includes/SuspendedURL';
import { MESSAGE } from './includes/constants';
import { Messenger } from './includes/Messenger';
import { getSuspendedIcon, isHTMLElement, setInnerText, i18n } from './includes/functions';
import {Configuration} from "./includes/Configuration";

function unsuspend_page()
{
	const _ = Messenger.action(MESSAGE.UnsuspendTab);
}

async function init()
{
	const info = SuspendedURL.fromSuspendedUrl(document.location.href);
	const config = await Configuration.load();

	const [navigationEntry] = performance.getEntriesByType('navigation');
	if (('type' in navigationEntry) && (navigationEntry.type === 'reload'))
	{
		unsuspend_page();
	}

	i18n(document);

	document.title = info.title;

	setInnerText(document.getElementById('title'), info.title);

	const u = new URL(info.uri);
	setInnerText(document.getElementById('url'), u.host + (u.pathname !== '/' ? u.pathname : ''));

	const unsuspend = document.getElementById('suspended');
	if (unsuspend !== null)
	{
		unsuspend.addEventListener('click', () => unsuspend_page());
	}

	const img_icon = document.getElementById('favicon');
	const link_icon = document.getElementById('favicon-url');
	if (isHTMLElement<HTMLImageElement>(img_icon) && isHTMLElement<HTMLLinkElement>(link_icon))
	{
		const icon = info.getIcon(img_icon.src);

		img_icon.src = icon;
		link_icon.href = config.enableDimmedIcons() ? await getSuspendedIcon(icon) : icon;
	}

	const shortcuts = document.getElementById('shortcuts');
	if (isHTMLElement<HTMLAnchorElement>(shortcuts))
	{
		shortcuts.href = chrome.runtime.getURL(shortcuts.href);
	}
}

window.addEventListener('DOMContentLoaded', () => init());