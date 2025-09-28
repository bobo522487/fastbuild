// This configuration only applies to the package manager root.
/** @type {import("eslint").Linter.Config} */
export default {
  ignorePatterns: ["apps/**", "packages/**"],
  extends: ["@workspace/eslint-config/next-js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
}
