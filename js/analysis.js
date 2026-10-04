"use strict";
// Estadísticas del gráfico térmico, con valores ausentes explícitos.
var Analysis;
(function (Analysis) {
  function summarize(days) {
    const complete = days.filter(
      (day) =>
        day.minimum !== null &&
        day.maximum !== null &&
        day.minimum <= day.maximum,
    );

    if (!complete.length) return null;

    const means = complete.map((day) => (day.minimum + day.maximum) / 2);
    const warmest = complete.reduce((best, day) =>
      day.maximum > best.maximum ? day : best,
    );
    const widest = complete.reduce((best, day) =>
      day.maximum - day.minimum > best.maximum - best.minimum ? day : best,
    );

    return {
      count: complete.length,
      mean: means.reduce((sum, value) => sum + value, 0) / means.length,
      warmest,
      widest,
      amplitude: widest.maximum - widest.minimum,
    };
  }

  Analysis.summarize = summarize;
  
})(Analysis || (Analysis = {}));
