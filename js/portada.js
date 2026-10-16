/**
 * Portada: el «sobre» que se abre al tocarlo y el saludo personalizado.
 *
 * La portada empieza «cargando» (no se puede abrir). Cuando se sabe si la
 * invitación es válida, se habilita (habilitarPortada) o se bloquea con un
 * aviso (bloquearPortada) y el contenido de la boda no llega a mostrarse.
 */
import { $ } from './estado.js';

let sePuedeAbrir = false;

export function iniciarPortada() {
  const sobre = $('sobre');
  const abrir = () => {
    if (!sePuedeAbrir) return;
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

/** Invitación válida (o modo de prueba): se muestra el contenido y la portada se puede abrir. */
export function habilitarPortada() {
  sePuedeAbrir = true;
  $('inicio').hidden = false;
  $('toca').textContent = '(Toca para abrir)';
  $('sobre').removeAttribute('aria-busy');
}

/** Sin invitación válida: la portada muestra el aviso y no se abre; el contenido sigue oculto. */
export function bloquearPortada(aviso) {
  sePuedeAbrir = false;
  const sobre = $('sobre');
  sobre.classList.add('bloqueado');
  sobre.removeAttribute('aria-busy');
  sobre.removeAttribute('role');
  sobre.removeAttribute('tabindex');
  sobre.setAttribute('aria-label', aviso);
  $('sobre-frase').hidden = true;
  $('sobre-abrir').hidden = true;
  $('sobre-aviso').textContent = aviso;
  $('sobre-aviso').hidden = false;
  $('inicio').hidden = true;
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
