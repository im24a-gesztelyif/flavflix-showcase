import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**"],
  },
  ...compat.config({
    extends: ["next/core-web-vitals"],
  }),
];

eslintConfig.push({
  rules: {
    "@next/next/no-img-element": "off",
  },
});

export default eslintConfig;
