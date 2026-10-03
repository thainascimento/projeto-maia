import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useMemo,
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

import MapView, {
  Marker,
} from 'react-native-maps';

type Viagem = {
  id: number;
  usuarioId: number;

  destino: string;

  nome?: string | null;

  cidade: string | null;
  estado: string | null;
  pais: string | null;

  latitude: number | null;
  longitude: number | null;

  dataInicio: string;
  dataFim: string;

  cancelada: boolean;
  avaliada?: boolean;

  criadaEm?: string | null;
};

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

function formatarData(
  valor: string
) {
  const data =
    converterDataLocal(
      valor
    );

  return data.toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function obterDestinoPrincipal(
  viagem: Viagem
) {
  return (
    viagem.cidade?.trim() ||
    viagem.destino
  );
}

function obterLocalSecundario(
  viagem: Viagem
) {
  return [
    viagem.estado,
    viagem.pais,
  ]
    .filter(Boolean)
    .join(', ');
}

export default function SddScreen() {
  const [
    viagens,
    setViagens,
  ] = useState<Viagem[]>([]);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState('');

  useFocusEffect(
    useCallback(
      () => {
        void carregarViagens();
      },
      []
    )
  );

  async function carregarViagens() {
    try {
      setCarregando(true);
      setErro('');

      const usuario =
        await buscarUsuario();

      if (!usuario?.id) {
        setViagens([]);

        setErro(
          'Não foi possível identificar a usuária.'
        );

        return;
      }

      const response =
        await fetch(
          `${API_URL}/viagens?usuarioId=${usuario.id}`
        );

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dados: Viagem[] =
        await response.json();

      setViagens(
        dados
      );
    } catch (error) {
      console.error(
        'Erro ao carregar SDD:',
        error
      );

      setErro(
        'Não foi possível carregar suas lembranças agora.'
      );
    } finally {
      setCarregando(false);
    }
  }

  function abrirLembranca(
    viagem: Viagem
  ) {
    router.push({
      pathname:
        '/lembranca/[id]',

      params: {
        id:
          String(
            viagem.id
          ),

        destino:
          viagem.destino,

        cidade:
          viagem.cidade ||
          '',

        estado:
          viagem.estado ||
          '',

        pais:
          viagem.pais ||
          '',

        dataInicio:
          viagem.dataInicio,

        dataFim:
          viagem.dataFim,

        latitude:
          viagem.latitude !==
            null &&
          viagem.latitude !==
            undefined
            ? String(
                viagem.latitude
              )
            : '',

        longitude:
          viagem.longitude !==
            null &&
          viagem.longitude !==
            undefined
            ? String(
                viagem.longitude
              )
            : '',
      },
    });
  }

  const viagensFinalizadas =
    useMemo(() => {
      const hoje =
        new Date();

      hoje.setHours(
        0,
        0,
        0,
        0
      );

      return viagens
        .filter(
          viagem => {
            if (
              !viagem.dataFim
            ) {
              return false;
            }

            const dataFim =
              converterDataLocal(
                viagem.dataFim
              );

            return (
              dataFim.getTime() <
                hoje.getTime() &&
              !viagem.cancelada
            );
          }
        )
        .sort(
          (a, b) =>
            converterDataLocal(
              b.dataFim
            ).getTime() -
            converterDataLocal(
              a.dataFim
            ).getTime()
        );
    }, [
      viagens,
    ]);

  const viagensComCoordenadas =
    useMemo(() => {
      return viagensFinalizadas.filter(
        viagem =>
          viagem.latitude !== null &&
          viagem.latitude !== undefined &&
          viagem.longitude !== null &&
          viagem.longitude !== undefined
      );
    }, [
      viagensFinalizadas,
    ]);

  const totalLugares =
    viagensFinalizadas.length;

  const regiaoInicial =
    useMemo(() => {
      const primeiraViagem =
        viagensComCoordenadas[0];

      if (
        primeiraViagem?.latitude !==
          null &&
        primeiraViagem?.latitude !==
          undefined &&
        primeiraViagem?.longitude !==
          null &&
        primeiraViagem?.longitude !==
          undefined
      ) {
        return {
          latitude:
            primeiraViagem.latitude,

          longitude:
            primeiraViagem.longitude,

          latitudeDelta: 8,

          longitudeDelta: 8,
        };
      }

      return {
        latitude: -14.235,
        longitude: -51.9253,

        latitudeDelta: 45,
        longitudeDelta: 45,
      };
    }, [
      viagensComCoordenadas,
    ]);

  function renderEmpty() {
    return (
      <View
        style={
          styles.emptyCard
        }
      >
        <View
          style={
            styles.emptyVisual
          }
        >
          <View
            style={
              styles.emptyCircleLarge
            }
          />

          <View
            style={
              styles.emptyCircleSmall
            }
          />

          <View
            style={
              styles.emptyPin
            }
          >
            <View
              style={
                styles.emptyPinCenter
              }
            />
          </View>
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          Suas histórias vão aparecer aqui.
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          Conforme suas viagens forem concluídas, você poderá revisitar os lugares que fizeram parte da sua jornada.
        </Text>
      </View>
    );
  }

  function renderMapa() {
    if (
      viagensComCoordenadas.length ===
      0
    ) {
      return (
        <View
          style={
            styles.mapEmpty
          }
        >
          <View
            style={
              styles.mapEmptyPin
            }
          >
            <View
              style={
                styles.mapEmptyPinCenter
              }
            />
          </View>

          <Text
            style={
              styles.mapEmptyTitle
            }
          >
            Nenhum lugar no mapa ainda.
          </Text>

          <Text
            style={
              styles.mapEmptyDescription
            }
          >
            Quando uma viagem realizada tiver localização registrada, ela aparecerá aqui.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          styles.mapCard
        }
      >
        <MapView
          style={
            styles.map
          }
          initialRegion={
            regiaoInicial
          }
        >
          {viagensComCoordenadas.map(
            viagem => (
              <Marker
                key={
                  viagem.id
                }
                coordinate={{
                  latitude:
                    viagem.latitude!,

                  longitude:
                    viagem.longitude!,
                }}
                title={
                  obterDestinoPrincipal(
                    viagem
                  )
                }
                description="Toque para ver suas lembranças"
                pinColor="#6d28d9"
                onPress={() =>
                  abrirLembranca(
                    viagem
                  )
                }
              />
            )
          )}
        </MapView>

        <View
          pointerEvents="none"
          style={
            styles.mapLabel
          }
        >
          <Text
            style={
              styles.mapLabelEyebrow
            }
          >
            MEU MAPA
          </Text>

          <Text
            style={
              styles.mapLabelText
            }
          >
            {
              viagensComCoordenadas.length
            }{' '}
            {viagensComCoordenadas.length ===
            1
              ? 'lugar marcado'
              : 'lugares marcados'}
          </Text>
        </View>
      </View>
    );
  }

  function renderViagem(
    viagem: Viagem
  ) {
    return (
      <Pressable
        key={
          viagem.id
        }
        onPress={() =>
          abrirLembranca(
            viagem
          )
        }
        style={({ pressed }) => [
          styles.memoryCard,

          pressed &&
            styles.memoryCardPressed,
        ]}
      >
        <View
          style={
            styles.memoryTop
          }
        >
          <View
            style={
              styles.memoryPin
            }
          >
            <View
              style={
                styles.memoryPinCenter
              }
            />
          </View>

          <View
            style={
              styles.memoryTopText
            }
          >
            <Text
              style={
                styles.memoryEyebrow
              }
            >
              VIAGEM REALIZADA
            </Text>

            <Text
              style={
                styles.memoryTitle
              }
            >
              {obterDestinoPrincipal(
                viagem
              )}
            </Text>

            {!!obterLocalSecundario(
              viagem
            ) && (
              <Text
                style={
                  styles.memoryLocation
                }
              >
                {obterLocalSecundario(
                  viagem
                )}
              </Text>
            )}
          </View>
        </View>

        <View
          style={
            styles.memoryDivider
          }
        />

        <View
          style={
            styles.memoryDates
          }
        >
          <View
            style={
              styles.memoryDateBlock
            }
          >
            <Text
              style={
                styles.memoryDateLabel
              }
            >
              IDA
            </Text>

            <Text
              style={
                styles.memoryDateValue
              }
            >
              {formatarData(
                viagem.dataInicio
              )}
            </Text>
          </View>

          <View
            style={
              styles.memoryDateLine
            }
          />

          <View
            style={
              styles.memoryDateBlock
            }
          >
            <Text
              style={
                styles.memoryDateLabel
              }
            >
              VOLTA
            </Text>

            <Text
              style={
                styles.memoryDateValue
              }
            >
              {formatarData(
                viagem.dataFim
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.memoryFooter
          }
        >
          <Text
            style={
              styles.memoryFooterText
            }
          >
            Ver lembranças
          </Text>

          <Text
            style={
              styles.memoryFooterArrow
            }
          >
            ›
          </Text>
        </View>
      </Pressable>
    );
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
            styles.header
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SUAS MEMÓRIAS
          </Text>

          <Text
            style={
              styles.title
            }
          >
            SDD &lt;3
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Saudade: sentimento de falta e carinho por alguém, algum lugar ou momento que foi importante e deixou boas lembranças.
          </Text>
        </View>

        <View
          style={
            styles.heroCard
          }
        >
          <View
            style={
              styles.decorCircleOne
            }
          />

          <View
            style={
              styles.decorCircleTwo
            }
          />

          <View
            style={
              styles.pinOuter
            }
          >
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
          </View>

          <Text
            style={
              styles.heroEyebrow
            }
          >
            SEU MAPA DE HISTÓRIAS
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            Os lugares que já fazem parte de você.
          </Text>

          <Text
            style={
              styles.heroDescription
            }
          >
            relembrar também é uma forma de viajar de novo
          </Text>

          {!carregando && (
            <View
              style={
                styles.heroStats
              }
            >
              <Text
                style={
                  styles.heroStatsNumber
                }
              >
                {
                  totalLugares
                }
              </Text>

              <Text
                style={
                  styles.heroStatsLabel
                }
              >
                {totalLugares === 1
                  ? 'viagem guardada'
                  : 'viagens guardadas'}
              </Text>
            </View>
          )}
        </View>

        {!carregando &&
          !erro &&
          viagensFinalizadas.length >
            0 && (
            <>
              <View
                style={
                  styles.mapSectionHeader
                }
              >
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  POR ONDE VOCÊ JÁ FOI
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Meu mapa
                </Text>
              </View>

              {renderMapa()}
            </>
          )}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              SDD
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Minhas lembranças
            </Text>
          </View>

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
                totalLugares
              }
            </Text>
          </View>
        </View>

        {carregando ? (
          <View
            style={
              styles.loadingArea
            }
          >
            <ActivityIndicator
              size="large"
              color="#6d28d9"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Relembrando suas viagens...
            </Text>
          </View>
        ) : erro ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              Não foi possível carregar agora
            </Text>

            <Text
              style={
                styles.errorDescription
              }
            >
              {erro}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={() => {
                void carregarViagens();
              }}
            >
              <Text
                style={
                  styles.retryButtonText
                }
              >
                TENTAR NOVAMENTE
              </Text>
            </Pressable>
          </View>
        ) : viagensFinalizadas.length ===
          0 ? (
          renderEmpty()
        ) : (
          viagensFinalizadas.map(
            renderViagem
          )
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
      paddingTop: 54,
      paddingHorizontal: 20,
      paddingBottom: 55,
    },

    header: {
      marginBottom: 25,
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.8,
      color: '#8b5cf6',
    },

    title: {
      marginTop: 5,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '900',
      color: '#28232d',
      letterSpacing: -1,
    },

    subtitle: {
      marginTop: 7,
      maxWidth: 300,
      fontSize: 13,
      lineHeight: 20,
      color: '#817a86',
    },

    heroCard: {
      position: 'relative',
      overflow: 'hidden',

      minHeight: 315,

      borderRadius: 30,

      backgroundColor:
        '#6d28d9',

      padding: 24,

      shadowColor:
        '#291d3d',

      shadowOffset: {
        width: 0,
        height: 12,
      },

      shadowOpacity: 0.1,
      shadowRadius: 22,

      elevation: 6,
    },

    decorCircleOne: {
      position: 'absolute',

      width: 190,
      height: 190,

      borderRadius: 95,

      backgroundColor:
        'rgba(255,255,255,0.05)',

      right: -75,
      top: -55,
    },

    decorCircleTwo: {
      position: 'absolute',

      width: 85,
      height: 85,

      borderRadius: 43,

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.13)',

      right: 20,
      top: 55,
    },

    pinOuter: {
      width: 62,
      height: 62,

      borderRadius: 31,

      backgroundColor:
        'rgba(255,255,255,0.12)',

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 25,
    },

    pin: {
      width: 38,
      height: 38,

      borderRadius: 19,

      backgroundColor:
        '#ffffff',

      alignItems: 'center',
      justifyContent: 'center',
    },

    pinCenter: {
      width: 12,
      height: 12,

      borderRadius: 6,

      backgroundColor:
        '#6d28d9',
    },

    heroEyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,

      color:
        'rgba(255,255,255,0.7)',
    },

    heroTitle: {
      marginTop: 10,

      maxWidth: 300,

      fontSize: 27,
      lineHeight: 34,

      fontWeight: '900',

      color: '#ffffff',

      letterSpacing: -0.5,
    },

    heroDescription: {
      marginTop: 13,

      maxWidth: 300,

      fontSize: 13,
      lineHeight: 20,

      color:
        'rgba(255,255,255,0.72)',
    },

    heroStats: {
      marginTop: 20,

      alignSelf:
        'flex-start',

      flexDirection: 'row',
      alignItems: 'center',

      borderRadius: 16,

      backgroundColor:
        'rgba(255,255,255,0.12)',

      paddingVertical: 9,
      paddingHorizontal: 13,
    },

    heroStatsNumber: {
      marginRight: 7,

      fontSize: 20,

      fontWeight: '900',

      color: '#ffffff',
    },

    heroStatsLabel: {
      fontSize: 10,

      fontWeight: '700',

      color:
        'rgba(255,255,255,0.75)',
    },

    mapSectionHeader: {
      marginTop: 31,
      marginBottom: 14,
    },

    mapCard: {
      height: 330,

      borderRadius: 26,

      overflow: 'hidden',

      backgroundColor:
        '#ece7f2',

      borderWidth: 1,

      borderColor:
        '#e1d8eb',

      position: 'relative',

      shadowColor:
        '#291d3d',

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.06,

      shadowRadius: 17,

      elevation: 3,
    },

    map: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },

    mapLabel: {
      position: 'absolute',

      left: 14,
      top: 14,

      borderRadius: 15,

      backgroundColor:
        'rgba(255,255,255,0.94)',

      paddingHorizontal: 13,
      paddingVertical: 10,

      shadowColor:
        '#291d3d',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.08,

      shadowRadius: 9,

      elevation: 3,
    },

    mapLabelEyebrow: {
      fontSize: 7,

      fontWeight: '900',

      letterSpacing: 1.2,

      color: '#8b5cf6',
    },

    mapLabelText: {
      marginTop: 2,

      fontSize: 11,

      fontWeight: '800',

      color: '#3a3440',
    },

    mapEmpty: {
      minHeight: 230,

      borderRadius: 26,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',

      alignItems: 'center',

      justifyContent:
        'center',

      padding: 24,
    },

    mapEmptyPin: {
      width: 45,
      height: 45,

      borderRadius: 23,

      backgroundColor:
        '#eee7fb',

      alignItems: 'center',

      justifyContent:
        'center',
    },

    mapEmptyPinCenter: {
      width: 13,
      height: 13,

      borderRadius: 7,

      backgroundColor:
        '#6d28d9',
    },

    mapEmptyTitle: {
      marginTop: 15,

      fontSize: 16,

      fontWeight: '900',

      color: '#302a34',
    },

    mapEmptyDescription: {
      marginTop: 7,

      maxWidth: 280,

      textAlign: 'center',

      fontSize: 11,
      lineHeight: 17,

      color: '#817986',
    },

    sectionHeader: {
      marginTop: 31,
      marginBottom: 15,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    sectionEyebrow: {
      fontSize: 8,

      fontWeight: '900',

      letterSpacing: 1.4,

      color: '#8b5cf6',
    },

    sectionTitle: {
      marginTop: 4,

      fontSize: 20,

      fontWeight: '900',

      color: '#302a34',
    },

    counter: {
      minWidth: 37,
      height: 37,

      borderRadius: 19,

      paddingHorizontal: 10,

      backgroundColor:
        '#eee7fb',

      alignItems: 'center',

      justifyContent:
        'center',
    },

    counterText: {
      fontSize: 12,

      fontWeight: '900',

      color: '#6d28d9',
    },

    loadingArea: {
      minHeight: 250,

      alignItems: 'center',

      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 12,

      fontSize: 12,

      color: '#85808b',
    },

    errorCard: {
      borderRadius: 24,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',

      padding: 20,
    },

    errorTitle: {
      fontSize: 16,

      fontWeight: '900',

      color: '#302a34',
    },

    errorDescription: {
      marginTop: 6,

      fontSize: 12,

      lineHeight: 18,

      color: '#817986',
    },

    retryButton: {
      alignSelf:
        'flex-start',

      marginTop: 15,

      borderRadius: 13,

      backgroundColor:
        '#6d28d9',

      paddingHorizontal: 14,

      paddingVertical: 10,
    },

    retryButtonText: {
      fontSize: 9,

      fontWeight: '900',

      letterSpacing: 0.8,

      color: '#ffffff',
    },

    emptyCard: {
      borderRadius: 26,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',

      padding: 22,

      alignItems: 'center',

      shadowColor:
        '#291d3d',

      shadowOffset: {
        width: 0,
        height: 7,
      },

      shadowOpacity: 0.04,

      shadowRadius: 16,

      elevation: 2,
    },

    emptyVisual: {
      width: 160,
      height: 145,

      position: 'relative',

      alignItems: 'center',

      justifyContent:
        'center',
    },

    emptyCircleLarge: {
      position: 'absolute',

      width: 120,
      height: 120,

      borderRadius: 60,

      backgroundColor:
        '#f6f2fb',
    },

    emptyCircleSmall: {
      position: 'absolute',

      width: 76,
      height: 76,

      borderRadius: 38,

      borderWidth: 1,

      borderColor:
        '#e0d5ef',
    },

    emptyPin: {
      width: 43,
      height: 43,

      borderRadius: 22,

      backgroundColor:
        '#6d28d9',

      alignItems: 'center',

      justifyContent:
        'center',

      shadowColor:
        '#6d28d9',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.18,

      shadowRadius: 9,

      elevation: 4,
    },

    emptyPinCenter: {
      width: 13,
      height: 13,

      borderRadius: 7,

      backgroundColor:
        '#ffffff',
    },

    emptyTitle: {
      marginTop: 5,

      textAlign: 'center',

      fontSize: 19,

      lineHeight: 25,

      fontWeight: '900',

      color: '#312c35',
    },

    emptyDescription: {
      marginTop: 10,

      maxWidth: 310,

      textAlign: 'center',

      fontSize: 12,

      lineHeight: 19,

      color: '#817986',
    },

    memoryCard: {
      marginBottom: 14,

      borderRadius: 24,

      backgroundColor:
        '#ffffff',

      borderWidth: 1,

      borderColor:
        '#ebe5f1',

      padding: 18,

      shadowColor:
        '#291d3d',

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.035,

      shadowRadius: 14,

      elevation: 2,
    },

    memoryCardPressed: {
      opacity: 0.82,

      transform: [
        {
          scale: 0.995,
        },
      ],
    },

    memoryTop: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    memoryPin: {
      width: 47,
      height: 47,

      borderRadius: 24,

      backgroundColor:
        '#eee7fb',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 13,
    },

    memoryPinCenter: {
      width: 14,
      height: 14,

      borderRadius: 7,

      backgroundColor:
        '#6d28d9',
    },

    memoryTopText: {
      flex: 1,
    },

    memoryEyebrow: {
      fontSize: 8,

      fontWeight: '900',

      letterSpacing: 1.2,

      color: '#8b5cf6',
    },

    memoryTitle: {
      marginTop: 4,

      fontSize: 20,

      lineHeight: 24,

      fontWeight: '900',

      color: '#302a34',
    },

    memoryLocation: {
      marginTop: 3,

      fontSize: 11,

      color: '#8d8591',
    },

    memoryDivider: {
      marginTop: 16,

      height: 1,

      backgroundColor:
        '#eeeaf2',
    },

    memoryDates: {
      marginTop: 15,

      flexDirection: 'row',

      alignItems: 'center',
    },

    memoryDateBlock: {
      flex: 1,
    },

    memoryDateLabel: {
      fontSize: 8,

      fontWeight: '900',

      letterSpacing: 1,

      color: '#9a929f',
    },

    memoryDateValue: {
      marginTop: 4,

      fontSize: 11,

      fontWeight: '800',

      color: '#514b56',
    },

    memoryDateLine: {
      width: 1,

      height: 28,

      marginHorizontal: 13,

      backgroundColor:
        '#e6dfec',
    },

    memoryFooter: {
      marginTop: 17,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      borderRadius: 14,

      backgroundColor:
        '#f8f5fc',

      paddingVertical: 10,

      paddingHorizontal: 12,
    },

    memoryFooterText: {
      fontSize: 10,

      fontWeight: '900',

      letterSpacing: 0.5,

      color: '#6d28d9',
    },

    memoryFooterArrow: {
      fontSize: 22,

      lineHeight: 22,

      color: '#6d28d9',
    },
  });