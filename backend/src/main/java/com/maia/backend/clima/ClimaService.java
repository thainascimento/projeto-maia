package com.maia.backend.clima;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.ObjectMapper;

@Service
public class ClimaService {

    private final RestClient openMeteoClient;
    private final RestClient openWeatherClient;
    private final ObjectMapper objectMapper;

    @Value("${openweather.api.key}")
    private String openWeatherApiKey;

    public ClimaService(
            ObjectMapper objectMapper
    ) {

        this.openMeteoClient =
                RestClient.builder()
                        .baseUrl(
                                "https://api.open-meteo.com"
                        )
                        .requestFactory(
                                criarRequestFactory()
                        )
                        .build();

        this.openWeatherClient =
                RestClient.builder()
                        .baseUrl(
                                "https://api.openweathermap.org"
                        )
                        .requestFactory(
                                criarRequestFactory()
                        )
                        .build();

        this.objectMapper =
                objectMapper;
    }

    private SimpleClientHttpRequestFactory criarRequestFactory() {

        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();

        requestFactory.setConnectTimeout(
                3000
        );

        requestFactory.setReadTimeout(
                5000
        );

        return requestFactory;
    }

    public ClimaResponse buscarClima(
            double latitude,
            double longitude
    ) {

        try {

            System.out.println(
                    "Tentando obter clima pela Open-Meteo..."
            );

            ClimaResponse clima =
                    buscarClimaOpenMeteo(
                            latitude,
                            longitude
                    );

            System.out.println(
                    "Clima obtido pela Open-Meteo."
            );

            return clima;

        } catch (RuntimeException e) {

            System.out.println(
                    "Open-Meteo falhou: "
                            + e.getMessage()
            );

            System.out.println(
                    "Tentando fallback pela OpenWeather..."
            );

            ClimaResponse clima =
                    buscarClimaOpenWeather(
                            latitude,
                            longitude
                    );

            System.out.println(
                    "Clima obtido pela OpenWeather."
            );

            return clima;
        }
    }

    // =========================================================
    // OPEN-METEO
    // =========================================================

