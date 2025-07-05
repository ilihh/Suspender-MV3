import { DataStorage } from './DataStorage';

export class ScrollPositions
{
	positions: Record<number, number> = {};

	private static _key: string = 'scroll';

	public clear(): void
	{
		this.positions = {};
		this.save();
	}

	public get(tab_id: number): number|null
	{
		return this.positions[tab_id] ?? null;
	}

	public remove(tab_id: number): void
	{
		delete this.positions[tab_id];
		this.save();
	}

	public set(tab_id: number, position: number): void
	{
		this.positions[tab_id] = position;
		this.save();
	}

	public static async load(): Promise<ScrollPositions>
	{
		return await DataStorage.load(ScrollPositions._key, ScrollPositions);
	}

	public save(): void
	{
		DataStorage.save(ScrollPositions._key, this);
	}
}