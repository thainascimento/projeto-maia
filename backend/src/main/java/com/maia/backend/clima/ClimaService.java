package com.maia.backend.clima;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.ObjectMapper;

@Service
public class ClimaService {

    private static final int HORAS_OPEN_METEO = 12;
    private static final int ITENS_OPEN_WEATHER = 8;

    private final RestClient openMeteoClient;
    private final RestClient openWeatherClient;
    private final ObjectMapper objectMapper;

    @Value("${openweather.api.key}")
    private String openWeatherApiKey;

    public ClimaService(ObjectMapper objectMapper) {
        this.openMeteoClient = RestClient.builder()
                .baseUrl("https://api.open-meteo.com")
                .requestFactory(criarRequestFactory())
                .build();

        this.openWeatherClient = RestClient.builder()
                .baseUrl("https://api.openweathermap.org")
                .requestFactory(criarRequestFactory())
                .build();

        this.objectMapper = objectMapper;
    }

    private SimpleClientHttpRequestFactory criarRequestFactory() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(3000);
        requestFactory.setReadTimeout(5000);
        return requestFactory;
    }

    public ClimaResponse buscarClima(double latitude, double longitude) {
        try {
            System.out.println("Tentando obter clima pela Open-Meteo...");
            ClimaResponse clima = buscarClimaOpenMeteo(latitude, longitude);
            System.out.println("Clima obtido pela Open-Meteo.");
            return clima;
        } catch (RuntimeException e) {
            System.out.println("Open-Meteo falhou: " + e.getMessage());
            System.out.println("Tentando fallback pela OpenWeather...");
            ClimaResponse clima = buscarClimaOpenWeather(latitude, longitude);
            System.out.println("Clima obtido pela OpenWeather.");
            return clima;
        }
    }

    private ClimaResponse buscarClimaOpenMeteo(double latitude, double longitude) {
        String respostaJson = openMeteoClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/forecast")
                        .queryParam("latitude", latitude)
                        .queryParam("longitude", longitude)
                        .queryParam("current", String.join(",",
                                "temperature_2m",
                                "apparent_temperature",
                                "weather_code",
                                "wind_speed_10m",
                                "wind_gusts_10m",
                                "snowfall",
                                "is_day"))
                        .queryParam("hourly", String.join(",",
                                "temperature_2m",
                                "apparent_temperature",
                                "precipitation_probability",
                                "weather_code",
                                "wind_speed_10m",
                                "wind_gusts_10m"))
                        .queryParam("daily", String.join(",",
                                "temperature_2m_max",
                                "temperature_2m_min",
                                "precipitation_probability_max"))
                        .queryParam("timezone", "auto")
                        .queryParam("forecast_days", 2)
                        .build())
                .retrieve()
                .body(String.class);

        if (respostaJson == null || respostaJson.isBlank()) {
            throw new RuntimeException("Open-Meteo retornou resposta vazia.");
        }

        try {
            Map<?, ?> resposta = objectMapper.readValue(respostaJson.trim(), Map.class);
            Object currentObj = resposta.get("current");
            Object dailyObj = resposta.get("daily");
            Object hourlyObj = resposta.get("hourly");

            if (!(currentObj instanceof Map<?, ?> current)) {
                throw new RuntimeException("Open-Meteo não retornou clima atual.");
            }

            Double temperatura = obterDouble(current, "temperature_2m");
            Double sensacaoTermica = obterDouble(current, "apparent_temperature");
            Double vento = obterDouble(current, "wind_speed_10m");
            Double rajadas = obterDouble(current, "wind_gusts_10m");
            Double neve = obterDouble(current, "snowfall");
            Integer codigoClima = obterInteger(current, "weather_code");
            Integer isDay = obterInteger(current, "is_day");

            Double temperaturaMaxima = null;
            Double temperaturaMinima = null;
            Integer probabilidadeChuva = null;

            if (dailyObj instanceof Map<?, ?> daily) {
                temperaturaMaxima = obterPrimeiroDouble(daily, "temperature_2m_max");
                temperaturaMinima = obterPrimeiroDouble(daily, "temperature_2m_min");
                probabilidadeChuva = obterPrimeiroInteger(daily, "precipitation_probability_max");
            }

            String timezone = obterString(resposta, "timezone");
            Integer utcOffsetSegundos = obterInteger(resposta, "utc_offset_seconds");
            LocalDateTime agoraLocal = obterDataHoraAtualOpenMeteo(current, utcOffsetSegundos);

            List<ClimaResponse.PrevisaoHora> previsao =
                    montarPrevisaoHorariaOpenMeteo(hourlyObj, agoraLocal);

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
                    isDay,
                    timezone,
                    utcOffsetSegundos,
                    agoraLocal != null ? agoraLocal.toString() : null,
                    identificarPeriodoDoDia(agoraLocal),
                    previsao
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar resposta da Open-Meteo.", e);
        }
    }

    private LocalDateTime obterDataHoraAtualOpenMeteo(
            Map<?, ?> current,
            Integer utcOffsetSegundos
    ) {
        String horarioAtual = obterString(current, "time");

        if (horarioAtual != null) {
            try {
                return LocalDateTime.parse(horarioAtual);
            } catch (DateTimeParseException ignored) {
            }
        }

        if (utcOffsetSegundos != null) {
            return Instant.now()
                    .atOffset(ZoneOffset.ofTotalSeconds(utcOffsetSegundos))
                    .toLocalDateTime();
        }

        return null;
    }

    private List<ClimaResponse.PrevisaoHora> montarPrevisaoHorariaOpenMeteo(
            Object hourlyObj,
            LocalDateTime agoraLocal
    ) {
        List<ClimaResponse.PrevisaoHora> previsoes = new ArrayList<>();

        if (!(hourlyObj instanceof Map<?, ?> hourly) || agoraLocal == null) {
            return previsoes;
        }

        List<?> horarios = obterLista(hourly, "time");
        List<?> temperaturas = obterLista(hourly, "temperature_2m");
        List<?> sensacoes = obterLista(hourly, "apparent_temperature");
        List<?> pops = obterLista(hourly, "precipitation_probability");
        List<?> codigos = obterLista(hourly, "weather_code");
        List<?> ventos = obterLista(hourly, "wind_speed_10m");
        List<?> rajadas = obterLista(hourly, "wind_gusts_10m");

        if (horarios == null) {
            return previsoes;
        }

        for (int i = 0; i < horarios.size() && previsoes.size() < HORAS_OPEN_METEO; i++) {
            Object horarioObj = horarios.get(i);
            if (!(horarioObj instanceof String horarioTexto)) {
                continue;
            }

            LocalDateTime horario;
            try {
                horario = LocalDateTime.parse(horarioTexto);
            } catch (DateTimeParseException e) {
                continue;
            }

            if (!horario.isAfter(agoraLocal)) {
                continue;
            }

            previsoes.add(new ClimaResponse.PrevisaoHora(
                    horario.toString(),
                    obterDoubleNaLista(temperaturas, i),
                    obterDoubleNaLista(sensacoes, i),
                    obterIntegerNaLista(pops, i),
                    obterDoubleNaLista(ventos, i),
                    obterDoubleNaLista(rajadas, i),
                    obterIntegerNaLista(codigos, i)
            ));
        }

        return previsoes;
    }

    private ClimaResponse buscarClimaOpenWeather(double latitude, double longitude) {
        String respostaAtualJson = openWeatherClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/data/2.5/weather")
                        .queryParam("lat", latitude)
                        .queryParam("lon", longitude)
                        .queryParam("appid", openWeatherApiKey)
                        .queryParam("units", "metric")
                        .queryParam("lang", "pt_br")
                        .build())
                .retrieve()
                .body(String.class);

        if (respostaAtualJson == null || respostaAtualJson.isBlank()) {
            throw new RuntimeException("OpenWeather retornou resposta vazia.");
        }

        try {
            Map<?, ?> respostaAtual = objectMapper.readValue(respostaAtualJson, Map.class);
            Object mainObj = respostaAtual.get("main");
            Object windObj = respostaAtual.get("wind");
            Object weatherObj = respostaAtual.get("weather");
            Object sysObj = respostaAtual.get("sys");

            if (!(mainObj instanceof Map<?, ?> main)) {
                throw new RuntimeException("OpenWeather não retornou dados principais.");
            }

            Double temperatura = obterDouble(main, "temp");
            Double sensacaoTermica = obterDouble(main, "feels_like");
            Double temperaturaMinima = obterDouble(main, "temp_min");
            Double temperaturaMaxima = obterDouble(main, "temp_max");

            Double vento = null;
            Double rajadas = null;
            if (windObj instanceof Map<?, ?> wind) {
                Double ventoMs = obterDouble(wind, "speed");
                Double rajadasMs = obterDouble(wind, "gust");
                if (ventoMs != null) vento = ventoMs * 3.6;
                if (rajadasMs != null) rajadas = rajadasMs * 3.6;
            }

            Integer codigoClima = converterCodigoOpenWeather(weatherObj);
            Integer isDay = calcularIsDayOpenWeather(respostaAtual, sysObj);
            Double neve = obterPrecipitacao(respostaAtual, "snow");
            Integer timezoneOffset = obterInteger(respostaAtual, "timezone");
            Integer timestampAtual = obterInteger(respostaAtual, "dt");
            LocalDateTime agoraLocal = converterTimestampParaHorarioLocal(timestampAtual, timezoneOffset);

            Integer probabilidadeChuva = null;
            List<ClimaResponse.PrevisaoHora> previsaoProximasHoras = new ArrayList<>();

            try {
                DadosPrevisaoOpenWeather previsao = buscarPrevisaoOpenWeather(
                        latitude,
                        longitude,
                        timezoneOffset,
                        agoraLocal
                );

                if (previsao != null) {
                    if (previsao.probabilidadeChuva() != null) {
                        probabilidadeChuva = previsao.probabilidadeChuva();
                    }
                    if (previsao.temperaturaMinima() != null) {
                        temperaturaMinima = previsao.temperaturaMinima();
                    }
                    if (previsao.temperaturaMaxima() != null) {
                        temperaturaMaxima = previsao.temperaturaMaxima();
                    }
                    previsaoProximasHoras = previsao.previsaoProximasHoras();
                }
            } catch (RuntimeException e) {
                System.out.println("Não foi possível obter previsão detalhada da OpenWeather: " + e.getMessage());
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
                    isDay,
                    formatarTimezoneOffset(timezoneOffset),
                    timezoneOffset,
                    agoraLocal != null ? agoraLocal.toString() : null,
                    identificarPeriodoDoDia(agoraLocal),
                    previsaoProximasHoras
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar resposta da OpenWeather.", e);
        }
    }

    private DadosPrevisaoOpenWeather buscarPrevisaoOpenWeather(
            double latitude,
            double longitude,
            Integer timezoneOffset,
            LocalDateTime agoraLocal
    ) {
        String respostaJson = openWeatherClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/data/2.5/forecast")
                        .queryParam("lat", latitude)
                        .queryParam("lon", longitude)
                        .queryParam("appid", openWeatherApiKey)
                        .queryParam("units", "metric")
                        .queryParam("lang", "pt_br")
                        .build())
                .retrieve()
                .body(String.class);

        if (respostaJson == null || respostaJson.isBlank()) {
            throw new RuntimeException("Forecast da OpenWeather retornou resposta vazia.");
        }

        try {
            Map<?, ?> resposta = objectMapper.readValue(respostaJson, Map.class);
            Object listaObj = resposta.get("list");
            if (!(listaObj instanceof List<?> lista)) {
                throw new RuntimeException("Forecast da OpenWeather não retornou lista de previsões.");
            }

            int offsetSegundos = timezoneOffset != null ? timezoneOffset : 0;
            ZoneOffset zoneOffset = ZoneOffset.ofTotalSeconds(offsetSegundos);
            LocalDateTime referenciaLocal = agoraLocal != null
                    ? agoraLocal
                    : Instant.now().atOffset(zoneOffset).toLocalDateTime();
            LocalDate hojeDestino = referenciaLocal.toLocalDate();

            Double menorTemperatura = null;
            Double maiorTemperatura = null;
            Double maiorPop = null;
            List<ClimaResponse.PrevisaoHora> previsaoProximasHoras = new ArrayList<>();

            for (Object itemObj : lista) {
                if (!(itemObj instanceof Map<?, ?> item)) {
                    continue;
                }

                Integer timestamp = obterInteger(item, "dt");
                if (timestamp == null) {
                    continue;
                }

                LocalDateTime dataHoraLocal = Instant.ofEpochSecond(timestamp.longValue())
                        .atOffset(zoneOffset)
                        .toLocalDateTime();

                if (dataHoraLocal.toLocalDate().equals(hojeDestino)) {
                    Object itemMainObj = item.get("main");
                    if (itemMainObj instanceof Map<?, ?> itemMain) {
                        Double minima = obterDouble(itemMain, "temp_min");
                        Double maxima = obterDouble(itemMain, "temp_max");

                        if (minima != null && (menorTemperatura == null || minima < menorTemperatura)) {
                            menorTemperatura = minima;
                        }
                        if (maxima != null && (maiorTemperatura == null || maxima > maiorTemperatura)) {
                            maiorTemperatura = maxima;
                        }
                    }

                    Double pop = obterDouble(item, "pop");
                    if (pop != null && (maiorPop == null || pop > maiorPop)) {
                        maiorPop = pop;
                    }
                }

                if (dataHoraLocal.isAfter(referenciaLocal)
                        && previsaoProximasHoras.size() < ITENS_OPEN_WEATHER) {
                    Object itemMainObj = item.get("main");
                    Object itemWindObj = item.get("wind");

                    Double temp = null;
                    Double sensacao = null;
                    Double vento = null;
                    Double rajadas = null;

                    if (itemMainObj instanceof Map<?, ?> itemMain) {
                        temp = obterDouble(itemMain, "temp");
                        sensacao = obterDouble(itemMain, "feels_like");
                    }

                    if (itemWindObj instanceof Map<?, ?> itemWind) {
                        Double ventoMs = obterDouble(itemWind, "speed");
                        Double rajadasMs = obterDouble(itemWind, "gust");
                        if (ventoMs != null) vento = ventoMs * 3.6;
                        if (rajadasMs != null) rajadas = rajadasMs * 3.6;
                    }

                    Double pop = obterDouble(item, "pop");
                    Integer popPercentual = pop != null
                            ? limitarPercentual((int) Math.round(pop * 100))
                            : null;

                    previsaoProximasHoras.add(new ClimaResponse.PrevisaoHora(
                            dataHoraLocal.toString(),
                            temp,
                            sensacao,
                            popPercentual,
                            vento,
                            rajadas,
                            converterCodigoOpenWeather(item.get("weather"))
                    ));
                }
            }

            Integer probabilidadeChuva = maiorPop != null
                    ? limitarPercentual((int) Math.round(maiorPop * 100))
                    : null;

            return new DadosPrevisaoOpenWeather(
                    menorTemperatura,
                    maiorTemperatura,
                    probabilidadeChuva,
                    previsaoProximasHoras
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar forecast da OpenWeather.", e);
        }
    }

    private Integer converterCodigoOpenWeather(Object weatherObj) {
        if (!(weatherObj instanceof List<?> weatherList) || weatherList.isEmpty()) {
            return 3;
        }

        Object primeiro = weatherList.get(0);
        if (!(primeiro instanceof Map<?, ?> weather)) {
            return 3;
        }

        Integer id = obterInteger(weather, "id");
        if (id == null) return 3;
        if (id >= 200 && id < 300) return 95;
        if (id >= 300 && id < 400) return 53;
        if (id >= 500 && id < 600) return 61;
        if (id >= 600 && id < 700) return 71;
        if (id >= 700 && id < 800) return 45;
        if (id == 800) return 0;
        if (id == 801 || id == 802) return 2;
        if (id >= 803 && id <= 804) return 3;
        return 3;
    }

    private Integer calcularIsDayOpenWeather(Map<?, ?> resposta, Object sysObj) {
        Integer agora = obterInteger(resposta, "dt");
        if (agora == null || !(sysObj instanceof Map<?, ?> sys)) {
            return null;
        }

        Integer nascerSol = obterInteger(sys, "sunrise");
        Integer porSol = obterInteger(sys, "sunset");
        if (nascerSol == null || porSol == null) {
            return null;
        }

        return agora >= nascerSol && agora < porSol ? 1 : 0;
    }

    private Double obterPrecipitacao(Map<?, ?> resposta, String chave) {
        Object precipitacaoObj = resposta.get(chave);
        if (!(precipitacaoObj instanceof Map<?, ?> precipitacao)) {
            return 0.0;
        }

        Double ultimaHora = obterDouble(precipitacao, "1h");
        if (ultimaHora != null) return ultimaHora;

        Double ultimasTresHoras = obterDouble(precipitacao, "3h");
        if (ultimasTresHoras != null) return ultimasTresHoras;

        return 0.0;
    }

    private LocalDateTime converterTimestampParaHorarioLocal(Integer timestamp, Integer utcOffsetSegundos) {
        if (timestamp == null) {
            return null;
        }
        int offset = utcOffsetSegundos != null ? utcOffsetSegundos : 0;
        return Instant.ofEpochSecond(timestamp.longValue())
                .atOffset(ZoneOffset.ofTotalSeconds(offset))
                .toLocalDateTime();
    }

    private String identificarPeriodoDoDia(LocalDateTime dataHora) {
        if (dataHora == null) return null;
        int hora = dataHora.getHour();
        if (hora >= 5 && hora < 12) return "MANHA";
        if (hora >= 12 && hora < 18) return "TARDE";
        return "NOITE";
    }

    private String formatarTimezoneOffset(Integer offsetSegundos) {
        if (offsetSegundos == null) return null;
        ZoneOffset offset = ZoneOffset.ofTotalSeconds(offsetSegundos);
        return "UTC" + offset.getId();
    }

    private Double obterDouble(Map<?, ?> mapa, String chave) {
        Object valor = mapa.get(chave);
        return valor instanceof Number numero ? numero.doubleValue() : null;
    }

    private Integer obterInteger(Map<?, ?> mapa, String chave) {
        Object valor = mapa.get(chave);
        return valor instanceof Number numero ? numero.intValue() : null;
    }

    private String obterString(Map<?, ?> mapa, String chave) {
        Object valor = mapa.get(chave);
        return valor instanceof String texto && !texto.isBlank() ? texto : null;
    }

    private List<?> obterLista(Map<?, ?> mapa, String chave) {
        Object valor = mapa.get(chave);
        return valor instanceof List<?> lista ? lista : null;
    }

    private Double obterPrimeiroDouble(Map<?, ?> mapa, String chave) {
        return obterDoubleNaLista(obterLista(mapa, chave), 0);
    }

    private Integer obterPrimeiroInteger(Map<?, ?> mapa, String chave) {
        return obterIntegerNaLista(obterLista(mapa, chave), 0);
    }

    private Double obterDoubleNaLista(List<?> lista, int indice) {
        if (lista == null || indice < 0 || indice >= lista.size()) return null;
        Object valor = lista.get(indice);
        return valor instanceof Number numero ? numero.doubleValue() : null;
    }

    private Integer obterIntegerNaLista(List<?> lista, int indice) {
        if (lista == null || indice < 0 || indice >= lista.size()) return null;
        Object valor = lista.get(indice);
        return valor instanceof Number numero ? numero.intValue() : null;
    }

    private int limitarPercentual(int valor) {
        return Math.max(0, Math.min(100, valor));
    }

    private record DadosPrevisaoOpenWeather(
            Double temperaturaMinima,
            Double temperaturaMaxima,
            Integer probabilidadeChuva,
            List<ClimaResponse.PrevisaoHora> previsaoProximasHoras
    ) {
    }
}
