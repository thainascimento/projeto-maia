import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';

import * as Location from 'expo-location';

import {
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Mensagem = {
  id: string;

  autor:
    | 'USUARIA'
    | 'MAIA';

  texto: string;
};

type LocalContexto = {
  id?: string | null;
  nome?: string | null;
  categoria?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanciaMetros?: number | null;
  categoriasGeoapify?: string[];
  site?: string | null;
  telefone?: string | null;
  horarioFuncionamento?: string | null;
  acessivelCadeirante?: boolean | null;
  possuiInternet?: boolean | null;
};

type MaiaResponse = {
  resposta: string;
  locaisContexto?: LocalContexto[];
  todosLocaisContexto?: LocalContexto[];
  paginaLocaisAtual?: number | null;
  indiceLocalEmFoco?: number | null;
};

type MaiaInterpretacaoResponse = {
  intencao: string;
  referenciaGeografica: string;
  categoriaLocal: string | null;
  precisaGps: boolean;
  referenciaConversacional?: string;
  criterio?: string | null;
  indiceLocal?: number | null;
  escopoResultados?: string | null;
};

type LocalizacaoAtual = {
  latitude: number;
  longitude: number;
};

export default function MaiaScreen() {

  const [
    mensagens,
    setMensagens,
  ] =
    useState<
      Mensagem[]
    >([
      {
        id:
          'boas-vindas',

        autor:
          'MAIA',

        texto:
          'Oii, <3 Eu sou a maIA. Posso te ajudar a planejar, decidir e aproveitar melhor sua viagem. O que você quer saber?',
      },
    ]);

  const [
    texto,
    setTexto,
  ] =
    useState('');

  const [
    enviando,
    setEnviando,
  ] =
    useState(false);

  const listaRef =
    useRef<
      FlatList<Mensagem>
    >(null);

  /*
   * Guarda a última referência geográfica usada pela conversa.
   */
  const ultimaReferenciaFoiGpsRef =
    useRef(false);

  /*
   * Mantemos também as últimas coordenadas válidas do GPS.
   */
  const ultimaLocalizacaoGpsRef =
    useRef<
      LocalizacaoAtual | null
    >(null);

  /*
   * Guarda a página de locais atualmente apresentada.
   */
  const locaisContextoRef =
    useRef<LocalContexto[]>([]);

  /*
   * Guarda todos os candidatos da última busca do ROLÊ!,
   * já deduplicados e ranqueados pelo backend.
   */
  const todosLocaisContextoRef =
    useRef<LocalContexto[]>([]);

  /*
   * Guarda a página atual da lista de locais.
   * A primeira página é 0.
   */
  const paginaLocaisAtualRef =
    useRef<number>(0);

  /*
   * Guarda qual local da lista está atualmente em foco.
   * O índice utilizado pelo backend é humano: 1, 2, 3...
   */
  const indiceLocalEmFocoRef =
    useRef<number | null>(null);

  // =========================================================
  // NORMALIZAÇÃO
  // =========================================================

  function normalizarTexto(
    valor: string
  ) {

    return valor
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .trim();
  }

  // =========================================================
  // DETECTA QUANDO A USUÁRIA QUER O GPS ATUAL
  // =========================================================

  function mensagemPedeLocalizacaoAtual(
    mensagem: string
  ) {

    const textoNormalizado =
      normalizarTexto(
        mensagem
      );

    const expressoes = [
      'perto de mim',
      'proximo de mim',
      'proxima de mim',
      'onde eu estou',
      'onde estou agora',
      'minha localizacao atual',
      'minha localizacao',
      'use minha localizacao',
      'aqui onde eu estou',
      'perto daqui onde estou',
      'nas minhas proximidades',
      'ao meu redor',
      'aqui perto',
      'perto daqui',
      'onde estou',
      'localizacao atual',
      'cidade onde estou',
      'cidade que estou',
      'em que cidade estou',
      'qual cidade estou',
      'qual cidade eu estou',
      'nome da cidade onde estou',
    ];

    return expressoes.some(
      (expressao) =>
        textoNormalizado.includes(
          expressao
        )
    );
  }

  // =========================================================
  // DETECTA QUANDO A USUÁRIA PEDE O DESTINO DA VIAGEM
  // =========================================================

  function mensagemPedeDestinoViagem(
    mensagem: string
  ) {

    const textoNormalizado =
      normalizarTexto(
        mensagem
      );

    const expressoes = [
      'meu destino',
      'no meu destino',
      'perto do meu destino',
      'proximo do meu destino',
      'proxima do meu destino',
      'destino da viagem',
      'destino da minha viagem',
      'na minha viagem',
      'nessa viagem',
      'nesta viagem',
      'durante minha viagem',
      'onde vou viajar',
      'cidade da viagem',
    ];

    return expressoes.some(
      (expressao) =>
        textoNormalizado.includes(
          expressao
        )
    );
  }

  // =========================================================
  // REFERÊNCIA CONTEXTUAL
  // =========================================================

  function mensagemUsaReferenciaContextual(
    mensagem: string
  ) {

    const textoNormalizado =
      normalizarTexto(
        mensagem
      );

    const expressoes = [
      'nessa cidade',
      'nesta cidade',
      'dessa cidade',
      'nessa localizacao',
      'nesta localizacao',
      'desse lugar',
      'nesse lugar',
      'neste lugar',
      'por ai',
      'ai onde estou',
      'ai onde eu estou',
      'aqui mesmo',
      'nessa regiao',
      'nesta regiao',
      'dessa regiao',
    ];

    return expressoes.some(
      (expressao) =>
        textoNormalizado.includes(
          expressao
        )
    );
  }

  // =========================================================
  // INTERPRETAÇÃO DA INTENÇÃO PELA maIA
  // =========================================================

  async function interpretarMensagem(
    mensagem: string,
    historico: {
      autor: 'USUARIA' | 'MAIA';
      texto: string;
    }[],
    usuarioId: number | null
  ):
    Promise<MaiaInterpretacaoResponse | null> {

    try {

      const response =
        await fetch(
          `${API_URL}/ia/interpretar`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                usuarioId,
                mensagem,
                historico,
                latitudeAtual:
                  null,
                longitudeAtual:
                  null,
              }),
          }
        );

      if (
        !response.ok
      ) {
        return null;
      }

      const dados:
        MaiaInterpretacaoResponse =
          await response.json();

      console.log(
        ' Intenção interpretada:',
        dados.intencao
      );

      console.log(
        ' Referência interpretada:',
        dados.referenciaGeografica
      );

      console.log(
        ' Interpretação precisa GPS:',
        dados.precisaGps
      );

      console.log(
        ' Categoria interpretada:',
        dados.categoriaLocal
      );

      console.log(
        ' Escopo dos resultados:',
        dados.escopoResultados
      );

      return dados;

    } catch (
      error
    ) {

      console.log(
        ' Não foi possível interpretar a intenção antes do envio:',
        error
      );

      return null;
    }
  }

  // =========================================================
  // BUSCA LOCALIZAÇÃO ATUAL
  // =========================================================

  async function buscarLocalizacaoAtual():
    Promise<
      LocalizacaoAtual | null
    > {

    try {

      console.log(
        '=========================================='
      );

      console.log(
        ' maIA - iniciando busca de GPS'
      );

      const servicosAtivos =
        await Location
          .hasServicesEnabledAsync();

      console.log(
        ' Serviços de localização:',
        servicosAtivos
      );

      if (
        !servicosAtivos
      ) {

        console.log(
          'X Serviço de localização do aparelho está desligado.'
        );

        return null;
      }

      let permissao =
        await Location
          .getForegroundPermissionsAsync();

      console.log(
        ' Permissão atual:',
        permissao.status
      );

      if (
        permissao.status !==
        'granted'
      ) {

        console.log(
          ' Solicitando permissão...'
        );

        permissao =
          await Location
            .requestForegroundPermissionsAsync();

        console.log(
          ' Nova permissão:',
          permissao.status
        );
      }

      if (
        permissao.status !==
        'granted'
      ) {

        console.log(
          'X Permissão de localização não concedida.'
        );

        return null;
      }

      try {

        console.log(
          ' Tentando obter GPS atual...'
        );

        const posicaoAtual =
          await Location
            .getCurrentPositionAsync({
              accuracy:
                Location.Accuracy.High,
            });

        const latitude =
          posicaoAtual
            .coords
            .latitude;

        const longitude =
          posicaoAtual
            .coords
            .longitude;

        console.log(
          ' GPS ATUAL OBTIDO'
        );

        console.log(
          ' Latitude:',
          latitude
        );

        console.log(
          ' Longitude:',
          longitude
        );

        console.log(
          ' Precisão:',
          posicaoAtual
            .coords
            .accuracy
        );

        console.log(
          '=========================================='
        );

        return {
          latitude,
          longitude,
        };

      } catch (
        erroPosicaoAtual
      ) {

        console.log(
          ' Não foi possível obter a posição atual.'
        );

        console.log(
          erroPosicaoAtual
        );
      }

      try {

        console.log(
          ' Tentando última localização conhecida...'
        );

        const ultimaPosicao =
          await Location
            .getLastKnownPositionAsync(
              {}
            );

        if (
          ultimaPosicao
        ) {

          const latitude =
            ultimaPosicao
              .coords
              .latitude;

          const longitude =
            ultimaPosicao
              .coords
              .longitude;

          console.log(
            ' ÚLTIMA POSIÇÃO CONHECIDA OBTIDA'
          );

          console.log(
            ' Latitude:',
            latitude
          );

          console.log(
            ' Longitude:',
            longitude
          );

          console.log(
            '=========================================='
          );

          return {
            latitude,
            longitude,
          };
        }

        console.log(
          'X Nenhuma última localização conhecida disponível.'
        );

      } catch (
        erroUltimaPosicao
      ) {

        console.log(
          'X Erro ao buscar última localização conhecida:'
        );

        console.log(
          erroUltimaPosicao
        );
      }

      console.log(
        'X Nenhuma localização pôde ser obtida.'
      );

      console.log(
        '=========================================='
      );

      return null;

    } catch (
      error
    ) {

      console.error(
        'X Erro geral ao obter localização:',
        error
      );

      return null;
    }
  }

  // =========================================================
  // ADICIONA RESPOSTA LOCAL DA maIA
  // =========================================================

  function adicionarMensagemMaia(
    mensagem: string
  ) {

    const novaMensagem:
      Mensagem = {

        id:
          `maia-${Date.now()}`,

        autor:
          'MAIA',

        texto:
          mensagem,
      };

    setMensagens(
      (
        atuais
      ) => [
        ...atuais,
        novaMensagem,
      ]
    );
  }

  // =========================================================
  // ENVIO DA MENSAGEM
  // =========================================================

  async function enviarMensagem() {

    const mensagem =
      texto.trim();

    if (
      !mensagem ||
      enviando
    ) {
      return;
    }

    const historico =
      mensagens
        .filter(
          (item) =>
            item.id !==
            'boas-vindas'
        )
        .slice(
          -6
        )
        .map(
          (item) => ({
            autor:
              item.autor,

            texto:
              item.texto,
          })
        );

    const mensagemUsuario:
      Mensagem = {

        id:
          `usuario-${Date.now()}`,

        autor:
          'USUARIA',

        texto:
          mensagem,
      };

    setMensagens(
      (
        atuais
      ) => [
        ...atuais,
        mensagemUsuario,
      ]
    );

    setTexto(
      ''
    );

    setEnviando(
      true
    );

    try {

      const usuario =
        await buscarUsuario();

      const interpretacao =
        await interpretarMensagem(
          mensagem,
          historico,
          usuario?.id ??
            null
        );

      /*
       * Follow-ups sobre locais já encontrados não precisam
       * obter GPS novamente.
       *
       * MAIS_RESULTADOS usa o conjunto completo salvo no app
       * e pede ao backend apenas a próxima página.
       */
      const temResultadosAnteriores =
        locaisContextoRef.current.length > 0 ||
        todosLocaisContextoRef.current.length > 0;

      const usaSomenteResultadosAnteriores =
        temResultadosAnteriores &&
        (
          interpretacao
            ?.intencao ===
            'MAIS_RESULTADOS' ||
          (
            interpretacao
              ?.referenciaConversacional ===
              'RESULTADOS_ANTERIORES' &&
            (
              interpretacao
                ?.intencao ===
                'COMPARAR_LOCAIS' ||
              interpretacao
                ?.intencao ===
                'DETALHAR_LOCAL' ||
              interpretacao
                ?.intencao ===
                'REFINAR_BUSCA'
            )
          )
        );

      const precisaDeGPS =
        usaSomenteResultadosAnteriores
          ? false
          : (
              interpretacao
                ?.precisaGps ??
              mensagemPedeLocalizacaoAtual(
                mensagem
              )
            );

      console.log(
        '------------------------------------------'
      );

      console.log(
        ' Mensagem:',
        mensagem
      );

      console.log(
        ' Precisa de GPS:',
        precisaDeGPS
      );

      console.log(
        ' Intenção interpretada:',
        interpretacao
          ?.intencao
      );

      console.log(
        ' Referência conversacional:',
        interpretacao
          ?.referenciaConversacional
      );

      console.log(
        ' Critério:',
        interpretacao
          ?.criterio
      );

      let localizacaoAtual:
        LocalizacaoAtual | null =
          null;

      if (
        precisaDeGPS
      ) {

        localizacaoAtual =
          await buscarLocalizacaoAtual();

        if (
          !localizacaoAtual
        ) {

          adicionarMensagemMaia(
            'Não consegui acessar sua localização atual. Confirme se os Serviços de Localização do iPhone estão ligados e se o Expo Go possui permissão para usar sua localização. Depois tente novamente. '
          );

          return;
        }

        ultimaLocalizacaoGpsRef.current =
          localizacaoAtual;

        ultimaReferenciaFoiGpsRef.current =
          true;

      } else if (
        interpretacao
          ?.referenciaGeografica ===
        'DESTINO_VIAGEM'
      ) {

        ultimaReferenciaFoiGpsRef.current =
          false;
      }

      console.log(
        ' Latitude enviada:',
        localizacaoAtual
          ?.latitude ??
          null
      );

      console.log(
        ' Longitude enviada:',
        localizacaoAtual
          ?.longitude ??
          null
      );

      console.log(
        ' Última referência é GPS:',
        ultimaReferenciaFoiGpsRef.current
      );

      console.log(
        ' Página de locais enviada:',
        paginaLocaisAtualRef.current
      );

      console.log(
        ' Total de locais mantidos:',
        todosLocaisContextoRef.current.length
      );

      const corpoRequisicao = {

        usuarioId:
          usuario?.id ??
          null,

        mensagem,

        historico,

        latitudeAtual:
          localizacaoAtual
            ?.latitude ??
          null,

        longitudeAtual:
          localizacaoAtual
            ?.longitude ??
          null,

        intencaoInterpretada:
          interpretacao
            ?.intencao ??
          null,

        referenciaGeograficaInterpretada:
          interpretacao
            ?.referenciaGeografica ??
          null,

        categoriaLocalInterpretada:
          interpretacao
            ?.categoriaLocal ??
          null,

        precisaGpsInterpretada:
          interpretacao
            ?.precisaGps ??
          null,

        referenciaConversacionalInterpretada:
          interpretacao
            ?.referenciaConversacional ??
          null,

        criterioInterpretado:
          interpretacao
            ?.criterio ??
          null,

        indiceLocalInterpretado:
          interpretacao
            ?.indiceLocal ??
          null,

        escopoResultadosInterpretado:
          interpretacao
            ?.escopoResultados ??
          null,

        /*
         * Página que está atualmente sendo apresentada.
         */
        locaisAnteriores:
          locaisContextoRef.current,

        /*
         * Local atualmente em foco.
         */
        indiceLocalEmFoco:
          indiceLocalEmFocoRef.current,

        /*
         * Conjunto completo da última busca.
         * Permite "me mostre mais" sem nova chamada à Geoapify.
         */
        todosLocaisAnteriores:
          todosLocaisContextoRef.current,

        /*
         * Página atual, usando índice iniciado em zero.
         */
        paginaLocaisAtual:
          paginaLocaisAtualRef.current,
      };

      const response =
        await fetch(
          `${API_URL}/ia/conversar`,
          {

            method:
              'POST',

            headers: {

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                corpoRequisicao
              ),
          }
        );

      if (
        !response.ok
      ) {

        const erro =
          await response.text();

        throw new Error(
          erro ||
          `Erro HTTP ${response.status}`
        );
      }

      const dados:
        MaiaResponse =
          await response.json();

      /*
       * Atualiza a página atualmente apresentada.
       *
       * Não apagamos o contexto se uma resposta comum vier
       * sem uma nova lista de locais.
       */
      if (
        dados.locaisContexto &&
        dados.locaisContexto.length > 0
      ) {

        locaisContextoRef.current =
          dados.locaisContexto;

        console.log(
          ' Locais da página atual:',
          dados.locaisContexto.length
        );
      }

      /*
       * Guarda o conjunto completo da busca.
       */
      if (
        dados.todosLocaisContexto &&
        dados.todosLocaisContexto.length > 0
      ) {

        todosLocaisContextoRef.current =
          dados.todosLocaisContexto;

        console.log(
          ' Total de locais salvos:',
          dados.todosLocaisContexto.length
        );
      }

      /*
       * Guarda a página retornada pelo backend.
       */
      if (
        dados.paginaLocaisAtual !==
        undefined &&
        dados.paginaLocaisAtual !==
        null
      ) {

        paginaLocaisAtualRef.current =
          dados.paginaLocaisAtual;

        console.log(
          ' Página atual:',
          paginaLocaisAtualRef.current
        );
      }

      /*
       * Salva qual local está atualmente em foco.
       */
      if (
        dados.indiceLocalEmFoco !==
        undefined
      ) {

        indiceLocalEmFocoRef.current =
          dados.indiceLocalEmFoco ??
          null;

        console.log(
          ' Local em foco:',
          indiceLocalEmFocoRef.current
        );
      }

      const mensagemMaia:
        Mensagem = {

        id:
          `maia-${Date.now()}`,

        autor:
          'MAIA',

        texto:
          dados.resposta,
      };

      setMensagens(
        (
          atuais
        ) => [
          ...atuais,
          mensagemMaia,
        ]
      );

    } catch (
      error
    ) {

      console.error(
        ' Erro ao conversar com a maIA:',
        error
      );

      adicionarMensagemMaia(
        'Tive um probleminha para responder agora. Tente novamente em alguns instantes. '
      );

    } finally {

      setEnviando(
        false
      );
    }
  }

  // =========================================================
  // RENDERIZAÇÃO DAS MENSAGENS
  // =========================================================

  function renderMensagem({
    item,
  }: {
    item: Mensagem;
  }) {

    const mensagemDaMaia =
      item.autor ===
      'MAIA';

    return (

      <View
        style={[
          styles.messageRow,

          mensagemDaMaia
            ? styles.messageRowMaia
            : styles.messageRowUser,
        ]}
      >

        {mensagemDaMaia && (

          <View
            style={
              styles.maiaAvatar
            }
          >

            <Text
              style={
                styles.maiaAvatarText
              }
            >
              m
            </Text>

          </View>
        )}

        <View
          style={[
            styles.messageBubble,

            mensagemDaMaia
              ? styles.maiaBubble
              : styles.userBubble,
          ]}
        >

          <Text
            style={[
              styles.messageText,

              mensagemDaMaia
                ? styles.maiaMessageText
                : styles.userMessageText,
            ]}
          >
            {
              item.texto
            }
          </Text>

        </View>

      </View>
    );
  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (

    <SafeAreaView
      style={
        styles.safeArea
      }
    >

      <KeyboardAvoidingView

        style={
          styles.keyboardView
        }

        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }

        keyboardVerticalOffset={
          Platform.OS ===
          'ios'
            ? 88
            : 0
        }
      >

        <View
          style={
            styles.container
          }
        >

          <View
            style={
              styles.header
            }
          >

            <View
              style={
                styles.headerTop
              }
            >

              <View
                style={
                  styles.logo
                }
              >

                <Text
                  style={
                    styles.logoText
                  }
                >
                  m
                </Text>

              </View>

              <View
                style={
                  styles.headerTextArea
                }
              >

                <Text
                  style={
                    styles.eyebrow
                  }
                >
                  SUA ASSISTENTE
                </Text>

                <Text
                  style={
                    styles.title
                  }
                >
                  maIA
                </Text>

              </View>

              <View
                style={
                  styles.onlineBadge
                }
              >

                <View
                  style={
                    styles.onlineDot
                  }
                />

                <Text
                  style={
                    styles.onlineText
                  }
                >
                  online
                </Text>

              </View>

            </View>

            <Text
              style={
                styles.subtitle
              }
            >
              Converse comigo sobre sua viagem, destino, segurança, praias, passeios e o que mais precisar.
            </Text>

          </View>

          <FlatList

            ref={
              listaRef
            }

            data={
              mensagens
            }

            keyExtractor={(
              item
            ) =>
              item.id
            }

            renderItem={
              renderMensagem
            }

            showsVerticalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.messagesList
            }

            onContentSizeChange={() =>
              listaRef.current
                ?.scrollToEnd({
                  animated:
                    true,
                })
            }
          />

          {enviando && (

            <View
              style={
                styles.typingContainer
              }
            >

              <View
                style={
                  styles.maiaAvatarSmall
                }
              >

                <Text
                  style={
                    styles.maiaAvatarSmallText
                  }
                >
                  m
                </Text>

              </View>

              <View
                style={
                  styles.typingBubble
                }
              >

                <ActivityIndicator
                  size="small"
                  color="#6d28d9"
                />

                <Text
                  style={
                    styles.typingText
                  }
                >
                  maIA está pensando...
                </Text>

              </View>

            </View>
          )}

          <View
            style={
              styles.inputArea
            }
          >

            <TextInput

              style={
                styles.input
              }

              value={
                texto
              }

              onChangeText={
                setTexto
              }

              placeholder="Pergunte alguma coisa..."

              placeholderTextColor="#999999"

              multiline

              maxLength={
                1500
              }

              editable={
                !enviando
              }

              returnKeyType="send"

              blurOnSubmit={
                false
              }
            />

            <Pressable

              style={[
                styles.sendButton,

                (
                  !texto.trim() ||
                  enviando
                ) &&
                styles.sendButtonDisabled,
              ]}

              onPress={
                enviarMensagem
              }

              disabled={
                !texto.trim() ||
                enviando
              }
            >

              {enviando ? (

                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />

              ) : (

                <Text
                  style={
                    styles.sendButtonText
                  }
                >
                  ↑
                </Text>
              )}

            </Pressable>

          </View>

          <Text
            style={
              styles.disclaimer
            }
          >
            A maIA pode cometer erros. Em situações de risco, procure ajuda oficial.
          </Text>

        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

