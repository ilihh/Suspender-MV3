import { Suspender } from './includes/Suspender';
import { ALARM_TABS, MESSAGE, PAGE, SUSPEND_MODE, TAB_STATUS } from './includes/constants';
import { Configuration } from './includes/Configuration';
import { ScrollPositions } from './includes/ScrollPositions';
import { getTab, isEnumValue, string2filename } from './includes/functions';
import { Messenger, Request, RequestBase, Response } from './includes/Messenger';
import { Session, Sessions, SessionWindow } from './includes/Sessions';
import { isValidTab, ValidTab } from './includes/ValidTab';

async function start()
{
	const config = await Configuration.load();
	const alarm_config = config.alarmConfig();

	const alarm = await chrome.alarms.get(ALARM_TABS);
	if (alarm === undefined || alarm.periodInMinutes !== alarm_config.periodInMinutes)
	{
		const _ = chrome.alarms.create(ALARM_TABS, alarm_config);
	}

	const suspender = await Suspender.create(config);
	suspender.reloadTabs();
}

const _ = start();

chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === ALARM_TABS)
	{
		const config = await Configuration.load();
		if (config.autoSuspend())
		{
			const _ = (await Suspender.create(config)).suspendAuto();
		}

		(await Session.current()).save();
	}
});

chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
	const config = await Configuration.load();
	await config.init();

	if (details.reason === 'install')
	{
		const suspender = await Suspender.create(config);
		const _ = suspender.createTab(chrome.runtime.getURL(PAGE.Options), false, undefined, undefined, true);
	}
});


chrome.runtime.onStartup.addListener(async () => {
	const config = await Configuration.load();
	const _ = config.init();
	config.clearIgnoredTabs();
	(await ScrollPositions.load()).clear();

	await Sessions.updateRecent();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab)=> {
	if (!isValidTab(tab))
	{
		return;
	}

	const config = await Configuration.load();
	const suspender = await Suspender.create(config);
	await suspender.updateTabActionIcon(tab);

	if (config.restoreScrollPosition && (changeInfo.status === 'complete') && !suspender.isSuspended(tab))
	{
		const positions = await ScrollPositions.load();
		const scroll = positions.get(tabId);
		if (scroll !== null)
		{
			const _ = chrome.scripting.executeScript({
				target: { tabId: tabId, },
				world: 'MAIN',
				func: (scroll: number) =>
				{
					document.documentElement.scrollTop = scroll;
					// restore scroll position with a slight delay for sites that load additional data after the window.onload event (like steam)
					setTimeout(() => document.documentElement.scrollTop = scroll, 500);
				},
				args: [scroll],
			});

			positions.remove(tabId);
		}
	}
});

chrome.tabs.onActivated.addListener(async (tabInfo: chrome.tabs.TabActiveInfo) => {
	const tab = await chrome.tabs.get(tabInfo.tabId);
	if (isValidTab(tab))
	{
		const config = await Configuration.load();
		const suspender = await Suspender.create(config);
		await suspender.updateTabActionIcon(tab);
	}
});

chrome.contextMenus.onClicked.addListener(async (info, tab)=> {
	if (!isEnumValue(MESSAGE, info.menuItemId) || !isValidTab(tab))
	{
		return;
	}

	const _ = runAction(tab, info.menuItemId, { url: info.linkUrl, });
});

chrome.commands.onCommand.addListener(async (action, tab)=> {
	if (!isEnumValue(MESSAGE, action) || !isValidTab(tab))
	{
		return;
	}

	const _ = runAction(tab, action, {});
});

chrome.runtime.onMessage.addListener((request: Request, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
	processMessage(request, sender).then(sendResponse);
	return true;
});

async function processMessage(request: Request, sender: chrome.runtime.MessageSender): Promise<Response<boolean>|Response<TAB_STATUS>|Response<void>>
{
	const action = 'action' in request ? request.action : null;
	if (!isEnumValue(MESSAGE, action))
	{
		return {
			success: false,
			error: `Unknown action: "${action}"`,
		};
	}

	const tab = await getTab(request, sender);
	if (!isValidTab(tab))
	{
		return {
			success: false,
			error: 'Unknown or invalid tab',
		};
	}

	const result = await runAction(tab, action, request);
	return result;
}

