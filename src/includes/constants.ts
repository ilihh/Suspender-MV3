export const ALARM_TABS = 'tabs';

export const TABS_QUERY_BASE: chrome.tabs.QueryInfo = {
	discarded: false,
	windowType: 'normal',
};

export const TABS_QUERY_AUTO: chrome.tabs.QueryInfo = Object.assign(TABS_QUERY_BASE, {
	status: 'complete',
});

export enum PAGE
{
	Suspended = 'suspended.html',
	Offscreen = 'offscreen.html',
	Options = 'options.html',
	Popup = 'popup.html',
}

export enum THEMES
{
	Auto = 'auto',
	Light = 'light',
	Dark = 'dark',
}

export enum MESSAGE_TARGET
{
	Offscreen = 'offscreen',
}

export enum MESSAGE
{
	// context menu
	OpenLinkInSuspendedTab = 'open_link_in_suspended_tab',

	TogglePauseTab = 'toggle_pause_tab',
	PauseTab = 'pause_tab',
	UnpauseTab = 'unpause_tab',

	WhitelistDomain = 'whitelist_domain',
	WhitelistUrl = 'whitelist_url',
	WhitelistRemove = 'whitelist_remove',

	ToggleSuspendTab = 'toggle_suspend_tab',
	SuspendTab = 'suspend_tab',
	UnsuspendTab = 'unsuspend_tab',

	SuspendGroup = 'suspend_group',
	SuspendGroupForced = 'suspend_group_forced',
	UnsuspendGroup = 'unsuspend_group',

	SuspendWindow = 'suspend_window',
	SuspendWindowForced = 'suspend_window_forced',
	UnsuspendWindow = 'unsuspend_window',

	SuspendAll = 'suspend_all',
	SuspendAllForced = 'suspend_all_forced',
	UnsuspendAll = 'unsuspend_all',

	// popup
	OpenSettings = 'open_settings',
	TabStatus = 'tab_status',

	// internal
	BatteryStatus = 'battery_status',
	OffscreenDimIcon = 'offscreen_dim_icon',
	DimIcon = 'dim_icon',

	// options
	OpenShortcuts = 'open_shortcuts',
	Migrate = 'migrate',

	// options: sessions
	OpenWindow = 'open_window',
	OpenSession = 'open_session',
}

export enum TAB_STATUS {
	Normal = 'normal', // can be suspended
	Suspended = 'suspended',
	Disabled = 'disabled', // disabled auto suspend
	Special = 'special', // page cannot be suspended -> extension, chrome, etc
	WhiteList = 'whitelist',
	PlayingAudio = 'playing_audio',
	UnsavedForm = 'unsaved_form',
	LocalFile = 'local_file',
	Active = 'active',
	Pinned = 'pinned',
	SuspendPaused = 'suspend_paused',
	Offline = 'offline',
	PowerConnected = 'power_connected', // power connected = not working from battery
	Error = 'error',
}

export enum SUSPEND_MODE
{
	Auto = 0,
	Normal = 1,
	Forced = 2,
}

export enum FAVICON_MODE
{
	// show actual icon, not dimmed
	NoDim = 'no_dim',

	// show icon from google, dimmed, requires access to the google.com
	Google = 'google',

	// show actual icon, dimmed, requires access to the all urls
	Actual = 'actual',
}

export const TAB_GROUP_ID_NONE = -1;