package com.maia.backend.geocoding;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.ObjectMapper;

@Service
public class GeoapifyService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${geoapify.api.key}")
    private String apiKey;

    public GeoapifyService(
            ObjectMapper objectMapper
    ) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.geoapify.com")
                .build();

        this.objectMapper =
                objectMapper;
    }

    public GeocodingResponse buscarLocalizacao(
            String texto
    ) {

        if (
                texto == null ||
                texto.isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Localização não informada."
            );
        }

        String respostaJson = restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/geocode/search")
                        .queryParam(
                                "text",
                                texto
                        )
                        .queryParam(
                                "format",
                                "json"
                        )
                        .queryParam(
                                "limit",
                                1
                        )
                        .queryParam(
                                "lang",
                                "pt"
                        )
                        .queryParam(
                                "apiKey",
                                apiKey
                        )
                        .build()
                )
                .retrieve()
                .body(String.class);

        if (
                respostaJson == null ||
                respostaJson.isBlank()
        ) {
            throw new RuntimeException(
                    "A Geoapify não retornou dados."
            );
        }

        try {

            Map<String, Object> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Object resultsObj =
                    resposta.get("results");

            if (
                    !(resultsObj
                            instanceof List<?> results)
            ) {
                throw new RuntimeException(
                        "Resposta inválida da Geoapify."
                );
            }

            if (results.isEmpty()) {
                throw new RuntimeException(
                        "Localização não encontrada."
                );
            }

            Object primeiroObj =
                    results.get(0);

            if (
                    !(primeiroObj
                            instanceof Map<?, ?> resultado)
            ) {
                throw new RuntimeException(
                        "Resultado inválido da Geoapify."
                );
            }

            Object latitudeObj =
                    resultado.get("lat");

            Object longitudeObj =
                    resultado.get("lon");

            if (
                    !(latitudeObj instanceof Number) ||
                    !(longitudeObj instanceof Number)
            ) {
                throw new RuntimeException(
                        "Coordenadas não encontradas."
                );
            }

            Double latitude =
                    ((Number) latitudeObj)
                            .doubleValue();

            Double longitude =
                    ((Number) longitudeObj)
                            .doubleValue();

            String nome =
                    resultado.get("formatted") != null
                            ? resultado
                                    .get("formatted")
                                    .toString()
                            : texto;

            return new GeocodingResponse(
                    nome,
                    latitude,
                    longitude
            );

        } catch (RuntimeException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Erro ao processar geocodificação.",
                    e
            );
        }
    }
}