import { isDataImage, isUrlAllowed } from './functions';
import { Messenger } from './Messenger';
import { MESSAGE } from './constants';

export class FavIcon
{
	constructor(
		public readonly url: string,
		public readonly canDim: boolean = true,
	)
	{
	}

	public async dimmed(): Promise<string>
	{
		if (!await this.ensureDim())
		{
			return this.url;
		}

		const response = await Messenger.send<string>({
			action: MESSAGE.DimIcon,
			url: this.url,
		});

		return response !== undefined ? response.data ?? this.url : this.url;
	}

	private async ensureDim(): Promise<boolean>
	{
		if (this.url.startsWith('img/') || isDataImage(this.url))
		{
			return true;
		}

		return this.canDim && isUrlAllowed(this.url);
	}
}