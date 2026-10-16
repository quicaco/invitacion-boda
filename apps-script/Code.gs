/**
 * Invitación Marta & Víctor · puente entre la web y Google Sheets.
 *
 * GET  ?i=CODIGO  → devuelve SOLO los datos de esa invitación (nombre, trato,
 *                   plazas, si puede traer acompañante y su respuesta previa).
 *                   Nunca devuelve teléfonos ni datos de otros invitados.
 * POST {i, ...}   → guarda la respuesta del formulario en la fila de ese código
 *                   y deja constancia de cada envío en la hoja «Historial».
 *
 * Además, la primera vez que un invitado abre su enlace se anota la fecha en
 * la columna «Abierta» (salvo si el enlace lleva &prueba=1, para no contar
 * las pruebas). El menú «Boda → Enviar invitaciones» abre un panel para
 * mandar los WhatsApp y marca solo «¿Enviada?» y «Fecha de envío».
 *
 * Las columnas se buscan por su título en la fila 2 de la hoja «Invitados»,
 * así que se pueden reordenar pero no renombrar.
 */

const HOJA = 'Invitados';
const FILA_TITULOS = 2;
const HOJA_HISTORIAL = 'Historial';
const HOJA_CONFIG = 'Configuración';
const COL_ABIERTA = 'Abierta';

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
  const previo = respuestaActual_(v);

  // Primera apertura (no se cuenta si es una prueba)
  const cAb = ctx.cols[COL_ABIERTA];
  if (cAb && !(e.parameter.prueba) && (v[COL_ABIERTA] === '' || v[COL_ABIERTA] === null)) {
    try { ctx.hoja.getRange(fila, cAb).setValue(new Date()); } catch (err) { console.error(err); }
  }

  return json_({
    ok: true,
    nombre: String(v[COL.nombre] || '').trim(),
    trato: String(v[COL.trato]).trim() === 'Vosotros' ? 'vos' : 'tu',
    plazas: Math.max(1, Number(v[COL.plazas]) || 1),
    acompanante: String(v[COL.acompanante]).trim() === 'Sí',
    respuesta: previo,
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
    const previo = respuestaActual_(v);

    let nuevo;
    if (d.asiste === 'No') {
      nuevo = { asiste: 'No', asistentes: 0, nombreAcomp: '', alergias: '', autobus: '', mensaje: texto_(d.mensaje, 600) };
    } else {
      const nombreAcomp = puedeAcomp ? texto_(d.nombreAcomp, 120) : '';
      let asistentes = Math.round(Number(d.asistentes) || 1);
      asistentes = Math.min(Math.max(asistentes, 1), plazas) + (nombreAcomp ? 1 : 0);
      nuevo = {
        asiste: 'Sí', asistentes: asistentes, nombreAcomp: nombreAcomp,
        alergias: texto_(d.alergias, 300), autobus: d.autobus === 'Sí' ? 'Sí' : 'No',
        mensaje: texto_(d.mensaje, 600),
      };
    }

    const cambios = previo ? diferencias_(previo, nuevo) : [];
    const tipo = !previo ? 'primera' : (cambios.length ? 'modificacion' : 'sin_cambios');
    if (tipo === 'sin_cambios') return json_({ ok: true, tipo: tipo, anterior: previo.asiste });

    const ahora = new Date();
    escribir_(ctx, fila, {
      [COL.confirma]: nuevo.asiste,
      [COL.asistentes]: nuevo.asistentes,
      [COL.nombreAcomp]: nuevo.nombreAcomp,
      [COL.alergias]: nuevo.alergias,
      [COL.autobus]: nuevo.autobus,
      [COL.mensaje]: nuevo.mensaje,
      [COL.fecha]: ahora,
    });

    let accion;
    if (tipo === 'primera') accion = nuevo.asiste === 'Sí' ? 'Confirma asistencia' : 'No asistirá';
    else if (previo.asiste !== nuevo.asiste) accion = nuevo.asiste === 'Sí' ? 'Cambia a: SÍ asistirá' : 'Cambia a: NO asistirá';
    else accion = 'Modifica su respuesta';

    historial_().appendRow([
      ahora, codigo, String(v[COL.nombre] || ''), accion, nuevo.asiste, nuevo.asistentes,
      nuevo.nombreAcomp, nuevo.alergias, nuevo.autobus, nuevo.mensaje, cambios.join('\n'),
    ]);
    return json_({ ok: true, tipo: tipo, anterior: previo ? previo.asiste : '' });
  } finally {
    lock.releaseLock();
  }
}

