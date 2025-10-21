#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Current version from package.json
const frontendPackagePath = path.join(__dirname, 'frontend', 'package.json');
const backendPackagePath = path.join(__dirname, 'backend', 'package.json');

const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));

const currentVersion = frontendPackage.version;
const versionParts = currentVersion.split('.');

// Increment patch version
const newVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;

console.log(`🔄 Updating version from ${currentVersion} to ${newVersion}`);

// Update frontend package.json
frontendPackage.version = newVersion;
fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));
console.log(`✅ Frontend version updated: ${frontendPackagePath}`);

// Update backend package.json
backendPackage.version = newVersion;
fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
console.log(`✅ Backend version updated: ${backendPackagePath}`);

// Update download links in components
const landingPagePath = path.join(__dirname, 'frontend', 'src', 'components', 'LandingPage.jsx');
const registrationSuccessPath = path.join(__dirname, 'frontend', 'src', 'components', 'RegistrationSuccess.jsx');

if (fs.existsSync(landingPagePath)) {
  let landingPageContent = fs.readFileSync(landingPagePath, 'utf8');
  landingPageContent = landingPageContent.replace(/Fluxy-Setup-1\.\d+\.\d+\.exe/g, `Fluxy-Setup-${newVersion}.exe`);
  fs.writeFileSync(landingPagePath, landingPageContent);
  console.log(`✅ Landing page download link updated`);
}

if (fs.existsSync(registrationSuccessPath)) {
  let registrationSuccessContent = fs.readFileSync(registrationSuccessPath, 'utf8');
  registrationSuccessContent = registrationSuccessContent.replace(/Fluxy-Setup-1\.\d+\.\d+\.exe/g, `Fluxy-Setup-${newVersion}.exe`);
  fs.writeFileSync(registrationSuccessPath, registrationSuccessContent);
  console.log(`✅ Registration success download link updated`);
}

console.log(`🎉 Version update completed! New version: ${newVersion}`);
console.log(`📦 Ready for build with: npm run dist:win`);
