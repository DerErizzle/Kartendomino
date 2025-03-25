module.exports = {
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'assets',

  // Entwicklungsserver-Konfiguration
  devServer: {
    port: 8080,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        logLevel: 'debug'
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    historyApiFallback: true,
    client: {
      overlay: true,
      webSocketURL: 'ws://localhost:8080/ws'
    },
    webSocketServer: 'ws'
  },

  // Alias-Pfade
  configureWebpack: {
    resolve: {
      alias: {
        '@': require('path').resolve(__dirname, 'src')
      }
    },
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    }
  }
};