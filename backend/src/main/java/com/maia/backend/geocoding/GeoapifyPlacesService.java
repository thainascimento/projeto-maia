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

    /*
     * Mantemos um raio razoável para ROLÊ!.
     * O ranking final é feito no IAController.
     */
    private static final int RAIO_BUSCA_METROS = 7000;

    /*
     * Buscamos mais candidatos e só depois escolhemos os
     * melhores. Antes o controller descartava resultados cedo.
     */
    private static final int LIMITE_RESULTADOS = 30;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${geoapify.api.key}")
    private String apiKey;

    public GeoapifyPlacesService(
            ObjectMapper objectMapper
    ) {

        this.restClient =
                RestClient.builder()
                        .baseUrl(
                                "https://api.geoapify.com"
                        )
                        .build();

        this.objectMapper =
                objectMapper;
    }

    // =========================================================
    // LOCAIS / ROLÊ!
    // =========================================================

    public List<LocalResponse> buscarLocais(
            double latitude,
            double longitude,
            String categoria
    ) {

        if (
                categoria == null ||
                categoria.isBlank()
        ) {
            return List.of();
        }

        String categoriaGeoapify =
                converterCategoria(
                        categoria
                );

        String respostaJson =
                restClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                                "/v2/places"
                                        )
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
                                                        + ","
                                                        + RAIO_BUSCA_METROS
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
                                                LIMITE_RESULTADOS
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
                        .body(
                                String.class
                        );

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
                    resposta.get(
                            "features"
                    );

            if (
                    !(featuresObj instanceof List<?> features)
            ) {
                return locais;
            }

            for (
                    Object featureObj :
                    features
            ) {

                if (
                        !(featureObj instanceof Map<?, ?> feature)
                ) {
                    continue;
                }

                Object propertiesObj =
                        feature.get(
                                "properties"
                        );

                Object geometryObj =
                        feature.get(
                                "geometry"
                        );

                if (
                        !(propertiesObj instanceof Map<?, ?> properties) ||
                        !(geometryObj instanceof Map<?, ?> geometry)
                ) {
                    continue;
                }

                String nome =
                        texto(
                                properties.get(
                                        "name"
                                )
                        );

                if (
                        nome == null ||
                        nome.isBlank()
                ) {
                    continue;
                }

                // =====================================================
                // LOG TEMPORÁRIO PARA DIAGNÓSTICO
                // =====================================================

                System.out.println();
                System.out.println(
                        "=========================================="
                );
                System.out.println(
                        "GEOAPIFY - LOCAL: " + nome
                );
                System.out.println(
                        "=========================================="
                );

                System.out.println(
                        objectMapper
                                .writerWithDefaultPrettyPrinter()
                                .writeValueAsString(
                                        properties
                                )
                );

                System.out.println(
                        "=========================================="
                );
                System.out.println();

                // =====================================================

                Object coordinatesObj =
                        geometry.get(
                                "coordinates"
                        );

                if (
                        !(coordinatesObj instanceof List<?> coordinates) ||
                        coordinates.size() < 2 ||
                        !(coordinates.get(0) instanceof Number) ||
                        !(coordinates.get(1) instanceof Number)
                ) {
                    continue;
                }

                double lon =
                        ((Number) coordinates.get(0))
                                .doubleValue();

                double lat =
                        ((Number) coordinates.get(1))
                                .doubleValue();

                String endereco =
                        primeiroTexto(
                                properties,
                                "formatted",
                                "address_line1"
                        );

                String bairro =
                        primeiroTexto(
                                properties,
                                "neighbourhood",
                                "suburb",
                                "district"
                        );

                String cidade =
                        primeiroTexto(
                                properties,
                                "city",
                                "municipality",
                                "county"
                        );

                String estado =
                        primeiroTexto(
                                properties,
                                "state"
                        );

                String pais =
                        primeiroTexto(
                                properties,
                                "country"
                        );

                String cep =
                        primeiroTexto(
                                properties,
                                "postcode"
                        );

                String placeId =
                        primeiroTexto(
                                properties,
                                "place_id"
                        );

                if (
                        placeId == null ||
                        placeId.isBlank()
                ) {
                    placeId =
                            "geoapify-"
                                    + lat
                                    + "-"
                                    + lon;
                }

                List<String> categoriasGeoapify =
                        extrairListaTexto(
                                properties.get(
                                        "categories"
                                )
                        );

                /*
                 * Geoapify pode fornecer distance quando há proximity bias.
                 * Quando não vier, calculamos nós mesmos.
                 */
                Double distanciaMetros =
                        numeroDouble(
                                properties.get(
                                        "distance"
                                )
                        );

                if (
                        distanciaMetros == null
                ) {
                    distanciaMetros =
                            calcularDistanciaMetros(
                                    latitude,
                                    longitude,
                                    lat,
                                    lon
                            );
                }

                /*
                 * Alguns campos detalhados podem não existir na resposta
                 * do Places. Nós só usamos se realmente vierem.
                 */
                String site =
                        primeiroTexto(
                                properties,
                                "website"
                        );

                String telefone =
                        null;

                Object contactObj =
                        properties.get(
                                "contact"
                        );

                if (
                        contactObj instanceof Map<?, ?> contact
                ) {
                    telefone =
                            primeiroTexto(
                                    contact,
                                    "phone"
                            );
                }

                String horarioFuncionamento =
                        primeiroTexto(
                                properties,
                                "opening_hours"
                        );

                Boolean acessivelCadeirante =
                        booleano(
                                properties.get(
                                        "wheelchair"
                                )
                        );

                Boolean possuiInternet =
                        booleano(
                                properties.get(
                                        "internet_access"
                                )
                        );

                /*
                 * Em algumas respostas, dados adicionais podem estar
                 * preservados na origem (datasource.raw). Eles são
                 * usados apenas como fallback.
                 */
                Object datasourceObj =
                        properties.get(
                                "datasource"
                        );

                if (
                        datasourceObj instanceof Map<?, ?> datasource
                ) {

                    Object rawObj =
                            datasource.get(
                                    "raw"
                            );

                    if (
                            rawObj instanceof Map<?, ?> raw
                    ) {

                        if (
                                site == null ||
                                site.isBlank()
                        ) {
                            site =
                                    primeiroTexto(
                                            raw,
                                            "website",
                                            "contact:website"
                                    );
                        }

                        if (
                                telefone == null ||
                                telefone.isBlank()
                        ) {
                            telefone =
                                    primeiroTexto(
                                            raw,
                                            "phone",
                                            "contact:phone"
                                    );
                        }

                        if (
                                horarioFuncionamento == null ||
                                horarioFuncionamento.isBlank()
                        ) {
                            horarioFuncionamento =
                                    primeiroTexto(
                                            raw,
                                            "opening_hours"
                                    );
                        }

                        if (
                                acessivelCadeirante == null
                        ) {
                            acessivelCadeirante =
                                    converterWheelchair(
                                            texto(
                                                    raw.get(
                                                            "wheelchair"
                                                    )
                                            )
                                    );
                        }
                    }
                }

                locais.add(
                        new LocalResponse(
                                placeId,
                                nome,
                                categoria,
                                lat,
                                lon,
                                endereco,
                                bairro,
                                cidade,
                                estado,
                                pais,
                                cep,
                                distanciaMetros,
                                categoriasGeoapify,
                                site,
                                telefone,
                                horarioFuncionamento,
                                acessivelCadeirante,
                                possuiInternet
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

    // =========================================================
    // REVERSE GEOCODING / LOCALIZAÇÃO ATUAL
    // =========================================================

    public LocalizacaoResponse buscarLocalizacaoAtual(
            double latitude,
            double longitude
    ) {

        String respostaJson =
                restClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                                "/v1/geocode/reverse"
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
                                                "lang",
                                                "pt"
                                        )
                                        .queryParam(
                                                "format",
                                                "json"
                                        )
                                        .queryParam(
                                                "apiKey",
                                                apiKey
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
            return null;
        }

        try {

            Map<String, Object> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Object resultsObj =
                    resposta.get(
                            "results"
                    );

            if (
                    !(resultsObj instanceof List<?> results) ||
                    results.isEmpty() ||
                    !(results.get(0) instanceof Map<?, ?> primeiro)
            ) {
                return null;
            }

            String cidade =
                    primeiroTexto(
                            primeiro,
                            "city",
                            "municipality",
                            "county"
                    );

            String estado =
                    primeiroTexto(
                            primeiro,
                            "state"
                    );

            String pais =
                    primeiroTexto(
                            primeiro,
                            "country"
                    );

            String enderecoFormatado =
                    primeiroTexto(
                            primeiro,
                            "formatted"
                    );

            return new LocalizacaoResponse(
                    cidade,
                    estado,
                    pais,
                    enderecoFormatado,
                    latitude,
                    longitude
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Erro ao processar localização atual no Geoapify.",
                    e
            );
        }
    }

    public static record LocalizacaoResponse(
            String cidade,
            String estado,
            String pais,
            String enderecoFormatado,
            double latitude,
            double longitude
    ) {
    }

    // =========================================================
    // CATEGORIAS
    // =========================================================

    private String converterCategoria(
            String categoria
    ) {

        return switch (
                categoria
                        .toLowerCase()
                        .trim()
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

            case "nightlife",
                 "vida noturna",
                 "balada",
                 "baladas",
                 "boate",
                 "boates",
                 "nightclub",
                 "nightclubs",
                 "show",
                 "shows",
                 "musica ao vivo",
                 "música ao vivo",
                 "casa de show",
                 "casa de shows" ->
                    "catering.bar,catering.pub,activity.events_venue,entertainment.culture,adult.nightclub";

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
                    "beach";

            case "atracao",
                 "atracoes",
                 "atração",
                 "atrações",
                 "passeio",
                 "passeios",
                 "ponto turistico",
                 "pontos turisticos",
                 "ponto turístico",
                 "pontos turísticos" ->
                    "tourism.attraction,tourism.sights";

            case "museu",
                 "museus" ->
                    "entertainment.museum";

            case "mirante",
                 "mirantes",
                 "vista",
                 "ponto de vista" ->
                    "tourism.attraction.viewpoint";

            case "monumento",
                 "monumentos",
                 "memorial",
                 "memoriais" ->
                    "tourism.sights.memorial,tourism.sights.memorial.monument";

            case "castelo",
                 "castelos",
                 "forte",
                 "fortes" ->
                    "tourism.sights.castle,tourism.sights.fort";

            case "igreja",
                 "igrejas",
                 "catedral",
                 "catedrais",
                 "templo",
                 "templos" ->
                    "tourism.sights.place_of_worship";

            case "ruina",
                 "ruinas",
                 "ruína",
                 "ruínas",
                 "sitio arqueologico",
                 "sítio arqueológico",
                 "sitios arqueologicos",
                 "sítios arqueológicos" ->
                    "tourism.sights.ruines,tourism.sights.archaeological_site";

            case "farol",
                 "farois",
                 "faróis" ->
                    "tourism.sights.lighthouse";

            case "arte",
                 "obra de arte",
                 "escultura",
                 "estatua",
                 "estátua",
                 "mural" ->
                    "tourism.attraction.artwork";

            case "natureza",
                 "atracao natural",
                 "atração natural",
                 "atracoes naturais",
                 "atrações naturais" ->
                    "natural";

            default ->
                    throw new IllegalArgumentException(
                            "Categoria de local não suportada: "
                                    + categoria
                    );
        };
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private String texto(
            Object valor
    ) {

        if (
                valor == null
        ) {
            return null;
        }

        String texto =
                valor.toString().trim();

        return texto.isBlank()
                ? null
                : texto;
    }

    private String primeiroTexto(
            Map<?, ?> mapa,
            String... chaves
    ) {

        if (
                mapa == null ||
                chaves == null
        ) {
            return null;
        }

        for (
                String chave :
                chaves
        ) {

            String valor =
                    texto(
                            mapa.get(
                                    chave
                            )
                    );

            if (
                    valor != null &&
                    !valor.isBlank()
            ) {
                return valor;
            }
        }

        return null;
    }

    private List<String> extrairListaTexto(
            Object valor
    ) {

        if (
                !(valor instanceof List<?> lista)
        ) {
            return List.of();
        }

        List<String> resultado =
                new ArrayList<>();

        for (
                Object item :
                lista
        ) {

            String texto =
                    texto(
                            item
                    );

            if (
                    texto != null &&
                    !texto.isBlank()
            ) {
                resultado.add(
                        texto
                );
            }
        }

        return resultado;
    }

    private Double numeroDouble(
            Object valor
    ) {

        if (
                valor instanceof Number numero
        ) {
            return numero.doubleValue();
        }

        if (
                valor == null
        ) {
            return null;
        }

        try {

            return Double.parseDouble(
                    valor.toString()
            );

        } catch (Exception e) {

            return null;
        }
    }

    private Boolean booleano(
            Object valor
    ) {

        if (
                valor instanceof Boolean booleano
        ) {
            return booleano;
        }

        if (
                valor == null
        ) {
            return null;
        }

        String texto =
                valor
                        .toString()
                        .trim()
                        .toLowerCase();

        if (
                texto.equals(
                        "true"
                ) ||
                texto.equals(
                        "yes"
                ) ||
                texto.equals(
                        "sim"
                )
        ) {
            return true;
        }

        if (
                texto.equals(
                        "false"
                ) ||
                texto.equals(
                        "no"
                ) ||
                texto.equals(
                        "não"
                ) ||
                texto.equals(
                        "nao"
                )
        ) {
            return false;
        }

        return null;
    }

    private Boolean converterWheelchair(
            String valor
    ) {

        if (
                valor == null ||
                valor.isBlank()
        ) {
            return null;
        }

        String normalizado =
                valor
                        .trim()
                        .toLowerCase();

        if (
                normalizado.equals(
                        "yes"
                )
        ) {
            return true;
        }

        if (
                normalizado.equals(
                        "no"
                )
        ) {
            return false;
        }

        return null;
    }

    private double calcularDistanciaMetros(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {

        final double raioTerraKm =
                6371.0088;

        double dLat =
                Math.toRadians(
                        lat2 - lat1
                );

        double dLon =
                Math.toRadians(
                        lon2 - lon1
                );

        double a =
                Math.sin(
                        dLat / 2
                )
                        * Math.sin(
                                dLat / 2
                        )
                        + Math.cos(
                                Math.toRadians(
                                        lat1
                                )
                        )
                        * Math.cos(
                                Math.toRadians(
                                        lat2
                                )
                        )
                        * Math.sin(
                                dLon / 2
                        )
                        * Math.sin(
                                dLon / 2
                        );

        double c =
                2
                        * Math.atan2(
                                Math.sqrt(
                                        a
                                ),
                                Math.sqrt(
                                        1 - a
                                )
                        );

        return raioTerraKm
                * c
                * 1000.0;
    }
}