const tseslint = require('typescript-eslint');

module.exports = tseslint.config(...tseslint.configs.recommended, {
  files: ['src/**/*.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
});
