module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true
  },
  plugins: [
    'eslint-plugin-tsdoc',
    '@typescript-eslint/eslint-plugin',
    'prettier'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    'tsdoc/syntax': 'warn',
    '@typescript-eslint/no-unused-vars': ['off', { argsIgnorePattern: '^_' }],
    'generator-star-spacing': ['error', { before: false, after: true }],
    'space-before-function-paren': 'off',
    'no-dupe-class-members': 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'off',
    'prettier/prettier': ['error'],
    'lines-between-class-members': ['error', 'always'],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true
      }
    ],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        accessibility: 'no-public'
      }
    ],
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description'
      }
    ],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'none',
          requireLast: false
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false
        }
      }
    ]
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
}
