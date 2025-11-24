import { Configuration } from './Configuration';
import { Suspender } from './Suspender';
import { Session } from './Sessions';

export class AlarmProcessor
{
	private static key: string = 'last-alarm';
	private static currentTask: Promise<void> | null = null;

	private static async get(): Promise<number>
	{
		const key = AlarmProcessor.key;
		const loaded = await chrome.storage.session.get([key]);
		const result = loaded[key] || 0;
		return Number.isFinite(result) ? result : 0;
	}

	private static async timePassed(timeInSeconds: number): Promise<boolean>
	{
		const last_call = await AlarmProcessor.get();
		const seconds_since_last_call = (Date.now() - last_call) / 1000;
		return seconds_since_last_call >= timeInSeconds;
	}

	private static async update(): Promise<void>
	{
		const key = AlarmProcessor.key;
		return chrome.storage.session.set({
			[key]: Date.now(),
		});
	}

	public static run(): Promise<void>
	{
		if (AlarmProcessor.currentTask != null)
		{
			return AlarmProcessor.currentTask;
		}

		const promise = AlarmProcessor.runTasks();
		AlarmProcessor.currentTask = promise;
		promise.finally(() => AlarmProcessor.currentTask = null);

		return promise;
	}

	private static async runTasks(): Promise<void>
	{
		const config = await Configuration.load();
		if (!await AlarmProcessor.timePassed(config.data.timer))
		{
			return;
		}

		if (config.autoSuspend())
		{
			const suspender = new Suspender(config);
			await suspender.suspendAuto();
		}

		const session = await Session.current();
		await session.save();
		await AlarmProcessor.update();
	}
}