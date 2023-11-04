const { rmSync } = require('node:fs');

console.log(`\x1b[33mDeleting christmas event files\x1b[0m`);

const files = [
    './src/structures/Calendar.ts',
    './src/typings/calendar.ts',
    './src/commands/calendar.ts',
    './src/cache/christmas.ts'
];

files.forEach((file) => {
    console.log(`\x1b[2mDeleting ${file}\x1b[0m`);
    rmSync(file);
});

console.log(`\x1b[33mDeleted \x1b[34m${files.length}\x1b[0m\x1b[33m files\x1b[0m`);
