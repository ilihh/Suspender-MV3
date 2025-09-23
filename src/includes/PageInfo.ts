import { ValidTab } from './ValidTab';
import { isUrlAllowed } from './functions';
import { ConfigurationData } from './ConfigurationData';
import { INJECT_PROHIBITED_DOMAINS } from './constants';

interface InternalPageInfo
{
	scrollPosition: number;
	time: number | null;
	changedFields: boolean;
}

export class PageInfo implements InternalPageInfo
{
	public constructor(
		public readonly scrollPosition: number = 0,
		public readonly time: number|null = null,
		public readonly changedFields: boolean = false,
	)
	{
	}

	public static async get(tab: ValidTab, data: ConfigurationData): Promise<PageInfo|false>
	{
		const prohibited = INJECT_PROHIBITED_DOMAINS.includes((new URL(tab.url)).hostname);
		const can_inject = !prohibited && await isUrlAllowed(tab.url);
		if (!can_inject)
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

		const result = results[0]?.result;
		if (result !== undefined)
		{
			return new PageInfo(result.scrollPosition, result.time, result.changedFields);
		}

		return new PageInfo();
	}

	private static async inject(tabId: number, scroll: boolean, time: boolean, changed_fields: boolean): Promise<chrome.scripting.InjectionResult<InternalPageInfo>[]|false>
	{
		try
		{
			return await chrome.scripting.executeScript({
				target: { tabId: tabId, },
				world: 'MAIN',
				injectImmediately: true,
				func: (scroll: boolean, time: boolean, changed_fields: boolean): InternalPageInfo =>
				{
					const youtube_time = () =>
					{
						const video = document.querySelector<HTMLVideoElement>('video.video-stream.html5-main-video');
						return video !== null ? Math.floor(video.currentTime) : null;
					};

					const is_field_changed = (el: HTMLElement) =>
					{
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

						return false;
					};

					const any_field_changed = (form: HTMLFormElement) =>
					{
						const elements = Array.from(form.querySelectorAll<HTMLElement>('input, textarea, select'));
						for (const el of elements)
						{
							if (is_field_changed(el))
							{
								return true;
							}
						}

						return false;
					};

					const any_form_changed = () =>
					{
						const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[method="post"]'));
						for (const form of forms)
						{
							if (any_field_changed(form))
							{
								return true;
							}
						}

						return false;
					};

					const scroll_position = scroll
						? document.documentElement.scrollTop || 0
						: 0;

					return {
						scrollPosition: Math.floor(scroll_position),
						time: time ? youtube_time() : null,
						changedFields: changed_fields ? any_form_changed() : false,
					};
				},
				args: [scroll, time, changed_fields, ],
			});
		}
		// prevent error on internal chrome pages like ERR_CONNECTION_CLOSED
		catch (e)
		{
			return false;
		}
	}
}