package com.maia.backend.geocoding;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class GeoapifyService {

    private final RestClient restClient;

    @Value("${geoapify.api.key}")
    private String apiKey;

    public GeoapifyService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.geoapify.com")
                .build();
    }

    public String buscarLocalizacao(String texto) {

        return restClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1/geocode/search")
                        .queryParam("text", texto)
                        .queryParam("format", "json")
                        .queryParam("apiKey", apiKey)
                        .build()
                )
                .retrieve()
                .body(String.class);
    }
}