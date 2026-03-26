// Simple build script that skips npm install
// For when dependencies are already installed

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Onyxx Nightlife POS (Simple Mode)...');

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

console.log('\n🎉 Build completed successfully!');
console.log('\n📋 Build Summary:');
console.log(`✅ Next.js application built`);
console.log(`✅ Electron application packaged`);
console.log(`✅ Windows installer generated`);
console.log('\n📍 Files created:');
console.log(`📀 Installer: dist/OnyxxPOSSetup.exe`);
console.log('\n🚀 Ready for distribution!');
