const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  images: {
    domains: ['solscan.io'],
  },
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',
    NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    NEXT_PUBLIC_USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@solana/web3.js',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-phantom',
      '@bonfida/spl-name-service',
      'borsh',
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'buffer/': path.resolve(__dirname, 'node_modules/buffer/'),
    };

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(supports-color|encoding|pino-pretty|utf-8-validate)$/,
      })
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        buffer: require.resolve('buffer/'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
