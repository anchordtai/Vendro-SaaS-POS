// Build script for Electron POS application
// Generates Windows installer for Onyxx Nightlife POS

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Onyxx Nightlife POS for Windows...');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true, force: true });
  }
  console.log('✅ Previous builds cleaned');
} catch (error) {
  console.log('⚠️  Error cleaning builds:', error.message);
}

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Build Next.js application
console.log('🏗️  Building Next.js application...');
try {
  execSync('npm run build:offline-ui', { stdio: 'inherit' });
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed');
} catch (error) {
  console.error('❌ Error building Next.js:', error.message);
  process.exit(1);
}

// Create required directories
console.log('📁 Creating required directories...');
try {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  console.log('✅ Directories created');
} catch (error) {
  console.error('❌ Error creating directories:', error.message);
  process.exit(1);
}

// Build Electron application
console.log('⚡ Building Electron application...');
try {
  execSync('npm run electron-build', { stdio: 'inherit' });
  console.log('✅ Electron build completed');
} catch (error) {
  console.error('❌ Error building Electron:', error.message);
  process.exit(1);
}

// Generate Windows installer
console.log('📀 Generating Windows installer...');
try {
  execSync('npm run build-installer', { stdio: 'inherit' });
  console.log('✅ Windows installer generated');
} catch (error) {
  console.error('❌ Error generating installer:', error.message);
  process.exit(1);
}

// Verify installer was created
const installerPath = path.join('dist', 'OnyxxPOSSetup.exe');
if (fs.existsSync(installerPath)) {
  const stats = fs.statSync(installerPath);
  console.log(`✅ Installer created successfully!`);
  console.log(`📍 Location: ${installerPath}`);
  console.log(`📏 Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
} else {
  console.error('❌ Installer not found at expected location');
  process.exit(1);
}

// Create distribution package
console.log('📦 Creating distribution package...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = packageJson.version;
  const packageName = `onyxx-nightlife-pos-v${version}`;
  
  const packageDir = path.join('dist', packageName);
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir, { recursive: true });
  }
  
  // Copy installer to package directory
  fs.copyFileSync(installerPath, path.join(packageDir, 'OnyxxPOSSetup.exe'));
  
  // Create README for distribution
  const readme = `# Onyxx Nightlife POS v${version}

## Installation
1. Double-click OnyxxPOSSetup.exe
2. Follow the installation wizard
3. Launch the application from desktop shortcut

## System Requirements
- Windows 10 or higher
- 4GB RAM minimum
- 500MB disk space
- USB port for thermal printer (optional)

## Features
- ✅ Full offline operation
- ✅ Thermal receipt printing
- ✅ Product management
- ✅ Sales reporting
- ✅ Real-time dashboard
- ✅ Nigerian Naira currency

## Support
For support contact:
- Email: support@onyxxnightlife.com
- Phone: +234-XXX-XXXX-XXXX

---
Generated: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(path.join(packageDir, 'README.txt'), readme);
  
  // Create installation script
  const installScript = `@echo off
echo Installing Onyxx Nightlife POS...
echo.
echo Please wait while the installer launches...
echo.
start OnyxxPOSSetup.exe
echo.
echo If the installer doesn't start automatically, please double-click OnyxxPOSSetup.exe
echo.
pause`;
  
  fs.writeFileSync(path.join(packageDir, 'install.bat'), installScript);
  
  console.log(`✅ Distribution package created: ${packageDir}`);
} catch (error) {
  console.error('❌ Error creating distribution package:', error.message);
}

// Display final summary
console.log('\n🎉 Build completed successfully!');
console.log('\n📋 Build Summary:');
console.log(`✅ Next.js application built`);
console.log(`✅ Electron application packaged`);
console.log(`✅ Windows installer generated`);
console.log(`✅ Distribution package created`);
console.log('\n📍 Files created:');
console.log(`📀 Installer: dist/OnyxxPOSSetup.exe`);
console.log(`📦 Package: dist/onyxx-nightlife-pos-v${JSON.parse(fs.readFileSync('package.json', 'utf8')).version}/`);
console.log('\n🚀 Ready for distribution!');
console.log('\n📝 Next steps:');
console.log('1. Copy the dist/onyxx-nightlife-pos-vX.X.X/ folder to USB drive');
console.log('2. Run install.bat on target machine or double-click OnyxxPOSSetup.exe');
console.log('3. Follow installation instructions');
console.log('4. Launch the POS application');

console.log('\n✨ Thank you for using Onyxx Nightlife POS! ✨');
