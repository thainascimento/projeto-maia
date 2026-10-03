package com.maia.backend.mare;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.ObjectMapper;

@Service
public class MareService {

    /*
     * Regra de produto da MAIA:
     *
     * A informação de maré só é considerada relevante
     * quando existe uma linha costeira do OpenStreetMap
     * em até 10 km das coordenadas do destino.
     *
     * Este valor NÃO representa um limite científico
     * de influência da maré.
     */
    private static final int RAIO_COSTA_METROS = 10_000;

    private final RestClient worldTidesClient;
    private final RestClient overpassClient;

    private final ObjectMapper objectMapper;

    @Value("${worldtides.api.key}")
    private String apiKey;

    public MareService(
            ObjectMapper objectMapper
    ) {

        this.worldTidesClient =
                RestClient.builder()
                        .baseUrl(
                                "https://www.worldtides.info"
                        )
                        .build();

        this.overpassClient =
                RestClient.builder()
                        .baseUrl(
                                "https://overpass-api.de"
                        )
                        .build();

        this.objectMapper =
                objectMapper;
    }

    public MareResponse buscarMare(
            double latitude,
            double longitude
    ) {

        /*
         * PRIMEIRO:
         *
         * verificamos se o destino realmente está
         * próximo de uma linha costeira.
         *
         * Não usamos a WorldTides para descobrir isso,
         * porque ela pode gerar previsões mesmo para
         * coordenadas interiores.
         */
        boolean costaProxima =
                possuiCostaProxima(
                        latitude,
                        longitude
                );

        if (!costaProxima) {

            System.out.println(
                    "Maré não aplicável ao destino: "
                            + latitude
                            + ", "
                            + longitude
                            + ". Nenhuma linha costeira encontrada "
                            + "em até "
                            + (RAIO_COSTA_METROS / 1000)
                            + " km."
            );

            return MareResponse.indisponivel();
        }

        /*
         * Só chegamos à WorldTides se o destino
         * passou pela validação costeira.
         */
        String respostaJson;

        try {

            respostaJson =
                    worldTidesClient
                            .get()
                            .uri(uriBuilder ->
                                    uriBuilder
                                            .path(
                                                    "/api/v3"
                                            )
                                            .queryParam(
                                                    "extremes"
                                            )
                                            .queryParam(
                                                    "date",
                                                    "today"
                                            )
                                            .queryParam(
                                                    "days",
                                                    2
                                            )
                                            .queryParam(
                                                    "localtime"
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
                                                    "key",
                                                    apiKey
                                            )
                                            .build()
                            )
                            .retrieve()
                            .body(
                                    String.class
                            );

        } catch (
                HttpClientErrorException.BadRequest e
        ) {

            String corpoResposta =
                    e.getResponseBodyAsString();

            /*
             * Caso a WorldTides não encontre
             * uma localização aplicável.
             */
            if (
                    corpoResposta != null &&
                    corpoResposta.contains(
                            "No location found"
                    )
            ) {

                System.out.println(
                        "Maré indisponível para o destino: "
                                + latitude
                                + ", "
                                + longitude
                                + ". WorldTides: No location found."
                );

                return MareResponse.indisponivel();
            }

            throw e;
        }

        if (
                respostaJson == null ||
                respostaJson.isBlank()
        ) {

            throw new RuntimeException(
                    "A WorldTides não retornou dados."
            );
        }

        try {

            Map<?, ?> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Integer status =
                    obterInteger(
                            resposta,
                            "status"
                    );

            if (
                    status != null &&
                    status != 200
            ) {

                Object erro =
                        resposta.get(
                                "error"
                        );

                if (
                        erro != null &&
                        erro.toString()
                                .contains(
                                        "No location found"
                                )
                ) {

                    return MareResponse.indisponivel();
                }

                throw new RuntimeException(
                        erro != null
                                ? erro.toString()
                                : "Erro retornado pela WorldTides."
                );
            }

            /*
             * Mantemos essas coordenadas apenas
             * como metadados da resposta.
             *
             * Elas NÃO são mais utilizadas para
             * decidir se o destino é costeiro.
             */
            Double responseLat =
                    obterDouble(
                            resposta,
                            "responseLat"
                    );

            Double responseLon =
                    obterDouble(
                            resposta,
                            "responseLon"
                    );

            String estacao =
                    obterString(
                            resposta,
                            "station"
                    );

            String datum =
                    obterString(
                            resposta,
                            "responseDatum"
                    );

            List<MareEventoResponse> eventos =
                    new ArrayList<>();

            Object extremesObj =
                    resposta.get(
                            "extremes"
                    );

            if (
                    extremesObj
                            instanceof List<?> extremes
            ) {

                for (
                        Object itemObj :
                        extremes
                ) {

                    if (
                            !(itemObj
                                    instanceof Map<?, ?> item)
                    ) {

                        continue;
                    }

                    String tipoOriginal =
                            obterString(
                                    item,
                                    "type"
                            );

                    String tipo =
                            converterTipo(
                                    tipoOriginal
                            );

                    Double altura =
                            obterDouble(
                                    item,
                                    "height"
                            );

                    String dataHora =
                            obterString(
                                    item,
                                    "date"
                            );

                    if (
                            dataHora == null
                    ) {

                        continue;
                    }

                    eventos.add(
                            new MareEventoResponse(
                                    tipo,
                                    dataHora,
                                    altura
                            )
                    );
                }
            }

            /*
             * Se a WorldTides não retornou eventos
             * úteis, não mostramos card de maré.
             */
            if (
                    eventos.isEmpty()
            ) {

                System.out.println(
                        "Maré indisponível: nenhum evento "
                                + "de maré foi retornado."
                );

                return MareResponse.indisponivel();
            }

            MareEventoResponse proximaMareBaixa =
                    encontrarProximaMare(
                            eventos,
                            "BAIXA"
                    );

            MareEventoResponse proximaMareAlta =
                    encontrarProximaMare(
                            eventos,
                            "ALTA"
                    );

            return MareResponse.disponivel(
                    responseLat,
                    responseLon,
                    estacao,
                    datum,
                    proximaMareBaixa,
                    proximaMareAlta,
                    eventos
            );

        } catch (RuntimeException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Erro ao processar dados de maré.",
                    e
            );
        }
    }

    /*
     * ============================================================
     * VALIDAÇÃO DE PROXIMIDADE COM O LITORAL
     * ============================================================
     *
     * Consulta o OpenStreetMap através da Overpass API.
     *
     * Procuramos ways com:
     *
     * natural=coastline
     *
     * dentro de um raio de 10 km da coordenada
     * da viagem.
     */
    private boolean possuiCostaProxima(
            double latitude,
            double longitude
    ) {

        String consulta =
                "[out:json][timeout:12];"
                        + "way[\"natural\"=\"coastline\"]"
                        + "(around:"
                        + RAIO_COSTA_METROS
                        + ","
                        + latitude
                        + ","
                        + longitude
                        + ");"
                        + "out ids 1;";

        try {

            String respostaJson =
                    overpassClient
                            .get()
                            .uri(uriBuilder ->
                                    uriBuilder
                                            .path(
                                                    "/api/interpreter"
                                            )
                                            .queryParam(
                                                    "data",
                                                    consulta
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

                System.out.println(
                        "Overpass não retornou conteúdo "
                                + "na validação costeira."
                );

                return false;
            }

            Map<?, ?> resposta =
                    objectMapper.readValue(
                            respostaJson,
                            Map.class
                    );

            Object elementsObj =
                    resposta.get(
                            "elements"
                    );

            boolean encontrouCosta =
                    elementsObj
                            instanceof List<?> elements &&
                    !elements.isEmpty();

            if (encontrouCosta) {

                System.out.println(
                        "Linha costeira encontrada em até "
                                + (RAIO_COSTA_METROS / 1000)
                                + " km de "
                                + latitude
                                + ", "
                                + longitude
                );

            } else {

                System.out.println(
                        "Nenhuma linha costeira encontrada em até "
                                + (RAIO_COSTA_METROS / 1000)
                                + " km de "
                                + latitude
                                + ", "
                                + longitude
                );
            }

            return encontrouCosta;

        } catch (Exception e) {

            /*
             * FALHA SEGURA
             *
             * Se não conseguimos confirmar que existe
             * litoral próximo, não mostramos maré.
             *
             * Isso é preferível a apresentar informação
             * marítima incorreta para um destino interior.
             */
            System.out.println(
                    "Não foi possível validar proximidade "
                            + "com a costa: "
                            + e.getMessage()
            );

            return false;
        }
    }

    /*
     * ============================================================
     * ENCONTRAR PRÓXIMA MARÉ
     * ============================================================
     */
    private MareEventoResponse encontrarProximaMare(
            List<MareEventoResponse> eventos,
            String tipo
    ) {

        OffsetDateTime agora =
                OffsetDateTime.now();

        MareEventoResponse proxima =
                null;

        OffsetDateTime horarioProxima =
                null;

        for (
                MareEventoResponse evento :
                eventos
        ) {

            if (
                    evento.tipo() == null ||
                    !evento.tipo()
                            .equalsIgnoreCase(
                                    tipo
                            )
            ) {

                continue;
            }

            if (
                    evento.dataHora() == null
            ) {

                continue;
            }

            try {

                OffsetDateTime horario =
                        OffsetDateTime.parse(
                                evento.dataHora()
                        );

                /*
                 * Como os horários possuem offset,
                 * comparamos os instantes absolutos.
                 */
                if (
                        !horario
                                .toInstant()
                                .isAfter(
                                        agora.toInstant()
                                )
                ) {

                    continue;
                }

                if (
                        horarioProxima == null ||
                        horario
                                .toInstant()
                                .isBefore(
                                        horarioProxima
                                                .toInstant()
                                )
                ) {

                    proxima =
                            evento;

                    horarioProxima =
                            horario;
                }

            } catch (Exception e) {

                System.out.println(
                        "Não foi possível interpretar "
                                + "o horário da maré: "
                                + evento.dataHora()
                );
            }
        }

        return proxima;
    }

    /*
     * ============================================================
     * CONVERTER TIPO DA WORLDTIDES
     * ============================================================
     */
    private String converterTipo(
            String tipo
    ) {

        if (
                tipo == null
        ) {

            return "DESCONHECIDA";
        }

        if (
                tipo.equalsIgnoreCase(
                        "High"
                )
        ) {

            return "ALTA";
        }

        if (
                tipo.equalsIgnoreCase(
                        "Low"
                )
        ) {

            return "BAIXA";
        }

        return tipo.toUpperCase();
    }

    /*
     * ============================================================
     * HELPERS JSON
     * ============================================================
     */
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

    private String obterString(
            Map<?, ?> mapa,
            String chave
    ) {

        Object valor =
                mapa.get(
                        chave
                );

        return valor != null
                ? valor.toString()
                : null;
    }
}