import path from "path";
import type { NextConfig } from "next";

const port = process.env.PORT || "3000";
const distDir = port === "3000" ? ".next" : `.next-${port}`;

const nextConfig: NextConfig = {
  distDir,
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    root: path.resolve(__dirname, "../../"),
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
