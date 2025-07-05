import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
	root: './',
	build: {
		outDir: 'dist',
		minify: true,
		sourcemap: false,
		rollupOptions: {
			input: {
				background: resolve(__dirname, 'src/background.ts'),
				popup: resolve(__dirname, 'src/popup.ts'),
				suspended: resolve(__dirname, 'src/suspended.ts'),
				options: resolve(__dirname, 'src/options.ts'),
				offscreen: resolve(__dirname, 'src/offscreen.ts'),
			},
			output: {
				entryFileNames: '[name].js',
			}
		}
	},
	resolve: {
		extensions: ['.ts', '.js', ],
	},
	plugins: [
		viteStaticCopy({
			targets: [
				{
					src: 'public/*',
					dest: '',
				},
			],
		})
	],
});