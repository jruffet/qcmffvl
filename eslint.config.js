import angular from 'eslint-plugin-angular';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ["web/js/lib/**/*.js", "web/js/**/*.min.js"]
  },
  {
    files: ['web/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        jQuery: 'readonly',
        $: 'readonly',
        angular: 'readonly'
      }
    },
    plugins: {
      angular,
      import: importPlugin
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'eqeqeq': 'error'
    }
  }
];
