import { nextjs } from "@novacp/config/eslint"

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextjs,
  {
    rules: {
      // Allow console.warn/error in client components
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "components/ui/**", // shadcn/ui components — not our code
    ],
  },
]

export default config
