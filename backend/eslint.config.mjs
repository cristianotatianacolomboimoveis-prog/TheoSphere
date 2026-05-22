// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'prisma.config.d.ts',
      'prisma.config.js',
      'prisma.config.js.map',
      'dist/**',
      'node_modules/**',
      // Standalone scripts e arquivos fora do tsconfig do app — o
      // projectService do typescript-eslint não os encontra e lança
      // "was not found by the project service". São scripts utilitários
      // (seed, ingestão, scratch) que não fazem parte do build do NestJS.
      'scratch/**',
      'scripts/**',
      'seed.ts',
      'trigger-ingest.ts',
      'test-db-direct.ts',
      'prisma/seed-*.ts',
      // Artefatos compilados que às vezes vazam pra raiz (não devem ser
      // lintados nem versionados).
      '**/*.js',
      '**/*.js.map',
      '**/*.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
);