// Respuesta guardada en la fila (null si aún no ha respondido).
function respuestaActual_(v) {
  const estado = String(v[COL.confirma]).trim();
  if (estado !== 'Sí' && estado !== 'No') return null;
  return {
    asiste: estado,
    asistentes: Number(v[COL.asistentes]) || 0,
    nombreAcomp: String(v[COL.nombreAcomp] || '').replace(/^'/, ''),
    alergias: String(v[COL.alergias] || '').replace(/^'/, ''),
    autobus: String(v[COL.autobus] || ''),
    mensaje: String(v[COL.mensaje] || '').replace(/^'/, ''),
  };
}

function diferencias_(a, b) {
  const campos = [['asiste', '¿Asiste?'], ['asistentes', 'Asistentes'], ['nombreAcomp', 'Acompañante'],
    ['alergias', 'Alergias'], ['autobus', 'Autobús'], ['mensaje', 'Mensaje']];
  const fuera = function (x) { const s = String(x === null || x === undefined ? '' : x).replace(/^'/, '').trim(); return s || '(vacío)'; };
  const lista = [];
  campos.forEach(function (c) {
    if (fuera(a[c[0]]) !== fuera(b[c[0]])) lista.push(c[1] + ': ' + fuera(a[c[0]]) + ' → ' + fuera(b[c[0]]));
  });
  return lista;
}

// Hoja «Historial»: se crea sola la primera vez.
function historial_() {
  const libro = SpreadsheetApp.getActive();
  let h = libro.getSheetByName(HOJA_HISTORIAL);
  if (!h) {
    h = libro.insertSheet(HOJA_HISTORIAL);
    const titulos = ['Fecha', 'Código', 'Invitación', 'Acción', '¿Asiste?', 'Asistentes', 'Acompañante',
      'Alergias / intolerancias', '¿Autobús?', 'Mensaje', 'Cambios respecto a la respuesta anterior'];
    h.getRange(1, 1, 1, titulos.length).setValues([titulos])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#a8844a').setWrap(true);
    h.setFrozenRows(1);
    h.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
    h.setColumnWidth(1, 130); h.setColumnWidth(3, 170); h.setColumnWidth(4, 170);
    h.setColumnWidth(10, 220); h.setColumnWidth(11, 320);
    h.getRange('K:K').setWrap(true);
  }
  return h;
}

/* ---------- alta de invitados ----------
 * Al escribir (o pegar) un «Nombre en la invitación» en una fila nueva,
 * la hoja completa sola: código único, plazas máximas, enlace, botón de
 * WhatsApp y valores por defecto (Plazas 1, Acompañante No, Trato deducido,
 * Enviada No, Confirma Pendiente). También hay un menú «Boda» para hacerlo
 * a mano sobre toda la hoja.
 */

const COL_AUTO = {
  maximas: 'Plazas máximas',
  enlace: 'Enlace de la invitación',
  whatsapp: 'Enviar por WhatsApp',
  telefono: 'Teléfono',
  enviada: '¿Enviada?',
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Boda')
    .addItem('Enviar invitaciones', 'abrirPanelEnvio')
    .addItem('Completar códigos y enlaces', 'completarInvitados')
    .addToUi();
}

function onEdit(e) {
  try {
    if (!e || e.range.getSheet().getName() !== HOJA) return;
    if (e.range.getLastRow() <= FILA_TITULOS) return;
    const ctx = abrir_();
    const cNom = ctx.cols[COL.nombre];
    if (cNom < e.range.getColumn() || cNom > e.range.getLastColumn()) return;
    completar_(ctx, Math.max(e.range.getRow(), FILA_TITULOS + 1), e.range.getLastRow());
  } catch (err) {
    console.error(err);
  }
}

function completarInvitados() {
  const ctx = abrir_();
  prepararHoja_(ctx);
  const n = completar_(ctx, FILA_TITULOS + 1, ctx.hoja.getLastRow());
  SpreadsheetApp.getActive().toast(n ? n + ' códigos nuevos generados' : 'Todo estaba completo', 'Boda');
}

// Deja la columna «¿Confirma?» aceptando Sí / No / Pendiente y crea el Historial.
function prepararHoja_(ctx) {
  const sh = ctx.hoja, col = ctx.cols[COL.confirma];
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No', 'Pendiente'], true).setAllowInvalid(false).build();
  sh.getRange(FILA_TITULOS + 1, col, sh.getMaxRows() - FILA_TITULOS, 1).setDataValidation(regla);
  historial_();
  // Columna «Abierta», justo después de «Fecha de envío»
  if (!ctx.cols[COL_ABIERTA]) {
    const tras = ctx.cols['Fecha de envío'] || ctx.ancho;
    sh.insertColumnAfter(tras);
    const nueva = tras + 1;
    sh.getRange(FILA_TITULOS, tras).copyTo(sh.getRange(FILA_TITULOS, nueva), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    sh.getRange(FILA_TITULOS, nueva).setValue(COL_ABIERTA)
      .setNote('Fecha y hora de la primera vez que el invitado abrió su invitación. La rellena la web.');
    sh.getRange(FILA_TITULOS + 1, nueva, sh.getMaxRows() - FILA_TITULOS, 1)
      .setNumberFormat('dd/mm/yyyy hh:mm').setBackground('#e3efdf').clearDataValidations();
    sh.setColumnWidth(nueva, 120);
  }
}

/* ---------- panel de envío por WhatsApp ---------- */

function abrirPanelEnvio() {
  const html = HtmlService.createHtmlOutput(PANEL_HTML).setTitle('Enviar invitaciones');
  SpreadsheetApp.getUi().showSidebar(html);
}

// Lista para el panel: una entrada por invitación con nombre.
function listaEnvio() {
  const ctx = abrir_();
  const sh = ctx.hoja, ultima = sh.getLastRow();
  if (ultima <= FILA_TITULOS) return [];
  const datos = sh.getRange(FILA_TITULOS + 1, 1, ultima - FILA_TITULOS, ctx.ancho).getValues();
  const cfg = SpreadsheetApp.getActive().getSheetByName(HOJA_CONFIG);
  const base = cfg ? String(cfg.getRange('B3').getValue()).trim() : '';
  const plantilla = cfg ? String(cfg.getRange('B4').getValue()) : '{enlace}';
  const col = function (t) { return ctx.cols[t] ? ctx.cols[t] - 1 : -1; };
  const iCod = col(COL.codigo), iNom = col(COL.nombre), iTel = col('Teléfono'), iEnv = col('¿Enviada?'),
        iFEnv = col('Fecha de envío'), iAb = col(COL_ABIERTA), iConf = col(COL.confirma);
  const fecha = function (x) { return x instanceof Date ? Utilities.formatDate(x, Session.getScriptTimeZone(), 'dd/MM HH:mm') : String(x || ''); };
  const lista = [];
  datos.forEach(function (r) {
    const codigo = String(r[iCod] || '').trim(), nombre = String(r[iNom] || '').trim();
    if (!codigo || !nombre) return;
    const tel = iTel >= 0 ? String(r[iTel] || '').replace(/[^0-9]/g, '') : '';
    const enlace = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'i=' + codigo;
    const msg = plantilla.replace(/\{nombre\}/g, nombre).replace(/\{enlace\}/g, enlace);
    lista.push({
      codigo: codigo, nombre: nombre, telefono: tel,
      wa: tel ? 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg) : '',
      enviada: iEnv >= 0 && String(r[iEnv]).trim() === 'Sí',
      fechaEnvio: iFEnv >= 0 ? fecha(r[iFEnv]) : '',
      abierta: iAb >= 0 ? fecha(r[iAb]) : '',
      confirma: iConf >= 0 ? String(r[iConf] || '') : '',
    });
  });
  return lista;
}

function marcarEnviada(codigo) {
  codigo = limpiarCodigo_(codigo);
  if (!codigo) return null;
  const ctx = abrir_();
  const fila = buscarFila_(ctx, codigo);
  if (!fila) return null;
  const ahora = new Date();
  if (ctx.cols['¿Enviada?']) ctx.hoja.getRange(fila, ctx.cols['¿Enviada?']).setValue('Sí');
  if (ctx.cols['Fecha de envío']) ctx.hoja.getRange(fila, ctx.cols['Fecha de envío']).setValue(ahora);
  return Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'dd/MM HH:mm');
}

const PANEL_HTML = `<!doctype html><html><head><base target="_blank"><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#3b3a35;margin:0;padding:12px}
  h2{font-size:15px;margin:0 0 4px;color:#a8844a}
  .resumen{color:#77736a;margin-bottom:10px}
  .filtros{display:flex;gap:6px;margin-bottom:8px}
  .filtros button{flex:1;border:1px solid #d9c49b;background:#fff;border-radius:14px;padding:5px;cursor:pointer;font-size:12px}
  .filtros button.on{background:#a8844a;border-color:#a8844a;color:#fff}
  input{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #d9c49b;border-radius:6px;margin-bottom:8px}
  .fila{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee}
  .fila .info{flex:1;min-width:0}
  .fila b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fila small{color:#77736a}
  .fila button{border:0;border-radius:14px;padding:6px 12px;cursor:pointer;font-size:12px;background:#1a6e3a;color:#fff;white-space:nowrap}
  .fila button.re{background:#fff;color:#1a6e3a;border:1px solid #1a6e3a}
  .fila button:disabled{background:#ccc;color:#fff;border:0;cursor:default}
  .vacio{color:#77736a;padding:16px 0;text-align:center}
</style></head><body>
<h2>Enviar invitaciones</h2>
<div class="resumen" id="resumen">Cargando…</div>
<div class="filtros">
  <button id="f-pend" class="on" onclick="filtro('pend')">Sin enviar</button>
  <button id="f-todas" onclick="filtro('todas')">Todas</button>
</div>
<input id="buscar" placeholder="Buscar por nombre…" oninput="pintar()">
<div id="lista"></div>
<script>
  var datos=[], modo='pend';
  function cargar(){google.script.run.withSuccessHandler(function(d){datos=d;pintar();}).withFailureHandler(function(e){document.getElementById('resumen').textContent='Error: '+e.message;}).listaEnvio();}
  function filtro(m){modo=m;document.getElementById('f-pend').className=m==='pend'?'on':'';document.getElementById('f-todas').className=m==='todas'?'on':'';pintar();}
  function estado(x){
    var p=[];
    if(x.enviada)p.push('Enviada '+x.fechaEnvio);
    if(x.abierta)p.push('Abierta '+x.abierta);
    if(x.confirma&&x.confirma!=='Pendiente')p.push('Confirma: '+x.confirma);
    if(!x.telefono)p.push('Sin teléfono');
    return p.join(' · ')||'Sin enviar';
  }
  function pintar(){
    var q=document.getElementById('buscar').value.toLowerCase();
    var env=datos.filter(function(x){return x.enviada;}).length;
    document.getElementById('resumen').textContent=env+' de '+datos.length+' enviadas';
    var l=datos.filter(function(x){return (modo==='todas'||!x.enviada)&&x.nombre.toLowerCase().indexOf(q)>=0;});
    var c=document.getElementById('lista'); c.innerHTML='';
    if(!l.length){c.innerHTML='<div class="vacio">'+(modo==='pend'?'¡No queda ninguna por enviar!':'No hay resultados')+'</div>';return;}
    l.forEach(function(x){
      var f=document.createElement('div');f.className='fila';
      var i=document.createElement('div');i.className='info';
      var b=document.createElement('b');b.textContent=x.nombre;var s=document.createElement('small');s.textContent=estado(x);
      i.appendChild(b);i.appendChild(s);
      var btn=document.createElement('button');
      btn.textContent=x.enviada?'Reenviar':'Enviar'; if(x.enviada)btn.className='re';
      if(!x.wa)btn.disabled=true;
      btn.onclick=function(){
        window.open(x.wa,'_blank');
        btn.disabled=true;btn.textContent='Marcando…';
        google.script.run.withSuccessHandler(function(f){x.enviada=true;x.fechaEnvio=f||'';pintar();})
          .withFailureHandler(function(){btn.disabled=false;btn.textContent='Reintentar';}).marcarEnviada(x.codigo);
      };
      f.appendChild(i);f.appendChild(btn);c.appendChild(f);
    });
  }
  cargar();
</script></body></html>`;

function completar_(ctx, desde, hasta) {
  const sh = ctx.hoja, n = hasta - desde + 1;
  if (n < 1) return 0;
  const c = function (t) { return ctx.cols[t]; };
  const leer = function (t) { return c(t) ? sh.getRange(desde, c(t), n, 1).getValues().map(function (r) { return r[0]; }) : null; };
  const vacio = function (v) { return String(v === null || v === undefined ? '' : v).trim() === ''; };

  // 1) Leer todo antes de escribir
  const nombres = leer(COL.nombre);
  const codigos = leer(COL.codigo);
  const ultima = sh.getLastRow();
  const usados = {};
  sh.getRange(FILA_TITULOS + 1, c(COL.codigo), Math.max(1, ultima - FILA_TITULOS), 1).getValues()
    .forEach(function (r) { const v = String(r[0]).trim(); if (v) usados[v] = true; });
  const porDefecto = {};
  [[COL.plazas, 1], [COL.acompanante, 'No'], [COL.confirma, 'Pendiente'], [COL_AUTO.enviada, 'No'], [COL.trato, null]]
    .forEach(function (d) { if (c(d[0])) porDefecto[d[0]] = { valores: leer(d[0]), valor: d[1] }; });
  // Fórmulas: se copian (en notación R1C1) de la primera fila que funcione, así
  // no dependen del idioma de la hoja (en español los argumentos van con «;»).
  const formulas = {}, errores = {}, modelos = {};
  const total = Math.max(1, ultima - FILA_TITULOS);
  [COL_AUTO.maximas, COL_AUTO.enlace, COL_AUTO.whatsapp].forEach(function (t) {
    if (!c(t)) return;
    formulas[t] = sh.getRange(desde, c(t), n, 1).getFormulas().map(function (r) { return r[0]; });
    errores[t] = sh.getRange(desde, c(t), n, 1).getDisplayValues().map(function (r) { return /^#/.test(r[0]); });
    const r1c1 = sh.getRange(FILA_TITULOS + 1, c(t), total, 1).getFormulasR1C1();
    const vis = sh.getRange(FILA_TITULOS + 1, c(t), total, 1).getDisplayValues();
    for (let k = 0; k < r1c1.length; k++) {
      if (r1c1[k][0] && !/^#/.test(vis[k][0])) { modelos[t] = r1c1[k][0]; break; }
    }
  });

  // 2) Escribir
  if (c(COL_AUTO.telefono)) sh.getRange(FILA_TITULOS + 1, c(COL_AUTO.telefono), sh.getMaxRows() - FILA_TITULOS, 1).setNumberFormat('@');
  let nuevos = 0;
  for (let i = 0; i < n; i++) {
    const nombre = String(nombres[i] || '').trim();
    if (!nombre) continue;
    const fila = desde + i;

    if (vacio(codigos[i])) {
      let cod;
      do { cod = nuevoCodigo_(); } while (usados[cod]);
      usados[cod] = true;
      sh.getRange(fila, c(COL.codigo)).setNumberFormat('@').setValue(cod);
      nuevos++;
    }
    Object.keys(porDefecto).forEach(function (t) {
      const d = porDefecto[t];
      if (vacio(d.valores[i])) sh.getRange(fila, c(t)).setValue(t === COL.trato ? deducirTrato_(nombre) : d.valor);
    });
    Object.keys(formulas).forEach(function (t) {
      if (formulas[t][i] && !errores[t][i]) return;
      const celda = sh.getRange(fila, c(t));
      if (modelos[t]) celda.setFormulaR1C1(modelos[t]);
      else celda.setFormula(adaptarSeparador_(formula_(ctx, t, fila)));
    });
  }
  return nuevos;
}

// Código de 6 caracteres que empieza por letra (así la hoja nunca lo confunde con un número).
function nuevoCodigo_() {
  const letras = 'abcdefghjkmnpqrstuvwxyz', todo = letras + '23456789';
  let s = letras.charAt(Math.floor(Math.random() * letras.length));
  for (let i = 0; i < 5; i++) s += todo.charAt(Math.floor(Math.random() * todo.length));
  return s;
}

function deducirTrato_(nombre) {
  const plural = /(^|\s)(y|e)\s|&|,/i.test(nombre) ||
    /^(familia|los|las|tíos|tios|tías|tias|primos|primas|hermanos|hermanas|abuelos|chicos|chicas)\b/i.test(nombre);
  return plural ? 'Vosotros' : 'Tú';
}

// Solo se usa si no hay ninguna fila de modelo: en idiomas con coma decimal
// (español, francés, alemán…) los argumentos se separan con «;».
function adaptarSeparador_(f) {
  const loc = String(SpreadsheetApp.getActive().getSpreadsheetLocale() || 'es');
  return /^(en|ja|zh|ko|th|iw|he|hi|ms|fil|tl)/.test(loc) ? f : f.replace(/,/g, ';');
}

function letra_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function formula_(ctx, titulo, fila) {
  const ref = function (t) { return letra_(ctx.cols[t]) + fila; };
  if (titulo === COL_AUTO.maximas) {
    return '=' + ref(COL.plazas) + '+IF(' + ref(COL.acompanante) + '="Sí",1,0)';
  }
  if (titulo === COL_AUTO.enlace) {
    return '=Configuración!$B$3&"?i="&' + ref(COL.codigo);
  }
  // WhatsApp
  const msg = 'SUBSTITUTE(SUBSTITUTE(Configuración!$B$4,"{nombre}",' + ref(COL.nombre) + '),"{enlace}",' + ref(COL_AUTO.enlace) + ')';
  return '=HYPERLINK("https://wa.me/"&SUBSTITUTE(SUBSTITUTE(' + ref(COL_AUTO.telefono) + ',"+","")," ","")&"?text="&ENCODEURL(' + msg + '),"Abrir WhatsApp")';
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
