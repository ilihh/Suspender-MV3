import { isDataImage, isUrlAllowed } from './functions';

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

		return new Promise((resolve) => {
			const img = document.createElement('img');

			img.addEventListener('load', () => {
				const canvas = document.createElement('canvas');
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;

				const ctx = canvas.getContext('2d');
				if (ctx === null)
				{
					resolve(this.url);
					return;
				}

				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				// make semi-transparent
				const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const pixels = data.data;
				for (let x = 0; x < pixels.length; x += 4)
				{
					pixels[x + 3] = Math.round((pixels[x + 3] ?? 0) * 0.5);
				}
				ctx.putImageData(data, 0, 0);

				resolve(canvas.toDataURL());
			});

			img.crossOrigin = 'anonymous';
			img.src = this.url;
		});
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