async function runAction(tab: ValidTab, action: MESSAGE, request: RequestBase): Promise<Response<boolean>|Response<TAB_STATUS>|Response<void>>
{
	const config = await Configuration.load();
	const suspender = await Suspender.create(config);

	switch (action)
	{
		case MESSAGE.TabStatus:
			return {
				success: true,
				data: suspender.getTabStatus(tab),
			};

		case MESSAGE.OpenLinkInSuspendedTab:
			const url = request.url ?? '';
			if ((typeof url !== 'string') || (url.trim() !== ''))
			{
				return { success: false, };
			}

			const _0 = suspender.createTab(url, true, tab.id, tab.index + 1);
			break;

		case MESSAGE.OpenSettings:
			const _1 = suspender.createTab(chrome.runtime.getURL(PAGE.Options), false, tab.id, tab.index + 1, true);
			const _1x = suspender.reloadTabs();
			break;

		case MESSAGE.OpenShortcuts:
			const _2 = suspender.createTab('chrome://extensions/shortcuts', false, tab.id, tab.index + 1, true);
			break;

		case MESSAGE.Migrate:
			const extension_id = request.extensionId ?? '';
			if (typeof extension_id !== 'string')
			{
				return { success: false, };
			}

			const _3 = suspender.migrate(extension_id.trim());
			break;

		case MESSAGE.TogglePauseTab:
			config.togglePauseTab(tab.id);
			break;
		case MESSAGE.PauseTab:
			config.pauseTab(tab.id);
			break;
		case MESSAGE.UnpauseTab:
			config.unpauseTab(tab.id);
			break;

		case MESSAGE.WhitelistDomain:
			config.whitelistDomain(tab);
			const _30 = Messenger.action<void>(MESSAGE.ConfigurationChanged);
			break;
		case MESSAGE.WhitelistUrl:
			config.whitelistUrl(tab);
			const _31 = Messenger.action<void>(MESSAGE.ConfigurationChanged);
			break;
		case MESSAGE.WhitelistRemove:
			config.whiteListRemove(tab);
			const _32 = Messenger.action<void>(MESSAGE.ConfigurationChanged);
			break;

		case MESSAGE.ToggleSuspendTab:
			const _10 = suspender.suspendToggle(tab);
			break;
		case MESSAGE.SuspendTab:
			const _11 = suspender.suspend(tab);
			break;
		case MESSAGE.UnsuspendTab:
			const _12 = suspender.unsuspend(tab);
			break;

		case MESSAGE.SuspendGroup:
			const _13 = suspender.suspendGroup(tab.id, SUSPEND_MODE.Normal);
			break;
		case MESSAGE.SuspendGroupForced:
			const _14 = suspender.suspendGroup(tab.id, SUSPEND_MODE.Forced);
			break;
		case MESSAGE.UnsuspendGroup:
			const _15 = suspender.unsuspendGroup(tab.id);
			break;

		case MESSAGE.SuspendWindow:
			const _16 = suspender.suspendWindow(tab.id, SUSPEND_MODE.Normal);
			break;
		case MESSAGE.SuspendWindowForced:
			const _17 = suspender.suspendWindow(tab.id, SUSPEND_MODE.Forced);
			break;
		case MESSAGE.UnsuspendWindow:
			const _18 = suspender.unsuspendWindow(tab.id);
			break;

		case MESSAGE.SuspendAll:
			const _19 = suspender.suspendAll(SUSPEND_MODE.Normal);
			break;
		case MESSAGE.SuspendAllForced:
			const _20 = suspender.suspendAll(SUSPEND_MODE.Forced);
			break;
		case MESSAGE.UnsuspendAll:
			const _21 = suspender.unsuspendAll();
			break;

		case MESSAGE.OpenWindow:
			{
				const urls = request.urls ?? '';
				if (typeof urls !== 'string')
				{
					return { success: false, };
				}

				const suspended = (request.suspended ?? false) === true;
				const _ = suspender.openWindow(SessionWindow.create(urls), suspended);
			}
			break;
		case MESSAGE.OpenSession:
			{
				const urls = request.urls ?? '';
				if (typeof urls !== 'string')
				{
					return { success: false, };
				}

				const suspended = (request.suspended ?? false) === true;
				const _ = suspender.openSession(Session.createWindows(urls), suspended);
			}
			break;
		case MESSAGE.ExportSession:
			{
				const url = request.url ?? '';
				const filename = request.filename ?? '';
				if (!config.exportSessions || (typeof url !== 'string') || (typeof filename !== 'string') || !filename.trim())
				{
					return { success: false, };
				}

				await chrome.downloads.download({
					url: url,
					filename: string2filename(filename),
				});
			}

			break;
	}

	return { success: true, };
}