/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint and TypeScript are now enforced in production builds
  // Fix all errors before deployment - do not suppress build failures
  images: {
    unoptimized: true,
  },
  // Performance optimizations
  reactStrictMode: true,
  compress: true,
  productionBrowserSourceMaps: false,

  ...(process.env.NODE_ENV === "production"
    ? {
        experimental: {
          // Keep import optimization in production only; this can delay dev chunk emission.
          optimizePackageImports: [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-aspect-ratio",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],
        },
      }
    : {}),

  webpack: (config, { isServer }) => {
    // Prevent spurious client-side ChunkLoadError timeouts in slower dev environments.
    if (!isServer && config.output) {
      config.output.chunkLoadTimeout = 300000
    }

    return config
  },
}

export default nextConfig
