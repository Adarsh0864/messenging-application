/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  transpilePackages: [],
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        util: false,
      };
    }

    // Ignore undici completely
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^undici$/,
      })
    );

    // Also ignore it via externals
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('undici');
    }

    return config;
  },
}

module.exports = nextConfig 