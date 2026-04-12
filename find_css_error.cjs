const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
      walk(full);
    } else if (file.endsWith('.css')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Match :: followed by whitespace (invalid pseudo-element)
        if (/:: [a-z]/.test(line) || /:: $/.test(line)) {
          console.log(`${full}:${i + 1}: ${line.trim()}`);
        }
        // Also look for selectors that have space after :: in position of pseudo-element name
        if (/\w+:: /.test(line)) {
          console.log(`[space-after-::] ${full}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

walk(path.join(__dirname, 'src'));
