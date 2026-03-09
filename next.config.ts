import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: [
    '@aws-sdk/client-polly',
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/credential-provider-node',
    '@aws-sdk/credential-provider-ini',
    '@aws-sdk/credential-provider-sso',
    '@aws-sdk/credential-provider-login',
    '@aws-sdk/token-providers',
    '@aws-sdk/nested-clients',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
