import { SuspenderRequest, SuspenderResponse } from './Messenger';
import { SUSPEND_MODE, MESSAGE, PAGE, TAB_STATUS } from './constants';
import { ValidTab } from './ValidTab';
import { Configuration } from './Configuration';
import { Suspender } from './Suspender';
import { TabInfo } from './TabInfo';
import { Session, SessionWindow } from './Sessions';

export type MessageProcessorResult = Promise<SuspenderResponse<boolean> | SuspenderResponse<TAB_STATUS> | SuspenderResponse<void>>;

type MessageProcessorMap = {
	[K in MESSAGE]: () => MessageProcessorResult;
};

export class MessageProcessor implements MessageProcessorMap
{
	constructor(
		private readonly tab: ValidTab,
		private readonly request: SuspenderRequest,
		private readonly config : Configuration,
		private readonly suspender: Suspender
	)
	{
	}

	/**
	 * only for Offscreen
	 */
	async [MESSAGE.BatteryStatus](): Promise<SuspenderResponse<void>>
	{
		return { success: false, };
	}

	async [MESSAGE.TabStatus](): Promise<SuspenderResponse<TAB_STATUS>>
	{
		return {
			success: true,
			data: await this.suspender.getTabStatus(this.tab),
		};
	}

	async [MESSAGE.OpenLinkInSuspendedTab](): Promise<SuspenderResponse<void>>
	{
		const url = this.request.url ?? '';
		if (url.trim() !== '')
		{
			return { success: false, };
		}

		await this.suspender.createTab(url, true, this.tab.id, this.tab.index + 1);
		return { success: true, };
	}

	async [MESSAGE.OpenSettings](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.createTab(chrome.runtime.getURL(PAGE.Options), false, this.tab.id, this.tab.index + 1, true);
		await this.suspender.reloadTabs();
		return { success: true, };
	}

	async [MESSAGE.OpenShortcuts](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.createTab('chrome://extensions/shortcuts', false, this.tab.id, this.tab.index + 1, true);
		return { success: true, };
	}

	async [MESSAGE.Migrate](): Promise<SuspenderResponse<void>>
	{
		const extension_id = this.request.extensionId ?? '';
		await this.suspender.migrate(extension_id.trim());
		return { success: true, };
	}

	async [MESSAGE.TogglePauseTab](): Promise<SuspenderResponse<void>>
	{
		await TabInfo.togglePause(this.tab.id);
		return { success: true, };
	}

	async [MESSAGE.PauseTab](): Promise<SuspenderResponse<void>>
	{
		await TabInfo.pause(this.tab.id);
		return { success: true, };
	}

	async [MESSAGE.UnpauseTab](): Promise<SuspenderResponse<void>>
	{
		await TabInfo.unpause(this.tab.id);
		return { success: true, };
	}

	async [MESSAGE.WhitelistDomain](): Promise<SuspenderResponse<void>>
	{
		await this.config.whitelistDomain(this.tab);
		return { success: true, };
	}

	async [MESSAGE.WhitelistUrl](): Promise<SuspenderResponse<void>>
	{
		await this.config.whitelistUrl(this.tab);
		return { success: true, };
	}

	async [MESSAGE.WhitelistRemove](): Promise<SuspenderResponse<void>>
	{
		await this.config.whiteListRemove(this.tab);
		return { success: true, };
	}

	async [MESSAGE.ToggleSuspendTab](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendToggle(this.tab);
		return { success: true, };
	}

	async [MESSAGE.SuspendTab](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspend(this.tab);
		return { success: true, };
	}

	async [MESSAGE.UnsuspendTab](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.unsuspend(this.tab);
		return { success: true, };
	}

	async [MESSAGE.SuspendGroup](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendGroup(this.tab.id, SUSPEND_MODE.Normal);
		return { success: true, };
	}

	async [MESSAGE.SuspendGroupForced](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendGroup(this.tab.id, SUSPEND_MODE.Forced);
		return { success: true, };
	}

	async [MESSAGE.UnsuspendGroup](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.unsuspendGroup(this.tab.id);
		return { success: true, };
	}

	async [MESSAGE.SuspendWindow](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendWindow(this.tab.id, SUSPEND_MODE.Normal);
		return { success: true, };
	}

	async [MESSAGE.SuspendWindowForced](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendWindow(this.tab.id, SUSPEND_MODE.Forced);
		return { success: true, };
	}

	async [MESSAGE.UnsuspendWindow](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.unsuspendWindow(this.tab.id);
		return { success: true, };
	}

	async [MESSAGE.SuspendAll](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendAll(SUSPEND_MODE.Normal);
		return { success: true, };
	}

	async [MESSAGE.SuspendAllForced](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.suspendAll(SUSPEND_MODE.Forced);
		return { success: true, };
	}

	async [MESSAGE.UnsuspendAll](): Promise<SuspenderResponse<void>>
	{
		await this.suspender.unsuspendAll();
		return { success: true, };
	}

	async [MESSAGE.OpenWindow](): Promise<SuspenderResponse<void>>
	{
		const urls = this.request.urls ?? '';
		const suspended = this.request.suspended ?? false;
		await this.suspender.openWindow(SessionWindow.create(urls), suspended);
		return { success: true, };
	}

	async [MESSAGE.OpenSession](): Promise<SuspenderResponse<void>>
	{
		const urls = this.request.urls ?? '';
		const suspended = this.request.suspended ?? false;
		await this.suspender.openSession(Session.createWindows(urls), suspended);
		return { success: true, };
	}
}