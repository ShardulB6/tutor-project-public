import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import agents from "agents/vite";

const ignorePatterns = [
  "src/routeTree.gen.ts",
  "worker-configuration.d.ts",
  "drizzle/*",
  "src/components/ui/**",
  "src/components/ai-elements/**",
];

const config = defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: { ignorePatterns },
  lint: { options: { typeAware: true, typeCheck: true }, ignorePatterns },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    agents(),
    devtools(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});

export default config;
