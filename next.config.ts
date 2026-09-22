import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development" && process.env.ENABLE_PWA !== "true",
  register: true,
  customWorkerSrc: "worker",
});

const nextConfig: NextConfig = {
  transpilePackages: [
    '@fullcalendar/common',
    '@fullcalendar/core',
    '@fullcalendar/daygrid',
    '@fullcalendar/interaction',
    '@fullcalendar/react',
    '@fullcalendar/timegrid',
  ],
  turbopack: {},
};

export default withPWA(nextConfig);
