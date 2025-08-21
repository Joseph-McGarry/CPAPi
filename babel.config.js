module.exports = function (api) {
    api.cache(true);
    return {
      presets: ["babel-preset-expo"],
      plugins: [
        ["module-resolver", { root: ["."], alias: { "@": "./" }, extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] }],
        // If you installed react-native-reanimated, keep its plugin LAST:
        // "react-native-reanimated/plugin"
      ]
    };
  };
  