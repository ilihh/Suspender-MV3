import { Sessions } from './includes/Sessions';
import { Configuration } from './includes/Configuration';
import { escapeHtml, i18n, isLocalFilesAllowed } from './includes/functions';
import { ConfigUI } from './options/ConfigUI';
import { ShortcutsUI } from './options/ShortcutsUI';
import { SessionsUI } from './options/SessionsUI';
import { MigrateUI } from './options/MigrateUI';
import { AboutUI } from './options/AboutUI';
import { Theme } from './includes/Theme';

async function init(): Promise<void>
{
	if (document.location.hash === '')
	{
		document.location.hash = '#settings';
	}

	const config = await Configuration.load();
	const sessions = await Sessions.load();
	const local_files_allowed = await isLocalFilesAllowed();
	const theme = await Theme.load();

	const config_ui = new ConfigUI(document.getElementById('settings')!, config, local_files_allowed, theme);
	new ShortcutsUI(document.getElementById('shortcuts')!);
	const session_ui = new SessionsUI(document.getElementById('sessions')!, sessions, config);
	new MigrateUI(document.getElementById('migrate')!);
	new AboutUI(document.getElementById('about')!);

	chrome.storage.local.onChanged.addListener(async changes => {
		if (Configuration.storageKey in changes)
		{
			const config = await Configuration.load();
			config_ui.setConfig(config);
			session_ui.setConfig(config);
		}

		if (Theme.storageKey in changes)
		{
			config_ui.setTheme(await Theme.load());
		}
	});

	const migrate_comment_id = 'page_options_migrate_comment';
	const migrate_comment = document.getElementById(migrate_comment_id);
	if (migrate_comment)
	{
		const raw = chrome.i18n.getMessage(migrate_comment_id);
		const safe = escapeHtml(raw);

		migrate_comment.innerHTML = safe
			.replace('__CODE__', '<code>chrome-extension://<b>liekplgjlphohhlnfaibkdjindpnfimg</b>/suspended.html</code>')
			.replace('__ID__', '<b>liekplgjlphohhlnfaibkdjindpnfimg</b>');
	}

	await Theme.apply(document.body);
	i18n(document);
}

document.addEventListener('DOMContentLoaded', () => init());