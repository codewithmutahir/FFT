// prebuild.js
const fs = require('fs');
const path = require('path');

function updateAppJson() {
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  // Update build tools version
  if (appJson.expo.plugins) {
    for (let i = 0; i < appJson.expo.plugins.length; i++) {
      if (Array.isArray(appJson.expo.plugins[i]) && 
          appJson.expo.plugins[i][0] === 'expo-build-properties') {
        appJson.expo.plugins[i][1].android.buildToolsVersion = '34.0.0';
        appJson.expo.plugins[i][1].android.compileSdkVersion = 34;  // Changed from 33
        appJson.expo.plugins[i][1].android.targetSdkVersion = 34;   // Changed from 33
      }
    }
  }

  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log('Updated app.json with Android API 34');
}

async function main() {
  try {
    updateAppJson();
    console.log('Prebuild completed successfully');
  } catch (error) {
    console.error('Prebuild failed:', error);
    process.exit(1);
  }
}

main();