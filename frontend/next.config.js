/** Next.js config minimal for app router */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Blog posts are read from disk (lib/blog.ts). Routes rendered on demand
    // (sitemap, job pages) need the files bundled too, or on Vercel they see
    // no posts at all.
    outputFileTracingIncludes: {
      "/**/*": ["./content/**/*"],
    },
  },
}

module.exports = nextConfig
