// Dos consultas independientes; C++ calcula las diferencias de las fechas comunes.
(() => {
  const sources = [...document.querySelectorAll("[data-source]")];
  const result = document.querySelector("[data-result]");
  const status = document.querySelector("[data-comparison-status]");
  const forecasts = [null, null];
  const button = document.querySelector("[data-action='compare']");
  let busy = false;

  sources.forEach((source, index) => {
    DWML.bindSource(
      (forecast) => {
        forecasts[index] = forecast;
        result.hidden = true;
        button.disabled = !forecasts.every(Boolean);
        status.textContent = forecasts.every(Boolean)
          ? "Las dos previsiones están listas. Pulsa Comparar."
          : "Carga las dos ciudades para comparar.";
      },
      source,
      index ? "new-york" : "washington",
    );
  });

  button.addEventListener("click", async () => {
    if (busy || !forecasts.every(Boolean)) return;
    busy = true;

    const controls = [...document.querySelectorAll("button, input, select")];
    const previous = controls.map((control) => control.disabled);
    
    controls.forEach((control) => (control.disabled = true));
    status.textContent = "Comparando las previsiones…";
    status.dataset.state = "ok";

    try {
      const [first, second] = forecasts;
      const compared = await WasmEngine.compare(first, second);
      const [temperature, rain, temperatureCount, rainCount] = compared.summary;
      const statements = [];
      
      if (temperatureCount) {
        statements.push(
          `La segunda ciudad tiene máximas ${DWML.number(Math.abs(temperature))} °C ${temperature >= 0 ? "más altas" : "más bajas"} de media (${temperatureCount} fechas)`,
        );
      }

      if (rainCount) {
        statements.push(
          `la probabilidad máxima diaria de lluvia es ${DWML.number(Math.abs(rain))} puntos porcentuales ${rain >= 0 ? "mayor" : "menor"} (${rainCount} fechas)`,
        );
      }

      result.querySelector("[data-summary]").textContent = statements.length
        ? statements.join("; ") + "."
        : "No hay pares de valores completos para resumir las diferencias.";

      result.querySelector("caption").textContent =
        `${first.name} frente a ${second.name}`;

      result.querySelector("tbody").replaceChildren(
        ...compared.dates.map((day, index) => {
          const other = second.days.find((other) => other.date === day.date);
          const offset = index * 3;
          return DWML.row([
            DWML.date(day.date),
            `${DWML.number(day.minimum)} / ${DWML.number(day.maximum)}`,
            `${DWML.number(other.minimum)} / ${DWML.number(other.maximum)}`,
            DWML.number(compared.differences[offset + 1]),
            `${DWML.number(day.rain)} / ${DWML.number(other.rain)}`,
            DWML.number(compared.differences[offset + 2]),
          ]);
        }),
      );

      const firstDates = first.days.map((day) => day.date).join(",");
      const secondDates = second.days.map((day) => day.date).join(",");

      status.textContent =
        `${compared.dates.length} fechas locales comunes.` +
        (firstDates !== secondDates
          ? " Se han omitido las fechas disponibles en una sola previsión."
          : "");

      result.hidden = false;
    } catch (error) {
      result.hidden = true;
      status.textContent = error.message;
      status.dataset.state = "error";
    } finally {
      controls.forEach(
        (control, index) => (control.disabled = previous[index]),
      );
      busy = false;
    }
  });
})();
