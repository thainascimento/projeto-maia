package com.maia.backend.ia;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maia.backend.clima.ClimaResponse;
import com.maia.backend.local.LocalResponse;
import com.maia.backend.mare.MareEventoResponse;
import com.maia.backend.mare.MareResponse;
import com.maia.backend.planejamento.PlanejamentoRequest;
import com.maia.backend.planejamento.dto.RecomendacaoResponse;
import com.maia.backend.viagem.Viagem;

@Service
public class GroqService {

    private final String apiKey;
    private final String apiUrl;
    private final String model;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GroqService(
            @Value("${groq.api.key}") String apiKey,
            @Value("${groq.api.url}") String apiUrl,
            @Value("${groq.api.model}") String model
    ) {

        this.apiKey =
                apiKey;

        this.apiUrl =
                apiUrl;

        this.model =
                model;

        this.httpClient =
                HttpClient
                        .newHttpClient();

        this.objectMapper =
                new ObjectMapper();
    }


    // =========================================================
    // INTERPRETAÃ‡ÃƒO DE INTENÃ‡ÃƒO
    // =========================================================

    public static record InterpretacaoIntencao(
            String intencao,
            String referenciaGeografica,
            String categoriaLocal,
            boolean precisaGps,
            String referenciaConversacional,
            String criterio,
            Integer indiceLocal,
            String escopoResultados
    ) {
    }

    public InterpretacaoIntencao interpretarIntencao(
            String mensagem,
            List<MaiaMensagemHistorico> historico
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return new InterpretacaoIntencao(
                    "CONVERSA_GERAL",
                    "NENHUMA",
                    null,
                    false,
                    "NENHUMA",
                    null,
                    null,
                    "NENHUM"
            );
        }

