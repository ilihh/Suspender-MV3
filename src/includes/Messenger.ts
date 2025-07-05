import { MESSAGE_TARGET, MESSAGE } from './constants';

export interface Response<T>
{
	success: boolean;
	data?: T;
	error?: string;
}

export interface RequestBase extends Record<any, any>
{
	target?: MESSAGE_TARGET;
	tabId?: number;
}

export interface Request extends RequestBase
{
	action: MESSAGE;
	url?: string;
	urls?: string,
	suspended?: boolean,
}

export class Messenger
{
	public static action<T>(action: MESSAGE): Promise<Response<T>>
	{
		return Messenger.send<T>({ action: action });
	}

	public static send<T>(request: Request): Promise<Response<T>>
	{
		return chrome.runtime.sendMessage(request);
	}
}