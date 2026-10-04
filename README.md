# DWML Weather Lab
Manuel García Baldó · Trabajos (III): Lenguaje derivado de XML · ECW · MIW

Tres aplicaciones estáticas para consultar y analizar previsiones DWML del National Weather Service de Estados Unidos. 

## Aplicaciones
- **Visor:** consulta una ciudad y presenta sus periodos de día y noche, temperaturas, probabilidad de lluvia y descripción meteorológica.
- **Mapa térmico:** gráfico y tabla de máximas y mínimas, con estadísticas calculadas en TypeScript.
- **Comparador:** enfrenta dos ciudades en sus fechas comunes; C++/WebAssembly calcula diferencias y promedios de temperatura y probabilidad de lluvia.

## Datos y estándar
DWML conserva ubicación, unidades y un calendario propio para cada variable. Esa relación permite interpretar previsiones sin emparejar datos por su posición global. Se procesa la primera ubicación de la previsión, se convierte Fahrenheit a Celsius y se conservan los datos ausentes. Las observaciones actuales se excluyen.

La API se consulta en dos pasos: ubicación en JSON y previsión con `Accept: application/vnd.noaa.dwml+xml`. Los cálculos utilizan el XML. Las fechas son locales de cada ciudad; las temperaturas se asignan a la fecha de inicio de su periodo y la lluvia representa la mayor probabilidad disponible para ese día, no precipitación acumulada.

La alternativa sin conexión es importar un DWML guardado. Cada consulta puede descargarse desde la web. El ejemplo de Washington se carga solo si se solicita y conserva su fecha de emisión; no se actualiza automáticamente.

Fuente: [documentación del NWS](https://www.weather.gov/documentation/services-web-api).

## Responsabilidades
- `js/common.js`: ciudades, API, importación y lectura DWML.
- `js/visor.js`, `js/mapa.js`, `js/comparador.js`: presentación e interacción.
- `ts/analysis.ts`: estadísticas térmicas tipadas.
- `cpp/weather.cpp` y `js/wasm.js`: comparación numérica sobre memoria lineal.
- `css/styles.css`: única hoja de estilos, sin selectores de clase ni ID.

## Preparación y uso
Compila con las herramientas disponibles en tu equipo:
```powershell
./ts/compile.ps1 -Tsc "ruta/al/tsc.cmd"
./cpp/compile.ps1 -Zig "ruta/al/zig.exe"
```
Si están en PATH, basta con ejecutar los scripts sin argumentos. No instalan herramientas.

La compilación genera `js/analysis.js`, `wasm/weather.wasm` y `wasm/weather.js`. Después abre `index.html` o sirve la carpeta con Live Server o cualquier servidor estático. No necesita Node para ejecutar la aplicación.

El visor funciona sin compilación. El análisis térmico necesita la salida TS y el comparador la salida C++. Las peticiones necesitan conexión y que la API permita el origen de la página. Si fallan, importa XML. El NWS ofrece aproximadamente siete días de previsión.

