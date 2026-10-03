package com.maia.backend.geocoding;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.core.type.TypeReference;
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
        this.restClient =
                RestClient.builder()
                        .baseUrl(
                                "https://api.geoapify.com"
                        )
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

        String respostaJson =
                restClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                                "/v1/geocode/search"
                                        )
                                        .queryParam(
                                                "text",
                                                texto.trim()
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
                        .body(
                                String.class
                        );

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
                            new TypeReference<
                                    Map<String, Object>
                                    >() {
                            }
                    );

            Object resultsObj =
                    resposta.get(
                            "results"
                    );

            if (
                    !(resultsObj
                            instanceof List<?> results)
            ) {
                throw new RuntimeException(
                        "Resposta inválida da Geoapify."
                );
            }

            if (
                    results.isEmpty()
            ) {
                throw new RuntimeException(
                        "Localização não encontrada."
                );
            }

            Object primeiroObj =
                    results.get(
                            0
                    );

            if (
                    !(primeiroObj
                            instanceof Map<?, ?> resultado)
            ) {
                throw new RuntimeException(
                        "Resultado inválido da Geoapify."
                );
            }

            Object latitudeObj =
                    resultado.get(
                            "lat"
                    );

            Object longitudeObj =
                    resultado.get(
                            "lon"
                    );

            if (
                    !(latitudeObj
                            instanceof Number) ||
                    !(longitudeObj
                            instanceof Number)
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
                    obterTexto(
                            resultado.get(
                                    "formatted"
                            )
                    );

            if (
                    nome == null ||
                    nome.isBlank()
            ) {
                nome =
                        texto.trim();
            }

            return new GeocodingResponse(
                    nome,
                    latitude,
                    longitude
            );

        } catch (
                RuntimeException e
        ) {
            throw e;

        } catch (
                Exception e
        ) {
            throw new RuntimeException(
                    "Erro ao processar geocodificação.",
                    e
            );
        }
    }

    public List<GeocodingSugestaoResponse> buscarSugestoes(
            String texto
    ) {

        if (
                texto == null ||
                texto.isBlank()
        ) {
            return List.of();
        }

        String textoLimpo =
                texto.trim();

        if (
                textoLimpo.length() < 2
        ) {
            return List.of();
        }

        List<GeocodingSugestaoResponse> sugestoes =
                new ArrayList<>();

        Set<String> chavesAdicionadas =
                new HashSet<>();

        buscarAutocomplete(
                textoLimpo,
                sugestoes,
                chavesAdicionadas
        );

        buscarGeocoding(
                textoLimpo,
                sugestoes,
                chavesAdicionadas
        );

        if (
                sugestoes.size() > 10
        ) {
            return new ArrayList<>(
                    sugestoes.subList(
                            0,
                            10
                    )
            );
        }

        return sugestoes;
    }

    private void buscarAutocomplete(
            String texto,
            List<GeocodingSugestaoResponse> sugestoes,
            Set<String> chavesAdicionadas
    ) {

        try {

            String respostaJson =
                    restClient
                            .get()
                            .uri(uriBuilder ->
                                    uriBuilder
                                            .path(
                                                    "/v1/geocode/autocomplete"
                                            )
                                            .queryParam(
                                                    "text",
                                                    texto
                                            )
                                            .queryParam(
                                                    "type",
                                                    "city"
                                            )
                                            .queryParam(
                                                    "format",
                                                    "json"
                                            )
                                            .queryParam(
                                                    "limit",
                                                    10
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

            adicionarResultados(
                    respostaJson,
                    sugestoes,
                    chavesAdicionadas
            );

        } catch (
                Exception e
        ) {
            System.err.println(
                    "Falha no autocomplete da Geoapify: "
                            + e.getMessage()
            );
        }
    }

    private void buscarGeocoding(
            String texto,
            List<GeocodingSugestaoResponse> sugestoes,
            Set<String> chavesAdicionadas
    ) {

        try {

            String respostaJson =
                    restClient
                            .get()
                            .uri(uriBuilder ->
                                    uriBuilder
                                            .path(
                                                    "/v1/geocode/search"
                                            )
                                            .queryParam(
                                                    "text",
                                                    texto
                                            )
                                            .queryParam(
                                                    "type",
                                                    "city"
                                            )
                                            .queryParam(
                                                    "format",
                                                    "json"
                                            )
                                            .queryParam(
                                                    "limit",
                                                    10
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

            adicionarResultados(
                    respostaJson,
                    sugestoes,
                    chavesAdicionadas
            );

        } catch (
                Exception e
        ) {
            System.err.println(
                    "Falha na busca geográfica da Geoapify: "
                            + e.getMessage()
            );
        }
    }

    private void adicionarResultados(
            String respostaJson,
            List<GeocodingSugestaoResponse> sugestoes,
            Set<String> chavesAdicionadas
    ) throws Exception {

        if (
                respostaJson == null ||
                respostaJson.isBlank()
        ) {
            return;
        }

        Map<String, Object> resposta =
                objectMapper.readValue(
                        respostaJson,
                        new TypeReference<
                                Map<String, Object>
                                >() {
                        }
                );

        Object resultsObj =
                resposta.get(
                        "results"
                );

        if (
                !(resultsObj
                        instanceof List<?> results)
        ) {
            return;
        }

        for (
                Object resultadoObj : results
        ) {

            if (
                    !(resultadoObj
                            instanceof Map<?, ?> resultado)
            ) {
                continue;
            }

            Object latitudeObj =
                    resultado.get(
                            "lat"
                    );

            Object longitudeObj =
                    resultado.get(
                            "lon"
                    );

            if (
                    !(latitudeObj
                            instanceof Number) ||
                    !(longitudeObj
                            instanceof Number)
            ) {
                continue;
            }

            String cidade =
                    primeiroTextoValido(
                            resultado.get(
                                    "city"
                            ),
                            resultado.get(
                                    "town"
                            ),
                            resultado.get(
                                    "village"
                            ),
                            resultado.get(
                                    "municipality"
                            ),
                            resultado.get(
                                    "name"
                            )
                    );

            if (
                    cidade == null ||
                    cidade.isBlank()
            ) {
                continue;
            }

            String pais =
                    obterTexto(
                            resultado.get(
                                    "country"
                            )
                    );

            String codigoPais =
                    obterTexto(
                            resultado.get(
                                    "country_code"
                            )
                    );

            String codigoEstado =
                    obterTexto(
                            resultado.get(
                                    "state_code"
                            )
                    );

            String estado;

            if (
                    codigoPais != null &&
                    codigoPais.equalsIgnoreCase(
                            "br"
                    ) &&
                    codigoEstado != null &&
                    !codigoEstado.isBlank()
            ) {
                estado =
                        nomeEstadoBrasileiro(
                                codigoEstado
                        );
            } else {
                estado =
                        primeiroTextoValido(
                                resultado.get(
                                        "state"
                                ),
                                resultado.get(
                                        "county"
                                )
                        );
            }

            String nome =
                    montarNome(
                            cidade,
                            estado,
                            pais
                    );

            String chave =
                    (
                            cidade +
                            "|" +
                            valorOuVazio(
                                    estado
                            ) +
                            "|" +
                            valorOuVazio(
                                    pais
                            )
                    )
                            .toLowerCase();

            if (
                    chavesAdicionadas.contains(
                            chave
                    )
            ) {
                continue;
            }

            chavesAdicionadas.add(
                    chave
            );

            sugestoes.add(
                    new GeocodingSugestaoResponse(
                            nome,
                            cidade,
                            estado,
                            pais,
                            ((Number) latitudeObj)
                                    .doubleValue(),
                            ((Number) longitudeObj)
                                    .doubleValue()
                    )
            );
        }
    }

    private String obterTexto(
            Object valor
    ) {

        if (
                valor == null
        ) {
            return null;
        }

        String texto =
                valor
                        .toString()
                        .trim();

        if (
                texto.isBlank()
        ) {
            return null;
        }

        return texto;
    }

    private String primeiroTextoValido(
            Object... valores
    ) {

        for (
                Object valor : valores
        ) {

            String texto =
                    obterTexto(
                            valor
                    );

            if (
                    texto != null &&
                    !texto.isBlank()
            ) {
                return texto;
            }
        }

        return null;
    }

    private String montarNome(
            String cidade,
            String estado,
            String pais
    ) {

        List<String> partes =
                new ArrayList<>();

        if (
                cidade != null &&
                !cidade.isBlank()
        ) {
            partes.add(
                    cidade
            );
        }

        if (
                estado != null &&
                !estado.isBlank()
        ) {
            partes.add(
                    estado
            );
        }

        if (
                pais != null &&
                !pais.isBlank()
        ) {
            partes.add(
                    pais
            );
        }

        return String.join(
                ", ",
                partes
        );
    }

    private String valorOuVazio(
            String valor
    ) {

        return valor == null
                ? ""
                : valor;
    }

    private String nomeEstadoBrasileiro(
            String sigla
    ) {

        String codigo =
                sigla
                        .trim()
                        .toUpperCase();

        return switch (
                codigo
        ) {
            case "AC" -> "Acre";
            case "AL" -> "Alagoas";
            case "AP" -> "Amapá";
            case "AM" -> "Amazonas";
            case "BA" -> "Bahia";
            case "CE" -> "Ceará";
            case "DF" -> "Distrito Federal";
            case "ES" -> "Espírito Santo";
            case "GO" -> "Goiás";
            case "MA" -> "Maranhão";
            case "MT" -> "Mato Grosso";
            case "MS" -> "Mato Grosso do Sul";
            case "MG" -> "Minas Gerais";
            case "PA" -> "Pará";
            case "PB" -> "Paraíba";
            case "PR" -> "Paraná";
            case "PE" -> "Pernambuco";
            case "PI" -> "Piauí";
            case "RJ" -> "Rio de Janeiro";
            case "RN" -> "Rio Grande do Norte";
            case "RS" -> "Rio Grande do Sul";
            case "RO" -> "Rondônia";
            case "RR" -> "Roraima";
            case "SC" -> "Santa Catarina";
            case "SP" -> "São Paulo";
            case "SE" -> "Sergipe";
            case "TO" -> "Tocantins";

            default -> codigo;
        };
    }
}