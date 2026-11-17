import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@trionic/shared"],
  // Server-only workspace packages that read their own data files via
  // __dirname (PageIndex act trees, Indic glossaries). Bundling them rewrote
  // __dirname to .next/server/..., so every Act and glossary loaded EMPTY at
  // runtime. They are externalized in the webpack hook below so Node loads
  // their built dist/ (run `pnpm -r --filter '!web' build` first; CI does).
  // serverExternalPackages alone is not enough: Next only externalizes paths
  // inside node_modules, and pnpm workspace links resolve to packages/*.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  typescript: {
    // KNOWN DEBT — DO NOT TRUST THIS FLAG. apps/web currently has ~48 pre-existing
    // TS errors (mostly missing Supabase Database generic + a few stray any).
    // The auth-helpers-nextjs stray-dep bug got through because this flag was
    // already true. Tracked in follow-up issue — once that lands, FLIP THIS BACK
    // TO false and never set it true again.
    ignoreBuildErrors: true,
  },
  // ESLint runs as a real gate (no ignore) so new lint regressions fail loud.
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externalized = new Set(["@trionic/agents", "@trionic/pageindex", "@trionic/translation"]);
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) =>
          request && externalized.has(request) ? callback(null, `commonjs ${request}`) : callback(),
      ];
    }
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);