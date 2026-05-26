/** @type {import('next').NextConfig} */

// Hosted under a dedicated subdomain (tivuta.smart-studio.dev), 
// so the site sits at the root. Keep it empty.
const basePath = '';

const nextConfig = {
  // Essential for GitHub Pages static export
  output: 'export',

  // The base path of the app (empty for a dedicated subdomain)
  basePath: basePath,

  // Ensures assets are loaded from the correct path
  assetPrefix: basePath ? `${basePath}/` : undefined,

  // Creates folders with index.html - perfect for GitHub Pages and filter compatibility
  trailingSlash: true,

  // Disabling strict mode temporarily can help isolate hydration loops
  reactStrictMode: false,

  images: {
    unoptimized: true, // Crucial for local assets and high-security filters
  },

  // Export the base path to the frontend to avoid breaking existing component links
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  }
};

export default nextConfig;