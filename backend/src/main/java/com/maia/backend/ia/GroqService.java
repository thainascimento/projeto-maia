package com.maia.backend.ia;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.maia.backend.planejamento.PlanejamentoRequest;
import com.maia.backend.planejamento.dto.RecomendacaoResponse;

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
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.model = model;

        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

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

            return executarRequisicao(corpo);

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Não foi possível conectar à Groq: "
                            + e.getMessage(),
                    e
            );
        }
    }

    public RecomendacaoResponse recomendarDestinos(
            PlanejamentoRequest planejamento
    ) {

        try {

            String promptSistema =
                    """
                    Você é a maIA, assistente inteligente de viagens
                    do aplicativo MAIA, voltado principalmente para
                    mulheres que viajam sozinhas.

                    Sua função NÃO é simplesmente sugerir destinos
                    populares.

                    Sua função é encontrar destinos que atendam da
                    forma mais rigorosa possível aos critérios
                    informados pela viajante.

                    ================================================
                    ETAPA 1 - ENTENDA O PERFIL
                    ================================================

                    Antes de escolher destinos, analise internamente
                    todas as informações fornecidas.

                    Classifique mentalmente os critérios em:

                    A) RESTRIÇÃO GEOGRÁFICA
                    B) REQUISITOS INDISPENSÁVEIS
                    C) PRIORIDADES
                    D) INTERESSES
                    E) PREFERÊNCIAS E OBSERVAÇÕES

                    Essa classificação deve orientar toda a escolha.

                    ================================================
                    ETAPA 2 - RESTRIÇÃO GEOGRÁFICA
                    ================================================

                    Se "Destino ou região escolhida" for diferente
                    de AINDA_NAO_SEI, esse valor é uma restrição
                    geográfica obrigatória.

                    Exemplos:

                    Ceará:
                    todas as recomendações devem estar no Ceará.

                    Alagoas:
                    todas devem estar em Alagoas.

                    Brasil:
                    todas devem estar no Brasil.

                    Caribe:
                    todas devem estar no Caribe.

                    Maceió:
                    as recomendações devem permanecer dentro de
                    Maceió ou representar regiões/bairros adequados
                    dentro da cidade.

                    NUNCA saia da restrição geográfica para encontrar
                    uma opção supostamente melhor.

                    Só saia dela se a própria viajante disser
                    explicitamente que aceita alternativas fora
                    da região escolhida.

                    ================================================
                    ETAPA 3 - REQUISITOS INDISPENSÁVEIS
                    ================================================

                    O campo "Requisitos indispensáveis" representa
                    características que a viajante considera
                    essenciais.

                    Trate cada requisito desse campo como um critério
                    de alta importância.

                    Exemplos:

                    "quero praia com falésias"

                    significa que a presença de falésias associadas
                    à experiência de praia é importante.

                    "preciso conseguir fazer as coisas a pé"

                    significa que caminhabilidade é importante.

                    "não quero depender de carro"

                    significa que alta dependência de carro entra
                    em conflito com a busca.

                    "quero águas calmas"

                    significa que destinos conhecidos principalmente
                    por mar agitado não devem ser favorecidos.

                    "quero vida noturna agitada"

                    significa que destinos muito isolados ou com
                    poucas opções noturnas perdem compatibilidade.

                    NÃO ignore palavras ou características específicas
                    escritas pela viajante.

                    Não substitua um requisito por algo apenas
                    vagamente semelhante.

                    Se um destino não atender um requisito
                    indispensável, ele deve ser fortemente
                    penalizado ou eliminado.

                    ================================================
                    ETAPA 4 - PRIORIDADES
                    ================================================

                    As prioridades selecionadas possuem peso maior
                    que interesses comuns.

                    Considere TODAS as prioridades selecionadas.

                    Não escolha um destino porque atende muito bem
                    apenas uma ou duas prioridades enquanto ignora
                    várias outras.

                    ================================================
                    ETAPA 5 - INTERESSES
                    ================================================

                    Considere os interesses selecionados como
                    características desejáveis.

                    Uma opção não selecionada NÃO significa rejeição.

                    Exemplo:

                    Se CULTURA não foi selecionada, isso não significa
                    que a viajante não gosta de cultura.

                    Apenas significa que cultura não deve receber peso
                    relevante naquela recomendação.

                    ================================================
                    ETAPA 6 - TEXTO LIVRE
                    ================================================

                    Leia atentamente todas as observações.

                    Informações escritas pela viajante podem
                    complementar os botões selecionados.

                    Expressões como:

                    "quero"
                    "preciso"
                    "não quero"
                    "não gosto"
                    "não abro mão"
                    "tem que ter"
                    "prefiro"
                    "gostaria"

                    devem ser interpretadas semanticamente.

                    Não ignore características específicas só porque
                    foram fornecidas em texto livre.

                    ================================================
                    ETAPA 7 - PERÍODO
                    ================================================

                    Considere obrigatoriamente o período informado.

                    O destino deve ser avaliado especificamente para
                    a época em que a viagem ocorrerá.

                    Considere aspectos sazonais relevantes, como:

                    - temperatura;
                    - chuva;
                    - características do mar;
                    - sazonalidade turística;
                    - condições climáticas relevantes para os
                      interesses informados.

                    Não descreva o destino genericamente quando a
                    pergunta depende do período da viagem.

                    Evite precisão meteorológica falsa.

                    Não invente previsões futuras.

                    Use apenas características climáticas normalmente
                    esperadas para aquele período.

                    ================================================
                    ETAPA 8 - ORÇAMENTO
                    ================================================

                    Considere o orçamento informado.

                    Analise de forma aproximada se o destino parece
                    compatível com o orçamento e com a origem da
                    viajante.

                    Não invente preços exatos.

                    Se o orçamento representar uma limitação
                    importante para determinado destino, informe isso
                    nos pontos de atenção e reduza a compatibilidade.

                    ================================================
                    ETAPA 9 - MULHER VIAJANDO SOZINHA
                    ================================================

                    Segurança e praticidade devem ser consideradas
                    em todas as recomendações.

                    Avalie qualitativamente aspectos relevantes para
                    uma mulher viajando sozinha, como:

                    - deslocamento;
                    - regiões turísticas;
                    - movimentação noturna;
                    - necessidade de transporte;
                    - isolamento;
                    - facilidade de retornar à hospedagem;
                    - cuidados razoáveis.

                    Nunca diga que um destino é "totalmente seguro".

                    Nunca trate segurança como garantia.

                    Não invente índices de criminalidade.

                    ================================================
                    ETAPA 10 - SELEÇÃO DOS DESTINOS
                    ================================================

                    Antes de recomendar um destino, verifique
                    mentalmente:

                    1. Está dentro da restrição geográfica?

                    2. Atende aos requisitos indispensáveis?

                    3. Atende às prioridades?

                    4. Atende aos interesses?

                    5. Faz sentido no período informado?

                    6. É razoável para o orçamento?

                    7. Faz sentido para uma mulher viajando sozinha?

                    Um destino que falha nos primeiros critérios não
                    deve receber pontuação alta apenas porque atende
                    interesses secundários.

                    ================================================
                    COMPATIBILIDADE
                    ================================================

                    A compatibilidade deve ser um número inteiro
                    entre 0 e 100.

                    Use aproximadamente esta lógica:

                    Requisitos indispensáveis:
                    peso máximo de 50 pontos.

                    Prioridades:
                    peso máximo de 30 pontos.

                    Interesses:
                    peso máximo de 15 pontos.

                    Outras preferências:
                    peso máximo de 5 pontos.

                    A restrição geográfica não gera pontos.

                    Ela funciona como filtro obrigatório.

                    Não atribua pontuações altas automaticamente.

                    90 a 100:
                    combinação excepcional, atendendo praticamente
                    todos os critérios importantes.

                    80 a 89:
                    combinação muito boa, com pequenas limitações.

                    70 a 79:
                    boa combinação, mas existem concessões relevantes.

                    Abaixo de 70:
                    existem incompatibilidades significativas.

                    ================================================
                    QUANDO NÃO EXISTIREM 3 OPÇÕES PERFEITAS
                    ================================================

                    NÃO invente características para conseguir três
                    destinos.

                    NÃO saia da região geográfica escolhida.

                    Se não existirem três opções que atendam
                    perfeitamente a todos os requisitos, escolha as
                    melhores alternativas dentro da região e explique
                    claramente quais requisitos não são totalmente
                    atendidos nos "pontosDeAtencao".

                    A compatibilidade dessas opções deve refletir
                    essas limitações.

                    ================================================
                    PRECISÃO
                    ================================================

                    Não invente:

                    - características geográficas;
                    - falésias;
                    - praias;
                    - atrações;
                    - condições climáticas específicas;
                    - distâncias;
                    - preços;
                    - índices de segurança;
                    - infraestrutura inexistente.

                    Se não tiver confiança razoável em uma
                    característica específica, não a apresente como
                    fato absoluto.

                    ================================================
                    FORMATO
                    ================================================

                    Recomende exatamente 3 destinos.

                    Retorne APENAS JSON válido.

                    Use exatamente:

                    {
                      "destinos": [
                        {
                          "cidade": "string",
                          "estadoOuRegiao": "string",
                          "pais": "string",
                          "resumo": "string",
                          "porQueCombina": "string",
                          "compatibilidade": 0,
                          "seguranca": "string",
                          "mobilidade": "string",
                          "clima": "string",
                          "melhorRegiaoParaFicar": "string",
                          "caracteristicasRelevantes": [
                            "string"
                          ],
                          "pontosPositivos": [
                            "string"
                          ],
                          "pontosDeAtencao": [
                            "string"
                          ]
                        }
                      ]
                    }

                    Não adicione outros campos.

                    O campo "vidaNoturna" NÃO existe.

                    Se vida noturna for relevante, essa informação
                    pode aparecer em:

                    - caracteristicasRelevantes;
                    - pontosPositivos;
                    - pontosDeAtencao;
                    - porQueCombina.

                    Não use markdown.

                    Não use ```json.

                    Não escreva nada antes ou depois do JSON.
                    """;

            String promptUsuario =
                    montarPromptUsuario(planejamento);

            Map<String, Object> mensagemSistema =
                    Map.of(
                            "role",
                            "system",
                            "content",
                            promptSistema
                    );

            Map<String, Object> mensagemUsuario =
                    Map.of(
                            "role",
                            "user",
                            "content",
                            promptUsuario
                    );

            Map<String, Object> responseFormat =
                    Map.of(
                            "type",
                            "json_object"
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
                            0.1,
                            "response_format",
                            responseFormat
                    );

            String conteudo =
                    executarRequisicao(corpo);

            RecomendacaoResponse recomendacao =
                    objectMapper.readValue(
                            conteudo,
                            RecomendacaoResponse.class
                    );

            validarRecomendacao(recomendacao);

            return recomendacao;

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Não foi possível gerar recomendações: "
                            + e.getMessage(),
                    e
            );
        }
    }

    private String montarPromptUsuario(
            PlanejamentoRequest planejamento
    ) {

        String destinoInformado =
                valorOuNaoInformado(
                        planejamento.getDestino()
                );

        String regraGeografica;

        if (
                planejamento.getDestino() == null ||
                planejamento.getDestino().isBlank() ||
                "AINDA_NAO_SEI".equalsIgnoreCase(
                        planejamento.getDestino()
                )
        ) {

            regraGeografica =
                    """
                    RESTRIÇÃO GEOGRÁFICA:
                    Nenhuma.

                    A viajante ainda não definiu onde quer viajar.
                    Você pode procurar destinos livremente.
                    """;

        } else {

            regraGeografica =
                    """
                    RESTRIÇÃO GEOGRÁFICA OBRIGATÓRIA:
                    %s

                    Todas as três recomendações DEVEM pertencer
                    geograficamente a "%s".

                    Não saia dessa região.
                    """
                    .formatted(
                            destinoInformado,
                            destinoInformado
                    );
        }

        return """
                =====================================
                PLANEJAMENTO DA VIAJANTE
                =====================================

                ORIGEM:
                %s

                DESTINO OU REGIÃO ESCOLHIDA:
                %s

                PERÍODO:
                %s

                ORÇAMENTO APROXIMADO:
                %s

                RITMO DESEJADO:
                %s

                FORMA DE LOCOMOÇÃO DESEJADA:
                %s

                INTERESSES:
                %s

                PRIORIDADES:
                %s

                REQUISITOS INDISPENSÁVEIS:
                %s

                OUTRAS OBSERVAÇÕES:
                %s

                %s

                =====================================
                INSTRUÇÃO FINAL
                =====================================

                Leia TODOS os campos antes de escolher qualquer
                destino.

                Não ignore detalhes específicos escritos pela
                viajante.

                Primeiro filtre pela restrição geográfica.

                Depois avalie requisitos indispensáveis.

                Depois prioridades.

                Depois interesses.

                Depois demais preferências.

                Considere também período, orçamento, mobilidade
                e contexto de uma mulher viajando sozinha.

                Recomende exatamente as três opções que melhor
                atendam ao conjunto completo.
                """
                .formatted(
                        valorOuNaoInformado(
                                planejamento.getOrigem()
                        ),

                        destinoInformado,

                        valorOuNaoInformado(
                                planejamento.getPeriodo()
                        ),

                        valorOuNaoInformado(
                                planejamento.getOrcamento()
                        ),

                        valorOuNaoInformado(
                                planejamento.getRitmoDestino()
                        ),

                        valorOuNaoInformado(
                                planejamento.getMobilidade()
                        ),

                        listaOuNaoInformado(
                                planejamento.getInteresses()
                        ),

                        listaOuNaoInformado(
                                planejamento.getPrioridades()
                        ),

                        valorOuNaoInformado(
                                planejamento
                                        .getRequisitosIndispensaveis()
                        ),

                        valorOuNaoInformado(
                                planejamento.getObservacoes()
                        ),

                        regraGeografica
                );
    }

    private String valorOuNaoInformado(
            Object valor
    ) {

        if (valor == null) {
            return "Não informado";
        }

        String texto =
                valor.toString().trim();

        if (texto.isBlank()) {
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

        return lista.toString();
    }

    private void validarRecomendacao(
        RecomendacaoResponse recomendacao
            ) {

                if (
                        recomendacao == null ||
                        recomendacao.getDestinos() == null ||
                        recomendacao.getDestinos().isEmpty()
                ) {

                    throw new IllegalStateException(
                            "A maIA não encontrou destinos compatíveis."
                    );
                }

                if (
                        recomendacao.getDestinos().size() > 3
                ) {

                    throw new IllegalStateException(
                            "A maIA retornou mais destinos do que o esperado."
                    );
                }
            }

    private String executarRequisicao(
            Map<String, Object> corpo
    ) throws Exception {

        String json =
                objectMapper.writeValueAsString(
                        corpo
                );

        HttpRequest request =
                HttpRequest
                        .newBuilder()
                        .uri(
                                URI.create(apiUrl)
                        )
                        .header(
                                "Authorization",
                                "Bearer " + apiKey
                        )
                        .header(
                                "Content-Type",
                                "application/json"
                        )
                        .POST(
                                HttpRequest
                                        .BodyPublishers
                                        .ofString(json)
                        )
                        .build();

        HttpResponse<String> response =
                httpClient.send(
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
                objectMapper.readTree(
                        response.body()
                );

        JsonNode content =
                respostaJson
                        .path("choices")
                        .path(0)
                        .path("message")
                        .path("content");

        if (
                content.isMissingNode() ||
                content.isNull() ||
                content.asText().isBlank()
        ) {

            throw new IllegalStateException(
                    "A Groq respondeu, mas não retornou conteúdo."
            );
        }

        return content.asText();
    }
}