/**
 * Configuración de la invitación.
 * Es el único archivo que normalmente hay que tocar.
 */

/** URL de la aplicación web de Apps Script (Implementar → Aplicación web).
 *  Si se deja vacía, la invitación funciona en modo de prueba (no guarda nada). */
export const API_URL =
  'https://script.google.com/macros/s/AKfycbwvMHgTlsqs6vXSatfwAsMyOAqrECDeXPWgOsVT9HcIH27rMiwr5aqK4LIlrZTNXjJN/exec';

export const BODA = {
  /** Fecha y hora de la ceremonia, con la zona horaria de España (+02:00 en octubre). */
  inicio: '2027-10-23T12:30:00+02:00',
  /** Cómo se nombra la fecha en los mensajes de agradecimiento («Te esperamos el …»). */
  fechaTexto: '23 de octubre',
};

/** Nombre que se muestra en modo de prueba cuando el enlace no trae ?para=… */
export const NOMBRE_DEMO = 'Luzmi';
