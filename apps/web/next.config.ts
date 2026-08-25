import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Strict mode for catching bugs early
  reactStrictMode: true,

  // Output standalone only for Docker container builds; Vercel uses native deployment
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // ESLint build configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Images from OAuth providers
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  // Experimental features
  experimental: {
    // Enable partial prerendering for better performance
    ppr: false, // Enable when stable
  },

  // Redirect root to dashboard if authenticated (handled in middleware)
  async redirects() {
    return []
  },

  // Proxy static uploads to FastAPI backend
  async rewrites() {
    const apiBase = process.env.API_URL ?? "http://localhost:8000"
    return [
      {
        source: "/static/:path*",
        destination: `${apiBase}/static/:path*`,
      },
    ]
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  },
}

export default nextConfig
