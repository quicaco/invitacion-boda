/**
 * Punto de entrada: lee el enlace, carga la invitación y pinta la página.
 *
 * Enlaces admitidos:
 *   ?i=CODIGO            invitación real (datos de la hoja)
 *   ?i=CODIGO&prueba=1   igual, pero sin apuntar la apertura en la hoja
 *   ?para=Nombre         modo de prueba con ese nombre (&trato=tu|vos para forzarlo)
 *   (sin nada)           solo la portada con un aviso: hace falta el enlace personal
 *
 * Sin una invitación válida no se muestra el contenido de la boda.
 */
import { BODA } from './config.js';
import { estado } from './estado.js';
import { hayApi, obtenerInvitacion, InvitacionNoEncontrada } from './api.js';
import { deducirTrato, aplicarTrato } from './trato.js';
import { iniciarPortada, saludoCargando, pintarSaludo, habilitarPortada, bloquearPortada } from './portada.js';
import { avisoSinInvitacion } from './mensajes.js';
import { iniciarCuentaAtras } from './cuenta-atras.js';
import { iniciarFormulario, prepararFormulario } from './formulario.js';

function pintar() {
  if (estado.modo === 'sin_invitacion') {
    bloquearPortada(avisoSinInvitacion(estado.motivo));
    return;
  }
  pintarSaludo(estado.nombre, { esEjemplo: estado.modo !== 'invitacion' });
  aplicarTrato(estado.trato);
  prepararFormulario();
  habilitarPortada();
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
  } catch (error) {
    Object.assign(estado, {
      modo: 'sin_invitacion',
      motivo: error instanceof InvitacionNoEncontrada ? 'no_encontrada' : 'conexion',
      nombre: '',
    });
  }
}

function cargarDemo(parametros) {
  estado.modo = 'demo';
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

  if (estado.codigo && hayApi()) {
    await cargarInvitacion(parametros);
  } else if (parametros.has('para') || !hayApi()) {
    cargarDemo(parametros);
  } else {
    // Sin código: solo la portada con el aviso
    Object.assign(estado, { modo: 'sin_invitacion', motivo: estado.codigo ? 'no_encontrada' : 'sin_codigo', nombre: '' });
  }

  pintar();
}

iniciar();
