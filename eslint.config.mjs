import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 非 app 程式：agent 暫存 worktree（已 gitignore）與原型/設計 kit，
    // 不納入專案 lint（先前 2237 個 lint 錯近 99% 來自這兩處）。
    ".claude/**",
    "PurePaw/**",
  ]),
]);

export default eslintConfig;
