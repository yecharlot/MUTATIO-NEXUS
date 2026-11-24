# Evolución visual 3D con Three.js

## Decisión

He sustituido la representación Canvas 2D del mapa por una escena WebGL construida con Three.js. La escena representa una versión estilizada de Cuba y su archipiélago, con relieve, vegetación, núcleos urbanos, rutas, marcadores regionales, iluminación y agua animada.

## Límites de la arquitectura

- Three.js es exclusivamente la capa de representación.
- El estado del mundo continúa procediendo de la API y se entrega mediante `IsoMap.setState(state)`.
- Las reglas económicas, votaciones, CBN y resolución permanecen en el servidor.
- La selección de regiones emite el evento de navegador `mutatio:region-selected`; no modifica el estado autoritativo.
- No se incorporan datos arqueológicos ficticios como hechos. Las ruinas submarinas son un recurso narrativo del juego.

## Tecnología y carga

Three.js 0.180.0 y OrbitControls se cargan mediante import map desde jsDelivr. Esto evita introducir un proceso de compilación nuevo en el MVP actual. La aplicación necesita conexión para descargar estos módulos.

## Controles

- Arrastrar: rotar cámara.
- Rueda: acercar y alejar.
- Clic en marcador: seleccionar región.
- Botón «Reiniciar vista»: recuperar cámara inicial.

## Rendimiento

- Pixel ratio limitado a 1.6.
- Sombras de resolución controlada.
- Geometrías simples y materiales reutilizados donde es posible.
- Respeto a `prefers-reduced-motion`.
- No se incorpora renderizado 3D en servidor.

## Estado de validación

Implementación escrita en la rama `feat/threejs-world-map`. La inspección de código confirma el reemplazo del canvas por un contenedor WebGL y la conservación de la interfaz `IsoMap.setState`. La ejecución real en navegadores y la comprobación de FPS deben realizarse antes de integrar en `main`.