        try {

            String historicoTexto =
                    montarHistoricoParaInterpretacao(
                            historico
                    );

            String promptSistema =
                    """
                    VocÃª classifica a intenÃ§Ã£o da mensagem para a maIA.
                    NÃ£o responda Ã  usuÃ¡ria. Retorne somente JSON puro.

                    IntenÃ§Ãµes:
                    LOCALIZACAO_ATUAL, CLIMA, MARE, BUSCAR_LOCAL,
                    COMPARAR_LOCAIS, DETALHAR_LOCAL, MAIS_RESULTADOS,
                    REFINAR_BUSCA, DESTINO_VIAGEM, CONVERSA_GERAL.

                    ReferÃªncia geogrÃ¡fica:
                    GPS_ATUAL, DESTINO_VIAGEM ou NENHUMA.

                    Categorias:
                    nightlife, cafe, restaurante, sorveteria, bar,
                    supermercado, farmacia, praia, atracao, museu,
                    mirante, monumento, castelo, igreja, ruina,
                    farol, arte, natureza ou null.

                    ReferÃªncia conversacional:
                    RESULTADOS_ANTERIORES ou NENHUMA.

                    CritÃ©rio:
                    DISTANCIA, SITE, TELEFONE, HORARIO, ENDERECO,
                    ACESSIBILIDADE, INTERNET ou null.

                    Escopo dos resultados:
                    PAGINA_ATUAL, TODOS_RESULTADOS, PRIMEIRA_PAGINA,
                    PAGINA_ANTERIOR ou NENHUM.

                    Regras:
                    - Entenda linguagem natural e use o histÃ³rico recente como
                      continuaÃ§Ã£o real da conversa, nÃ£o como mensagens isoladas.
                    - Resolva referÃªncias, pronomes e elipses pelo histÃ³rico.
                      Se a conversa estiver falando de um local especÃ­fico,
                      perguntas subsequentes sobre "ele", "esse", "esse lugar",
                      "o local", ou perguntas abreviadas como "e telefone?",
                      "e o site?", "qual o endereÃ§o?" e "abre que horas?"
                      continuam se referindo ao mesmo local.
                    - Quando a mensagem atual pedir uma informaÃ§Ã£o sobre um local
                      que jÃ¡ estÃ¡ em foco no histÃ³rico, classifique como
                      DETALHAR_LOCAL + RESULTADOS_ANTERIORES.
                    - Nessa continuaÃ§Ã£o, use o critÃ©rio correspondente quando
                      houver: SITE, TELEFONE, HORARIO, ENDERECO,
                      ACESSIBILIDADE ou INTERNET. Se for um pedido geral de
                      detalhes, criterio=null.
                    - Se a mensagem escolher explicitamente "o primeiro",
                      "o segundo", "o terceiro" etc., use DETALHAR_LOCAL +
                      RESULTADOS_ANTERIORES e preencha indiceLocal.
                    - Se a mensagem apenas continuar falando do local jÃ¡ escolhido,
                      nÃ£o invente um novo indiceLocal; deixe indiceLocal=null para
                      que o foco atual seja preservado pelo sistema.
                    - "perto de mim", "aqui perto" => GPS_ATUAL.
                    - "meu destino", "na viagem" => DESTINO_VIAGEM.
                    - clima => CLIMA; marÃ© => MARE.
                    - pedidos novos de lugares => BUSCAR_LOCAL + categoriaLocal.
                    - perguntas que comparam vÃ¡rios resultados anteriores, como
                      "qual o mais perto?" ou "qual deles tem site?", usam
                      COMPARAR_LOCAIS + RESULTADOS_ANTERIORES + critÃ©rio.
                    - Para COMPARAR_LOCAIS, DETALHAR_LOCAL ou REFINAR_BUSCA sobre
                      resultados anteriores, interprete tambÃ©m qual conjunto da
                      conversa a usuÃ¡ria estÃ¡ mencionando em escopoResultados.
                    - PAGINA_ATUAL significa explicitamente a lista mais recente,
                      por exemplo "dessa Ãºltima lista", "esses Ãºltimos" ou quando
                      o contexto deixa claro que a usuÃ¡ria fala sÃ³ do Ãºltimo bloco.
                    - TODOS_RESULTADOS significa todos os locais encontrados na
                      busca atual. Use para referÃªncias amplas como "todos",
                      "entre todos", "dos que vocÃª encontrou", "dos que vocÃª me
                      mostrou" e tambÃ©m "desses", "deles" ou "esses lugares"
                      depois de mais de um bloco, quando a usuÃ¡ria nÃ£o limitar a
                      pergunta ao bloco mais recente.
                    - PRIMEIRA_PAGINA significa o primeiro bloco, como "os
                      primeiros" ou "a primeira lista".
                    - PAGINA_ANTERIOR significa o bloco imediatamente anterior,
                      como "os anteriores" ou "a lista anterior".
                    - NÃ£o escolha o escopo por uma palavra isolada. Use a mensagem
                      atual e o histÃ³rico para resolver a referÃªncia.
                    - Se houver resultados anteriores e o escopo continuar
                      ambÃ­guo, use TODOS_RESULTADOS para comparaÃ§Ãµes amplas e
                      PAGINA_ATUAL para detalhes de um item especÃ­fico.
                    - pedidos por mais opÃ§Ãµes usam MAIS_RESULTADOS +
                      RESULTADOS_ANTERIORES e escopoResultados=PAGINA_ATUAL.
                    - comparaÃ§Ãµes e detalhes sobre resultados anteriores nÃ£o
                      precisam de GPS novamente: referenciaGeografica=NENHUMA,
                      precisaGps=false.
                    - NÃ£o transforme uma continuaÃ§Ã£o sobre um local jÃ¡ discutido
                      em CONVERSA_GERAL apenas porque a mensagem atual Ã© curta.
                    - nunca invente local, cidade, coordenada ou contexto.

                    Formato:
                    {
                      "intencao":"VALOR",
                      "referenciaGeografica":"VALOR",
                      "categoriaLocal":null,
                      "precisaGps":false,
                      "referenciaConversacional":"NENHUMA",
                      "criterio":null,
                      "indiceLocal":null,
                      "escopoResultados":"NENHUM"
                    }
                    """;

            String promptUsuario =
                    """
                    HISTÃ“RICO RECENTE:
                    %s

                    MENSAGEM ATUAL:
                    %s
                    """.formatted(
                            historicoTexto,
                            mensagem
                    );

            Map<String, Object> corpo =
                    Map.of(
                            "model",
                            model,

                            "messages",
                            List.of(
                                    Map.of(
                                            "role",
                                            "system",
                                            "content",
                                            promptSistema
                                    ),
                                    Map.of(
                                            "role",
                                            "user",
                                            "content",
                                            promptUsuario
                                    )
                            ),

                            "temperature",
                            0.0,

                            "max_completion_tokens",
                            1024,

                            "tool_choice",
                            "none"
                    );

            String resposta =
                    executarRequisicao(
                            corpo
                    );

            return converterRespostaInterpretacao(
                    resposta
            );

        } catch (Exception e) {

            System.out.println(
                    " Falha ao interpretar intenÃ§Ã£o com a Groq: "
                            + e.getMessage()
            );

            return null;
        }
    }

    private String montarHistoricoParaInterpretacao(
            List<MaiaMensagemHistorico> historico
    ) {

        if (
                historico == null ||
                historico.isEmpty()
        ) {
            return "(sem histÃ³rico)";
        }

        int inicio =
                Math.max(
                        0,
                        historico.size() - 4
                );

        StringBuilder texto =
                new StringBuilder();

        for (
                int i = inicio;
                i < historico.size();
                i++
        ) {

            MaiaMensagemHistorico item =
                    historico.get(i);

            if (
                    item == null ||
                    item.texto() == null ||
                    item.texto().isBlank()
            ) {
                continue;
            }

            texto
                    .append(
                            item.autor() != null
                                    ? item.autor()
                                    : "DESCONHECIDO"
                    )
                    .append(": ")
                    .append(
                            item.texto()
                                    .replace(
                                            "\n",
                                            " "
                                    )
                    )
                    .append("\n");
        }

        return texto
                .toString()
                .trim();
    }

    private InterpretacaoIntencao converterRespostaInterpretacao(
            String resposta
    ) throws Exception {

        if (
                resposta == null ||
                resposta.isBlank()
        ) {
            return null;
        }

        int inicioJson =
                resposta.indexOf(
                        "{"
                );

        int fimJson =
                resposta.lastIndexOf(
                        "}"
                );

        if (
                inicioJson < 0 ||
                fimJson < inicioJson
        ) {
            return null;
        }

        String json =
                resposta.substring(
                        inicioJson,
                        fimJson + 1
                );

        JsonNode raiz =
                objectMapper.readTree(
                        json
                );

        String intencao =
                raiz.path(
                        "intencao"
                )
                .asText(
                        "CONVERSA_GERAL"
                )
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );

        String referencia =
                raiz.path(
                        "referenciaGeografica"
                )
                .asText(
                        "NENHUMA"
                )
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );

        String categoria =
                null;

        JsonNode categoriaNode =
                raiz.get(
                        "categoriaLocal"
                );

        if (
                categoriaNode != null &&
                !categoriaNode.isNull()
        ) {

            String valor =
                    categoriaNode
                            .asText()
                            .trim();

            if (
                    !valor.isBlank() &&
                    !valor.equalsIgnoreCase(
                            "null"
                    )
            ) {
                categoria =
                        valor.toLowerCase(
                                Locale.ROOT
                        );
            }
        }

        boolean precisaGps =
                raiz.path(
                        "precisaGps"
                )
                .asBoolean(
                        false
                );

        if (
                intencao.equals(
                        "LOCALIZACAO_ATUAL"
                )
        ) {
            referencia =
                    "GPS_ATUAL";

            precisaGps =
                    true;
        }

        if (
                referencia.equals(
                        "GPS_ATUAL"
                )
        ) {
            precisaGps =
                    true;
        }

        String referenciaConversacional =
                raiz.path(
                        "referenciaConversacional"
                )
                .asText(
                        "NENHUMA"
                )
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );

        String criterio =
                null;

        JsonNode criterioNode =
                raiz.get(
                        "criterio"
                );

        if (
                criterioNode != null &&
                !criterioNode.isNull()
        ) {

            String valor =
                    criterioNode
                            .asText()
                            .trim();

            if (
                    !valor.isBlank() &&
                    !valor.equalsIgnoreCase(
                            "null"
                    )
            ) {
                criterio =
                        valor.toUpperCase(
                                Locale.ROOT
                        );
            }
        }

        Integer indiceLocal =
                null;

        JsonNode indiceNode =
                raiz.get(
                        "indiceLocal"
                );

        if (
                indiceNode != null &&
                indiceNode.isInt()
        ) {
            indiceLocal =
                    indiceNode.asInt();
        }

        String escopoResultados =
                raiz.path(
                        "escopoResultados"
                )
                .asText(
                        "NENHUM"
                )
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );

        if (
                !"PAGINA_ATUAL".equals(escopoResultados) &&
                !"TODOS_RESULTADOS".equals(escopoResultados) &&
                !"PRIMEIRA_PAGINA".equals(escopoResultados) &&
                !"PAGINA_ANTERIOR".equals(escopoResultados)
        ) {
            escopoResultados =
                    "NENHUM";
        }

        /*
         * Perguntas que apenas comparam ou detalham lugares jÃ¡
         * apresentados nÃ£o precisam consultar o GPS novamente.
         *
         * Exemplo:
         * "qual o mais perto?"
         * "qual tem site?"
         * "e o segundo?"
         *
         * Mesmo que o modelo tenha herdado GPS_ATUAL do contexto
         * anterior, os dados necessÃ¡rios jÃ¡ estÃ£o no histÃ³rico.
         */
        boolean usaSomenteResultadosAnteriores =
                "RESULTADOS_ANTERIORES".equals(
                        referenciaConversacional
                ) &&
                (
                        "COMPARAR_LOCAIS".equals(
                                intencao
                        ) ||
                        "DETALHAR_LOCAL".equals(
                                intencao
                        ) ||
                        "MAIS_RESULTADOS".equals(
                                intencao
                        ) ||
                        "REFINAR_BUSCA".equals(
                                intencao
                        )
                );

        if (
                usaSomenteResultadosAnteriores
        ) {
            referencia =
                    "NENHUMA";

            precisaGps =
                    false;
        }

        return new InterpretacaoIntencao(
                intencao,
                referencia,
                categoria,
                precisaGps,
                referenciaConversacional,
                criterio,
                indiceLocal,
                escopoResultados
        );
    }

    // =========================================================
    // TESTE DA CONEXÃƒO COM A GROQ
    // =========================================================

    public String testarConexao() {

        try {

            Map<String, Object> mensagemSistema =
                    Map.of(
                            "role",
                            "system",
                            "content",
                            """
                            VocÃª Ã© a maIA, assistente do aplicativo MAIA.

                            Responda sempre em portuguÃªs do Brasil.
                            """
                    );

            Map<String, Object> mensagemUsuario =
                    Map.of(
                            "role",
                            "user",
                            "content",
                            "Responda somente: conexÃ£o com a maIA funcionando."
                    );

            Map<String, Object> corpo =
                    Map.of(
                            "model",
                            model,

                            "messages",
                            List.of(
                                    mensagemSistema,
                                    mensagemUsuario
                            ),

                            "temperature",
                            0.1
                    );

            return executarRequisicao(
                    corpo
            );

        } catch (Exception e) {

            throw new IllegalStateException(
                    "NÃ£o foi possÃ­vel conectar Ã  Groq: "
                            + e.getMessage(),
                    e
            );
        }
    }

    // =========================================================
    // CONVERSA COM A maIA
    // =========================================================
    public String conversar(
            String mensagem,
            List<MaiaMensagemHistorico> historico,
            Viagem viagemAtiva,
            ClimaResponse climaAtual,
            ContextoUsuarioMaia contextoUsuario,
            MareResponse mareAtual,
            List<LocalResponse> locaisReais,
            boolean buscaLocaisRealizada,
            List<String> categoriasLocaisConsultadas,
            Double latitudeReferenciaLocais,
            Double longitudeReferenciaLocais,
            String tipoLocalizacaoReferencia
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {

            throw new IllegalArgumentException(
                    "A mensagem nÃ£o pode estar vazia."
            );
        }

        try {

            String promptSistema =
                    """
                    VocÃª Ã© a maIA, assistente de viagem do app MAIA.
                    Responda em portuguÃªs do Brasil, de forma natural, curta,
                    prÃ¡tica e acolhedora. Normalmente use 1 a 3 parÃ¡grafos.

                    Use o histÃ³rico recente para manter contexto e entender
                    referÃªncias como "o primeiro", "qual o mais perto?" e
                    "e Ã  noite?".

                    Regras de precisÃ£o:
                    - use somente dados reais presentes nos contextos recebidos;
                    - nunca invente lugares, preÃ§os, horÃ¡rios, avaliaÃ§Ãµes,
                      eventos, seguranÃ§a, clima, marÃ©, rotas ou tempo de trajeto;
                    - GPS_ATUAL Ã© a localizaÃ§Ã£o fÃ­sica da usuÃ¡ria;
                      DESTINO_VIAGEM Ã© o destino cadastrado;
                    - distÃ¢ncia de local Ã© em linha reta, nÃ£o tempo de trajeto;
                    - quando houver locais reais, use apenas esses nomes e dados;
                    - se faltarem dados, diga isso de forma simples;
                    - nÃ£o exponha JSON, ferramentas ou detalhes internos;
                    - nÃ£o diga que farÃ¡ uma busca depois: o backend jÃ¡ executou
                      as consultas necessÃ¡rias antes da sua resposta;
                    - em risco imediato, priorize seguranÃ§a e ajuda oficial.

                    Seu nome Ã© maIA. Responda diretamente ao que foi perguntado.
                    """;

            StringBuilder contextoSistema =
                    new StringBuilder(
                            promptSistema
                    );

            if (
                    contextoUsuario != null
            ) {
                contextoSistema
                        .append("\n\n")
                        .append(
                                montarContextoUsuario(
                                        contextoUsuario
                                )
                        );
            }

            if (
                    viagemAtiva != null
            ) {
                contextoSistema
                        .append("\n\n")
                        .append(
                                montarContextoViagemAtiva(
                                        viagemAtiva
                                )
                        );
            }

            if (
                    climaAtual != null
            ) {
                contextoSistema
                        .append("\n\n")
                        .append(
                                montarContextoClima(
                                        climaAtual,
                                        tipoLocalizacaoReferencia
                                )
                        );
            }

            if (
                    mareAtual != null
            ) {
                contextoSistema
                        .append("\n\n")
                        .append(
                                montarContextoMare(
                                        mareAtual
                                )
                        );
            }

            if (
                    buscaLocaisRealizada
            ) {
                contextoSistema
                        .append("\n\n")
                        .append(
                                montarContextoLocais(
                                        locaisReais,
                                        true,
                                        categoriasLocaisConsultadas,
                                        latitudeReferenciaLocais,
                                        longitudeReferenciaLocais,
                                        tipoLocalizacaoReferencia
                                )
                        );
            }

            List<Map<String, Object>> mensagens =
                    new ArrayList<>();

            mensagens.add(
                    Map.of(
                            "role",
                            "system",
                            "content",
                            contextoSistema.toString()
                    )
            );

            // =====================================================
            // HISTÃ“RICO RECENTE
            // =====================================================

            if (
                    historico != null &&
                    !historico.isEmpty()
            ) {

                int inicio =
                        Math.max(
                                0,
                                historico.size() - 3
                        );

                List<MaiaMensagemHistorico> historicoRecente =
                        historico.subList(
                                inicio,
                                historico.size()
                        );

                for (
                        MaiaMensagemHistorico item :
                        historicoRecente
                ) {

                    if (
                            item == null ||
                            item.texto() == null ||
                            item.texto().isBlank()
                    ) {
                        continue;
                    }

                    String papel;

                    if (
                            "MAIA"
                                    .equalsIgnoreCase(
                                            item.autor()
                                    )
                    ) {

                        papel =
                                "assistant";

                    } else if (
                            "USUARIA"
                                    .equalsIgnoreCase(
                                            item.autor()
                                    )
                    ) {

                        papel =
                                "user";

                    } else {

                        continue;
                    }

                    mensagens.add(
                            Map.of(
                                    "role",
                                    papel,
                                    "content",
                                    item.texto()
                            )
                    );
                }
            }

            // =====================================================
            // MENSAGEM ATUAL
            // =====================================================

            mensagens.add(
                    Map.of(
                            "role",
                            "user",
                            "content",
                            mensagem.trim()
                    )
            );

            Map<String, Object> corpo =
                    Map.of(
                            "model",
                            model,

                            "messages",
                            mensagens,

                            "temperature",
                            0.45,

                            "max_completion_tokens",
                            320,

                            // O backend do MAIA jÃ¡ executa Geoapify, clima,
                            // marÃ© e demais integraÃ§Ãµes. O modelo deve apenas
                            // responder com base no contexto recebido.
                            "tool_choice",
                            "none"
                    );

            String resposta;

            try {

                resposta =
                        executarRequisicao(
                                corpo
                        );

            } catch (IllegalStateException e) {

                if (
                        !erroDeTentativaDeToolUse(
                                e
                        )
                ) {
                    throw e;
                }

                /*
                 * Alguns modelos podem tentar emitir uma chamada de ferramenta
                 * mesmo quando tool_choice = none. Nesse caso especÃ­fico,
                 * repetimos UMA Ãºnica vez com uma instruÃ§Ã£o de sistema ainda
                 * mais explÃ­cita. NÃ£o alteramos o modelo, nÃ£o chamamos browser
                 * e nÃ£o mudamos o fluxo das integraÃ§Ãµes do MAIA.
                 */
                List<Map<String, Object>> mensagensRetry =
                        new ArrayList<>(
                                mensagens
                        );

                mensagensRetry.add(
                        1,
                        Map.of(
                                "role",
                                "system",
                                "content",
                                """
                                REGRA TÃ‰CNICA OBRIGATÃ“RIA PARA ESTA RESPOSTA:
                                responda somente com texto natural para a usuÃ¡ria.
                                NÃ£o tente chamar ferramentas, funÃ§Ãµes, browser,
                                pesquisa externa, repo_browser, web search ou
                                qualquer aÃ§Ã£o interna.

                                As consultas externas necessÃ¡rias jÃ¡ foram
                                executadas pelo backend do MAIA antes desta
                                mensagem. Use exclusivamente os contextos reais
                                fornecidos na conversa. Se os dados nÃ£o confirmam
                                uma informaÃ§Ã£o, diga isso sem tentar buscÃ¡-la.
                                """
                        )
                );

                Map<String, Object> corpoRetry =
                        Map.of(
                                "model",
                                model,

                                "messages",
                                mensagensRetry,

                                "temperature",
                                0.35,

                                "max_completion_tokens",
                                320,

                                "tool_choice",
                                "none"
                        );

                resposta =
                        executarRequisicao(
                                corpoRetry
                        );
            }

            return limparRespostaMaia(
                    resposta
            );

        } catch (Exception e) {

            throw new IllegalStateException(
                    "A maIA nÃ£o conseguiu responder agora: "
                            + e.getMessage(),
                    e
            );
        }
    }

    // =========================================================
    // LIMPEZA DA RESPOSTA DO CHAT
    // =========================================================

    private String limparRespostaMaia(
            String resposta
    ) {

        if (
                resposta == null ||
                resposta.isBlank()
        ) {
            return resposta;
        }

        String respostaLimpa =
                resposta.trim();

        respostaLimpa =
                respostaLimpa.replace(
                        "**",
                        ""
                );

        respostaLimpa =
                respostaLimpa.replace(
                        "__",
                        ""
                );

        respostaLimpa =
                respostaLimpa.replaceAll(
                        "(?m)^#{1,6}\\s*",
                        ""
                );

        respostaLimpa =
                respostaLimpa.replace(
                        "```json",
                        ""
                );

        respostaLimpa =
                respostaLimpa.replace(
                        "```",
                        ""
                );

        respostaLimpa =
                respostaLimpa.replaceAll(
                        "\\n{3,}",
                        "\n\n"
                );

        return respostaLimpa
                .trim();
    }

    // =========================================================
    // CONTEXTO DA VIAGEM ATIVA
    // =========================================================

    private String montarContextoUsuario(
        ContextoUsuarioMaia contextoUsuario
) {

    if (contextoUsuario == null) {
        return """
                CONTEXTO REAL DA USUÃRIA
                Dados da usuÃ¡ria nÃ£o disponÃ­veis. NÃ£o invente.
                """;
    }

    String nome =
            valorOuNaoInformado(
                    contextoUsuario.nome()
            );

    String primeiroNome =
            "nÃ£o informado";

    if (
            contextoUsuario.nome() != null &&
            !contextoUsuario.nome().isBlank()
    ) {
        primeiroNome =
                contextoUsuario
                        .nome()
                        .trim()
                        .split("\\s+")[0];
    }

    List<Viagem> viagens =
            contextoUsuario.viagens() == null
                    ? List.of()
                    : contextoUsuario.viagens();

    long viagensFinalizadas =
            viagens.stream()
                    .filter(
                            viagem ->
                                    viagem != null &&
                                    "FINALIZADA".equalsIgnoreCase(
                                            String.valueOf(
                                                    viagem.getStatus()
                                            )
                                    )
                    )
                    .count();

    long viagensPlanejadas =
            viagens.stream()
                    .filter(
                            viagem ->
                                    viagem != null &&
                                    "PLANEJADA".equalsIgnoreCase(
                                            String.valueOf(
                                                    viagem.getStatus()
                                            )
                                    )
                    )
                    .count();

    long viagensEmAndamento =
            viagens.stream()
                    .filter(
                            viagem ->
                                    viagem != null &&
                                    "EM_ANDAMENTO".equalsIgnoreCase(
                                            String.valueOf(
                                                    viagem.getStatus()
                                            )
                                    )
                    )
                    .count();

    long viagensCanceladas =
            viagens.stream()
                    .filter(
                            viagem ->
                                    viagem != null &&
                                    "CANCELADA".equalsIgnoreCase(
                                            String.valueOf(
                                                    viagem.getStatus()
                                            )
                                    )
                    )
                    .count();

    StringBuilder contexto =
            new StringBuilder();

    contexto
            .append("CONTEXTO REAL DA USUÃRIA\n")
            .append("Nome: ")
            .append(nome)
            .append("\n")
            .append("Primeiro nome: ")
            .append(primeiroNome)
            .append("\n")
            .append("Telefone: ")
            .append(
                    valorOuNaoInformado(
                            contextoUsuario.telefone()
                    )
            )
            .append("\n")
            .append("Contato de emergÃªncia - nome: ")
            .append(
                    valorOuNaoInformado(
                            contextoUsuario.contatoEmergenciaNome()
                    )
            )
            .append("\n")
            .append("Contato de emergÃªncia - telefone: ")
            .append(
                    valorOuNaoInformado(
                            contextoUsuario.contatoEmergenciaTelefone()
                    )
            )
            .append("\n")
            .append("Contato de emergÃªncia - relaÃ§Ã£o: ")
            .append(
                    valorOuNaoInformado(
                            contextoUsuario.contatoEmergenciaRelacao()
                    )
            )
            .append("\n\n")
            .append("RESUMO DAS VIAGENS\n")
            .append("Total de viagens cadastradas: ")
            .append(viagens.size())
            .append("\n")
            .append("Viagens anteriores/finalizadas: ")
            .append(viagensFinalizadas)
            .append("\n")
            .append("Viagens em andamento: ")
            .append(viagensEmAndamento)
            .append("\n")
            .append("Viagens futuras/planejadas: ")
            .append(viagensPlanejadas)
            .append("\n")
            .append("Viagens canceladas: ")
            .append(viagensCanceladas)
            .append("\n");

    if (viagens.isEmpty()) {

        contexto.append(
                "\nNenhuma viagem cadastrada para esta usuÃ¡ria.\n"
        );

    } else {

        contexto.append(
                "\nVIAGENS CADASTRADAS\n"
        );

        int indice =
                1;

        for (Viagem viagem : viagens) {

            if (viagem == null) {
                continue;
            }

            contexto
                    .append(indice)
                    .append(". Destino: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getDestino()
                            )
                    )
                    .append(" | Cidade: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getCidade()
                            )
                    )
                    .append(" | Estado: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getEstado()
                            )
                    )
                    .append(" | PaÃ­s: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getPais()
                            )
                    )
                    .append(" | InÃ­cio: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getDataInicio()
                            )
                    )
                    .append(" | Fim: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getDataFim()
                            )
                    )
                    .append(" | Status: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getStatus()
                            )
                    )
                    .append("\n");

            indice++;
        }
    }

    contexto.append(
            """

            REGRAS PARA USO DESTE CONTEXTO:
            - estes dados pertencem Ã  usuÃ¡ria atual do aplicativo;
            - use-os somente quando forem relevantes para a pergunta;
            - "viagens anteriores" significa viagens com status FINALIZADA;
            - viagens CANCELADAS nÃ£o contam como viagens realizadas;
            - nÃ£o invente dados ausentes;
            - nÃ£o diga que nÃ£o possui acesso aos dados quando a informaÃ§Ã£o estiver neste contexto;
            - use o primeiro nome da usuÃ¡ria apenas quando soar natural.
            """
    );

    return contexto.toString();
}

    private String montarContextoViagemAtiva(
            Viagem viagem
    ) {

        if (viagem == null) {
            return """
                    CONTEXTO REAL DA VIAGEM ATIVA
                    Nenhuma viagem em andamento foi encontrada.
                    NÃ£o presuma um destino se ele nÃ£o estiver no histÃ³rico.
                    """;
        }

        return """
                CONTEXTO REAL DA VIAGEM ATIVA
                Destino: %s
                Cidade: %s
                Estado: %s
                PaÃ­s: %s
                InÃ­cio: %s
                Fim: %s
                Latitude do destino: %s
                Longitude do destino: %s

                Estas coordenadas sÃ£o do DESTINO cadastrado, nÃ£o do GPS atual.
                Se CONTEXTO DE LOCAIS REAIS informar GPS_ATUAL, aquela busca
                especÃ­fica usou a localizaÃ§Ã£o fÃ­sica fornecida pelo celular.
                """
                .formatted(
                        valorOuNaoInformado(viagem.getDestino()),
                        valorOuNaoInformado(viagem.getCidade()),
                        valorOuNaoInformado(viagem.getEstado()),
                        valorOuNaoInformado(viagem.getPais()),
                        valorOuNaoInformado(viagem.getDataInicio()),
                        valorOuNaoInformado(viagem.getDataFim()),
                        valorOuNaoInformado(viagem.getLatitude()),
                        valorOuNaoInformado(viagem.getLongitude())
                );
    }

    private String montarContextoLocais(
            List<LocalResponse> locais,
            boolean buscaRealizada,
            List<String> categoriasConsultadas,
            Double latitudeReferencia,
            Double longitudeReferencia,
            String tipoLocalizacaoReferencia
    ) {

        if (
                !buscaRealizada
        ) {
            return "";
        }

        String categorias =
                categoriasConsultadas == null ||
                categoriasConsultadas.isEmpty()
                        ? "nÃ£o informada"
                        : String.join(", ", categoriasConsultadas);

        String referencia =
                tipoLocalizacaoReferencia == null ||
                tipoLocalizacaoReferencia.isBlank()
                        ? "NENHUMA"
                        : tipoLocalizacaoReferencia;

        if (
                locais == null ||
                locais.isEmpty()
        ) {
            return """
                    LOCAIS REAIS
                    busca=sim
                    categoria=%s
                    referencia=%s
                    resultados=0
                    NÃ£o invente alternativas especÃ­ficas.
                    """
                    .formatted(
                            categorias,
                            referencia
                    );
        }

        StringBuilder contexto =
                new StringBuilder();

        contexto
                .append("LOCAIS REAIS\n")
                .append("categoria=")
                .append(categorias)
                .append("\nreferencia=")
                .append(referencia)
                .append("\n");

        int indice =
                1;

        for (
                LocalResponse local :
                locais
        ) {

            if (
                    local == null ||
                    local.getNome() == null ||
                    local.getNome().isBlank()
            ) {
                continue;
            }

            if (
                    indice > 8
            ) {
                break;
            }

            contexto
                    .append(indice)
                    .append(". ")
                    .append(local.getNome());

            Double distanciaMetros =
                    local.getDistanciaMetros();

            if (
                    distanciaMetros != null
            ) {
                contexto
                        .append(" | dist=")
                        .append(
                                formatarDistancia(
                                        distanciaMetros / 1000.0
                                )
                        );
            } else if (
                    latitudeReferencia != null &&
                    longitudeReferencia != null
            ) {

                double distanciaKm =
                        calcularDistanciaKm(
                                latitudeReferencia,
                                longitudeReferencia,
                                local.getLatitude(),
                                local.getLongitude()
                        );

                contexto
                        .append(" | dist=")
                        .append(
                                formatarDistancia(
                                        distanciaKm
                                )
                        );
            }

            if (
                    local.getEndereco() != null &&
                    !local.getEndereco().isBlank()
            ) {
                contexto
                        .append(" | end=")
                        .append(local.getEndereco());
            }

            if (
                    local.getSite() != null &&
                    !local.getSite().isBlank()
            ) {
                contexto
                        .append(" | site=")
                        .append(local.getSite());
            }

            if (
                    local.getTelefone() != null &&
                    !local.getTelefone().isBlank()
            ) {
                contexto
                        .append(" | tel=")
                        .append(local.getTelefone());
            }

            if (
                    local.getHorarioFuncionamento() != null &&
                    !local.getHorarioFuncionamento().isBlank()
            ) {
                contexto
                        .append(" | horario=")
                        .append(local.getHorarioFuncionamento());
            }

            contexto.append("\n");

            indice++;
        }

        contexto.append(
                """
                Use somente os locais acima. NÃ£o invente dados ausentes.
                DistÃ¢ncias sÃ£o em linha reta.
                """
        );

        return contexto.toString();
    }

    private String formatarDistancia(
            double distanciaKm
    ) {

        if (
                distanciaKm < 1.0
        ) {

            long metros =
                    Math.round(
                            distanciaKm * 1000.0
                    );

            return metros
                    + " m";
        }

        return String.format(
                Locale.forLanguageTag("pt-BR"),
                "%.1f km",
                distanciaKm
        );
    }

    private double calcularDistanciaKm(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {

        final double raioTerraKm =
                6371.0;

        double dLat =
                Math.toRadians(
                        lat2 - lat1
                );

        double dLon =
                Math.toRadians(
                        lon2 - lon1
                );

        double a =
                Math.sin(dLat / 2)
                        * Math.sin(dLat / 2)
                        + Math.cos(
                                Math.toRadians(lat1)
                        )
                        * Math.cos(
                                Math.toRadians(lat2)
                        )
                        * Math.sin(dLon / 2)
                        * Math.sin(dLon / 2);

        double c =
                2
                        * Math.atan2(
                                Math.sqrt(a),
                                Math.sqrt(1 - a)
                        );

        return raioTerraKm * c;
    }

    private String montarContextoMare(
        MareResponse mare
) {

    if (mare == null) {

        return """
                CONTEXTO REAL DE MARÃ‰

                A marÃ© nÃ£o foi consultada nesta interaÃ§Ã£o.

                REGRA OBRIGATÃ“RIA:
                - isso NÃƒO significa que o destino nÃ£o possui litoral;
                - isso NÃƒO significa que a marÃ© nÃ£o Ã© aplicÃ¡vel;
                - apenas significa que o backend nÃ£o consultou o serviÃ§o
                  de marÃ© para esta mensagem;
                - nÃ£o invente horÃ¡rios, alturas ou condiÃ§Ãµes de marÃ©.
                """;
    }

    /*
     * O MareService jÃ¡ verificou se existe costa suficientemente
     * prÃ³xima das coordenadas consultadas.
     *
     * Portanto, disponivel=false Ã© diferente de mare=null:
     *
     * null  -> a marÃ© nÃ£o foi consultada nesta interaÃ§Ã£o.
     * false -> foi consultada e o backend determinou que a
     *          informaÃ§Ã£o de marÃ© nÃ£o Ã© aplicÃ¡vel/disponÃ­vel
     *          para essas coordenadas.
     */
    if (!mare.disponivel()) {

        return """
                CONTEXTO REAL DE MARÃ‰

                CONSULTA REALIZADA: SIM
                MARÃ‰ APLICÃVEL/DISPONÃVEL PARA AS COORDENADAS: NÃƒO

                O backend verificou as coordenadas consultadas e determinou
                que nÃ£o hÃ¡ informaÃ§Ã£o de marÃ© aplicÃ¡vel/disponÃ­vel para
                esse local.

                REGRA OBRIGATÃ“RIA:
                - nÃ£o forneÃ§a horÃ¡rios de marÃ©;
                - nÃ£o forneÃ§a alturas de marÃ©;
                - nÃ£o use dados de outra cidade ou litoral distante;
                - nÃ£o invente uma estaÃ§Ã£o;
                - se a usuÃ¡ria perguntar sobre marÃ© nesse local, diga apenas
                que nÃ£o hÃ¡ informaÃ§Ã£o de marÃ© aplicÃ¡vel/disponÃ­vel para
                as coordenadas consultadas;
                - NÃƒO invente uma explicaÃ§Ã£o geogrÃ¡fica para isso;
                - NÃƒO classifique a cidade como "interiorana", "litorÃ¢nea",
                "costeira", "longe do litoral" ou qualquer outra
                caracterizaÃ§Ã£o geogrÃ¡fica que nÃ£o tenha sido fornecida
                pelo backend;
                - NÃƒO tente explicar por que a marÃ© nÃ£o estÃ¡ disponÃ­vel;
                - nÃ£o diga apenas que "nÃ£o houve consulta", porque a consulta
                de aplicabilidade foi realizada.

                """;
    }

    StringBuilder contexto =
            new StringBuilder();

    contexto.append(
            """
            CONTEXTO REAL DE MARÃ‰

            CONSULTA REALIZADA: SIM
            MARÃ‰ APLICÃVEL/DISPONÃVEL PARA AS COORDENADAS: SIM

            Os horÃ¡rios abaixo jÃ¡ incluem o offset retornado
            pelo provedor.
            """
    );

    if (
            mare.estacao() != null &&
            !mare.estacao().isBlank()
    ) {

        contexto
                .append(
                        "\nEstaÃ§Ã£o de referÃªncia: "
                )
                .append(
                        mare.estacao()
                );
    }

    if (
            mare.datum() != null &&
            !mare.datum().isBlank()
    ) {

        contexto
                .append(
                        "\nDatum: "
                )
                .append(
                        mare.datum()
                );
    }

    adicionarEventoMare(
            contexto,
            "\nPrÃ³xima marÃ© baixa",
            mare.proximaMareBaixa()
    );

    adicionarEventoMare(
            contexto,
            "\nPrÃ³xima marÃ© alta",
            mare.proximaMareAlta()
    );

    if (
            mare.eventos() != null &&
            !mare.eventos().isEmpty()
    ) {

        contexto.append(
                "\n\nEventos disponÃ­veis:"
        );

        for (
                MareEventoResponse evento :
                mare.eventos()
        ) {

            if (
                    evento == null ||
                    evento.dataHora() == null
            ) {
                continue;
            }

            contexto
                    .append(
                            "\n- "
                    )
                    .append(
                            evento.tipo() != null
                                    ? evento.tipo()
                                    : "MARÃ‰"
                    )
                    .append(
                            " | "
                    )
                    .append(
                            evento.dataHora()
                    );

            if (
                    evento.altura() != null
            ) {

                contexto
                        .append(
                                " | altura: "
                        )
                        .append(
                                evento.altura()
                        )
                        .append(
                                " m"
                        );
            }
        }
    }

    contexto.append(
            """

            REGRAS PARA USO DOS DADOS DE MARÃ‰:
            - use somente os eventos fornecidos acima;
            - nÃ£o invente eventos, horÃ¡rios ou alturas;
            - para "amanhÃ£", respeite a data de cada evento;
            - para "agora" ou "mais tarde", compare os horÃ¡rios
              e offsets recebidos;
            - nÃ£o transforme altura de marÃ© em classificaÃ§Ã£o de
              perigo sem que exista dado especÃ­fico para isso;
            - se um dado nÃ£o estiver presente, diga que ele nÃ£o
              estÃ¡ disponÃ­vel.
            """
    );

    return contexto.toString();
}

    private void adicionarEventoMare(
            StringBuilder contexto,
            String rotulo,
            MareEventoResponse evento
    ) {

        if (
                evento == null ||
                evento.dataHora() == null
        ) {
            return;
        }

        contexto
                .append(
                        rotulo
                )
                .append(
                        ": "
                )
                .append(
                        evento.dataHora()
                );

        if (
                evento.altura() != null
        ) {
            contexto
                    .append(
                            " | altura: "
                    )
                    .append(
                            evento.altura()
                    )
                    .append(
                            " m"
                    );
        }
    }

    private String montarContextoClima(
        ClimaResponse clima,
        String tipoLocalizacaoReferencia
) {

    if (clima == null) {

        return """
                CONTEXTO REAL DE CLIMA

                O clima nÃ£o foi consultado nesta interaÃ§Ã£o.

                REGRA OBRIGATÃ“RIA:
                - nÃ£o invente condiÃ§Ã£o atual;
                - nÃ£o invente temperatura;
                - nÃ£o invente chuva, neve, vento, rajadas,
                  neblina ou tempestade;
                - nÃ£o use conhecimento geral sobre o clima da
                  cidade como se fosse uma observaÃ§Ã£o atual.
                """;
    }

    String tipoReferencia =
            tipoLocalizacaoReferencia == null ||
            tipoLocalizacaoReferencia.isBlank()
                    ? "NAO_INFORMADA"
                    : tipoLocalizacaoReferencia;

    try {

        String climaJson =
                objectMapper.writeValueAsString(
                        clima
                );

        String regrasInterpretacao =
                """
                REGRAS DE INTERPRETAÃ‡ÃƒO DOS DADOS CLIMÃTICOS:
                - use exclusivamente os valores fornecidos pelo backend;
                - temperatura e sensaÃ§Ã£o tÃ©rmica sÃ£o informaÃ§Ãµes diferentes;
                - probabilidade de chuva Ã© probabilidade, nÃ£o confirmaÃ§Ã£o
                  de que estÃ¡ chovendo;
                - use neve somente quando os dados fornecidos indicarem neve;
                - os cÃ³digos meteorolÃ³gicos 45 e 48 representam condiÃ§Ã£o
                  de neblina/nevoeiro;
                - os cÃ³digos meteorolÃ³gicos 71, 73, 75, 77, 85 e 86
                  representam condiÃ§Ãµes relacionadas a neve;
                - cÃ³digos meteorolÃ³gicos 95, 96 e 99 representam
                  condiÃ§Ãµes de tempestade/trovoada;
                - vento e rajadas devem ser informados usando os valores
                  reais recebidos;
                - nÃ£o transforme automaticamente velocidade do vento,
                  rajadas ou probabilidade de chuva em alerta oficial,
                  nÃ­vel de perigo ou recomendaÃ§Ã£o de emergÃªncia;
                - nÃ£o invente visibilidade, Ã­ndice UV, qualidade do ar,
                  umidade ou qualquer variÃ¡vel que nÃ£o esteja nos dados;
                - para perguntas como "preciso levar casaco?", "vou passar
                  frio?" ou semelhantes, use temperatura, sensaÃ§Ã£o tÃ©rmica
                  e previsÃ£o disponÃ­vel para dar uma orientaÃ§Ã£o prÃ¡tica,
                  deixando claro quando for uma sugestÃ£o;
                - para perguntas sobre as prÃ³ximas horas, priorize
                  previsaoProximasHoras;
                - nÃ£o extrapole a previsÃ£o alÃ©m do perÃ­odo efetivamente
                  fornecido pelo backend.
                """;

        // =====================================================
        // CLIMA DA LOCALIZAÃ‡ÃƒO FÃSICA ATUAL
        // =====================================================

        if (
                "GPS_ATUAL".equalsIgnoreCase(
                        tipoReferencia
                )
        ) {

            return """
                    CONTEXTO REAL DE CLIMA

                    REFERÃŠNCIA DO CLIMA: GPS_ATUAL

                    Os dados climÃ¡ticos abaixo pertencem Ã  localizaÃ§Ã£o
                    fÃ­sica atual da usuÃ¡ria, obtida pelas coordenadas
                    fornecidas pelo GPS do celular.

                    %s

                    REGRA DE LOCALIZAÃ‡ÃƒO:
                    - estes dados NÃƒO pertencem necessariamente ao destino
                      cadastrado na viagem ativa;
                    - NÃƒO use o destino da viagem ativa como nome desta
                      localizaÃ§Ã£o;
                    - NÃƒO diga "em Pipa", "em [destino]" ou equivalente
                      apenas porque existe uma viagem ativa;
                    - se o sistema nÃ£o forneceu o nome real da cidade
                      correspondente ao GPS, diga "na sua localizaÃ§Ã£o atual",
                      "onde vocÃª estÃ¡ agora" ou equivalente;
                    - nÃ£o invente o nome da cidade a partir das coordenadas;
                    - dataHoraLocal corresponde Ã  referÃªncia climÃ¡tica
                      consultada, nÃ£o ao destino da viagem;
                    - finalize com uma dica para a usuaria relacionada ao clima, se for relevante para a pergunta dela.


                    %s
                    """
                    .formatted(
                            climaJson,
                            regrasInterpretacao
                    );
        }

        // =====================================================
        // CLIMA DO DESTINO DA VIAGEM
        // =====================================================

        return """
                CONTEXTO REAL DE CLIMA

                REFERÃŠNCIA DO CLIMA: DESTINO_VIAGEM

                Os dados climÃ¡ticos abaixo pertencem ao destino
                cadastrado na viagem ativa.

                %s

                REGRA DE LOCALIZAÃ‡ÃƒO:
                - estes dados correspondem ao destino da viagem;
                - o nome do destino pode ser obtido no
                  CONTEXTO REAL DA VIAGEM ATIVA;
                - dataHoraLocal corresponde Ã  referÃªncia climÃ¡tica
                  consultada.

                %s
                """
                .formatted(
                        climaJson,
                        regrasInterpretacao
                );

    } catch (Exception e) {

        return """
                CONTEXTO REAL DE CLIMA

                Os dados climÃ¡ticos nÃ£o puderam ser preparados
                para esta interaÃ§Ã£o.

                NÃ£o invente valores ou condiÃ§Ãµes meteorolÃ³gicas.
                """;
    }
}

    // =========================================================
    // RECOMENDAÃ‡ÃƒO DE DESTINOS
    // =========================================================

    public RecomendacaoResponse recomendarDestinos(
            PlanejamentoRequest planejamento
    ) {
        try {
            String perfil = montarPromptUsuario(planejamento);

            /*
             * ETAPA 1: escolhe somente os nomes de 1 a 3 cidades.
             * A resposta Ã© propositalmente pequena para que o modelo nÃ£o
             * gaste a janela de saÃ­da descrevendo o primeiro destino e deixe
             * de completar os demais.
             */
            String promptSelecao = """
                    VocÃª Ã© a maIA, assistente de viagens do aplicativo MAIA.
                    Analise o perfil da viajante e escolha de 1 a 3 cidades
                    DIFERENTES que realmente atendam bem ao conjunto completo.

                    Ordem de importÃ¢ncia:
                    1. restriÃ§Ã£o geogrÃ¡fica, quando houver;
                    2. requisitos indispensÃ¡veis;
                    3. interesses;
                    4. perÃ­odo, orÃ§amento, ritmo e mobilidade.

                    Os requisitos indispensÃ¡veis jÃ¡ representam o que Ã© mais
                    importante e nÃ£o pode faltar. NÃ£o conte o mesmo critÃ©rio duas
                    vezes mesmo que ele tambÃ©m apareÃ§a no texto livre.

                    NÃ£o invente caracterÃ­sticas para fazer uma cidade caber no
                    perfil. Retorne no mÃ¡ximo 3 opÃ§Ãµes. Se somente 1 ou 2 cidades
                    tiverem boa aderÃªncia ao perfil, retorne apenas essas opÃ§Ãµes.
                    NÃ£o force uma terceira cidade de baixa compatibilidade.

                    Retorne APENAS JSON vÃ¡lido e curto neste formato:
                    {"destinos":[
                      {"cidade":"string","estadoOuRegiao":"string","pais":"string"}
                    ]}

                    O array destinos deve conter no mÃ­nimo 1 e no mÃ¡ximo 3 cidades
                    diferentes.
                    """;

            Map<String, Object> corpoSelecao =
                    Map.of(
                            "model", model,
                            "messages", List.of(
                                    Map.of("role", "system", "content", promptSelecao),
                                    Map.of("role", "user", "content", perfil)
                            ),
                            "temperature", 0.2,
                            "max_completion_tokens", 500,
                            "response_format", Map.of("type", "json_object")
                    );

            System.out.println(
                    "Planejamento maIA - etapa 1/3: selecionando de 1 a 3 cidades."
            );

            String conteudoSelecao = executarRequisicao(corpoSelecao);
            JsonNode jsonSelecao = objectMapper.readTree(conteudoSelecao);
            JsonNode destinosSelecionados = jsonSelecao.path("destinos");

            if (
                    !destinosSelecionados.isArray() ||
                    destinosSelecionados.isEmpty() ||
                    destinosSelecionados.size() > 3
            ) {
                throw new IllegalStateException(
                        "A maIA deve selecionar entre 1 e 3 cidades."
                );
            }

            List<String> cidades = new ArrayList<>();
            Set<String> cidadesNormalizadas = new HashSet<>();

            for (JsonNode destino : destinosSelecionados) {
                String cidade = destino.path("cidade").asText("").trim();
                String estado = destino.path("estadoOuRegiao").asText("").trim();
                String pais = destino.path("pais").asText("").trim();

                if (cidade.isBlank()) {
                    throw new IllegalStateException(
                            "A maIA retornou uma cidade vazia na seleÃ§Ã£o."
                    );
                }

                String normalizada = normalizarCidadeRecomendacao(cidade);
                if (!cidadesNormalizadas.add(normalizada)) {
                    throw new IllegalStateException(
                            "A maIA repetiu uma cidade na seleÃ§Ã£o: " + cidade + "."
                    );
                }

                cidades.add(
                        cidade
                                + (estado.isBlank() ? "" : ", " + estado)
                                + (pais.isBlank() ? "" : ", " + pais)
                );
            }

            System.out.println(
                    "Planejamento maIA - cidades selecionadas: "
                            + String.join(" | ", cidades)
            );

            /*
             * ETAPA 2: detalha cada cidade individualmente.
             *
             * A etapa de seleÃ§Ã£o pode retornar 1, 2 ou 3 cidades. Em vez de
             * pedir ao modelo que detalhe todas em um Ãºnico JSON grande,
             * fazemos uma chamada curta para cada cidade. Isso evita que o
             * modelo omita uma das cidades durante o detalhamento.
             *
             * O Java reÃºne os resultados em um Ãºnico JSON, valida a quantidade,
             * garante que nenhuma cidade foi trocada ou repetida e sÃ³ entÃ£o
             * converte para RecomendacaoResponse.
             */
            com.fasterxml.jackson.databind.node.ArrayNode destinosDetalhados =
                    objectMapper.createArrayNode();

            for (String cidadeSelecionada : cidades) {

                String promptDetalhamento = """
                        VocÃª Ã© a maIA, assistente inteligente de viagens do MAIA,
                        voltado principalmente para mulheres que viajam sozinhas.

                        A cidade abaixo JÃ FOI selecionada e validada pelo sistema.
                        NÃƒO troque a cidade e NÃƒO recomende outra.
                        Analise e detalhe SOMENTE esta cidade.

                        CIDADE SELECIONADA:
                        %s

                        Explique concretamente como ela atende ou deixa de atender
                        requisitos indispensÃ¡veis, interesses, mobilidade, ritmo,
                        perÃ­odo e orÃ§amento. Quando houver uma limitaÃ§Ã£o importante,
                        coloque-a em pontosDeAtencao.

                        REGRA SEMÃ‚NTICA OBRIGATÃ“RIA:
                        Quando o perfil mencionar "Ãguas quentes" ou
                        "Ãgua do mar quente / morna" em contexto de praia, mar,
                        litoral, banho, piscinas naturais ou destino costeiro, isso
                        significa temperatura agradÃ¡vel da ÃGUA DO MAR. NÃ£o interprete
                        como Ã¡guas termais, fontes termais, termas ou nascentes quentes,
                        a menos que a viajante peÃ§a explicitamente por termas ou Ã¡guas
                        termais.

                        SEGURANÃ‡A:
                        O MAIA Ã© voltado principalmente para mulheres que viajam
                        sozinhas. NÃ£o invente Ã­ndices de criminalidade, estatÃ­sticas,
                        policiamento ou garantias de que um lugar Ã© seguro.
                        Sem dados atuais fornecidos pelo sistema, trate seguranÃ§a como
                        orientaÃ§Ã£o prÃ¡tica e contextual. NÃ£o afirme que uma cidade Ã©
                        "segura" ou "insegura" como fato nÃ£o verificado.

                        Considere o perÃ­odo informado como contexto sazonal, mas nÃ£o
                        invente previsÃ£o meteorolÃ³gica futura, preÃ§os exatos ou fatos
                        dos quais nÃ£o tenha confianÃ§a razoÃ¡vel.

                        Retorne APENAS JSON vÃ¡lido, sem Markdown, exatamente assim:
                        {"destinos":[{
                          "cidade":"string",
                          "estadoOuRegiao":"string",
                          "pais":"string",
                          "resumo":"string",
                          "porQueCombina":"string",
                          "seguranca":"string",
                          "mobilidade":"string",
                          "clima":"string",
                          "melhorRegiaoParaFicar":"string",
                          "caracteristicasRelevantes":["string"],
                          "pontosPositivos":["string"],
                          "pontosDeAtencao":["string"]
                        }]}

                        O array destinos deve conter EXATAMENTE 1 item e esse item
                        deve corresponder Ã  cidade selecionada acima.
                        Use de 3 a 5 itens curtos em caracteristicasRelevantes e
                        pontosPositivos e de 1 a 3 itens em pontosDeAtencao quando
                        houver limitaÃ§Ãµes.
                        """.formatted(cidadeSelecionada);

                Map<String, Object> corpoDetalhamento =
                        Map.of(
                                "model", model,
                                "messages", List.of(
                                        Map.of(
                                                "role",
                                                "system",
                                                "content",
                                                promptDetalhamento
                                        ),
                                        Map.of(
                                                "role",
                                                "user",
                                                "content",
                                                perfil
                                                        + "\n\nCRITÃ‰RIOS ESTRUTURADOS PARA AVALIAÃ‡ÃƒO:"
                                                        + "\nREQUISITOS SELECIONADOS: "
                                                        + listaOuNaoInformado(
                                                                planejamento.getRequisitosSelecionados()
                                                        )
                                                        + "\nINTERESSES: "
                                                        + listaOuNaoInformado(
                                                                planejamento.getInteresses()
                                                        )
                                                        + "\nMOBILIDADE: "
                                                        + valorOuNaoInformado(
                                                                planejamento.getMobilidade()
                                                        )
                                                        + "\nRITMO: "
                                                        + valorOuNaoInformado(
                                                                planejamento.getRitmoDestino()
                                                        )
                                                        + "\nPERÃODO: "
                                                        + valorOuNaoInformado(
                                                                planejamento.getPeriodo()
                                                        )
                                                        + "\nORÃ‡AMENTO: "
                                                        + valorOuNaoInformado(
                                                                planejamento.getOrcamento()
                                                        )
                                        )
                                ),
                                "temperature", 0.15,
                                "max_completion_tokens", 1400,
                                "response_format", Map.of(
                                        "type",
                                        "json_object"
                                )
                        );

                System.out.println(
                        "Planejamento maIA - etapa 2/3: detalhando "
                                + cidadeSelecionada
                                + "."
                );

                String conteudoCidade;

                try {

                    conteudoCidade =
                            executarRequisicao(
                                    corpoDetalhamento
                            );

                } catch (IllegalStateException erroGroq) {

                    String mensagemErro =
                            erroGroq.getMessage() == null
                                    ? ""
                                    : erroGroq
                                            .getMessage()
                                            .toLowerCase(
                                                    Locale.ROOT
                                            );

                    boolean falhaDeJson =
                            mensagemErro.contains(
                                    "json_validate_failed"
                            );

                    if (!falhaDeJson) {
                        throw erroGroq;
                    }

                    Map<String, Object> corpoDetalhamentoRetry =
                            new java.util.LinkedHashMap<>(
                                    corpoDetalhamento
                            );

                    corpoDetalhamentoRetry.put(
                            "max_completion_tokens",
                            1800
                    );

                    System.out.println(
                            "Planejamento maIA - detalhamento de "
                                    + cidadeSelecionada
                                    + " retornou JSON invÃ¡lido. "
                                    + "Repetindo somente esta cidade uma vez com "
                                    + "max_completion_tokens=1800."
                    );

                    conteudoCidade =
                            executarRequisicao(
                                    corpoDetalhamentoRetry,
                                    false
                            );
                }

                JsonNode jsonCidade =
                        objectMapper.readTree(
                                conteudoCidade
                        );

                JsonNode destinosCidade =
                        jsonCidade.path(
                                "destinos"
                        );

                if (
                        !destinosCidade.isArray() ||
                        destinosCidade.size() != 1
                ) {
                    throw new IllegalStateException(
                            "A maIA nÃ£o conseguiu detalhar corretamente a cidade "
                                    + cidadeSelecionada
                                    + "."
                    );
                }

                JsonNode destinoDetalhado =
                        destinosCidade.get(0);

                String cidadeRetornada =
                        destinoDetalhado
                                .path("cidade")
                                .asText("")
                                .trim();

                if (cidadeRetornada.isBlank()) {
                    throw new IllegalStateException(
                            "A maIA retornou um detalhamento sem cidade vÃ¡lida."
                    );
                }

                String cidadeSelecionadaSemLocalizacao =
                        cidadeSelecionada
                                .split(",")[0]
                                .trim();

                if (
                        !normalizarCidadeRecomendacao(
                                cidadeRetornada
                        ).equals(
                                normalizarCidadeRecomendacao(
                                        cidadeSelecionadaSemLocalizacao
                                )
                        )
                ) {
                    throw new IllegalStateException(
                            "A maIA trocou a cidade "
                                    + cidadeSelecionadaSemLocalizacao
                                    + " por "
                                    + cidadeRetornada
                                    + " durante o detalhamento."
                    );
                }

                String promptAvaliacao = """
                        VocÃª Ã© o mÃ³dulo de avaliaÃ§Ã£o semÃ¢ntica do planejamento MAIA.

                        Avalie SOMENTE a cidade abaixo contra os critÃ©rios estruturados
                        da viajante. NÃƒO escreva descriÃ§Ã£o turÃ­stica, explicaÃ§Ãµes,
                        percentuais, notas ou comentÃ¡rios.

                        CIDADE:
                        %s

                        REQUISITOS SELECIONADOS:
                        %s

                        INTERESSES:
                        %s

                        MOBILIDADE:
                        %s

                        RITMO:
                        %s

                        PERÃODO:
                        %s

                        ORÃ‡AMENTO:
                        %s

                        CONTEXTO LIVRE DA VIAJANTE:
                        %s

                        Use somente os status:
                        ATENDE, PARCIAL, NAO_ATENDE ou NAO_VERIFICAVEL.

                        Seja crÃ­tico. Sua funÃ§Ã£o nÃ£o Ã© confirmar a recomendaÃ§Ã£o,
                        mas avaliar cada critÃ©rio de forma independente.

                        ATENDE: hÃ¡ base suficiente para concluir que a cidade atende.
                        PARCIAL: atende apenas em parte, depende da regiÃ£o, deslocamento
                        ou de alguma condiÃ§Ã£o relevante.
                        NAO_ATENDE: hÃ¡ incompatibilidade clara com o pedido.
                        NAO_VERIFICAVEL: faltam dados suficientes para uma conclusÃ£o
                        responsÃ¡vel.

                        NÃ£o marque ATENDE por suposiÃ§Ã£o. Em especial, orÃ§amento nÃ£o
                        pode ser considerado atendido sem dados suficientes de custos
                        da viagem. PerÃ­odo pode ser avaliado apenas quanto a
                        caracterÃ­sticas sazonais gerais; nÃ£o invente previsÃ£o do tempo.

                        Regras:
                        1. Em avaliacoesRequisitos, devolva exatamente um item para
                           cada requisito recebido, preservando o texto de criterio.
                        2. Em avaliacoesInteresses, devolva exatamente um item para
                           cada interesse recebido, preservando o texto de criterio.
                        3. Avalie cada campo de forma independente. Se mobilidade jÃ¡
                           representar essencialmente um requisito selecionado, marque
                           avaliacaoMobilidade como NAO_VERIFICAVEL para evitar
                           pontuaÃ§Ã£o duplicada; o requisito continua sendo avaliado
                           normalmente.
                        4. O texto livre ajuda na interpretaÃ§Ã£o, mas nÃ£o cria pontos
                           extras e nÃ£o duplica critÃ©rios.
                        5. "Ãguas quentes" em contexto de praia significa Ã¡gua do mar
                           quente ou morna, nÃ£o Ã¡guas termais.
                        6. NÃ£o calcule compatibilidade. O Java farÃ¡ a conta.

                        SEGURANÃ‡A EM TODO O JSON:
                        O MAIA Ã© voltado principalmente para mulheres que viajam
                        sozinhas. Sem dados atuais e verificÃ¡veis fornecidos pelo
                        sistema, nÃ£o afirme em nenhum campo que uma cidade, bairro,
                        regiÃ£o, rua ou zona Ã© "segura", "insegura", "tranquila",
                        "bem policiada" ou equivalente como fato. Isso vale para
                        seguranca, melhorRegiaoParaFicar, resumo, porQueCombina e
                        quaisquer listas. Prefira orientaÃ§Ãµes prÃ¡ticas e deixe clara
                        a limitaÃ§Ã£o quando nÃ£o houver dados atuais.

                        Retorne APENAS JSON vÃ¡lido neste formato:
                        {
                          "avaliacoesRequisitos":[
                            {"criterio":"string","status":"ATENDE"}
                          ],
                          "avaliacoesInteresses":[
                            {"criterio":"string","status":"ATENDE"}
                          ],
                          "avaliacaoMobilidade":"ATENDE",
                          "avaliacaoRitmo":"ATENDE",
                          "avaliacaoPeriodo":"ATENDE",
                          "avaliacaoOrcamento":"ATENDE"
                        }
                        """.formatted(
                                cidadeSelecionada,
                                listaOuNaoInformado(
                                        planejamento.getRequisitosSelecionados()
                                ),
                                listaOuNaoInformado(
                                        planejamento.getInteresses()
                                ),
                                valorOuNaoInformado(
                                        planejamento.getMobilidade()
                                ),
                                valorOuNaoInformado(
                                        planejamento.getRitmoDestino()
                                ),
                                valorOuNaoInformado(
                                        planejamento.getPeriodo()
                                ),
                                valorOuNaoInformado(
                                        planejamento.getOrcamento()
                                ),
                                valorOuNaoInformado(
                                        planejamento.getRequisitosIndispensaveis()
                                )
                        );

                Map<String, Object> corpoAvaliacao =
                        Map.of(
                                "model", model,
                                "messages", List.of(
                                        Map.of(
                                                "role",
                                                "system",
                                                "content",
                                                promptAvaliacao
                                        )
                                ),
                                "temperature", 0.0,
                                "max_completion_tokens", 700,
                                "response_format", Map.of(
                                        "type",
                                        "json_object"
                                )
                        );

                System.out.println(
                        "Planejamento maIA - etapa 3/3: avaliando critÃ©rios de "
                                + cidadeSelecionada
                                + "."
                );

                String conteudoAvaliacao;

                try {

                    conteudoAvaliacao =
                            executarRequisicao(
                                    corpoAvaliacao
                            );

                } catch (IllegalStateException erroAvaliacao) {

                    String mensagemErroAvaliacao =
                            erroAvaliacao.getMessage() == null
                                    ? ""
                                    : erroAvaliacao
                                            .getMessage()
                                            .toLowerCase(
                                                    Locale.ROOT
                                            );

                    if (
                            !mensagemErroAvaliacao.contains(
                                    "json_validate_failed"
                            )
                    ) {
                        throw erroAvaliacao;
                    }

                    Map<String, Object> corpoAvaliacaoRetry =
                            new java.util.LinkedHashMap<>(
                                    corpoAvaliacao
                            );

                    corpoAvaliacaoRetry.put(
                            "max_completion_tokens",
                            1000
                    );

                    System.out.println(
                            "Planejamento maIA - avaliaÃ§Ã£o de "
                                    + cidadeSelecionada
                                    + " retornou JSON invÃ¡lido. "
                                    + "Repetindo somente a avaliaÃ§Ã£o uma vez."
                    );

                    conteudoAvaliacao =
                            executarRequisicao(
                                    corpoAvaliacaoRetry,
                                    false
                            );
                }

                JsonNode avaliacaoJson =
                        objectMapper.readTree(
                                conteudoAvaliacao
                        );

                if (
                        !(destinoDetalhado
                                instanceof com.fasterxml.jackson.databind.node.ObjectNode)
                ) {
                    throw new IllegalStateException(
                            "A maIA retornou um destino em formato invÃ¡lido."
                    );
                }

                com.fasterxml.jackson.databind.node.ObjectNode destinoComAvaliacao =
                        (com.fasterxml.jackson.databind.node.ObjectNode)
                                destinoDetalhado;

                destinoComAvaliacao.set(
                        "avaliacoesRequisitos",
                        avaliacaoJson.path(
                                "avaliacoesRequisitos"
                        )
                );

                destinoComAvaliacao.set(
                        "avaliacoesInteresses",
                        avaliacaoJson.path(
                                "avaliacoesInteresses"
                        )
                );

                destinoComAvaliacao.put(
                        "avaliacaoMobilidade",
                        avaliacaoJson
                                .path("avaliacaoMobilidade")
                                .asText("")
                );

                destinoComAvaliacao.put(
                        "avaliacaoRitmo",
                        avaliacaoJson
                                .path("avaliacaoRitmo")
                                .asText("")
                );

                destinoComAvaliacao.put(
                        "avaliacaoPeriodo",
                        avaliacaoJson
                                .path("avaliacaoPeriodo")
                                .asText("")
                );

                destinoComAvaliacao.put(
                        "avaliacaoOrcamento",
                        avaliacaoJson
                                .path("avaliacaoOrcamento")
                                .asText("")
                );

                int compatibilidadeCalculada =
                        calcularCompatibilidadePlanejamento(
                                planejamento,
                                destinoComAvaliacao
                        );

                if (
                        destinoDetalhado
                                instanceof com.fasterxml.jackson.databind.node.ObjectNode
                ) {
                    (
                            (com.fasterxml.jackson.databind.node.ObjectNode)
                                    destinoDetalhado
                    ).put(
                            "compatibilidade",
                            compatibilidadeCalculada
                    );
                } else {
                    throw new IllegalStateException(
                            "A maIA retornou um destino em formato invÃ¡lido."
                    );
                }

                System.out.println(
                        "Planejamento maIA - compatibilidade calculada pelo Java para "
                                + cidadeRetornada
                                + ": "
                                + compatibilidadeCalculada
                                + "%."
                );

                destinosDetalhados.add(
                        destinoDetalhado
                );
            }

            com.fasterxml.jackson.databind.node.ObjectNode respostaFinalJson =
                    objectMapper.createObjectNode();

            respostaFinalJson.set(
                    "destinos",
                    destinosDetalhados
            );

            RecomendacaoResponse recomendacao =
                    objectMapper.treeToValue(
                            respostaFinalJson,
                            RecomendacaoResponse.class
                    );

            validarRecomendacao(
                    recomendacao
            );

            Set<String> cidadesDetalhadas =
                    new HashSet<>();

            recomendacao
                    .getDestinos()
                    .forEach(
                            destino ->
                                    cidadesDetalhadas.add(
                                            normalizarCidadeRecomendacao(
                                                    destino.getCidade()
                                            )
                                    )
                    );

            if (
                    !cidadesDetalhadas.equals(
                            cidadesNormalizadas
                    )
            ) {
                throw new IllegalStateException(
                        "A maIA alterou uma das cidades durante o detalhamento."
                );
            }

            recomendacao
                    .getDestinos()
                    .sort(
                            (a, b) ->
                                    Integer.compare(
                                            b.getCompatibilidade() == null
                                                    ? 0
                                                    : b.getCompatibilidade(),
                                            a.getCompatibilidade() == null
                                                    ? 0
                                                    : a.getCompatibilidade()
                                    )
                    );

            System.out.println(
                    "Planejamento maIA concluÃ­do: "
                            + recomendacao.getDestinos().size()
                            + " cidade(s) distinta(s) e detalhada(s)."
            );

            return recomendacao;

        } catch (Exception e) {
            throw new IllegalStateException(
                    "NÃ£o foi possÃ­vel gerar recomendaÃ§Ãµes: " + e.getMessage(),
                    e
            );
        }
    }

    // =========================================================
    // PROMPT DO PLANEJAMENTO
    // =========================================================

    private String montarPromptUsuario(
            PlanejamentoRequest planejamento
    ) {
        String destinoInformado =
                valorOuNaoInformado(
                        planejamento.getDestino()
                );

        String restricao;

        if (
                planejamento.getDestino() == null ||
                planejamento.getDestino().isBlank() ||
                "AINDA_NAO_SEI".equalsIgnoreCase(planejamento.getDestino())
        ) {
            restricao =
                    "Nenhuma. A viajante aceita recomendaÃ§Ãµes sem regiÃ£o previamente definida.";
        } else {
            restricao =
                    "ObrigatÃ³ria: todas as recomendaÃ§Ãµes devem estar geograficamente em "
                            + destinoInformado
                            + ".";
        }

        return """
                PERFIL DA VIAGEM
                RestriÃ§Ã£o geogrÃ¡fica: %s
                PerÃ­odo: %s
                OrÃ§amento aproximado: %s
                Ritmo desejado: %s
                Mobilidade desejada: %s
                Interesses: %s
                NÃ£o pode faltar / requisitos indispensÃ¡veis: %s
                Detalhes adicionais: %s

                Os requisitos indispensÃ¡veis sÃ£o a Ãºnica lista de critÃ©rios de
                prioridade mÃ¡xima. NÃ£o duplique peso porque um requisito tambÃ©m
                apareÃ§a no texto livre.

                REGRA DE INTERPRETAÃ‡ÃƒO:
                Se "Ãguas quentes" aparecer em contexto de praia, mar, litoral,
                banho ou piscinas naturais, interprete como ÃGUA DO MAR QUENTE OU
                MORNA. NÃ£o interprete como termas ou fontes termais sem pedido
                explÃ­cito da viajante.

                Interprete o texto livre semanticamente. ExpressÃµes como
                "nÃ£o quero", "preciso", "nÃ£o abro mÃ£o", "tem que ter" e
                "indispensÃ¡vel" sÃ£o restriÃ§Ãµes fortes.
                """.formatted(
                        restricao,
                        valorOuNaoInformado(planejamento.getPeriodo()),
                        valorOuNaoInformado(planejamento.getOrcamento()),
                        valorOuNaoInformado(planejamento.getRitmoDestino()),
                        valorOuNaoInformado(planejamento.getMobilidade()),
                        listaOuNaoInformado(planejamento.getInteresses()),
                        valorOuNaoInformado(planejamento.getRequisitosIndispensaveis()),
                        valorOuNaoInformado(planejamento.getObservacoes())
                );
    }

    // =========================================================
    // FUNÃ‡Ã•ES AUXILIARES
    // =========================================================

    private String valorOuNaoInformado(
            Object valor
    ) {

        if (
                valor == null
        ) {
            return "NÃ£o informado";
        }

        String texto =
                valor
                        .toString()
                        .trim();

        if (
                texto.isBlank()
        ) {
            return "NÃ£o informado";
        }

        return texto;
    }

    private String listaOuNaoInformado(
            List<?> lista
    ) {

        if (
                lista == null ||
                lista.isEmpty()
        ) {
            return "Nenhum selecionado";
        }

        return lista
                .toString();
    }

    private void validarRecomendacao(
            RecomendacaoResponse recomendacao
    ) {

        if (
                recomendacao == null ||
                recomendacao.getDestinos() == null
        ) {

            throw new IllegalStateException(
                    "A maIA nÃ£o retornou recomendaÃ§Ãµes vÃ¡lidas."
            );
        }

        int quantidadeRecebida =
                recomendacao
                        .getDestinos()
                        .size();

        if (
                quantidadeRecebida < 1 ||
                quantidadeRecebida > 3
        ) {

            System.out.println(
                    " ValidaÃ§Ã£o de destinos: "
                            + quantidadeRecebida
                            + " recebidos; eram esperados de 1 a 3."
            );

            throw new IllegalStateException(
                    "A maIA deve retornar entre 1 e 3 destinos, mas retornou "
                            + quantidadeRecebida
                            + "."
            );
        }

        Set<String> cidadesUnicas =
                new HashSet<>();

        for (var destino : recomendacao.getDestinos()) {

            String cidade =
                    destino == null ||
                    destino.getCidade() == null
                            ? ""
                            : Normalizer
                                    .normalize(
                                            destino.getCidade().trim(),
                                            Normalizer.Form.NFD
                                    )
                                    .replaceAll("\\p{M}+", "")
                                    .toLowerCase(Locale.ROOT);

            if (cidade.isBlank()) {
                throw new IllegalStateException(
                        "A maIA retornou um destino sem cidade vÃ¡lida."
                );
            }

            cidadesUnicas.add(cidade);
        }

        System.out.println(
                " ValidaÃ§Ã£o de destinos: "
                        + quantidadeRecebida
                        + " recebidos / "
                        + cidadesUnicas.size()
                        + " cidades Ãºnicas."
        );

        if (cidadesUnicas.size() != quantidadeRecebida) {
            throw new IllegalStateException(
                    "A maIA retornou cidades repetidas. "
                            + "Todas as recomendaÃ§Ãµes devem ser cidades diferentes."
            );
        }
    }

    // =========================================================
    // DETECÃ‡ÃƒO DE TOOL USE INDESEJADO NO CHAT
    // =========================================================

    private boolean erroDeTentativaDeToolUse(
            Exception e
    ) {

        if (
                e == null ||
                e.getMessage() == null
        ) {
            return false;
        }

        String mensagemErro =
                e.getMessage()
                        .toLowerCase(
                                Locale.ROOT
                        );

        return
                mensagemErro.contains(
                        "tool choice is none, but model called a tool"
                ) ||
                mensagemErro.contains(
                        "tool_use_failed"
                ) ||
                mensagemErro.contains(
                        "repo_browser.search"
                );
    }

    // =========================================================
    // REQUISIÃ‡ÃƒO PARA GROQ
    // =========================================================

    private String executarRequisicao(
            Map<String, Object> corpo
    ) throws Exception {

        return executarRequisicao(
                corpo,
                true
        );
    }

    private String executarRequisicao(
            Map<String, Object> corpo,
            boolean permitirNovaTentativa
    ) throws Exception {

        String json =
                objectMapper
                        .writeValueAsString(
                                corpo
                        );

        HttpRequest request =
                HttpRequest
                        .newBuilder()
                        .uri(
                                URI.create(
                                        apiUrl
                                )
                        )
                        .header(
                                "Authorization",
                                "Bearer "
                                        + apiKey
                        )
                        .header(
                                "Content-Type",
                                "application/json"
                        )
                        .POST(
                                HttpRequest
                                        .BodyPublishers
                                        .ofString(
                                                json
                                        )
                        )
                        .build();

        HttpResponse<String> response =
                httpClient
                        .send(
                                request,
                                HttpResponse
                                        .BodyHandlers
                                        .ofString()
                        );

        if (
                response.statusCode() < 200 ||
                response.statusCode() >= 300
        ) {

            throw new IllegalStateException(
                    "Erro da Groq. HTTP "
                            + response.statusCode()
                            + ": "
                            + response.body()
            );
        }

        JsonNode respostaJson =
                objectMapper
                        .readTree(
                                response.body()
                        );

        JsonNode primeiraEscolha =
                respostaJson
                        .path(
                                "choices"
                        )
                        .path(
                                0
                        );

        JsonNode content =
                primeiraEscolha
                        .path(
                                "message"
                        )
                        .path(
                                "content"
                        );

        if (
                !content.isMissingNode() &&
                !content.isNull() &&
                !content
                        .asText()
                        .isBlank()
        ) {

            return content
                    .asText();
        }

        String finishReason =
                primeiraEscolha
                        .path(
                                "finish_reason"
                        )
                        .asText(
                                ""
                        );

        JsonNode usage =
                respostaJson
                        .path(
                                "usage"
                        );

        System.out.println(
                " Groq retornou content vazio."
        );

        System.out.println(
                " finish_reason: "
                        + (
                                finishReason.isBlank()
                                        ? "(ausente)"
                                        : finishReason
                        )
        );

        if (
                !usage.isMissingNode() &&
                !usage.isNull()
        ) {

            System.out.println(
                    " usage: "
                            + usage
                                    .toString()
            );
        }

        System.out.println(
                " resposta bruta da Groq: "
                        + response.body()
        );

        /*
         * Alguns modelos podem consumir todo o orÃ§amento de completion
         * antes de produzir o conteÃºdo final. Se isso acontecer, fazemos
         * uma Ãºnica nova tentativa com um orÃ§amento maior.
         */
        if (
                permitirNovaTentativa &&
                "length".equalsIgnoreCase(
                        finishReason
                )
        ) {

            Map<String, Object> corpoNovaTentativa =
                    new java.util.LinkedHashMap<>(
                            corpo
                    );

            Object limiteAtual =
                    corpoNovaTentativa.get(
                            "max_completion_tokens"
                    );

            int novoLimite =
                    2048;

            if (
                    limiteAtual instanceof Number numero
            ) {

                novoLimite =
                        Math.max(
                                2048,
                                numero.intValue() * 2
                        );
            }

            corpoNovaTentativa.put(
                    "max_completion_tokens",
                    novoLimite
            );

            System.out.println(
                    " Repetindo chamada Ã  Groq com max_completion_tokens="
                            + novoLimite
            );

            return executarRequisicao(
                    corpoNovaTentativa,
                    false
            );
        }

        throw new IllegalStateException(
                "A Groq respondeu sem conteÃºdo. finish_reason="
                        + (
                                finishReason.isBlank()
                                        ? "(ausente)"
                                        : finishReason
                        )
        );
    }


    private int calcularCompatibilidadePlanejamento(
            PlanejamentoRequest planejamento,
            JsonNode destinoDetalhado
    ) {

        List<String> requisitos =
                planejamento.getRequisitosSelecionados() == null
                        ? List.of()
                        : planejamento.getRequisitosSelecionados();

        List<String> interesses =
                planejamento.getInteresses() == null
                        ? List.of()
                        : planejamento.getInteresses();

        ResultadoBloco requisitosResultado =
                calcularBlocoLista(
                        requisitos,
                        destinoDetalhado.path("avaliacoesRequisitos"),
                        60.0,
                        "requisitos indispensÃ¡veis"
                );

        ResultadoBloco interessesResultado =
                calcularBlocoLista(
                        interesses,
                        destinoDetalhado.path("avaliacoesInteresses"),
                        20.0,
                        "interesses"
                );

        ResultadoCriterio mobilidadeResultado =
                calcularCriterioUnico(
                        destinoDetalhado.path("avaliacaoMobilidade").asText(""),
                        5.0,
                        "mobilidade"
                );

        ResultadoCriterio ritmoResultado =
                calcularCriterioUnico(
                        destinoDetalhado.path("avaliacaoRitmo").asText(""),
                        5.0,
                        "ritmo"
                );

        ResultadoCriterio periodoResultado =
                calcularCriterioUnico(
                        destinoDetalhado.path("avaliacaoPeriodo").asText(""),
                        5.0,
                        "perÃ­odo"
                );

        ResultadoCriterio orcamentoResultado =
                calcularCriterioUnico(
                        destinoDetalhado.path("avaliacaoOrcamento").asText(""),
                        5.0,
                        "orÃ§amento"
                );

        double pontosObtidos =
                requisitosResultado.pontosObtidos()
                        + interessesResultado.pontosObtidos()
                        + mobilidadeResultado.pontosObtidos()
                        + ritmoResultado.pontosObtidos()
                        + periodoResultado.pontosObtidos()
                        + orcamentoResultado.pontosObtidos();

        double pesoAvaliado =
                requisitosResultado.pesoAvaliado()
                        + interessesResultado.pesoAvaliado()
                        + mobilidadeResultado.pesoAvaliado()
                        + ritmoResultado.pesoAvaliado()
                        + periodoResultado.pesoAvaliado()
                        + orcamentoResultado.pesoAvaliado();

        if (pesoAvaliado <= 0.0) {
            throw new IllegalStateException(
                    "NÃ£o houve critÃ©rios verificÃ¡veis suficientes para calcular a compatibilidade."
            );
        }

        int compatibilidade =
                (int) Math.round(
                        Math.max(
                                0.0,
                                Math.min(
                                        100.0,
                                        (pontosObtidos / pesoAvaliado) * 100.0
                                )
                        )
                );

        int cobertura =
                (int) Math.round(
                        Math.max(
                                0.0,
                                Math.min(
                                        100.0,
                                        pesoAvaliado
                                )
                        )
                );

        System.out.println(
                " Compatibilidade Java:"
                        + " requisitos="
                        + formatarPontos(requisitosResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(requisitosResultado.pesoAvaliado())
                        + " avaliados de 60"
                        + ", interesses="
                        + formatarPontos(interessesResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(interessesResultado.pesoAvaliado())
                        + " avaliados de 20"
                        + ", mobilidade="
                        + formatarPontos(mobilidadeResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(mobilidadeResultado.pesoAvaliado())
                        + " avaliados de 5"
                        + ", ritmo="
                        + formatarPontos(ritmoResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(ritmoResultado.pesoAvaliado())
                        + " avaliados de 5"
                        + ", perÃ­odo="
                        + formatarPontos(periodoResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(periodoResultado.pesoAvaliado())
                        + " avaliados de 5"
                        + ", orÃ§amento="
                        + formatarPontos(orcamentoResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(orcamentoResultado.pesoAvaliado())
                        + " avaliados de 5"
                        + ", pontos="
                        + formatarPontos(pontosObtidos)
                        + "/"
                        + formatarPontos(pesoAvaliado)
                        + ", compatibilidade="
                        + compatibilidade
                        + "%"
                        + ", cobertura="
                        + cobertura
                        + "%"
        );

        return compatibilidade;
    }


    private ResultadoBloco calcularBlocoLista(
            List<String> criteriosEsperados,
            JsonNode avaliacoes,
            double pesoTotal,
            String nomeBloco
    ) {

        if (criteriosEsperados == null || criteriosEsperados.isEmpty()) {
            return new ResultadoBloco(0.0, 0.0);
        }

        if (!avaliacoes.isArray() || avaliacoes.size() != criteriosEsperados.size()) {
            throw new IllegalStateException(
                    "A maIA retornou uma quantidade invÃ¡lida de avaliaÃ§Ãµes para "
                            + nomeBloco
                            + "."
            );
        }

        Map<String, String> statusPorCriterio =
                new java.util.HashMap<>();

        for (JsonNode avaliacao : avaliacoes) {

            String criterio =
                    avaliacao.path("criterio").asText("").trim();

            String status =
                    avaliacao.path("status").asText("").trim();

            if (criterio.isBlank()) {
                throw new IllegalStateException(
                        "A maIA retornou uma avaliaÃ§Ã£o sem critÃ©rio em "
                                + nomeBloco
                                + "."
                );
            }

            String chave =
                    normalizarCriterioPlanejamento(criterio);

            if (statusPorCriterio.put(chave, status) != null) {
                throw new IllegalStateException(
                        "A maIA repetiu um critÃ©rio na avaliaÃ§Ã£o de "
                                + nomeBloco
                                + ": "
                                + criterio
                                + "."
                );
            }
        }

        double pesoPorCriterio =
                pesoTotal / criteriosEsperados.size();

        double pontosObtidos = 0.0;
        double pesoAvaliado = 0.0;

        for (String criterioEsperado : criteriosEsperados) {

            String chaveEsperada =
                    normalizarCriterioPlanejamento(criterioEsperado);

            String status =
                    statusPorCriterio.get(chaveEsperada);

            if (status == null) {
                throw new IllegalStateException(
                        "A maIA nÃ£o avaliou o critÃ©rio "
                                + criterioEsperado
                                + " em "
                                + nomeBloco
                                + "."
                );
            }

            String statusNormalizado =
                    normalizarStatusAvaliacao(status);

            System.out.println(
                    " AvaliaÃ§Ã£o "
                            + nomeBloco
                            + " - "
                            + criterioEsperado
                            + ": "
                            + statusNormalizado
            );

            if ("NAO_VERIFICAVEL".equals(statusNormalizado)) {
                continue;
            }

            pesoAvaliado += pesoPorCriterio;
            pontosObtidos +=
                    pesoPorCriterio
                            * fatorStatus(statusNormalizado);
        }

        return new ResultadoBloco(
                pontosObtidos,
                pesoAvaliado
        );
    }


    private ResultadoCriterio calcularCriterioUnico(
            String status,
            double peso,
            String nome
    ) {

        String normalizado =
                normalizarStatusAvaliacao(status);

        System.out.println(
                " AvaliaÃ§Ã£o "
                        + nome
                        + ": "
                        + normalizado
        );

        if ("NAO_VERIFICAVEL".equals(normalizado)) {
            return new ResultadoCriterio(
                    0.0,
                    0.0
            );
        }

        return new ResultadoCriterio(
                peso * fatorStatus(normalizado),
                peso
        );
    }


    private String normalizarStatusAvaliacao(
            String status
    ) {

        String normalizado =
                status == null
                        ? ""
                        : status
                                .trim()
                                .toUpperCase(Locale.ROOT);

        return switch (normalizado) {
            case "ATENDE",
                 "PARCIAL",
                 "NAO_ATENDE",
                 "NAO_VERIFICAVEL" ->
                    normalizado;
            default ->
                    throw new IllegalStateException(
                            "A maIA retornou um status de avaliaÃ§Ã£o invÃ¡lido: "
                                    + (
                                            status == null
                                                    ? "(nulo)"
                                                    : status
                                    )
                                    + "."
                    );
        };
    }


    private double fatorStatus(
            String status
    ) {

        return switch (normalizarStatusAvaliacao(status)) {
            case "ATENDE" -> 1.0;
            case "PARCIAL" -> 0.5;
            case "NAO_ATENDE" -> 0.0;
            case "NAO_VERIFICAVEL" -> 0.0;
            default -> 0.0;
        };
    }


    private record ResultadoBloco(
            double pontosObtidos,
            double pesoAvaliado
    ) {}


    private record ResultadoCriterio(
            double pontosObtidos,
            double pesoAvaliado
    ) {}


    private String normalizarCriterioPlanejamento(
            String criterio
    ) {

        if (criterio == null) {
            return "";
        }

        return Normalizer
                .normalize(
                        criterio.trim(),
                        Normalizer.Form.NFD
                )
                .replaceAll(
                        "\\p{M}+",
                        ""
                )
                .toLowerCase(
                        Locale.ROOT
                )
                .replaceAll(
                        "[^a-z0-9]+",
                        "_"
                )
                .replaceAll(
                        "^_+|_+$",
                        ""
                );
    }


    private String formatarPontos(
            double valor
    ) {

        if (
                Math.abs(
                        valor
                                - Math.rint(
                                        valor
                                )
                ) < 0.000001
        ) {
            return String.valueOf(
                    (int) Math.rint(
                            valor
                    )
            );
        }

        return String.format(
                Locale.ROOT,
                "%.1f",
                valor
        );
    }


    private String normalizarCidadeRecomendacao(
            String cidade
    ) {

        if (cidade == null) {
            return "";
        }

        String semAcentos =
                Normalizer
                        .normalize(
                                cidade.trim(),
                                Normalizer.Form.NFD
                        )
                        .replaceAll(
                                "\\p{M}+",
                                ""
                        );

        return semAcentos
                .toLowerCase(Locale.ROOT)
                .replaceAll(
                        "\\s+",
                        " "
                )
                .trim();
    }

}
