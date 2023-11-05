const { rmSync } = require('node:fs');

console.log(`\x1b[33mDeleting christmas event files\x1b[0m`);

const files = [
    './src/structures/Calendar.ts',
    './src/typings/christmas.ts',
    './src/commands/calendar.ts',
    './src/cache/christmas.ts',
    './src/commands/christmascard.ts',
    './src/utils/christmas.ts',
    './src/commands/christmasart.ts',
    './src/structures/Gallery.ts'
];
const folders = ['./images/christmas/sorted'];

folders.forEach((folder) => {
    console.log(`\x1b[2mDeleting ${folder} and its content\x1b[0m`);
    rmSync(folder, { force: true, recursive: true });
});
files.forEach((file) => {
    console.log(`\x1b[2mDeleting ${file}\x1b[0m`);
    rmSync(file);
});

console.log(`\x1b[33mDeleted \x1b[34m${files.length}\x1b[0m\x1b[33m files\x1b[0m`);
