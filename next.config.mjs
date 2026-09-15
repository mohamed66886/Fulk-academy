/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
    serverComponentsExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  },
};

export default nextConfig;