// =========================================================
// ESTILOS
// =========================================================

const styles =
  StyleSheet.create({

    safeArea: {
      flex: 1,
      backgroundColor:
        '#f7f7fb',
    },

    keyboardView: {
      flex: 1,
    },

    container: {
      flex: 1,
      backgroundColor:
        '#f7f7fb',
      paddingTop: 18,
    },

    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor:
        '#ebebf0',
      backgroundColor:
        '#ffffff',
    },

    headerTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    logo: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor:
        '#6d28d9',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    logoText: {
      color:
        '#ffffff',
      fontSize: 25,
      fontWeight:
        '900',
    },

    headerTextArea: {
      flex: 1,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 1.2,
      color:
        '#6d28d9',
      marginBottom: 1,
    },

    title: {
      fontSize: 25,
      fontWeight:
        '900',
      color:
        '#202020',
    },

    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      color:
        '#6f6f75',
      marginTop: 11,
    },

    onlineBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#edf8f0',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
    },

    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        '#2e9b57',
      marginRight: 5,
    },

    onlineText: {
      fontSize: 10,
      fontWeight:
        '700',
      color:
        '#39774f',
    },

    messagesList: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 18,
    },

    messageRow: {
      flexDirection:
        'row',
      marginBottom: 14,
      alignItems:
        'flex-end',
    },

    messageRowMaia: {
      justifyContent:
        'flex-start',
    },

    messageRowUser: {
      justifyContent:
        'flex-end',
    },

    maiaAvatar: {
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor:
        '#ede5ff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 8,
    },

    maiaAvatarText: {
      color:
        '#6d28d9',
      fontWeight:
        '900',
      fontSize: 17,
    },

    messageBubble: {
      maxWidth:
        '79%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },

    maiaBubble: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e5e5ed',
      borderBottomLeftRadius:
        5,
    },

    userBubble: {
      backgroundColor:
        '#6d28d9',
      borderBottomRightRadius:
        5,
    },

    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },

    maiaMessageText: {
      color:
        '#343434',
    },

    userMessageText: {
      color:
        '#ffffff',
    },

    typingContainer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 16,
      marginBottom: 8,
    },

    maiaAvatarSmall: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor:
        '#ede5ff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 7,
    },

    maiaAvatarSmallText: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#6d28d9',
    },

    typingBubble: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e5e5ed',
      borderRadius: 15,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },

    typingText: {
      marginLeft: 7,
      fontSize: 11,
      color:
        '#777777',
    },

    inputArea: {
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 7,
      borderTopWidth: 1,
      borderTopColor:
        '#e8e8ee',
      backgroundColor:
        '#ffffff',
    },

    input: {
      flex: 1,
      minHeight: 46,
      maxHeight: 120,
      backgroundColor:
        '#f4f4f8',
      borderRadius: 17,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 11,
      fontSize: 14,
      color:
        '#222222',
      marginRight: 9,
    },

    sendButton: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor:
        '#6d28d9',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    sendButtonDisabled: {
      opacity: 0.4,
    },

    sendButtonText: {
      color:
        '#ffffff',
      fontSize: 24,
      lineHeight: 26,
      fontWeight:
        '800',
    },

    disclaimer: {
      backgroundColor:
        '#ffffff',
      paddingBottom: 8,
      paddingHorizontal: 20,
      textAlign:
        'center',
      fontSize: 9,
      lineHeight: 13,
      color:
        '#999999',
    },
  });
