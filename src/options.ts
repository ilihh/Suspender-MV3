import { Session, Sessions, SessionWindow } from './includes/Sessions';
import { Configuration } from './includes/Configuration';
import { ConfigurationData } from './includes/ConfigurationData';
import { i18n, isEnumValue, isHTMLElement, setInnerText } from './includes/functions';
import { Messenger } from './includes/Messenger';
import { FAVICON_MODE, MESSAGE } from './includes/constants';
import { ContextMenu } from './includes/ContextMenu';

type Keys<T, V> = {
	[K in keyof T]-?: T[K] extends V ? K : never
}[keyof T];

function isKey<T extends object>(obj: T, key: PropertyKey): key is keyof T
{
	return Object.prototype.hasOwnProperty.call(obj, key);
}

function isBooleanKey<T extends object>(obj: T, key: keyof T): key is Keys<T, boolean>
{
	return key in obj && typeof obj[key as keyof T] === 'boolean';
}

function isNumberKey<T extends object>(obj: T, key: keyof T): key is Keys<T, number>
{
	return key in obj && typeof obj[key as keyof T] === 'number';
}

function isEnumKey<T extends object, TEnum>(
	obj: T,
	key: keyof T,
	enumObj: Record<string, TEnum>
): key is Keys<T, TEnum>
{
	return key in obj && Object.values(enumObj).includes(obj[key as keyof T] as TEnum);
}

// is there a better way to do this?
const configurationDataArrayStringKeys: { [K in Keys<ConfigurationData, string[]>]: boolean } = {
	whiteList: true,
};

function isConfigurationDataArrayStringKey<T extends object>(obj: T, key: keyof T): key is Keys<T, Array<string>>
{
	return key in obj && key in configurationDataArrayStringKeys && Array.isArray(obj[key]);
}

