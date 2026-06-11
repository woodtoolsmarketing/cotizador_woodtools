// Genera build/icon.ico a partir de build/icon-256.png (PNG embebido en ICO).
// Ejecutar: node scripts/generar_icono.js

const fs = require('fs');
const path = require('path');

const rutaPng = path.join(__dirname, '..', 'build', 'icon-256.png');
const rutaIco = path.join(__dirname, '..', 'build', 'icon.ico');

const png = fs.readFileSync(rutaPng);

// Cabecera ICONDIR: reservado(2) + tipo 1 = ícono(2) + cantidad de imágenes(2)
const icondir = Buffer.alloc(6);
icondir.writeUInt16LE(0, 0);
icondir.writeUInt16LE(1, 2);
icondir.writeUInt16LE(1, 4);

// ICONDIRENTRY: ancho y alto 0 = 256px
const entrada = Buffer.alloc(16);
entrada.writeUInt8(0, 0);            // ancho (0 = 256)
entrada.writeUInt8(0, 1);            // alto (0 = 256)
entrada.writeUInt8(0, 2);            // paleta
entrada.writeUInt8(0, 3);            // reservado
entrada.writeUInt16LE(1, 4);         // planos de color
entrada.writeUInt16LE(32, 6);        // bits por píxel
entrada.writeUInt32LE(png.length, 8);  // tamaño de los datos
entrada.writeUInt32LE(22, 12);       // offset de los datos (6 + 16)

fs.writeFileSync(rutaIco, Buffer.concat([icondir, entrada, png]));
console.log('Generado build/icon.ico (' + (icondir.length + entrada.length + png.length) + ' bytes)');
