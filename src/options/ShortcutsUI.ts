import { setInnerText } from '../includes/functions';
import { Messenger } from '../includes/Messenger';
import { MESSAGE } from '../includes/constants';
import { clone } from './functions';

export class ShortcutsUI
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
		this.template = this.root.querySelector<HTMLTemplateElement>('template#command-template')!;
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