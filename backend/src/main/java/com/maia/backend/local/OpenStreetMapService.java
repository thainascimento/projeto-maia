package com.maia.backend.local;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OpenStreetMapService {

    private final RestClient restClient;

    public OpenStreetMapService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://overpass-api.de/api")
                .build();
    }

    public List<LocalResponse> buscarLocais(
            double latitude,
            double longitude,
            String categoria
    ) {

        String query = montarQuery(
                latitude,
                longitude,
                categoria
        );

        OverpassResponse resposta = restClient
                .post()
                .uri("/interpreter")
                .header(
                        "Content-Type",
                        "application/x-www-form-urlencoded"
                )
                .body("data=" + query)
                .retrieve()
                .body(OverpassResponse.class);

        List<LocalResponse> locais =
                new ArrayList<>();

        if (
                resposta == null ||
                resposta.elements == null
        ) {
            return locais;
        }

        for (
                OverpassElement elemento :
                resposta.elements
        ) {

            if (elemento.tags == null) {
                continue;
            }

            String nome =
                    elemento.tags.name;

            // Não mostra lugares sem nome.
            if (
                    nome == null ||
                    nome.isBlank()
            ) {
                continue;
            }

            double lat;
            double lon;

            // Nodes possuem coordenadas diretamente.
            if (
                    elemento.lat != null &&
                    elemento.lon != null
            ) {

                lat = elemento.lat;
                lon = elemento.lon;

            // Ways e relations retornam o centro.
            } else if (
                    elemento.center != null
            ) {

                lat = elemento.center.lat;
                lon = elemento.center.lon;

            } else {
                continue;
            }

            String endereco =
                    montarEndereco(
                            elemento.tags
                    );

            locais.add(
                    new LocalResponse(
                            elemento.type
                                    + "-"
                                    + elemento.id,
                            nome,
                            categoria,
                            lat,
                            lon,
                            endereco
                    )
            );
        }

        return locais;
    }

    private String montarQuery(
            double latitude,
            double longitude,
            String categoria
    ) {

        List<String> filtros =
                obterFiltros(categoria);

        StringBuilder elementos =
                new StringBuilder();

        for (String filtro : filtros) {

            elementos.append(
                    String.format(
                            "node%s(around:3000,%s,%s);%n",
                            filtro,
                            latitude,
                            longitude
                    )
            );

            elementos.append(
                    String.format(
                            "way%s(around:3000,%s,%s);%n",
                            filtro,
                            latitude,
                            longitude
                    )
            );

            elementos.append(
                    String.format(
                            "relation%s(around:3000,%s,%s);%n",
                            filtro,
                            latitude,
                            longitude
                    )
            );
        }

        return """
                [out:json][timeout:25];
                (
                %s
                );
                out center;
                """.formatted(
                elementos.toString()
        );
    }

    private List<String> obterFiltros(
            String categoria
    ) {

        return switch (
                categoria.toLowerCase()
        ) {

            case "cafe",
                 "cafes",
                 "café",
                 "cafés" ->
                    List.of(
                            "[\"amenity\"=\"cafe\"]"
                    );

            case "restaurante",
                 "restaurantes" ->
                    List.of(
                            "[\"amenity\"=\"restaurant\"]"
                    );

            case "sorveteria",
                 "sorveterias",
                 "sorvete" ->
                    List.of(
                            "[\"amenity\"=\"ice_cream\"]",
                            "[\"shop\"=\"ice_cream\"]"
                    );

            case "bar",
                 "bares" ->
                    List.of(
                            "[\"amenity\"=\"bar\"]",
                            "[\"amenity\"=\"pub\"]"
                    );

            case "supermercado",
                 "supermercados",
                 "mercado",
                 "mercados" ->
                    List.of(
                            "[\"shop\"=\"supermarket\"]"
                    );

            case "farmacia",
                 "farmacias",
                 "farmácia",
                 "farmácias" ->
                    List.of(
                            "[\"amenity\"=\"pharmacy\"]"
                    );

            case "praia",
                 "praias" ->
                    List.of(
                            "[\"natural\"=\"beach\"]"
                    );

            default ->
                    List.of(
                            "[\"amenity\"]"
                    );
        };
    }

    private String montarEndereco(
            OverpassTags tags
    ) {

        List<String> partes =
                new ArrayList<>();

        if (
                tags.addr_street != null &&
                !tags.addr_street.isBlank()
        ) {

            if (
                    tags.addr_housenumber != null &&
                    !tags.addr_housenumber.isBlank()
            ) {

                partes.add(
                        tags.addr_street
                                + ", "
                                + tags.addr_housenumber
                );

            } else {

                partes.add(
                        tags.addr_street
                );
            }
        }

        if (
                tags.addr_suburb != null &&
                !tags.addr_suburb.isBlank()
        ) {
            partes.add(
                    tags.addr_suburb
            );
        }

        if (
                tags.addr_city != null &&
                !tags.addr_city.isBlank()
        ) {
            partes.add(
                    tags.addr_city
            );
        }

        if (
                tags.addr_state != null &&
                !tags.addr_state.isBlank()
        ) {
            partes.add(
                    tags.addr_state
            );
        }

        if (
                tags.addr_postcode != null &&
                !tags.addr_postcode.isBlank()
        ) {
            partes.add(
                    tags.addr_postcode
            );
        }

        if (partes.isEmpty()) {
            return "Endereço não disponível";
        }

        return String.join(
                " - ",
                partes
        );
    }
}       