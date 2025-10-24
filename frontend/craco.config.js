// Load configuration from environment or config file
const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
  analyze: process.env.ANALYZE === 'true',
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig, { env }) => {
      
      // Production optimizations
      if (env === 'production') {
        // Disable CSS minimization to fix Radix UI issues
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: true,
          minimizer: webpackConfig.optimization.minimizer.filter(minimizer => {
            // Keep JS minimizer, remove CSS minimizer
            return minimizer.constructor.name !== 'CssMinimizerPlugin';
          }),
          splitChunks: {
            chunks: 'all',
            minSize: 20000, // Min 20KB - daha küçük chunk'ları önle
            maxSize: 500000, // Max 500KB - büyük paketleri böl (önceki: 250KB)
            cacheGroups: {
              // React & React-DOM (en büyük, ayrı chunk)
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                name: 'react-vendor',
                priority: 20,
                enforce: true, // Zorla tek chunk'ta tut
                reuseExistingChunk: true,
              },
              // Framer Motion (duplicate fix - enforce ile zorla birleştir)
              framerMotion: {
                test: /[\\/]node_modules[\\/](framer-motion|motion)[\\/]/,
                name: 'framer-motion',
                priority: 15,
                enforce: true, // Zorla tek chunk'ta tut
                reuseExistingChunk: true,
              },
              // Radix UI (tüm radix componentleri)
              radixUI: {
                test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
                name: 'radix-ui',
                priority: 15,
                maxSize: 400000, // Radix UI için daha büyük limit
                reuseExistingChunk: true,
              },
              // Socket.io & Simple-peer (WebRTC)
              realtime: {
                test: /[\\/]node_modules[\\/](socket\.io-client|simple-peer)[\\/]/,
                name: 'realtime',
                priority: 10,
                enforce: true, // Zorla tek chunk'ta tut
                reuseExistingChunk: true,
              },
              // Diğer vendor'lar
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: 5,
                minSize: 30000, // Vendor'lar için min 30KB
                maxSize: 500000, // Vendor'lar için max 500KB
                reuseExistingChunk: true,
              },
            },
          },
        };
      }

      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });
        
        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }
      
      // Bundle analysis
      if (config.analyze) {
        webpackConfig.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-report.html',
            openAnalyzer: true,
            generateStatsFile: true,
            statsFilename: 'bundle-stats.json',
          })
        );
      }
      
      return webpackConfig;
    },
  },
};