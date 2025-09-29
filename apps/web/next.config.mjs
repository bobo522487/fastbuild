/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],

  // 开发服务器优化配置
  ...(process.env.NODE_ENV === 'development' && {
    // 启用实验性功能
    experimental: {
      serverComponentsExternalPackages: [],
      turbo: {
        rules: {
          // 避免对 SVG 图标进行转换
          '*.svg': {
            loaders: ['@svgr/webpack'],
            as: '*.js',
          },
        },
      },
    },

    // 开发服务器配置
    onDemandEntries: {
      // 页面在内存中保持的时间（毫秒）
      maxInactiveAge: 60 * 60 * 1000, // 1小时
      // 同时缓存的页面数量
      pagesBufferLength: 10,
    },

    // 压缩配置
    compress: true,

    // 启用性能分析
    perf: true,

    // 重新编译时的延迟
    webpackDevMiddleware: {
      writeToDisk: true,
      stats: 'minimal',
    },
  }),

  // 生产环境配置
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
    httpAgentOptions: {
      keepAlive: true,
    },
  }),

  // 通用配置
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 重写配置
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  // 头部配置
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Webpack 配置
  webpack: (config, { dev, isServer }) => {
    // 优化构建性能
    if (dev && !isServer) {
      config.devtool = 'eval-source-map';
    }

    // 忽略某些文件的变更，减少重启
    if (isServer) {
      config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: 1000,
      };
    }

    // 优化模块解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': process.cwd(),
    };

    // 优化缓存配置
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };

    return config;
  },
}

export default nextConfig
