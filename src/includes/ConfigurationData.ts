import { FAVICON_MODE } from './constants';

export class ConfigurationData
{
	public version: number = 1;

	// alarm timer, in minutes, hidden, not editable by user
	public timer: number = 3;

	public suspendDelay: number = 60;

	public suspendActive: boolean = false;

	public suspendPinned: boolean = false;

	public suspendPlayingAudio: boolean = false;

	public suspendOffline: boolean = false;

	public neverSuspendUnsavedData: boolean = true;

	public neverSuspendWhenPowerOn: boolean = false;

	public whiteList: string[] = [];

	public restoreScrollPosition: boolean = false;

	public maintainYoutubeTime: boolean = false;

	public faviconsMode: FAVICON_MODE = FAVICON_MODE.NoDim;

	public discardTabs: boolean = false;

	public enableContextMenu: boolean = true;

	public cleanupHistory: boolean = false;

	public exportSessions: boolean = false;

	// decide against implementation
	public syncProfile: boolean = true;
}