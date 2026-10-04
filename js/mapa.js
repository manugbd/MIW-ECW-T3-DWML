// TypeScript calcula las estadísticas; JavaScript dibuja las series disponibles.
(() => {
  const result = document.querySelector("[data-result]");
  DWML.bindSource((forecast) => {

    result.hidden = !forecast;

    if (!forecast) return;

    if (typeof Analysis === "undefined")
      throw new Error("El análisis térmico no está disponible.");

    result.querySelector("h2").textContent = forecast.name;

    const summary = Analysis.summarize(forecast.days);
    
    result.querySelector("[data-summary]").textContent = summary
      ? `${summary.count} días completos · Media de mínimas y máximas: ${DWML.number(summary.mean)} °C · Máxima más alta: ${DWML.date(summary.warmest.date)} · Mayor oscilación: ${DWML.number(summary.amplitude)} °C, el ${DWML.date(summary.widest.date)}.`
      : "No hay pares completos de mínimas y máximas para calcular estadísticas.";

    result.querySelector("tbody").replaceChildren(
      ...forecast.days.map((day) => {
        const tr = DWML.row([
          DWML.date(day.date),
          DWML.number(day.minimum),
          DWML.number(day.maximum),
          DWML.number(day.rain),
        ]);

        [day.minimum, day.maximum].forEach((value, index) => {
          if (value !== null) {
            tr.children[index + 1].dataset.level =
              value < 5
                ? "very-cold"
                : value < 12
                  ? "cold"
                  : value < 20
                    ? "mild"
                    : value < 28
                      ? "warm"
                      : "hot";
          }
        });

        return tr;
      }),
    );
    const canvas = result.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const values = forecast.days
      .flatMap((day) => [day.minimum, day.maximum])
      .filter((value) => value !== null);

    const low = Math.min(...values) - 3;
    const high = Math.max(...values) + 3;

    const x = (index) =>
      65 + (index * 750) / Math.max(1, forecast.days.length - 1);

    const y = (value) => 235 - ((value - low) / (high - low)) * 190;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px Arial";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const value = low + ((high - low) * i) / 4;
      ctx.strokeStyle = "#e5ddd5";
      ctx.beginPath();
      ctx.moveTo(55, y(value));
      ctx.lineTo(840, y(value));
      ctx.stroke();
      ctx.fillStyle = "#221910";
      ctx.fillText(`${DWML.number(value)}°`, 5, y(value) + 5);
    }
    
    ["minimum", "maximum"].forEach((field, index) => {
      ctx.strokeStyle = index ? "#b95b0a" : "#397292";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 3;
      ctx.beginPath();
      let previous = false;
      forecast.days.forEach((day, i) => {
        if (day[field] === null) {
          previous = false;
          return;
        }
        if (previous) ctx.lineTo(x(i), y(day[field]));
        else ctx.moveTo(x(i), y(day[field]));
        previous = true;
      });
      ctx.stroke();
      forecast.days.forEach((day, i) => {
        if (day[field] === null) return;
        ctx.beginPath();
        ctx.arc(x(i), y(day[field]), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.fillStyle = "#221910";

    const step = Math.max(1, Math.ceil(forecast.days.length / 7));

    forecast.days.forEach((day, i) => {
      if (i % step === 0) ctx.fillText(DWML.date(day.date), x(i) - 20, 270);
    });
    
  });
})();
