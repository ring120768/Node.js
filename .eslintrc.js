
module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Code Quality
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off', // Allow console for logging
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Style
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': ['error', { 'code': 100 }],
    
    // Best Practices
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Security
    'no-buffer-constructor': 'error',
    'no-new-require': 'error',
    'no-path-concat': 'error'
  },
  ignorePatterns: [
    'node_modules/',
    'archive/',
    'attached_assets/',
    '*.backup',
    '*.old'
  ]
};
