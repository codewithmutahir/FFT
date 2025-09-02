// build-apk.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting APK build process...');

// Check if eas.json exists
console.log('Checking EAS configuration...');
const easConfigPath = path.join(process.cwd(), 'eas.json');
if (!fs.existsSync(easConfigPath)) {
  console.log('Creating eas.json...');
  const easConfig = {
    "cli": {
      "version": ">= 5.2.0"
    },
    "build": {
      "production": {
        "android": {
          "buildType": "apk"
        }
      }
    }
  };
  fs.writeFileSync(easConfigPath, JSON.stringify(easConfig, null, 2));
}

// Skip Android configuration update - already configured in expo-build-properties
console.log('Android configuration already set in expo-build-properties plugin');

// Install packages
console.log('Installing packages...');
try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('Packages installed successfully');
} catch (error) {
  console.error('Failed to install packages:', error);
  process.exit(1);
}

// Run EAS build
console.log('Starting EAS build...');
try {
  execSync('npx eas build --platform android --profile production --non-interactive', { 
    stdio: 'inherit'
  });
  console.log('EAS build completed successfully');
} catch (error) {
  console.error('EAS build failed:', error.message);
  console.log('Check the EAS dashboard for build details');
  process.exit(1);
}

console.log('Build process completed');