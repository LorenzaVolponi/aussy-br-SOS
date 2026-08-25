import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const criticalFiles = [
  "src/app/page.tsx",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/loading.tsx",
  "src/app/api/telemetry/route.ts",
  "src/components/aussy/quick-share.tsx",
  "src/components/aussy/qr-location.tsx",
  "src/components/aussy/client-observability.tsx",
  "src/hooks/use-geolocation.ts",
  "src/hooks/use-orientation.ts",
  "src/lib/client-telemetry.ts",
];

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      "prefer-const": "off",
      "no-unused-vars": "off",
      "no-console": "off",
      "no-debugger": "error",
      "no-empty": "off",
      "no-irregular-whitespace": "off",
      "no-case-declarations": "off",
      "no-fallthrough": "error",
      "no-mixed-spaces-and-tabs": "off",
      "no-redeclare": "error",
      "no-undef": "off",
      "no-unreachable": "error",
      "no-useless-escape": "off",
    },
  },
  {
    files: criticalFiles,
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_|^GOLD$", "caughtErrors": "none" }],
      "prefer-const": "error",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "examples/**", "skills"],
  },
];

export default eslintConfig;
