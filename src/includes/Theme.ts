import { THEMES } from './constants';
import { isEnumValue } from './functions';

export class Theme
{
	public static readonly storageKey: string = 'theme';

	public static async load(): Promise<THEMES>
	{
		const data = await chrome.storage.local.get([Theme.storageKey]);
		const value = data[Theme.storageKey];
		return isEnumValue(THEMES, value) ? value : THEMES.Auto;
	}

	public static async save(theme: THEMES): Promise<void>
	{
		return chrome.storage.local.set({ [Theme.storageKey]: theme });
	}

	public static async apply(body: HTMLElement): Promise<void>
	{
		let current = 'theme-auto';

		const update = async (): Promise<void> => {
			const theme = await Theme.load();

			body.classList.remove(current);
			current = `theme-${theme}`;
			body.classList.add(current);
		};

		await update();

		chrome.storage.local.onChanged.addListener(async changes => {
			if (Theme.storageKey in changes)
			{
				await update();
			}
		});
	}
}