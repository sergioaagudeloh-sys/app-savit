const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

walk('d:/Aplicaciones/App Savit/src', filePath => {
    if (filePath.endsWith('.css')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, lineIdx) => {
            for (let i = 0; i < line.length; i++) {
                if (line.charCodeAt(i) > 127) {
                    console.log(`${filePath}:${lineIdx + 1}: Found non-ASCII character '${line[i]}' (code: ${line.charCodeAt(i)})`);
                    break; // Only once per line
                }
            }
        });
    }
});
