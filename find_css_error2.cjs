const fs = require('fs');
const path = require('path');

const results = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
      walk(full);
    } else if (file.endsWith('.css')) {
      checkFile(full);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
      // Check for inline styles with pseudo-elements (unlikely but possible)
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Look for selectors ending with :: (space after)
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Detect "selector:: {" or "selector:: " patterns (space after ::)
    if (/[\w\]\)]::\s/.test(trimmed) || /[\w\]\)]::\s*$/.test(trimmed)) {
      results.push({ file: filePath, line: i + 1, content: trimmed });
    }
    // Detect ": :" (space inside pseudo with single colon patterns that could cause issues)
    if (/:\s+:/.test(trimmed)) {
      results.push({ file: filePath, line: i + 1, content: '[colon-space-colon] ' + trimmed });
    }
  });
  
  // Also look for NBSP or unusual whitespace chars in CSS selectors
  const suspicious = content.match(/:[:\w-]*[\u00a0\u2000-\u200b\u202f\u205f\u3000][\w-]*/g);
  if (suspicious) {
    results.push({ file: filePath, line: '?', content: 'NON-BREAKING SPACES: ' + JSON.stringify(suspicious) });
  }
}

walk(path.join(__dirname, 'src'));
walk(path.join(__dirname, 'public'));

if (results.length === 0) {
  console.log('No issues found via regex. Trying character-level scan...');
  
  // Do a full character scan for unusual whitespace in pseudo-elements
  function scanForNbsp(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
        scanForNbsp(full);
      } else if (file.endsWith('.css')) {
        const buf = fs.readFileSync(full);
        for (let i = 0; i < buf.length; i++) {
          if (buf[i] === 0xA0) { // non-breaking space
            const lineNum = buf.slice(0, i).toString('utf8').split('\n').length;
            const context = buf.slice(Math.max(0, i-30), i+30).toString('utf8');
            console.log(`NBSP at ${full}:${lineNum} -> "${context}"`);
          }
          // Also check for CSS pseudo-element followed by whitespace 
          // :: = 0x3A 0x3A
          if (buf[i] === 0x3A && buf[i+1] === 0x3A && (buf[i+2] === 0x20 || buf[i+2] === 0x09)) {
            const lineNum = buf.slice(0, i).toString('utf8').split('\n').length;
            const context = buf.slice(Math.max(0, i-20), i+40).toString('utf8');
            console.log(`SPACE-AFTER-:: at ${full}:${lineNum} -> "${context}"`);
          }
        }
      }
    }
  }
  
  scanForNbsp(path.join(__dirname, 'src'));
} else {
  results.forEach(r => console.log(`${r.file}:${r.line}: ${r.content}`));
}
