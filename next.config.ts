import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { typedRoutes: true },
  // 폐쇄망: 외부 텔레메트리 차단 (NEXT_TELEMETRY_DISABLED=1 도 함께 권장)
  productionBrowserSourceMaps: false,
};

export default nextConfig;
