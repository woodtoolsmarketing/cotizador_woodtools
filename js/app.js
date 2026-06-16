/* ===== Sistema de Cotización WoodTools ===== */

const cuerpoItems = document.getElementById('cuerpo-items');
const btnAgregar = document.getElementById('btn-agregar');
const btnTerminar = document.getElementById('btn-terminar');

/* ---------- Logos optimizados para el PDF ----------
   Los PNG originales hacen que jsPDF genere archivos de varios MB.
   Se reconvierten a JPEG sobre fondo blanco (la hoja es blanca),
   lo que baja el peso del PDF a una fracción. */

const logosPdf = {
  woodtools: { data: LOGO_WOODTOOLS, tipo: 'PNG' },
  diamante: { data: LOGO_DIAMANTE, tipo: 'PNG' }
};

function prepararLogo(clave, dataUrl) {
  const img = new Image();
  img.onload = () => {
    const lienzo = document.createElement('canvas');
    lienzo.width = 320;
    lienzo.height = 320;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 320, 320);
    ctx.drawImage(img, 0, 0, 320, 320);
    logosPdf[clave] = { data: lienzo.toDataURL('image/jpeg', 0.88), tipo: 'JPEG' };
  };
  img.src = dataUrl;
}

prepararLogo('woodtools', LOGO_WOODTOOLS);
prepararLogo('diamante', LOGO_DIAMANTE);

/* ---------- Utilidades ---------- */

function valor(id) {
  return document.getElementById(id).value.trim();
}

function normalizar(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parsearNumero(texto) {
  // Acepta formatos "1.234,56" (es-AR) y "1234.56"
  const limpio = String(texto).replace(/[^\d.,-]/g, '');
  if (limpio === '') return NaN;
  if (limpio.includes(',')) {
    return parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(limpio);
}

function dinero(valorNum) {
  return valorNum.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* Restringe un input a números (con o sin decimales) y le pega
   un sufijo fijo al final, p. ej. "350mm", "10%", "5 días". */
function soloNumeros(input, opciones = {}) {
  const { decimales = false, sufijo = '' } = opciones;
  input.addEventListener('input', () => {
    const patron = decimales ? /[^\d.,]/g : /\D/g;
    const limpio = input.value.replace(patron, '');
    input.value = limpio === '' ? '' : limpio + sufijo;
    const pos = limpio.length;
    input.setSelectionRange(pos, pos);
  });
}

/* ---------- Buscador desplegable (país / localidad) ---------- */

function crearBuscador(input, obtenerOpciones, alElegir) {
  const contenedor = input.parentElement;
  const lista = document.createElement('div');
  lista.className = 'lista-buscador';
  contenedor.appendChild(lista);

  function mostrar() {
    const consulta = normalizar(input.value.trim());
    const opciones = obtenerOpciones();
    lista.innerHTML = '';

    if (typeof opciones === 'string') {
      // Mensaje informativo (p. ej. "Cargando...")
      const aviso = document.createElement('div');
      aviso.className = 'aviso';
      aviso.textContent = opciones;
      lista.appendChild(aviso);
      lista.style.display = 'block';
      return;
    }

    const filtradas = (consulta === ''
      ? opciones
      : opciones.filter(o => normalizar(o.texto).includes(consulta))
    ).slice(0, 60);

    if (filtradas.length === 0) {
      lista.style.display = 'none';
      return;
    }

    filtradas.forEach(opcion => {
      const div = document.createElement('div');
      div.className = 'opcion';
      div.textContent = opcion.texto;
      div.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = opcion.valor;
        lista.style.display = 'none';
        if (alElegir) alElegir(opcion);
      });
      lista.appendChild(div);
    });
    lista.style.display = 'block';
  }

  input.addEventListener('focus', mostrar);
  input.addEventListener('input', mostrar);
  input.addEventListener('blur', () => {
    setTimeout(() => { lista.style.display = 'none'; }, 150);
  });
}

/* ---------- País y localidad ---------- */

const inputPais = document.getElementById('pais');
const inputLocalidad = document.getElementById('localidad');

const opcionesPaises = PAISES.map(p => ({ texto: p.es, valor: p.es, en: p.en }));
const opcionesLocalidadesAr = LOCALIDADES_AR.map(([nombre, provincia]) => ({
  texto: `${nombre} (${provincia})`,
  valor: nombre,
  provincia
}));

const cacheCiudades = {}; // nombre en inglés -> opciones | 'cargando' | 'error'

/* Tierra del Fuego está exenta de I.V.A. (Ley 19.640): cuando la localidad
   elegida pertenece a esa provincia no se suma el 21% en ningún modo de IVA.
   La provincia se guarda en el dataset al elegir la localidad del listado. */
function esTierraDelFuego() {
  return normalizar(inputLocalidad.dataset.provincia || '').includes('tierra del fuego');
}

function paisActual() {
  const nombre = normalizar(inputPais.value.trim());
  return PAISES.find(p => normalizar(p.es) === nombre || normalizar(p.en) === nombre) || null;
}

function cargarCiudades(pais) {
  if (pais.es === 'Argentina' || cacheCiudades[pais.en]) return;
  cacheCiudades[pais.en] = 'cargando';
  fetch('https://countriesnow.space/api/v0.1/countries/cities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country: pais.en })
  })
    .then(r => r.json())
    .then(respuesta => {
      if (!respuesta.error && Array.isArray(respuesta.data)) {
        cacheCiudades[pais.en] = respuesta.data
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map(c => ({ texto: c, valor: c }));
      } else {
        cacheCiudades[pais.en] = 'error';
      }
    })
    .catch(() => { cacheCiudades[pais.en] = 'error'; });
}

