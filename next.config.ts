import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis packages are large; keep them out of the bundle on the server.
  serverExternalPackages: ["@googleapis/drive", "@googleapis/gmail", "@googleapis/sheets", "google-auth-library"],
};

export default nextConfig;
