import { Sessions } from './includes/Sessions';
import { Configuration } from './includes/Configuration';
import { escapeHtml, i18n, isLocalFilesAllowed } from './includes/functions';
import { ConfigUI } from './options/ConfigUI';
import { ShortcutsUI } from './options/ShortcutsUI';
import { SessionsUI } from './options/SessionsUI';
import { MigrateUI } from './options/MigrateUI';
import { AboutUI } from './options/AboutUI';

async function init(): Promise<void>
{
	if (document.location.hash === '')
	{
		document.location.hash = '#settings';
	}

	const config = await Configuration.load();
	const sessions = await Sessions.load();
	const local_files_allowed = await isLocalFilesAllowed();

	new ConfigUI(document.getElementById('settings')!, config, local_files_allowed);
	new ShortcutsUI(document.getElementById('shortcuts')!);
	new SessionsUI(document.getElementById('sessions')!, sessions, config);
	new MigrateUI(document.getElementById('migrate')!);
	new AboutUI(document.getElementById('about')!);

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

	i18n(document);
}

document.addEventListener('DOMContentLoaded', () => init());