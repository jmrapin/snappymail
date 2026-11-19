// ESLint (flat config, ESLint 9+) for this plugin's browser scripts. Core's eslint.config.js only
// lints dev/ and tasks/, so the plugin brings its own, with the same rules as core.
// Run from the repository root:
//   npx eslint -c plugins/nextcloud-modern-view/tools/eslint.config.js plugins/nextcloud-modern-view/js
// It must report nothing.
import globals from 'globals';
import js from '@eslint/js';

// the globals package in yarn.lock has "AudioWorkletGlobalScope " (trailing space), which ESLint 10
// rejects
const browser = Object.fromEntries(Object.entries(globals.browser).map(([name, value]) => [name.trim(), value]));

export default [
	{
		files: ['plugins/nextcloud-modern-view/js/**/*.js'],
		...js.configs.recommended,
		languageOptions: {
			ecmaVersion: 2022,
			// each file is a classic script (an IIFE), not a module
			sourceType: 'script',
			globals: {
				...browser,
				rl: 'readonly',
				ko: 'readonly',
				Squire: 'readonly',
				SquireUI: 'readonly',
				NcModernView: 'writable',
				Element: 'readonly'
			}
		},
		rules: {
			...js.configs.recommended.rules,
			'no-cond-assign': 0,
			'no-mixed-spaces-and-tabs': 'off',
			'max-len': ['error', 120, 2, {
				ignoreComments: true,
				ignoreUrls: true,
				ignoreTrailingComments: true
			}],
			'no-constant-condition': ['error', { checkLoops: false }]
		}
	}
];
