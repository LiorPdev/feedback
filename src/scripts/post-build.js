import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
const openNextDir = path.join(rootDir, '.open-next');
const assetsDir = path.join(openNextDir, 'assets');

console.log('--- Post-Build Script Starting ---');

// 1. Fix directory structure: Move ALL assets to root
if (fs.existsSync(assetsDir)) {
    console.log('Moving all assets from .open-next/assets to root...');
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
        const src = path.join(assetsDir, file);
        const dest = path.join(openNextDir, file);
        
        if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true, force: true });
        }
        fs.renameSync(src, dest);
    }
    fs.rmSync(assetsDir, { recursive: true, force: true });
    console.log('Assets moved successfully.');
}

// 2. Create _routes.json to bypass worker for static assets
console.log('Creating _routes.json...');
const routes = {
    version: 1,
    include: ["/*"],
    exclude: [
        "/_next/static/*",
        "/*.png",
        "/*.jpg",
        "/*.jpeg",
        "/*.webp",
        "/*.svg",
        "/*.ico",
        "/*.woff2",
        "/manifest.json"
    ]
};
fs.writeFileSync(
    path.join(openNextDir, '_routes.json'),
    JSON.stringify(routes)
);
console.log('_routes.json created.');

// 3. Rename worker.js to _worker.js and ensure UTF-8 without BOM
const workerJs = path.join(openNextDir, 'worker.js');
const workerJsOut = path.join(openNextDir, '_worker.js');

if (fs.existsSync(workerJs)) {
    console.log('Renaming and formatting worker.js...');
    const content = fs.readFileSync(workerJs, 'utf8');
    // fs.writeFileSync with 'utf8' on Node.js does NOT add a BOM.
    fs.writeFileSync(workerJsOut, content, 'utf8');
    fs.rmSync(workerJs);
    console.log('Worker prepared successfully (UTF-8 no BOM).');
}

// 4. Cleanup redundant files
const cacheDir = path.join(openNextDir, 'cache');
if (fs.existsSync(cacheDir)) {
    console.log('Cleaning up build cache...');
    fs.rmSync(cacheDir, { recursive: true, force: true });
}

console.log('--- Post-Build Script Completed Successfully ---');
