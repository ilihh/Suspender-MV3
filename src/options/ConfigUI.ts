import { Configuration } from '../includes/Configuration';
import { ConfigurationData } from '../includes/ConfigurationData';
import { isEnumValue } from '../includes/functions';
import { FAVICON_MODE } from '../includes/constants';
import { ContextMenu } from '../includes/ContextMenu';

type Keys<T, V> = {
	[K in keyof T]-?: T[K] extends V ? K : never
}[keyof T];

function isKey<T extends object>(obj: T, key: PropertyKey): key is keyof T
{
	return Object.prototype.hasOwnProperty.call(obj, key);
}

function isBooleanKey<T extends object>(obj: T, key: keyof T): key is Keys<T, boolean>
{
	return key in obj && typeof obj[key as keyof T] === 'boolean';
}

function isNumberKey<T extends object>(obj: T, key: keyof T): key is Keys<T, number>
{
	return key in obj && typeof obj[key as keyof T] === 'number';
}

function isEnumKey<T extends object, TEnum>(
	obj: T,
	key: keyof T,
	enumObj: Record<string, TEnum>
): key is Keys<T, TEnum>
{
	return key in obj && Object.values(enumObj).includes(obj[key as keyof T] as TEnum);
}

// is there a better way to do this?
const configurationDataArrayStringKeys: { [K in Keys<ConfigurationData, string[]>]: boolean } = {
	whiteList: true,
};

function isConfigurationDataArrayStringKey<T extends object>(obj: T, key: keyof T): key is Keys<T, Array<string>>
{
	return key in obj && key in configurationDataArrayStringKeys && Array.isArray(obj[key]);
}

class OptionWrapper
{
	public constructor(
		public readonly field: keyof ConfigurationData,
		public readonly input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
		public readonly setter: () => void,
		private readonly listener: (ev: Event) => void,
	)
	{
		this.input = input;
		this.setter = setter;
		this.listener = listener;

		this.setter();
		this.input.addEventListener('input', this.listener);
	}
}

export class ConfigUI
{
	private readonly options: OptionWrapper[] = [];