crearBuscador(inputPais, () => opcionesPaises, opcion => {
  inputLocalidad.value = '';
  delete inputLocalidad.dataset.provincia;
  sincronizarRecargoUnitario();
  const pais = paisActual();
  if (pais) cargarCiudades(pais);
});

crearBuscador(inputLocalidad, () => {
  const pais = paisActual();
  if (!pais) return 'Elegí primero el país';
  if (pais.es === 'Argentina') return opcionesLocalidadesAr;
  const ciudades = cacheCiudades[pais.en];
  if (ciudades === 'cargando') return 'Cargando localidades...';
  if (ciudades === 'error' || !ciudades) return 'Sin listado disponible: escribila a mano';
  return ciudades;
}, opcion => {
  // Al elegir una localidad del listado se guarda su provincia, para
  // saber si es Tierra del Fuego (exenta de IVA).
  inputLocalidad.dataset.provincia = opcion.provincia || '';
  sincronizarRecargoUnitario();
});

// Si el usuario edita la localidad a mano, la provincia deja de ser válida.
inputLocalidad.addEventListener('input', () => {
  delete inputLocalidad.dataset.provincia;
  sincronizarRecargoUnitario();
});

/* ---------- Máscara de C.U.I.T. (XX-XXXXXXXX-X) ---------- */

const inputCuit = document.getElementById('cuit-cliente');
inputCuit.addEventListener('input', () => {
  const digitos = inputCuit.value.replace(/\D/g, '').slice(0, 11);
  let formateado = digitos;
  if (digitos.length > 2) formateado = digitos.slice(0, 2) + '-' + digitos.slice(2);
  if (digitos.length === 11) {
    formateado = digitos.slice(0, 2) + '-' + digitos.slice(2, 10) + '-' + digitos.slice(10);
  }
  inputCuit.value = formateado;
});

/* ---------- Condición de pago: campo "Otros" ---------- */

const selectPago = document.getElementById('pago');
const inputPagoOtros = document.getElementById('pago-otros');
selectPago.addEventListener('change', () => {
  inputPagoOtros.classList.toggle('oculto', selectPago.value !== 'Otros');
  if (selectPago.value !== 'Otros') inputPagoOtros.value = '';
});

