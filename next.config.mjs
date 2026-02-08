/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "@tanstack/react-query",
      "@tanstack/react-query-devtools",
      "lucide-react"
    ]
  }
};

export default nextConfig;
