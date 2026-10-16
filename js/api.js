/**
 * Comunicación con el Apps Script (ver apps-script/Code.gs).
 *
 * GET  ?i=CODIGO[&prueba=1] → { ok, nombre, trato, plazas, acompanante, respuesta }
 * POST { i, asiste, ... }   → { ok, tipo: 'primera'|'modificacion'|'sin_cambios', anterior }
 *
 * El POST se envía como texto plano (sin cabecera Content-Type JSON) para que
 * el navegador no haga una petición previa CORS, que Apps Script no admite.
 */
import { API_URL } from './config.js';

export const hayApi = () => Boolean(API_URL);

/** Datos de una invitación. Lanza un error si no existe o falla la conexión. */
export async function obtenerInvitacion(codigo, { prueba = false } = {}) {
  const url = `${API_URL}?i=${encodeURIComponent(codigo)}${prueba ? '&prueba=1' : ''}`;
  const respuesta = await fetch(url);
  const datos = await respuesta.json();
  if (!datos.ok) throw new Error('Invitación no encontrada');
  return datos;
}

/** Guarda la respuesta del formulario. Devuelve { tipo, anterior }. */
export async function enviarRespuesta(datos) {
  const respuesta = await fetch(API_URL, { method: 'POST', body: JSON.stringify(datos) });
  const resultado = await respuesta.json();
  if (!resultado.ok) throw new Error(resultado.error || 'Error al guardar');
  return { tipo: resultado.tipo || 'primera', anterior: resultado.anterior || '' };
}