	private readonly inputs: (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

	private readonly iconsPermissions: {
		[k in FAVICON_MODE]?: () => Promise<boolean>
	};

	private readonly permissions: {
		[K in keyof ConfigurationData]?: () => Promise<boolean>
	};

	public constructor(
		private readonly root: HTMLElement,
		private readonly config: Configuration,
		private readonly isLocalFilesAllowed: boolean,
	)
	{
		const origins = this.isLocalFilesAllowed
			? ["http://*/*", "https://*/*", "file://*/*"]
			: ["http://*/*", "https://*/*", ]

		this.permissions = {
			enableContextMenu: () => this.requestPermissions(ContextMenu.permissions),
			maintainYoutubeTime: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: ['https://www.youtube.com/watch*'],
			}),
			suspendLocalFiles: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: ["file://*/*", ],
			}),
			restoreScrollPosition: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: origins,
			}),
			neverSuspendUnsavedData: () => this.requestPermissions({
				permissions: ['scripting'],
				origins: origins,
			}),
			cleanupHistory: () => this.requestPermissions({
				permissions: ['history'],
			}),
			exportSessions: () => this.requestPermissions({
				permissions: ['downloads'],
			}),
		};

		this.iconsPermissions = {
			[FAVICON_MODE.Google]: () => this.requestPermissions({
				origins: ["https://www.google.com/s2/favicons*"],
			}),
			[FAVICON_MODE.Actual]: () => this.requestPermissions({
				origins: origins,
			}),
		};

		const query = '.options-block[data-config] input[data-field],' +
			'.options-block[data-config] select[data-field],' +
			'.options-block[data-config] textarea[data-field]';
		this.inputs = Array.from(this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(query));
		void this.init();
	}

	private async init(): Promise<void>
	{
		const files_comment = this.root.querySelector<HTMLDivElement>('div.comment[data-i18n="page_options_suspend_local_files_permissions"]');
		if (files_comment !== null)
		{
			files_comment.dataset['i18nArgs'] = chrome.runtime.id;
		}

		this.createOptions();

		chrome.storage.local.onChanged.addListener(async changes => {
			if (Configuration.StorageKey in changes)
			{
				await this.updateConfig();
			}
		});
	}

	private async updateConfig(): Promise<void>
	{
		const updated = await Configuration.load();
		Object.assign(this.config, updated);

		for (const option of this.options)
		{
			option.setter();
		}
	}

	private createOptions(): void
	{
		this.inputs.forEach(el => {
			const key = el.dataset['field'] ?? '';
			if (!isKey(this.config.data, key))
			{
				alert('Unknown field:' + key);
				return;
			}

			if (key === 'suspendLocalFiles')
			{
				el.disabled = !this.isLocalFilesAllowed;
			}

			if (el instanceof HTMLInputElement)
			{
				if ((el.type === 'checkbox') && isBooleanKey(this.config.data, key))
				{
					this.options.push(new OptionWrapper(
						key,
						el,
						() => el.checked = this.config.data[key],
						ev => this.onCheckboxInput(ev, el, key),
					));
				}
				if ((el.type === 'radio') && isEnumKey(this.config.data, key, FAVICON_MODE))
				{
					this.options.push(new OptionWrapper(
						key,
						el,
						() => el.checked = this.config.data[key] === el.value,
						ev => this.onRadioInput(ev, el, key),
					));
				}
			}
			else if (el instanceof HTMLSelectElement && isNumberKey(this.config.data, key))
			{
				this.options.push(new OptionWrapper(
					key,
					el,
					() => el.value = this.config.data[key].toString(),
					() => this.onSelectInput(el, key),
				));
			}
			else if (el instanceof HTMLTextAreaElement && isConfigurationDataArrayStringKey(this.config.data, key))
			{
				this.options.push(new OptionWrapper(
					key,
					el,
					() => el.value = (this.config.data[key] as string[]).join('\n'),
					() => this.onTextareaInput(el, key),
				));
			}
		});
	}

	private async requestPermissions(permissions: chrome.permissions.Permissions): Promise<boolean>
	{
		return await chrome.permissions.contains(permissions) || await chrome.permissions.request(permissions);
	}

	private async onRadioInput(ev: Event, el: HTMLInputElement, key: Keys<ConfigurationData, FAVICON_MODE>): Promise<void>
	{
		if (!el.checked || !isEnumValue(FAVICON_MODE, el.value))
		{
			return;
		}

		// revert value back
		el.checked = false;
		for (const input of this.inputs)
		{
			if (input instanceof HTMLInputElement && (input.type === 'radio') && (input.value === this.config.data[key]))
			{
				input.checked = true;
				break;
			}
		}

		const permission = this.iconsPermissions[el.value];
		if (permission !== undefined && !await permission())
		{
			ev.preventDefault();
			return;
		}

		el.checked = true;

		this.config.data[key] = el.value;
		await this.saveConfig();
	}

	private async onCheckboxInput(ev: Event, el: HTMLInputElement, key: Keys<ConfigurationData, boolean>): Promise<void>
	{
		if (el.checked)
		{
			el.checked = false;

			const permission = this.permissions[key];
			if (permission !== undefined && !await permission())
			{
				ev.preventDefault();
				return;
			}

			el.checked = true;
		}

		this.config.data[key] = el.checked;
		await this.saveConfig();
	}

	private saveConfig(): Promise<void>
	{
		return this.config.save();
	}

	private async onSelectInput(el: HTMLSelectElement, key: Keys<ConfigurationData, number>): Promise<void>
	{
		this.config.data[key] = parseInt(el.value, 10);
		await this.saveConfig();
	}

	private async onTextareaInput(el: HTMLTextAreaElement, key: Keys<ConfigurationData, Array<string>>): Promise<void>
	{
		this.config.data[key] = el.value.split('\n').map(s => s.trim());
		await this.saveConfig();
	}
}