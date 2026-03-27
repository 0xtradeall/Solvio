const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['solscan.io'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.devnet.solana.com wss://api.devnet.solana.com https://api.mainnet-beta.solana.com wss://api.mainnet-beta.solana.com https://*.solana.com wss://*.solana.com https://api.amplitude.com https://api2.amplitude.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; frame-src 'self' https://auth.magic.link https://vercel.live;",
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',
    NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
    NEXT_PUBLIC_USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    NEXT_PUBLIC_MAGIC_API_KEY: 'pk_test_demo',
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.fallback = { buffer: require.resolve('buffer/') };
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
