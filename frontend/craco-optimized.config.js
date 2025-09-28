const path = require('path');
const webpack = require('webpack');

// ============================================================================
// PERFORMANCE & SECURITY OPTIMIZED CRACO CONFIG
// ============================================================================

module.exports = {
  webpack: {
    // ========================================================================
    // PERFORMANCE OPTIMIZATIONS
    // ========================================================================
    configure: (webpackConfig, { env, paths }) => {
      const isProduction = env === 'production';
      
      // 1. OPTIMIZATION SETTINGS
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        
        // Enhanced splitting strategy
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for stable dependencies
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
              enforce: true,
              maxSize: 244000, // ~240KB
            },
            
            // React chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // UI components chunk
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
              name: 'ui',
              priority: 15,
              chunks: 'all',
              enforce: true,
            },
            
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              chunks: 'all',
              enforce: true,
            },
          },
        },
        
        // Runtime chunk optimization
        runtimeChunk: {
          name: 'runtime',
        },
        
        // Minimize in production
        minimize: isProduction,
        
        // Remove empty chunks
        removeEmptyChunks: true,
        
        // Merge duplicate chunks
        mergeDuplicateChunks: true,
        
        // Flag included chunks
        flagIncludedChunks: isProduction,
        
        // Optimize module ids
        moduleIds: isProduction ? 'deterministic' : 'named',
        chunkIds: isProduction ? 'deterministic' : 'named',
      };

      // 2. PERFORMANCE PLUGINS
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        
        // Define environment variables for optimization
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(env),
          'process.env.ELECTRON_IS_DEV': JSON.stringify(env === 'development'),
          '__DEV__': JSON.stringify(env === 'development'),
        }),
        
        // Ignore moment.js locales to reduce bundle size
        new webpack.IgnorePlugin({
          resourceRegExp: /^\.\/locale$/,
          contextRegExp: /moment$/,
        }),
        
        // Provide polyfills for Node.js modules in browser
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ];

      // 3. RESOLVE OPTIMIZATIONS
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        
        // Faster module resolution
        modules: [
          path.resolve(__dirname, 'src'),
          'node_modules'
        ],
        
        // Alias for faster imports
        alias: {
          ...webpackConfig.resolve.alias,
          '@': path.resolve(__dirname, 'src'),
          '@components': path.resolve(__dirname, 'src/components'),
          '@services': path.resolve(__dirname, 'src/services'),
          '@utils': path.resolve(__dirname, 'src/utils'),
          '@hooks': path.resolve(__dirname, 'src/hooks'),
          '@context': path.resolve(__dirname, 'src/context'),
          
          // Electron-specific aliases
          'electron': false, // Prevent electron from being bundled
        },
        
        // Fallbacks for Node.js modules
        fallback: {
          "buffer": require.resolve("buffer"),
          "process": require.resolve("process/browser"),
          "stream": require.resolve("stream-browserify"),
          "util": require.resolve("util"),
          "crypto": require.resolve("crypto-browserify"),
          "path": require.resolve("path-browserify"),
          "os": require.resolve("os-browserify/browser"),
          "fs": false,
          "net": false,
          "tls": false,
        },
        
        // Optimize extensions resolution
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      };

      // 4. MODULE RULES OPTIMIZATION
      const oneOfRule = webpackConfig.module.rules.find(rule => rule.oneOf);
      if (oneOfRule) {
        // Add source-map-loader for better debugging
        oneOfRule.oneOf.unshift({
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
          exclude: /node_modules/,
        });
        
        // Optimize babel-loader
        const babelRule = oneOfRule.oneOf.find(
          rule => rule.test && rule.test.toString().includes('jsx')
        );
        
        if (babelRule) {
          babelRule.options = {
            ...babelRule.options,
            cacheDirectory: true,
            cacheCompression: false,
            compact: isProduction,
          };
        }
      }

      // 5. DEVELOPMENT OPTIMIZATIONS
      if (!isProduction) {
        // Faster source maps for development
        webpackConfig.devtool = 'eval-cheap-module-source-map';
        
        // Hot module replacement optimization
        webpackConfig.optimization.removeAvailableModules = false;
        webpackConfig.optimization.removeEmptyChunks = false;
        webpackConfig.optimization.splitChunks = false;
      }

      // 6. PRODUCTION OPTIMIZATIONS
      if (isProduction) {
        // Better source maps for production
        webpackConfig.devtool = 'source-map';
        
        // Minimize CSS
        const MiniCssExtractPlugin = require('mini-css-extract-plugin');
        const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
        
        webpackConfig.optimization.minimizer.push(
          new CssMinimizerPlugin({
            minimizerOptions: {
              preset: [
                'default',
                {
                  discardComments: { removeAll: true },
                  normalizeWhitespace: true,
                  colormin: true,
                  convertValues: true,
                  discardDuplicates: true,
                  discardEmpty: true,
                  mergeRules: true,
                  minifyFontValues: true,
                  minifyGradients: true,
                  minifyParams: true,
                  minifySelectors: true,
                  reduceIdents: false, // Keep for CSS-in-JS compatibility
                  svgo: true,
                },
              ],
            },
          })
        );
      }

      // 7. ELECTRON-SPECIFIC OPTIMIZATIONS
      webpackConfig.target = 'electron-renderer';
      
      // Externalize electron modules
      webpackConfig.externals = {
        ...webpackConfig.externals,
        electron: 'commonjs electron',
      };

      // 8. PERFORMANCE BUDGETS
      webpackConfig.performance = {
        maxAssetSize: 512000, // 500KB
        maxEntrypointSize: 512000, // 500KB
        hints: isProduction ? 'warning' : false,
      };

      return webpackConfig;
    },
    
    // ========================================================================
    // ADDITIONAL PLUGINS
    // ========================================================================
    plugins: {
      add: [
        // Bundle analyzer for production builds
        ...(process.env.ANALYZE === 'true' ? [
          new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-report.html',
          })
        ] : []),
      ],
    },
  },

  // ==========================================================================
  // BABEL OPTIMIZATIONS
  // ==========================================================================
  babel: {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            electron: '25.0.0', // Target specific Electron version
          },
          useBuiltIns: 'entry',
          corejs: 3,
          modules: false, // Let webpack handle modules
        },
      ],
      [
        '@babel/preset-react',
        {
          runtime: 'automatic', // Use new JSX transform
          development: process.env.NODE_ENV === 'development',
        },
      ],
    ],
    plugins: [
      // Production optimizations
      ...(process.env.NODE_ENV === 'production' ? [
        ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }],
        'babel-plugin-transform-react-remove-prop-types',
      ] : []),
      
      // Development optimizations
      ...(process.env.NODE_ENV === 'development' ? [
        'react-refresh/babel',
      ] : []),
      
      // Common optimizations
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      ['@babel/plugin-proposal-private-methods', { loose: true }],
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    ],
  },

  // ==========================================================================
  // ESLINT OPTIMIZATIONS
  // ==========================================================================
  eslint: {
    enable: true,
    mode: 'extends',
    configure: {
      cache: true,
      cacheLocation: 'node_modules/.cache/.eslintcache',
      extensions: ['js', 'jsx', 'ts', 'tsx'],
      rules: {
        // Performance-related rules
        'react-hooks/exhaustive-deps': 'warn',
        'react/jsx-no-bind': 'warn',
        'react/jsx-no-constructed-context-values': 'warn',
        'react/no-array-index-key': 'warn',
        'react/no-unstable-nested-components': 'warn',
        
        // Security rules
        'react/jsx-no-script-url': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/no-danger': 'warn',
      },
    },
  },

  // ==========================================================================
  // DEVSERVER OPTIMIZATIONS
  // ==========================================================================
  devServer: {
    // Performance optimizations
    compress: true,
    hot: true,
    liveReload: false, // Use HMR instead
    
    // Security headers
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    
    // HTTPS for secure contexts (required for some Web APIs)
    https: false, // Set to true if you need HTTPS
    
    // Client configuration
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    
    // Static file serving
    static: {
      directory: path.join(__dirname, 'public'),
      publicPath: '/',
      serveIndex: false,
    },
  },

  // ==========================================================================
  // TYPESCRIPT OPTIMIZATIONS (if using TypeScript)
  // ==========================================================================
  typescript: {
    enableTypeChecking: true,
  },

  // ==========================================================================
  // STYLE OPTIMIZATIONS
  // ==========================================================================
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
        ...(process.env.NODE_ENV === 'production' ? [
          require('cssnano')({
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            }],
          }),
        ] : []),
      ],
    },
  },
};

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// =============================================================================

// Development-specific optimizations
if (process.env.NODE_ENV === 'development') {
  // Enable React DevTools
  process.env.REACT_APP_DEV_TOOLS = 'true';
  
  // Disable source map generation for faster builds
  if (process.env.FAST_REFRESH === 'true') {
    process.env.GENERATE_SOURCEMAP = 'false';
  }
}

// Production-specific optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable source maps for debugging
  process.env.GENERATE_SOURCEMAP = 'true';
  
  // Disable React DevTools
  process.env.REACT_APP_DEV_TOOLS = 'false';
}
