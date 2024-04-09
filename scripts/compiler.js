const { readdirSync, statSync, copyFileSync, existsSync, mkdirSync } = require('node:fs')
const { join } = require('node:path')

const read = (path) => {
    readdirSync(path).forEach((sub) => {
        if (statSync(join(path, sub)).isDirectory()) {
            if (!existsSync(join(path, sub).replace('src', 'dist'))) mkdirSync(join(path, sub).replace('src', 'dist'))
            return read(join(path, sub))
        }

        if (sub.endsWith('.json')) {
            console.log(`Copying ${join(path, sub)}`)
            copyFileSync(join(path, sub), join(path, sub).replace('src', 'dist'))
        }
    })
}

readdirSync('src').filter(x => !x.includes('.')).forEach((sub) => {
    read(join('src', sub))
})