    private ClimaResponse buscarClimaOpenMeteo(
            double latitude,
            double longitude
    ) {

        String respostaJson =
                openMeteoClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                                "/v1/forecast"
                                        )
                                        .queryParam(
                                                "latitude",
                                                latitude
                                        )
                                        .queryParam(
                                                "longitude",
                                                longitude
                                        )
                                        .queryParam(
                                                "current",
                                                String.join(
                                                        ",",
                                                        "temperature_2m",
                                                        "apparent_temperature",
                                                        "weather_code",
                                                        "wind_speed_10m",
                                                        "wind_gusts_10m",
                                                        "snowfall",
                                                        "is_day"
                                                )
                                        )
                                        .queryParam(
                                                "daily",
                                                String.join(
                                                        ",",
                                                        "temperature_2m_max",
                                                        "temperature_2m_min",
                                                        "precipitation_probability_max"
                                                )
                                        )
                                        .queryParam(
                                                "timezone",
                                                "auto"
                                        )
                                        .queryParam(
                                                "forecast_days",
                                                1
                                        )
                                        .build()
                        )
                        .retrieve()
                        .body(
                                String.class
                        );

        if (
                respostaJson == null ||
                respostaJson.isBlank()
        ) {
            throw new RuntimeException(
                    "Open-Meteo retornou resposta vazia."
            );
        }

        String respostaLimpa =
                respostaJson.trim();

        if (
                !respostaLimpa.startsWith(
                        "{"
                )
        ) {
            throw new RuntimeException(
                    "Open-Meteo retornou resposta inválida: "
                            + respostaLimpa
            );
        }

        try {

            Map<?, ?> resposta =
                    objectMapper.readValue(
                            respostaLimpa,
                            Map.class
                    );

            Object currentObj =
                    resposta.get(
                            "current"
                    );

            Object dailyObj =
                    resposta.get(
                            "daily"
                    );

            if (
                    !(currentObj
                            instanceof Map<?, ?> current)
            ) {
                throw new RuntimeException(
                        "Open-Meteo não retornou clima atual."
                );
            }

            Double temperatura =
                    obterDouble(
                            current,
                            "temperature_2m"
                    );

            Double sensacaoTermica =
                    obterDouble(
                            current,
                            "apparent_temperature"
                    );

            Double vento =
                    obterDouble(
                            current,
                            "wind_speed_10m"
                    );

            Double rajadas =
                    obterDouble(
                            current,
                            "wind_gusts_10m"
                    );

            Double neve =
                    obterDouble(
                            current,
                            "snowfall"
                    );

            Integer codigoClima =
                    obterInteger(
                            current,
                            "weather_code"
                    );

            Integer isDay =
                    obterInteger(
                            current,
                            "is_day"
                    );

            Double temperaturaMaxima =
                    null;

            Double temperaturaMinima =
                    null;

            Integer probabilidadeChuva =
                    null;

            if (
                    dailyObj
                            instanceof Map<?, ?> daily
            ) {

                temperaturaMaxima =
                        obterPrimeiroDouble(
                                daily,
                                "temperature_2m_max"
                        );

                temperaturaMinima =
                        obterPrimeiroDouble(
                                daily,
                                "temperature_2m_min"
                        );

                probabilidadeChuva =
                        obterPrimeiroInteger(
                                daily,
                                "precipitation_probability_max"
                        );
            }

            return new ClimaResponse(
                    temperatura,
                    sensacaoTermica,
                    temperaturaMaxima,
                    temperaturaMinima,
                    probabilidadeChuva,
                    vento,
                    rajadas,
                    neve,
                    codigoClima,
                    isDay
            );

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Erro ao processar resposta da Open-Meteo.",
                    e
            );
        }
    }

    // =========================================================
    // OPENWEATHER
    // =========================================================

    private ClimaResponse buscarClimaOpenWeather(
            double latitude,
            double longitude
    ) {

        /*
         * Primeiro buscamos o clima atual.
         */
        String respostaAtualJson =
                openWeatherClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                                "/data/2.5/weather"
                                        )
                                        .queryParam(
                                                "lat",
                                                latitude
                                        )
                                        .queryParam(
                                                "lon",
                                                longitude
                                        )
                                        .queryParam(
                                                "appid",
                                                openWeatherApiKey
                                        )
                                        .queryParam(
                                                "units",
                                                "metric"
                                        )
                                        .queryParam(
                                                "lang",
                                                "pt_br"
                                        )
                                        .build()
                        )
                        .retrieve()
                        .body(
                                String.class
                        );

        if (
                respostaAtualJson == null ||
                respostaAtualJson.isBlank()
        ) {
            throw new RuntimeException(
                    "OpenWeather retornou resposta vazia."
            );
        }

        try {

            Map<?, ?> respostaAtual =
                    objectMapper.readValue(
                            respostaAtualJson,
                            Map.class
                    );

            Object mainObj =
                    respostaAtual.get(
                            "main"
                    );

            Object windObj =
                    respostaAtual.get(
                            "wind"
                    );

            Object weatherObj =
                    respostaAtual.get(
                            "weather"
                    );

            Object sysObj =
                    respostaAtual.get(
                            "sys"
                    );

            if (
                    !(mainObj
                            instanceof Map<?, ?> main)
            ) {
                throw new RuntimeException(
                        "OpenWeather não retornou dados principais."
                );
            }

            Double temperatura =
                    obterDouble(
                            main,
                            "temp"
                    );

            Double sensacaoTermica =
                    obterDouble(
                            main,
                            "feels_like"
                    );

            /*
             * Esses valores servem como fallback.
             * Depois tentaremos obter mínima e máxima
             * melhores usando /forecast.
             */
            Double temperaturaMinima =
                    obterDouble(
                            main,
                            "temp_min"
                    );

            Double temperaturaMaxima =
                    obterDouble(
                            main,
                            "temp_max"
                    );

            Double vento =
                    null;

            Double rajadas =
                    null;

            if (
                    windObj
                            instanceof Map<?, ?> wind
            ) {

                Double ventoMs =
                        obterDouble(
                                wind,
                                "speed"
                        );

                Double rajadasMs =
                        obterDouble(
                                wind,
                                "gust"
                        );

                /*
                 * OpenWeather retorna m/s.
                 * O frontend da MAIA trabalha
                 * com km/h.
                 */
                if (
                        ventoMs != null
                ) {
                    vento =
                            ventoMs * 3.6;
                }

                if (
                        rajadasMs != null
                ) {
                    rajadas =
                            rajadasMs * 3.6;
                }
            }

            Integer codigoClima =
                    converterCodigoOpenWeather(
                            weatherObj
                    );

            Integer isDay =
                    calcularIsDayOpenWeather(
                            respostaAtual,
                            sysObj
                    );

            Double neve =
                    obterPrecipitacao(
                            respostaAtual,
                            "snow"
                    );

            Integer probabilidadeChuva =
                    null;

            /*
             * A propriedade timezone vem em
             * segundos de diferença em relação
             * ao UTC.
             */
            Integer timezoneOffset =
                    obterInteger(
                            respostaAtual,
                            "timezone"
                    );

            /*
             * Agora buscamos o forecast.
             *
             * É nele que existe o campo "pop",
             * que representa probabilidade real
             * de precipitação.
             */
            try {

                DadosPrevisaoOpenWeather previsao =
                        buscarPrevisaoOpenWeather(
                                latitude,
                                longitude,
                                timezoneOffset
                        );

                if (
                        previsao != null
                ) {

                    if (
                            previsao.probabilidadeChuva() != null
                    ) {
                        probabilidadeChuva =
                                previsao.probabilidadeChuva();
                    }

                    if (
                            previsao.temperaturaMinima() != null
                    ) {
                        temperaturaMinima =
                                previsao.temperaturaMinima();
                    }

                    if (
                            previsao.temperaturaMaxima() != null
                    ) {
                        temperaturaMaxima =
                                previsao.temperaturaMaxima();
                    }
                }

            } catch (RuntimeException e) {

                /*
                 * Se o forecast falhar,
                 * NÃO derrubamos o clima atual.
                 */
                System.out.println(
                        "Não foi possível obter previsão detalhada da OpenWeather: "
                                + e.getMessage()
                );
            }

            return new ClimaResponse(
                    temperatura,
                    sensacaoTermica,
                    temperaturaMaxima,
                    temperaturaMinima,
                    probabilidadeChuva,
                    vento,
                    rajadas,
                    neve,
                    codigoClima,
                    isDay
            );

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Erro ao processar resposta da OpenWeather.",
                    e
            );
        }
    }

    // =========================================================
    // FORECAST OPENWEATHER
    // =========================================================

    private DadosPrevisaoOpenWeather buscarPrevisaoOpenWeather(
            double latitude,
            double longitude,
            Integer timezoneOffset
    ) {

        String respostaJson =
                openWeatherClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                                "/data/2.5/forecast"
                                        )
                                        .queryParam(
                                                "lat",
                                                latitude
                                        )
                                        .queryParam(
                                                "lon",
                                                longitude
                                        )
                                        .queryParam(
                                                "appid",
                                                openWeatherApiKey
                                        )
                                        .queryParam(
                                                "units",
                                                "metric"
                                        )
                                        .queryParam(
                                                "lang",
                                                "pt_br"
                                        )
                                        .build()
                        )
                        .retrieve()
                        .body(
                                String.class
                        );

        if (
                respostaJson == null ||
                respostaJson.isBlank()
        ) {
            throw new RuntimeException(
                    "Forecast da OpenWeather retornou resposta vazia."
            );
        }

        try {

            Map<?, ?> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Object listaObj =
                    resposta.get(
                            "list"
                    );

            if (
                    !(listaObj
                            instanceof List<?> lista)
            ) {
                throw new RuntimeException(
                        "Forecast da OpenWeather não retornou lista de previsões."
                );
            }

            int offsetSegundos =
                    timezoneOffset != null
                            ? timezoneOffset
                            : 0;

            ZoneOffset zoneOffset =
                    ZoneOffset.ofTotalSeconds(
                            offsetSegundos
                    );

            /*
             * Dia atual no horário do destino.
             */
            LocalDate hojeDestino =
                    Instant.now()
                            .atOffset(
                                    zoneOffset
                            )
                            .toLocalDate();

            Double menorTemperatura =
                    null;

            Double maiorTemperatura =
                    null;

            Double maiorPop =
                    null;

            for (
                    Object itemObj :
                    lista
            ) {

                if (
                        !(itemObj
                                instanceof Map<?, ?> item)
                ) {
                    continue;
                }

                Integer timestamp =
                        obterInteger(
                                item,
                                "dt"
                        );

                if (
                        timestamp == null
                ) {
                    continue;
                }

                LocalDate dataLocal =
                        Instant
                                .ofEpochSecond(
                                        timestamp.longValue()
                                )
                                .atOffset(
                                        zoneOffset
                                )
                                .toLocalDate();

                /*
                 * Só usamos previsões do dia
                 * atual no destino.
                 */
                if (
                        !dataLocal.equals(
                                hojeDestino
                        )
                ) {
                    continue;
                }

                Object mainObj =
                        item.get(
                                "main"
                        );

                if (
                        mainObj
                                instanceof Map<?, ?> main
                ) {

                    Double minima =
                            obterDouble(
                                    main,
                                    "temp_min"
                            );

                    Double maxima =
                            obterDouble(
                                    main,
                                    "temp_max"
                            );

                    if (
                            minima != null
                    ) {

                        if (
                                menorTemperatura == null ||
                                minima < menorTemperatura
                        ) {
                            menorTemperatura =
                                    minima;
                        }
                    }

                    if (
                            maxima != null
                    ) {

                        if (
                                maiorTemperatura == null ||
                                maxima > maiorTemperatura
                        ) {
                            maiorTemperatura =
                                    maxima;
                        }
                    }
                }

                /*
                 * POP = Probability Of Precipitation.
                 *
                 * O valor vem entre 0 e 1.
                 *
                 * Exemplo:
                 * 0.67 = 67%
                 */
                Double pop =
                        obterDouble(
                                item,
                                "pop"
                        );

                if (
                        pop != null
                ) {

                    if (
                            maiorPop == null ||
                            pop > maiorPop
                    ) {
                        maiorPop =
                                pop;
                    }
                }
            }

            Integer probabilidadeChuva =
                    null;

            if (
                    maiorPop != null
            ) {

                probabilidadeChuva =
                        (int) Math.round(
                                maiorPop * 100
                        );

                /*
                 * Proteção extra para nunca
                 * sair do intervalo 0–100.
                 */
                probabilidadeChuva =
                        Math.max(
                                0,
                                Math.min(
                                        100,
                                        probabilidadeChuva
                                )
                        );
            }

            return new DadosPrevisaoOpenWeather(
                    menorTemperatura,
                    maiorTemperatura,
                    probabilidadeChuva
            );

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Erro ao processar forecast da OpenWeather.",
                    e
            );
        }
    }

    // =========================================================
    // CONVERSÃO DE CÓDIGOS
    // =========================================================

    private Integer converterCodigoOpenWeather(
            Object weatherObj
    ) {

        if (
                !(weatherObj
                        instanceof List<?> weatherList)
                ||
                weatherList.isEmpty()
        ) {
            return 3;
        }

        Object primeiro =
                weatherList.get(
                        0
                );

        if (
                !(primeiro
                        instanceof Map<?, ?> weather)
        ) {
            return 3;
        }

        Integer id =
                obterInteger(
                        weather,
                        "id"
                );

        if (
                id == null
        ) {
            return 3;
        }

        /*
         * Conversão aproximada dos códigos
         * OpenWeather para códigos WMO
         * utilizados pelo frontend.
         */

        if (
                id >= 200 &&
                id < 300
        ) {
            return 95;
        }

        if (
                id >= 300 &&
                id < 400
        ) {
            return 53;
        }

        if (
                id >= 500 &&
                id < 600
        ) {
            return 61;
        }

        if (
                id >= 600 &&
                id < 700
        ) {
            return 71;
        }

        if (
                id >= 700 &&
                id < 800
        ) {
            return 45;
        }

        if (
                id == 800
        ) {
            return 0;
        }

        if (
                id == 801 ||
                id == 802
        ) {
            return 2;
        }

        if (
                id >= 803 &&
                id <= 804
        ) {
            return 3;
        }

        return 3;
    }

    // =========================================================
    // DIA / NOITE
    // =========================================================

    private Integer calcularIsDayOpenWeather(
            Map<?, ?> resposta,
            Object sysObj
    ) {

        Integer agora =
                obterInteger(
                        resposta,
                        "dt"
                );

        if (
                agora == null ||
                !(sysObj
                        instanceof Map<?, ?> sys)
        ) {
            return null;
        }

        Integer nascerSol =
                obterInteger(
                        sys,
                        "sunrise"
                );

        Integer porSol =
                obterInteger(
                        sys,
                        "sunset"
                );

        if (
                nascerSol == null ||
                porSol == null
        ) {
            return null;
        }

        return (
                agora >= nascerSol &&
                agora < porSol
        )
                ? 1
                : 0;
    }

    // =========================================================
    // PRECIPITAÇÃO
    // =========================================================

    private Double obterPrecipitacao(
            Map<?, ?> resposta,
            String chave
    ) {

        Object precipitacaoObj =
                resposta.get(
                        chave
                );

        if (
                !(precipitacaoObj
                        instanceof Map<?, ?> precipitacao)
        ) {
            return 0.0;
        }

        Double ultimaHora =
                obterDouble(
                        precipitacao,
                        "1h"
                );

        if (
                ultimaHora != null
        ) {
            return ultimaHora;
        }

        Double ultimasTresHoras =
                obterDouble(
                        precipitacao,
                        "3h"
                );

        if (
                ultimasTresHoras != null
        ) {
            return ultimasTresHoras;
        }

        return 0.0;
    }

    // =========================================================
    // HELPERS JSON
    // =========================================================

    private Double obterDouble(
            Map<?, ?> mapa,
            String chave
    ) {

        Object valor =
                mapa.get(
                        chave
                );

        if (
                valor instanceof Number numero
        ) {
            return numero.doubleValue();
        }

        return null;
    }

    private Integer obterInteger(
            Map<?, ?> mapa,
            String chave
    ) {

        Object valor =
                mapa.get(
                        chave
                );

        if (
                valor instanceof Number numero
        ) {
            return numero.intValue();
        }

        return null;
    }

    private Double obterPrimeiroDouble(
            Map<?, ?> mapa,
            String chave
    ) {

        Object valor =
                mapa.get(
                        chave
                );

        if (
                valor instanceof List<?> lista &&
                !lista.isEmpty()
        ) {

            Object primeiro =
                    lista.get(
                            0
                    );

            if (
                    primeiro instanceof Number numero
            ) {
                return numero.doubleValue();
            }
        }

        return null;
    }

    private Integer obterPrimeiroInteger(
            Map<?, ?> mapa,
            String chave
    ) {

        Object valor =
                mapa.get(
                        chave
                );

        if (
                valor instanceof List<?> lista &&
                !lista.isEmpty()
        ) {

            Object primeiro =
                    lista.get(
                            0
                    );

            if (
                    primeiro instanceof Number numero
            ) {
                return numero.intValue();
            }
        }

        return null;
    }

    // =========================================================
    // DADOS INTERNOS DO FORECAST
    // =========================================================

    private record DadosPrevisaoOpenWeather(
            Double temperaturaMinima,
            Double temperaturaMaxima,
            Integer probabilidadeChuva
    ) {
    }
}