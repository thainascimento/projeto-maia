import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type StatusViagem =
  | 'PLANEJADA'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'CANCELADA';

type Viagem = {
  id: number;
  usuarioId: number;

  destino: string;

  cidade: string | null;
  estado: string | null;
  pais: string | null;

  latitude: number | null;
  longitude: number | null;

  dataInicio: string;
  dataFim: string;

  cancelada: boolean;
  criadaEm: string;

  status: StatusViagem;
};

function converterDataLocal(
  valor: string
) {
  const [
    ano,
    mes,
    dia,
  ] = valor.split('-').map(
    Number
  );

  return new Date(
    ano,
    mes - 1,
    dia
  );
}

function inicioDoDia(
  data: Date
) {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  );
}

function diferencaDias(
  inicio: Date,
  fim: Date
) {
  const UM_DIA =
    1000 *
    60 *
    60 *
    24;

  const inicioUtc =
    Date.UTC(
      inicio.getFullYear(),
      inicio.getMonth(),
      inicio.getDate()
    );

  const fimUtc =
    Date.UTC(
      fim.getFullYear(),
      fim.getMonth(),
      fim.getDate()
    );

  return Math.round(
    (
      fimUtc -
      inicioUtc
    ) /
      UM_DIA
  );
}

function formatarDataCurta(
  valor: string
) {
  const data =
    converterDataLocal(
      valor
    );

  const meses = [
    'JAN',
    'FEV',
    'MAR',
    'ABR',
    'MAI',
    'JUN',
    'JUL',
    'AGO',
    'SET',
    'OUT',
    'NOV',
    'DEZ',
  ];

  return `${String(
    data.getDate()
  ).padStart(
    2,
    '0'
  )} ${
    meses[
      data.getMonth()
    ]
  }`;
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

export default function HomeScreen() {
  const [
    viagens,
    setViagens,
  ] = useState<Viagem[]>(
    []
  );

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState('');

  const [
    fotoUri,
    setFotoUri,
  ] = useState<string | null>(
    null
  );

  const [
    nomeUsuario,
    setNomeUsuario,
  ] = useState('');

  const [
    agora,
    setAgora,
  ] = useState(
    new Date()
  );

  const entradaOpacity =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const entradaY =
    useRef(
      new Animated.Value(
        24
      )
    ).current;

  const contadorScale =
    useRef(
      new Animated.Value(
        0.9
      )
    ).current;

  const logoOpacity =
    useRef(
      new Animated.Value(
        0.55
      )
    ).current;

  const blobUmY =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const blobDoisY =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const orbita =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  useFocusEffect(
    useCallback(
      () => {
        void carregarPerfil();
        void carregarViagens();
      },
      []
    )
  );

  useEffect(() => {
    const intervalo =
      setInterval(
        () => {
          setAgora(
            new Date()
          );
        },
        60 * 1000
      );

    return () => {
      clearInterval(
        intervalo
      );
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(
        entradaOpacity,
        {
          toValue: 1,
          duration: 550,
          useNativeDriver:
            true,
        }
      ),

      Animated.timing(
        entradaY,
        {
          toValue: 0,
          duration: 650,
          easing:
            Easing.out(
              Easing.cubic
            ),
          useNativeDriver:
            true,
        }
      ),

      Animated.spring(
        contadorScale,
        {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver:
            true,
        }
      ),
    ]).start();
  }, [
    contadorScale,
    entradaOpacity,
    entradaY,
  ]);

  useEffect(() => {
    const animacaoLogo =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            logoOpacity,
            {
              toValue: 1,
              duration: 1800,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),

          Animated.timing(
            logoOpacity,
            {
              toValue: 0.55,
              duration: 1800,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),
        ])
      );

    animacaoLogo.start();

    return () => {
      animacaoLogo.stop();
    };
  }, [
    logoOpacity,
  ]);

  useEffect(() => {
    const animacaoBlobUm =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            blobUmY,
            {
              toValue: 15,
              duration: 4200,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),

          Animated.timing(
            blobUmY,
            {
              toValue: 0,
              duration: 4200,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),
        ])
      );

    const animacaoBlobDois =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            blobDoisY,
            {
              toValue: -12,
              duration: 5000,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),

          Animated.timing(
            blobDoisY,
            {
              toValue: 0,
              duration: 5000,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),
        ])
      );

    animacaoBlobUm.start();
    animacaoBlobDois.start();

    return () => {
      animacaoBlobUm.stop();
      animacaoBlobDois.stop();
    };
  }, [
    blobDoisY,
    blobUmY,
  ]);

  useEffect(() => {
    const animacaoOrbita =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            orbita,
            {
              toValue: 1,
              duration: 3000,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),

          Animated.timing(
            orbita,
            {
              toValue: 0,
              duration: 3000,
              easing:
                Easing.inOut(
                  Easing.ease
                ),
              useNativeDriver:
                true,
            }
          ),
        ])
      );

    animacaoOrbita.start();

    return () => {
      animacaoOrbita.stop();
    };
  }, [
    orbita,
  ]);

  async function carregarPerfil() {
    try {
      const usuario =
        await buscarUsuario();

      if (!usuario) {
        setFotoUri(null);
        setNomeUsuario('');
        return;
      }

      setFotoUri(
        usuario.fotoUri ??
          null
      );

      setNomeUsuario(
        usuario.nome ??
          ''
      );
    } catch (error) {
      console.error(
        'Erro ao carregar dados da usuÃ¡ria:',
        error
      );
    }
  }

  async function carregarViagens() {
    try {
      setErro('');
      setCarregando(true);

      const usuario =
        await buscarUsuario();

      if (
        !usuario?.id
      ) {
        setViagens(
          []
        );

        setErro(
          'NÃ£o foi possÃ­vel identificar a usuÃ¡ria.'
        );

        return;
      }

      const response =
        await fetch(
          `${API_URL}/viagens?usuarioId=${usuario.id}`
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `Erro ao buscar viagens: ${response.status}`
        );
      }

      const dados:
        Viagem[] =
        await response.json();

      setViagens(
        dados
      );
    } catch (error) {
      console.error(
        'Erro ao carregar a Home:',
        error
      );

      setErro(
        'NÃ£o conseguimos carregar sua jornada agora.'
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  const viagemAtual =
    useMemo(
      () =>
        viagens.find(
          (
            viagem
          ) =>
            viagem.status ===
            'EM_ANDAMENTO'
        ) ?? null,
      [
        viagens,
      ]
    );

  const proximaViagem =
    useMemo(() => {
      return (
        viagens
          .filter(
            (
              viagem
            ) =>
              viagem.status ===
              'PLANEJADA'
          )
          .sort(
            (
              a,
              b
            ) =>
              converterDataLocal(
                a.dataInicio
              ).getTime() -
              converterDataLocal(
                b.dataInicio
              ).getTime()
          )[0] ?? null
      );
    }, [
      viagens,
    ]);

  const hoje =
    inicioDoDia(
      agora
    );

  const diasAteProxima =
    useMemo(() => {
      if (
        !proximaViagem
      ) {
        return null;
      }

      const inicio =
        converterDataLocal(
          proximaViagem.dataInicio
        );

      return Math.max(
        diferencaDias(
          hoje,
          inicio
        ),
        0
      );
    }, [
      hoje,
      proximaViagem,
    ]);

  const dadosViagemAtual =
    useMemo(() => {
      if (
        !viagemAtual
      ) {
        return null;
      }

      const inicio =
        converterDataLocal(
          viagemAtual.dataInicio
        );

      const fim =
        converterDataLocal(
          viagemAtual.dataFim
        );

      const totalDias =
        Math.max(
          diferencaDias(
            inicio,
            fim
          ) + 1,
          1
        );

      const diaAtual =
        Math.min(
          Math.max(
            diferencaDias(
              inicio,
              hoje
            ) + 1,
            1
          ),
          totalDias
        );

      const diasRestantes =
        Math.max(
          totalDias -
            diaAtual,
          0
        );

      const progresso =
        Math.round(
          (
            diaAtual /
            totalDias
          ) *
            100
        );

      return {
        totalDias,
        diaAtual,
        diasRestantes,
        progresso,
      };
    }, [
      hoje,
      viagemAtual,
    ]);

  const deslocamentoOrbita =
    orbita.interpolate({
      inputRange: [
        0,
        1,
      ],

      outputRange: [
        -5,
        5,
      ],
    });

  function abrirPerfil() {
    router.push(
      '/(tabs)/perfil'
    );
  }

  function abrirViagens() {
    router.push(
      '/(tabs)/viagens'
    );
  }

  function abrirMaia() {
    router.push(
      '/(tabs)/maia'
    );
  }

  function abrirEmergencia() {
    router.push(
      '/seguranca/emergencia'
    );
  }

  function fraseProximaViagem() {
    if (
      diasAteProxima ===
      null
    ) {
      return '';
    }

    if (
      diasAteProxima === 0
    ) {
      return 'Ã‰ hoje. Sua prÃ³xima histÃ³ria comeÃ§a agora.';
    }

    if (
      diasAteProxima === 1
    ) {
      return 'AmanhÃ£ comeÃ§a um novo capÃ­tulo.';
    }

    if (
      diasAteProxima <= 7
    ) {
      return 'Sua prÃ³xima histÃ³ria estÃ¡ quase comeÃ§ando.';
    }

    return 'Sua prÃ³xima histÃ³ria jÃ¡ tem data.';
  }

  function renderFundo() {
    return (
      <View
        pointerEvents="none"
        style={
          StyleSheet.absoluteFill
        }
      >
        <Animated.View
          style={[
            styles.blobOne,

            {
              transform: [
                {
                  translateY:
                    blobUmY,
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.blobTwo,

            {
              transform: [
                {
                  translateY:
                    blobDoisY,
                },
              ],
            },
          ]}
        />

        <View
          style={
            styles.smallCircleOne
          }
        />

        <View
          style={
            styles.smallCircleTwo
          }
        />
      </View>
    );
  }

  function renderCabecalho() {
    return (
      <View
        style={
          styles.header
        }
      >
        <Pressable
          onPress={
            abrirPerfil
          }
          style={({ pressed }) => [
            styles.avatarButton,

            pressed && {
              opacity: 0.8,
            },
          ]}
        >
          <View
            style={
              styles.avatarOuter
            }
          >
            <View
              style={
                styles.avatar
              }
            >
              {fotoUri ? (
                <Image
                  source={{
                    uri: fotoUri,
                  }}
                  style={
                    styles.avatarImage
                  }
                />
              ) : (
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {nomeUsuario
                    ? nomeUsuario
                        .trim()
                        .charAt(0)
                        .toUpperCase()
                    : 'EU'}
                </Text>
              )}
            </View>

            <View
              style={
                styles.avatarBadge
              }
            >
              <Text
                style={
                  styles.avatarBadgeText
                }
              >
                +
              </Text>
            </View>
          </View>
        </Pressable>

        <View
          style={
            styles.brandArea
          }
        >
          <Animated.View
            style={[
              styles.brandDetail,

              {
                opacity:
                  logoOpacity,
              },
            ]}
          >
            <View
              style={
                styles.brandDetailDot
              }
            />

            <View
              style={
                styles.brandDetailLine
              }
            />
          </Animated.View>

          <Text
            style={
              styles.brand
            }
          >
            maIA
          </Text>

          <Text
            style={
              styles.brandSubtitle
            }
          >
            sua companheira de viagem
          </Text>
        </View>
      </View>
    );
  }

  function renderIlustracaoSemViagem() {
    return (
      <View
        style={
          styles.emptyVisual
        }
      >
        <View
          style={
            styles.emptyBigCircle
          }
        />

        <View
          style={
            styles.emptyMiddleCircle
          }
        />

        <Animated.View
          style={[
            styles.emptyFloatingCircle,

            {
              transform: [
                {
                  translateY:
                    deslocamentoOrbita,
                },
              ],
            },
          ]}
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

        <Animated.Text
          style={[
            styles.emptySparkOne,

            {
              opacity:
                logoOpacity,
            },
          ]}
        >
          âœ¦
        </Animated.Text>

        <Text
          style={
            styles.emptySparkTwo
          }
        >
          Â·
        </Text>

        <Text
          style={
            styles.emptySparkThree
          }
        >
          Â·
        </Text>
      </View>
    );
  }

  function renderSemViagem() {
    return (
      <Animated.View
        style={[
          styles.heroCard,
          styles.emptyHero,

          {
            opacity:
              entradaOpacity,

            transform: [
              {
                translateY:
                  entradaY,
              },
            ],
          },
        ]}
      >
        <View
          style={
            styles.heroTag
          }
        >
          <Text
            style={
              styles.heroTagText
            }
          >
            SUA JORNADA
          </Text>
        </View>

        <Text
          style={
            styles.emptyBigTitle
          }
        >
          O prÃ³ximo destino ainda estÃ¡ por ser escolhido.
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          Quando uma nova viagem entrar nos seus planos, a maIA comeÃ§a a acompanhar vocÃª por aqui.
        </Text>

        {renderIlustracaoSemViagem()}
      </Animated.View>
    );
  }

  function renderProximaViagem() {
    if (
      !proximaViagem ||
      diasAteProxima ===
        null
    ) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.heroCard,
          styles.nextHero,

          {
            opacity:
              entradaOpacity,

            transform: [
              {
                translateY:
                  entradaY,
              },
            ],
          },
        ]}
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
            styles.nextHeader
          }
        >
          <View
            style={
              styles.heroTag
            }
          >
            <Text
              style={
                styles.heroTagText
              }
            >
              SUA PRÃ“XIMA VIAGEM
            </Text>
          </View>

          <View
            style={
              styles.nextMiniIcon
            }
          >
            <Text
              style={
                styles.nextMiniIconText
              }
            >
              âœˆ
            </Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.countdownBlock,

            {
              transform: [
                {
                  scale:
                    contadorScale,
                },
              ],
            },
          ]}
        >
          <Text
            style={
              styles.countdownNumber
            }
          >
            {
              diasAteProxima
            }
          </Text>

          <View
            style={
              styles.countdownTextArea
            }
          >
            <Text
              style={
                styles.countdownUnit
              }
            >
              {diasAteProxima ===
              1
                ? 'DIA'
                : 'DIAS'}
            </Text>

            <Text
              style={
                styles.countdownSmall
              }
            >
              para a viagem
            </Text>
          </View>
        </Animated.View>

        <View
          style={
            styles.destinationArea
          }
        >
          <Text
            style={
              styles.destinationTitle
            }
          >
            {obterDestinoPrincipal(
              proximaViagem
            )}
          </Text>

          <Text
            style={
              styles.destinationSubtitle
            }
          >
            {obterLocalSecundario(
              proximaViagem
            )}
          </Text>
        </View>

        <View
          style={
            styles.datePill
          }
        >
          <View
            style={
              styles.datePillSide
            }
          >
            <Text
              style={
                styles.datePillLabel
              }
            >
              IDA
            </Text>

            <Text
              style={
                styles.datePillValue
              }
            >
              {formatarDataCurta(
                proximaViagem.dataInicio
              )}
            </Text>
          </View>

          <View
            style={
              styles.datePillCenter
            }
          >
            <View
              style={
                styles.dateDot
              }
            />

            <View
              style={
                styles.dateConnector
              }
            />

            <View
              style={
                styles.dateDot
              }
            />
          </View>

          <View
            style={
              styles.datePillSide
            }
          >
            <Text
              style={
                styles.datePillLabel
              }
            >
              VOLTA
            </Text>

            <Text
              style={
                styles.datePillValue
              }
            >
              {formatarDataCurta(
                proximaViagem.dataFim
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.nextPhraseArea
          }
        >
          <Text
            style={
              styles.nextPhraseQuote
            }
          >
            â€œ
          </Text>

          <Text
            style={
              styles.nextPhrase
            }
          >
            {fraseProximaViagem()}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.mainButton,

            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            abrirViagens
          }
        >
          <Text
            style={
              styles.mainButtonText
            }
          >
            VER MINHA VIAGEM
          </Text>

          <View
            style={
              styles.mainButtonArrowBox
            }
          >
            <Text
              style={
                styles.mainButtonArrow
              }
            >
              â€º
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  function renderViagemAtual() {
    if (
      !viagemAtual ||
      !dadosViagemAtual
    ) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.heroCard,
          styles.activeHero,

          {
            opacity:
              entradaOpacity,

            transform: [
              {
                translateY:
                  entradaY,
              },
            ],
          },
        ]}
      >
        <View
          style={
            styles.activeDecorOne
          }
        />

        <View
          style={
            styles.activeDecorTwo
          }
        />

        <View
          style={
            styles.activeStatusRow
          }
        >
          <View
            style={
              styles.activeStatusDot
            }
          />

          <Text
            style={
              styles.activeStatusText
            }
          >
            VOCÃŠ ESTÃ EM VIAGEM
          </Text>
        </View>

        <Text
          style={
            styles.activeDayText
          }
        >
          DIA {
            dadosViagemAtual.diaAtual
          } DE {
            dadosViagemAtual.totalDias
          }
        </Text>

        <Text
          style={
            styles.activeDestination
          }
        >
          {obterDestinoPrincipal(
            viagemAtual
          )}
        </Text>

        <Text
          style={
            styles.activeLocation
          }
        >
          {obterLocalSecundario(
            viagemAtual
          )}
        </Text>

        <View
          style={
            styles.progressArea
          }
        >
          <View
            style={
              styles.progressTop
            }
          >
            <Text
              style={
                styles.progressLabel
              }
            >
              SUA JORNADA
            </Text>

            <Text
              style={
                styles.progressValue
              }
            >
              {
                dadosViagemAtual.progresso
              }%
            </Text>
          </View>

          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,

                {
                  width:
                    `${dadosViagemAtual.progresso}%`,
                },
              ]}
            />
          </View>
        </View>

        <View
          style={
            styles.activeNumbers
          }
        >
          <View
            style={
              styles.activeNumberItem
            }
          >
            <Text
              style={
                styles.activeNumberValue
              }
            >
              {
                dadosViagemAtual.diaAtual
              }
            </Text>

            <Text
              style={
                styles.activeNumberLabel
              }
            >
              dia atual
            </Text>
          </View>

          <View
            style={
              styles.activeNumbersDivider
            }
          />

          <View
            style={
              styles.activeNumberItem
            }
          >
            <Text
              style={
                styles.activeNumberValue
              }
            >
              {
                dadosViagemAtual.diasRestantes
              }
            </Text>

            <Text
              style={
                styles.activeNumberLabel
              }
            >
              {dadosViagemAtual.diasRestantes ===
              1
                ? 'dia restante'
                : 'dias restantes'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.activeMainButton,

            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            abrirViagens
          }
        >
          <Text
            style={
              styles.activeMainButtonText
            }
          >
            VER MINHA VIAGEM
          </Text>

          <Text
            style={
              styles.activeMainButtonArrow
            }
          >
            â€º
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.comfortButton,

            pressed &&
              styles.buttonPressed,
          ]}
          onPress={
            abrirEmergencia
          }
        >
          <View
            style={
              styles.comfortIcon
            }
          >
            <Text
              style={
                styles.comfortIconText
              }
            >
              !
            </Text>
          </View>

          <View
            style={
              styles.comfortContent
            }
          >
            <Text
              style={
                styles.comfortTitle
              }
            >
              NÃƒO ESTOU ME SENTINDO CONFORTÃVEL
            </Text>

            <Text
              style={
                styles.comfortDescription
              }
            >
              Quero ajuda agora.
            </Text>
          </View>

          <Text
            style={
              styles.comfortArrow
            }
          >
            â€º
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View
      style={
        styles.screen
      }
    >
      {renderFundo()}

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
        {renderCabecalho()}

        <Animated.View
          style={[
            styles.introArea,

            {
              opacity:
                entradaOpacity,

              transform: [
                {
                  translateY:
                    entradaY,
                },
              ],
            },
          ]}
        >
          <Text
            style={
              styles.introEyebrow
            }
          >
            BEM-VINDA
          </Text>

          <Text
            style={
              styles.introTitle
            }
          >
            Onde sua jornada estÃ¡ hoje?
          </Text>

          <Text
            style={
              styles.introSubtitle
            }
          >
            A maIA acompanha cada fase da sua viagem.
          </Text>
        </Animated.View>

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
              Organizando sua jornada...
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
              NÃ£o foi possÃ­vel carregar agora
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
        ) : viagemAtual ? (
          renderViagemAtual()
        ) : proximaViagem ? (
          renderProximaViagem()
        ) : (
          renderSemViagem()
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

    blobOne: {
      position:
        'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor:
        'rgba(109, 40, 217, 0.055)',
      top: 95,
      right: -140,
    },

    blobTwo: {
      position:
        'absolute',
      width: 230,
      height: 230,
      borderRadius: 115,
      backgroundColor:
        'rgba(160, 120, 220, 0.05)',
      top: 600,
      left: -140,
    },

    smallCircleOne: {
      position:
        'absolute',
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor:
        'rgba(109, 40, 217, 0.08)',
      top: 285,
      right: 35,
    },

    smallCircleTwo: {
      position:
        'absolute',
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        'rgba(109, 40, 217, 0.1)',
      top: 530,
      left: 28,
    },

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 35,
    },

    avatarButton: {
      borderRadius: 40,
    },

    avatarOuter: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor:
        '#ffffff',
      padding: 3,

      shadowColor:
        '#6d28d9',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },

    avatar: {
      flex: 1,
      borderRadius: 29,
      backgroundColor:
        '#eee7fb',
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        '#ded0f6',
      overflow: 'hidden',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 29,
    },

    avatarText: {
      fontSize: 14,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.4,
    },

    avatarBadge: {
      position:
        'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      right: -2,
      bottom: -2,
      backgroundColor:
        '#6d28d9',
      borderWidth: 2,
      borderColor:
        '#ffffff',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    avatarBadgeText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 18,
    },

    brandArea: {
      alignItems:
        'flex-end',
      position:
        'relative',
    },

    brand: {
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: -1.4,
      color: '#6d28d9',
    },

    brandSubtitle: {
      marginTop: -3,
      fontSize: 10,
      letterSpacing: 0.6,
      color: '#88818e',
    },

    brandDetail: {
      position:
        'absolute',
      left: -28,
      top: -8,
      width: 20,
      height: 20,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    brandDetailDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        '#8b5cf6',
    },

    brandDetailLine: {
      position:
        'absolute',
      width: 18,
      height: 1,
      backgroundColor:
        'rgba(139, 92, 246, 0.35)',
      transform: [
        {
          rotate:
            '45deg',
        },
      ],
    },

    introArea: {
      marginBottom: 22,
    },

    introEyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
      color: '#8b5cf6',
      marginBottom: 8,
    },

    introTitle: {
      maxWidth: 330,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: '900',
      color: '#252129',
      letterSpacing: -0.5,
    },

    introSubtitle: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color: '#89828d',
    },

    heroCard: {
      borderRadius: 30,
      overflow: 'hidden',

      shadowColor:
        '#291d3d',
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity: 0.09,
      shadowRadius: 22,
      elevation: 6,
    },

    nextHero: {
      padding: 24,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e8e0f3',
    },

    emptyHero: {
      padding: 24,
      minHeight: 455,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e8e0f3',
    },

    activeHero: {
      padding: 24,
      backgroundColor:
        '#6d28d9',
    },

    heroTag: {
      alignSelf:
        'flex-start',
      backgroundColor:
        '#f1ebfb',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },

    heroTagText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.3,
      color: '#6d28d9',
    },

    emptyBigTitle: {
      marginTop: 27,
      maxWidth: 310,
      fontSize: 28,
      lineHeight: 35,
      fontWeight: '900',
      color: '#2d2831',
      letterSpacing: -0.6,
    },

    emptyDescription: {
      marginTop: 13,
      maxWidth: 310,
      fontSize: 14,
      lineHeight: 22,
      color: '#817986',
    },

    emptyVisual: {
      flex: 1,
      minHeight: 175,
      marginTop: 20,
      position:
        'relative',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyBigCircle: {
      position:
        'absolute',
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor:
        '#f6f2fb',
    },

    emptyMiddleCircle: {
      position:
        'absolute',
      width: 92,
      height: 92,
      borderRadius: 46,
      borderWidth: 1,
      borderColor:
        '#e2d7f1',
    },

    emptyFloatingCircle: {
      position:
        'absolute',
      width: 21,
      height: 21,
      borderRadius: 11,
      backgroundColor:
        '#d4beeF',
      top: 24,
      right: 58,
    },

    emptyPin: {
      width: 47,
      height: 47,
      borderRadius: 24,
      backgroundColor:
        '#6d28d9',
      alignItems:
        'center',
      justifyContent:
        'center',

      shadowColor:
        '#6d28d9',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    emptyPinCenter: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor:
        '#ffffff',
    },

    emptySparkOne: {
      position:
        'absolute',
      left: 50,
      top: 34,
      fontSize: 20,
      color: '#8b5cf6',
    },

    emptySparkTwo: {
      position:
        'absolute',
      right: 72,
      bottom: 33,
      fontSize: 28,
      color: '#cab4e8',
    },

    emptySparkThree: {
      position:
        'absolute',
      left: 72,
      bottom: 49,
      fontSize: 25,
      color: '#e1d3f1',
    },

    nextHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    nextMiniIcon: {
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor:
        '#f2ecfb',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    nextMiniIconText: {
      fontSize: 17,
      color: '#6d28d9',
    },

    decorCircleOne: {
      position:
        'absolute',
      width: 155,
      height: 155,
      borderRadius: 78,
      backgroundColor:
        'rgba(109, 40, 217, 0.035)',
      right: -65,
      top: 40,
    },

    decorCircleTwo: {
      position:
        'absolute',
      width: 78,
      height: 78,
      borderRadius: 39,
      borderWidth: 1,
      borderColor:
        'rgba(109, 40, 217, 0.08)',
      right: 15,
      top: 113,
    },

    countdownBlock: {
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      marginTop: 24,
    },

    countdownNumber: {
      fontSize: 76,
      lineHeight: 78,
      fontWeight: '900',
      letterSpacing: -5,
      color: '#6d28d9',
    },

    countdownTextArea: {
      marginLeft: 12,
      marginBottom: 9,
    },

    countdownUnit: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 1.5,
      color: '#6d28d9',
    },

    countdownSmall: {
      marginTop: 3,
      fontSize: 11,
      color: '#918797',
    },

    destinationArea: {
      marginTop: 25,
    },

    destinationTitle: {
      fontSize: 27,
      lineHeight: 32,
      fontWeight: '900',
      color: '#28232d',
      letterSpacing: -0.5,
    },

    destinationSubtitle: {
      marginTop: 5,
      fontSize: 13,
      color: '#827a87',
    },

    datePill: {
      marginTop: 22,
      height: 69,
      borderRadius: 20,
      backgroundColor:
        '#f8f5fc',
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 12,
    },

    datePillSide: {
      flex: 1,
      alignItems:
        'center',
    },

    datePillCenter: {
      width: 67,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    dateConnector: {
      width: 30,
      height: 1,
      backgroundColor:
        '#d8c7ed',
    },

    dateDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        '#8b5cf6',
    },

    datePillLabel: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.2,
      color: '#a196aa',
    },

    datePillValue: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.5,
    },

    nextPhraseArea: {
      marginTop: 25,
      borderRadius: 18,
      backgroundColor:
        '#faf8fd',
      paddingVertical: 15,
      paddingLeft: 18,
      paddingRight: 15,
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    nextPhraseQuote: {
      fontSize: 30,
      lineHeight: 27,
      color: '#b596df',
      marginRight: 8,
      marginTop: -1,
    },

    nextPhrase: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      color: '#665e6b',
    },

    mainButton: {
      marginTop: 20,
      height: 58,
      borderRadius: 19,
      backgroundColor:
        '#6d28d9',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingLeft: 18,
      paddingRight: 10,
    },

    mainButtonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    mainButtonArrowBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(255,255,255,0.15)',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    mainButtonArrow: {
      color: '#ffffff',
      fontSize: 28,
      lineHeight: 29,
    },

    buttonPressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    activeDecorOne: {
      position:
        'absolute',
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor:
        'rgba(255,255,255,0.04)',
      right: -90,
      top: -40,
    },

    activeDecorTwo: {
      position:
        'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.1)',
      right: 8,
      top: 55,
    },

    activeStatusRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    activeStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        '#ffffff',
      marginRight: 8,
    },

    activeStatusText: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
      color:
        'rgba(255,255,255,0.76)',
    },

    activeDayText: {
      marginTop: 24,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.2,
      color:
        'rgba(255,255,255,0.7)',
    },

    activeDestination: {
      marginTop: 8,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '900',
      color: '#ffffff',
      letterSpacing: -0.8,
    },

    activeLocation: {
      marginTop: 4,
      fontSize: 13,
      color:
        'rgba(255,255,255,0.7)',
    },

    progressArea: {
      marginTop: 29,
    },

    progressTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    progressLabel: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.3,
      color:
        'rgba(255,255,255,0.65)',
    },

    progressValue: {
      fontSize: 12,
      fontWeight: '900',
      color: '#ffffff',
    },

    progressTrack: {
      marginTop: 10,
      height: 8,
      borderRadius: 999,
      backgroundColor:
        'rgba(255,255,255,0.18)',
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor:
        '#ffffff',
    },

    activeNumbers: {
      marginTop: 21,
      borderRadius: 18,
      backgroundColor:
        'rgba(255,255,255,0.1)',
      flexDirection:
        'row',
      paddingVertical: 14,
    },

    activeNumberItem: {
      flex: 1,
      alignItems:
        'center',
    },

    activeNumberValue: {
      fontSize: 24,
      fontWeight: '900',
      color: '#ffffff',
    },

    activeNumberLabel: {
      marginTop: 3,
      fontSize: 9,
      color:
        'rgba(255,255,255,0.64)',
    },

    activeNumbersDivider: {
      width: 1,
      backgroundColor:
        'rgba(255,255,255,0.15)',
    },

    activeMainButton: {
      marginTop: 22,
      height: 56,
      borderRadius: 18,
      backgroundColor:
        '#ffffff',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 17,
    },

    activeMainButtonText: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: '#6d28d9',
    },

    activeMainButtonArrow: {
      fontSize: 27,
      color: '#6d28d9',
    },

    comfortButton: {
      marginTop: 12,
      minHeight: 76,
      borderRadius: 18,
      backgroundColor:
        '#fff4f4',
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 13,
      paddingVertical: 12,
    },

    comfortIcon: {
      width: 39,
      height: 39,
      borderRadius: 20,
      backgroundColor:
        '#b4232c',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    comfortIconText: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '900',
    },

    comfortContent: {
      flex: 1,
    },

    comfortTitle: {
      fontSize: 9,
      lineHeight: 13,
      fontWeight: '900',
      letterSpacing: 0.4,
      color: '#94222a',
    },

    comfortDescription: {
      marginTop: 3,
      fontSize: 10,
      color: '#93696d',
    },

    comfortArrow: {
      color: '#a52f37',
      fontSize: 26,
      marginLeft: 6,
    },

    loadingArea: {
      minHeight: 360,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      marginTop: 13,
      fontSize: 12,
      color: '#85808b',
    },

    errorCard: {
      padding: 22,
      borderRadius: 24,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e8e0f0',
    },

    errorTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#302b34',
    },

    errorDescription: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: '#817a85',
    },

    retryButton: {
      alignSelf:
        'flex-start',
      marginTop: 16,
      borderRadius: 13,
      backgroundColor:
        '#6d28d9',
      paddingHorizontal: 15,
      paddingVertical: 11,
    },

    retryButtonText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.6,
      color: '#ffffff',
    },
  });
