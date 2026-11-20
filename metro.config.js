const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push("sql");

const decodeInteropPath = path.resolve(
  __dirname,
  "shims/decode-uri-component-interop.js",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // query-string 7.x (required by expo-router) needs decode-uri-component as
  // CommonJS, but the patched 0.5.x releases are ESM-only. Serve a CJS bridge,
  // except when the bridge itself resolves the real package.
  if (
    moduleName === "decode-uri-component" &&
    !context.originModulePath?.endsWith("decode-uri-component-interop.js")
  ) {
    return { type: "sourceFile", filePath: decodeInteropPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