/* ---------- Inicialización ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Fecha de hoy por defecto (dd/mm/aa)
  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, '0');
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const aa = String(hoy.getFullYear()).slice(-2);
  document.getElementById('fecha').value = `${dd}/${mm}/${aa}`;

  inputPais.value = 'Argentina';

  soloNumeros(document.getElementById('vigencia'), { sufijo: ' días' });
  soloNumeros(document.getElementById('tipo-cambio'), { decimales: true });

  document.getElementById('condicion-iva').addEventListener('change', sincronizarRecargoUnitario);
  document.getElementById('tipo-cambio').addEventListener('input', actualizarTotal);

  agregarFila();
});

btnAgregar.addEventListener('click', agregarFila);
btnTerminar.addEventListener('click', generarPDF);

/* ---------- Manejo de filas ---------- */

function agregarFila() {
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td class="celda-item"></td>
    <td><input type="text" class="inp-cant" inputmode="numeric"></td>
    <td class="celda-desc"><input type="text" class="inp-desc" placeholder="Descripción de la herramienta"></td>
    <td><input type="text" class="inp-descu" inputmode="decimal"></td>
    <td>
      <div class="celda-moneda">
        <select class="inp-moneda" title="Moneda">
          <option value="$">$</option>
          <option value="U$">U$</option>
        </select>
        <input type="text" class="inp-unit" inputmode="decimal">
      </div>
    </td>
    <td class="celda-total-fila"></td>
    <td class="celda-borrar"><button type="button" class="btn-quitar" title="Quitar ítem">&times;</button></td>
  `;

  fila.querySelector('.btn-quitar').addEventListener('click', () => {
    if (cuerpoItems.rows.length > 1) {
      fila.remove();
      renumerar();
      actualizarTotal();
    }
  });

  soloNumeros(fila.querySelector('.inp-cant'));
  fila.querySelector('.inp-cant').addEventListener('input', actualizarTotal);
  soloNumeros(fila.querySelector('.inp-descu'), { decimales: true, sufijo: '%' });
  soloNumeros(fila.querySelector('.inp-unit'), { decimales: true });

  const inpUnit = fila.querySelector('.inp-unit');
  inpUnit.addEventListener('input', () => {
    // El usuario está cargando un precio nuevo: todavía no tiene el 21%
    delete inpUnit.dataset.ivaAplicado;
    actualizarTotal();
  });
  // Consumidor final / Exento: el 21% se mete en el precio unitario
  // apenas el usuario termina de ingresar el número
  inpUnit.addEventListener('blur', () => aplicarIvaEnUnitario(inpUnit));

  fila.querySelector('.inp-descu').addEventListener('input', actualizarTotal);
  fila.querySelector('.inp-moneda').addEventListener('change', actualizarTotal);

  cuerpoItems.appendChild(fila);
  renumerar();
}

function renumerar() {
  [...cuerpoItems.rows].forEach((fila, i) => {
    fila.querySelector('.celda-item').textContent = i + 1;
  });
}

/* ---------- Recolección de datos ---------- */

function recolectarItems() {
  return [...cuerpoItems.rows]
    .map((fila, i) => ({
      fila,
      item: String(i + 1),
      cant: fila.querySelector('.inp-cant').value.trim(),
      desc: fila.querySelector('.inp-desc').value.trim(),
      descu: fila.querySelector('.inp-descu').value.trim(),
      moneda: fila.querySelector('.inp-moneda').value,
      unit: fila.querySelector('.inp-unit').value.trim()
    }))
    .filter(it => it.desc !== '' || it.cant !== '' || it.unit !== '' || it.descu !== '');
}

/* ---------- I.V.A. y cálculo del total ----------
   - Consumidor final / Exento: el 21% se suma directo en el precio
     unitario, apenas el usuario termina de ingresar el número.
   - Responsable inscripto 21%: el precio unitario queda como se ingresó
     y el 21% se suma en el PRECIO TOTAL.
   - El descuento de cada ítem se aplica sobre su precio unitario.
   - El PRECIO TOTAL es la suma de cantidad x precio unitario de cada ítem:
     todo en $ o todo en U$ según corresponda; si hay mezcla,
     los U$ se pasan a $ con el tipo de cambio. */

function esConRecargoEnUnitario(iva) {
  return iva === 'Consumidor final' || iva === 'Exento';
}

// ¿Corresponde sumar el 21% en el precio unitario? Es así en Consumidor
// final / Exento, salvo que la localidad sea Tierra del Fuego (sin IVA).
function recargoUnitarioActivo() {
  return esConRecargoEnUnitario(valor('condicion-iva')) && !esTierraDelFuego();
}

// Número apto para volver a escribirse en un input (coma decimal, sin miles)
function numeroAInput(valorNum) {
  return parseFloat(valorNum.toFixed(2)).toString().replace('.', ',');
}

function aplicarIvaEnUnitario(input) {
  if (!recargoUnitarioActivo()) return;
  if (input.dataset.ivaAplicado === '1') return;
  const numero = parsearNumero(input.value);
  if (isNaN(numero) || numero <= 0) return;
  input.value = numeroAInput(numero * 1.21);
  input.dataset.ivaAplicado = '1';
  actualizarTotal();
}

/* Al cambiar la condición de IVA o la localidad se ajustan los precios ya
   cargados: cuando pasa a corresponder el 21% en el unitario se agrega, y
   cuando deja de corresponder (incluida Tierra del Fuego) se quita. */
let recargoUnitarioPrevio = false;

function sincronizarRecargoUnitario() {
  const ahora = recargoUnitarioActivo();
  if (ahora !== recargoUnitarioPrevio) {
    for (const fila of cuerpoItems.rows) {
      const input = fila.querySelector('.inp-unit');
      const numero = parsearNumero(input.value);
      if (isNaN(numero) || numero <= 0) continue;
      input.value = numeroAInput(ahora ? numero * 1.21 : numero / 1.21);
      if (ahora) input.dataset.ivaAplicado = '1';
      else delete input.dataset.ivaAplicado;
    }
    recargoUnitarioPrevio = ahora;
  }
  actualizarTotal();
}

/* Precio total de un ítem = precio unitario x cantidad, ya aplicado el
   descuento. Toma el precio unitario tal como se ve en pantalla (para
   Consumidor final/Exento ya incluye el 21%). Devuelve NaN si falta el
   precio unitario. */
function totalLineaNum(unitStr, descuStr, cantStr) {
  const unitario = parsearNumero(unitStr);
  if (isNaN(unitario)) return NaN;
  let total = unitario;
  const descuento = parsearNumero(descuStr);
  if (!isNaN(descuento)) total *= (1 - descuento / 100);
  const cantidad = parsearNumero(cantStr);
  total *= (isNaN(cantidad) ? 1 : cantidad);
  return total;
}

function calcularTotal() {
  let pesos = 0;
  let dolares = 0;

  for (const item of recolectarItems()) {
    const subtotal = totalLineaNum(item.unit, item.descu, item.cant);
    if (isNaN(subtotal)) continue;
    if (item.moneda === 'U$') dolares += subtotal;
    else pesos += subtotal;
  }

  // Responsable inscripto: el 21% se suma en el total (salvo Tierra del Fuego)
  const factor = (valor('condicion-iva') === 'Responsable inscripto 21%' && !esTierraDelFuego()) ? 1.21 : 1;
  pesos *= factor;
  dolares *= factor;

  if (pesos === 0 && dolares === 0) return { texto: '—', valido: false };
  if (dolares === 0) return { texto: '$ ' + dinero(pesos), valido: true };
  if (pesos === 0) return { texto: 'U$ ' + dinero(dolares), valido: true };

  const tipoCambio = parsearNumero(valor('tipo-cambio'));
  if (isNaN(tipoCambio) || tipoCambio <= 0) {
    return { texto: 'Falta el tipo de cambio', valido: false };
  }
  return { texto: '$ ' + dinero(pesos + dolares * tipoCambio), valido: true };
}

/* Refresca la columna "PRECIO TOTAL" de cada fila (unitario x cantidad). */
function actualizarFilas() {
  for (const fila of cuerpoItems.rows) {
    const celda = fila.querySelector('.celda-total-fila');
    const total = totalLineaNum(
      fila.querySelector('.inp-unit').value,
      fila.querySelector('.inp-descu').value,
      fila.querySelector('.inp-cant').value
    );
    const moneda = fila.querySelector('.inp-moneda').value;
    celda.textContent = isNaN(total) ? '' : `${moneda} ${dinero(total)}`;
  }
}

function actualizarTotal() {
  actualizarFilas();
  document.getElementById('total-general').textContent = calcularTotal().texto;
}

/* ---------- Aviso de campos faltantes ----------
   No se usa alert() nativo: en la aplicación de escritorio (Electron en
   Windows) el alert deja la ventana sin foco de teclado y no se puede
   volver a escribir en los campos. Este aviso es parte de la página,
   así que no tiene ese problema. */

const avisoFondo = document.getElementById('aviso-fondo');
const avisoLista = document.getElementById('aviso-lista');
const avisoCerrar = document.getElementById('aviso-cerrar');
let alCerrarAviso = null;

function mostrarAviso(etiquetas, alCerrar) {
  avisoLista.innerHTML = '';
  for (const etiqueta of etiquetas) {
    const li = document.createElement('li');
    li.textContent = etiqueta;
    avisoLista.appendChild(li);
  }
  alCerrarAviso = alCerrar || null;
  avisoFondo.classList.remove('oculto');
  avisoCerrar.focus();
}

function cerrarAviso() {
  avisoFondo.classList.add('oculto');
  if (alCerrarAviso) {
    const accion = alCerrarAviso;
    alCerrarAviso = null;
    // SOLUCIÓN 1: Timeout añadido para evitar bloqueo (glitch) de focus al cerrar el modal.
    setTimeout(accion, 50);
  }
}

avisoCerrar.addEventListener('click', cerrarAviso);
avisoFondo.addEventListener('click', e => {
  if (e.target === avisoFondo) cerrarAviso();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !avisoFondo.classList.contains('oculto')) cerrarAviso();
});

/* ---------- Validación de campos obligatorios ---------- */

function marcarError(elemento) {
  elemento.classList.add('campo-error');
  
  // SOLUCIÓN 2: Función para remover el error y eventos extra (focus, click) añadidos
  // para destrabar el campo inmediatamente en cuanto el usuario intente interactuar con él.
  const limpiarError = () => elemento.classList.remove('campo-error');
  
  elemento.addEventListener('input', limpiarError, { once: true });
  elemento.addEventListener('change', limpiarError, { once: true });
  elemento.addEventListener('focus', limpiarError, { once: true });
  elemento.addEventListener('click', limpiarError, { once: true });
}

function validar() {
  // Limpiar marcas de errores anteriores
  document.querySelectorAll('.campo-error').forEach(el => el.classList.remove('campo-error'));

  const faltantes = [];

  const obligatorios = [
    ['senores', 'Señor/es'],
    ['atsr', 'At. Sr.'],
    ['domicilio', 'Domicilio'],
    ['pais', 'País'],
    ['localidad', 'Localidad'],
    ['condicion-iva', 'I.V.A.'],
    ['cuit-cliente', 'C.U.I.T.'],
    ['plazo', 'Plazo de Entrega'],
    ['vigencia', 'Vigencia de Cotización'],
    ['pago', 'Condiciones de Pago'],
    ['flete', 'Flete y Seguro'],
    ['tipo-cambio', 'Tipo de Cambio']
  ];

  for (const [id, etiqueta] of obligatorios) {
    const el = document.getElementById(id);
    if (el.value.trim() === '') {
      faltantes.push({ el, etiqueta });
    }
  }

  // CUIT completo (XX-XXXXXXXX-X)
  const cuit = valor('cuit-cliente');
  if (cuit !== '' && cuit.length !== 13) {
    faltantes.push({ el: inputCuit, etiqueta: 'C.U.I.T. (incompleto)' });
  }

  // Condición de pago "Otros" con detalle
  if (selectPago.value === 'Otros' && valor('pago-otros') === '') {
    faltantes.push({ el: inputPagoOtros, etiqueta: 'Condiciones de Pago (detalle de "Otros")' });
  }

  // Items: al menos uno, y los que tengan algo cargado deben estar completos
  const items = recolectarItems();
  if (items.length === 0) {
    faltantes.push({ el: cuerpoItems.rows[0].querySelector('.inp-desc'), etiqueta: 'Ítems de la cotización' });
  } else {
    for (const item of items) {
      if (item.cant === '') faltantes.push({ el: item.fila.querySelector('.inp-cant'), etiqueta: `Cantidad del ítem ${item.item}` });
      if (item.desc === '') faltantes.push({ el: item.fila.querySelector('.inp-desc'), etiqueta: `Descripción del ítem ${item.item}` });
      if (item.unit === '') faltantes.push({ el: item.fila.querySelector('.inp-unit'), etiqueta: `Precio unitario del ítem ${item.item}` });
    }
  }

  return faltantes;
}

/* ---------- Generación del PDF ---------- */

function generarPDF() {
  const faltantes = validar();
  if (faltantes.length > 0) {
    faltantes.forEach(f => marcarError(f.el));
    const primerCampo = faltantes[0].el;
    mostrarAviso([...new Set(faltantes.map(f => f.etiqueta))], () => primerCampo.focus());
    return;
  }

  const items = recolectarItems();
  const total = calcularTotal();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const GRIS_ETIQUETA = [235, 235, 230];
  const GRIS_CABECERA = [185, 185, 185];

  // ----- Borde exterior de la hoja -----
  doc.setDrawColor(60);
  doc.setLineWidth(0.4);
  doc.rect(8, 8, 194, 281);

  // ----- Logos arriba a la izquierda -----
  doc.addImage(logosPdf.woodtools.data, logosPdf.woodtools.tipo, 12, 12, 24, 24);
  doc.addImage(logosPdf.diamante.data, logosPdf.diamante.tipo, 39, 12, 24, 24);

  // ----- Datos de la empresa (debajo de los logos) -----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.text('HERRAMIENTAS PARA LA INDUSTRIA MADERERA', 37.5, 40, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const lineasEmpresa = [
    'Wood Tools S.R.L. - Cabildo 61 (1870) Avellaneda',
    'Bs. As. - Argentina - Telefax: (54-11) 4218-1700/01',
    'E-mail: info@woodtools.com.ar - ventas@woodtools.com.ar',
    'www.woodtools.com.ar'
  ];
  lineasEmpresa.forEach((linea, i) => {
    doc.text(linea, 37.5, 43.2 + i * 2.7, { align: 'center' });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('I.V.A. RESPONSABLE INSCRIPTO', 37.5, 54.8, { align: 'center' });

  // ----- Recuadro con la X -----
  doc.setLineWidth(0.5);
  doc.setFillColor(232, 232, 232);
  doc.rect(96, 12, 15, 15, 'FD');
  doc.setFontSize(16);
  doc.text('X', 103.5, 22.3, { align: 'center' });

  // ----- Título y número -----
  const xDer = 118;
  doc.setFontSize(7);
  doc.text('DOCUMENTO NO VALIDO COMO FACTURA', xDer, 14.5);

  doc.setFontSize(15);
  doc.text('COTIZACION', xDer, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`FECHA: ${valor('fecha')}`, xDer, 29);

  // ----- Cuadro de datos del cliente -----
  doc.autoTable({
    startY: 59,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 1.8,
      textColor: 20,
      lineColor: [90, 90, 90],
      lineWidth: 0.25
    },
    body: [
      ['Señor/es:', valor('senores'), 'At. Sr.:', valor('atsr')],
      ['Domicilio:', { content: valor('domicilio'), colSpan: 3 }],
      ['País:', valor('pais'), 'Localidad:', valor('localidad')],
      ['I.V.A.:', valor('condicion-iva'), 'C.U.I.T.:', valor('cuit-cliente')]
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 24, fillColor: GRIS_ETIQUETA },
      1: { cellWidth: 73 },
      2: { fontStyle: 'bold', cellWidth: 24, fillColor: GRIS_ETIQUETA },
      3: { cellWidth: 65 }
    }
  });

  // ----- Leyenda -----
  const y = doc.lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('De nuestra mayor consideración:', 12, y);
  doc.text('Por la presente, le suministramos cotización de las herramientas requeridas, según detalle:', 12, y + 5);

  // ----- Tabla de items -----
  // La columna "% DE DESC." solo aparece si algún producto tiene descuento.
  // Cuando aparece, el valor figura únicamente en la celda del producto que
  // lo tiene (los demás quedan en blanco).
  const hayDescuento = items.some(it => {
    const d = parsearNumero(it.descu);
    return !isNaN(d) && d > 0;
  });

  const filas = items.map(it => {
    const unitario = parsearNumero(it.unit);
    const totalLinea = totalLineaNum(it.unit, it.descu, it.cant);
    const descuento = parsearNumero(it.descu);
    const descuTexto = (!isNaN(descuento) && descuento > 0) ? it.descu : '';
    const fila = [
      it.item, it.cant, it.desc,
      isNaN(unitario) ? '' : `${it.moneda} ${dinero(unitario)}`,
      isNaN(totalLinea) ? '' : `${it.moneda} ${dinero(totalLinea)}`
    ];
    if (hayDescuento) fila.splice(3, 0, descuTexto); // columna descuento tras DESCRIPCION
    return fila;
  });

  const columnas = hayDescuento ? 6 : 5;

  // Filas vacías de relleno para que el cuadro tenga cuerpo, como el talonario
  while (filas.length < 10) {
    filas.push(new Array(columnas).fill(''));
  }

  const cabecera = hayDescuento
    ? ['ITEM', 'CANT.', 'DESCRIPCION', '% DE\nDESC.', 'PRECIO\nUNITARIO', 'PRECIO\nTOTAL']
    : ['ITEM', 'CANT.', 'DESCRIPCION', 'PRECIO\nUNITARIO', 'PRECIO\nTOTAL'];

  // La descripción absorbe el ancho de la columna de descuento cuando no está
  const estilosColumnas = hayDescuento
    ? {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 88 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      }
    : {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 104 },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      };

  doc.autoTable({
    startY: y + 9,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    head: [cabecera],
    body: filas,
    foot: [[
      {
        content: 'PRECIO TOTAL',
        colSpan: columnas - 1,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: GRIS_CABECERA, textColor: 20, fontSize: 8 }
      },
      {
        content: total.texto,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: GRIS_ETIQUETA, textColor: 20, fontSize: 8.5 }
      }
    ]],
    headStyles: {
      fillColor: GRIS_CABECERA,
      textColor: 20,
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [90, 90, 90],
      lineWidth: 0.25
    },
    footStyles: {
      lineColor: [90, 90, 90],
      lineWidth: 0.25
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2,
      minCellHeight: 9,
      textColor: 20,
      lineColor: [90, 90, 90],
      lineWidth: 0.25
    },
    columnStyles: estilosColumnas
  });

  // ----- Cuadro del pie -----
  const condicionPago = selectPago.value === 'Otros' ? valor('pago-otros') : selectPago.value;
  const tipoCambio = parsearNumero(valor('tipo-cambio'));

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 7,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 1.8,
      textColor: 20,
      lineColor: [90, 90, 90],
      lineWidth: 0.25
    },
    body: [
      ['Plazo de Entrega:', valor('plazo')],
      ['Vigencia de Cotización:', valor('vigencia')],
      ['Condiciones de Pago:', condicionPago],
      ['Flete y Seguro:', valor('flete')],
      ['Tipo de Cambio:', isNaN(tipoCambio) ? valor('tipo-cambio') : `U$ 1 = $ ${dinero(tipoCambio)}`]
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, fillColor: GRIS_ETIQUETA },
      1: { cellWidth: 144 }
    }
  });

  // ----- Nota final -----
  const yNota = doc.lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('Documento no válido como factura', 105, yNota, { align: 'center' });

  const cliente = valor('senores').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '-');
  const fechaArchivo = valor('fecha').replace(/\//g, '-');
  doc.save(`Cotizacion_${cliente}_${fechaArchivo}.pdf`);
}