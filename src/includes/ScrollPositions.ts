import { DataStorage } from './DataStorage';

export class ScrollPositions
{
	positions: Record<number, number> = {};

	private static _key: string = 'scroll';

	public get(tab_id: number): number|null
	{
		return this.positions[tab_id] ?? null;
	}

	public remove(tab_id: number): Promise<void>
	{
		delete this.positions[tab_id];
		return this.save();
	}

	public set(tab_id: number, position: number): Promise<void>
	{
		this.positions[tab_id] = position;
		return this.save();
	}

	public static async load(): Promise<ScrollPositions>
	{
		return await DataStorage.load(ScrollPositions._key, ScrollPositions, 'session');
	}

	public save(): Promise<void>
	{
		return DataStorage.save(ScrollPositions._key, this, 'session');
	}
}