const { withAndroidManifest } = require('expo/config-plugins');

// Keep HTTP access enabled when Expo regenerates the release native project.
module.exports = function withHttpApi(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  });
};
