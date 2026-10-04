// Compara mínimas, máximas y lluvia de dos ciudades en fechas comunes.
constexpr int CAPACITY = 366;
static double input[CAPACITY * 6];
static double output[CAPACITY * 3];
static double summary[4];

extern "C" {
    int capacity() {
        return CAPACITY;
    }

    double* input_ptr() {
        return input;
    }

    double* output_ptr() {
        return output;
    }

    double* summary_ptr() {
        return summary;
    }

    // Entrada: tres valores de A y tres de B por día. Salida: B menos A.
    int compare_days(int count) {
        if (count < 0 || count > CAPACITY) {
            return -1;
        }
        double totals[2] = {0, 0};
        int counts[2] = {0, 0};
        for (int day = 0; day < count; ++day) {
            for (int field = 0; field < 3; ++field) {
                const double first = input[day * 6 + field];
                const double second = input[day * 6 + field + 3];
                const bool available = __builtin_isfinite(first) && __builtin_isfinite(second);
                const double difference = available ? second - first : __builtin_nan("");
                output[day * 3 + field] = difference;

                // El resumen usa máximas y lluvia; los datos ausentes no cuentan.
                if (available && field > 0) {
                    totals[field - 1] += difference;
                    counts[field - 1]++;
                }
            }
        }
        for (int field = 0; field < 2; ++field) {
            summary[field] = counts[field] ? totals[field] / counts[field] : __builtin_nan("");
            summary[field + 2] = counts[field];
        }
        return count;
    }
}
