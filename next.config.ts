import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure API body size limits
  api: {
    bodyParser: {
      sizeLimit: '5mb', // Increase limit to 10MB for image uploads
    },
  },
  // Configure server actions body size limit
  serverActions: {
    bodySizeLimit: '5mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "napkinsdev.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "modelscope.cn",
      },
      {
        protocol: "https",
        hostname: "modelscope-open.oss-cn-hangzhou.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "resources.modelscope.cn",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pub-a5d7606488124e62b4f62740cef22375.r2.dev",
      },
    ],
  },
  serverExternalPackages: [],
};

export default nextConfig;
