// Prepara la caché de electron-builder en Windows para que el build funcione
// sin permisos de administrador. El paquete winCodeSign trae enlaces simbólicos
// de macOS que Windows no puede crear sin privilegios, y eso hace fallar la
// extracción automática. Acá se extrae a mano ignorando esos dos enlaces
// (son librerías de Mac que en Windows no se usan).
// Se ejecuta solo como parte de "npm run dist".

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

if (process.platform !== 'win32') process.exit(0);

const VERSION = 'winCodeSign-2.6.0';
const URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${VERSION}/${VERSION}.7z`;

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const carpetaCache = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign');
const destino = path.join(carpetaCache, VERSION);
const marcador = path.join(destino, 'rcedit-x64.exe');

if (fs.existsSync(marcador)) {
  console.log('Caché de winCodeSign ya preparada.');
  process.exit(0);
}

fs.mkdirSync(carpetaCache, { recursive: true });
const archivo7z = path.join(carpetaCache, VERSION + '.7z');

console.log('Descargando ' + URL);
const descarga = spawnSync('curl.exe', ['-sL', '-o', archivo7z, URL], { stdio: 'inherit' });
if (descarga.status !== 0 || !fs.existsSync(archivo7z)) {
  console.error('No se pudo descargar winCodeSign. ¿Hay internet?');
  process.exit(1);
}

const sieteZip = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
console.log('Extrayendo (los 2 errores de symlink de macOS son esperados e inofensivos)...');
spawnSync(sieteZip, ['x', '-y', '-snld', archivo7z, '-o' + destino], { stdio: 'inherit' });

if (!fs.existsSync(marcador)) {
  console.error('La extracción de winCodeSign falló.');
  process.exit(1);
}

fs.rmSync(archivo7z, { force: true });
console.log('Caché de winCodeSign preparada. El build puede continuar.');
