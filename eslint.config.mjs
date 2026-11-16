import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/**', 'docs/**', 'node_modules/**', 'prototype/**', 'examples/**', 'scripts/node-compat.cjs'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['scripts/**', 'tests/fixtures/**'],
        languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } }
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            '@typescript-eslint/no-empty-function': 'off',
            'no-empty': ['error', { allowEmptyCatch: true }]
        }
    }
);
