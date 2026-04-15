const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }
      req.headers["origin"] = `http://localhost:5000`;
      req.headers["referer"] = `http://localhost:5000/`;
      return middleware(req, res, next);
    };
  },
};

const workspaceRoot = path.resolve(__dirname, "../..");
const pnpmStoreRoot = path.resolve(workspaceRoot, "node_modules/.pnpm");

config.watchFolders = [workspaceRoot];

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg"],
  blockList: [
    new RegExp(`${pnpmStoreRoot.replace(/[/\\]/g, "[/\\\\]")}[/\\\\].*_tmp_\\d+`),
  ],
};

config.watcher = {
  ...config.watcher,
  watchman: {
    deferStates: ["hg.update"],
  },
};

module.exports = config;
