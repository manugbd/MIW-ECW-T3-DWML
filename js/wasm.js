// Instancia los bytes del C++ compilado, también al abrir el HTML desde disco.
const WasmEngine = (() => {
  let pending;

  function get() {
    if (typeof WeatherBinary === "undefined") {
      throw new Error("El módulo de comparación no está disponible.");
    }
    if (!pending) {
      const bytes = Uint8Array.from(atob(WeatherBinary), (value) =>
        value.charCodeAt(0),
      );
      pending = WebAssembly.instantiate(bytes).then(
        (result) => result.instance.exports,
      );
      pending = pending.catch((error) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  }

  async function compare(first, second) {
    const dates = first.days.filter((day) =>
      second.days.some((other) => other.date === day.date),
    );

    if (!dates.length)
      throw new Error("Las previsiones no tienen fechas locales en común.");

    const engine = await get();

    if (dates.length > engine.capacity())
      throw new Error("El archivo contiene demasiados días.");

    const values = dates.flatMap((day) => {
      const other = second.days.find((other) => other.date === day.date);

      return [
        day.minimum,
        day.maximum,
        day.rain,
        other.minimum,
        other.maximum,
        other.rain,
      ].map((value) => value ?? NaN);
    });

    new Float64Array(
      engine.memory.buffer,
      engine.input_ptr(),
      values.length,
    ).set(values);

    if (engine.compare_days(dates.length) < 0)
      throw new Error("No se pudo completar la comparación.");

    return {
      dates,
      differences: new Float64Array(
        engine.memory.buffer,
        engine.output_ptr(),
        dates.length * 3,
      ).slice(),
      summary: new Float64Array(
        engine.memory.buffer,
        engine.summary_ptr(),
        4,
      ).slice(),
    };
  }

  return { compare };
})();
