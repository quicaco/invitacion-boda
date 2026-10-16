/**
 * Invitación Marta & Víctor · puente entre la web y Google Sheets.
 *
 * GET  ?i=CODIGO  → devuelve SOLO los datos de esa invitación (nombre, trato,
 *                   plazas, si puede traer acompañante y su respuesta previa).
 *                   Nunca devuelve teléfonos ni datos de otros invitados.
 * POST {i, ...}   → guarda la respuesta del formulario en la fila de ese código.
 *
 * Las columnas se buscan por su título en la fila 2 de la hoja «Invitados»,
 * así que se pueden reordenar pero no renombrar.
 */

const HOJA = 'Invitados';
const FILA_TITULOS = 2;

const COL = {
  codigo: 'Código',
  nombre: 'Nombre en la invitación',
  plazas: 'Plazas',
  acompanante: '¿Puede traer acompañante?',
  trato: 'Trato',
  confirma: '¿Confirma?',
  asistentes: 'Asistentes',
  nombreAcomp: 'Nombre del acompañante',
  alergias: 'Alergias / intolerancias',
  autobus: '¿Autobús?',
  mensaje: 'Mensaje para los novios',
  fecha: 'Fecha de respuesta',
};

function doGet(e) {
  const codigo = limpiarCodigo_(e && e.parameter && e.parameter.i);
  if (!codigo) return json_({ ok: false });

  const ctx = abrir_();
  const fila = buscarFila_(ctx, codigo);
  if (!fila) return json_({ ok: false });

  const v = leerFila_(ctx, fila);
  const respondido = String(v[COL.confirma]).trim() === 'Sí';

  return json_({
    ok: true,
    nombre: String(v[COL.nombre] || '').trim(),
    trato: String(v[COL.trato]).trim() === 'Vosotros' ? 'vos' : 'tu',
    plazas: Math.max(1, Number(v[COL.plazas]) || 1),
    acompanante: String(v[COL.acompanante]).trim() === 'Sí',
    respuesta: respondido ? {
      asistentes: Number(v[COL.asistentes]) || 0,
      nombreAcomp: String(v[COL.nombreAcomp] || ''),
      alergias: String(v[COL.alergias] || ''),
      autobus: String(v[COL.autobus] || ''),
      mensaje: String(v[COL.mensaje] || ''),
    } : null,
  });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'datos' }); }

  const codigo = limpiarCodigo_(d.i);
  if (!codigo) return json_({ ok: false, error: 'codigo' });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ctx = abrir_();
    const fila = buscarFila_(ctx, codigo);
    if (!fila) return json_({ ok: false, error: 'codigo' });

    const v = leerFila_(ctx, fila);
    const plazas = Math.max(1, Number(v[COL.plazas]) || 1);
    const puedeAcomp = String(v[COL.acompanante]).trim() === 'Sí';

    const nombreAcomp = puedeAcomp ? texto_(d.nombreAcomp, 120) : '';
    let asistentes = Math.round(Number(d.asistentes) || 1);
    asistentes = Math.min(Math.max(asistentes, 1), plazas) + (nombreAcomp ? 1 : 0);

    escribir_(ctx, fila, {
      [COL.confirma]: 'Sí',
      [COL.asistentes]: asistentes,
      [COL.nombreAcomp]: nombreAcomp,
      [COL.alergias]: texto_(d.alergias, 300),
      [COL.autobus]: d.autobus === 'Sí' ? 'Sí' : 'No',
      [COL.mensaje]: texto_(d.mensaje, 600),
      [COL.fecha]: new Date(),
    });
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- utilidades ---------- */

function abrir_() {
  const hoja = SpreadsheetApp.getActive().getSheetByName(HOJA);
  const titulos = hoja.getRange(FILA_TITULOS, 1, 1, hoja.getLastColumn()).getValues()[0];
  const cols = {};
  titulos.forEach(function (t, i) { cols[String(t).trim()] = i + 1; });
  Object.keys(COL).forEach(function (k) {
    if (!cols[COL[k]]) throw new Error('Falta la columna «' + COL[k] + '» en la hoja ' + HOJA);
  });
  return { hoja: hoja, cols: cols, ancho: titulos.length };
}

function buscarFila_(ctx, codigo) {
  const ultima = ctx.hoja.getLastRow();
  if (ultima <= FILA_TITULOS) return null;
  const codigos = ctx.hoja.getRange(FILA_TITULOS + 1, ctx.cols[COL.codigo], ultima - FILA_TITULOS, 1).getValues();
  for (let i = 0; i < codigos.length; i++) {
    if (String(codigos[i][0]).trim() === codigo) return FILA_TITULOS + 1 + i;
  }
  return null;
}

function leerFila_(ctx, fila) {
  const valores = ctx.hoja.getRange(fila, 1, 1, ctx.ancho).getValues()[0];
  const v = {};
  Object.keys(ctx.cols).forEach(function (t) { v[t] = valores[ctx.cols[t] - 1]; });
  return v;
}

function escribir_(ctx, fila, datos) {
  Object.keys(datos).forEach(function (titulo) {
    ctx.hoja.getRange(fila, ctx.cols[titulo]).setValue(datos[titulo]);
  });
}

function limpiarCodigo_(c) {
  c = String(c || '').trim().toLowerCase();
  return /^[a-z0-9]{6}$/.test(c) ? c : '';
}

// Recorta y evita que un texto se interprete como fórmula en la hoja.
function texto_(s, max) {
  s = String(s || '').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
