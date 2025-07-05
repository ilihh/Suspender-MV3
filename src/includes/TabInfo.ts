export class TabInfo
{
	public scrollPosition: number;
	public time: number|null;

	public constructor(scroll_position: number = 0, time: number|null = null)
	{
		this.scrollPosition = scroll_position;
		this.time = time;
	}

	public static async get(tab: chrome.tabs.Tab, request_time: boolean): Promise<TabInfo>
	{
		if (tab.id === undefined)
		{
			return new TabInfo();
		}

		const func = request_time
			? () => {
				const video = document.querySelector('video.video-stream.html5-main-video') as HTMLVideoElement|null;
				alert(video);
				const seconds = video !== null ? Math.floor(video.currentTime) : null;
				alert(seconds);
				const scroll_position = (document.documentElement || document.body || {}).scrollTop || 0;
				alert(scroll_position);
				return {
					scrollPosition: Math.floor(scroll_position),
					time: seconds,
				};
			}
			: () => {
				const scroll_position = (document.documentElement || document.body || {}).scrollTop || 0;
				return {
					scrollPosition: Math.floor(scroll_position),
					time: null,
				};
			};

		const results = await chrome.scripting.executeScript({
			target: { tabId: tab.id, },
			injectImmediately: true,
			func: func,
		});

		for (const r of results)
		{
			const data = r.result || null;
			if ((data !== undefined) && (data !== null))
			{
				return new TabInfo(data.scrollPosition, data.time);
			}
		}

		return new TabInfo();
	}
}