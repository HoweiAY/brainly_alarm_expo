const {
  withAppBuildGradle,
  createRunOncePlugin,
} = require("expo/config-plugins");

const CXX_CLEAN_SNIPPET = `
// Workaround: clean deletes autolinked library codegen dirs (e.g. lucide) before
// externalNativeBuildClean re-runs CMake configuration, which then fails because
// those dirs are gone. Delete .cxx first so the CMake clean is a no-op.
tasks.matching { it.name ==~ /externalNativeBuildClean.*/ }.configureEach {
    doFirst {
        def cxxDir = file(".cxx")
        if (cxxDir.exists()) {
            cxxDir.deleteDir()
        }
    }
}
`;

const withCxxCleanFix = (config) => {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;
    if (!contents.includes("externalNativeBuildClean")) {
      mod.modResults.contents = contents + "\n" + CXX_CLEAN_SNIPPET;
    }
    return mod;
  });
};

module.exports = createRunOncePlugin(
  withCxxCleanFix,
  "withCxxCleanFix",
  "1.0.0",
);
