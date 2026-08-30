package com.maia.backend.geocoding;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.maia.backend.local.LocalResponse;

import tools.jackson.databind.ObjectMapper;

@Service
public class GeoapifyPlacesService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${geoapify.api.key}")
    private String apiKey;

    public GeoapifyPlacesService(
            ObjectMapper objectMapper
    ) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.geoapify.com")
                .build();

        this.objectMapper = objectMapper;
    }

    public List<LocalResponse> buscarLocais(
            double latitude,
            double longitude,
            String categoria
    ) {

        String categoriaGeoapify =
                converterCategoria(categoria);

        String respostaJson = restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/places")
                        .queryParam(
                                "categories",
                                categoriaGeoapify
                        )
                        .queryParam(
                                "filter",
                                "circle:"
                                        + longitude
                                        + ","
                                        + latitude
                                        + ",3000"
                        )
                        .queryParam(
                                "bias",
                                "proximity:"
                                        + longitude
                                        + ","
                                        + latitude
                        )
                        .queryParam(
                                "limit",
                                50
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

        List<LocalResponse> locais =
                new ArrayList<>();

        if (
                respostaJson == null ||
                respostaJson.isBlank()
        ) {
            return locais;
        }

        try {

            Map<String, Object> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Object featuresObj =
                    resposta.get("features");

            if (!(featuresObj instanceof List<?> features)) {
                return locais;
            }

            for (Object featureObj : features) {

                if (!(featureObj instanceof Map<?, ?> feature)) {
                    continue;
                }

                Object propertiesObj =
                        feature.get("properties");

                Object geometryObj =
                        feature.get("geometry");

                if (
                        !(propertiesObj instanceof Map<?, ?> properties) ||
                        !(geometryObj instanceof Map<?, ?> geometry)
                ) {
                    continue;
                }

                Object nomeObj =
                        properties.get("name");

                if (nomeObj == null) {
                    continue;
                }

                String nome =
                        nomeObj.toString();

                if (nome.isBlank()) {
                    continue;
                }

                Object coordinatesObj =
                        geometry.get("coordinates");

                if (!(coordinatesObj instanceof List<?> coordinates)) {
                    continue;
                }

                if (coordinates.size() < 2) {
                    continue;
                }

                double lon =
                        ((Number) coordinates.get(0))
                                .doubleValue();

                double lat =
                        ((Number) coordinates.get(1))
                                .doubleValue();

                String endereco =
                        properties.get("formatted") != null
                                ? properties
                                        .get("formatted")
                                        .toString()
                                : "Endereço não disponível";

                String placeId =
                        properties.get("place_id") != null
                                ? properties
                                        .get("place_id")
                                        .toString()
                                : "geoapify-"
                                        + lat
                                        + "-"
                                        + lon;

                locais.add(
                        new LocalResponse(
                                placeId,
                                nome,
                                categoria,
                                lat,
                                lon,
                                endereco
                        )
                );
            }

        } catch (Exception e) {
            throw new RuntimeException(
                    "Erro ao processar resposta do Geoapify.",
                    e
            );
        }

        return locais;
    }

    private String converterCategoria(
            String categoria
    ) {

        return switch (
                categoria.toLowerCase()
        ) {

            case "cafe",
                 "cafes",
                 "café",
                 "cafés" ->
                    "catering.cafe";

            case "restaurante",
                 "restaurantes" ->
                    "catering.restaurant";

            case "sorveteria",
                 "sorveterias",
                 "sorvete" ->
                    "catering.ice_cream";

            case "bar",
                 "bares" ->
                    "catering.bar,catering.pub";

            case "supermercado",
                 "supermercados",
                 "mercado",
                 "mercados" ->
                    "commercial.supermarket";

            case "farmacia",
                 "farmacias",
                 "farmácia",
                 "farmácias" ->
                    "healthcare.pharmacy";

            case "praia",
                 "praias" ->
                    "natural.beach";

            default ->
                    "catering.cafe";
        };
    }
}