import { delay } from '../includes/functions';
import { Messenger } from '../includes/Messenger';
import { MESSAGE } from '../includes/constants';
import { MigrationTab } from '../includes/MigrationTab';

export class MigrateUI
{
	private readonly id: HTMLInputElement;

	private readonly btn: HTMLButtonElement;

	private readonly options: HTMLDivElement;
	private readonly progress: HTMLDivElement;
	private readonly progress_text: HTMLDivElement;
	private readonly done: HTMLDivElement;

	private loading: boolean = false;

	public constructor(
		private readonly root: HTMLElement,
	)
	{
		this.root = root;
		this.id = this.root.querySelector('input#extension-id')!;
		this.btn = this.root.querySelector('button#extension-migrate')!;

		this.options = this.root.querySelector('div#migrate-options')!;
		this.progress = this.root.querySelector('div#migrate-progress')!;
		this.progress_text = this.progress.querySelector('div.text')!;
		this.done = this.root.querySelector('div#migrate-done')!;

		this.init();
	}

	private init()
	{
		this.id.addEventListener('input', async () =>
		{
			const id = this.id.value.trim();
			const valid = (id.length === 32) && (id !== chrome.runtime.id);
			this.btn.disabled = !valid;
		});

		this.btn.addEventListener('click', () => this.migrate());
	}

	async trackProgress(extension_id: string)
	{
		this.loading = true;
		let migrated = 0;
		const total = (await MigrationTab.create(extension_id)).length;

		while (this.loading)
		{
			this.progress_text.innerText = chrome.i18n.getMessage(
				'page_options_migrate_progress',
				[ migrated.toString(), total.toString(), ]
			);
			await delay(5_000);
			migrated = total - (await MigrationTab.create(extension_id)).length;
		}
	}

	async migrate(): Promise<void>
	{
		this.options.classList.add('hidden');
		this.progress.classList.remove('hidden');
		this.done.classList.add('hidden');

		const extension_id = this.id.value.trim();
		void this.trackProgress(extension_id);

		await Messenger.send({
			action: MESSAGE.Migrate,
			extensionId: extension_id,
		});
		this.loading = false;

		this.options.classList.remove('hidden');
		this.progress.classList.add('hidden');
		this.done.classList.remove('hidden');
	}
}