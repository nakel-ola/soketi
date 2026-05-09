const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    {
        ignores: ['dist/', 'node_modules/'],
    },
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-wrapper-object-types': 'off',
            'prefer-const': 'off',
        },
    },
);
