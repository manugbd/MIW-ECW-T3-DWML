// Presenta los periodos diurnos y nocturnos sin mezclar observaciones actuales.
(() => {
  const result = document.querySelector("[data-result]");

  DWML.bindSource((forecast) => {
    result.hidden = !forecast;

    if (!forecast) return;

    result.querySelector("h2").textContent = forecast.name;

    const rows = forecast.periods.map((period) => {
      const hour = period.start.slice(11, 16);

      const tr = DWML.row([
        `${DWML.date(period.start)} · ${hour}`,
        period.kind
          ? `${period.kind}: ${DWML.number(period.temperature)} °C`
          : "—",
        DWML.number(period.rain),
        period.condition || "—",
      ]);

      const cell = document.createElement("td");

      if (period.text) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "Ver descripción";
        const text = document.createElement("p");
        text.lang = "en";
        text.textContent = period.text;
        details.append(summary, text);
        cell.append(details);
      } else {
        cell.textContent = "—";
      }

      tr.append(cell);

      return tr;
    });

    result.querySelector("tbody").replaceChildren(...rows);
  });
})();
