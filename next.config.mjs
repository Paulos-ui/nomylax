/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // The Phase 1 marketing page is served as a static asset at "/".
      // Replace this with a React page when the landing is ported to components.
      beforeFiles: [{ source: '/', destination: '/landing.html' }],
    };
  },
};
export default nextConfig;
