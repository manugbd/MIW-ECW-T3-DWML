// Estadísticas del gráfico térmico, con valores ausentes explícitos.
namespace Analysis {
    export interface Day {
        date: string;
        minimum: number | null;
        maximum: number | null;
        rain: number | null;
    }

    export function summarize(days: Day[]) {

        const complete = days.filter((day): day is Day & { minimum: number; maximum: number } =>
            day.minimum !== null && day.maximum !== null && day.minimum <= day.maximum);

        if (!complete.length) return null;

        const means = complete.map(day => (day.minimum + day.maximum) / 2);
        const warmest = complete.reduce((best, day) => day.maximum > best.maximum ? day : best);
        const widest = complete.reduce((best, day) =>
            day.maximum - day.minimum > best.maximum - best.minimum ? day : best);
        
        return {
            count: complete.length,
            mean: means.reduce((sum, value) => sum + value, 0) / means.length,
            warmest,
            widest,
            amplitude: widest.maximum - widest.minimum
        };
    }
}
