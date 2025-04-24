const webpack = require('webpack')

const webpackRules = []
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: {
    app: './hr-public.js'
  },
  output: {
    filename: 'hr-public.[name].min.js',
    publicPath: '/models/HR/dist/'
  },
  resolve: {
    alias: {
      lodash: require.resolve('lodash'),
      moment: require.resolve('moment')
    }
  },
  externals: {
    lodash: '_',
    '@unitybase/ub-pub': 'UB',
    '@unitybase/adminui-pub': '$App',
    '@unitybase/adminui-vue': 'unitybase_adminui_vue',
    '@ub-d/iit-sign-web': 'UA_CRYPT',
    'vue': 'Vue',
    'element-ui': 'ElementUI',
    moment: {
      commonjs: 'moment',
      commonjs2: 'moment',
      amd: 'moment',
      root: 'moment'
    },
    'vuex': 'Vuex'
  },
  module: {
    rules: [{
      test: /\.vue$/,
      loader: 'vue-loader'
    }, {
      test: /\.js$/,
      use: ['babel-loader'],
      exclude: /node_modules/
    }, {
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader'
      ]
    }, {
      test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
      loader: 'url-loader',
      options: {
        limit: 8192
      }
    }]
  },
  // Removed babel plugins from `webpack.config` because it`s demage `Ext.callParent`.
  // In strict mode Function.calle in undefined, but this technic is used internally by Ext.callParent
  // module: {
  //   rules: webpackRules
  // },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: 'hr_vue_extracted.css'
    }),
    new webpack.DefinePlugin({
      BOUNDLED_BY_WEBPACK: true
    }),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
  ]
}
