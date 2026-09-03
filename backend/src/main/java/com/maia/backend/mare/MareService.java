package com.maia.backend.mare;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.ObjectMapper;

@Service
public class MareService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${worldtides.api.key}")
    private String apiKey;

    public MareService(
            ObjectMapper objectMapper
    ) {
        this.restClient =
                RestClient.builder()
                        .baseUrl(
                                "https://www.worldtides.info"
                        )
                        .build();

        this.objectMapper =
                objectMapper;
    }

    public MareResponse buscarMare(
            double latitude,
            double longitude
    ) {

        String respostaJson =
                restClient
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

                throw new RuntimeException(
                        erro != null
                                ? erro.toString()
                                : "Erro retornado pela WorldTides."
                );
            }

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

            return new MareResponse(
                    responseLat != null
                            ? responseLat
                            : latitude,

                    responseLon != null
                            ? responseLon
                            : longitude,

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
                 * Como os horários possuem
                 * offset, podemos comparar
                 * os instantes corretamente
                 * mesmo que o destino esteja
                 * em outro fuso.
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
                        "Não foi possível interpretar o horário da maré: "
                                + evento.dataHora()
                );
            }
        }

        return proxima;
    }

    private String converterTipo(
            String tipo
    ) {

        if (tipo == null) {
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