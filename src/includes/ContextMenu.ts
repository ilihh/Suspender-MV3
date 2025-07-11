import { MESSAGE } from './constants';

export class ContextMenu
{
	private static updating: Promise<void>|null = null;

	public static async create(enable: boolean): Promise<void>
	{
		if (ContextMenu.updating === null)
		{
			ContextMenu.updating = ContextMenu.update(enable);
		}

		await ContextMenu.updating;
		ContextMenu.updating = null;
	}

	private static async update(enable: boolean): Promise<void>
	{
		await chrome.contextMenus.removeAll();

		if (enable)
		{
			ContextMenu.setItems();
		}
	}

	private static setItems(): void
	{
		const contexts: [`${chrome.contextMenus.ContextType}`, ...`${chrome.contextMenus.ContextType}`[]] = [
			chrome.contextMenus.ContextType.PAGE,
			chrome.contextMenus.ContextType.FRAME,
			chrome.contextMenus.ContextType.EDITABLE,
			chrome.contextMenus.ContextType.IMAGE,
			chrome.contextMenus.ContextType.VIDEO,
			chrome.contextMenus.ContextType.AUDIO,
		];

		chrome.contextMenus.create({
			id: MESSAGE.OpenLinkInSuspendedTab,
			title: chrome.i18n.getMessage('action_open_link_in_suspended_tab'),
			contexts: ['link'],
		});

		chrome.contextMenus.create({
			id: MESSAGE.ToggleSuspendTab,
			title: chrome.i18n.getMessage('action_toggle_suspend_tab'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.TogglePauseTab,
			title: chrome.i18n.getMessage('action_toggle_pause_tab'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.WhitelistDomain,
			title: chrome.i18n.getMessage('action_whitelist_domain'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.WhitelistUrl,
			title: chrome.i18n.getMessage('action_whitelist_url'),
			contexts: contexts,
		});

		chrome.contextMenus.create({
			id: 'separator-0',
			type: 'separator',
			contexts: contexts,
		});

		chrome.contextMenus.create({
			id: MESSAGE.SuspendGroup,
			title: chrome.i18n.getMessage('action_suspend_group'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.SuspendGroupForced,
			title: chrome.i18n.getMessage('action_suspend_group_forced'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.UnsuspendGroup,
			title: chrome.i18n.getMessage('action_unsuspend_group'),
			contexts: contexts,
		});

		chrome.contextMenus.create({
			id: 'separator-1',
			type: 'separator',
			contexts: contexts,
		});

		chrome.contextMenus.create({
			id: MESSAGE.SuspendWindow,
			title: chrome.i18n.getMessage('action_suspend_window'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.SuspendWindowForced,
			title: chrome.i18n.getMessage('action_suspend_window_forced'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.UnsuspendWindow,
			title: chrome.i18n.getMessage('action_unsuspend_window'),
			contexts: contexts,
		});

		chrome.contextMenus.create({
			id: 'separator-2',
			type: 'separator',
			contexts: contexts,
		});

		chrome.contextMenus.create({
			id: MESSAGE.SuspendAll,
			title: chrome.i18n.getMessage('action_suspend_all'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.SuspendAllForced,
			title: chrome.i18n.getMessage('action_suspend_all_forced'),
			contexts: contexts,
		});
		chrome.contextMenus.create({
			id: MESSAGE.UnsuspendAll,
			title: chrome.i18n.getMessage('action_unsuspend_all'),
			contexts: contexts,
		});
	}
}