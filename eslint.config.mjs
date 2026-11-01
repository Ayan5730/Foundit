import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
  ]),
  {
    files: ["app/**/*.{ts,tsx}", "components/foundit/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      // FoundIt runs on Vinext/Sites. Full document navigation deliberately
      // refreshes server identity, and private photos use authenticated media
      // routes or local previews rather than Next's image optimization service.
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-location-assign-relative-destination": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["components/foundit/session.tsx", "lib/client/use-resource.ts"],
    rules: {
      // These request effects reset loading/error/data when their resource or
      // refresh key changes; abort cleanup owns the asynchronous request.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
