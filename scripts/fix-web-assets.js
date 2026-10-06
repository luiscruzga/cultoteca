// Vercel no publica directorios llamados node_modules dentro del output.
// expo export deja las fuentes de @expo/vector-icons en dist/assets/node_modules,
// así que se mueven a dist/assets/vendor y se reescriben las referencias de los bundles.
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');

if (!fs.existsSync(from)) {
  console.log('[fix-web-assets] Nada que reubicar');
  process.exit(0);
}

fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

let patched = 0;
for (const file of walk(dist).filter((f) => /\.(js|html|json|css)$/.test(f))) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('/assets/node_modules/')) {
    fs.writeFileSync(file, content.split('/assets/node_modules/').join('/assets/vendor/'));
    patched++;
  }
}
console.log(`[fix-web-assets] Assets movidos a assets/vendor (${patched} ficheros actualizados)`);
