/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Suppress useLayoutEffect warnings during development
    if (dev && !isServer) {
      const originalWarn = console.warn
      console.warn = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('useLayoutEffect does nothing on the server')) {
          return
        }
        originalWarn(...args)
      }
    }
    
    return config
  },
}

export default nextConfig
