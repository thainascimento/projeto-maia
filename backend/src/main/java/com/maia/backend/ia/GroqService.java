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
                HttpClient.newBuilder()
                        .connectTimeout(java.time.Duration.ofSeconds(20))
                        .build();

        this.objectMapper =
                new ObjectMapper();
    }


    // =========================================================
    // INTERPRETAÇÃO DE INTENÇÃO
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
                    Você classifica a intenção da mensagem para a maIA.
                    Não responda à usuária. Retorne somente JSON puro.

                    Intenções:
                    LOCALIZACAO_ATUAL, CLIMA, MARE, BUSCAR_LOCAL,
                    COMPARAR_LOCAIS, DETALHAR_LOCAL, MAIS_RESULTADOS,
                    REFINAR_BUSCA, DESTINO_VIAGEM, CONVERSA_GERAL.

                    Referência geográfica:
                    GPS_ATUAL, DESTINO_VIAGEM ou NENHUMA.

                    Categorias:
                    nightlife, cafe, restaurante, sorveteria, bar,
                    supermercado, farmacia, hospital, clínica, praia,
                    atracao, museu, mirante, monumento, castelo, igreja,
                    ruina, farol, arte, natureza ou null.

                    Referência conversacional:
                    RESULTADOS_ANTERIORES ou NENHUMA.

                    Critério:
                    DISTANCIA, SITE, TELEFONE, HORARIO, ENDERECO,
                    ACESSIBILIDADE, INTERNET ou null.

                    Escopo dos resultados:
                    PAGINA_ATUAL, TODOS_RESULTADOS, PRIMEIRA_PAGINA,
                    PAGINA_ANTERIOR ou NENHUM.

                    Regras:
                    - Entenda linguagem natural e use o histórico recente como
                      continuação real da conversa, não como mensagens isoladas.
                    - Resolva referências, pronomes e elipses pelo histórico.
                      Se a conversa estiver falando de um local específico,
                      perguntas subsequentes sobre "ele", "esse", "esse lugar",
                      "o local", ou perguntas abreviadas como "e telefone?",
                      "e o site?", "qual o endereço?" e "abre que horas?"
                      continuam se referindo ao mesmo local.
                    - Quando a mensagem atual pedir uma informação sobre um local
                      que já está em foco no histórico, classifique como
                      DETALHAR_LOCAL + RESULTADOS_ANTERIORES.
                    - Nessa continuação, use o critério correspondente quando
                      houver: SITE, TELEFONE, HORARIO, ENDERECO,
                      ACESSIBILIDADE ou INTERNET. Se for um pedido geral de
                      detalhes, criterio=null.
                    - Se a mensagem escolher explicitamente "o primeiro",
                      "o segundo", "o terceiro" etc., use DETALHAR_LOCAL +
                      RESULTADOS_ANTERIORES e preencha indiceLocal.
                    - Se a mensagem apenas continuar falando do local já escolhido,
                      não invente um novo indiceLocal; deixe indiceLocal=null para
                      que o foco atual seja preservado pelo sistema.
                    - "perto de mim", "aqui perto", "bares próximos a mim" => GPS_ATUAL.
                     - "quero saber de bares próximos a mim" => BUSCAR_LOCAL, bar, GPS_ATUAL, precisaGps=true.
                     - Outros estabelecimentos e serviços seguem a mesma regra, nunca CONVERSA_GERAL.
                    - "meu destino", "na viagem" => DESTINO_VIAGEM.
                    - clima => CLIMA; maré => MARE.
                    - pedidos novos de lugares => BUSCAR_LOCAL + categoriaLocal.

                    - Pedidos para encontrar hospitais, clínicas,
                    pronto-socorros e atendimento médico próximo
                    devem ser classificados como BUSCAR_LOCAL.
                    - Para hospitais e pronto-socorros, use
                    categoriaLocal=hospital.
                    - Para clínicas médicas, use categoriaLocal=clinica.
                    - Quando a usuária solicitar atendimento perto
                    de onde está, use referenciaGeografica=GPS_ATUAL
                    e precisaGps=true.
                    - Não confunda um pedido de orientação médica
                    com um pedido de busca de estabelecimentos.
                    - Se houver sinais de emergência, priorize
                    a orientação para obter socorro imediato.

                    - perguntas que comparam vários resultados anteriores, como
                      "qual o mais perto?" ou "qual deles tem site?", usam
                      COMPARAR_LOCAIS + RESULTADOS_ANTERIORES + critério.
                    - Para COMPARAR_LOCAIS, DETALHAR_LOCAL ou REFINAR_BUSCA sobre
                      resultados anteriores, interprete também qual conjunto da
                      conversa a usuária está mencionando em escopoResultados.
                    - PAGINA_ATUAL significa explicitamente a lista mais recente,
                      por exemplo "dessa última lista", "esses últimos" ou quando
                      o contexto deixa claro que a usuária fala só do último bloco.
                    - TODOS_RESULTADOS significa todos os locais encontrados na
                      busca atual. Use para referências amplas como "todos",
                      "entre todos", "dos que você encontrou", "dos que você me
                      mostrou" e também "desses", "deles" ou "esses lugares"
                      depois de mais de um bloco, quando a usuária não limitar a
                      pergunta ao bloco mais recente.
                    - PRIMEIRA_PAGINA significa o primeiro bloco, como "os
                      primeiros" ou "a primeira lista".
                    - PAGINA_ANTERIOR significa o bloco imediatamente anterior,
                      como "os anteriores" ou "a lista anterior".
                    - Não escolha o escopo por uma palavra isolada. Use a mensagem
                      atual e o histórico para resolver a referência.
                    - Se houver resultados anteriores e o escopo continuar
                      ambíguo, use TODOS_RESULTADOS para comparações amplas e
                      PAGINA_ATUAL para detalhes de um item específico.
                    - pedidos por mais opções usam MAIS_RESULTADOS +
                      RESULTADOS_ANTERIORES e escopoResultados=PAGINA_ATUAL.
                    - comparações e detalhes sobre resultados anteriores não
                      precisam de GPS novamente: referenciaGeografica=NENHUMA,
                      precisaGps=false.
                    - Não transforme uma continuação sobre um local já discutido
                      em CONVERSA_GERAL apenas porque a mensagem atual é curta.
                    - nunca invente local, cidade, coordenada ou contexto.
                    - Classifique a mensagem atual considerando o histórico,
                      mas priorize a solicitação mais recente da usuária.
                    - Nunca classifique um pedido de busca de estabelecimentos,
                      atrações ou serviços como CONVERSA_GERAL.
                    - Quando a usuária pedir locais próximos de onde está,
                      use referenciaGeografica=GPS_ATUAL,
                      precisaGps=true e intencao=BUSCAR_LOCAL.
                    - Quando a categoria não corresponder às categorias predefinidas, não transforme automaticamente a solicitação em CONVERSA_GERAL.
                    - Se a mensagem não se encaixar em nenhuma das intenções, use CONVERSA_GERAL + NENHUMA + null + false + NENHUMA + null + null + NENHUM.
                    - Se a mensagem for uma continuação sobre resultados anteriores, preserve a referência conversacional.
                    - Não invente informações nem declare que uma consulta externa foi realizada. A execução dos serviços pertence ao backend.

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
                    HISTÓRICO RECENTE:
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

            return reconciliarInterpretacao(mensagem, converterRespostaInterpretacao(resposta));

        } catch (Exception e) {

            System.out.println(
                    " Falha ao interpretar intenção com a Groq: "
                            + e.getMessage()
            );

            e.printStackTrace();

            return reconciliarInterpretacao(mensagem, null);
        }
    }

    private String montarHistoricoParaInterpretacao(
            List<MaiaMensagemHistorico> historico
    ) {

        if (
                historico == null ||
                historico.isEmpty()
        ) {
            return "(sem histórico)";
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

        JsonNode intencaoNode =
                raiz.get("intencao");
        if (
                intencaoNode == null ||
                !intencaoNode.isTextual() ||
                intencaoNode.asText().isBlank()
        ) {
            return null;
        }

        String intencao =
                intencaoNode
                        .asText()
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
         * Perguntas que apenas comparam ou detalham lugares já
         * apresentados não precisam consultar o GPS novamente.
         *
         * Exemplo:
         * "qual o mais perto?"
         * "qual tem site?"
         * "e o segundo?"
         *
         * Mesmo que o modelo tenha herdado GPS_ATUAL do contexto
         * anterior, os dados necessários já estão no histórico.
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

    /**
     * Confere a interpretação com sinais explícitos da mensagem corrente.
     * Não reutiliza o destino da viagem quando a usuária solicita o GPS.
     * A Groq continua responsável por pedidos livres e pelo contexto conversacional.
     */
    public InterpretacaoIntencao reconciliarInterpretacao(
            String mensagem, InterpretacaoIntencao interpretacao) {
        if (mensagem == null || mensagem.isBlank()) return interpretacao;
        String texto = Normalizer.normalize(mensagem, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        boolean gps = contemExpressao(texto, "perto de mim", "proximo de mim", "proximos de mim",
                "proxima de mim", "proximas de mim", "proximos a mim", "proximas a mim",
                "proximo a mim", "proxima a mim", "ao meu redor", "aqui perto",
                "perto daqui", "nas minhas proximidades", "onde estou", "onde eu estou",
                "localizacao atual", "minha localizacao", "perto de onde estou",
                "ao redor de mim", "por aqui onde estou");
        boolean destino = contemExpressao(texto, "meu destino", "destino da viagem",
                "destino da minha viagem", "na minha viagem", "nessa viagem",
                "nesta viagem", "durante minha viagem", "onde vou viajar", "cidade da viagem");
        String categoria = detectarCategoriaExplicita(texto);
        String intencao = interpretacao == null ? "CONVERSA_GERAL" : interpretacao.intencao();
        String referencia = interpretacao == null ? "NENHUMA" : interpretacao.referenciaGeografica();
        String categoriaOriginal = interpretacao == null ? null : interpretacao.categoriaLocal();
        boolean precisaGps = interpretacao != null && interpretacao.precisaGps();
        String conversacional = interpretacao == null ? "NENHUMA" : interpretacao.referenciaConversacional();
        String criterio = interpretacao == null ? null : interpretacao.criterio();
        Integer indice = interpretacao == null ? null : interpretacao.indiceLocal();
        String escopo = interpretacao == null ? "NENHUM" : interpretacao.escopoResultados();
        if (intencao == null) intencao = "CONVERSA_GERAL";
        if (referencia == null) referencia = "NENHUMA";
        if (conversacional == null) conversacional = "NENHUMA";
        if (escopo == null) escopo = "NENHUM";

        boolean seguimento = "RESULTADOS_ANTERIORES".equals(conversacional)
                && ("DETALHAR_LOCAL".equals(intencao) || "COMPARAR_LOCAIS".equals(intencao)
                    || "MAIS_RESULTADOS".equals(intencao) || "REFINAR_BUSCA".equals(intencao));
        // Uma nova categoria pedida explicitamente substitui a busca anterior.
        if (categoria != null && ("CONVERSA_GERAL".equals(intencao)
                || "BUSCAR_LOCAL".equals(intencao) || (gps && !destino))) {
            intencao = "BUSCAR_LOCAL";
            categoriaOriginal = categoria;
            conversacional = "NENHUMA";
            escopo = "NENHUM";
            seguimento = false;
        }
        if (seguimento) {
            referencia = "NENHUMA";
            precisaGps = false;
        } else if (gps && !destino) {
            referencia = "GPS_ATUAL";
            precisaGps = true;
        } else if (destino && !gps) {
            referencia = "DESTINO_VIAGEM";
            precisaGps = false;
        } else if ("GPS_ATUAL".equals(referencia)) {
            precisaGps = true;
        }
        if ("LOCALIZACAO_ATUAL".equals(intencao) && !destino) {
            referencia = "GPS_ATUAL";
            precisaGps = true;
        }
        return new InterpretacaoIntencao(intencao, referencia, categoriaOriginal,
                precisaGps, conversacional, criterio, indice, escopo);
    }

    private boolean contemExpressao(String texto, String... expressoes) {
        for (String expressao : expressoes) {
            if (texto.contains(expressao)) return true;
        }
        return false;
    }

    private String detectarCategoriaExplicita(String texto) {
        // Prioridade para categorias específicas antes de termos genéricos.
        if (texto.matches(".*\\b(bares?|pubs?|botecos?|cervejarias?)\\b.*")
                || contemExpressao(texto, "tomar um drink", "tomar uma cerveja")) return "bar";
        if (contemExpressao(texto, "balada", "boate", "vida noturna", "casa de show",
                "musica ao vivo", "nightclub")) return "nightlife";
        if (contemExpressao(texto, "cafeteria", "cafe", "espresso")) return "cafe";
        if (contemExpressao(texto, "restaurante", "almocar", "almoco", "jantar", "onde comer")) return "restaurante";
        if (contemExpressao(texto, "sorveteria", "sorvete", "gelateria", "gelato")) return "sorveteria";
        if (contemExpressao(texto, "supermercado", "mercado", "mercearia")) return "supermercado";
        if (contemExpressao(texto, "farmacia", "drogaria")) return "farmacia";
        if (contemExpressao(texto, "praia", "praias")) return "praia";
        if (contemExpressao(texto, "museu")) return "museu";
        if (contemExpressao(texto, "mirante")) return "mirante";
        if (contemExpressao(texto, "monumento", "memorial")) return "monumento";
        if (contemExpressao(texto, "castelo", "fortaleza")) return "castelo";
        if (contemExpressao(texto, "igreja", "catedral", "templo")) return "igreja";
        if (contemExpressao(texto, "ruina", "sitio arqueologico")) return "ruina";
        if (texto.matches(".*\\b(farois?|farol)\\b.*")) return "farol";
        if (contemExpressao(texto, "arte urbana", "obra de arte", "escultura", "galeria de arte")) return "arte";
        if (contemExpressao(texto, "natureza", "trilha", "parque natural")) return "natureza";
        if (contemExpressao(texto, "ponto turistico", "atracao", "lugares para conhecer", "lugares para visitar")) return "atracao";
        return null;
    }

    // =========================================================
    // TESTE DA CONEXÃO COM A GROQ
    // =========================================================

    public String testarConexao() {

        try {

            Map<String, Object> mensagemSistema =
                    Map.of(
                            "role",
                            "system",
                            "content",
                            """
                            Você é a maIA, assistente do aplicativo MAIA.

                            Responda sempre em português do Brasil.
                            """
                    );

            Map<String, Object> mensagemUsuario =
                    Map.of(
                            "role",
                            "user",
                            "content",
                            "Responda somente: conexão com a maIA funcionando."
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
                    "Não foi possível conectar à Groq: "
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
                    "A mensagem não pode estar vazia."
            );
        }

        try {

            String promptSistema =
                    """
                    Você é a maIA, uma assistente virtual inteligente e
                    conversacional do aplicativo MAIA, especializada em
                    viagens e segurança feminina, mas capaz de conversar
                    sobre qualquer assunto.
                    Adapte o tamanho e a profundidade da resposta à pergunta.
                    Responda em português do Brasil, de forma natural, amigável,
                    prática e acolhedora.
                    Caso a usuária peça, responda em inglês, espanhol ou francês,
                    mas sempre retorne ao português.

                    CONVERSAS GERAIS:
                    - Você pode conversar sobre qualquer assunto permitido,
                    mesmo que não tenha relação com viagens.
                    - Responda perguntas sobre tecnologia, programação,
                    ciência, história, cultura, estudos, cotidiano,
                    entretenimento e outros temas.
                    - Utilize seu conhecimento geral quando não houver
                    necessidade de consultar dados externos atualizados.
                    - Não tente relacionar perguntas gerais a viagens.
                    - Quando a usuária mudar de assunto, acompanhe
                    naturalmente a nova conversa.
                    - Não diga que você só pode ajudar com viagens.


                    Use o histórico recente para manter contexto e entender
                    referências como "o primeiro", "qual o mais perto?" e
                    "e à noite?".

                    FORMATO DAS RESPOSTAS:
                    - Responda de maneira natural e conversacional.
                    - Não utilize tabelas ou formatação tabular.
                    - Não utilize Markdown para criar tabelas.
                    - Quando apresentar estabelecimentos, organize os
                    resultados em uma lista numerada, com nome,
                    distância e endereço quando disponíveis.
                    - Para conversas gerais, prefira frases e parágrafos
                    naturais, sem listas desnecessárias.
                    - Não utilize caracteres como | para separar colunas.
                    - Nunca apresente informações em formato de planilha.
                    - Adapte a apresentação ao contexto da conversa.

                    ASSISTÊNCIA À SAÚDE E SEGURANÇA:
                    - A segurança e o bem-estar da usuária são prioridades.
                    - Quando a usuária relatar mal-estar, dor, doença,
                    medo ou necessidade de ajuda, responda com empatia.
                    - Pergunte brevemente sobre os sintomas quando necessário,
                    sem atrasar a orientação em situações de emergência.
                    - Não realize diagnósticos médicos definitivos.
                    - Não prescreva medicamentos ou dosagens.
                    - Não minimize sintomas potencialmente graves.
                    - Em caso de dor intensa no peito, dificuldade para respirar,
                    sinais de AVC, perda de consciência, convulsões,
                    hemorragia intensa ou outros sinais graves,
                    oriente atendimento de emergência imediato.
                    - No Brasil, informe o SAMU 192 para emergências médicas.
                    - Em outros países, utilize o número local de emergência
                    somente quando ele estiver confirmado.
                    - Se o país for desconhecido, oriente a procurar
                    imediatamente o serviço local de emergência.
                    - Não substitua atendimento médico profissional.
                    - Em situações não emergenciais, ofereça informações
                    gerais e recomende avaliação profissional quando apropriado.
                    - Se a usuária estiver sozinha e precisar de ajuda,
                    sugira procurar uma pessoa de confiança ou um
                    funcionário de um estabelecimento seguro.
                    - Quando a usuária solicitar atendimento próximo,
                    ofereça ajuda para encontrar hospitais, UPAs,
                    pronto-socorros ou outros serviços de saúde.
                    - Solicite permissão antes de utilizar o GPS.
                    - Não presuma que o destino da viagem seja a
                    localização física atual da usuária.
                    - Nunca afirme que acionou ambulância, polícia,
                    familiares ou serviços de emergência sem que
                    uma integração tenha realizado essa ação.
                    - Em risco imediato, não atrase a orientação de
                    emergência para fazer buscas ou perguntas adicionais.

                    Regras de precisão:
                    - Para perguntas gerais, utilize seu conhecimento
                    de linguagem e informações gerais;
                    - Para perguntas sobre estabelecimentos, clima, marés,
                    localização, viagens e outros dados consultados
                    pelo backend, utilize os dados reais disponíveis
                    nos contextos recebidos;
                    - Nunca invente informações atuais ou afirme ter
                    realizado consultas externas que não aconteceram;
                    - nunca invente lugares, preços, horários, avaliações,
                      eventos, segurança, clima, maré, rotas ou tempo de trajeto;
                    - GPS_ATUAL é a localização física da usuária;
                      DESTINO_VIAGEM é o destino cadastrado;
                    - distância de local é em linha reta, não tempo de trajeto;
                    - quando houver locais reais, use apenas esses nomes e dados;
                    - se faltarem dados, diga isso de forma simples;
                    - não exponha JSON, ferramentas ou detalhes internos;
                    - não diga que fará uma busca depois: o backend já executou
                      as consultas necessárias antes da sua resposta;
                    - em risco imediato, priorize segurança e ajuda oficial.

                    Seu nome é maIA. Responda diretamente ao que foi perguntado.
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
            // HISTÓRICO RECENTE
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
                            1600,

                            // O backend do MAIA já executa Geoapify, clima,
                            // maré e demais integrações. O modelo deve apenas
                            // responder com base no contexto recebido.
                            "tool_choice",
                            "none"
                    );

            // GPT-OSS usa tokens de completion também para raciocínio.
            // Esforço baixo deixa mais espaço para a resposta visível.
            corpo = configurarRaciocinioLeveSeSuportado(corpo);

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
                 * mesmo quando tool_choice = none. Nesse caso específico,
                 * repetimos UMA única vez com uma instrução de sistema ainda
                 * mais explícita. Não alteramos o modelo, não chamamos browser
                 * e não mudamos o fluxo das integrações do MAIA.
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
                                REGRA TÉCNICA OBRIGATÓRIA PARA ESTA RESPOSTA:
                                responda somente com texto natural para a usuária.
                                Não tente chamar ferramentas, funções, browser,
                                pesquisa externa, repo_browser, web search ou
                                qualquer ação interna.

                                As consultas externas necessárias já foram
                                executadas pelo backend do MAIA antes desta
                                mensagem. Use exclusivamente os contextos reais
                                fornecidos na conversa. Se os dados não confirmam
                                uma informação, diga isso sem tentar buscá-la.
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
                                1600,

                                "tool_choice",
                                "none"
                        );

                resposta =
                        executarRequisicao(
                                configurarRaciocinioLeveSeSuportado(corpoRetry)
                        );
            }

            return limparRespostaMaia(
                    resposta
            );

        } catch (Exception e) {

            throw new IllegalStateException(
                    "A maIA não conseguiu responder agora: "
                            + e.getMessage(),
                    e
            );
        }
    }

    /**
     * Somente GPT-OSS 20B/120B aceita reasoning_effort=low na Groq.
     * Mantém intactas as requisições de outros modelos e as integrações.
     */
    private Map<String, Object> configurarRaciocinioLeveSeSuportado(
            Map<String, Object> corpo) {
        if ("openai/gpt-oss-120b".equalsIgnoreCase(model)
                || "openai/gpt-oss-20b".equalsIgnoreCase(model)) {
            Map<String, Object> ajustado = new java.util.LinkedHashMap<>(corpo);
            ajustado.put("reasoning_effort", "low");
            return ajustado;
        }
        return corpo;
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
                CONTEXTO REAL DA USUÁRIA
                Dados da usuária não disponíveis. Não invente.
                """;
    }

    String nome =
            valorOuNaoInformado(
                    contextoUsuario.nome()
            );

    String primeiroNome =
            "não informado";

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
            .append("CONTEXTO REAL DA USUÁRIA\n")
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
            .append("Contato de emergência - nome: ")
            .append(
                    valorOuNaoInformado(
                            contextoUsuario.contatoEmergenciaNome()
                    )
            )
            .append("\n")
            .append("Contato de emergência - telefone: ")
            .append(
                    valorOuNaoInformado(
                            contextoUsuario.contatoEmergenciaTelefone()
                    )
            )
            .append("\n")
            .append("Contato de emergência - relação: ")
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
                "\nNenhuma viagem cadastrada para esta usuária.\n"
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
                    .append(" | País: ")
                    .append(
                            valorOuNaoInformado(
                                    viagem.getPais()
                            )
                    )
                    .append(" | Início: ")
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
            - estes dados pertencem à usuária atual do aplicativo;
            - use-os somente quando forem relevantes para a pergunta;
            - "viagens anteriores" significa viagens com status FINALIZADA;
            - viagens CANCELADAS não contam como viagens realizadas;
            - não invente dados ausentes;
            - não diga que não possui acesso aos dados quando a informação estiver neste contexto;
            - use o primeiro nome da usuária apenas quando soar natural.
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
                    Não presuma um destino se ele não estiver no histórico.
                    """;
        }

        return """
                CONTEXTO REAL DA VIAGEM ATIVA
                Destino: %s
                Cidade: %s
                Estado: %s
                País: %s
                Início: %s
                Fim: %s
                Latitude do destino: %s
                Longitude do destino: %s

                Estas coordenadas são do DESTINO cadastrado, não do GPS atual.
                Se CONTEXTO DE LOCAIS REAIS informar GPS_ATUAL, aquela busca
                específica usou a localização física fornecida pelo celular.
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
                        ? "não informada"
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
                    Não invente alternativas específicas.
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
                Use somente os locais acima. Não invente dados ausentes.
                Distâncias são em linha reta.
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
                CONTEXTO REAL DE MARÉ

                A maré não foi consultada nesta interação.

                REGRA OBRIGATÓRIA:
                - isso NÃO significa que o destino não possui litoral;
                - isso NÃO significa que a maré não é aplicável;
                - apenas significa que o backend não consultou o serviço
                  de maré para esta mensagem;
                - não invente horários, alturas ou condições de maré.
                """;
    }

    /*
     * O MareService já verificou se existe costa suficientemente
     * próxima das coordenadas consultadas.
     *
     * Portanto, disponivel=false é diferente de mare=null:
     *
     * null  -> a maré não foi consultada nesta interação.
     * false -> foi consultada e o backend determinou que a
     *          informação de maré não é aplicável/disponível
     *          para essas coordenadas.
     */
    if (!mare.disponivel()) {

        return """
                CONTEXTO REAL DE MARÉ

                CONSULTA REALIZADA: SIM
                MARÉ APLICÁVEL/DISPONÍVEL PARA AS COORDENADAS: NÃO

                O backend verificou as coordenadas consultadas e determinou
                que não há informação de maré aplicável/disponível para
                esse local.

                REGRA OBRIGATÓRIA:
                - não forneça horários de maré;
                - não forneça alturas de maré;
                - não use dados de outra cidade ou litoral distante;
                - não invente uma estação;
                - se a usuária perguntar sobre maré nesse local, diga apenas
                que não há informação de maré aplicável/disponível para
                as coordenadas consultadas;
                - NÃO invente uma explicação geográfica para isso;
                - NÃO classifique a cidade como "interiorana", "litorânea",
                "costeira", "longe do litoral" ou qualquer outra
                caracterização geográfica que não tenha sido fornecida
                pelo backend;
                - NÃO tente explicar por que a maré não está disponível;
                - não diga apenas que "não houve consulta", porque a consulta
                de aplicabilidade foi realizada.

                """;
    }

    StringBuilder contexto =
            new StringBuilder();

    contexto.append(
            """
            CONTEXTO REAL DE MARÉ

            CONSULTA REALIZADA: SIM
            MARÉ APLICÁVEL/DISPONÍVEL PARA AS COORDENADAS: SIM

            Os horários abaixo já incluem o offset retornado
            pelo provedor.
            """
    );

    if (
            mare.estacao() != null &&
            !mare.estacao().isBlank()
    ) {

        contexto
                .append(
                        "\nEstação de referência: "
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
            "\nPróxima maré baixa",
            mare.proximaMareBaixa()
    );

    adicionarEventoMare(
            contexto,
            "\nPróxima maré alta",
            mare.proximaMareAlta()
    );

    if (
            mare.eventos() != null &&
            !mare.eventos().isEmpty()
    ) {

        contexto.append(
                "\n\nEventos disponíveis:"
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
                                    : "MARÉ"
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

            REGRAS PARA USO DOS DADOS DE MARÉ:
            - use somente os eventos fornecidos acima;
            - não invente eventos, horários ou alturas;
            - para "amanhã", respeite a data de cada evento;
            - para "agora" ou "mais tarde", compare os horários
              e offsets recebidos;
            - não transforme altura de maré em classificação de
              perigo sem que exista dado específico para isso;
            - se um dado não estiver presente, diga que ele não
              está disponível.
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

                O clima não foi consultado nesta interação.

                REGRA OBRIGATÓRIA:
                - não invente condição atual;
                - não invente temperatura;
                - não invente chuva, neve, vento, rajadas,
                  neblina ou tempestade;
                - não use conhecimento geral sobre o clima da
                  cidade como se fosse uma observação atual.
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
                REGRAS DE INTERPRETAÇÃO DOS DADOS CLIMÁTICOS:
                - use exclusivamente os valores fornecidos pelo backend;
                - temperatura e sensação térmica são informações diferentes;
                - probabilidade de chuva é probabilidade, não confirmação
                  de que está chovendo;
                - use neve somente quando os dados fornecidos indicarem neve;
                - os códigos meteorológicos 45 e 48 representam condição
                  de neblina/nevoeiro;
                - os códigos meteorológicos 71, 73, 75, 77, 85 e 86
                  representam condições relacionadas a neve;
                - códigos meteorológicos 95, 96 e 99 representam
                  condições de tempestade/trovoada;
                - vento e rajadas devem ser informados usando os valores
                  reais recebidos;
                - não transforme automaticamente velocidade do vento,
                  rajadas ou probabilidade de chuva em alerta oficial,
                  nível de perigo ou recomendação de emergência;
                - não invente visibilidade, índice UV, qualidade do ar,
                  umidade ou qualquer variável que não esteja nos dados;
                - para perguntas como "preciso levar casaco?", "vou passar
                  frio?" ou semelhantes, use temperatura, sensação térmica
                  e previsão disponível para dar uma orientação prática,
                  deixando claro quando for uma sugestão;
                - para perguntas sobre as próximas horas, priorize
                  previsaoProximasHoras;
                - não extrapole a previsão além do período efetivamente
                  fornecido pelo backend.
                """;

        // =====================================================
        // CLIMA DA LOCALIZAÇÃO FÍSICA ATUAL
        // =====================================================

        if (
                "GPS_ATUAL".equalsIgnoreCase(
                        tipoReferencia
                )
        ) {

            return """
                    CONTEXTO REAL DE CLIMA

                    REFERÊNCIA DO CLIMA: GPS_ATUAL

                    Os dados climáticos abaixo pertencem à localização
                    física atual da usuária, obtida pelas coordenadas
                    fornecidas pelo GPS do celular.

                    %s

                    REGRA DE LOCALIZAÇÃO:
                    - estes dados NÃO pertencem necessariamente ao destino
                      cadastrado na viagem ativa;
                    - NÃO use o destino da viagem ativa como nome desta
                      localização;
                    - NÃO diga "em Pipa", "em [destino]" ou equivalente
                      apenas porque existe uma viagem ativa;
                    - se o sistema não forneceu o nome real da cidade
                      correspondente ao GPS, diga "na sua localização atual",
                      "onde você está agora" ou equivalente;
                    - não invente o nome da cidade a partir das coordenadas;
                    - dataHoraLocal corresponde à referência climática
                      consultada, não ao destino da viagem;
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

                REFERÊNCIA DO CLIMA: DESTINO_VIAGEM

                Os dados climáticos abaixo pertencem ao destino
                cadastrado na viagem ativa.

                %s

                REGRA DE LOCALIZAÇÃO:
                - estes dados correspondem ao destino da viagem;
                - o nome do destino pode ser obtido no
                  CONTEXTO REAL DA VIAGEM ATIVA;
                - dataHoraLocal corresponde à referência climática
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

                Os dados climáticos não puderam ser preparados
                para esta interação.

                Não invente valores ou condições meteorológicas.
                """;
    }
}

    // =========================================================
    // RECOMENDAÇÃO DE DESTINOS
    // =========================================================

    public RecomendacaoResponse recomendarDestinos(
            PlanejamentoRequest planejamento
    ) {
        try {
            String perfil = montarPromptUsuario(planejamento);

            /*
             * ETAPA 1: escolhe somente os nomes de 1 a 3 cidades.
             * A resposta é propositalmente pequena para que o modelo não
             * gaste a janela de saída descrevendo o primeiro destino e deixe
             * de completar os demais.
             */
            String promptSelecao = """
                    Você é a maIA, assistente de viagens do aplicativo MAIA.
                    Analise o perfil da viajante e escolha de 1 a 3 cidades
                    DIFERENTES que realmente atendam bem ao conjunto completo.

                    Ordem de importância:
                    1. restrição geográfica, quando houver;
                    2. requisitos indispensáveis;
                    3. interesses;
                    4. período, orçamento, ritmo e mobilidade.

                    Os requisitos indispensáveis já representam o que é mais
                    importante e não pode faltar. Não conte o mesmo critério duas
                    vezes mesmo que ele também apareça no texto livre.

                    Não invente características para fazer uma cidade caber no
                    perfil. Retorne no máximo 3 opções. Se somente 1 ou 2 cidades
                    tiverem boa aderência ao perfil, retorne apenas essas opções.
                    Não force uma terceira cidade de baixa compatibilidade.

                    Retorne APENAS JSON válido e curto neste formato:
                    {"destinos":[
                      {"cidade":"string","estadoOuRegiao":"string","pais":"string"}
                    ]}

                    O array destinos deve conter no mínimo 1 e no máximo 3 cidades
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
                            "max_completion_tokens", 1100,
                            "response_format", Map.of("type", "json_object")
                    );
            corpoSelecao = configurarRaciocinioLeveSeSuportado(corpoSelecao);

            System.out.println(
                    "Planejamento maIA - etapa 1/3: selecionando de 1 a 3 cidades."
            );

            String conteudoSelecao;
            try {
                conteudoSelecao = executarRequisicao(corpoSelecao);
            } catch (IllegalStateException erroGroq) {
                if (!erroJsonInvalidoGroq(erroGroq)) {
                    throw erroGroq;
                }
                System.out.println("Planejamento maIA - JSON inválido na seleção; "
                        + "repetindo a seleção sem JSON mode.");
                conteudoSelecao = executarRequisicao(
                        corpoPlanejamentoSemJsonMode(corpoSelecao, 1600), false);
            }
            JsonNode jsonSelecao = objectMapper.readTree(
                    extrairJsonPlanejamento(conteudoSelecao));
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
                            "A maIA retornou uma cidade vazia na seleção."
                    );
                }

                String normalizada = normalizarCidadeRecomendacao(cidade);
                if (!cidadesNormalizadas.add(normalizada)) {
                    throw new IllegalStateException(
                            "A maIA repetiu uma cidade na seleção: " + cidade + "."
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
             * A etapa de seleção pode retornar 1, 2 ou 3 cidades. Em vez de
             * pedir ao modelo que detalhe todas em um único JSON grande,
             * fazemos uma chamada curta para cada cidade. Isso evita que o
             * modelo omita uma das cidades durante o detalhamento.
             *
             * O Java reúne os resultados em um único JSON, valida a quantidade,
             * garante que nenhuma cidade foi trocada ou repetida e só então
             * converte para RecomendacaoResponse.
             */
            com.fasterxml.jackson.databind.node.ArrayNode destinosDetalhados =
                    objectMapper.createArrayNode();

            // Uma análise estruturada por cidade substitui as duas chamadas
            // anteriores (detalhamento + avaliação). A pontuação continua no Java.
            for (String cidadeSelecionada : cidades) {
                long inicioCidade = System.nanoTime();
                String promptCompleto = """
                        Você é a maIA, assistente de viagens para mulheres.
                        Analise EXCLUSIVAMENTE a cidade selecionada: %s.
                        Não troque a cidade. Produza uma análise específica,
                        útil, crítica e não genérica, inclusive para quem viaja sozinha.

                        PERFIL DA VIAJANTE:
                        %s

                        REQUISITOS INDISPENSÁVEIS (um status por item, texto idêntico):
                        %s
                        INTERESSES (um status por item, texto idêntico):
                        %s
                        MOBILIDADE: %s
                        RITMO: %s
                        PERÍODO: %s
                        ORÇAMENTO: %s
                        OBSERVAÇÕES LIVRES: %s

                        CRITÉRIOS DE QUALIDADE:
                        - Considere todos os requisitos e interesses separadamente.
                        - Requisitos indispensáveis têm prioridade; não esconda conflitos.
                        - Segurança: não invente índices, estatísticas, policiamento,
                          garantias ou classificações de bairros como seguros.
                          Ofereça orientações práticas, reconhecendo incertezas.
                        - Mobilidade: diferencie opções a pé, transporte público e
                          deslocamentos que podem exigir carro ou transporte privado.
                        - Período: use somente sazonalidade geral; não invente previsão.
                        - Orçamento: sem custos verificáveis, use NAO_VERIFICAVEL.
                        - Águas quentes em contexto de praia = temperatura da água do mar,
                          nunca águas termais, salvo pedido explícito.
                        - Não invente preços, clima futuro ou fatos locais incertos.
                        - Em pontosDeAtencao, destaque limitações reais para o perfil.
                        - Para cada critério, use exclusivamente ATENDE, PARCIAL,
                          NAO_ATENDE ou NAO_VERIFICAVEL. Seja crítico e independente.
                          ATENDE requer base suficiente; PARCIAL significa condição,
                          restrição regional ou atendimento incompleto; NAO_ATENDE é
                          incompatibilidade; NAO_VERIFICAVEL significa falta de dados.
                        - Se mobilidade repetir requisito indispensável, use
                          NAO_VERIFICAVEL em avaliacaoMobilidade para não duplicar.
                        - Não calcule percentuais: o Java calcula a compatibilidade.
                        - Retorne JSON puro, válido, sem Markdown, com exatamente
                          um destino e todos os campos abaixo. Evite textos longos.

                        {"destinos":[{
                          "cidade":"string", "estadoOuRegiao":"string", "pais":"string",
                          "resumo":"string", "porQueCombina":"string",
                          "seguranca":"string", "mobilidade":"string",
                          "clima":"string", "melhorRegiaoParaFicar":"string",
                          "caracteristicasRelevantes":["string"],
                          "pontosPositivos":["string"],
                          "pontosDeAtencao":["string"],
                          "avaliacoesRequisitos":[{"criterio":"string","status":"ATENDE"}],
                          "avaliacoesInteresses":[{"criterio":"string","status":"ATENDE"}],
                          "avaliacaoMobilidade":"ATENDE",
                          "avaliacaoRitmo":"ATENDE",
                          "avaliacaoPeriodo":"ATENDE",
                          "avaliacaoOrcamento":"NAO_VERIFICAVEL"
                        }]}
                        Em cada lista de descrição, inclua de 2 a 4 itens relevantes.
                        Se não houver requisitos/interesses, retorne array vazio.
                        """.formatted(
                                cidadeSelecionada,
                                perfil,
                                listaOuNaoInformado(planejamento.getRequisitosSelecionados()),
                                listaOuNaoInformado(planejamento.getInteresses()),
                                valorOuNaoInformado(planejamento.getMobilidade()),
                                valorOuNaoInformado(planejamento.getRitmoDestino()),
                                valorOuNaoInformado(planejamento.getPeriodo()),
                                valorOuNaoInformado(planejamento.getOrcamento()),
                                valorOuNaoInformado(planejamento.getRequisitosIndispensaveis())
                        );

                Map<String, Object> corpoCompleto = Map.of(
                        "model", model,
                        "messages", List.of(Map.of(
                                "role", "system", "content", promptCompleto
                        )),
                        "temperature", 0.1,
                        "max_completion_tokens", 3200,
                        "response_format", Map.of("type", "json_object")
                );
                corpoCompleto = configurarRaciocinioLeveSeSuportado(corpoCompleto);

                System.out.println("Planejamento maIA - análise integrada: "
                        + cidadeSelecionada + ".");

                String conteudoCidade;
                try {
                    conteudoCidade = executarRequisicao(corpoCompleto);
                } catch (IllegalStateException erroGroq) {
                    if (!erroJsonInvalidoGroq(erroGroq)) {
                        throw erroGroq;
                    }
                    System.out.println("Planejamento maIA - JSON inválido para "
                            + cidadeSelecionada + "; repetindo somente esta cidade "
                            + "sem JSON mode.");
                    conteudoCidade = executarRequisicao(
                            corpoPlanejamentoSemJsonMode(corpoCompleto, 4000), false);
                }

                JsonNode jsonCidade = objectMapper.readTree(
                        extrairJsonPlanejamento(conteudoCidade));
                JsonNode destinosCidade = jsonCidade.path("destinos");
                if (!destinosCidade.isArray() || destinosCidade.size() != 1) {
                    throw new IllegalStateException(
                            "A maIA não retornou exatamente um destino para "
                                    + cidadeSelecionada);
                }

                JsonNode destinoDetalhado = destinosCidade.get(0);
                if (!(destinoDetalhado instanceof
                        com.fasterxml.jackson.databind.node.ObjectNode)) {
                    throw new IllegalStateException("Destino retornado em formato inválido.");
                }

                String cidadeRetornada = destinoDetalhado.path("cidade")
                        .asText("").trim();
                String cidadeEsperada = cidadeSelecionada.split(",")[0].trim();
                if (!normalizarCidadeRecomendacao(cidadeRetornada).equals(
                        normalizarCidadeRecomendacao(cidadeEsperada))) {
                    throw new IllegalStateException("A maIA trocou a cidade "
                            + cidadeEsperada + " por " + cidadeRetornada + ".");
                }

                // Nunca apresentar avaliação incompleta como resultado confiável.
                if (!destinoDetalhado.path("avaliacoesRequisitos").isArray()
                        || !destinoDetalhado.path("avaliacoesInteresses").isArray()) {
                    throw new IllegalStateException(
                            "Avaliações de requisitos ou interesses ausentes para "
                                    + cidadeRetornada);
                }
                for (String campo : List.of("resumo", "porQueCombina",
                        "seguranca", "mobilidade", "clima", "melhorRegiaoParaFicar",
                        "avaliacaoMobilidade", "avaliacaoRitmo",
                        "avaliacaoPeriodo", "avaliacaoOrcamento")) {
                    if (destinoDetalhado.path(campo).asText("").isBlank()) {
                        throw new IllegalStateException("Campo obrigatório ausente: "
                                + campo + " em " + cidadeRetornada);
                    }
                }
                for (String campo : List.of("caracteristicasRelevantes",
                        "pontosPositivos", "pontosDeAtencao")) {
                    if (!destinoDetalhado.path(campo).isArray()) {
                        throw new IllegalStateException("Lista obrigatória ausente: "
                                + campo + " em " + cidadeRetornada);
                    }
                }

                int compatibilidadeCalculada = calcularCompatibilidadePlanejamento(
                        planejamento, destinoDetalhado);
                ((com.fasterxml.jackson.databind.node.ObjectNode) destinoDetalhado)
                        .put("compatibilidade", compatibilidadeCalculada);
                destinosDetalhados.add(destinoDetalhado);
                long duracaoMs = (System.nanoTime() - inicioCidade) / 1_000_000L;
                System.out.println("Planejamento maIA - " + cidadeRetornada
                        + ": compatibilidade=" + compatibilidadeCalculada
                        + "%, análise=" + duracaoMs + " ms.");
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
                            (a, b) -> {
                                Integer compatibilidadeB = b.getCompatibilidade();
                                Integer compatibilidadeA = a.getCompatibilidade();
                                return Integer.compare(
                                        compatibilidadeB == null ? 0 : compatibilidadeB,
                                        compatibilidadeA == null ? 0 : compatibilidadeA
                                );
                            }
                    );

            System.out.println(
                    "Planejamento maIA concluído: "
                            + recomendacao.getDestinos().size()
                            + " cidade(s) distinta(s) e detalhada(s)."
            );

            return recomendacao;

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Não foi possível gerar recomendações: " + e.getMessage(),
                    e
            );
        }
    }

    /**
     * O erro json_validate_failed ocorre antes de o provedor entregar o
     * conteúdo. Uma única nova chamada sem JSON mode permite que o backend
     * faça a validação do JSON, sem afetar o chat nem outras integrações.
     */
    private boolean erroJsonInvalidoGroq(Exception erro) {
        String mensagem = erro.getMessage();
        return mensagem != null && mensagem.toLowerCase(Locale.ROOT)
                .contains("json_validate_failed");
    }

    private Map<String, Object> corpoPlanejamentoSemJsonMode(
            Map<String, Object> corpoOriginal, int limiteTokens) {
        Map<String, Object> corpo =
                new java.util.LinkedHashMap<>(corpoOriginal);
        corpo.remove("response_format");
        corpo.put("max_completion_tokens", limiteTokens);
        return configurarRaciocinioLeveSeSuportado(corpo);
    }

    /** Aceita JSON puro ou cercado por bloco markdown no retry sem JSON mode. */
    private String extrairJsonPlanejamento(String conteudo) {
        if (conteudo == null || conteudo.isBlank()) {
            throw new IllegalStateException("A maIA retornou JSON vazio.");
        }
        int inicio = conteudo.indexOf('{');
        int fim = conteudo.lastIndexOf('}');
        if (inicio < 0 || fim <= inicio) {
            throw new IllegalStateException("A maIA não retornou um objeto JSON.");
        }
        return conteudo.substring(inicio, fim + 1);
    }

    // PROMPT DO PLANEJAMENTO

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
                    "Nenhuma. A viajante aceita recomendações sem região previamente definida.";
        } else {
            restricao =
                    "Obrigatória: todas as recomendações devem estar geograficamente em "
                            + destinoInformado
                            + ".";
        }

        return """
                PERFIL DA VIAGEM
                Restrição geográfica: %s
                Período: %s
                Orçamento aproximado: %s
                Ritmo desejado: %s
                Mobilidade desejada: %s
                Interesses: %s
                Não pode faltar / requisitos indispensáveis: %s
                Detalhes adicionais: %s

                Os requisitos indispensáveis são a única lista de critérios de
                prioridade máxima. Não duplique peso porque um requisito também
                apareça no texto livre.

                REGRA DE INTERPRETAÇÃO:
                Se "Águas quentes" aparecer em contexto de praia, mar, litoral,
                banho ou piscinas naturais, interprete como ÁGUA DO MAR QUENTE OU
                MORNA. Não interprete como termas ou fontes termais sem pedido
                explícito da viajante.

                Interprete o texto livre semanticamente. Expressões como
                "não quero", "preciso", "não abro mão", "tem que ter" e
                "indispensável" são restrições fortes.
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
    // FUNÇÕES AUXILIARES
    // =========================================================

    private String valorOuNaoInformado(
            Object valor
    ) {

        if (
                valor == null
        ) {
            return "Não informado";
        }

        String texto =
                valor
                        .toString()
                        .trim();

        if (
                texto.isBlank()
        ) {
            return "Não informado";
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
                    "A maIA não retornou recomendações válidas."
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
                    " Validação de destinos: "
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
                        "A maIA retornou um destino sem cidade válida."
                );
            }

            cidadesUnicas.add(cidade);
        }

        System.out.println(
                " Validação de destinos: "
                        + quantidadeRecebida
                        + " recebidos / "
                        + cidadesUnicas.size()
                        + " cidades únicas."
        );

        if (cidadesUnicas.size() != quantidadeRecebida) {
            throw new IllegalStateException(
                    "A maIA retornou cidades repetidas. "
                            + "Todas as recomendações devem ser cidades diferentes."
            );
        }
    }

    // =========================================================
    // DETECÇÃO DE TOOL USE INDESEJADO NO CHAT
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
    // REQUISIÇÃO PARA GROQ
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
                        .timeout(java.time.Duration.ofSeconds(90))
                        .header(
                                "Authorization",
                                "Bearer "
                                        + apiKey
                        )
                        .header(
                                "Content-Type",
                                "application/json; charset=UTF-8"
                        )
                        .POST(
                                HttpRequest
                                        .BodyPublishers
                                        .ofString(
                                                json
                                        )
                        )
                        .build();

        HttpResponse<String> response = null;
        final int maxTentativas = 4;
        final int maxTentativas429 = 2;

        for (int tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            try {
                response = httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString(java.nio.charset.StandardCharsets.UTF_8)
                );
            } catch (java.io.IOException erroConexao) {
                // Connection reset, timeout e outras falhas transitórias de transporte
                // não têm resposta HTTP para analisar; reenviar a mesma requisição.
                if (tentativa == maxTentativas) {
                    throw new IllegalStateException(
                            "Não foi possível concluir a conexão com a Groq após "
                                    + maxTentativas + " tentativas: " + erroConexao.getMessage(),
                            erroConexao
                    );
                }
                long esperaConexaoMs = 1000L * tentativa;
                System.err.println("Falha transitória na conexão com a Groq (tentativa "
                        + tentativa + "/" + maxTentativas + "): "
                        + erroConexao.getClass().getSimpleName() + " - "
                        + erroConexao.getMessage() + ". Nova tentativa em "
                        + esperaConexaoMs + " ms.");
                Thread.sleep(esperaConexaoMs);
                continue;
            }

            if (response.statusCode() != 429) {
                break;
            }

            // Limites de tokens/minuto não desaparecem com retries em sequência.
            if (tentativa >= maxTentativas429) {
                throw new IllegalStateException(
                        "Limite temporário de uso da Groq (HTTP 429). "
                                + "Aguarde o intervalo indicado pelo serviço e tente novamente."
                );
            }

            long esperaMs = Math.min(30000L, 2000L * tentativa);
            String retryAfter = response.headers().firstValue("Retry-After").orElse("");
            try {
                if (!retryAfter.isBlank()) {
                    esperaMs = Math.max(esperaMs,
                            (long) (Double.parseDouble(retryAfter.trim()) * 1000));
                } else {
                    JsonNode erro = objectMapper.readTree(response.body());
                    String mensagem = erro.path("error").path("message").asText("");
                    java.util.regex.Matcher matcher = java.util.regex.Pattern
                            .compile("(?i)try again in\\s+([0-9]+(?:\\.[0-9]+)?)s")
                            .matcher(mensagem);
                    if (matcher.find()) {
                        esperaMs = Math.max(esperaMs,
                                (long) (Double.parseDouble(matcher.group(1)) * 1000) + 500);
                    }
                }
            } catch (Exception ignored) {
                // Usa a espera progressiva quando não houver prazo válido.
            }

            // Evita bloquear longamente o chat e acumular chamadas simultâneas.
            // O usuário pode tentar novamente quando o limite da Groq liberar.
            if (esperaMs > 20000L) {
                throw new IllegalStateException(
                        "Limite temporário da Groq (HTTP 429). "
                                + "Tente novamente após aproximadamente "
                                + ((esperaMs + 999L) / 1000L) + " segundos."
                );
            }
            System.out.println("Groq HTTP 429: aguardando " + esperaMs
                    + " ms antes da tentativa " + (tentativa + 1) + ".");
            Thread.sleep(esperaMs);
        }

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException(
                    "Erro da Groq. HTTP " + response.statusCode() + ": " + response.body()
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

        // Não imprime resposta bruta: pode conter dados pessoais e raciocínio
        // interno do modelo. finish_reason e usage bastam para diagnóstico.

        /*
         * Alguns modelos podem consumir todo o orçamento de completion
         * antes de produzir o conteúdo final. Se isso acontecer, fazemos
         * uma única nova tentativa com um orçamento maior.
         */
        if (
                permitirNovaTentativa &&
                "length".equalsIgnoreCase(finishReason) &&
                (!(corpo.get("max_completion_tokens") instanceof Number limite)
                        || limite.intValue() < 2048)
        ) {

            Map<String, Object> corpoNovaTentativa =
                    new java.util.LinkedHashMap<>(
                            corpo
                    );

            Object limiteAtual =
                    corpoNovaTentativa.get(
                            "max_completion_tokens"
                    );

            int novoLimite = 2048;

            if (limiteAtual instanceof Number numero) {
                novoLimite = Math.max(2048, (int) Math.ceil(numero.intValue() * 1.5));
            }

            corpoNovaTentativa.put(
                    "max_completion_tokens",
                    novoLimite
            );

            System.out.println(
                    " Repetindo chamada à Groq com max_completion_tokens="
                            + novoLimite
            );

            return executarRequisicao(
                    corpoNovaTentativa,
                    false
            );
        }

        throw new IllegalStateException(
                "A Groq respondeu sem conteúdo. finish_reason="
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
                        "requisitos indispensáveis"
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
                        "período"
                );

        ResultadoCriterio orcamentoResultado =
                calcularCriterioUnico(
                        destinoDetalhado.path("avaliacaoOrcamento").asText(""),
                        5.0,
                        "orçamento"
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
                    "Não houve critérios verificáveis suficientes para calcular a compatibilidade."
            );
        }

        int compatibilidade =
                (int) Math.round(
                        Math.max(
                                0.0,
                                Math.min(
                                        100.0,
                                        pontosObtidos
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
                        + ", período="
                        + formatarPontos(periodoResultado.pontosObtidos())
                        + "/"
                        + formatarPontos(periodoResultado.pesoAvaliado())
                        + " avaliados de 5"
                        + ", orçamento="
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
                    "A maIA retornou uma quantidade inválida de avaliações para "
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
                        "A maIA retornou uma avaliação sem critério em "
                                + nomeBloco
                                + "."
                );
            }

            String chave =
                    normalizarCriterioPlanejamento(criterio);

            if (statusPorCriterio.put(chave, status) != null) {
                throw new IllegalStateException(
                        "A maIA repetiu um critério na avaliação de "
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
                        "A maIA não avaliou o critério "
                                + criterioEsperado
                                + " em "
                                + nomeBloco
                                + "."
                );
            }

            String statusNormalizado =
                    normalizarStatusAvaliacao(status);

            System.out.println(
                    " Avaliação "
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
                " Avaliação "
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
                            "A maIA retornou um status de avaliação inválido: "
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
