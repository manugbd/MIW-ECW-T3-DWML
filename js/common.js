// Lectura de DWML y controles de consulta compartidos por las tres vistas.
const DWML = (() => {
    const cities = [
        ["washington", "Washington", 38.9072, -77.0369],
        ["new-york", "Nueva York", 40.7128, -74.006],
        ["boston", "Boston", 42.3601, -71.0589],
        ["chicago", "Chicago", 41.8781, -87.6298],
        ["miami", "Miami", 25.7617, -80.1918],
        ["denver", "Denver", 39.7392, -104.9903],
        ["seattle", "Seattle", 47.6062, -122.3321],
        ["los-angeles", "Los Ángeles", 34.0522, -118.2437],
    ];

    const number = (value) =>
        value === null || !Number.isFinite(value)
            ? "—"
            : value.toLocaleString("es-ES", { maximumFractionDigits: 1 });

    const date = (value) =>
        new Date(value.slice(0, 10) + "T12:00:00Z").toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        });

    // Excluye los bloques de observaciones, aunque estén anidados en la previsión.
    function owned(parent, selector, data) {
        return [...parent.querySelectorAll(selector)].filter(
            (element) => element.closest("data") === data,
        );
    }

    function parse(text) {
        const xml = new DOMParser().parseFromString(text, "application/xml");
        if (
            xml.querySelector("parsererror") ||
            xml.documentElement.localName !== "dwml"
        ) {
            throw new Error("El archivo no contiene DWML válido.");
        }

        const data =
            [...xml.querySelectorAll("data")].find(
                (element) => element.getAttribute("type") === "forecast",
            ) || xml.documentElement.querySelector(":scope > data");

        if (!data) throw new Error("El DWML no contiene una previsión.");

        const location = owned(data, "location", data)[0];
        const key = location?.querySelector("location-key")?.textContent.trim();
        const parameters = owned(data, "parameters", data).find(
            (element) => element.getAttribute("applicable-location") === key,
        );

        if (!parameters)
            throw new Error("No hay parámetros para la primera localización.");

        const layouts = new Map();
        owned(data, "time-layout", data).forEach((layout) => {
            layouts.set(
                layout.querySelector("layout-key")?.textContent.trim(),
                [...layout.querySelectorAll("start-valid-time")].map((element) => ({
                    start: element.textContent.trim(),
                    label: element.getAttribute("period-name") || "",
                })),
            );
        });

        const days = new Map();
        const periods = new Map();

        function dayFor(start) {
            const key = start.slice(0, 10);
            if (!days.has(key))
                days.set(key, { date: key, minimum: null, maximum: null, rain: null });
            return days.get(key);
        }

        function periodFor(time) {
            if (!periods.has(time.start)) {
                periods.set(time.start, {
                    ...time,
                    temperature: null,
                    kind: "",
                    rain: null,
                    condition: "",
                    text: "",
                });
            }
            return periods.get(time.start);
        }

        // Cada variable se interpreta con su propio calendario y valores directos.
        owned(parameters, "[time-layout]", data).forEach((parameter) => {
            const tag = parameter.localName;
            const type = parameter.getAttribute("type");
            let field = "";

            if (
                tag === "temperature" &&
                ["minimum", "maximum", "hourly"].includes(type)
            )
                field = type;

            if (tag === "probability-of-precipitation") field = "rain";
            if (tag === "wordedForecast") field = "text";
            if (tag === "weather") field = "condition";
            if (!field) return;

            const times = layouts.get(parameter.getAttribute("time-layout"));

            if (!times)
                throw new Error("Una variable referencia un calendario inexistente.");

            let elements = [...parameter.children].filter(
                (element) =>
                    element.localName === (field === "text" ? "text" : "value"),
            );

            if (field === "condition") {
                elements = [
                    ...parameter.querySelectorAll(
                        "weather-conditions > value[weather-summary]",
                    ),
                ];
                if (!elements.length)
                    elements = [
                        ...parameter.querySelectorAll(
                            "weather-conditions[weather-summary]",
                        ),
                    ];

            }

            if (elements.length > times.length)
                throw new Error("Hay más valores que fechas en una serie.");

            elements.forEach((element, index) => {
                const time = times[index];
                if (
                    !/^\d{4}-\d{2}-\d{2}T/.test(time.start) ||
                    !Number.isFinite(Date.parse(time.start))
                ) {
                    throw new Error("La previsión contiene una fecha no válida.");
                }

                const period = periodFor(time);
                if (field === "text" || field === "condition") {
                    period[field] =
                        field === "text"
                            ? element.textContent.trim()
                            : element.getAttribute("weather-summary");
                    return;
                }

                const raw = element.textContent.trim();
                if (
                    !raw ||
                    ["true", "1"].includes(
                        element.getAttributeNS(
                            "http://www.w3.org/2001/XMLSchema-instance",
                            "nil",
                        ),
                    )
                )
                    return;
                let value = Number(raw);

                if (!Number.isFinite(value))
                    throw new Error("La previsión contiene un valor no numérico.");

                const unit = parameter.getAttribute("units")?.toLowerCase();

                if (field === "rain") {
                    if (unit !== "percent" || value < 0 || value > 100)
                        throw new Error("Probabilidad de lluvia no válida.");
                } else {
                    if (!["fahrenheit", "celsius"].includes(unit))
                        throw new Error("Unidad de temperatura no compatible.");
                    if (unit === "fahrenheit") value = ((value - 32) * 5) / 9;
                }

                const day = dayFor(time.start);
                if (field === "rain") {
                    period.rain = value;
                    day.rain = day.rain === null ? value : Math.max(day.rain, value);
                } else {
                    period.temperature = value;
                    period.kind =
                        field === "maximum"
                            ? "Máxima"
                            : field === "minimum"
                                ? "Mínima"
                                : "Temperatura";
                    if (field !== "hourly") {
                        day[field] =
                            day[field] === null
                                ? value
                                : field === "minimum"
                                    ? Math.min(day[field], value)
                                    : Math.max(day[field], value);
                    }
                }
            });
        });

        const forecastDays = [...days.values()].sort((a, b) =>
            a.date.localeCompare(b.date),
        );

        if (
            !forecastDays.some((day) => day.minimum !== null || day.maximum !== null)
        ) {
            throw new Error(
                "Se necesitan temperaturas máximas o mínimas en este DWML.",
            );
        }

        return {
            name:
                location
                    .querySelector("area-description, description")
                    ?.textContent.trim() || "Localidad del archivo",
            created:
                xml.querySelector("creation-date")?.textContent.trim() || "No indicada",
            days: forecastDays,
            periods: [...periods.values()].sort(
                (a, b) => Date.parse(a.start) - Date.parse(b.start),
            ),
            xml: text,
        };
    }

    async function fetchResponse(url, accept) {
        const response = await fetch(url, {
            headers: { Accept: accept },
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok)
            throw new Error(`El NWS ha respondido HTTP ${response.status}.`);

        return response;
    }

    async function fromCity(id) {
        const city = cities.find((city) => city[0] === id);


        if (!city) throw new Error("Selecciona una ciudad.");

        try {
            const point = await fetchResponse(
                `https://api.weather.gov/points/${city[2]},${city[3]}`,
                "application/geo+json",
            );
            const metadata = await point.json();
            const url = new URL(metadata.properties.forecast);

            if (url.origin !== "https://api.weather.gov")
                throw new Error("URL de previsión no compatible.");

            const response = await fetchResponse(
                url.href,
                "application/vnd.noaa.dwml+xml",
            );

            const forecast = parse(await response.text());

            forecast.name = `${city[1]} · ${forecast.name}`;
            
            return forecast;
        } catch (error) {
            if (error instanceof TypeError || error.name === "TimeoutError") {
                throw new Error(
                    "No se pudo acceder al NWS. Puedes importar un DWML guardado o cargar el ejemplo.",
                );
            }
            throw error;
        }
    }

    function row(values) {
        const tr = document.createElement("tr");
        values.forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value;
            tr.append(td);
        });
        return tr;
    }

    function download(forecast) {
        const url = URL.createObjectURL(
            new Blob([forecast.xml], { type: "application/xml" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "prevision.dwml.xml";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function fillCities(select, initial = "washington") {
        cities.forEach(([id, name]) =>
            select.add(new Option(name, id, false, id === initial)),
        );
    }

    // No hay consultas automáticas ni sustitución silenciosa por un ejemplo.
    function bindSource(
        onLoad,
        host = document.querySelector("[data-source]"),
        initial = "washington",
    ) {
        const select = host.querySelector("select");
        const status = host.querySelector('[role="status"]');
        const downloadButton = host.querySelector('[data-action="download"]');
        fillCities(select, initial);
        let current;
        let busy = false;

        async function load(loader, source) {
            if (busy) return;
            busy = true;
            host
                .querySelectorAll("button, input, select")
                .forEach((control) => (control.disabled = true));
            status.textContent = "Cargando la previsión…";
            status.dataset.state = "ok";
            try {
                current = await loader();
                await onLoad(current);
                status.textContent = `${source} · ${current.name}. Emisión: ${current.created}.`;
            } catch (error) {
                current = null;
                status.textContent = error.message;
                status.dataset.state = "error";
                await onLoad(null);
            } finally {
                busy = false;
                host
                    .querySelectorAll("button, input, select")
                    .forEach((control) => (control.disabled = false));
                downloadButton.disabled = !current;
            }
        }
        host.querySelector("form").addEventListener("submit", (event) => {
            event.preventDefault();
            load(() => fromCity(select.value), "API del NWS");
        });
        host
            .querySelector('[data-action="example"]')
            .addEventListener("click", () => {
                load(() => parse(DWMLExample), "Ejemplo guardado, no actualizado");
            });
        host
            .querySelector('input[type="file"]')
            .addEventListener("change", (event) => {
                const file = event.target.files[0];
                if (file)
                    load(async () => {
                        if (file.size > 5 * 1024 * 1024)
                            throw new Error("El archivo supera los 5 MB.");
                        return parse(await file.text());
                    }, `Archivo ${file.name}`);
            });
        downloadButton.addEventListener("click", () => download(current));
    }

    return { parse, number, date, row, bindSource };
})();
