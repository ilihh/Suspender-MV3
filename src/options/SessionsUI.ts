import { Session, Sessions, SessionWindow } from '../includes/Sessions';
import { Configuration } from '../includes/Configuration';
import { isHTMLElement, setInnerText } from '../includes/functions';
import { Messenger } from '../includes/Messenger';
import { MESSAGE } from '../includes/constants';
import { clone } from './functions';

export class SessionsUI
{
	private readonly file: HTMLInputElement;
	private readonly file_import: HTMLButtonElement;

	private readonly templateSession: HTMLTemplateElement;
	private readonly templateWindow: HTMLTemplateElement;
	private readonly templateTab: HTMLTemplateElement;

	private readonly savePrompt: string;
	private readonly deleteConfirm: string;
	private readonly importError: string = '';

	private readonly currentContainer: HTMLElement;
	private readonly recentContainer: HTMLElement;
	private readonly savedContainer: HTMLElement;

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

		this.currentContainer = this.root.querySelector<HTMLElement>('#session-current')!;
		this.recentContainer = this.root.querySelector<HTMLElement>('#sessions-recent')!;
		this.savedContainer = this.root.querySelector<HTMLElement>('#sessions-saved')!;

		this.build();
	}

	public setConfig(config: Configuration): void
	{
		Object.assign(this.config, config);

		this.renderSessions();
	}

	private build(): void
	{
		this.file_import.addEventListener('click', () => this.file.click());
		this.file.addEventListener('input', () =>
		{
			this.importFile();
			this.file.value = '';
		});

		this.renderSessions();
	}

	private renderSessions(): void
	{
		this.renderCurrent();
		this.renderRecent();
		this.renderSaved();
	}

	private renderSessionsBlock(type: 'recent' | 'saved'): void
	{
		type === 'recent' ? this.renderRecent() : this.renderSaved();
	}

	private renderCurrent(): void
	{
		this.currentContainer.innerHTML = '';
		this.renderSession(this.sessions.current, this.currentContainer, 'current');
	}

	private renderRecent(): void
	{
		this.recentContainer.innerHTML = '';
		this.sessions.recent.toReversed().forEach(session => this.renderSession(session, this.recentContainer, 'recent'));
	}

	private renderSaved(): void
	{
		this.savedContainer.innerHTML = '';
		this.sessions.saved.toReversed().forEach(session => this.renderSession(session, this.savedContainer, 'saved'));
	}

	private initSessionButton(session: Session, container: HTMLElement, type: 'current' | 'recent' | 'saved'): void
	{
		const btn_export = container.querySelector('button[data-export]')!;

		container.addEventListener('pointerenter', () =>
		{
			if (isHTMLElement<HTMLButtonElement>(btn_export))
			{
				btn_export.disabled = !this.config.data.exportSessions;
			}
		});

		btn_export.addEventListener('click', async () =>
		{
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
			container.querySelector('button[data-open-suspended]')!.addEventListener('click', async () =>
			{
				await Messenger.send({
					action: MESSAGE.OpenSession,
					urls: session.data,
					suspended: true,
				});
			});

			container.querySelector('button[data-open-loaded]')!.addEventListener('click', async () =>
			{
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

		window_view.querySelector('.window-name button[data-open-suspended]')!.addEventListener('click', async () =>
		{
			await Messenger.send({
				action: MESSAGE.OpenWindow,
				urls: window.toString(),
				suspended: true,
			})
		});

		window_view.querySelector('.window-name button[data-open-loaded]')!.addEventListener('click', async () =>
		{
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

		const windows = session_view.querySelector<HTMLElement>('.session-windows')!;

		let index = 1;
		for (const window of session.loadWindows())
		{
			windows.appendChild(this.createWindowView(window, index));
			index++;
		}

		session_view.querySelectorAll('button.toggle-session, a.session-name').forEach(el =>
		{
			el.addEventListener('click', ev =>
			{
				ev.preventDefault();
				windows.classList.toggle('hidden');
			});
		});

		container.appendChild(session_view);
	}
}