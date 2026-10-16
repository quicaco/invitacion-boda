/**
 * Estado compartido de la página.
 *
 * modo:
 *   'demo'       → sin código de invitación (o sin API): nada se guarda.
 *   'invitacion' → código válido; los datos vienen de la hoja.
 *   'error'      → el código no existe o no se pudo cargar.
 */
import { NOMBRE_DEMO } from './config.js';

export const estado = {
  modo: 'demo',
  codigo: '',
  nombre: NOMBRE_DEMO,
  trato: 'tu',          // 'tu' | 'vos'
  plazas: 1,
  acompanante: true,    // ¿puede añadir un acompañante?
  respuesta: null,      // última respuesta guardada, o null si no ha respondido
};

/** Atajo para document.getElementById */
export const $ = (id) => document.getElementById(id);
