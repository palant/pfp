import globals from "globals";
import js from "@eslint/js";
import json from "eslint-plugin-json";
import vue from "eslint-plugin-vue";

let rules = {
  "no-console": "off",
  "array-bracket-spacing": "error",
  "arrow-spacing": "error",
  "brace-style": [
    "error",
    "allman"
  ],
  "comma-spacing": "error",
  "comma-style": "error",
  "consistent-return": "error",
  "computed-property-spacing": "error",
  "eol-last": "error",
  "indent": [
    "error",
    2,
    {
      "SwitchCase": 1,
      "CallExpression": {
        "arguments": "off"
      },
      "MemberExpression": "off",
      "ArrayExpression": "off",
      "ignoreComments": true
    }
  ],
  "key-spacing": "error",
  "keyword-spacing": "error",
  "linebreak-style": "error",
  "new-parens": "error",
  "no-prototype-builtins": "off",
  "no-spaced-func": "error",
  "no-trailing-spaces": "error",
  "no-unused-vars": "off",
  "no-var": "error",
  "no-whitespace-before-property": "error",
  "object-curly-spacing": "error",
  "operator-assignment": "error",
  "operator-linebreak": "error",
  "padded-blocks": [
    "error",
    "never"
  ],
  "prefer-rest-params": "warn",
  "prefer-spread": "warn",
  "quotes": [
    "error",
    "double",
    {
      "avoidEscape": true
    }
  ],
  "require-yield": "warn",
  "require-atomic-updates": [
    "off",
    "https://github.com/eslint/eslint/issues/11899"
  ],
  "semi": "error",
  "semi-spacing": "error",
  "space-before-function-paren": [
    "error",
    "never"
  ],
  "space-in-parens": "error",
  "space-infix-ops": "error",
  "space-unary-ops": "error",
  "spaced-comment": "error",
  "yield-star-spacing": "error",
  "vue/singleline-html-element-content-newline": "off",
  "vue/multiline-html-element-content-newline": "off",
  "vue/multi-word-component-names": "off",
  "vue/max-attributes-per-line": "off"
};

export default [
  {
    ignores: ["build-firefox/**", "build-chrome/**", "build-web/**", "node_modules/**"]
  },
  js.configs.recommended,
  json.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["*.js", "*.json", "build/**/*.js", "locale/**/*.json"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es6,
      },
    },
    rules,
  },
  {
    files: ["contentScript/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es6,
      },
    },
    rules,
  },
  {
    files: ["lib/**/*.js", "ui/**/*.js", "ui/**/*.vue", "!ui/third-party/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.webextensions,
        ...globals.es6,
      },
    },
    rules,
  },
];
