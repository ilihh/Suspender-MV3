import { MESSAGE, TAB_STATUS } from './includes/constants';
import { i18n, isEnumValue, isHTMLElement } from './includes/functions';
import { Messenger } from './includes/Messenger';
import { Theme } from './includes/Theme';
import { Tabs } from './includes/Tabs';

async function executeAction(action: MESSAGE, tabId: number): Promise<void>
{
	const actions = document.querySelectorAll<HTMLDivElement>('div.action-group, div.divider');
	actions.forEach(x => x.classList.add('hidden'));

	const progress = document.querySelector<HTMLDivElement>('div.action-progress')!;
	progress.classList.remove('hidden');

	await Messenger.send({
		action: action,
		tabId: tabId,
	});
	window.close();
}

async function init()
{
	const tab = await Tabs.active();
	if (!tab || (tab.id === undefined))
	{
		return;
	}

	const tab_id = tab.id;
	const status = await Messenger.send<TAB_STATUS>({
		action: MESSAGE.TabStatus,
		tabId: tab_id,
	});

	if (status.data == undefined)
	{
		status.data = TAB_STATUS.Error;
	}

	const status_block = document.getElementById('status');
	if (isHTMLElement(status_block))
	{
		status_block.innerText = chrome.i18n.getMessage('tab_status_' + status.data);
		status_block.classList.add(status.data === TAB_STATUS.Normal ? 'status-valid' : 'status-invalid');
	}

	document.querySelectorAll('[data-action]').forEach(el => {
		if (isHTMLElement<HTMLElement>(el) && el.dataset['action'])
		{
			const action = el.dataset['action'];
			el.dataset['i18n'] = 'action_' + action;

			if (isEnumValue(MESSAGE, action))
			{
				el.addEventListener('click', async () => executeAction(action, tab_id));
			}
		}
	});

	const allow_suspend = [
		TAB_STATUS.Disabled,
		TAB_STATUS.Offline,
		TAB_STATUS.PowerConnected,
		TAB_STATUS.Pinned,
		TAB_STATUS.PlayingAudio,
		TAB_STATUS.SuspendPaused,
		TAB_STATUS.WhiteList,
		TAB_STATUS.Active,
		TAB_STATUS.UnsavedForm,
		TAB_STATUS.Normal,
	];

	const disable_pause = [TAB_STATUS.Disabled, TAB_STATUS.SuspendPaused, TAB_STATUS.WhiteList];
	const allow_pause = allow_suspend.filter(x => !disable_pause.includes(x));

	const allow_whitelist: TAB_STATUS[] = allow_suspend.filter(x => x != TAB_STATUS.WhiteList);

	// show/hide buttons on condition
	const conditions = {
		[MESSAGE.SuspendTab]: allow_suspend.includes(status.data),
		[MESSAGE.UnsuspendTab]: status.data === TAB_STATUS.Suspended,
		[MESSAGE.PauseTab]: allow_pause.includes(status.data),
		[MESSAGE.UnpauseTab]: status.data === TAB_STATUS.SuspendPaused,

		[MESSAGE.WhitelistDomain]: allow_whitelist.includes(status.data),
		[MESSAGE.WhitelistUrl]: allow_whitelist.includes(status.data),
		[MESSAGE.WhitelistRemove]: status.data === TAB_STATUS.WhiteList,

		[MESSAGE.SuspendGroup]: tab.groupId !== -1,
		[MESSAGE.SuspendGroupForced]: tab.groupId !== -1,
		[MESSAGE.UnsuspendGroup]: tab.groupId !== -1,
	};

	for (const [action, display] of Object.entries(conditions))
	{
		const el = document.querySelector(`[data-action="${action}"]`)?.closest('.action');
		if (!display && isHTMLElement(el))
		{
			el.classList.add('hidden');
		}
	}

	document.querySelectorAll('.action-group').forEach(el => {
		const visible = el.querySelectorAll('.action:not(.hidden)').length > 0;
		if (!visible)
		{
			el.classList.add('hidden');
		}
	})

	await Theme.apply(document.body);
	i18n(document);
}

window.addEventListener('DOMContentLoaded', () => init());