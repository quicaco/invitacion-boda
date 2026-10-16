/**
 * Estado compartido de la página.
 *
 * modo:
 *   'invitacion'     → código válido; los datos vienen de la hoja.
 *   'sin_invitacion' → sin código, código inexistente o fallo al cargar:
 *                      se ve la información, pero no se puede confirmar.
 *   'demo'           → solo con ?para=Nombre (para probar): nada se guarda.
 *
 * motivo (solo en 'sin_invitacion'): 'sin_codigo' | 'no_encontrada' | 'conexion'
 */
import { NOMBRE_DEMO } from './config.js';

export const estado = {
  modo: 'sin_invitacion',
  motivo: 'sin_codigo',
  codigo: '',
  nombre: NOMBRE_DEMO,
  trato: 'tu',          // 'tu' | 'vos'
  plazas: 1,
  acompanante: true,    // ¿puede añadir un acompañante?
  respuesta: null,      // última respuesta guardada, o null si no ha respondido
};

/** Atajo para document.getElementById */
export const $ = (id) => document.getElementById(id);
