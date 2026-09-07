/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every page is static: no server needed, deploy the `out` folder anywhere.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js optionally requires node-canvas for server-side rendering.
    // We only ever run it in the browser, so stub it out rather than installing
    // a native dependency that needs a compiler.
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
