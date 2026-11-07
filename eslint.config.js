import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "captures/**", "skills/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { window: "readonly", document: "readonly", console: "readonly", performance: "readonly", navigator: "readonly", location: "readonly", requestAnimationFrame: "readonly", process: "readonly", setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", URL: "readonly", Blob: "readonly", HTMLElement: "readonly" } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-constant-condition": ["error", { checkLoops: false }]
    }
  },
  {
    files: ["src/sim/**/*.ts", "src/ops/**/*.ts", "src/combat/**/*.ts", "src/actors/**/*.ts", "src/laws/**/*.ts", "src/campaign/**/*.ts"],
    rules: {
      "no-restricted-properties": ["error", { object: "Math", property: "random", message: "Sim must use DeterministicRng." }, { object: "Date", property: "now", message: "No wall clock in sim." }, { object: "performance", property: "now", message: "No wall clock in sim." }],
      "no-restricted-imports": ["error", { patterns: ["three", "three/*", "**/render/**", "**/ui/**", "**/audio/**"] }]
    }
  }
);
