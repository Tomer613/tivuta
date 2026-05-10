/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential for GitHub Pages static export
  output: 'export',
  
  // This tells Next.js that the app is hosted under /tivuta
  basePath: '/tivuta',
  
  // This ensures CSS/JS/Images are loaded from the correct path
  assetPrefix: '/tivuta/',

  // Better for GitHub Pages: creates folders with index.html instead of .html files
  trailingSlash: true,

  // Disabling strict mode temporarily can help isolate hydration loops
  reactStrictMode: false,
  images: {
    unoptimized: true, // Crucial for local assets and high-security filters
  },
};

export default nextConfig;