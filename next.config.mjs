/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // `next dev` blocks client resources for unknown origins (pages stay unhydrated when opened
  // by 127.0.0.1 or a public IP). Extra hosts come from ACMP_ALLOWED_DEV_ORIGINS, comma-separated.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    ...(process.env.ACMP_ALLOWED_DEV_ORIGINS ?? "").split(",").map((h) => h.trim()).filter(Boolean),
  ],
  // ACMP is standalone: no proxy, no external API. Everything runs from this repository.
};

export default nextConfig;
