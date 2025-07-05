import { DataStorage } from './DataStorage';

export class Sessions
{
	public current: Session = new Session();
	public recent: Session[] = [];
	public saved: Session[] = [];

	private static _key: string = 'sessions';
	private static recentLimit: number = 7;

	public static async load(): Promise<Sessions>
	{
		const sessions = await DataStorage.load(Sessions._key, Sessions);
		sessions.current = await Session.current();
		sessions.recent = sessions.recent.map(x => Session.restore(x));
		sessions.saved = sessions.saved.map(x => Session.restore(x));

		return sessions;
	}

	public save(): void
	{
		const temp = new Sessions();
		temp.recent = this.recent;
		temp.saved = this.saved;
		temp.current = new Session();

		DataStorage.save(Sessions._key, temp);
		this.current.save();
	}

	public static async updateRecent(): Promise<void>
	{
		const sessions = await Sessions.load();
		const backup = await Session.loadBackup();
		if (backup.windows === 0)
		{
			return;
		}

		const last_recent: string = sessions.recent.length === 0
			? ''
			: sessions.recent[sessions.recent.length - 1].data;

		if (last_recent === backup.data)
		{
			return;
		}

		sessions.recent.push(backup);
		if (sessions.recent.length > Sessions.recentLimit)
		{
			sessions.recent = sessions.recent.slice(sessions.recent.length - Sessions.recentLimit, Sessions.recentLimit);
		}

		sessions.save();
	}
}

export class Session
{
	private static _key = 'session-backup';

	private static windowSeparator: string = '\n\n';

	public name: string;

	public windows: number;

	public tabs: number;

	public data: string;

	public constructor(windows: SessionWindow[] = [], name: string|null = null)
	{
		this.name = name ?? (new Date()).toLocaleString();
		this.windows = windows.length;
		this.tabs = windows.reduce((prev, current) => prev + current.tabs.length, 0);
		this.data = windows.map(x => x.toString()).join(Session.windowSeparator);
	}

	public copy(name: string): Session
	{
		const result = new Session();
		Object.assign(result, this);
		result.name = name;

		return result;
	}

	public loadWindows(): SessionWindow[]
	{
		return Session.createWindows(this.data);
	}

	public static createWindows(data: string): SessionWindow[]
	{
		return data.split(Session.windowSeparator).map(x => SessionWindow.create(x)).filter(x => x.tabs.length > 0);
	}

	public static async current(): Promise<Session>
	{
		const windows: SessionWindow[] = [];

		for (const window of await chrome.windows.getAll({ populate: true, }))
		{
			if (window.tabs === undefined)
			{
				continue;
			}

			const tabs: string[] = window.tabs.map(x => x.url).filter(x => x !== undefined);
			const w = new SessionWindow(tabs);
			if (w.tabs.length > 0)
			{
				windows.push(w);
			}
		}

		return new Session(windows);
	}

	public static async loadBackup(): Promise<Session>
	{
		return await DataStorage.load(Session._key, Session);
	}

	public save(): void
	{
		if (this.windows === 0)
		{
			return;
		}

		DataStorage.save(Session._key, this);
	}

	public static restore(session: Session): Session
	{
		return Object.assign(new Session(), session);
	}
}

export class SessionWindow
{
	private static tabSeparator: string = '\n';

	public tabs: string[];

	public constructor(tabs: string[])
	{
		this.tabs = tabs.map(x => x.trim()).filter(x => x.length > 0);
	}

	public static create(data: string): SessionWindow
	{
		return new SessionWindow(data.split(SessionWindow.tabSeparator));
	}

	public toString(): string
	{
		return this.tabs.join(SessionWindow.tabSeparator);
	}
}