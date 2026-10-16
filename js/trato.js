/**
 * Trato «tú» / «vosotros».
 *
 * En el HTML, cualquier texto que cambie según el trato se marca así:
 *   <span data-tu="sabes" data-vos="sabéis">sabes</span>
 */

const PLURAL_POR_CONECTOR = /(^|\s)(y|e)\s|&|,/i;
const PLURAL_POR_INICIO =
  /^(familia|los|las|tíos|tios|tías|tias|primos|primas|hermanos|hermanas|abuelos|chicos|chicas)\b/i;

/** Deduce el trato a partir del nombre de la invitación («Lucía y Pablo» → 'vos'). */
export function deducirTrato(nombre) {
  return PLURAL_POR_CONECTOR.test(nombre) || PLURAL_POR_INICIO.test(nombre) ? 'vos' : 'tu';
}

/** Cambia todos los textos marcados con data-tu / data-vos. */
export function aplicarTrato(trato, raiz = document) {
  const atributo = trato === 'vos' ? 'data-vos' : 'data-tu';
  raiz.querySelectorAll('[data-tu]').forEach((el) => {
    el.textContent = el.getAttribute(atributo);
  });
}

/** Elige entre dos textos según el trato: t('vos', 'puedes', 'podéis') → 'podéis' */
export const t = (trato, tu, vos) => (trato === 'vos' ? vos : tu);
