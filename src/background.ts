import { Suspender } from './includes/Suspender';
import { ALARM_TABS, MESSAGE, PAGE, TAB_STATUS } from './includes/constants';
import { Configuration } from './includes/Configuration';
import { ScrollPositions } from './includes/ScrollPositions';
import { getTab, isEnumValue } from './includes/functions';
import { SuspenderRequest, SuspenderResponse } from './includes/Messenger';
import { Session, Sessions } from './includes/Sessions';
import { isValidTab, ValidTab } from './includes/ValidTab';
import { TabInfo } from './includes/TabInfo';
import { MessageProcessor, MessageProcessorResult } from './includes/MessageProcessor';

// runtime
chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
	const config = await Configuration.load();
	await config.init();

	if (details.reason === 'install')
	{
		const suspender = new Suspender(config);
		await suspender.createTab(chrome.runtime.getURL(PAGE.Options), false, undefined, undefined, true);
	}
});

chrome.runtime.onStartup.addListener(async () => {
	const config = await Configuration.load();
	await config.init();

	await Sessions.updateRecent();
});

chrome.runtime.onMessage.addListener((request: SuspenderRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
	processMessage(request, sender).then(sendResponse);
	return true;
});

// tabs
chrome.tabs.onActivated.addListener(async (tabInfo: chrome.tabs.TabActiveInfo) => {
	const tab = await chrome.tabs.get(tabInfo.tabId);
	if (isValidTab(tab))
	{
		const config = await Configuration.load();
		const suspender = new Suspender(config);
		await suspender.updateTabActionIcon(tab);
	}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab)=> {
	if (!isValidTab(tab))
	{
		return;
	}

	if ('audible' in changeInfo)
	{
		await TabInfo.activated(tabId);
	}

	if (('status' in changeInfo) && (changeInfo.status === 'complete'))
	{
		const config = await Configuration.load();
		const suspender = new Suspender(config);
		await suspender.updateTabActionIcon(tab);

		if (config.data.restoreScrollPosition && !suspender.isSuspended(tab))
		{
			const positions = await ScrollPositions.load();
			const scroll = positions.get(tabId);
			if (scroll !== null)
			{
				await chrome.scripting.executeScript({
					target: {tabId: tabId,},
					world: 'MAIN',
					func: (scroll: number) =>
					{
						document.documentElement.scrollTop = scroll;
						// restore scroll position with a slight delay for sites that load additional data after the window.onload event (like steam)
						setTimeout(() => document.documentElement.scrollTop = scroll, 500);
					},
					args: [scroll],
				});

				await positions.remove(tabId);
			}
		}
	}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
	await TabInfo.destroy(tabId);
});

// alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
	if (alarm.name === ALARM_TABS)
	{
		const config = await Configuration.load();
		if (config.autoSuspend())
		{
			await (new Suspender(config)).suspendAuto();
		}

		await (await Session.current()).save();
	}
});

// context menu
chrome.contextMenus.onClicked.addListener(async (info, tab)=> {
	if (!isEnumValue(MESSAGE, info.menuItemId) || !isValidTab(tab))
	{
		return;
	}

	await executeMessage(tab, {action: info.menuItemId, url: info.linkUrl, });
});

chrome.commands.onCommand.addListener(async (action, tab)=> {
	if (!isEnumValue(MESSAGE, action) || !isValidTab(tab))
	{
		return;
	}

	await executeMessage(tab, {action: action});
});

async function processMessage(request: SuspenderRequest, sender: chrome.runtime.MessageSender): MessageProcessorResult
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

	return await executeMessage(tab, request);
}

async function executeMessage(tab: ValidTab, request: SuspenderRequest): Promise<SuspenderResponse<boolean>|SuspenderResponse<TAB_STATUS>|SuspenderResponse<void>>
{
	const config = await Configuration.load();
	const suspender = new Suspender(config);
	const processor = new MessageProcessor(tab, request, config, suspender);

	return await processor[request.action].bind(processor)();
}

async function start()
{
	const config = await Configuration.load();
	const alarm_config = config.alarmConfig();

	const alarm = await chrome.alarms.get(ALARM_TABS);
	if (alarm === undefined || alarm.periodInMinutes !== alarm_config.periodInMinutes)
	{
		await chrome.alarms.create(ALARM_TABS, alarm_config);
	}

	const suspender = new Suspender(config);
	await suspender.reloadTabs();
}

const _ = start();