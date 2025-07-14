import { SuspendedURL } from './includes/SuspendedURL';
import { MESSAGE } from './includes/constants';
import { Messenger } from './includes/Messenger';
import { i18n, isHTMLElement, setInnerText } from './includes/functions';
import { Configuration } from './includes/Configuration';
import { Theme } from './includes/Theme';

async function unsuspend_page(): Promise<void>
{
	await Messenger.action<void>(MESSAGE.UnsuspendTab);
}

async function init()
{
	const info = SuspendedURL.fromSuspendedUrl(document.location.href);
	const config = await Configuration.load();

	const [nav] = performance.getEntriesByType('navigation');
	if (nav && ('type' in nav) && (nav.type === 'reload'))
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

	await Theme.apply(document.body);
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
		shortcuts.addEventListener('click', ev =>{
			ev.preventDefault();
			ev.stopPropagation();
			Messenger.action<void>(MESSAGE.OpenShortcuts);
		});
	}

	await setIcons(info, config);
}

async function setIcons(info: SuspendedURL, config: Configuration)
{
	const img_icon = document.getElementById('favicon');
	const link_icon = document.getElementById('favicon-url');
	if (isHTMLElement<HTMLImageElement>(img_icon) && isHTMLElement<HTMLLinkElement>(link_icon))
	{
		const fav_icon = info.getIcon(config.data.faviconsMode, img_icon.src);

		img_icon.src = fav_icon.url;
		link_icon.href = await fav_icon.dimmed();
	}
}

window.addEventListener('DOMContentLoaded', () => init());