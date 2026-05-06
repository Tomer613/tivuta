/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabling strict mode temporarily can help isolate hydration loops
  reactStrictMode: false,
  images: {
    unoptimized: true, // Crucial for local assets and high-security filters
  },
};

export default nextConfig;