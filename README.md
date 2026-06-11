# Sistema de Cotización — WoodTools

Formulario que replica el talonario de cotización de Wood Tools S.R.L. y genera el PDF listo para enviar al cliente. Funciona como página web o como aplicación de escritorio instalable.

## Cómo usarlo

1. Abrir la aplicación **Cotizaciones WoodTools** (o `index.html` en el navegador: doble clic alcanza, no necesita servidor).
2. Completar los datos. Los campos con asterisco rojo (*) son obligatorios: si falta alguno, al generar el PDF avisa cuáles son y los marca en rojo.
3. Apretar **Terminar y generar PDF**: se descarga `Cotizacion_<cliente>_<fecha>.pdf` con el mismo formato del talonario.

## Aplicación de escritorio (para varias PC)

Se genera con:

```
npm install        (la primera vez)
npm run dist
```

`npm run dist` prepara solo la caché de electron-builder (script `scripts/preparar_build.js`), así el build funciona a la primera en cualquier máquina, sin permisos de administrador.

Quedan dos archivos en `dist/`:

- **`Instalador-Cotizaciones-WoodTools-1.0.0.exe`** — se instala con doble clic, crea el acceso directo **Cotizaciones WoodTools** en el escritorio y el menú Inicio. No pide permisos de administrador.
- **`Cotizaciones-WoodTools-Portable-1.0.0.exe`** — no necesita instalación: se ejecuta directo. Sirve para correrlo desde un pendrive o una carpeta compartida en red.

Para probar la aplicación sin empaquetar: `npm start`.

### Cómo repartirlo sin el aviso de Windows (SmartScreen)

El aviso azul "Windows protegió tu PC" aparece solo cuando el archivo viene marcado como descargado de internet (navegador, WhatsApp Web, Drive, mail). Para evitarlo:

- **Pendrive**: copiar el `.exe` a un pendrive y de ahí a cada PC → no aparece ningún aviso.
- **Carpeta compartida de red local**: tampoco suele mostrar el aviso.
- Si igual aparece: "Más información" → "Ejecutar de todas formas" (una sola vez por PC).

La única forma de que nunca aparezca, incluso bajándolo de internet, es firmar el ejecutable con un **certificado de firma de código** (es un servicio pago, p. ej. Azure Trusted Signing ≈ US$ 10/mes o un certificado OV ≈ US$ 100–400/año). Si algún día se contrata uno, electron-builder lo integra con unas pocas líneas de configuración.

## Comportamiento de los campos

- **Fecha**: se completa sola con el día de hoy (se puede cambiar).
- **País**: buscador con todos los países (Argentina primera y precargada).
- **Localidad**: buscador según el país elegido. Para Argentina el listado está incluido (funciona sin internet); para otros países se consulta una API por internet, y si no hay conexión se puede escribir a mano.
- **C.U.I.T.**: se formatea solo con los guiones (XX-XXXXXXXX-X).
- **I.V.A.**: selector. Con "Consumidor final" o "Exento", el 21% se suma directo en el precio unitario apenas se termina de escribir el número (y si se cambia la condición después, los precios ya cargados se ajustan solos). Con "Responsable inscripto 21%", el precio unitario queda como se ingresó y el 21% se suma en el precio total.
- **Cantidad**: solo números.
- **% de descuento**: solo números, con "%" automático. Se descuenta del precio unitario del ítem en el total.
- **Precio unitario**: selector de moneda ($ pesos / U$ dólares) + valor.
- **Precio total**: suma de cantidad × precio unitario de cada ítem. Si todos son pesos, da en pesos; si todos son dólares, en dólares; si hay mezcla, los dólares se pasan a pesos con el tipo de cambio.
- **Vigencia de Cotización**: solo números, con " días" automático.
- **Condiciones de Pago**: selector (Transferencia, Efectivo, Link de pago, Tarjeta de Débito/Crédito, Otros). Con "Otros" aparece un campo para detallar.
- **Tipo de Cambio**: valor de U$ 1 en pesos. Obligatorio; se usa para convertir los ítems en dólares.

## Estructura

```
index.html                  Formulario
css/styles.css              Estilos (imita el talonario en papel)
js/app.js                   Lógica del formulario y armado del PDF
js/logos.js                 Logos en base64 (se incrustan en el PDF)
js/paises.js                Lista de países (generada)
js/localidades_ar.js        Localidades de Argentina (generada)
js/lib/                     jsPDF y AutoTable (locales, funciona sin internet)
scripts/generar_paises.js   Regenera js/paises.js (node scripts/generar_paises.js)
Imagenes/                   Logos originales (se ven en la página web)
```

## Notas

- Si se cambian los logos de la carpeta `Imagenes`, hay que regenerar `js/logos.js` (son los mismos logos convertidos a base64 para el PDF).
- Los datos fijos de la empresa (CUIT, dirección, teléfonos) están en `index.html` (parte visible) y en `js/app.js` (parte del PDF).
- Para actualizar las localidades argentinas: descargar de `https://apis.datos.gob.ar/georef/api/localidades?campos=nombre,provincia.nombre&max=5000` y regenerar `js/localidades_ar.js`.
# cotizador_woodtools
