import { Sessions } from './includes/Sessions';
import { Configuration } from './includes/Configuration';
import { i18n, isLocalFilesAllowed } from './includes/functions';
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

	i18n(document);
}

document.addEventListener('DOMContentLoaded', () => init());