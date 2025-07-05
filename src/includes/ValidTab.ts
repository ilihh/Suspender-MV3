export interface ValidTab extends chrome.tabs.Tab
{
	id: number;
	url: string;
}

export function isValidTab(tab: chrome.tabs.Tab | null | undefined): tab is ValidTab
{
	return (tab !== undefined) && (tab !== null) && (tab.id !== undefined) && (tab.url !== undefined);
}