function clone(source: HTMLTemplateElement): HTMLElement
{
	return (source.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
}

class OptionWrapper
{
	public constructor(
		private readonly input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
		public readonly setter: () => void,
		private readonly listener: (ev: Event) => void,
	)
	{
		this.input = input;
		this.setter = setter;
		this.listener = listener;

		this.setter();
		this.input.addEventListener('input', this.listener);
	}
}

class ConfigUI
{
	private readonly options: OptionWrapper[] = [];

	private readonly inputs: (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

	private readonly iconsPermissions: {
		[k in FAVICON_MODE]?: () => Promise<boolean>
	};

	private readonly permissions: {
		[K in keyof ConfigurationData]?: () => Promise<boolean>
	};

	public constructor(
		private readonly root: HTMLElement,
		private readonly config: Configuration,
	)
	{
		this.permissions = {
			enableContextMenu: () => this.requestPermissions(ContextMenu.permissions),
			maintainYoutubeTime: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: ['https://www.youtube.com/watch*'],
			}),
			restoreScrollPosition: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: ["http://*/*", "https://*/*", "file://*/*"],
			}),
			neverSuspendUnsavedData: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: ["http://*/*", "https://*/*", "file://*/*"],
			}),
			cleanupHistory: () => this.requestPermissions({
				permissions: ['history'],
			}),
			exportSessions: () => this.requestPermissions({
				permissions: ['downloads'],
			}),
		};

		this.iconsPermissions = {
			[FAVICON_MODE.Google]: () => this.requestPermissions({
				origins: ["https://www.google.com/s2/favicons*"],
			}),
			[FAVICON_MODE.Actual]: () => this.requestPermissions({
				origins: ["http://*/*", "https://*/*", "file://*/*"],
			}),
		};

		const query = '.options-block[data-config] input[data-field],' +
			'.options-block[data-config] select[data-field],' +
			'.options-block[data-config] textarea[data-field]';
		this.inputs = Array.from(this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(query));
		this.init();
	}

	private init(): void
	{
		this.createOptions();

		chrome.storage.local.onChanged.addListener(async changes => {
			if (Configuration.StorageKey in changes)
			{
				await this.updateConfig();
			}
		});
	}

	private async updateConfig(): Promise<void>
	{
		const updated = await Configuration.load();
		Object.assign(this.config, updated);

		for (const option of this.options)
		{
			option.setter();
		}
	}

	private createOptions(): void
	{
		this.inputs.forEach(el => {
			const key = el.dataset['field'] ?? '';
			if (!isKey(this.config.data, key))
			{
				alert('Unknown field:' + key);
				return;
			}

			if (el instanceof HTMLInputElement)
			{
				if ((el.type === 'checkbox') && isBooleanKey(this.config.data, key))
				{
					this.options.push(new OptionWrapper(
						el,
						() => el.checked = this.config.data[key],
						ev => this.onCheckboxInput(ev, el, key),
					));
				}
				if ((el.type === 'radio') && isEnumKey(this.config.data, key, FAVICON_MODE))
				{
					this.options.push(new OptionWrapper(
						el,
						() => el.checked = this.config.data[key] === el.value,
						ev => this.onRadioInput(ev, el, key),
					));
				}
			}
			else if (el instanceof HTMLSelectElement && isNumberKey(this.config.data, key))
			{
				this.options.push(new OptionWrapper(
					el,
					() => el.value = this.config.data[key].toString(),
					() => this.onSelectInput(el, key),
				));
			}
			else if (el instanceof HTMLTextAreaElement && isConfigurationDataArrayStringKey(this.config.data, key))
			{
				this.options.push(new OptionWrapper(
					el,
					() => el.value = (this.config.data[key] as string[]).join('\n'),
					() => this.onTextareaInput(el, key),
				));
			}
		});
	}

	private async requestPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
	{
		return await chrome.permissions.contains(permissions) || await chrome.permissions.request(permissions);
	}

	private async onRadioInput(ev: Event, el: HTMLInputElement, key: Keys<ConfigurationData, FAVICON_MODE>): Promise<void>
	{
		if (!el.checked || !isEnumValue(FAVICON_MODE, el.value))
		{
			return;
		}

		// revert value back
		el.checked = false;
		for (const input of this.inputs)
		{
			if (input instanceof HTMLInputElement && (input.type === 'radio') && (input.value === this.config.data[key]))
			{
				input.checked = true;
				break;
			}
		}

		const permission = this.iconsPermissions[el.value];
		if (permission !== undefined && !await permission())
		{
			ev.preventDefault();
			return;
		}

		el.checked = true;

		this.config.data[key] = el.value;
		await this.saveConfig();
	}

	private async onCheckboxInput(ev: Event, el: HTMLInputElement, key: Keys<ConfigurationData, boolean>): Promise<void>
	{
		if (el.checked)
		{
			el.checked = false;

			const permission = this.permissions[key];
			if (permission !== undefined && !await permission())
			{
				ev.preventDefault();
				return;
			}

			el.checked = true;
		}

		this.config.data[key] = el.checked;
		await this.saveConfig();
	}

	private saveConfig(): Promise<void>
	{
		return this.config.save();
	}

	private async onSelectInput(el: HTMLSelectElement, key: Keys<ConfigurationData, number>): Promise<void>
	{
		this.config.data[key] = parseInt(el.value, 10);
		await this.saveConfig();
	}

	private async onTextareaInput(el: HTMLTextAreaElement, key: Keys<ConfigurationData, Array<string>>): Promise<void>
	{
		this.config.data[key] = el.value.split('\n').map(s => s.trim());
		await this.saveConfig();
	}
}

class ShortcutsUI
{
	private readonly template: HTMLTemplateElement;
	private readonly container: HTMLElement;

	private readonly defaultDescription: string;
	private readonly defaultShortcut: string;

	public constructor(
		private readonly root: HTMLElement,
	)
	{
		this.root = root;
		this.template = this.root.querySelector('template#command-template')! as HTMLTemplateElement;
		this.container = this.root.querySelector('#commands-list')!;

		this.defaultDescription = chrome.i18n.getMessage('page_options_commands_default_description');
		this.defaultShortcut = chrome.i18n.getMessage('page_options_commands_default_shortcut');

		void this.build();
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
			Messenger.action<void>(MESSAGE.OpenShortcuts);
		});
	}
}

class SessionsUI
{
	private readonly file: HTMLInputElement;
	private readonly file_import: HTMLButtonElement;

	private readonly templateSession: HTMLTemplateElement;
	private readonly templateWindow: HTMLTemplateElement;
	private readonly templateTab: HTMLTemplateElement;

	private readonly savePrompt: string;
	private readonly deleteConfirm: string;
	private readonly importError: string = '';

	public constructor(
		private readonly root: HTMLElement,
		private readonly sessions: Sessions,
		private readonly config: Configuration,
	)
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

