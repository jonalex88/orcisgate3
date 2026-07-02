import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Plain Node scripts (e.g. apps/server/scripts) aren't type-checked, so they need real
    // globals rather than relying on typescript-eslint's no-undef override for .ts/.tsx files.
    files: ['**/scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
