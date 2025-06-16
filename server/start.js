const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.js');

// Check if dist/index.js exists
if (!fs.existsSync(indexPath)) {
  console.log('Building TypeScript files...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Start the server
console.log('Starting server...');
require('./dist/index.js'); 