/**
 * Punto de entrada: lee el enlace, carga la invitación y pinta la página.
 *
 * Enlaces admitidos:
 *   ?i=CODIGO            invitación real (datos de la hoja)
 *   ?i=CODIGO&prueba=1   igual, pero sin apuntar la apertura en la hoja
 *   ?para=Nombre         modo de prueba con ese nombre (&trato=tu|vos para forzarlo)
 */
import { BODA } from './config.js';
import { estado } from './estado.js';
import { hayApi, obtenerInvitacion } from './api.js';
import { deducirTrato, aplicarTrato } from './trato.js';
import { iniciarPortada, saludoCargando, pintarSaludo } from './portada.js';
import { iniciarCuentaAtras } from './cuenta-atras.js';
import { iniciarFormulario, prepararFormulario } from './formulario.js';

function pintar() {
  pintarSaludo(estado.nombre, { esEjemplo: estado.modo !== 'invitacion' });
  aplicarTrato(estado.trato);
  prepararFormulario();
}

async function cargarInvitacion(parametros) {
  saludoCargando();
  try {
    const d = await obtenerInvitacion(estado.codigo, { prueba: parametros.has('prueba') });
    Object.assign(estado, {
      modo: 'invitacion',
      nombre: d.nombre,
      trato: d.trato,
      plazas: d.plazas,
      acompanante: d.acompanante,
      respuesta: d.respuesta,
    });
  } catch {
    Object.assign(estado, { modo: 'error', nombre: '', acompanante: false });
  }
}

function cargarDemo(parametros) {
  const nombre = (parametros.get('para') || '').trim();
  if (nombre) estado.nombre = nombre;
  const trato = (parametros.get('trato') || '').toLowerCase();
  estado.trato = trato === 'tu' || trato === 'vos' ? trato : deducirTrato(estado.nombre);
}

async function iniciar() {
  iniciarPortada();
  iniciarCuentaAtras(BODA.inicio);
  iniciarFormulario();

  const parametros = new URLSearchParams(location.search);
  estado.codigo = (parametros.get('i') || '').trim().toLowerCase();

  if (estado.codigo && hayApi()) await cargarInvitacion(parametros);
  else cargarDemo(parametros);

  pintar();
}

iniciar();
