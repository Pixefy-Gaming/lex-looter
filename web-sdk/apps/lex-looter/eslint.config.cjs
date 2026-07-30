const { createRequire } = require('module');
const path = require('path');

const eslintRequire = createRequire(require.resolve('eslint'));
const customRequire = createRequire(path.resolve(__dirname, '../../packages/eslint-config-custom/index.js'));

const js = eslintRequire('@eslint/js');
const tsParser = customRequire('@typescript-eslint/parser');
const tsPlugin = customRequire('@typescript-eslint/eslint-plugin');
const svelte = customRequire('eslint-plugin-svelte');
const prettier = customRequire('eslint-config-prettier');

const globals = {
	AbortController: 'readonly',
	AbortSignal: 'readonly',
	Blob: 'readonly',
	Buffer: 'readonly',
	cancelAnimationFrame: 'readonly',
	clearInterval: 'readonly',
	clearTimeout: 'readonly',
	console: 'readonly',
	document: 'readonly',
	Event: 'readonly',
	fetch: 'readonly',
	File: 'readonly',
	globalThis: 'readonly',
	HTMLElement: 'readonly',
	HTMLInputElement: 'readonly',
	Image: 'readonly',
	KeyboardEvent: 'readonly',
	localStorage: 'readonly',
	module: 'readonly',
	MouseEvent: 'readonly',
	process: 'readonly',
	requestAnimationFrame: 'readonly',
	require: 'readonly',
	setInterval: 'readonly',
	setTimeout: 'readonly',
	URL: 'readonly',
	URLSearchParams: 'readonly',
	window: 'readonly',
};

module.exports = [
	{
		ignores: ['.svelte-kit/**', '.storybook/**', 'dist/**', 'node_modules/**', '*.cjs'],
	},
	{
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			globals,
		},
	},
	js.configs.recommended,
	...tsPlugin.configs['flat/recommended'],
	...svelte.configs['flat/base'],
	{
		files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: tsParser,
			},
		},
	},
	prettier,
];