		this.build();
	}

	private build(): void
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

	private renderSessionsBlock(type: 'recent' | 'saved'): void
	{
		type === 'recent' ? this.renderRecent() : this.renderSaved();
	}

	private renderRecent(): void
	{
		const container = this.root.querySelector('#sessions-recent')! as HTMLElement;
		container.innerHTML = '';
		this.sessions.recent.toReversed().forEach(session => this.renderSession(session, container, 'recent'));
	}

	private renderSaved(): void
	{
		const container = this.root.querySelector('#sessions-saved')! as HTMLElement;
		container.innerHTML = '';
		this.sessions.saved.toReversed().forEach(session => this.renderSession(session, container, 'saved'));
	}

	private initSessionButton(session: Session, container: HTMLElement, type: 'current' | 'recent' | 'saved'): void
	{
		const btn_export = container.querySelector('button[data-export]')!;

		container.addEventListener('pointerenter', () => {
			if (isHTMLElement<HTMLButtonElement>(btn_export))
			{
				btn_export.disabled = !this.config.data.exportSessions;
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

		container.querySelector('button[data-save]')!.addEventListener('click', async () =>
		{
			const name = (prompt(this.savePrompt) ?? '').trim();
			if (!name)
			{
				return;
			}

			this.sessions.saved.push(session.copy(name));
			await this.sessions.save();
			this.renderSaved();
		});

		if (type !== 'current')
		{
			container.querySelector('button[data-open-suspended]')!.addEventListener('click', async () => {
				await Messenger.send({
					action: MESSAGE.OpenSession,
					urls: session.data,
					suspended: true,
				});
			});

			container.querySelector('button[data-open-loaded]')!.addEventListener('click', async () => {
				await Messenger.send({
					action: MESSAGE.OpenSession,
					urls: session.data,
					suspended: false,
				});
			});

			container.querySelector('button[data-rename]')!.addEventListener('click', async () =>
			{
				const name = (prompt(this.savePrompt, session.name) ?? '').trim();
				if (!name)
				{
					return;
				}

				session.name = name;
				await this.sessions.save();
				this.renderSessionsBlock(type);
			});

			container.querySelector('button[data-delete]')!.addEventListener('click', async () =>
			{
				if (!confirm(this.deleteConfirm))
				{
					return;
				}

				const index = this.sessions[type].indexOf(session, 0);
				if (index > -1)
				{
					this.sessions[type].splice(index, 1);
					await this.sessions.save();
					this.renderSessionsBlock(type);
				}
			});
		}
	}

	private importFile(): void
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
		reader.onload = async (e) =>
		{
			const contents = e.target?.result;
			if (typeof contents === 'string')
			{
				await this.parseFile(file.name, contents);
			}
		};
		reader.readAsText(file);
	}

	private async parseFile(name: string, content: string): Promise<void>
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
		await this.sessions.save();
		this.renderSaved();
	}

	private createWindowView(window: SessionWindow, index: number): HTMLElement
	{
		const window_view = clone(this.templateWindow);

		setInnerText(
			window_view.querySelector('.window-name [data-name]'),
			chrome.i18n.getMessage('page_options_sessions_window', [index.toString()])
		);

		window_view.querySelector('.window-name button[data-open-suspended]')!.addEventListener('click', async () => {
			await Messenger.send({
				action: MESSAGE.OpenWindow,
				urls: window.toString(),
				suspended: true,
			})
		});

		window_view.querySelector('.window-name button[data-open-loaded]')!.addEventListener('click', async () => {
			await Messenger.send({
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

	private renderSession(session: Session, container: HTMLElement, type: 'current' | 'recent' | 'saved'): void
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
	private readonly id: HTMLInputElement;

	private readonly btn: HTMLButtonElement;

	public constructor(
		private readonly root: HTMLElement,
	)
	{
		this.root = root;
		this.id = this.root.querySelector('input#extension-id')!;
		this.btn = this.root.querySelector('button#extension-migrate')!;

		this.init();
	}

	private init()
	{
		this.id.addEventListener('input', async () => {
			const id = this.id.value.trim();
			this.btn.disabled = (id.length === 32) && (id !== chrome.runtime.id);
		});

		this.btn.addEventListener('click', async () => {
			await Messenger.send({
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

	new ConfigUI(document.getElementById('settings')!, config);
	new ShortcutsUI(document.getElementById('shortcuts')!);
	new SessionsUI(document.getElementById('sessions')!, sessions, config);
	new MigrateUI(document.getElementById('migrate')!);
}

document.addEventListener('DOMContentLoaded', () => init());