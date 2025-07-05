import {Session, Sessions, SessionWindow} from './includes/Sessions';
import { Configuration } from './includes/Configuration';
import {i18n, isHTMLElement, setInnerText} from './includes/functions';
import { Messenger } from './includes/Messenger';
import { MESSAGE } from './includes/constants';

type Keys<T extends object, TValue> = keyof Pick<T, { [K in keyof T]: T[K] extends TValue ? K : never }[keyof T]>;

function isBooleanKey<T extends object>(obj: T, key: keyof T): key is Keys<T, boolean>
{
	return key in obj && typeof obj[key as keyof T] === 'boolean';
}

function isArrayKey<T extends object>(obj: T, key: keyof T): key is Keys<T, Array<string>>
{
	return key in obj && Array.isArray(obj[key]);
}

function isNumberKey<T extends object>(obj: T, key: keyof T): key is Keys<T, number>
{
	return key in obj && typeof obj[key as keyof T] === 'number';
}

function clone(source: HTMLTemplateElement): HTMLElement
{
	return (source.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
}

class ConfigUI
{
	private readonly config: Configuration;
	private readonly root: HTMLElement;

	private readonly youtubePermissions: chrome.permissions.Permissions = {
		permissions: ['scripting'],
		origins: ['https://www.youtube.com/watch*'],
	};

	private readonly scrollPermissions: chrome.permissions.Permissions = {
		permissions: ['scripting'],
		origins: ["http://*/*", "https://*/*", "file://*/*"],
	};

	private readonly historyPermissions: chrome.permissions.Permissions = {
		permissions: ['history'],
	};

	private readonly downloadsPermissions: chrome.permissions.Permissions = {
		permissions: ['downloads'],
	};

	public constructor(root: HTMLElement, config: Configuration)
	{
		this.root = root;
		this.config = config;
		this.init();
	}

	private init(): void
	{
		if (Configuration.liteVersion)
		{
			this.root.querySelectorAll('[data-lite-version-disabled]').forEach(el => el.classList.add('hidden'));
		}

		const query = '.options-block[data-config] input[id], .options-block[data-config] select[id], .options-block[data-config] textarea[id]';
		const elements = this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(query);

		elements.forEach(el => {
			const key = el.id as keyof Configuration;
			if (!(key in this.config))
			{
				alert('Unknown field:' + key);
				return;
			}

			if (el instanceof HTMLInputElement && el.type === 'checkbox' && isBooleanKey<Configuration>(this.config, key))
			{
				el.checked = this.config[key];
				el.addEventListener('input', ev => this.onCheckboxInput(ev, el, key));
			}
			else if (el instanceof HTMLSelectElement && isNumberKey<Configuration>(this.config, key))
			{
				el.value = this.config[key].toString();
				el.addEventListener('input', ev => this.onSelectInput(ev, el, key));
			}
			else if (el instanceof HTMLTextAreaElement && isArrayKey<Configuration>(this.config, key))
			{
				el.value = (this.config[key] as string[]).join('\n');
				el.addEventListener('input', ev => this.onTextareaInput(ev, el, key));
			}
		});
	}

	private async requestPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
	{
		return await chrome.permissions.contains(permissions) || await chrome.permissions.request(permissions);
	}

	private async onCheckboxInput(ev: Event, el: HTMLInputElement, key: Keys<Configuration, boolean>): Promise<void>
	{
		if (el.checked)
		{
			el.checked = false;

			if (((key === 'maintainYoutubeTime') && !(await this.requestPermissions(this.youtubePermissions)))
				|| ((key === 'restoreScrollPosition') && !(await this.requestPermissions(this.scrollPermissions)))
				|| ((key === 'cleanupHistory') && !(await this.requestPermissions(this.historyPermissions)))
				|| ((key === 'exportSessions') && !(await this.requestPermissions(this.downloadsPermissions)))
			)
			{
				ev.preventDefault();
				el.checked = false;
				return;
			}

			el.checked = true;
		}

		this.config[key] = el.checked;
		this.config.save();
	}

	private onSelectInput(ev: Event, el: HTMLSelectElement, key: Keys<Configuration, number>): void
	{
		this.config[key] = parseInt(el.value, 10);
		this.config.save();
	}

	private onTextareaInput(ev: Event, el: HTMLTextAreaElement, key: Keys<Configuration, Array<string>>): void
	{
		this.config[key] = el.value.split('\n').map(s => s.trim());
		this.config.save();
	}
}

class ShortcutsUI
{
	private readonly root: HTMLElement;
	private readonly template: HTMLTemplateElement;
	private readonly container: HTMLElement;

	private readonly defaultDescription: string;
	private readonly defaultShortcut: string;

	public constructor(root: HTMLElement)
	{
		this.root = root;
		this.template = this.root.querySelector('template#command-template')! as HTMLTemplateElement;
		this.container = this.root.querySelector('#commands-list')!;
		const _ = this.build();

		this.defaultDescription = chrome.i18n.getMessage('page_options_commands_default_description');
		this.defaultShortcut = chrome.i18n.getMessage('page_options_commands_default_shortcut');
	}

	private async build(): Promise<void>
	{
		const commands = await chrome.commands.getAll();
		for (const command of commands)
		{
			const element = clone(this.template);
			setInnerText(element.querySelector('.command-description'), command.description || this.defaultDescription);
			setInnerText(element.querySelector('.command-shortcut'), command.shortcut || this.defaultShortcut);

			this.container.appendChild(element);
		}

		const open_shortcuts = this.root.querySelector('a')!;
		open_shortcuts.addEventListener('click', ev =>{
			ev.preventDefault();
			Messenger.action(MESSAGE.OpenShortcuts);
		});
	}
}

class SessionsUI
{
	private readonly sessions: Sessions;
	private readonly config: Configuration;
	private readonly root: HTMLElement;
	private readonly file: HTMLInputElement;
	private readonly file_import: HTMLButtonElement;

	private readonly templateSession: HTMLTemplateElement;
	private readonly templateWindow: HTMLTemplateElement;
	private readonly templateTab: HTMLTemplateElement;

	private readonly savePrompt: string;
	private readonly deleteConfirm: string;
	private readonly importError: string = '';

	public constructor(root: HTMLElement, sessions: Sessions, config: Configuration)
	{
		this.root = root;
		this.sessions = sessions;
		this.config = config;

		this.file = this.root.querySelector('input#session-file')!;
		this.file_import = this.root.querySelector('button#session-import')!;

		this.templateSession = this.root.querySelector('template#session-template')!;
		this.templateWindow = this.root.querySelector('template#window-template')!;
		this.templateTab = this.root.querySelector('template#tab-template')!;

		this.savePrompt = chrome.i18n.getMessage('page_options_sessions_save_prompt');
		this.deleteConfirm = chrome.i18n.getMessage('page_options_sessions_delete_confirm');
		this.importError = chrome.i18n.getMessage('page_options_sessions_import_error');

		const _ = this.build();
	}

	private async build()
	{
		this.file_import.addEventListener('click', () => this.file.click());
		this.file.addEventListener('input', () => {
			this.importFile();
			this.file.value = '';
		});

		this.renderSession(this.sessions.current, this.root.querySelector('#session-current')!, 'current');
		this.renderRecent();
		this.renderSaved();
	}

	private renderRecent(): void
	{
		const container = this.root.querySelector('#sessions-recent')! as HTMLElement;
		container.innerHTML = '';
		this.sessions.recent.forEach(session => this.renderSession(session, container, 'recent'));
	}

	private renderSaved(): void
	{
		const container = this.root.querySelector('#sessions-saved')! as HTMLElement;
		container.innerHTML = '';
		this.sessions.saved.forEach(session => this.renderSession(session, container, 'saved'));
	}

	private initSessionButton(session: Session, container: HTMLElement, type: 'current' | 'recent' | 'saved'): void
	{
		const btn_export = container.querySelector('button[data-export]')!;

		container.addEventListener('pointerenter', () => {
			if (isHTMLElement<HTMLButtonElement>(btn_export))
			{
				btn_export.disabled = !this.config.exportSessions;
			}
		});

		btn_export.addEventListener('click', async () => {
			const blob = new Blob([session.data], {type : 'text/plain'});
			const url = URL.createObjectURL(blob);

			await Messenger.send({
				action: MESSAGE.ExportSession,
				url: url,
				filename: `session ${session.name}.txt`,
			});

			URL.revokeObjectURL(url);
		});

		container.querySelector('button[data-save]')!.addEventListener('click', () =>
		{
			const name = (prompt(this.savePrompt) ?? '').trim();
			if (!name)
			{
				return;
			}

			this.sessions.saved.push(session.copy(name));
			this.sessions.save();
			this.renderSaved();
		});

		if (type !== 'current')
		{
			container.querySelector('button[data-open-suspended]')!.addEventListener('click', () => {
				const _ = Messenger.send({
					action: MESSAGE.OpenSession,
					urls: session.data,
					suspended: true,
				});
			});

			container.querySelector('button[data-open-loaded]')!.addEventListener('click', () => {
				const _ = Messenger.send({
					action: MESSAGE.OpenSession,
					urls: session.data,
					suspended: false,
				});
			});

			container.querySelector('button[data-delete]')!.addEventListener('click', () =>
			{
				if (!confirm(this.deleteConfirm))
				{
					return;
				}

				const index = this.sessions[type].indexOf(session, 0);
				if (index > -1)
				{
					this.sessions[type].splice(index, 1);
					this.sessions.save();

					if (type == 'recent')
					{
						this.renderRecent();
					}
					else
					{
						this.renderSaved();
					}
				}
			});
		}
	}

	private importFile()
	{
		if ((this.file.files === null)
			|| (this.file.files.length === 0)
			|| (!this.file.files[0])
			|| (this.file.files[0].type !== 'text/plain')
		)
		{
			alert(this.importError);
			return;
		}

		const file = this.file.files[0];
		const reader = new FileReader();
		reader.onload = (e) =>
		{
			const contents = e.target?.result;
			if (typeof contents === 'string')
			{
				this.parseFile(file.name, contents);
			}
		};
		reader.readAsText(file);
	}

	private parseFile(name: string, content: string): void
	{
		const ext = '.txt';
		if (name.endsWith(ext))
		{
			name = name.substring(0, name.length - ext.length);
		}

		name = (prompt(this.savePrompt, name) ?? '').trim();
		if (!name)
		{
			return;
		}

		const session = new Session(Session.createWindows(content), name);
		this.sessions.saved.push(session);
		this.sessions.save();
		this.renderSaved();
	}

	private createWindowView(window: SessionWindow, index: number): HTMLElement
	{
		const window_view = clone(this.templateWindow);

		setInnerText(
			window_view.querySelector('.window-name [data-name]'),
			chrome.i18n.getMessage('page_options_sessions_window', [index.toString()])
		);

		window_view.querySelector('.window-name button[data-open-suspended]')!.addEventListener('click', () => {
			const _ = Messenger.send({
				action: MESSAGE.OpenWindow,
				urls: window.toString(),
				suspended: true,
			})
		});

		window_view.querySelector('.window-name button[data-open-loaded]')!.addEventListener('click', () => {
			const _ = Messenger.send({
				action: MESSAGE.OpenWindow,
				urls: window.toString(),
				suspended: false,
			})
		});

		const tabs = window_view.querySelector('.window-tabs')!;
		for (const tab of window.tabs)
		{
			const tab_view = clone(this.templateTab);
			const a = tab_view.querySelector('a')!;
			a.innerText = tab;
			a.setAttribute('href', tab);

			tabs.appendChild(tab_view);
		}

		return window_view;
	}

	private renderSession(session: Session, container: HTMLElement, type: 'current' | 'recent' | 'saved')
	{
		const session_view = clone(this.templateSession);
		session_view.classList.add(`session-${type}`);

		this.initSessionButton(session, session_view, type);

		setInnerText(
			session_view.querySelector('a.session-name'),
			chrome.i18n.getMessage('page_options_session_name', [session.name, session.windows.toString(), session.tabs.toString()])
		);

		const windows = session_view.querySelector('.session-windows') as HTMLElement;

		let index = 1;
		for (const window of session.loadWindows())
		{
			windows.appendChild(this.createWindowView(window, index));
			index++;
		}

		session_view.querySelectorAll('button.toggle-session, a.session-name').forEach(el => {
			el.addEventListener('click', ev => {
				ev.preventDefault();
				windows.classList.toggle('hidden');
			});
		});

		container.appendChild(session_view);
	}
}

class MigrateUI
{
	private readonly root: HTMLElement;

	private readonly id: HTMLInputElement;

	private readonly btn: HTMLButtonElement;

	public constructor(root: HTMLElement)
	{
		this.root = root;
		this.id = this.root.querySelector('input#extension-id')!;
		this.btn = this.root.querySelector('button#extension-migrate')!;

		this.init();
	}

	private init()
	{
		this.id.addEventListener('input', ev => {
			this.btn.disabled = this.id.value.trim() === '';
		});

		this.btn.addEventListener('click', ev => {
			const _ = Messenger.send({
				action: MESSAGE.Migrate,
				extensionId: this.id.value.trim(),
			})
		});
	}
}

async function init()
{
	i18n(document);

	if (document.location.hash === '')
	{
		document.location.hash = '#settings';
	}

	const config = await Configuration.load();
	const sessions = await Sessions.load();

	const config_ui = new ConfigUI(document.getElementById('settings')!, config);
	const shortcuts_ui = new ShortcutsUI(document.getElementById('shortcuts')!);
	const sessions_ui = new SessionsUI(document.getElementById('sessions')!, sessions, config);
	const migrate_ui = new MigrateUI(document.getElementById('migrate')!);
}

document.addEventListener('DOMContentLoaded', () => init());