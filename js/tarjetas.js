/**
 * Tarjetas que se giran («¿Dónde será?»). Solo en el tema B (?tema=b).
 * Al tocar la cara delantera se ve el dorso con los detalles; al tocar el dorso
 * (fuera del enlace «Cómo llegar») vuelve a la cara delantera.
 */

export const esTemaB = () => document.documentElement.getAttribute('data-tema') === 'b';

export function iniciarTarjetas() {
  if (!esTemaB()) return;

  document.querySelectorAll('[data-tarjeta]').forEach((tarjeta) => {
    const frente = tarjeta.querySelector('.tarjeta__frente');
    const dorso = tarjeta.querySelector('.tarjeta__dorso');

    const girar = (girada) => {
      tarjeta.classList.toggle('girada', girada);
      frente.setAttribute('aria-expanded', String(girada));
      dorso.inert = !girada; // la cara oculta no recibe foco ni la leen los lectores de pantalla
      frente.tabIndex = girada ? -1 : 0;
      if (girada) dorso.querySelector('a')?.focus({ preventScroll: true });
    };

    dorso.inert = true;
    frente.addEventListener('click', () => girar(true));
    dorso.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      girar(false);
      frente.focus({ preventScroll: true });
    });
  });
}
