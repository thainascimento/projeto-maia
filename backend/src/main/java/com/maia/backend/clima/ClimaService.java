package com.maia.backend.clima;

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

        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();

        requestFactory.setConnectTimeout(
                3000
        );

        requestFactory.setReadTimeout(
                5000
        );

        this.openMeteoClient =
                RestClient.builder()
                        .baseUrl(
                                "https://api.open-meteo.com"
                        )
                        .requestFactory(
                                requestFactory
                        )
                        .build();

        this.openWeatherClient =
                RestClient.builder()
                        .baseUrl(
                                "https://api.openweathermap.org"
                        )
                        .requestFactory(
                                requestFactory
                        )
                        .build();

        this.objectMapper =
                objectMapper;
    }

    public ClimaResponse buscarClima(
            double latitude,
            double longitude
    ) {

        try {

            System.out.println(
                    "Tentando obter clima pela Open-Meteo..."
            );

            return buscarClimaOpenMeteo(
                    latitude,
                    longitude
            );

        } catch (RuntimeException e) {

            System.out.println(
                    "Open-Meteo falhou: "
                            + e.getMessage()
            );

            System.out.println(
                    "Tentando fallback pela OpenWeather..."
            );

            return buscarClimaOpenWeather(
                    latitude,
                    longitude
            );
        }
    }

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

    private ClimaResponse buscarClimaOpenWeather(
            double latitude,
            double longitude
    ) {

        String respostaJson =
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
                respostaJson == null ||
                respostaJson.isBlank()
        ) {
            throw new RuntimeException(
                    "OpenWeather retornou resposta vazia."
            );
        }

        try {

            Map<?, ?> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Object mainObj =
                    resposta.get(
                            "main"
                    );

            Object windObj =
                    resposta.get(
                            "wind"
                    );

            Object cloudsObj =
                    resposta.get(
                            "clouds"
                    );

            Object weatherObj =
                    resposta.get(
                            "weather"
                    );

            Object sysObj =
                    resposta.get(
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
                            resposta,
                            sysObj
                    );

            Double neve =
                    obterPrecipitacao(
                            resposta,
                            "snow"
                    );

            Integer probabilidadeChuva =
                    null;

            if (
                    cloudsObj
                            instanceof Map<?, ?> clouds
            ) {

                Integer cobertura =
                        obterInteger(
                                clouds,
                                "all"
                        );

                if (
                        cobertura != null
                ) {
                    probabilidadeChuva =
                            cobertura;
                }
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
         * OpenWeather para códigos WMO usados
         * pelo frontend da MAIA.
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
}