/**
 * Textos que dependen de la respuesta del invitado.
 * Son funciones puras (sin DOM), fáciles de leer y de cambiar.
 */
import { BODA } from './config.js';
import { t } from './trato.js';

/**
 * Mensaje que se muestra tras enviar el formulario.
 * @param {object} p
 * @param {'tu'|'vos'} p.trato
 * @param {string} p.nombre      Nombre con el que saludar
 * @param {boolean} p.viene      Lo que acaba de responder
 * @param {'primera'|'modificacion'|'sin_cambios'} p.tipo   Lo que devuelve el servidor
 * @param {''|'Sí'|'No'} p.anterior  Respuesta anterior (vacío si es la primera)
 */
export function mensajeGracias({ trato, nombre, viene, tipo, anterior }) {
  const te = t(trato, 'Te', 'Os');
  const puedes = t(trato, 'puedas', 'podáis');
  const esperamos = `${te} esperamos el ${BODA.fechaTexto}.`;

  if (tipo === 'sin_cambios') {
    return `${t(trato, 'Tu', 'Vuestra')} respuesta ya estaba guardada tal cual, ${nombre}. No había nada que cambiar.`;
  }
  if (tipo === 'primera') {
    return viene
      ? `¡Qué alegría, ${nombre}! ${esperamos}`
      : `Gracias por avisarnos, ${nombre}. ${te} echaremos de menos.`;
  }
  // Modificación
  if (anterior === 'No' && viene) {
    return `¡Qué alegría que al final ${puedes} venir, ${nombre}! ${esperamos}`;
  }
  if (anterior === 'Sí' && !viene) {
    return `Gracias por avisarnos del cambio, ${nombre}. Sentimos que al final no ${puedes} venir; ${te.toLowerCase()} echaremos de menos.`;
  }
  return `¡Gracias por actualizar ${t(trato, 'tu', 'vuestra')} respuesta, ${nombre}! Hemos guardado los cambios.` +
    (viene ? ` ${esperamos}` : '');
}

/** Aviso que aparece arriba del formulario cuando ya había respondido. */
export function avisoYaRespondido({ trato, asiste }) {
  if (asiste === 'No') {
    return t(trato,
      'Nos dijiste que no podrías venir. Si cambias de idea, puedes cambiar tu respuesta aquí.',
      'Nos dijisteis que no podríais venir. Si cambiáis de idea, podéis cambiar vuestra respuesta aquí.');
  }
  return t(trato,
    'Ya nos confirmaste tu asistencia. Si cambias algo, vuelve a enviarlo.',
    'Ya nos confirmasteis vuestra asistencia. Si cambiáis algo, volved a enviarlo.');
}

/** Aviso que se muestra en la portada cuando no hay una invitación válida. */
export function avisoSinInvitacion(motivo) {
  const comoAbrir =
    'Para ver la invitación y confirmar tu asistencia necesitas el enlace personal que te enviamos por WhatsApp. ' +
    'Ábrelo desde el mensaje. Si no lo encuentras, escríbenos.';
  if (motivo === 'conexion') {
    return 'No hemos podido cargar tu invitación. Comprueba tu conexión y vuelve a cargar la página.';
  }
  if (motivo === 'no_encontrada') {
    return `Este enlace no es válido o está incompleto. ${comoAbrir}`;
  }
  return comoAbrir;
}

export const ERRORES = {
  faltaNombre: 'Falta indicar tu nombre.',
  faltaAsiste: (trato) => t(trato, 'Indícanos si vendrás a la boda.', 'Indicadnos si vendréis a la boda.'),
  faltaAcompanante: 'Falta el nombre de tu acompañante.',
  envio: 'No se ha podido enviar. Comprueba tu conexión e inténtalo de nuevo.',
};
