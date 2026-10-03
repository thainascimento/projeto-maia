package com.maia.backend.ia;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.maia.backend.clima.ClimaResponse;
import com.maia.backend.clima.ClimaService;
import com.maia.backend.geocoding.GeoapifyPlacesService;
import com.maia.backend.geocoding.GeoapifyPlacesService.LocalizacaoResponse;
import com.maia.backend.local.LocalResponse;
import com.maia.backend.mare.MareResponse;
import com.maia.backend.mare.MareService;
import com.maia.backend.usuario.Usuario;
import com.maia.backend.usuario.UsuarioRepository;
import com.maia.backend.viagem.Viagem;
import com.maia.backend.viagem.ViagemService;

@RestController
@RequestMapping("/ia")
public class IAController {

    private final GroqService groqService;
    private final ViagemService viagemService;
    private final ClimaService climaService;
    private final MareService mareService;
    private final GeoapifyPlacesService geoapifyPlacesService;
    private final UsuarioRepository usuarioRepository;
    private static final int TAMANHO_PAGINA_LOCAIS = 8;

    public IAController(
            GroqService groqService,
            ViagemService viagemService,
            ClimaService climaService,
            MareService mareService,
            GeoapifyPlacesService geoapifyPlacesService,
            UsuarioRepository usuarioRepository
    ) {
        this.groqService = groqService;
        this.viagemService = viagemService;
        this.climaService = climaService;
        this.mareService = mareService;
        this.geoapifyPlacesService = geoapifyPlacesService;
        this.usuarioRepository = usuarioRepository;
    }

    // =========================================================
    // TESTE DA IA
    // =========================================================

    @GetMapping("/teste")
    public ResponseEntity<?> testarIA() {

        try {
            return ResponseEntity.ok(
                    groqService.testarConexao()
            );

        } catch (IllegalStateException e) {
            return ResponseEntity
                    .internalServerError()
                    .body(e.getMessage());
        }
    }


    // =========================================================
    // INTERPRETAÇÃO DE INTENÇÃO
    // =========================================================

    @PostMapping("/interpretar")
    public ResponseEntity<?> interpretar(
            @RequestBody MaiaMensagemRequest request
    ) {

        if (
                request == null ||
                request.mensagem() == null ||
                request.mensagem().isBlank()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body("A mensagem é obrigatória.");
        }

        GroqService.InterpretacaoIntencao interpretacao =
                groqService.interpretarIntencao(
                        request.mensagem(),
                        request.historico()
                );

        if (interpretacao == null) {

            boolean fallbackGps =
                    mensagemPedeLocalizacaoAtual(
                            request.mensagem()
                    );

            return ResponseEntity.ok(
                    new GroqService.InterpretacaoIntencao(
                            "CONVERSA_GERAL",
                            fallbackGps
                                    ? "GPS_ATUAL": "NENHUMA",
                            null,
                            fallbackGps,
                            "NENHUMA",
                            null,
                            null,
                            "NENHUM"
                    )
            );
        }

        return ResponseEntity.ok(
                interpretacao
        );
    }

    // =========================================================
    // CONVERSA COM A maIA
    // =========================================================

