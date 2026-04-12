const { build } = require('vite');

build({
  logLevel: 'info',
  build: {
    minify: false,  // disable minification to see if it's a minify issue only
  }
}).then(() => {
  console.log('Build succeeded without minification');
}).catch((err) => {
  console.error('Build failed:', err.message);
});
