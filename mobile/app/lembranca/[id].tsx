import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Image } from 'expo-image';

import * as MediaLibrary from 'expo-media-library/legacy';


type FotoViagem = {
  id: string;
  uri: string;
  creationTime: number;
};


/*
 * Quantidade máxima de fotos
 * que serão exibidas por vez
 * na galeria da viagem.
 */
const LIMITE_FOTOS = 30;


/*
 * Quantas fotos verificamos
 * ao mesmo tempo.
 *
 * No iOS estamos usando lotes
 * pequenos para evitar muitas
 * chamadas simultâneas ao
 * MediaLibrary.
 */
const TAMANHO_LOTE = 6;


/*
 * Converte a data recebida
 * no formato YYYY-MM-DD para
 * uma Date no horário local.
 */
function converterDataLocal(
  valor: string
) {
  const [
    ano,
    mes,
    dia,
  ] = valor
    .split('-')
    .map(Number);

  return new Date(
    ano,
    mes - 1,
    dia
  );
}


/*
 * Cria o início do período
 * da viagem às 00:00.
 */
function criarInicioPeriodo(
  valor: string
) {
  const data =
    converterDataLocal(
      valor
    );

  data.setHours(
    0,
    0,
    0,
    0
  );

  return data;
}


/*
 * Cria o fim do período.
 *
 * Vai para 00:00 do dia
 * seguinte para incluir
 * completamente o último
 * dia da viagem.
 */
function criarFimPeriodo(
  valor: string
) {
  const data =
    converterDataLocal(
      valor
    );

  data.setDate(
    data.getDate() + 1
  );

  data.setHours(
    0,
    0,
    0,
    0
  );

  return data;
}


/*
 * Formata a data para
 * apresentação na tela.
 */
function formatarData(
  valor: string
) {
  if (!valor) {
    return '';
  }

  return converterDataLocal(
    valor
  ).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  );
}


/*
 * Embaralha as fotos.
 *
 * Assim, sempre podemos mostrar
 * momentos diferentes da viagem
 * quando a usuária solicitar.
 */
function embaralhar<T>(
  lista: T[]
) {
  const resultado =
    [...lista];

  for (
    let indice =
      resultado.length - 1;
    indice > 0;
    indice--
  ) {
    const aleatorio =
      Math.floor(
        Math.random() *
          (indice + 1)
      );

    [
      resultado[indice],
      resultado[aleatorio],
    ] = [
      resultado[aleatorio],
      resultado[indice],
    ];
  }

  return resultado;
}


/*
 * Pequena pausa entre os lotes.
 */
function esperar(
  milissegundos: number
) {
  return new Promise<void>(
    resolve => {
      setTimeout(
        resolve,
        milissegundos
      );
    }
  );
}


