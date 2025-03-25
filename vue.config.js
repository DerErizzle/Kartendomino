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
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
    historyApiFallback: true, // Für die Vue Router History-Mode
    hot: true,
    client: {
      overlay: true, // Fehler im Browser anzeigen
    }
  },

  // Konfiguration für die Produktionsversion
  configureWebpack: {
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    }
  },

  // CSS-Einstellungen
  css: {
    loaderOptions: {
      css: {
        // css-loader-Optionen
      }
    }
  }
};