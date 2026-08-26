import js from "@eslint/js"
import tseslint from "typescript-eslint"
import globals from "globals"

/**
 * Base ESLint config for all TypeScript packages in the NovaCP monorepo.
 * Import and extend this in each app's eslint.config.mjs.
 */
export const base = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.es2022,
    },
  },
  rules: {
    // TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/no-import-type-side-effects": "error",

    // General
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
  },
})

/**
 * Next.js specific ESLint config.
 * Extends base with Next.js core-web-vitals rules.
 */
export const nextjs = [
  ...base,
  {
    rules: {
      // Relax some rules for Next.js patterns
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]
