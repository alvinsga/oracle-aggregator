import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		// "process.env": process.env,
		// // By default, Vite doesn't include shims for NodeJS/
		// // necessary for segment analytics lib to work
		global: {}
	}
});
