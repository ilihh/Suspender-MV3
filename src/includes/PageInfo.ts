import { ValidTab } from './ValidTab';
import { isUrlAllowed } from './functions';
import { ConfigurationData } from './ConfigurationData';

interface InternalPageInfo
{
	scrollPosition: number;
	time: number | null;
	changedFields: boolean;
}

export class PageInfo implements InternalPageInfo
{
	public constructor(
		public scrollPosition: number = 0,
		public time: number|null = null,
		public changedFields: boolean = false,
	)
	{
	}

	public static async get(tab: ValidTab, data: ConfigurationData): Promise<PageInfo|false>
	{
		if (!await isUrlAllowed(tab.url))
		{
			return new PageInfo();
		}

		const results = await PageInfo.inject(
			tab.id,
			data.restoreScrollPosition,
			data.maintainYoutubeTime && tab.url.startsWith('https://www.youtube.com/watch'),
			data.neverSuspendUnsavedData,
		);
		if (results === false)
		{
			return false;
		}

		for (const r of results)
		{
			const data = r.result || null;
			if ((data !== undefined) && (data !== null))
			{
				return new PageInfo(data.scrollPosition, data.time, data.changedFields);
			}
		}

		return new PageInfo();
	}

	private static async inject(tabId: number, scroll: boolean, time: boolean, changed_fields: boolean): Promise<chrome.scripting.InjectionResult<InternalPageInfo>[]|false>
	{
		try
		{
			return  await chrome.scripting.executeScript({
				target: { tabId: tabId, },
				world: 'MAIN',
				injectImmediately: true,
				func: (scroll: boolean, time: boolean, changed_fields: boolean): InternalPageInfo => {
					const youtube_time = () => {
						const video = document.querySelector('video.video-stream.html5-main-video') as HTMLVideoElement | null;
						return  video !== null ? Math.floor(video.currentTime) : null;
					};

					const any_field_changed = () =>
					{
						const elements = Array.from(document.querySelectorAll('input, textarea, select'));
						for (const el of elements)
						{
							if (!(el instanceof HTMLElement))
							{
								continue;
							}

							if (el instanceof HTMLInputElement)
							{
								if (el.type === 'checkbox' || el.type === 'radio')
								{
									if (el.checked !== el.defaultChecked)
									{
										return true;
									}
								}
								else if (el.type === 'file')
								{
									if (el.files && el.files.length > 0)
									{
										return true;
									}
								}
								else
								{
									if (el.value !== el.defaultValue)
									{
										return true;
									}
								}
							}
							else if (el instanceof HTMLTextAreaElement)
							{
								if (el.value !== el.defaultValue)
								{
									return true;
								}
							}
							else if (el instanceof HTMLSelectElement)
							{
								const options = Array.from(el.options);
								for (const opt of options)
								{
									if (opt.selected !== opt.defaultSelected)
									{
										return true;
									}
								}
							}
						}

						return false;
					};

					const seconds = time ? youtube_time() : null;

					const scroll_position = scroll
						? (document.documentElement || document.body || {}).scrollTop || 0
						: 0;

					const changed = changed_fields ? any_field_changed() : false;

					return {
						scrollPosition: Math.floor(scroll_position),
						time: seconds,
						changedFields: changed,
					};
				},
				args: [scroll, time, changed_fields]
			});
		}
		// prevent error on internal chrome pages like ERR_CONNECTION_CLOSED
		catch (e)
		{
			return false;
		}
	}
}