export default function LembrancaScreen() {
  const params =
    useLocalSearchParams<{
      id?: string;
      destino?: string;
      cidade?: string;
      estado?: string;
      pais?: string;
      dataInicio?: string;
      dataFim?: string;
    }>();


  const [
    fotos,
    setFotos,
  ] = useState<FotoViagem[]>(
    []
  );


  const [
    buscando,
    setBuscando,
  ] = useState(true);


  const [
    selecionando,
    setSelecionando,
  ] = useState(false);


  const [
    totalPeriodo,
    setTotalPeriodo,
  ] = useState(0);


  const [
    verificadas,
    setVerificadas,
  ] = useState(0);


  const [
    permissaoNegada,
    setPermissaoNegada,
  ] = useState(false);


  const [
    acessoLimitado,
    setAcessoLimitado,
  ] = useState(false);


  /*
   * Evita duas buscas simultâneas.
   */
  const carregandoRef =
    useRef(false);


  const destino =
    params.cidade ||
    params.destino ||
    'Minha viagem';


  const localSecundario =
    useMemo(() => {
      return [
        params.estado,
        params.pais,
      ]
        .filter(Boolean)
        .join(', ');
    }, [
      params.estado,
      params.pais,
    ]);


  /*
   * Assim que a tela abre,
   * iniciamos a busca pelas
   * lembranças daquela viagem.
   */
  useEffect(() => {
    void carregarLembrancas();
  }, []);


  /*
   * Converte um asset encontrado pelo
   * MediaLibrary em uma foto que pode
   * ser utilizada pela tela.
   *
   * IMPORTANTE NO iOS:
   *
   * O MediaLibrary retorna normalmente
   * uma URI no formato ph://.
   *
   * Não exigimos localUri nem file://.
   * O expo-image será responsável por
   * renderizar esse asset da biblioteca.
   */
  async function obterFotoLocal(
    asset: MediaLibrary.Asset
  ): Promise<FotoViagem | null> {
    try {
      if (!asset.uri) {
        console.log(
          'FOTO SEM URI:',
          asset.filename
        );

        return null;
      }

      return {
        id:
          asset.id,

        uri:
          asset.uri,

        creationTime:
          asset.creationTime,
      };
    } catch (error) {
      console.log(
        'ERRO FOTO:',
        asset.filename,
        error
      );

      return null;
    }
  }


  /*
   * Carrega as lembranças da viagem.
   */
  async function carregarLembrancas() {
    if (
      carregandoRef.current
    ) {
      return;
    }

    carregandoRef.current =
      true;


    try {
      setBuscando(true);

      setSelecionando(false);

      setFotos([]);

      setTotalPeriodo(0);

      setVerificadas(0);

      setPermissaoNegada(
        false
      );

      setAcessoLimitado(
        false
      );


      if (
        !params.dataInicio ||
        !params.dataFim
      ) {
        console.log(
          'DATAS DA VIAGEM AUSENTES'
        );

        return;
      }


      /*
       * Solicita acesso à biblioteca.
       */
      const permissao =
        await MediaLibrary
          .requestPermissionsAsync();


      console.log(
        'PERMISSÃO GALERIA:',
        permissao
      );


      if (
        permissao.status !==
        'granted'
      ) {
        setPermissaoNegada(
          true
        );

        return;
      }


      if (
        permissao
          .accessPrivileges ===
        'limited'
      ) {
        setAcessoLimitado(
          true
        );
      }


      const inicio =
        criarInicioPeriodo(
          params.dataInicio
        );


      const fim =
        criarFimPeriodo(
          params.dataFim
        );


      const assets:
        MediaLibrary.Asset[] =
        [];


      let cursor:
        string | undefined;


      let temMais =
        true;


      /*
       * Busca todas as fotos existentes
       * dentro das datas da viagem.
       */
      while (
        temMais &&
        assets.length <
          2000
      ) {
        const resultado =
          await MediaLibrary
            .getAssetsAsync({
              first: 100,

              after:
                cursor,

              mediaType:
                MediaLibrary
                  .MediaType
                  .photo,

              createdAfter:
                inicio,

              createdBefore:
                fim,

              sortBy: [
                [
                  MediaLibrary
                    .SortBy
                    .creationTime,

                  false,
                ],
              ],
            });


        assets.push(
          ...resultado.assets
        );


        temMais =
          resultado.hasNextPage;


        cursor =
          resultado.endCursor;


        if (
          resultado.assets
            .length === 0
        ) {
          break;
        }
      }


      console.log(
        'FOTOS NO PERÍODO:',
        assets.length
      );


      setTotalPeriodo(
        assets.length
      );


      setBuscando(false);


      if (
        assets.length === 0
      ) {
        return;
      }


      /*
       * Embaralha as fotos para mostrar
       * momentos diferentes.
       */
      const aleatorias =
        embaralhar(
          assets
        );


      setSelecionando(true);


      const selecionadas:
        FotoViagem[] =
        [];


      /*
       * Seleciona até 30 fotos,
       * processando 6 de cada vez.
       */
      for (
        let indice = 0;

        indice <
          aleatorias.length &&

        selecionadas.length <
          LIMITE_FOTOS;

        indice +=
          TAMANHO_LOTE
      ) {
        const lote =
          aleatorias.slice(
            indice,
            indice +
              TAMANHO_LOTE
          );


        const resultados =
          await Promise.all(
            lote.map(
              asset =>
                obterFotoLocal(
                  asset
                )
            )
          );


        for (
          const resultado
          of resultados
        ) {
          if (
            resultado &&
            selecionadas.length <
              LIMITE_FOTOS
          ) {
            selecionadas.push(
              resultado
            );
          }
        }


        const totalVerificado =
          Math.min(
            indice +
              lote.length,

            aleatorias.length
          );


        setVerificadas(
          totalVerificado
        );


        setFotos(
          [
            ...selecionadas,
          ]
        );


        console.log(
          'SELEÇÃO RÁPIDA:',
          `${selecionadas.length}/${LIMITE_FOTOS}`,
          'verificadas:',
          totalVerificado
        );


        await esperar(
          10
        );
      }


      console.log(
        'LEMBRANÇAS PRONTAS:',
        selecionadas.length
      );
    } catch (error) {
      console.error(
        'ERRO LEMBRANÇAS:',
        error
      );
    } finally {
      setBuscando(false);

      setSelecionando(false);

      carregandoRef.current =
        false;
    }
  }


  /*
   * Mostra outra seleção aleatória.
   */
  async function verOutrosMomentos() {
    if (
      carregandoRef.current
    ) {
      return;
    }

    await carregarLembrancas();
  }


  /*
   * Permite aumentar o acesso quando
   * a permissão do iOS está limitada.
   */
  async function escolherMaisFotos() {
    try {
      await MediaLibrary
        .presentPermissionsPickerAsync();


      if (
        !carregandoRef.current
      ) {
        await carregarLembrancas();
      }
    } catch (error) {
      console.error(
        'ERRO PERMISSÃO:',
        error
      );
    }
  }


  return (
    <View
      style={
        styles.screen
      }
    >
      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.topBar
          }
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backArrow
              }
            >
              ‹
            </Text>
          </Pressable>


          <View
            style={
              styles.topText
            }
          >
            <Text
              style={
                styles.topEyebrow
              }
            >
              SDD
            </Text>

            <Text
              style={
                styles.topTitle
              }
            >
              Lembranças
            </Text>
          </View>
        </View>


        <View
          style={
            styles.hero
          }
        >
          <View
            style={
              styles.heroCircleOne
            }
          />

          <View
            style={
              styles.heroCircleTwo
            }
          />

          <View
            style={
              styles.pin
            }
          >
            <View
              style={
                styles.pinCenter
              }
            />
          </View>


          <Text
            style={
              styles.heroEyebrow
            }
          >
            UMA VIAGEM PARA LEMBRAR
          </Text>


          <Text
            style={
              styles.destination
            }
          >
            {destino}
          </Text>


          {!!localSecundario && (
            <Text
              style={
                styles.location
              }
            >
              {
                localSecundario
              }
            </Text>
          )}


          <View
            style={
              styles.dateCard
            }
          >
            <View
              style={
                styles.dateColumn
              }
            >
              <Text
                style={
                  styles.dateLabel
                }
              >
                IDA
              </Text>

              <Text
                style={
                  styles.dateValue
                }
              >
                {formatarData(
                  params.dataInicio ||
                    ''
                )}
              </Text>
            </View>


            <View
              style={
                styles.dateDivider
              }
            />


            <View
              style={
                styles.dateColumn
              }
            >
              <Text
                style={
                  styles.dateLabel
                }
              >
                VOLTA
              </Text>

              <Text
                style={
                  styles.dateValue
                }
              >
                {formatarData(
                  params.dataFim ||
                    ''
                )}
              </Text>
            </View>
          </View>
        </View>


        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionHeaderText
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              GALERIA DA VIAGEM
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Reveja alguns momentos da sua viagem
            </Text>
          </View>


          {!buscando && (
            <View
              style={
                styles.counter
              }
            >
              <Text
                style={
                  styles.counterText
                }
              >
                {
                  fotos.length
                }
              </Text>
            </View>
          )}
        </View>


        <Text
          style={
            styles.sectionDescription
          }
        >
          A MAIA selecionou algumas lembranças aleatórias registradas durante esse período.
        </Text>


        {acessoLimitado && (
          <View
            style={
              styles.warningCard
            }
          >
            <Text
              style={
                styles.warningTitle
              }
            >
              Acesso limitado
            </Text>

            <Text
              style={
                styles.warningText
              }
            >
              Seu celular permitiu que a MAIA veja apenas parte da sua galeria.
            </Text>

            <Pressable
              style={
                styles.warningButton
              }
              onPress={() => {
                void escolherMaisFotos();
              }}
            >
              <Text
                style={
                  styles.warningButtonText
                }
              >
                ESCOLHER MAIS FOTOS
              </Text>
            </Pressable>
          </View>
        )}


        {buscando ? (
          <View
            style={
              styles.loading
            }
          >
            <ActivityIndicator
              size="large"
              color="#6d28d9"
            />

            <Text
              style={
                styles.loadingTitle
              }
            >
              Procurando suas lembranças...
            </Text>

            <Text
              style={
                styles.loadingText
              }
            >
              Buscando fotos registradas durante sua viagem.
            </Text>
          </View>
        ) : permissaoNegada ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              Acesso às fotos necessário
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Permita o acesso à galeria para encontrar suas lembranças.
            </Text>
          </View>
        ) : totalPeriodo ===
          0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              Nenhuma foto encontrada
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Não encontramos fotos registradas entre as datas desta viagem.
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={
                  styles.summaryTextArea
                }
              >
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  {
                    totalPeriodo
                  }{' '}
                  fotos no período
                </Text>

                <Text
                  style={
                    styles.summaryText
                  }
                >
                  Mostrando até {LIMITE_FOTOS} lembranças disponíveis no seu celular.
                </Text>
              </View>

              {selecionando && (
                <ActivityIndicator
                  size="small"
                  color="#6d28d9"
                />
              )}
            </View>


            {fotos.length >
              0 && (
              <View
                style={
                  styles.gallery
                }
              >
                {fotos.map(
                  foto => (
                    <Pressable
                      key={
                        foto.id
                      }
                      style={
                        styles.photoContainer
                      }
                      onPress={() => {
                        router.push({
                          pathname:
                            '/lembranca/foto',

                          params: {
                            uri:
                              foto.uri,

                            destino,
                          },
                        });
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            foto.uri,
                        }}
                        style={
                          styles.photo
                        }
                        contentFit="cover"
                      />
                    </Pressable>
                  )
                )}
              </View>
            )}


            {selecionando && (
              <Text
                style={
                  styles.loadingSmall
                }
              >
                Escolhendo alguns momentos...
              </Text>
            )}


            {!selecionando &&
              fotos.length >
                0 && (
                <>
                  <Pressable
                    style={
                      styles.otherMomentsButton
                    }
                    onPress={() => {
                      void verOutrosMomentos();
                    }}
                  >
                    <Text
                      style={
                        styles.otherMomentsButtonText
                      }
                    >
                      VER OUTROS MOMENTOS
                    </Text>
                  </Pressable>


                  <View
                    style={
                      styles.infoCard
                    }
                  >
                    <Text
                      style={
                        styles.infoTitle
                      }
                    >
                      Um pedacinho da viagem
                    </Text>

                    <Text
                      style={
                        styles.infoText
                      }
                    >
                      Exibindo {fotos.length} lembranças escolhidas aleatoriamente entre as fotos disponíveis localmente neste período.
                    </Text>
                  </View>
                </>
              )}


            {!selecionando &&
              fotos.length ===
                0 && (
                <View
                  style={
                    styles.emptyCard
                  }
                >
                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    Não foi possível exibir as fotos
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Encontramos fotos no período da viagem, mas não foi possível exibi-las nesta tentativa.
                  </Text>
                </View>
              )}
          </>
        )}
      </ScrollView>
    </View>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#f8f7fc',
    },


    container: {
      flex: 1,
    },


    content: {
      paddingTop: 48,
      paddingHorizontal: 18,
      paddingBottom: 50,
    },


    topBar: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 22,
    },


    backButton: {
      width: 44,

      height: 44,

      borderRadius: 22,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight: 12,
    },


    backArrow: {
      fontSize: 32,

      lineHeight: 34,

      color: '#6d28d9',
    },


    topText: {
      flex: 1,
    },


    topEyebrow: {
      fontSize: 8,

      fontWeight: '900',

      letterSpacing: 1.5,

      color: '#8b5cf6',
    },


    topTitle: {
      marginTop: 2,

      fontSize: 22,

      fontWeight: '900',

      color: '#302a34',
    },


    hero: {
      position:
        'relative',

      overflow:
        'hidden',

      borderRadius: 30,

      padding: 24,

      backgroundColor:
        '#6d28d9',
    },


    heroCircleOne: {
      position:
        'absolute',

      width: 190,

      height: 190,

      borderRadius: 95,

      right: -70,

      top: -70,

      backgroundColor:
        'rgba(255,255,255,0.05)',
    },


    heroCircleTwo: {
      position:
        'absolute',

      width: 80,

      height: 80,

      borderRadius: 40,

      right: 26,

      top: 40,

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.13)',
    },


    pin: {
      width: 52,

      height: 52,

      borderRadius: 26,

      backgroundColor:
        'rgba(255,255,255,0.14)',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 20,
    },


    pinCenter: {
      width: 17,

      height: 17,

      borderRadius: 9,

      backgroundColor:
        '#ffffff',
    },


    heroEyebrow: {
      fontSize: 8,

      fontWeight: '900',

      letterSpacing: 1.5,

      color:
        'rgba(255,255,255,0.7)',
    },


    destination: {
      marginTop: 7,

      fontSize: 31,

      lineHeight: 37,

      fontWeight: '900',

      color: '#ffffff',
    },


    location: {
      marginTop: 4,

      fontSize: 13,

      color:
        'rgba(255,255,255,0.72)',
    },


    dateCard: {
      marginTop: 24,

      flexDirection:
        'row',

      borderRadius: 18,

      paddingVertical: 14,

      paddingHorizontal: 15,

      backgroundColor:
        'rgba(255,255,255,0.12)',
    },


    dateColumn: {
      flex: 1,
    },


    dateDivider: {
      width: 1,

      marginHorizontal: 15,

      backgroundColor:
        'rgba(255,255,255,0.2)',
    },


    dateLabel: {
      fontSize: 7,

      fontWeight: '900',

      color:
        'rgba(255,255,255,0.65)',
    },


    dateValue: {
      marginTop: 4,

      fontSize: 11,

      fontWeight: '800',

      color: '#ffffff',
    },


    sectionHeader: {
      marginTop: 31,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    sectionHeaderText: {
      flex: 1,

      paddingRight: 12,
    },


    sectionEyebrow: {
      fontSize: 8,

      fontWeight: '900',

      letterSpacing: 1.4,

      color: '#8b5cf6',
    },


    sectionTitle: {
      marginTop: 4,

      fontSize: 21,

      lineHeight: 27,

      fontWeight: '900',

      color: '#302a34',
    },


    sectionDescription: {
      marginTop: 7,

      fontSize: 11,

      lineHeight: 17,

      color: '#89818d',
    },


    counter: {
      minWidth: 38,

      height: 38,

      borderRadius: 19,

      paddingHorizontal: 10,

      backgroundColor:
        '#eee7fb',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    counterText: {
      fontSize: 12,

      fontWeight: '900',

      color: '#6d28d9',
    },


    warningCard: {
      marginTop: 15,

      padding: 15,

      borderRadius: 18,

      backgroundColor:
        '#fff8e8',
    },


    warningTitle: {
      fontSize: 12,

      fontWeight: '900',

      color: '#5a4a28',
    },


    warningText: {
      marginTop: 4,

      fontSize: 10,

      lineHeight: 16,

      color: '#76694e',
    },


    warningButton: {
      marginTop: 12,

      alignSelf:
        'flex-start',

      paddingVertical: 10,

      paddingHorizontal: 13,

      borderRadius: 12,

      backgroundColor:
        '#6d28d9',
    },


    warningButtonText: {
      fontSize: 8,

      fontWeight: '900',

      color: '#ffffff',
    },


    loading: {
      minHeight: 250,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    loadingTitle: {
      marginTop: 14,

      fontSize: 14,

      fontWeight: '900',

      color: '#3d3742',
    },


    loadingText: {
      marginTop: 5,

      fontSize: 10,

      color: '#89818d',
    },


    summaryCard: {
      marginTop: 18,

      padding: 16,

      borderRadius: 20,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    summaryTextArea: {
      flex: 1,

      paddingRight: 12,
    },


    summaryTitle: {
      fontSize: 13,

      fontWeight: '900',

      color: '#302a34',
    },


    summaryText: {
      marginTop: 5,

      fontSize: 10,

      lineHeight: 16,

      color: '#89818d',
    },


    gallery: {
      marginTop: 15,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',
    },


    photoContainer: {
      width: '32%',

      aspectRatio: 1,

      borderRadius: 15,

      overflow:
        'hidden',

      marginBottom: 7,

      backgroundColor:
        '#eeeaf2',
    },


    photo: {
      width: '100%',

      height: '100%',
    },


    loadingSmall: {
      marginTop: 14,

      textAlign:
        'center',

      fontSize: 10,

      color: '#89818d',
    },


    otherMomentsButton: {
      marginTop: 15,

      paddingVertical: 14,

      borderRadius: 16,

      backgroundColor:
        '#eee7fb',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    otherMomentsButtonText: {
      fontSize: 9,

      fontWeight: '900',

      letterSpacing: 0.7,

      color: '#6d28d9',
    },


    emptyCard: {
      marginTop: 20,

      padding: 24,

      borderRadius: 22,

      backgroundColor:
        '#ffffff',

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',
    },


    emptyTitle: {
      fontSize: 16,

      fontWeight: '900',

      textAlign:
        'center',

      color: '#302a34',
    },


    emptyText: {
      marginTop: 8,

      fontSize: 11,

      lineHeight: 18,

      textAlign:
        'center',

      color: '#817986',
    },


    infoCard: {
      marginTop: 18,

      padding: 16,

      borderRadius: 18,

      backgroundColor:
        '#f1ebfb',
    },


    infoTitle: {
      fontSize: 11,

      fontWeight: '900',

      color: '#5b21b6',
    },


    infoText: {
      marginTop: 6,

      fontSize: 10,

      lineHeight: 17,

      color: '#716879',
    },
  });