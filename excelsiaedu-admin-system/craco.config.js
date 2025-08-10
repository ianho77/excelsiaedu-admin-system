module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 忽略source map警告
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /ENOENT: no such file or directory/
      ];
      return webpackConfig;
    },
  },
};
