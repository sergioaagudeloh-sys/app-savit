const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('d:/Aplicaciones/App Savit/src/styles/index.css', 'utf8');
const lines = content.split('\n');
lines.forEach((line, lineIdx) => {
    for (let i = 0; i < line.length; i++) {
        if (line.charCodeAt(i) === 160) {
            console.log(`Line ${lineIdx + 1}: Found non-breaking space (code 160) at index ${i}`);
        }
    }
});
