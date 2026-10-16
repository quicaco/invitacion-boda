/**
 * Formulario de confirmación: abrir/cerrar, adaptar a la invitación,
 * rellenar con la respuesta anterior, validar y enviar.
 */
import { estado, $ } from './estado.js';
import { enviarRespuesta } from './api.js';
import { mensajeGracias, avisoYaRespondido, ERRORES } from './mensajes.js';

const form = () => $('rsvp');

/* ---------- Abrir / cerrar ---------- */

function mostrar() {
  $('velo').hidden = false;
  document.body.style.overflow = 'hidden';
}

function ocultar() {
  $('velo').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- Utilidades de campos ---------- */

/** Valor del radio marcado de un grupo, o '' si no hay ninguno. */
function marcado(nombre) {
  const el = form().querySelector(`input[name="${nombre}"]:checked`);
  return el ? el.value : '';
}

/** Muestra u oculta bloques según lo que se ha marcado. */
function sincronizar() {
  $('si-box').hidden = marcado('asiste') !== 'si';
  $('acomp-box').hidden = !estado.acompanante || marcado('acomp') !== 'si';
}

function mostrarError(texto) {
  $('error').textContent = texto;
  $('error').hidden = false;
}

/* ---------- Adaptar a la invitación ---------- */

/** Ajusta el formulario a la invitación cargada (plazas, acompañante, modo). */
export function prepararFormulario() {
  const esInvitacion = estado.modo === 'invitacion';
  $('beta').hidden = esInvitacion;
  $('nota-demo').hidden = esInvitacion;
  $('nombre-box').hidden = estado.modo !== 'demo';
  $('acomp-q').hidden = !estado.acompanante;

  const selector = $('cuantos');
  selector.innerHTML = '';
  for (let n = estado.plazas; n >= 1; n--) {
    selector.add(new Option(n === 1 ? '1 persona' : `${n} personas`, String(n)));
  }
  $('cuantos-box').hidden = estado.plazas < 2;

  if (estado.respuesta) rellenar(estado.respuesta);
  sincronizar();
}

/** Rellena el formulario con una respuesta guardada. */
function rellenar(r) {
  $(r.asiste === 'No' ? 'asiste-no' : 'asiste-si').checked = true;

  const conAcomp = Boolean(r.nombreAcomp && estado.acompanante);
  const sinAcomp = (r.asistentes || 1) - (conAcomp ? 1 : 0);
  $('cuantos').value = String(Math.max(1, Math.min(estado.plazas, sinAcomp)));
  $(conAcomp ? 'acomp-si' : 'acomp-no').checked = true;
  $('acomp-nombre').value = r.nombreAcomp || '';

  // Alergias: las conocidas marcan su casilla; el resto va a «Otra»
  const otras = [];
  String(r.alergias || '').split(',').map((a) => a.trim()).filter(Boolean).forEach((a) => {
    const casilla = form().querySelector(`input[name="dieta"][value="${a.replace(/"/g, '')}"]`);
    if (casilla) casilla.checked = true;
    else otras.push(a);
  });
  $('dieta-otra').value = otras.join(', ');

  $(r.autobus === 'Sí' ? 'bus-si' : 'bus-no').checked = true;
  $('mensaje').value = r.mensaje || '';

  $('ya-resp').textContent = avisoYaRespondido({ trato: estado.trato, asiste: r.asiste });
  $('ya-resp').hidden = false;
  $('enviar').textContent = 'Guardar cambios';
  sincronizar();
}

/* ---------- Leer y validar ---------- */

/** Devuelve { datos } listos para enviar, o { error } con el texto a mostrar. */
function leerFormulario() {
  if (estado.modo === 'error') return { error: ERRORES.invitacionNoEncontrada };
  if (estado.modo === 'demo' && !$('nombre').value.trim()) return { error: ERRORES.faltaNombre };
  if (!marcado('asiste')) return { error: ERRORES.faltaAsiste(estado.trato) };

  const viene = marcado('asiste') === 'si';
  const conAcomp = viene && estado.acompanante && marcado('acomp') === 'si';
  const nombreAcomp = $('acomp-nombre').value.trim();
  if (conAcomp && !nombreAcomp) return { error: ERRORES.faltaAcompanante };

  const dieta = [...form().querySelectorAll('input[name="dieta"]:checked')].map((c) => c.value);
  const otra = $('dieta-otra').value.trim();
  if (otra) dieta.push(otra);

  return {
    datos: {
      i: estado.codigo,
      asiste: viene ? 'Sí' : 'No',
      asistentes: !viene ? 0 : (estado.plazas > 1 ? Number($('cuantos').value) : 1),
      nombreAcomp: conAcomp ? nombreAcomp : '',
      alergias: viene ? dieta.join(', ') : '',
      autobus: !viene ? '' : (marcado('bus') === 'si' ? 'Sí' : 'No'),
      mensaje: $('mensaje').value.trim(),
    },
  };
}

/* ---------- Enviar ---------- */

function mostrarGracias(datos, { tipo, anterior }) {
  if (tipo !== 'sin_cambios') {
    estado.respuesta = {
      asiste: datos.asiste,
      asistentes: datos.asistentes + (datos.nombreAcomp ? 1 : 0),
      nombreAcomp: datos.nombreAcomp,
      alergias: datos.alergias,
      autobus: datos.autobus,
      mensaje: datos.mensaje,
    };
  }
  const nombre = estado.modo === 'demo' ? $('nombre').value.trim().split(' ')[0] : estado.nombre;
  $('gracias-txt').textContent = mensajeGracias({
    trato: estado.trato, nombre, viene: datos.asiste === 'Sí', tipo, anterior,
  });
  form().hidden = true;
  $('gracias').hidden = false;
  rellenar(estado.respuesta);
}

async function alEnviar(evento) {
  evento.preventDefault();
  $('error').hidden = true;

  const { datos, error } = leerFormulario();
  if (error) return mostrarError(error);

  // Modo de prueba: se simula la respuesta del servidor
  if (estado.modo === 'demo') {
    const anterior = estado.respuesta ? estado.respuesta.asiste : '';
    return mostrarGracias(datos, { tipo: estado.respuesta ? 'modificacion' : 'primera', anterior });
  }

  const boton = $('enviar');
  boton.disabled = true;
  boton.textContent = 'Enviando…';
  try {
    mostrarGracias(datos, await enviarRespuesta(datos));
  } catch {
    mostrarError(ERRORES.envio);
  } finally {
    boton.disabled = false;
    boton.textContent = estado.respuesta ? 'Guardar cambios' : 'Enviar';
  }
}

/* ---------- Inicio ---------- */

export function iniciarFormulario() {
  $('abrir-form').addEventListener('click', mostrar);
  $('cerrar').addEventListener('click', ocultar);
  $('volver').addEventListener('click', () => {
    ocultar();
    form().hidden = false;
    $('gracias').hidden = true;
  });
  $('velo').addEventListener('click', (e) => { if (e.target === $('velo')) ocultar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('velo').hidden) ocultar(); });

  form().addEventListener('change', sincronizar);
  form().addEventListener('submit', alEnviar);
}
