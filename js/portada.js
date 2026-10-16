/**
 * Portada: el «sobre» que se abre al tocarlo y el saludo personalizado.
 */
import { $ } from './estado.js';

export function iniciarPortada() {
  const sobre = $('sobre');
  const abrir = () => {
    sobre.classList.add('abierto');
    sobre.setAttribute('aria-hidden', 'true');
  };
  sobre.addEventListener('click', abrir);
  sobre.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrir();
    }
  });
}

/** Oculta el nombre mientras se carga la invitación (evita ver el nombre de ejemplo). */
export function saludoCargando() {
  $('saludo').classList.add('cargando');
}

/** «Ya lo sabes, Paula.» — sin nombre, queda «Ya lo sabes.» */
export function pintarSaludo(nombre, { esEjemplo }) {
  $('invitado').textContent = nombre;
  $('invitado').classList.toggle('ej', esEjemplo);
  $('saludo').hidden = !nombre;
  $('saludo').classList.remove('cargando');
}
