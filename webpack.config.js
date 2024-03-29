const path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  experiments: {
    topLevelAwait: true,
  },
  module: {
    rules: [
      {
        use: 'ts-loader',
        exclude: [
          /node_modules/,
          /test/,
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};