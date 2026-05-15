/** @type {import('next').NextConfig} */

// Define the base path centrally. 
// Change this to '' if you want to deploy to the root domain.
const basePath = '/tivuta';

const nextConfig = {
  // Essential for GitHub Pages static export
  output: 'export',
  
  // This tells Next.js that the app is hosted under this path
  basePath: basePath,
  
  // This ensures CSS/JS/Images are loaded from the correct path
  assetPrefix: basePath ? `${basePath}/` : undefined,

  // Better for GitHub Pages: creates folders with index.html instead of .html files
  trailingSlash: true,

  // Disabling strict mode temporarily can help isolate hydration loops
  reactStrictMode: false,
  images: {
    unoptimized: true, // Crucial for local assets and high-security filters
  },

  // Export the base path to the frontend so we don't have to hardcode it in components
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  }
};

export default nextConfig;