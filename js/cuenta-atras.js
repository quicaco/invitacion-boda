/**
 * Cuenta atrás hasta la boda (días, horas y minutos).
 */
import { $ } from './estado.js';

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export function iniciarCuentaAtras(fechaIso) {
  const objetivo = new Date(fechaIso).getTime();

  const actualizar = () => {
    const ms = Math.max(0, objetivo - Date.now());
    $('c-dias').textContent = Math.floor(ms / DIA);
    $('c-horas').textContent = Math.floor(ms / HORA) % 24;
    $('c-minutos').textContent = Math.floor(ms / MINUTO) % 60;
  };

  actualizar();
  setInterval(actualizar, 30 * 1000);
}