    @PostMapping("/conversar")
    public ResponseEntity<?> conversar(
            @RequestBody MaiaMensagemRequest request
    ) {

        if (
                request == null ||
                request.mensagem() == null ||
                request.mensagem().isBlank()
        ) {
            return ResponseEntity
                    .badRequest()
                    .body("A mensagem é obrigatória.");
        }

        try {

            Viagem viagemAtiva =
                    buscarViagemAtiva(
                            request.usuarioId()
                    );

            ContextoUsuarioMaia contextoUsuario =
                    buscarContextoUsuario(
                            request.usuarioId()
                    );

            // =====================================================
            // INTERPRETAÇÃO DE INTENÇÃO
            // =====================================================

            /*
             * A Groq interpreta a linguagem natural.
             * O controller continua responsável por executar os
             * serviços reais: GPS, clima, Geoapify, maré etc.
             *
             * Assim a usuária não precisa decorar frases específicas.
             */
            /*
             * A interpretação normalmente já vem do frontend, que chamou
             * /ia/interpretar antes de decidir se precisava obter o GPS.
             *
             * Reutilizamos exatamente essa interpretação aqui para NÃO
             * chamar a Groq uma segunda vez para classificar a mesma mensagem.
             *
             * O fallback continua existindo para compatibilidade com clientes
             * antigos ou caso a interpretação não tenha sido enviada.
             */
            GroqService.InterpretacaoIntencao interpretacao;

            if (
                    request.intencaoInterpretada() != null &&
                    !request.intencaoInterpretada().isBlank()
            ) {

                interpretacao =
                        new GroqService.InterpretacaoIntencao(
                                request.intencaoInterpretada(),
                                request.referenciaGeograficaInterpretada() == null
                                        ? "NENHUMA": request.referenciaGeograficaInterpretada(),
                                request.categoriaLocalInterpretada(),
                                Boolean.TRUE.equals(
                                        request.precisaGpsInterpretada()
                                ),
                                request.referenciaConversacionalInterpretada() == null
                                        ? "NENHUMA": request.referenciaConversacionalInterpretada(),
                                request.criterioInterpretado(),
                                request.indiceLocalInterpretado(),
                                request.escopoResultadosInterpretado() == null
                                        ? "NENHUM"
                                        : request.escopoResultadosInterpretado()
                        );

                System.out.println(
                        " Interpretação reutilizada do frontend; "+ "Groq não foi chamada novamente para classificar.");

            } else {

                interpretacao =
                        groqService.interpretarIntencao(
                                request.mensagem(),
                                request.historico()
                        );

                System.out.println(
                        " Interpretação não veio no request; "+ "usando classificação Groq como fallback.");
            }

            boolean pediuDestinoViagem;
            boolean pediuLocalizacaoAtual;

            boolean usaSomenteResultadosAnteriores =
                interpretacao != null &&
                "RESULTADOS_ANTERIORES".equals(
                        interpretacao.referenciaConversacional()
                ) &&
                (
                        "COMPARAR_LOCAIS".equals(
                                interpretacao.intencao()
                        ) ||
                        "DETALHAR_LOCAL".equals(
                                interpretacao.intencao()
                        ) ||
                        "MAIS_RESULTADOS".equals(
                                interpretacao.intencao()
                        )
                );

            if (interpretacao != null) {

                /*
                 * Comparações e detalhamentos dos resultados já exibidos
                 * devem ser respondidos pelo histórico, sem pedir GPS outra vez.
                 *
                 * Isso cobre, por exemplo:
                 * "qual o mais perto?"* "qual tem site?"* "e o segundo?"*/
                if (
                        usaSomenteResultadosAnteriores
                ) {

                    pediuDestinoViagem =
                            false;

                    pediuLocalizacaoAtual =
                            false;

                } else {

                    pediuDestinoViagem =
                            "DESTINO_VIAGEM".equals(
                                    interpretacao.referenciaGeografica()
                            );

                    pediuLocalizacaoAtual =
                            "GPS_ATUAL".equals(
                                    interpretacao.referenciaGeografica()
                            );
                }

                System.out.println(
                        " Intenção maIA: "+ interpretacao.intencao()
                );

                System.out.println(
                        " Referência interpretada: "+ interpretacao.referenciaGeografica()
                );

                System.out.println(
                        " Precisa GPS: "+ interpretacao.precisaGps()
                );

                System.out.println(
                        " Categoria interpretada: "+ interpretacao.categoriaLocal()
                );

                System.out.println(
                        " Escopo dos resultados: "+ interpretacao.escopoResultados()
                );

            } else {

                /*
                 * Fallback para a lógica antiga caso a interpretação
                 * por IA falhe por indisponibilidade da API.
                 */
                pediuDestinoViagem =
                        mensagemPedeDestinoViagem(
                                request.mensagem()
                        );

                pediuLocalizacaoAtual =
                        !pediuDestinoViagem &&
                        mensagemPedeLocalizacaoAtual(
                                request.mensagem()
                        );

                if (
                        !pediuDestinoViagem &&
                        !pediuLocalizacaoAtual &&
                        mensagemEhConfirmacaoOuContinuacao(
                                request.mensagem()
                        )
                ) {

                    pediuLocalizacaoAtual =
                            historicoPedeLocalizacaoAtual(
                                    request.historico()
                            );
                }
            }

            /*
             * Se a usuária pediu explicitamente a localização atual,
             * as coordenadas precisam ter vindo do celular.
             */
            if (
                    pediuLocalizacaoAtual &&
                    (
                            request.latitudeAtual() == null ||
                            request.longitudeAtual() == null
                    )
            ) {

                return ResponseEntity.ok(
                        new MaiaMensagemResponse(
                                "Para usar sua localização atual, preciso acessar o GPS do seu celular. Verifique se a localização está habilitada no app e tente novamente. ")
                );
            }

            // =====================================================
            // CONFIRMAÇÃO DE ACESSO À LOCALIZAÇÃO ATUAL
            // =====================================================

            /*
             * Se as coordenadas chegaram nesta requisição e a usuária
             * pergunta se a maIA tem a localização, respondemos de forma
             * determinística. Isso evita a Groq afirmar incorretamente
             * que não tem acesso ao GPS.
             */
            if (
                    pediuLocalizacaoAtual &&
                    mensagemPerguntaSeTemLocalizacaoAtual(
                            request.mensagem()
                    )
            ) {

                return ResponseEntity.ok(
                        new MaiaMensagemResponse(
                                "Sim. Nesta solicitação, o app me enviou sua localização atual pelo GPS. Posso usá-la para identificar sua cidade, consultar o clima e buscar lugares próximos. ")
                );
            }

            // =====================================================
            // NOME DA LOCALIZAÇÃO ATUAL
            // =====================================================

            /*
             * Quando a pergunta for especificamente sobre o nome da
             * cidade/localização onde a usuária está agora, usamos
             * reverse geocoding do Geoapify.
             *
             * Isso evita que a Groq:
             * - confunda o GPS atual com o destino da viagem;
             * - diga que o GPS está desligado mesmo tendo recebido
             *   latitude e longitude;
             * - tente deduzir o nome da cidade pelas coordenadas.
             */
            if (
                    pediuLocalizacaoAtual &&
                    (
                            (
                                    interpretacao != null &&
                                    "LOCALIZACAO_ATUAL".equals(
                                            interpretacao.intencao()
                                    )
                            ) ||
                            mensagemPedeNomeLocalizacaoAtual(
                                    request.mensagem()
                            )
                    )
            ) {

                LocalizacaoResponse localizacaoAtual =
                        buscarLocalizacaoAtual(
                                request.latitudeAtual(),
                                request.longitudeAtual()
                        );

                if (localizacaoAtual != null) {

                    return ResponseEntity.ok(
                            new MaiaMensagemResponse(
                                    montarRespostaLocalizacaoAtual(
                                            localizacaoAtual
                                    )
                            )
                    );
                }

                return ResponseEntity.ok(
                        new MaiaMensagemResponse(
                                "Consegui acessar sua localização pelo GPS, mas não consegui identificar com segurança o nome da cidade agora. Tente novamente em alguns instantes. ")
                );
            }

            // =====================================================
            // COORDENADAS DE REFERÊNCIA
            // =====================================================

            Double latitudeReferencia =
                    usaSomenteResultadosAnteriores
                            ? null
                            : definirLatitudeReferencia(
                                    pediuLocalizacaoAtual,
                                    request,
                                    viagemAtiva
                            );

            Double longitudeReferencia =
                    usaSomenteResultadosAnteriores
                            ? null
                            : definirLongitudeReferencia(
                                    pediuLocalizacaoAtual,
                                    request,
                                    viagemAtiva
                            );

            String tipoLocalizacaoReferencia =
                    usaSomenteResultadosAnteriores
                            ? "RESULTADOS_ANTERIORES": (
                                    pediuLocalizacaoAtual
                                            ? "GPS_ATUAL": "DESTINO_VIAGEM");

            System.out.println(
                    "=================================================");

            System.out.println(
                    "Referência geográfica: "+ tipoLocalizacaoReferencia
            );

            System.out.println(
                    "Latitude: "+ latitudeReferencia
            );

            System.out.println(
                    "Longitude: "+ longitudeReferencia
            );

            System.out.println(
                    "=================================================");

            // =====================================================
            // CLIMA
            // =====================================================

            ClimaResponse climaAtual =
                    usaSomenteResultadosAnteriores
                            ? null
                            : buscarClimaSeNecessario(
                                    request.mensagem(),
                                    request.historico(),
                                    viagemAtiva,
                                    pediuLocalizacaoAtual,
                                    request.latitudeAtual(),
                                    request.longitudeAtual()
                            );

            // =====================================================
            // RESPOSTA RÁPIDA PARA TEMPERATURA
            // =====================================================

            /*
             * Perguntas simples de temperatura não precisam de uma segunda
             * chamada à Groq. O dado já veio do ClimaService.
             */
            if (
                    interpretacao != null &&
                    "CLIMA".equals(
                            interpretacao.intencao()
                    ) &&
                    climaAtual != null &&
                    perguntaSimplesDeTemperatura(
                            request.mensagem()
                    )
            ) {

                String respostaTemperatura =
                        montarRespostaTemperaturaRapida(
                                climaAtual,
                                viagemAtiva,
                                pediuLocalizacaoAtual
                        );

                if (
                        respostaTemperatura != null &&
                        !respostaTemperatura.isBlank()
                ) {

                    System.out.println(
                            " Temperatura respondida diretamente pelo backend; "+ "Groq final não foi chamada.");

                    return ResponseEntity.ok(
                            new MaiaMensagemResponse(
                                    respostaTemperatura
                            )
                    );
                }
            }

            // =====================================================
            // MARÉ
            // =====================================================

            MareResponse mareAtual =
                    usaSomenteResultadosAnteriores
                            ? null
                            : buscarMareSeNecessario(
                                    request.mensagem(),
                                    viagemAtiva
                            );

            // =====================================================
            // LOCAIS / ROLÊ!
            // =====================================================

            List<String> categoriasLocaisConsultadas;

            if (
                    usaSomenteResultadosAnteriores
            ) {

                categoriasLocaisConsultadas =
                        List.of();

            } else if (
                    interpretacao != null &&
                    "BUSCAR_LOCAL".equals(
                            interpretacao.intencao()
                    ) &&
                    interpretacao.categoriaLocal() != null &&
                    !interpretacao.categoriaLocal().isBlank()
            ) {

                categoriasLocaisConsultadas =
                        List.of(
                                interpretacao.categoriaLocal()
                        );

            } else {

                categoriasLocaisConsultadas =
                        detectarCategoriasLocal(
                                request.mensagem(),
                                request.historico()
                        );
            }

            boolean buscaLocaisRealizada =
                    !categoriasLocaisConsultadas.isEmpty()
                            && latitudeReferencia != null
                            && longitudeReferencia != null;

            List<LocalResponse> todosLocaisReais;
                List<LocalResponse> locaisReais;

                int paginaLocaisAtual =
                        request.paginaLocaisAtual() == null
                                ? 0
                                : Math.max(
                                        0,
                                        request.paginaLocaisAtual()
                                );

                boolean pediuMaisResultados =
                        interpretacao != null &&
                        "MAIS_RESULTADOS".equals(
                                interpretacao.intencao()
                        );

                // =====================================================
                // FOLLOW-UP: MAIS RESULTADOS
                // =====================================================

                if (
                        pediuMaisResultados &&
                        request.todosLocaisAnteriores() != null &&
                        !request.todosLocaisAnteriores().isEmpty()
                ) {

                /*
                * A busca completa já foi realizada anteriormente.
                *
                * Portanto, não consultamos a Geoapify novamente.
                * Apenas avançamos para a próxima página.
                */
                todosLocaisReais =
                        request.todosLocaisAnteriores();

                paginaLocaisAtual++;

                locaisReais =
                        obterPaginaLocais(
                                todosLocaisReais,
                                paginaLocaisAtual
                        );

                /*
                * Se não existir uma próxima página, mantemos a página
                * anterior para não perder o contexto da conversa.
                */
                if (locaisReais.isEmpty()) {

                        paginaLocaisAtual =
                                Math.max(
                                        0,
                                        paginaLocaisAtual - 1
                                );

                        locaisReais =
                                obterPaginaLocais(
                                        todosLocaisReais,
                                        paginaLocaisAtual
                                );
                }

                // =====================================================
                // FOLLOW-UP: COMPARAR / DETALHAR
                // =====================================================

                } else if (
                        usaSomenteResultadosAnteriores &&
                        request.locaisAnteriores() != null &&
                        !request.locaisAnteriores().isEmpty()
                ) {

                /*
                 * A Groq interpreta qual conjunto da conversa a usuária quis
                 * referenciar. O controller apenas executa esse escopo.
                 */
                todosLocaisReais =
                        request.todosLocaisAnteriores() != null &&
                        !request.todosLocaisAnteriores().isEmpty()
                                ? request.todosLocaisAnteriores()
                                : request.locaisAnteriores();

                String escopoResultados =
                        interpretacao != null &&
                        interpretacao.escopoResultados() != null
                                ? interpretacao.escopoResultados()
                                : "NENHUM";

                if (
                        "TODOS_RESULTADOS".equals(
                                escopoResultados
                        )
                ) {

                    locaisReais =
                            todosLocaisReais;

                } else if (
                        "PRIMEIRA_PAGINA".equals(
                                escopoResultados
                        )
                ) {

                    locaisReais =
                            obterPaginaLocais(
                                    todosLocaisReais,
                                    0
                            );

                } else if (
                        "PAGINA_ANTERIOR".equals(
                                escopoResultados
                        )
                ) {

                    int paginaAnterior =
                            Math.max(
                                    0,
                                    paginaLocaisAtual - 1
                            );

                    locaisReais =
                            obterPaginaLocais(
                                    todosLocaisReais,
                                    paginaAnterior
                            );

                } else {

                    /*
                     * PAGINA_ATUAL e NENHUM mantêm a página aberta.
                     */
                    locaisReais =
                            request.locaisAnteriores();
                }

                // =====================================================
                // NOVA BUSCA
                // =====================================================

                } else {

                /*
                * Nova busca do ROLÊ!.
                *
                * buscarLocaisSeNecessario agora devolve TODOS os
                * candidatos deduplicados e ranqueados.
                */
                todosLocaisReais =
                        buscarLocaisSeNecessario(
                                categoriasLocaisConsultadas,
                                latitudeReferencia,
                                longitudeReferencia
                        );

                /*
                * Toda nova busca começa na primeira página.
                */
                paginaLocaisAtual =
                        0;

                locaisReais =
                        obterPaginaLocais(
                                todosLocaisReais,
                                paginaLocaisAtual
                        );
                }

            // =====================================================
            // GROQ
            // =====================================================

            if (
                    usaSomenteResultadosAnteriores
            ) {
                System.out.println(
                        " Follow-up sobre resultados anteriores: "+ "sem nova consulta de GPS, clima, maré ou Geoapify.");

                System.out.println(
                        " Locais estruturados recebidos do app: "+ (
                                        request.locaisAnteriores() == null
                                                ? 0
                                                : request.locaisAnteriores().size()
                                )
                );

                System.out.println(
                        " Índice de local em foco recebido: "+ request.indiceLocalEmFoco()
                );
            }

            boolean contextoLocaisDisponivel =
                    locaisReais != null &&
                    !locaisReais.isEmpty();

            String resposta =
                    groqService.conversar(
                            request.mensagem(),
                            request.historico(),
                            viagemAtiva,
                            climaAtual,
                            contextoUsuario,
                            mareAtual,
                            locaisReais,
                            contextoLocaisDisponivel,
                            categoriasLocaisConsultadas,
                            latitudeReferencia,
                            longitudeReferencia,
                            tipoLocalizacaoReferencia
                    );

            if (
                    respostaPareceComandoInterno(
                            resposta
                    ) ||
                    (
                            contextoLocaisDisponivel &&
                            respostaPrometeBuscaFutura(
                                    resposta
                            )
                    )
            ) {

                resposta =
                        montarRespostaSeguraParaBusca(
                                locaisReais,
                                contextoLocaisDisponivel
                        );
            }

            Integer indiceLocalEmFoco =
                    definirIndiceLocalEmFoco(
                            interpretacao,
                            locaisReais,
                            request.indiceLocalEmFoco()
                    );

            /*
             * Comparações objetivas por distância não dependem da resposta
             * textual da IA. O backend já possui distanciaMetros para cada
             * local da página atual e consegue determinar o menor valor.
             */
            if (
                    interpretacao != null &&
                    "COMPARAR_LOCAIS".equals(
                            interpretacao.intencao()
                    ) &&
                    "DISTANCIA".equals(
                            interpretacao.criterio()
                    )
            ) {

                String respostaDistancia =
                        montarRespostaComparacaoDistancia(
                                locaisReais,
                                indiceLocalEmFoco
                        );

                if (
                        respostaDistancia != null &&
                        !respostaDistancia.isBlank()
                ) {
                    resposta =
                            respostaDistancia;
                }
            }

            /*
             * O conjunto usado para responder pode ser diferente da página
             * atualmente aberta. Comparar todos os resultados não deve trocar
             * a página visível no frontend.
             */
            List<LocalResponse> locaisContextoResposta =
                    locaisReais;

            if (
                    usaSomenteResultadosAnteriores &&
                    !pediuMaisResultados &&
                    request.locaisAnteriores() != null &&
                    !request.locaisAnteriores().isEmpty()
            ) {
                locaisContextoResposta =
                        request.locaisAnteriores();
            }

            Map<String, Object> respostaFinal =
                    new LinkedHashMap<>();

            respostaFinal.put(
                    "resposta",
                    resposta
            );

            respostaFinal.put(
                    "locaisContexto",
                    locaisContextoResposta == null
                            ? List.of()
                            : locaisContextoResposta
            );

            respostaFinal.put(
                    "todosLocaisContexto",
                    todosLocaisReais == null
                            ? List.of()
                            : todosLocaisReais
            );

            respostaFinal.put(
                    "paginaLocaisAtual",
                    paginaLocaisAtual
            );

            respostaFinal.put(
                    "indiceLocalEmFoco",
                    indiceLocalEmFoco
            );

            return ResponseEntity.ok(
                    respostaFinal
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());

        } catch (IllegalStateException e) {

            return ResponseEntity
                    .internalServerError()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CONTEXTO E FOCO DOS LOCAIS
    // =========================================================

    private Integer definirIndiceLocalEmFoco(
            GroqService.InterpretacaoIntencao interpretacao,
            List<LocalResponse> locais,
            Integer indiceAnterior
    ) {

        if (
                locais == null ||
                locais.isEmpty() ||
                interpretacao == null
        ) {
            return indiceAnterior;
        }

        /*
         * Quando a usuária pede explicitamente "o segundo", "o terceiro" etc.,
         * o índice interpretado passa a ser o foco atual.
         *
         * O classificador trabalha com índices humanos (1, 2, 3...).
         */
        if (
                "DETALHAR_LOCAL".equals(
                        interpretacao.intencao()
                ) &&
                interpretacao.indiceLocal() != null &&
                interpretacao.indiceLocal() >= 1 &&
                interpretacao.indiceLocal() <= locais.size()
        ) {
            return interpretacao.indiceLocal();
        }

        /*
         * Em comparações por distância, o local mais próximo vira o foco.
         * A lista recebida pode estar ordenada por utilidade, então calculamos
         * diretamente pela distância real retornada pelo Geoapify.
         */
        if (
                "COMPARAR_LOCAIS".equals(
                        interpretacao.intencao()
                ) &&
                "DISTANCIA".equals(
                        interpretacao.criterio()
                )
        ) {

            int melhorIndice =
                    -1;

            double menorDistancia =
                    Double.MAX_VALUE;

            for (
                    int i = 0;
                    i < locais.size();
                    i++
            ) {

                LocalResponse local =
                        locais.get(i);

                if (
                        local == null ||
                        local.getDistanciaMetros() == null
                ) {
                    continue;
                }

                if (
                        local.getDistanciaMetros() <
                        menorDistancia
                ) {

                    menorDistancia =
                            local.getDistanciaMetros();

                    melhorIndice =
                            i + 1;
                }
            }

            if (
                    melhorIndice > 0
            ) {
                return melhorIndice;
            }
        }

        return indiceAnterior;
    }

    private String montarRespostaComparacaoDistancia(
            List<LocalResponse> locais,
            Integer indiceLocalEmFoco
    ) {

        if (
                locais == null ||
                locais.isEmpty() ||
                indiceLocalEmFoco == null ||
                indiceLocalEmFoco < 1 ||
                indiceLocalEmFoco > locais.size()
        ) {
            return null;
        }

        LocalResponse local =
                locais.get(
                        indiceLocalEmFoco - 1
                );

        if (
                local == null ||
                local.getNome() == null ||
                local.getNome().isBlank() ||
                local.getDistanciaMetros() == null
        ) {
            return null;
        }

        long distanciaArredondada =
                Math.round(
                        local.getDistanciaMetros()
                );

        String distanciaFormatada;

        if (
                distanciaArredondada < 1000
        ) {

            distanciaFormatada =
                    distanciaArredondada
                            + " m";

        } else {

            double distanciaKm =
                    distanciaArredondada /
                    1000.0;

            distanciaFormatada =
                    String.format(
                            Locale.forLanguageTag(
                                    "pt-BR"),
                            "%.1f km",
                            distanciaKm
                    );
        }

        return "Desses resultados, o mais perto é "+ local.getNome()
                + ", a aproximadamente "+ distanciaFormatada
                + " da sua localização de referência.";
    }

    // =========================================================
    // LOCALIZAÇÃO
    // =========================================================

    private boolean mensagemPedeLocalizacaoAtual(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        return contemAlgum(
                texto,
                "perto de mim",
                "proximo de mim",
                "proxima de mim",
                "onde eu estou",
                "onde estou agora",
                "onde estou",
                "minha localizacao atual",
                "localizacao atual",
                "minha localizacao",
                "use minha localizacao",
                "aqui onde eu estou",
                "perto daqui onde estou",
                "nas minhas proximidades",
                "ao meu redor",
                "aqui perto",
                "perto daqui",
                "cidade onde estou",
                "cidade que estou",
                "em que cidade estou",
                "qual cidade estou",
                "qual cidade eu estou",
                "nome da cidade onde estou");
    }

    private boolean mensagemPerguntaSeTemLocalizacaoAtual(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        boolean perguntaAcesso =
                contemAlgum(
                        texto,
                        "voce tem minha localizacao",
                        "tem minha localizacao",
                        "tem acesso a minha localizacao",
                        "tem acesso a localizacao",
                        "consegue ver minha localizacao",
                        "consegue acessar minha localizacao");

        boolean perguntaCidade =
                contemAlgum(
                        texto,
                        "cidade",
                        "onde estou",
                        "onde eu estou");

        return
                perguntaAcesso &&
                !perguntaCidade;
    }

    private boolean mensagemPedeNomeLocalizacaoAtual(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        /*
         * Não tratamos uma pergunta de clima como simples pergunta
         * de nome da cidade. Assim, por exemplo:
         *
         * "qual a temperatura da minha localização atual?"*
         * continua seguindo o fluxo normal de clima.
         */
        if (
                contemTermoClimatico(
                        texto
                )
        ) {
            return false;
        }

        /*
         * Primeiro cobrimos as formas diretas já conhecidas.
         */
        if (
                contemAlgum(
                        texto,
                        "onde eu estou",
                        "onde estou agora",
                        "onde estou",
                        "em que cidade estou",
                        "em qual cidade estou",
                        "qual cidade estou",
                        "qual cidade eu estou",
                        "cidade onde estou",
                        "cidade que estou",
                        "nome da cidade onde estou",
                        "qual o nome da cidade onde estou",
                        "qual e o nome da cidade onde estou",
                        "qual meu local atual",
                        "qual e meu local atual",
                        "qual minha localizacao atual",
                        "qual e minha localizacao atual",
                        "qual cidade da minha localizacao atual",
                        "qual e a cidade da minha localizacao atual",
                        "cidade da minha localizacao atual",
                        "nome da cidade da minha localizacao atual")
        ) {
            return true;
        }

        /*
         * Regra mais robusta para frases naturais como:
         * "maia qual cidade da minha localização atual?"* "me diga a cidade da localização atual"*
         * Se a mensagem menciona LOCALIZAÇÃO ATUAL e também pede
         * cidade/nome/onde, ela deve seguir o reverse geocoding.
         */
        boolean mencionaLocalizacaoAtual =
                contemAlgum(
                        texto,
                        "localizacao atual",
                        "minha localizacao",
                        "local onde estou");

        boolean pedeIdentificacao =
                contemAlgum(
                        texto,
                        "cidade",
                        "nome",
                        "onde");

        return
                mencionaLocalizacaoAtual &&
                pedeIdentificacao;
    }

    private LocalizacaoResponse buscarLocalizacaoAtual(
            Double latitude,
            Double longitude
    ) {

        if (
                latitude == null ||
                longitude == null
        ) {
            return null;
        }

        try {

            LocalizacaoResponse localizacao =
                    geoapifyPlacesService.buscarLocalizacaoAtual(
                            latitude,
                            longitude
                    );

            if (localizacao != null) {

                System.out.println(
                        "==============================================");

                System.out.println(
                        " REVERSE GEOCODING GPS_ATUAL");

                System.out.println(
                        "Cidade: "+ localizacao.cidade()
                );

                System.out.println(
                        "Estado: "+ localizacao.estado()
                );

                System.out.println(
                        "País: "+ localizacao.pais()
                );

                System.out.println(
                        "==============================================");
            }

            return localizacao;

        } catch (RuntimeException e) {

            System.out.println(
                    " Não foi possível identificar a cidade da localização atual: "+ e.getMessage()
            );

            return null;
        }
    }

    private String montarRespostaLocalizacaoAtual(
            LocalizacaoResponse localizacao
    ) {

        if (localizacao == null) {
            return "Não consegui identificar sua localização atual com segurança.";
        }

        String cidade =
                limparTextoLocalizacao(
                        localizacao.cidade()
                );

        String estado =
                limparTextoLocalizacao(
                        localizacao.estado()
                );

        String pais =
                limparTextoLocalizacao(
                        localizacao.pais()
                );

        if (cidade != null) {

            if (
                    estado != null &&
                    pais != null
            ) {
                return "Você está em "+ cidade
                        + ", "+ estado
                        + ", "+ pais
                        + ".";
            }

            if (estado != null) {
                return "Você está em "+ cidade
                        + ", "+ estado
                        + ".";
            }

            if (pais != null) {
                return "Você está em "+ cidade
                        + ", "+ pais
                        + ".";
            }

            return "Você está em "+ cidade
                    + ".";
        }

        if (
                estado != null &&
                pais != null
        ) {
            return "Pelo seu GPS, você está em "+ estado
                    + ", "+ pais
                    + ".";
        }

        if (estado != null) {
            return "Pelo seu GPS, você está em "+ estado
                    + ".";
        }

        if (pais != null) {
            return "Pelo seu GPS, você está em "+ pais
                    + ".";
        }

        return "Consegui acessar seu GPS, mas não consegui identificar com segurança o nome da cidade.";
    }

    private String limparTextoLocalizacao(
            String valor
    ) {

        if (valor == null) {
            return null;
        }

        String texto =
                valor.trim();

        return texto.isBlank()
                ? null
                : texto;
    }

    private boolean mensagemPedeDestinoViagem(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        return contemAlgum(
                texto,
                "meu destino",
                "no meu destino",
                "perto do meu destino",
                "proximo do meu destino",
                "proxima do meu destino",
                "destino da viagem",
                "destino da minha viagem",
                "na minha viagem",
                "nessa viagem",
                "nesta viagem",
                "durante minha viagem",
                "onde vou viajar",
                "onde estou viajando",
                "cidade da viagem");
    }

    private boolean historicoPedeLocalizacaoAtual(
            List<MaiaMensagemHistorico> historico
    ) {

        if (
                historico == null ||
                historico.isEmpty()
        ) {
            return false;
        }

        int inicio =
                Math.max(
                        0,
                        historico.size() - 6
                );

        for (
                int i = historico.size() - 1;
                i >= inicio;
                i--
        ) {

            MaiaMensagemHistorico item =
                    historico.get(i);

            if (
                    item == null ||
                    item.texto() == null
            ) {
                continue;
            }

            if (
                    item.autor() != null &&
                    item.autor().equalsIgnoreCase(
                            "MAIA")
            ) {
                continue;
            }

            if (
                    mensagemPedeDestinoViagem(
                            item.texto()
                    )
            ) {
                return false;
            }

            if (
                    mensagemPedeLocalizacaoAtual(
                            item.texto()
                    )
            ) {
                return true;
            }
        }

        return false;
    }

    private Double definirLatitudeReferencia(
            boolean pediuLocalizacaoAtual,
            MaiaMensagemRequest request,
            Viagem viagemAtiva
    ) {

        if (pediuLocalizacaoAtual) {
            return request.latitudeAtual();
        }

        if (viagemAtiva == null) {
            return null;
        }

        return viagemAtiva.getLatitude();
    }

    private Double definirLongitudeReferencia(
            boolean pediuLocalizacaoAtual,
            MaiaMensagemRequest request,
            Viagem viagemAtiva
    ) {

        if (pediuLocalizacaoAtual) {
            return request.longitudeAtual();
        }

        if (viagemAtiva == null) {
            return null;
        }

        return viagemAtiva.getLongitude();
    }

    // =========================================================
    // ROLÊ! / LOCAIS REAIS
    // =========================================================

    private List<LocalResponse> buscarLocaisSeNecessario(
            List<String> categorias,
            Double latitudeReferencia,
            Double longitudeReferencia
    ) {

        if (
                categorias == null ||
                categorias.isEmpty() ||
                latitudeReferencia == null ||
                longitudeReferencia == null
        ) {
            return List.of();
        }

        /*
         * Antes eram considerados apenas 3 resultados de cada categoria.
         * Agora coletamos uma quantidade maior, deduplicamos e só depois
         * fazemos o ranking.
         */
        List<LocalResponse> encontrados =
                new ArrayList<>();

        for (
                String categoria :
                categorias
        ) {

            try {

                List<LocalResponse> locais =
                        geoapifyPlacesService.buscarLocais(
                                latitudeReferencia,
                                longitudeReferencia,
                                categoria
                        );

                if (
                        locais == null ||
                        locais.isEmpty()
                ) {
                    continue;
                }

                encontrados.addAll(
                        locais
                );

            } catch (Exception e) {

                System.out.println(
                        "Não foi possível consultar locais da categoria "+ categoria
                                + " para a maIA: "+ e.getMessage()
                );
            }
        }

        /*
         * Remove resultados duplicados.
         */
        Map<String, LocalResponse> unicos =
                new LinkedHashMap<>();

        for (
                LocalResponse local :
                encontrados
        ) {

            if (
                    local == null ||
                    local.getNome() == null ||
                    local.getNome().isBlank()
            ) {
                continue;
            }

            String chave =
                    local.getId();

            if (
                    chave == null ||
                    chave.isBlank()
            ) {

                chave =
                        normalizarTexto(
                                local.getNome()
                        )
                                + "|"+ local.getLatitude()
                                + "|"+ local.getLongitude();
            }

            unicos.putIfAbsent(
                    chave,
                    local
            );
        }

        /*
         * Ranking:
         * - proximidade;
         * - endereço/cidade/bairro presentes;
         * - categorias reais do Geoapify;
         * - site/telefone/horário quando realmente disponíveis.
         *
         * Isso não afirma que o lugar é "melhor".
         * Apenas prioriza resultados mais úteis e completos.
         */
        return unicos
                .values()
                .stream()
                .sorted(
                        (a, b) -> {

                            int scoreB =
                                    pontuarLocal(
                                            b
                                    );

                            int scoreA =
                                    pontuarLocal(
                                            a
                                    );

                            int comparacaoScore =
                                    Integer.compare(
                                            scoreB,
                                            scoreA
                                    );

                            if (
                                    comparacaoScore != 0
                            ) {
                                return comparacaoScore;
                            }

                            double distanciaA =
                                    a.getDistanciaMetros() == null
                                            ? Double.MAX_VALUE
                                            : a.getDistanciaMetros();

                            double distanciaB =
                                    b.getDistanciaMetros() == null
                                            ? Double.MAX_VALUE
                                            : b.getDistanciaMetros();

                            return Double.compare(
                                    distanciaA,
                                    distanciaB
                            );
                        }
                )
                .toList();
    }


    private List<LocalResponse> obterPaginaLocais(
            List<LocalResponse> todosLocais,
            int pagina
    ) {

        if (
                todosLocais == null ||
                todosLocais.isEmpty()
        ) {
            return List.of();
        }

        int paginaSegura =
                Math.max(
                        0,
                        pagina
                );

        int inicio =
                paginaSegura *
                TAMANHO_PAGINA_LOCAIS;

        if (
                inicio >= todosLocais.size()
        ) {
            return List.of();
        }

        int fim =
                Math.min(
                        inicio +
                        TAMANHO_PAGINA_LOCAIS,
                        todosLocais.size()
                );

        return new ArrayList<>(
                todosLocais.subList(
                        inicio,
                        fim
                )
        );
    }

    private int pontuarLocal(
            LocalResponse local
    ) {

        if (
                local == null
        ) {
            return Integer.MIN_VALUE;
        }

        int score =
                0;

        Double distancia =
                local.getDistanciaMetros();

        if (
                distancia != null
        ) {

            if (
                    distancia <= 1000
            ) {
                score +=
                        6;

            } else if (
                    distancia <= 2500
            ) {
                score +=
                        4;

            } else if (
                    distancia <= 5000
            ) {
                score +=
                        2;
            }
        }

        if (
                local.getEndereco() != null &&
                !local.getEndereco().isBlank()
        ) {
            score +=
                    2;
        }

        if (
                local.getBairro() != null &&
                !local.getBairro().isBlank()
        ) {
            score +=
                    1;
        }

        if (
                local.getCidade() != null &&
                !local.getCidade().isBlank()
        ) {
            score +=
                    1;
        }

        if (
                local.getCategoriasGeoapify() != null &&
                !local.getCategoriasGeoapify().isEmpty()
        ) {
            score +=
                    2;
        }

        if (
                local.getSite() != null &&
                !local.getSite().isBlank()
        ) {
            score +=
                    1;
        }

        if (
                local.getTelefone() != null &&
                !local.getTelefone().isBlank()
        ) {
            score +=
                    1;
        }

        if (
                local.getHorarioFuncionamento() != null &&
                !local.getHorarioFuncionamento().isBlank()
        ) {
            score +=
                    1;
        }

        return score;
    }

    // =========================================================
    // DETECÇÃO DE CATEGORIAS
    // =========================================================

    private List<String> detectarCategoriasLocal(
            String mensagem,
            List<MaiaMensagemHistorico> historico
    ) {

        List<String> categoriasAtuais =
                detectarCategoriasLocalDireto(
                        mensagem
                );

        if (!categoriasAtuais.isEmpty()) {
            return categoriasAtuais;
        }

        if (
                !mensagemEhConfirmacaoOuContinuacao(
                        mensagem
                ) ||
                historico == null ||
                historico.isEmpty()
        ) {
            return List.of();
        }

        int inicio =
                Math.max(
                        0,
                        historico.size() - 6
                );

        for (
                int i = historico.size() - 1;
                i >= inicio;
                i--
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

            List<String> categoriasHistorico =
                    detectarCategoriasLocalDireto(
                            item.texto()
                    );

            if (!categoriasHistorico.isEmpty()) {
                return categoriasHistorico;
            }
        }

        return List.of();
    }

    private List<String> detectarCategoriasLocalDireto(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return List.of();
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        if (
                contemAlgum(
                        texto,
                        "nightlife",
                        "night life",
                        "vida noturna",
                        "balada",
                        "baladas",
                        "boate",
                        "boates",
                        "nightclub",
                        "night club",
                        "festa",
                        "festas",
                        "dj",
                        "djs",
                        "show ao vivo",
                        "shows ao vivo",
                        "musica ao vivo",
                        "musica live",
                        "live music",
                        "casa de show",
                        "casa de shows",
                        "sair a noite",
                        "rolê noturno",
                        "role noturno")
        ) {
            return List.of("nightlife");
        }

        if (
                contemAlgum(
                        texto,
                        "cafe",
                        "cafeteria",
                        "cafeterias",
                        "cappuccino",
                        "expresso",
                        "espresso",
                        "tomar cafe")
        ) {
            return List.of("cafe");
        }

        if (
                contemAlgum(
                        texto,
                        "restaurante",
                        "restaurantes",
                        "almocar",
                        "almoco",
                        "jantar",
                        "comer",
                        "comida",
                        "refeicao")
        ) {
            return List.of("restaurante");
        }

        if (
                contemAlgum(
                        texto,
                        "sorvete",
                        "sorveteria",
                        "sorveterias",
                        "gelato")
        ) {
            return List.of("sorveteria");
        }

        if (
                contemAlgum(
                        texto,
                        "bar",
                        "bares",
                        "drink",
                        "drinks",
                        "cerveja",
                        "caipirinha")
        ) {
            return List.of("bar");
        }

        if (
                contemAlgum(
                        texto,
                        "supermercado",
                        "supermercados",
                        "mercado",
                        "mercados",
                        "comprar agua",
                        "comprar comida",
                        "comprar bebida")
        ) {
            return List.of("supermercado");
        }

        if (
                contemAlgum(
                        texto,
                        "farmacia",
                        "farmacias",
                        "remedio",
                        "medicamento")
        ) {
            return List.of("farmacia");
        }

        if (
                contemAlgum(
                        texto,
                        "praia",
                        "praias",
                        "beira mar",
                        "beira-mar")
        ) {
            return List.of("praia");
        }

        if (
                contemAlgum(
                        texto,
                        "museu",
                        "museus")
        ) {
            return List.of("museu");
        }

        if (
                contemAlgum(
                        texto,
                        "mirante",
                        "mirantes",
                        "vista panoramica",
                        "vista bonita",
                        "ponto de vista")
        ) {
            return List.of("mirante");
        }

        if (
                contemAlgum(
                        texto,
                        "monumento",
                        "monumentos",
                        "memorial",
                        "memoriais")
        ) {
            return List.of("monumento");
        }

        if (
                contemAlgum(
                        texto,
                        "castelo",
                        "castelos",
                        "forte",
                        "fortes",
                        "fortaleza")
        ) {
            return List.of("castelo");
        }

        if (
                contemAlgum(
                        texto,
                        "igreja",
                        "igrejas",
                        "catedral",
                        "catedrais",
                        "templo",
                        "templos")
        ) {
            return List.of("igreja");
        }

        if (
                contemAlgum(
                        texto,
                        "ruina",
                        "ruinas",
                        "sitio arqueologico",
                        "sitios arqueologicos")
        ) {
            return List.of("ruina");
        }

        if (
                contemAlgum(
                        texto,
                        "farol",
                        "farois")
        ) {
            return List.of("farol");
        }

        if (
                contemAlgum(
                        texto,
                        "obra de arte",
                        "obras de arte",
                        "escultura",
                        "esculturas",
                        "estatua",
                        "estatuas",
                        "mural",
                        "murais")
        ) {
            return List.of("arte");
        }

        if (
                contemAlgum(
                        texto,
                        "atracao natural",
                        "atracoes naturais",
                        "passeio na natureza",
                        "lugares naturais",
                        "natureza")
        ) {
            return List.of("natureza");
        }

        if (
                contemAlgum(
                        texto,
                        "atracao",
                        "atracoes",
                        "passeio",
                        "passeios",
                        "ponto turistico",
                        "pontos turisticos",
                        "o que conhecer",
                        "oq conhecer",
                        "o que visitar",
                        "oq visitar",
                        "lugares para conhecer",
                        "lugares pra conhecer",
                        "lugares para visitar",
                        "lugares pra visitar",
                        "coisas para conhecer",
                        "coisas pra conhecer")
        ) {
            return List.of("atracao");
        }

        if (
                contemAlgum(
                        texto,
                        "o que fazer",
                        "oq fazer",
                        "alguma coisa para fazer",
                        "alguma coisa pra fazer",
                        "algo para fazer",
                        "algo pra fazer",
                        "o que tem para fazer",
                        "o que tem pra fazer",
                        "onde ir",
                        "onde posso ir",
                        "quero sair",
                        "role",
                        "rolê",
                        "passear agora",
                        "fazer agora")
        ) {
            return List.of(
                    "atracao",
                    "restaurante",
                    "bar");
        }

        return List.of();
    }

    // =========================================================
    // CONFIRMAÇÃO / CONTINUAÇÃO
    // =========================================================

    private boolean mensagemEhConfirmacaoOuContinuacao(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        if (texto.length() > 60) {
            return false;
        }

        return List.of(
                "sim",
                "sim por favor",
                "por favor",
                "pode",
                "pode sim",
                "pode procurar",
                "pode buscar",
                "quero",
                "quero sim",
                "claro",
                "isso",
                "isso mesmo",
                "faz isso",
                "busca pra mim",
                "procura pra mim",
                "pesquisa pra mim",
                "manda",
                "mostra",
                "me mostra").contains(texto);
    }

    // =========================================================
    // PROTEÇÃO DA RESPOSTA
    // =========================================================

    private boolean respostaPareceComandoInterno(
            String resposta
    ) {

        if (
                resposta == null ||
                resposta.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        resposta
                );

        return contemAlgum(
                texto,
                "\"action\"",
                "\"acao\"",
                "\"parametros\"",
                "\"parameters\"",
                "buscar_locais",
                "destino_viagem",
                "gps_atual");
    }

    private boolean respostaPrometeBuscaFutura(
            String resposta
    ) {

        if (
                resposta == null ||
                resposta.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        resposta
                );

        return contemAlgum(
                texto,
                "um instante",
                "estou verificando",
                "estou procurando",
                "estou buscando",
                "vou verificar",
                "vou procurar",
                "vou buscar",
                "deixe-me verificar",
                "deixa eu verificar",
                "aguarde",
                "so um momento",
                "ja volto");
    }

    private String montarRespostaSeguraParaBusca(
            List<LocalResponse> locaisReais,
            boolean buscaLocaisRealizada
    ) {

        if (!buscaLocaisRealizada) {
            return "Posso procurar opções reais para você, mas preciso que a busca esteja associada ao seu destino de viagem ou à sua localização atual.";
        }

        if (
                locaisReais == null ||
                locaisReais.isEmpty()
        ) {
            return "Fiz a busca, mas não encontrei opções cadastradas nessa categoria perto da localização usada como referência. Posso tentar outro tipo de lugar ou uma busca mais ampla.";
        }

        StringBuilder resposta =
                new StringBuilder(
                        "Encontrei estas opções reais para você:\n");

        int contador = 1;

        for (LocalResponse local : locaisReais) {

            if (
                    local == null ||
                    local.getNome() == null ||
                    local.getNome().isBlank()
            ) {
                continue;
            }

            resposta
                    .append("\n")
                    .append(contador)
                    .append(". ")
                    .append(local.getNome());

            contador++;

            if (contador > 6) {
                break;
            }
        }

        if (contador == 1) {
            return "Fiz a busca, mas os resultados encontrados não tinham nomes suficientes para eu apresentar com segurança. Posso tentar outra categoria.";
        }

        resposta.append(
                "\n\nSe quiser, posso te ajudar a comparar essas opções.");

        return resposta.toString();
    }

    // =========================================================
    // MARÉ
    // =========================================================

    private MareResponse buscarMareSeNecessario(
            String mensagem,
            Viagem viagemAtiva
    ) {

        if (
                viagemAtiva == null ||
                viagemAtiva.getLatitude() == null ||
                viagemAtiva.getLongitude() == null ||
                !mensagemPrecisaDeMare(
                        mensagem
                )
        ) {
            return null;
        }

        try {

            return mareService.buscarMare(
                    viagemAtiva.getLatitude(),
                    viagemAtiva.getLongitude()
            );

        } catch (Exception e) {

            System.out.println(
                    "Não foi possível consultar a maré para a maIA: "+ e.getMessage()
            );

            return null;
        }
    }

    private boolean mensagemPrecisaDeMare(
            String mensagem
    ) {

        if (
                mensagem == null ||
                mensagem.isBlank()
        ) {
            return false;
        }

        String texto =
                normalizarTexto(
                        mensagem
                );

        return contemAlgum(
                texto,
                "mare",
                "mares",
                "mare baixa",
                "mare alta",
                "piscina natural",
                "piscinas naturais",
                "recife",
                "recifes",
                "banco de areia",
                "bancos de areia",
                "tabua de mare",
                "tabua das mares");
    }

    // =========================================================
    // CONTEXTO DO USUÁRIO
    // =========================================================
// =========================================================
// CONTEXTO DA USUÁRIA
// =========================================================

private ContextoUsuarioMaia buscarContextoUsuario(
        Long usuarioId
) {

    if (usuarioId == null) {
        return null;
    }

    Optional<Usuario> usuarioEncontrado =
            usuarioRepository.findById(
                    usuarioId
            );

    if (usuarioEncontrado.isEmpty()) {
        return null;
    }

    Usuario usuario =
            usuarioEncontrado.get();

    List<Viagem> viagens =
            viagemService.listarPorUsuario(
                    usuarioId
            );

    return new ContextoUsuarioMaia(
            usuario.getNome(),
            usuario.getTelefone(),
            usuario.getContatoEmergenciaNome(),
            usuario.getContatoEmergenciaTelefone(),
            usuario.getContatoEmergenciaRelacao(),
            viagens
    );
}

    // =========================================================
    // VIAGEM ATIVA
    // =========================================================

    private Viagem buscarViagemAtiva(
            Long usuarioId
    ) {

        if (usuarioId == null) {
            return null;
        }

        Optional<Viagem> viagemEncontrada =
                viagemService.buscarViagemAtiva(
                        usuarioId
                );

        return viagemEncontrada.orElse(null);
    }

    // =========================================================
    // CLIMA
    // =========================================================

    private ClimaResponse buscarClimaSeNecessario(
            String mensagem,
            List<MaiaMensagemHistorico> historico,
            Viagem viagemAtiva,
            boolean pediuLocalizacaoAtual,
            Double latitudeAtual,
            Double longitudeAtual
    ) {

        /*
         * Só consulta o serviço se a conversa realmente
         * estiver pedindo informação de clima.
         */
        if (
                !perguntaSobreClima(
                        mensagem,
                        historico
                )
        ) {
            return null;
        }

        Double latitude;
        Double longitude;

        // =====================================================
        // GPS ATUAL
        // =====================================================

        if (pediuLocalizacaoAtual) {

            if (
                    latitudeAtual == null ||
                    longitudeAtual == null
            ) {

                System.out.println(
                        " Clima solicitado para GPS_ATUAL, "+ "mas latitude/longitude não foram recebidas.");

                return null;
            }

            latitude =
                    latitudeAtual;

            longitude =
                    longitudeAtual;

            System.out.println(
                    "==============================================");

            System.out.println(
                    " CLIMA UTILIZANDO GPS_ATUAL");

            System.out.println(
                    "Latitude GPS: "+ latitude
            );

            System.out.println(
                    "Longitude GPS: "+ longitude
            );

            System.out.println(
                    "==============================================");

        } else {

            // =================================================
            // DESTINO DA VIAGEM
            // =================================================

            if (viagemAtiva == null) {

                System.out.println(
                        " Pergunta de clima recebida, "+ "mas não existe viagem ativa.");

                return null;
            }

            latitude =
                    viagemAtiva.getLatitude();

            longitude =
                    viagemAtiva.getLongitude();

            if (
                    latitude == null ||
                    longitude == null
            ) {

                System.out.println(
                        " Viagem ativa sem coordenadas para clima.");

                return null;
            }

            System.out.println(
                    "==============================================");

            System.out.println(
                    " CLIMA UTILIZANDO DESTINO_VIAGEM");

            System.out.println(
                    "Latitude destino: "+ latitude
            );

            System.out.println(
                    "Longitude destino: "+ longitude
            );

            System.out.println(
                    "==============================================");
        }

        try {

            ClimaResponse clima =
                    climaService.buscarClima(
                            latitude,
                            longitude
                    );

            System.out.println(
                    " Clima obtido com sucesso.");

            return clima;

        } catch (RuntimeException e) {

            System.out.println(
                    " Não foi possível obter clima para a maIA: "+ e.getMessage()
            );

            return null;
        }
    }

    // =========================================================
    // DETECÇÃO DE CLIMA
    // =========================================================

    private boolean perguntaSobreClima(
            String mensagem,
            List<MaiaMensagemHistorico> historico
    ) {

        String textoAtual =
                normalizarTexto(
                        mensagem
                );

        if (
                contemTermoClimatico(
                        textoAtual
                )
        ) {
            return true;
        }

        if (
                !pareceContinuacaoCurta(
                        textoAtual
                ) ||
                historico == null ||
                historico.isEmpty()
        ) {
            return false;
        }

        int inicio =
                Math.max(
                        0,
                        historico.size() - 4
                );

        for (
                int i = historico.size() - 1;
                i >= inicio;
                i--
        ) {

            MaiaMensagemHistorico item =
                    historico.get(i);

            if (
                    item == null ||
                    item.texto() == null
            ) {
                continue;
            }

            if (
                    contemTermoClimatico(
                            normalizarTexto(
                                    item.texto()
                            )
                    )
            ) {
                return true;
            }
        }

        return false;
    }

    private boolean contemTermoClimatico(
            String texto
    ) {

        if (
                texto == null ||
                texto.isBlank()
        ) {
            return false;
        }

        boolean possuiTermoClimatico =
                contemAlgum(
                        texto,
                        "clima",
                        "temperatura",
                        "sensacao termica",
                        "chuva",
                        "chover",
                        "chovendo",
                        "garoa",
                        "temporal",
                        "tempestade",
                        "vento",
                        "ventando",
                        "rajada",
                        "neve",
                        "nevando",
                        "nublado",
                        "neblina",
                        "meteorolog",
                        "previsao do tempo",
                        "tempo hoje",
                        "tempo agora",
                        "tempo aqui",
                        "tempo nessa viagem",
                        "tempo na viagem",
                        "maxima hoje",
                        "minima hoje",
                        "faz calor",
                        "faz frio",
                        "esta calor",
                        "esta frio",
                        "vai esfriar",
                        "vai esquentar",
                        "mais tarde",
                        "daqui a pouco",
                        "levo casaco",
                        "levar casaco",
                        "levo jaqueta",
                        "levar jaqueta",
                        "vou passar frio",
                        "vou passar calor");

        return
                possuiTermoClimatico ||
                roupaPodeDependerDoClima(
                        texto
                );
    }

    private boolean roupaPodeDependerDoClima(
            String texto
    ) {

        boolean mencionaRoupa =
                contemAlgum(
                        texto,
                        "saia",
                        "vestido",
                        "short",
                        "bermuda",
                        "casaco",
                        "jaqueta",
                        "blusa",
                        "manga longa",
                        "manga curta",
                        "calca");

        if (!mencionaRoupa) {
            return false;
        }

        return contemAlgum(
                texto,
                "hoje",
                "agora",
                "mais tarde",
                "a noite",
                "sair",
                "usar",
                "levar",
                "da pra",
                "da para");
    }

    private boolean pareceContinuacaoCurta(
            String texto
    ) {

        if (
                texto == null ||
                texto.isBlank() ||
                texto.length() > 40
        ) {
            return false;
        }

        return
                texto.startsWith("e ") ||
                texto.startsWith("mas ") ||
                texto.startsWith("entao") ||
                texto.startsWith("agora") ||
                texto.startsWith("hoje") ||
                texto.startsWith("amanha") ||
                texto.startsWith("e agora") ||
                texto.startsWith("e hoje") ||
                texto.startsWith("e amanha") ||
                texto.startsWith("quanto") ||
                texto.startsWith("qual");
    }

    // =========================================================
    // RESPOSTA RÁPIDA DE TEMPERATURA
    // =========================================================

    private boolean perguntaSimplesDeTemperatura(
            String mensagem
    ) {

        String texto =
                normalizarTexto(
                        mensagem
                );

        if (
                texto.isBlank()
        ) {
            return false;
        }

        boolean falaDeTemperatura =
                contemAlgum(
                        texto,
                        "temperatura",
                        "quantos graus",
                        "quantos grau",
                        "sensacao termica");

        if (
                !falaDeTemperatura
        ) {
            return false;
        }

        boolean exigeAnaliseMaior =
                contemAlgum(
                        texto,
                        "chuva",
                        "chover",
                        "chovendo",
                        "vento",
                        "ventando",
                        "rajada",
                        "previsao",
                        "amanha",
                        "mais tarde",
                        "a noite",
                        "praia",
                        "vale a pena",
                        "melhor ir",
                        "recomenda");

        return !exigeAnaliseMaior;
    }

    private String montarRespostaTemperaturaRapida(
            ClimaResponse clima,
            Viagem viagemAtiva,
            boolean usouGpsAtual
    ) {

        if (
                clima == null ||
                clima.temperatura() == null
        ) {
            return null;
        }

        String referencia;

        if (
                usouGpsAtual
        ) {

            referencia =
                    "na sua localização atual";

        } else if (
                viagemAtiva != null &&
                viagemAtiva.getDestino() != null &&
                !viagemAtiva.getDestino().isBlank()
        ) {

            referencia =
                    "em "+ viagemAtiva
                                    .getDestino()
                                    .trim();

        } else if (
                viagemAtiva != null &&
                viagemAtiva.getCidade() != null &&
                !viagemAtiva.getCidade().isBlank()
        ) {

            referencia =
                    "em "+ viagemAtiva
                                    .getCidade()
                                    .trim();

        } else {

            referencia =
                    "no seu destino";
        }

        String temperatura =
                formatarNumeroClima(
                        clima.temperatura()
                );

        StringBuilder resposta =
                new StringBuilder();

        resposta
                .append(
                        "Agora ")
                .append(
                        referencia
                )
                .append(
                        " está fazendo ")
                .append(
                        temperatura
                )
                .append(
                        " °C");

        if (
                clima.sensacaoTermica() != null
        ) {

            resposta
                    .append(
                            ", com sensação térmica de ")
                    .append(
                            formatarNumeroClima(
                                    clima.sensacaoTermica()
                            )
                    )
                    .append(
                            " °C");
        }

        resposta.append(".");

        return resposta.toString();
    }

    private String formatarNumeroClima(
            Double valor
    ) {

        if (
                valor == null
        ) {
            return "";
        }

        if (
                Math.abs(
                        valor - Math.rint(valor)
                ) < 0.05
        ) {

            return String.format(
                    Locale.forLanguageTag("pt-BR"),
                    "%.0f",
                    valor
            );
        }

        return String.format(
                Locale.forLanguageTag("pt-BR"),
                "%.1f",
                valor
        );
    }

    // =========================================================
    // NORMALIZAÇÃO / UTILITÁRIOS
    // =========================================================

    private String normalizarTexto(
            String texto
    ) {

        if (texto == null) {
            return "";
        }

        return Normalizer
                .normalize(
                        texto,
                        Normalizer.Form.NFD
                )
                .replaceAll(
                        "\\p{M}",
                        "")
                .toLowerCase(
                        Locale.ROOT
                )
                .trim();
    }

    private boolean contemAlgum(
            String texto,
            String... termos
    ) {

        if (
                texto == null ||
                termos == null
        ) {
            return false;
        }

        for (String termo : termos) {

            if (
                    termo != null &&
                    texto.contains(
                            termo
                    )
            ) {
                return true;
            }
        }

        return false;
    }
}
