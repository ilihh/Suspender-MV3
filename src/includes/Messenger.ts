import { MESSAGE_TARGET, MESSAGE } from './constants';

export interface SuspenderResponse<T>
{
	success: boolean;
	data?: T;
	error?: string;
}

export interface SuspenderRequest
{
	action: MESSAGE;

	target?: MESSAGE_TARGET;
	tabId?: number;
	url?: string;
	urls?: string,
	suspended?: boolean,
	extensionId?: string,
	filename?: string;
}

export class Messenger
{
	public static action<T>(action: MESSAGE): Promise<SuspenderResponse<T>>
	{
		return Messenger.send<T>({ action: action });
	}

	public static send<T>(request: SuspenderRequest): Promise<SuspenderResponse<T>>
	{
		return chrome.runtime.sendMessage(request);
	}
}