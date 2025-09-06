module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        // TypeScript strict rules
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
      },
    },
  ],
  rules: {
    // Node.js specific
    'no-console': 'off', // Allow console in backend
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
}