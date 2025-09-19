module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Disable postcss-calc to fix Radix UI CSS parsing issues
    'postcss-calc': false
  },
}
