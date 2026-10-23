# Invitación · Marta & Víctor

Web de invitación para la boda de Marta y Víctor (23 de octubre de 2027).
Se publica con GitHub Pages desde la rama `main`. HTML, CSS y JavaScript sin
compilación: lo que hay en el repositorio es lo que se sirve.

## Estructura

```
index.html            estructura de la página (solo HTML)
css/
  base.css            colores, tipografías y reset
  invitacion.css      portada, cabecera, secciones y pie
  formulario.css      ventana de confirmación
  tema-b.css          diseño alternativo (solo con ?tema=b; todo bajo [data-tema="b"])
js/
  config.js           URL del Apps Script, fecha y hora de la boda  ← lo que más se toca
  main.js             arranque: lee el enlace, carga la invitación y pinta la página
  estado.js           estado compartido (modo, invitado, trato, plazas, respuesta)
  api.js              llamadas al Apps Script (GET invitación, POST respuesta)
  trato.js            tú / vosotros
  mensajes.js         textos de agradecimiento y errores (funciones puras)
  portada.js          sobre de portada y saludo personalizado
  cuenta-atras.js     cuenta atrás
  formulario.js       formulario: mostrar, rellenar, validar y enviar
  tarjetas.js         tarjetas que se giran (solo en el tema B)
apps-script/
  Code.gs             backend en Google Apps Script (se pega a mano en la hoja)
```

## Enlaces

| Enlace | Qué hace |
|---|---|
| `?i=CODIGO` | Invitación real: datos de la hoja y respuestas guardadas |
| `?i=CODIGO&prueba=1` | Igual, pero sin apuntar la apertura en la columna «Abierta» |
| `?para=Nombre` | Modo de prueba con ese nombre (`&trato=tu` o `&trato=vos` para forzarlo) |
| `&tema=b` (añadido a cualquiera) | Diseño alternativo B: burdeos y crema con ilustración de línea |
| Sin parámetros o código no válido | Solo la portada con un aviso; el contenido de la boda no se muestra |

> Ocultar el contenido evita que lo vea quien no tiene enlace, pero los datos siguen
> en el HTML (y el repositorio es público). No pongas aquí nada que no pueda ser público.

## Diseños

Hay dos diseños con el mismo HTML y la misma lógica:

- **A** (por defecto): blanco, dorado y acuarela.
- **B** (`&tema=b`): burdeos y crema, ilustraciones de línea, tarjetas que se giran,
  itinerario horizontal y lazos. Sus reglas están en `css/tema-b.css`.

Los elementos exclusivos de un diseño llevan la clase `solo-a` o `solo-b`. Las ilustraciones
del tema B son SVG propios en `index.html`, listos para sustituir por las de Pilar y Maki.

## Textos que cambian según el trato

En el HTML se marcan con `data-tu` / `data-vos`:

```html
<span data-tu="sabes" data-vos="sabéis">sabes</span>
```

## Desarrollo en local

Los módulos de JavaScript (`type="module"`) no funcionan abriendo el archivo
con doble clic (`file://`). Usa un servidor local, por ejemplo la extensión
**Live Server** de VS Code, o:

```bash
python -m http.server 8000   # y abre http://localhost:8000/?para=Paula
```

## Caché

GitHub Pages hace que los navegadores guarden los archivos hasta 10 minutos.
Al cambiar CSS o JS, sube el número de `?v=` en `index.html` y prueba siempre
en una ventana de incógnito.

## Datos

Los datos de los invitados **no** van en este repositorio (es público): viven
en un Google Sheets privado.
