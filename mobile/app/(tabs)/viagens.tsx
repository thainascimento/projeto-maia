import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';
import { router } from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';

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

type Clima = {
  temperatura: number | null;
  sensacaoTermica: number | null;
  temperaturaMaxima: number | null;
  temperaturaMinima: number | null;
  probabilidadeChuva: number | null;
  vento: number | null;
  rajadas: number | null;
  neve: number | null;
  codigoClima: number | null;
  isDay: number | null;
};

type MareEvento = {
  tipo: 'ALTA' | 'BAIXA' | string;
  dataHora: string;
  altura: number | null;
};

type Mare = {
  latitude: number | null;
  longitude: number | null;
  estacao: string | null;
  datum: string | null;

  proximaMareBaixa: MareEvento | null;
  proximaMareAlta: MareEvento | null;

  eventos: MareEvento[];
};

type Filtro =
  | 'proximas'
  | 'andamento'
  | 'anteriores';

type TipoAmbiente =
  | 'SOL'
  | 'NOITE'
  | 'NUBLADO_DIA'
  | 'NUBLADO_NOITE'
  | 'CHUVA_DIA'
  | 'CHUVA_NOITE'
  | 'NEVE_DIA'
  | 'NEVE_NOITE'
  | 'TEMPESTADE_DIA'
  | 'TEMPESTADE_NOITE';

function obterTipoAmbiente(
  clima: Clima
): TipoAmbiente {
  const dia =
    clima.isDay === 1;

  const codigo =
    clima.codigoClima;

  if (codigo == null) {
    return dia
      ? 'SOL'
      : 'NOITE';
  }

  if (codigo === 0) {
    return dia
      ? 'SOL'
      : 'NOITE';
  }

  if (
    codigo === 1 ||
    codigo === 2 ||
    codigo === 3 ||
    codigo === 45 ||
    codigo === 48
  ) {
    return dia
      ? 'NUBLADO_DIA'
      : 'NUBLADO_NOITE';
  }

  if (
    (codigo >= 51 &&
      codigo <= 67) ||
    (codigo >= 80 &&
      codigo <= 82)
  ) {
    return dia
      ? 'CHUVA_DIA'
      : 'CHUVA_NOITE';
  }

  if (
    (codigo >= 71 &&
      codigo <= 77) ||
    (codigo >= 85 &&
      codigo <= 86)
  ) {
    return dia
      ? 'NEVE_DIA'
      : 'NEVE_NOITE';
  }

  if (codigo >= 95) {
    return dia
      ? 'TEMPESTADE_DIA'
      : 'TEMPESTADE_NOITE';
  }

  return dia
    ? 'SOL'
    : 'NOITE';
}

function fundoAmbiente(
  tipo: TipoAmbiente
) {
  switch (tipo) {
    case 'SOL':
      return '#fff6d8';

    case 'NOITE':
      return '#172039';

    case 'NUBLADO_DIA':
      return '#e8edf3';

    case 'NUBLADO_NOITE':
      return '#202a3d';

    case 'CHUVA_DIA':
      return '#dfe8ef';

    case 'CHUVA_NOITE':
      return '#182333';

    case 'NEVE_DIA':
      return '#edf7fb';

    case 'NEVE_NOITE':
      return '#1c2b40';

    case 'TEMPESTADE_DIA':
      return '#d6dde4';

    case 'TEMPESTADE_NOITE':
      return '#121927';

    default:
      return '#f7f7fb';
  }
}

function textoClaro(
  tipo: TipoAmbiente
) {
  return (
    tipo === 'NOITE' ||
    tipo === 'NUBLADO_NOITE' ||
    tipo === 'CHUVA_NOITE' ||
    tipo === 'NEVE_NOITE' ||
    tipo === 'TEMPESTADE_NOITE'
  );
}

function WeatherScene({
  clima,
}: {
  clima: Clima;
}) {
  const tipo =
    obterTipoAmbiente(
      clima
    );

  const solScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const estrelaOpacity =
    useRef(
      new Animated.Value(
        0.35
      )
    ).current;

  const chuvaY =
    useRef(
      new Animated.Value(
        -20
      )
    ).current;

  const neveY =
    useRef(
      new Animated.Value(
        -15
      )
    ).current;

  const nuvemX =
    useRef(
      new Animated.Value(
        -6
      )
    ).current;

  useEffect(() => {
    const animacoes:
      Animated.CompositeAnimation[] =
      [];

    if (
      tipo === 'SOL'
    ) {
      const animacao =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              solScale,
              {
                toValue: 1.08,
                duration: 1700,
                easing:
                  Easing.inOut(
                    Easing.ease
                  ),
                useNativeDriver:
                  true,
              }
            ),

            Animated.timing(
              solScale,
              {
                toValue: 1,
                duration: 1700,
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

      animacoes.push(
        animacao
      );

      animacao.start();
    }

    if (
      tipo.includes(
        'NOITE'
      )
    ) {
      const animacao =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              estrelaOpacity,
              {
                toValue: 1,
                duration: 1300,
                useNativeDriver:
                  true,
              }
            ),

            Animated.timing(
              estrelaOpacity,
              {
                toValue: 0.3,
                duration: 1500,
                useNativeDriver:
                  true,
              }
            ),
          ])
        );

      animacoes.push(
        animacao
      );

      animacao.start();
    }

    if (
      tipo.includes(
        'CHUVA'
      ) ||
      tipo.includes(
        'TEMPESTADE'
      )
    ) {
      const animacao =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              chuvaY,
              {
                toValue: 180,
                duration: 1250,
                easing:
                  Easing.linear,
                useNativeDriver:
                  true,
              }
            ),

            Animated.timing(
              chuvaY,
              {
                toValue: -20,
                duration: 0,
                useNativeDriver:
                  true,
              }
            ),
          ])
        );

      animacoes.push(
        animacao
      );

      animacao.start();
    }

    if (
      tipo.includes(
        'NEVE'
      )
    ) {
      const animacao =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              neveY,
              {
                toValue: 180,
                duration: 4200,
                easing:
                  Easing.linear,
                useNativeDriver:
                  true,
              }
            ),

            Animated.timing(
              neveY,
              {
                toValue: -15,
                duration: 0,
                useNativeDriver:
                  true,
              }
            ),
          ])
        );

      animacoes.push(
        animacao
      );

      animacao.start();
    }

    if (
      tipo.includes(
        'NUBLADO'
      ) ||
      tipo.includes(
        'CHUVA'
      ) ||
      tipo.includes(
        'TEMPESTADE'
      )
    ) {
      const animacao =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              nuvemX,
              {
                toValue: 8,
                duration: 3200,
                easing:
                  Easing.inOut(
                    Easing.ease
                  ),
                useNativeDriver:
                  true,
              }
            ),

            Animated.timing(
              nuvemX,
              {
                toValue: -6,
                duration: 3200,
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

      animacoes.push(
        animacao
      );

      animacao.start();
    }

    return () => {
      animacoes.forEach(
        (
          animacao
        ) =>
          animacao.stop()
      );
    };
  }, [
    tipo,
    solScale,
    estrelaOpacity,
    chuvaY,
    neveY,
    nuvemX,
  ]);

  const noite =
    textoClaro(
      tipo
    );

  return (
    <View
      pointerEvents="none"
      style={
        StyleSheet.absoluteFill
      }
    >
      {tipo ===
        'SOL' && (
        <Animated.Text
          style={[
            styles.sceneSun,

            {
              transform: [
                {
                  scale:
                    solScale,
                },
              ],
            },
          ]}
        >
          ☀️
        </Animated.Text>
      )}

      {noite && (
        <>
          <Text
            style={
              styles.sceneMoon
            }
          >
            🌙
          </Text>

          <Animated.View
            style={[
              styles.starsLayer,

              {
                opacity:
                  estrelaOpacity,
              },
            ]}
          >
            <Text
              style={
                styles.starOne
              }
            >
              ✦
            </Text>

            <Text
              style={
                styles.starTwo
              }
            >
              ✧
            </Text>

            <Text
              style={
                styles.starThree
              }
            >
              ✦
            </Text>

            <Text
              style={
                styles.starFour
              }
            >
              ·
            </Text>
          </Animated.View>
        </>
      )}

      {(tipo.includes(
        'NUBLADO'
      ) ||
        tipo.includes(
          'CHUVA'
        ) ||
        tipo.includes(
          'TEMPESTADE'
        )) && (
        <Animated.View
          style={[
            styles.cloudLayer,

            {
              transform: [
                {
                  translateX:
                    nuvemX,
                },
              ],
            },
          ]}
        >
          <Text
            style={
              styles.cloudOne
            }
          >
            ☁️
          </Text>

          <Text
            style={
              styles.cloudTwo
            }
          >
            ☁️
          </Text>
        </Animated.View>
      )}

      {(tipo.includes(
        'CHUVA'
      ) ||
        tipo.includes(
          'TEMPESTADE'
        )) && (
        <Animated.View
          style={[
            styles.rainLayer,

            {
              transform: [
                {
                  translateY:
                    chuvaY,
                },
              ],
            },
          ]}
        >
          {[
            8,
            28,
            48,
            70,
            92,
            114,
            136,
            158,
            180,
            202,
            224,
            246,
            268,
          ].map(
            (
              left,
              index
            ) => (
              <Text
                key={
                  index
                }
                style={[
                  styles.rainDrop,

                  {
                    left,

                    top:
                      (index %
                        4) *
                      28,
                  },
                ]}
              >
                |
              </Text>
            )
          )}
        </Animated.View>
      )}

      {tipo.includes(
        'NEVE'
      ) && (
        <Animated.View
          style={[
            styles.snowLayer,

            {
              transform: [
                {
                  translateY:
                    neveY,
                },
              ],
            },
          ]}
        >
          {[
            10,
            40,
            72,
            102,
            137,
            168,
            203,
            235,
            265,
          ].map(
            (
              left,
              index
            ) => (
              <Text
                key={
                  index
                }
                style={[
                  styles.snowFlake,

                  {
                    left,

                    top:
                      (index %
                        3) *
                      40,
                  },
                ]}
              >
                ❄
              </Text>
            )
          )}
        </Animated.View>
      )}
    </View>
  );
}

export default function ViagensScreen() {
  const [
    viagens,
    setViagens,
  ] =
    useState<
      Viagem[]
    >([]);

  const [
    filtro,
    setFiltro,
  ] =
    useState<Filtro>(
      'proximas'
    );

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    atualizando,
    setAtualizando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState('');

  const [
    cancelandoId,
    setCancelandoId,
  ] =
    useState<
      number | null
    >(null);

  const [
    climas,
    setClimas,
  ] =
    useState<
      Record<
        number,
        Clima
      >
    >({});

  const [
    carregandoClima,
    setCarregandoClima,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >({});

  const [
    mares,
    setMares,
  ] =
    useState<
      Record<
        number,
        Mare
      >
    >({});

  const [
    carregandoMare,
    setCarregandoMare,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >({});

  useEffect(() => {
    carregarViagens();
  }, []);

  async function carregarClima(
    viagem: Viagem
  ) {
    if (
      viagem.latitude ==
        null ||
      viagem.longitude ==
        null
    ) {
      console.log(
        'Viagem sem coordenadas:',
        viagem.destino
      );

      return;
    }

    try {
      setCarregandoClima(
        (
          atual
        ) => ({
          ...atual,

          [viagem.id]:
            true,
        })
      );

      const response =
        await fetch(
          `${API_URL}/clima?lat=${viagem.latitude}&lon=${viagem.longitude}`
        );

      if (
        !response.ok
      ) {
        const mensagem =
          await response.text();

        throw new Error(
          mensagem ||
            `Erro ao buscar clima: ${response.status}`
        );
      }

      const dados:
        Clima =
          await response.json();

      console.log(
        `Clima de ${viagem.destino}:`,
        dados
      );

      setClimas(
        (
          atual
        ) => ({
          ...atual,

          [viagem.id]:
            dados,
        })
      );
    } catch (error) {
      console.error(
        `Erro ao carregar clima de ${viagem.destino}:`,
        error
      );
    } finally {
      setCarregandoClima(
        (
          atual
        ) => ({
          ...atual,

          [viagem.id]:
            false,
        })
      );
    }
  }

  async function carregarMare(
    viagem: Viagem
  ) {
    if (
      viagem.latitude ==
        null ||
      viagem.longitude ==
        null
    ) {
      return;
    }

    try {
      setCarregandoMare(
        (
          atual
        ) => ({
          ...atual,

          [viagem.id]:
            true,
        })
      );

      const response =
        await fetch(
          `${API_URL}/mare?lat=${viagem.latitude}&lon=${viagem.longitude}`
        );

      if (
        !response.ok
      ) {
        const mensagem =
          await response.text();

        throw new Error(
          mensagem ||
            `Erro ao buscar maré: ${response.status}`
        );
      }

      const dados:
        Mare =
          await response.json();

      console.log(
        `Maré de ${viagem.destino}:`,
        dados
      );

      setMares(
        (
          atual
        ) => ({
          ...atual,

          [viagem.id]:
            dados,
        })
      );
    } catch (error) {
      console.error(
        `Erro ao carregar maré de ${viagem.destino}:`,
        error
      );
    } finally {
      setCarregandoMare(
        (
          atual
        ) => ({
          ...atual,

          [viagem.id]:
            false,
        })
      );
    }
  }

  async function carregarViagens() {
    try {
      setErro('');

      const usuario =
        await buscarUsuario();

      if (
        !usuario?.id
      ) {
        setViagens(
          []
        );

        setErro(
          'Não foi possível identificar a usuária logada.'
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

      /*
       * A lista de viagens aparece
       * imediatamente.
       */
      setViagens(
        dados
      );

      const viagensAtivas =
        dados.filter(
          (
            item
          ) =>
            item.status ===
            'EM_ANDAMENTO'
        );

      /*
       * IMPORTANTE:
       *
       * Não usamos await aqui.
       * Clima e maré são informações
       * complementares.
       *
       * Se uma API externa falhar,
       * Minhas Viagens continua abrindo.
       */
      viagensAtivas.forEach(
        (
          item
        ) => {
          void carregarClima(
            item
          );

          void carregarMare(
            item
          );
        }
      );
    } catch (error) {
      console.error(
        'Erro ao buscar viagens:',
        error
      );

      setErro(
        'Não foi possível carregar suas viagens.'
      );
    } finally {
      setCarregando(
        false
      );

      setAtualizando(
        false
      );
    }
  }

  async function atualizar() {
    setAtualizando(
      true
    );

    await carregarViagens();
  }

  async function cancelarViagem(
    viagem: Viagem
  ) {
    try {
      setCancelandoId(
        viagem.id
      );

      const response =
        await fetch(
          `${API_URL}/viagens/${viagem.id}/cancelar`,
          {
            method:
              'POST',
          }
        );

      if (
        !response.ok
      ) {
        const mensagem =
          await response.text();

        throw new Error(
          mensagem ||
            `Erro HTTP: ${response.status}`
        );
      }

      const viagemCancelada:
        Viagem =
          await response.json();

      setViagens(
        (
          viagensAtuais
        ) =>
          viagensAtuais.map(
            (
              item
            ) =>
              item.id ===
              viagemCancelada.id
                ? viagemCancelada
                : item
          )
      );

      Alert.alert(
        'Viagem cancelada',
        `${viagem.destino} foi removida das suas próximas viagens.`
      );
    } catch (error) {
      console.error(
        'Erro ao cancelar viagem:',
        error
      );

      Alert.alert(
        'Não foi possível cancelar',
        'Tivemos um problema ao cancelar essa viagem. Tente novamente.'
      );
    } finally {
      setCancelandoId(
        null
      );
    }
  }

  function confirmarCancelamento(
    viagem: Viagem
  ) {
    Alert.alert(
      'Desistiu da viagem?',
      `Tem certeza de que deseja cancelar sua viagem para ${viagem.destino}?`,
      [
        {
          text:
            'Continuar com a viagem',

          style:
            'cancel',
        },

        {
          text:
            'Desisti da viagem',

          style:
            'destructive',

          onPress: () =>
            cancelarViagem(
              viagem
            ),
        },
      ]
    );
  }

  const viagensFiltradas =
    useMemo(() => {
      if (
        filtro ===
        'proximas'
      ) {
        return viagens.filter(
          (
            item
          ) =>
            item.status ===
            'PLANEJADA'
        );
      }

      if (
        filtro ===
        'andamento'
      ) {
        return viagens.filter(
          (
            item
          ) =>
            item.status ===
            'EM_ANDAMENTO'
        );
      }

      return viagens.filter(
        (
          item
        ) =>
          item.status ===
            'FINALIZADA' ||
          item.status ===
            'CANCELADA'
      );
    }, [
      viagens,
      filtro,
    ]);

  const viagemAtiva =
    viagens.find(
      (
        item
      ) =>
        item.status ===
        'EM_ANDAMENTO'
    );

  const climaAtivo =
    viagemAtiva
      ? climas[
          viagemAtiva.id
        ]
      : undefined;

  const ambienteAtivo =
    climaAtivo
      ? obterTipoAmbiente(
          climaAtivo
        )
      : null;

  function formatarData(
    data: string
  ) {
    if (
      !data
    ) {
      return '';
    }

    const [
      ano,
      mes,
      dia,
    ] =
      data.split(
        '-'
      );

    return `${dia}/${mes}/${ano}`;
  }

  function formatarNumero(
    valor:
      | number
      | null
      | undefined,
    casas = 1
  ) {
    if (
      valor == null
    ) {
      return '--';
    }

    return valor
      .toFixed(
        casas
      )
      .replace(
        '.',
        ','
      );
  }

  function formatarDataHoraMare(
    dataHora?:
      | string
      | null
  ) {
    if (
      !dataHora
    ) {
      return '--';
    }

    const match =
      dataHora.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
      );

    if (
      !match
    ) {
      return dataHora;
    }

    const [
      ,
      ano,
      mes,
      dia,
      hora,
      minuto,
    ] =
      match;

    return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
  }

  function formatarAlturaMare(
    altura?:
      | number
      | null
  ) {
    if (
      altura == null
    ) {
      return '--';
    }

    return `${altura
      .toFixed(
        2
      )
      .replace(
        '.',
        ','
      )} m`;
  }

  function horarioLocalMare(
    dataHora?:
      | string
      | null
  ) {
    if (
      !dataHora
    ) {
      return null;
    }

    const match =
      dataHora.match(
        /T(\d{2}):(\d{2})/
      );

    if (
      !match
    ) {
      return null;
    }

    return {
      hora:
        Number(
          match[1]
        ),

      minuto:
        Number(
          match[2]
        ),
    };
  }

  function ehHorarioDiurnoMare(
    dataHora?:
      | string
      | null
  ) {
    const horario =
      horarioLocalMare(
        dataHora
      );

    if (
      !horario
    ) {
      return false;
    }

    return (
      horario.hora >=
        6 &&
      horario.hora <
        18
    );
  }

  function formatarHoraMare(
    dataHora?:
      | string
      | null
  ) {
    const horario =
      horarioLocalMare(
        dataHora
      );

    if (
      !horario
    ) {
      return '--:--';
    }

    return (
      `${String(
        horario.hora
      ).padStart(
        2,
        '0'
      )}:` +
      `${String(
        horario.minuto
      ).padStart(
        2,
        '0'
      )}`
    );
  }

  function formatarDiaMare(
    dataHora?:
      | string
      | null
  ) {
    if (
      !dataHora
    ) {
      return '--';
    }

    const match =
      dataHora.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (
      !match
    ) {
      return '--';
    }

    return `${match[3]}/${match[2]}`;
  }

  function encontrarProximaMareBaixaDiurna(
    mare: Mare
  ) {
    const agora =
      Date.now();

    return (
      mare.eventos
        ?.filter(
          (
            evento
          ) => {
            if (
              evento.tipo !==
              'BAIXA'
            ) {
              return false;
            }

            if (
              !ehHorarioDiurnoMare(
                evento.dataHora
              )
            ) {
              return false;
            }

            const instante =
              new Date(
                evento.dataHora
              ).getTime();

            return (
              Number.isFinite(
                instante
              ) &&
              instante >
                agora
            );
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              a.dataHora
            ).getTime() -
            new Date(
              b.dataHora
            ).getTime()
        )[0] ??
      null
    );
  }

  function localizacao(
    viagem: Viagem
  ) {
    const partes = [
      viagem.cidade,
      viagem.estado,
      viagem.pais,
    ].filter(
      Boolean
    );

    if (
      partes.length ===
      0
    ) {
      return viagem.destino;
    }

    return partes.join(
      ', '
    );
  }

  function textoStatus(
    status:
      StatusViagem
  ) {
    switch (
      status
    ) {
      case 'PLANEJADA':
        return 'PLANEJADA';

      case 'EM_ANDAMENTO':
        return 'EM VIAGEM';

      case 'FINALIZADA':
        return 'FINALIZADA';

      case 'CANCELADA':
        return 'CANCELADA';

      default:
        return status;
    }
  }

  function descricaoClima(
    codigo:
      | number
      | null,
    isDay:
      | number
      | null
  ) {
    const dia =
      isDay ===
      1;

    if (
      codigo == null
    ) {
      return dia
        ? 'Condição do tempo'
        : 'Condição noturna';
    }

    if (
      codigo ===
      0
    ) {
      return dia
        ? 'Dia de céu limpo'
        : 'Noite de céu limpo';
    }

    if (
      codigo ===
        1 ||
      codigo ===
        2
    ) {
      return dia
        ? 'Parcialmente nublado'
        : 'Noite parcialmente nublada';
    }

    if (
      codigo ===
      3
    ) {
      return dia
        ? 'Dia nublado'
        : 'Noite nublada';
    }

    if (
      codigo ===
        45 ||
      codigo ===
        48
    ) {
      return dia
        ? 'Dia com neblina'
        : 'Noite com neblina';
    }

    if (
      codigo >=
        51 &&
      codigo <=
        57
    ) {
      return dia
        ? 'Dia com garoa'
        : 'Noite com garoa';
    }

    if (
      codigo >=
        61 &&
      codigo <=
        67
    ) {
      return dia
        ? 'Dia chuvoso'
        : 'Noite chuvosa';
    }

    if (
      codigo >=
        71 &&
      codigo <=
        77
    ) {
      return dia
        ? 'Dia com neve'
        : 'Noite com neve';
    }

    if (
      codigo >=
        80 &&
      codigo <=
        82
    ) {
      return dia
        ? 'Pancadas de chuva'
        : 'Noite com pancadas de chuva';
    }

    if (
      codigo >=
        85 &&
      codigo <=
        86
    ) {
      return dia
        ? 'Pancadas de neve'
        : 'Noite com neve';
    }

    if (
      codigo >=
      95
    ) {
      return dia
        ? 'Dia com tempestade'
        : 'Noite com tempestade';
    }

    return dia
      ? 'Condição do tempo'
      : 'Condição noturna';
  }

  function emojiClima(
    codigo:
      | number
      | null,
    isDay:
      | number
      | null
  ) {
    const dia =
      isDay ===
      1;

    if (
      codigo == null
    ) {
      return dia
        ? '🌤️'
        : '🌙';
    }

    if (
      codigo ===
      0
    ) {
      return dia
        ? '☀️'
        : '🌙';
    }

    if (
      codigo ===
        1 ||
      codigo ===
        2
    ) {
      return dia
        ? '🌤️'
        : '☁️';
    }

    if (
      codigo ===
      3
    ) {
      return '☁️';
    }

    if (
      codigo ===
        45 ||
      codigo ===
        48
    ) {
      return '🌫️';
    }

    if (
      codigo >=
        51 &&
      codigo <=
        67
    ) {
      return '🌧️';
    }

    if (
      codigo >=
        71 &&
      codigo <=
        77
    ) {
      return '❄️';
    }

    if (
      codigo >=
        80 &&
      codigo <=
        82
    ) {
      return dia
        ? '🌦️'
        : '🌧️';
    }

    if (
      codigo >=
        85 &&
      codigo <=
        86
    ) {
      return '🌨️';
    }

    if (
      codigo >=
      95
    ) {
      return '⛈️';
    }

    return dia
      ? '🌤️'
      : '🌙';
  }

  function tituloVazio() {
    if (
      filtro ===
      'proximas'
    ) {
      return 'Nenhuma viagem planejada';
    }

    if (
      filtro ===
      'andamento'
    ) {
      return 'Nenhuma viagem acontecendo agora';
    }

    return 'Nenhuma viagem anterior';
  }

  function descricaoVazio() {
    if (
      filtro ===
      'proximas'
    ) {
      return (
        'Quando você escolher seu próximo ' +
        'destino, ele aparecerá aqui.'
      );
    }

    if (
      filtro ===
      'andamento'
    ) {
      return (
        'Quando chegar a data da sua viagem, ' +
        'a maIA vai acompanhar você por aqui.'
      );
    }

    return (
      'Depois das suas viagens, ' +
      'suas experiências ficarão registradas aqui.'
    );
  }

  function renderAcaoDireita(
    viagem: Viagem
  ) {
    return (
      <Pressable
        style={
          styles.cancelAction
        }
        onPress={() =>
          confirmarCancelamento(
            viagem
          )
        }
        disabled={
          cancelandoId ===
          viagem.id
        }
      >
        {cancelandoId ===
        viagem.id ? (
          <ActivityIndicator
            size="small"
            color="#ffffff"
          />
        ) : (
          <>
            <Text
              style={
                styles.cancelIcon
              }
            >
              🗑️
            </Text>

            <Text
              style={
                styles.cancelText
              }
            >
              Desisti da
              viagem
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  function renderClima(
    item: Viagem
  ) {
    if (
      item.latitude ==
        null ||
      item.longitude ==
        null
    ) {
      return (
        <View
          style={
            styles.activeBox
          }
        >
          <Text
            style={
              styles.activeTitle
            }
          >
            Você está viajando ✨
          </Text>

          <Text
            style={
              styles.activeText
            }
          >
            Não foi possível localizar
            este destino para consultar
            o clima.
          </Text>
        </View>
      );
    }

    if (
      carregandoClima[
        item.id
      ]
    ) {
      return (
        <View
          style={
            styles.activeBox
          }
        >
          <Text
            style={
              styles.activeTitle
            }
          >
            Você está viajando ✨
          </Text>

          <View
            style={
              styles.weatherLoading
            }
          >
            <ActivityIndicator
              size="small"
              color="#6d28d9"
            />

            <Text
              style={
                styles.weatherLoadingText
              }
            >
              Buscando o clima do
              destino...
            </Text>
          </View>
        </View>
      );
    }

    const clima =
      climas[
        item.id
      ];

    if (
      !clima
    ) {
      return (
        <View
          style={
            styles.activeBox
          }
        >
          <Text
            style={
              styles.activeTitle
            }
          >
            Você está viajando ✨
          </Text>

          <Text
            style={
              styles.activeText
            }
          >
            Não foi possível obter as
            condições climáticas deste
            destino.
          </Text>

          <Pressable
            style={
              styles.retryWeatherButton
            }
            onPress={() =>
              carregarClima(
                item
              )
            }
          >
            <Text
              style={
                styles.retryWeatherText
              }
            >
              TENTAR NOVAMENTE
            </Text>
          </Pressable>
        </View>
      );
    }

    const tipo =
      obterTipoAmbiente(
        clima
      );

    const claro =
      textoClaro(
        tipo
      );

    return (
      <View
        style={[
          styles.weatherExperience,

          {
            backgroundColor:
              fundoAmbiente(
                tipo
              ),
          },
        ]}
      >
        <WeatherScene
          clima={
            clima
          }
        />

        <View
          style={
            styles.weatherContent
          }
        >
          <Text
            style={[
              styles.activeTitle,

              claro &&
                styles.lightText,
            ]}
          >
            Você está viajando ✨
          </Text>

          <Text
            style={[
              styles.weatherSectionTitle,

              claro &&
                styles.lightSoftText,
            ]}
          >
            CLIMA AGORA
          </Text>

          <View
            style={
              styles.weatherMain
            }
          >
            <Text
              style={
                styles.weatherEmoji
              }
            >
              {emojiClima(
                clima.codigoClima,
                clima.isDay
              )}
            </Text>

            <View
              style={
                styles.weatherMainInfo
              }
            >
              <Text
                style={[
                  styles.weatherTemperature,

                  claro &&
                    styles.lightText,
                ]}
              >
                {formatarNumero(
                  clima.temperatura
                )}
                °C
              </Text>

              <Text
                style={[
                  styles.weatherCondition,

                  claro &&
                    styles.lightText,
                ]}
              >
                {descricaoClima(
                  clima.codigoClima,
                  clima.isDay
                )}
              </Text>

              <Text
                style={[
                  styles.weatherFeels,

                  claro &&
                    styles.lightSoftText,
                ]}
              >
                Sensação de{' '}
                {formatarNumero(
                  clima.sensacaoTermica
                )}
                °C
              </Text>
            </View>
          </View>

          <View
            style={
              styles.weatherGrid
            }
          >
            <View
              style={[
                styles.weatherItem,

                claro &&
                  styles.weatherItemDark,
              ]}
            >
              <Text
                style={
                  styles.weatherIcon
                }
              >
                🌡️
              </Text>

              <Text
                style={[
                  styles.weatherLabel,

                  claro &&
                    styles.lightSoftText,
                ]}
              >
                MÍN / MÁX
              </Text>

              <Text
                style={[
                  styles.weatherValue,

                  claro &&
                    styles.lightText,
                ]}
              >
                {formatarNumero(
                  clima.temperaturaMinima
                )}
                ° /{' '}
                {formatarNumero(
                  clima.temperaturaMaxima
                )}
                °
              </Text>
            </View>

            <View
              style={[
                styles.weatherItem,

                claro &&
                  styles.weatherItemDark,
              ]}
            >
              <Text
                style={
                  styles.weatherIcon
                }
              >
                🌧️
              </Text>

              <Text
                style={[
                  styles.weatherLabel,

                  claro &&
                    styles.lightSoftText,
                ]}
              >
                CHUVA
              </Text>

              <Text
                style={[
                  styles.weatherValue,

                  claro &&
                    styles.lightText,
                ]}
              >
                {clima.probabilidadeChuva ??
                  '--'}
                %
              </Text>
            </View>

            <View
              style={[
                styles.weatherItem,

                claro &&
                  styles.weatherItemDark,
              ]}
            >
              <Text
                style={
                  styles.weatherIcon
                }
              >
                💨
              </Text>

              <Text
                style={[
                  styles.weatherLabel,

                  claro &&
                    styles.lightSoftText,
                ]}
              >
                VENTO
              </Text>

              <Text
                style={[
                  styles.weatherValue,

                  claro &&
                    styles.lightText,
                ]}
              >
                {formatarNumero(
                  clima.vento
                )}{' '}
                km/h
              </Text>
            </View>

            <View
              style={[
                styles.weatherItem,

                claro &&
                  styles.weatherItemDark,
              ]}
            >
              <Text
                style={
                  styles.weatherIcon
                }
              >
                🌬️
              </Text>

              <Text
                style={[
                  styles.weatherLabel,

                  claro &&
                    styles.lightSoftText,
                ]}
              >
                RAJADAS
              </Text>

              <Text
                style={[
                  styles.weatherValue,

                  claro &&
                    styles.lightText,
                ]}
              >
                {formatarNumero(
                  clima.rajadas
                )}{' '}
                km/h
              </Text>
            </View>
          </View>

          {clima.neve !=
            null &&
            clima.neve >
              0 && (
              <View
                style={
                  styles.snowBox
                }
              >
                <Text
                  style={
                    styles.snowTitle
                  }
                >
                  ❄️ Atenção à neve
                </Text>

                <Text
                  style={
                    styles.snowText
                  }
                >
                  Há ocorrência de neve
                  nas condições atuais
                  deste destino.
                </Text>
              </View>
            )}
        </View>
      </View>
    );
  }

  function renderMare(
    item: Viagem
  ) {
    if (
      item.latitude ==
        null ||
      item.longitude ==
        null
    ) {
      return null;
    }

    if (
      carregandoMare[
        item.id
      ]
    ) {
      return (
        <View
          style={
            styles.tideCard
          }
        >
          <View
            style={
              styles.tideLoading
            }
          >
            <ActivityIndicator
              size="small"
              color="#2563a8"
            />

            <Text
              style={
                styles.tideLoadingText
              }
            >
              Consultando a maré...
            </Text>
          </View>
        </View>
      );
    }

    const mare =
      mares[
        item.id
      ];

    if (
      !mare
    ) {
      return (
        <View
          style={
            styles.tideCard
          }
        >
          <View
            style={
              styles.tideHeader
            }
          >
            <Text
              style={
                styles.tideIcon
              }
            >
              🌊
            </Text>

            <View
              style={
                styles.tideHeaderText
              }
            >
              <Text
                style={
                  styles.tideEyebrow
                }
              >
                MARÉ
              </Text>

              <Text
                style={
                  styles.tideTitle
                }
              >
                Informação indisponível
              </Text>
            </View>
          </View>

          <Pressable
            style={
              styles.retryTideButton
            }
            onPress={() =>
              carregarMare(
                item
              )
            }
          >
            <Text
              style={
                styles.retryTideText
              }
            >
              TENTAR NOVAMENTE
            </Text>
          </Pressable>
        </View>
      );
    }

    const baixa =
      mare.proximaMareBaixa;

    const alta =
      mare.proximaMareAlta;

    const baixaDiurna =
      encontrarProximaMareBaixaDiurna(
        mare
      );

    const proximaBaixaEhNoturna =
      baixa !=
        null &&
      !ehHorarioDiurnoMare(
        baixa.dataHora
      );

    if (
      !baixa &&
      !alta
    ) {
      return null;
    }

    return (
      <View
        style={
          styles.tideCard
        }
      >
        <View
          style={
            styles.tideHeader
          }
        >
          <View
            style={
              styles.tideIconBox
            }
          >
            <Text
              style={
                styles.tideIcon
              }
            >
              🌊
            </Text>
          </View>

          <View
            style={
              styles.tideHeaderText
            }
          >
            <Text
              style={
                styles.tideEyebrow
              }
            >
              MARÉ
            </Text>

            <Text
              style={
                styles.tideTitle
              }
            >
              Próximos movimentos
              do mar
            </Text>

            <Text
              style={
                styles.tideSubtitle
              }
            >
              Horários locais do
              destino
            </Text>
          </View>
        </View>

        {baixaDiurna && (
          <View
            style={
              styles.smartTideBox
            }
          >
            <View
              style={
                styles.smartTideTop
              }
            >
              <Text
                style={
                  styles.smartTideSparkle
                }
              >
                ✨
              </Text>

              <View
                style={
                  styles.smartTideTextArea
                }
              >
                <Text
                  style={
                    styles.smartTideEyebrow
                  }
                >
                  MARÉ BAIXA DURANTE
                  O DIA
                </Text>

                <Text
                  style={
                    styles.smartTideTitle
                  }
                >
                  {proximaBaixaEhNoturna
                    ? 'Uma referência melhor para aproveitar a praia'
                    : 'A próxima baixa já acontece em horário diurno'}
                </Text>
              </View>
            </View>

            {proximaBaixaEhNoturna && (
              <Text
                style={
                  styles.smartTideDescription
                }
              >
                A próxima maré baixa
                acontece fora do
                horário diurno. Para
                planejar praia,
                recifes ou piscinas
                naturais, vale
                observar esta próxima
                baixa durante o dia.
              </Text>
            )}

            <View
              style={
                styles.smartTideHighlight
              }
            >
              <Text
                style={
                  styles.smartTideArrow
                }
              >
                ↓
              </Text>

              <View
                style={
                  styles.smartTideTimeArea
                }
              >
                <Text
                  style={
                    styles.smartTideTime
                  }
                >
                  {formatarHoraMare(
                    baixaDiurna.dataHora
                  )}
                </Text>

                <Text
                  style={
                    styles.smartTideDay
                  }
                >
                  {formatarDiaMare(
                    baixaDiurna.dataHora
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.smartTideHeightArea
                }
              >
                <Text
                  style={
                    styles.smartTideHeightLabel
                  }
                >
                  ALTURA
                </Text>

                <Text
                  style={
                    styles.smartTideHeight
                  }
                >
                  {formatarAlturaMare(
                    baixaDiurna.altura
                  )}
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.smartTideTip
              }
            >
              Confira novamente o
              clima e as condições
              locais perto desse
              horário antes de sair.
            </Text>
          </View>
        )}

        <View
          style={
            styles.tideGrid
          }
        >
          {baixa && (
            <View
              style={
                styles.tideItem
              }
            >
              <View
                style={
                  styles.tideTypeRow
                }
              >
                <Text
                  style={
                    styles.tideArrowDown
                  }
                >
                  ↓
                </Text>

                <Text
                  style={
                    styles.tideType
                  }
                >
                  MARÉ BAIXA
                </Text>
              </View>

              <Text
                style={
                  styles.tideDate
                }
              >
                {formatarDataHoraMare(
                  baixa.dataHora
                )}
              </Text>

              <Text
                style={
                  styles.tideHeight
                }
              >
                {formatarAlturaMare(
                  baixa.altura
                )}
              </Text>
            </View>
          )}

          {alta && (
            <View
              style={
                styles.tideItem
              }
            >
              <View
                style={
                  styles.tideTypeRow
                }
              >
                <Text
                  style={
                    styles.tideArrowUp
                  }
                >
                  ↑
                </Text>

                <Text
                  style={
                    styles.tideType
                  }
                >
                  MARÉ ALTA
                </Text>
              </View>

              <Text
                style={
                  styles.tideDate
                }
              >
                {formatarDataHoraMare(
                  alta.dataHora
                )}
              </Text>

              <Text
                style={
                  styles.tideHeight
                }
              >
                {formatarAlturaMare(
                  alta.altura
                )}
              </Text>
            </View>
          )}
        </View>

        <View
          style={
            styles.tideInfoBox
          }
        >
          <Text
            style={
              styles.tideInfoText
            }
          >
            A maré pode influenciar
            bastante a experiência
            em praias, piscinas
            naturais e recifes.
            Use os horários como
            referência turística.
          </Text>
        </View>
      </View>
    );
  }

  function renderCard(
    item: Viagem
  ) {
    return (
      <View
        style={
          styles.tripCard
        }
      >
        <View
          style={
            styles.tripTop
          }
        >
          <View
            style={
              styles.tripIcon
            }
          >
            <Text
              style={
                styles.tripIconText
              }
            >
              ✈
            </Text>
          </View>

          <View
            style={
              styles.tripMain
            }
          >
            <Text
              style={
                styles.tripDestination
              }
            >
              {
                item.destino
              }
            </Text>

            <Text
              style={
                styles.tripLocation
              }
            >
              {localizacao(
                item
              )}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,

              item.status ===
                'EM_ANDAMENTO' &&
                styles.statusActive,

              item.status ===
                'FINALIZADA' &&
                styles.statusFinished,

              item.status ===
                'CANCELADA' &&
                styles.statusCancelled,
            ]}
          >
            <Text
              style={[
                styles.statusText,

                item.status ===
                  'EM_ANDAMENTO' &&
                  styles.statusActiveText,

                item.status ===
                  'FINALIZADA' &&
                  styles.statusFinishedText,

                item.status ===
                  'CANCELADA' &&
                  styles.statusCancelledText,
              ]}
            >
              {textoStatus(
                item.status
              )}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.divider
          }
        />

        <Text
          style={
            styles.dateLabel
          }
        >
          PERÍODO
        </Text>

        <Text
          style={
            styles.dateText
          }
        >
          {formatarData(
            item.dataInicio
          )}
          {'  →  '}
          {formatarData(
            item.dataFim
          )}
        </Text>

        {item.status ===
          'PLANEJADA' && (
          <Text
            style={
              styles.swipeHint
            }
          >
            Deslize para a esquerda
            para desistir da viagem
          </Text>
        )}

        {item.status ===
          'EM_ANDAMENTO' &&
          renderClima(
            item
          )}

        {item.status ===
          'EM_ANDAMENTO' &&
          renderMare(
            item
          )}
      </View>
    );
  }

  if (
    carregando
  ) {
    return (
      <View
        style={
          styles.center
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
          Buscando suas viagens...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={
        styles.gestureRoot
      }
    >
      <View
        style={[
          styles.container,

          filtro ===
            'andamento' &&
            ambienteAtivo && {
              backgroundColor:
                fundoAmbiente(
                  ambienteAtivo
                ),
            },
        ]}
      >
        <View
          style={
            styles.header
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
                styles.backText
              }
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={
              styles.headerMain
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              EU VOU!
            </Text>

            <Text
              style={[
                styles.title,

                filtro ===
                  'andamento' &&
                  ambienteAtivo &&
                  textoClaro(
                    ambienteAtivo
                  ) &&
                  styles.lightText,
              ]}
            >
              Minhas viagens
            </Text>

            <Text
              style={[
                styles.subtitle,

                filtro ===
                  'andamento' &&
                  ambienteAtivo &&
                  textoClaro(
                    ambienteAtivo
                  ) &&
                  styles.lightSoftText,
              ]}
            >
              Acompanhe o que vem
              por aí, sua viagem
              atual e os lugares
              que já fizeram parte
              da sua história.
            </Text>
          </View>
        </View>

        <Pressable
          style={
            styles.planButton
          }
          onPress={() =>
            router.push(
              '/(tabs)/planejamento'
            )
          }
        >
          <Text
            style={
              styles.planButtonIcon
            }
          >
            +
          </Text>

          <Text
            style={
              styles.planButtonText
            }
          >
            PLANEJAR NOVA VIAGEM
          </Text>
        </Pressable>

        <View
          style={
            styles.tabs
          }
        >
          <Pressable
            style={[
              styles.tab,

              filtro ===
                'proximas' &&
                styles.tabActive,
            ]}
            onPress={() =>
              setFiltro(
                'proximas'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                filtro ===
                  'proximas' &&
                  styles.tabTextActive,
              ]}
            >
              Próximas
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,

              filtro ===
                'andamento' &&
                styles.tabActive,
            ]}
            onPress={() =>
              setFiltro(
                'andamento'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                filtro ===
                  'andamento' &&
                  styles.tabTextActive,
              ]}
            >
              Agora
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,

              filtro ===
                'anteriores' &&
                styles.tabActive,
            ]}
            onPress={() =>
              setFiltro(
                'anteriores'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                filtro ===
                  'anteriores' &&
                  styles.tabTextActive,
              ]}
            >
              Anteriores
            </Text>
          </Pressable>
        </View>

        {erro ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {
                erro
              }
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={
                carregarViagens
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={
              viagensFiltradas
            }
            keyExtractor={(
              item
            ) =>
              String(
                item.id
              )
            }
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  atualizando
                }
                onRefresh={
                  atualizar
                }
              />
            }
            contentContainerStyle={
              viagensFiltradas.length ===
              0
                ? styles.emptyList
                : styles.list
            }
            ListEmptyComponent={
              <View
                style={
                  styles.emptyContainer
                }
              >
                <Text
                  style={
                    styles.emptyEmoji
                  }
                >
                  ✈️
                </Text>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {
                    tituloVazio()
                  }
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {
                    descricaoVazio()
                  }
                </Text>
              </View>
            }
            renderItem={({
              item,
            }) =>
              item.status ===
              'PLANEJADA' ? (
                <View
                  style={
                    styles.swipeContainer
                  }
                >
                  <Swipeable
                    renderRightActions={() =>
                      renderAcaoDireita(
                        item
                      )
                    }
                    overshootRight={
                      false
                    }
                    friction={
                      2
                    }
                    rightThreshold={
                      40
                    }
                  >
                    {renderCard(
                      item
                    )}
                  </Swipeable>
                </View>
              ) : (
                renderCard(
                  item
                )
              )
            }
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles =
  StyleSheet.create({
    gestureRoot: {
      flex: 1,
    },

    container: {
      flex: 1,
      backgroundColor:
        '#f7f7fb',
      paddingTop: 56,
      paddingHorizontal: 20,
    },

    center: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      backgroundColor:
        '#f7f7fb',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#777777',
    },

    header: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      marginBottom: 20,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e5e5ec',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    backText: {
      fontSize: 32,
      lineHeight: 34,
      color: '#6d28d9',
      marginTop: -3,
    },

    headerMain: {
      flex: 1,
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: '#6d28d9',
      marginBottom: 5,
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 7,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: '#666666',
    },

    lightText: {
      color: '#ffffff',
    },

    lightSoftText: {
      color:
        'rgba(255,255,255,0.78)',
    },

    planButton: {
      minHeight: 52,
      borderRadius: 15,
      backgroundColor:
        '#6d28d9',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom: 18,
      paddingHorizontal: 14,
    },

    planButtonIcon: {
      color: '#ffffff',
      fontSize: 22,
      fontWeight: '600',
      marginRight: 7,
      marginTop: -2,
    },

    planButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },

    tabs: {
      flexDirection:
        'row',
      backgroundColor:
        'rgba(236,236,242,0.94)',
      padding: 4,
      borderRadius: 14,
      marginBottom: 18,
    },

    tab: {
      flex: 1,
      minHeight: 42,
      borderRadius: 11,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    tabActive: {
      backgroundColor:
        '#ffffff',
    },

    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#777777',
    },

    tabTextActive: {
      color: '#6d28d9',
    },

    list: {
      paddingBottom: 60,
    },

    emptyList: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal: 30,
      paddingBottom: 70,
    },

    emptyEmoji: {
      fontSize: 42,
      marginBottom: 13,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#222222',
      textAlign:
        'center',
      marginBottom: 7,
    },

    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#777777',
      textAlign:
        'center',
    },

    errorBox: {
      alignItems:
        'center',
      paddingTop: 35,
    },

    errorText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#555555',
      textAlign:
        'center',
      marginBottom: 15,
    },

    retryButton: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor:
        '#6d28d9',
      borderRadius: 12,
    },

    retryText: {
      color: '#ffffff',
      fontWeight: '700',
    },

    swipeContainer: {
      marginBottom: 14,
      borderRadius: 19,
      overflow:
        'hidden',
    },

    cancelAction: {
      width: 118,
      backgroundColor:
        '#b42318',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 10,
    },

    cancelIcon: {
      fontSize: 22,
      marginBottom: 5,
    },

    cancelText: {
      color: '#ffffff',
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '800',
      textAlign:
        'center',
    },

    tripCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 19,
      padding: 17,
      borderWidth: 1,
      borderColor:
        '#e5e5ec',
      marginBottom: 14,
      overflow:
        'hidden',
    },

    tripTop: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    tripIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor:
        '#f1ebff',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 11,
    },

    tripIconText: {
      fontSize: 20,
      color: '#6d28d9',
    },

    tripMain: {
      flex: 1,
      marginRight: 7,
    },

    tripDestination: {
      fontSize: 18,
      fontWeight: '800',
      color: '#222222',
    },

    tripLocation: {
      fontSize: 12,
      lineHeight: 17,
      color: '#777777',
      marginTop: 3,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor:
        '#f1ebff',
    },

    statusText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#6d28d9',
    },

    statusActive: {
      backgroundColor:
        '#e9f8ef',
    },

    statusActiveText: {
      color: '#247747',
    },

    statusFinished: {
      backgroundColor:
        '#eeeeee',
    },

    statusFinishedText: {
      color: '#666666',
    },

    statusCancelled: {
      backgroundColor:
        '#fbecec',
    },

    statusCancelledText: {
      color: '#9a3d3d',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#eeeef3',
      marginVertical: 14,
    },

    dateLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: '#999999',
      marginBottom: 4,
    },

    dateText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#444444',
    },

    swipeHint: {
      fontSize: 10,
      color: '#aaaaaa',
      marginTop: 12,
      fontStyle:
        'italic',
    },

    activeBox: {
      marginTop: 15,
      backgroundColor:
        '#f7f3ff',
      borderRadius: 15,
      padding: 14,
    },

    activeTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#6d28d9',
      marginBottom: 4,
    },

    activeText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#555555',
      marginTop: 7,
    },

    weatherExperience: {
      marginTop: 15,
      borderRadius: 20,
      minHeight: 310,
      overflow:
        'hidden',
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.35)',
    },

    weatherContent: {
      position:
        'relative',
      zIndex: 10,
      padding: 16,
    },

    weatherSectionTitle: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: '#777777',
      marginTop: 14,
      marginBottom: 2,
    },

    weatherLoading: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 12,
      gap: 8,
    },

    weatherLoadingText: {
      fontSize: 12,
      color: '#666666',
    },

    weatherMain: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 10,
      marginBottom: 18,
    },

    weatherMainInfo: {
      flex: 1,
    },

    weatherEmoji: {
      fontSize: 47,
      marginRight: 14,
    },

    weatherTemperature: {
      fontSize: 34,
      fontWeight: '900',
      color: '#222222',
    },

    weatherCondition: {
      fontSize: 13,
      fontWeight: '700',
      color: '#555555',
      marginTop: 1,
    },

    weatherFeels: {
      fontSize: 11,
      color: '#777777',
      marginTop: 3,
    },

    weatherGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 8,
    },

    weatherItem: {
      width: '48%',
      backgroundColor:
        'rgba(255,255,255,0.78)',
      borderRadius: 12,
      padding: 11,
      borderWidth: 1,
      borderColor:
        'rgba(255,255,255,0.45)',
    },

    weatherItemDark: {
      backgroundColor:
        'rgba(255,255,255,0.10)',
      borderColor:
        'rgba(255,255,255,0.13)',
    },

    weatherIcon: {
      fontSize: 18,
      marginBottom: 5,
    },

    weatherLabel: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: '#888888',
      marginBottom: 3,
    },

    weatherValue: {
      fontSize: 14,
      fontWeight: '800',
      color: '#333333',
    },

    retryWeatherButton: {
      alignSelf:
        'flex-start',
      marginTop: 12,
      backgroundColor:
        '#6d28d9',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
    },

    retryWeatherText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
    },

    snowBox: {
      backgroundColor:
        'rgba(238,246,255,0.90)',
      borderRadius: 11,
      padding: 11,
      marginTop: 10,
    },

    snowTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#355a7a',
      marginBottom: 3,
    },

    snowText: {
      fontSize: 11,
      lineHeight: 17,
      color: '#55728a',
    },

    tideCard: {
      marginTop: 12,
      backgroundColor:
        '#eef7ff',
      borderRadius: 18,
      padding: 15,
      borderWidth: 1,
      borderColor:
        '#d6e9f8',
    },

    tideHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 14,
    },

    tideIconBox: {
      width: 45,
      height: 45,
      borderRadius: 14,
      backgroundColor:
        '#dcedfb',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    tideIcon: {
      fontSize: 22,
    },

    tideHeaderText: {
      flex: 1,
    },

    tideEyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: '#2563a8',
      marginBottom: 2,
    },

    tideTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#20354a',
    },

    tideSubtitle: {
      fontSize: 10,
      color: '#6d8092',
      marginTop: 2,
    },

    smartTideBox: {
      backgroundColor:
        '#dff2ff',
      borderRadius: 14,
      padding: 13,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        '#b9def4',
    },

    smartTideTop: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    smartTideSparkle: {
      fontSize: 18,
      marginRight: 8,
      marginTop: 1,
    },

    smartTideTextArea: {
      flex: 1,
    },

    smartTideEyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
      color: '#1d6f9f',
      marginBottom: 3,
    },

    smartTideTitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
      color: '#21475f',
    },

    smartTideDescription: {
      fontSize: 11,
      lineHeight: 17,
      color: '#55768b',
      marginTop: 9,
    },

    smartTideHighlight: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ffffff',
      borderRadius: 12,
      padding: 11,
      marginTop: 11,
    },

    smartTideArrow: {
      fontSize: 28,
      fontWeight: '900',
      color: '#2574a9',
      marginRight: 9,
    },

    smartTideTimeArea: {
      flex: 1,
    },

    smartTideTime: {
      fontSize: 22,
      fontWeight: '900',
      color: '#174f73',
    },

    smartTideDay: {
      fontSize: 10,
      fontWeight: '700',
      color: '#668497',
      marginTop: 1,
    },

    smartTideHeightArea: {
      alignItems:
        'flex-end',
      marginLeft: 10,
    },

    smartTideHeightLabel: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.5,
      color: '#7891a1',
      marginBottom: 2,
    },

    smartTideHeight: {
      fontSize: 16,
      fontWeight: '900',
      color: '#1f5f8b',
    },

    smartTideTip: {
      fontSize: 10,
      lineHeight: 15,
      color: '#617b8c',
      marginTop: 9,
    },

    tideGrid: {
      flexDirection:
        'row',
      gap: 8,
    },

    tideItem: {
      flex: 1,
      backgroundColor:
        '#ffffff',
      borderRadius: 13,
      padding: 12,
      borderWidth: 1,
      borderColor:
        '#dcecf8',
    },

    tideTypeRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 7,
    },

    tideArrowDown: {
      fontSize: 18,
      fontWeight: '900',
      color: '#2574a9',
      marginRight: 5,
    },

    tideArrowUp: {
      fontSize: 18,
      fontWeight: '900',
      color: '#176b87',
      marginRight: 5,
    },

    tideType: {
      fontSize: 9,
      fontWeight: '900',
      color: '#617588',
      letterSpacing: 0.35,
    },

    tideDate: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
      color: '#30495e',
      marginBottom: 4,
    },

    tideHeight: {
      fontSize: 18,
      fontWeight: '900',
      color: '#1f5f8b',
    },

    tideInfoBox: {
      marginTop: 10,
      backgroundColor:
        'rgba(255,255,255,0.65)',
      borderRadius: 11,
      padding: 10,
    },

    tideInfoText: {
      fontSize: 10,
      lineHeight: 16,
      color: '#607385',
    },

    tideLoading: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 8,
    },

    tideLoadingText: {
      fontSize: 12,
      color: '#506d84',
    },

    retryTideButton: {
      alignSelf:
        'flex-start',
      marginTop: 2,
      backgroundColor:
        '#2563a8',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
    },

    retryTideText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
    },

    sceneSun: {
      position:
        'absolute',
      right: 16,
      top: 12,
      fontSize: 72,
      opacity: 0.45,
    },

    sceneMoon: {
      position:
        'absolute',
      right: 20,
      top: 16,
      fontSize: 58,
      opacity: 0.6,
    },

    starsLayer: {
      ...StyleSheet.absoluteFillObject,
    },

    starOne: {
      position:
        'absolute',
      left: 24,
      top: 20,
      color: '#ffffff',
      fontSize: 15,
    },

    starTwo: {
      position:
        'absolute',
      left: 105,
      top: 48,
      color: '#ffffff',
      fontSize: 11,
    },

    starThree: {
      position:
        'absolute',
      right: 90,
      top: 85,
      color: '#ffffff',
      fontSize: 13,
    },

    starFour: {
      position:
        'absolute',
      left: 175,
      top: 18,
      color: '#ffffff',
      fontSize: 24,
    },

    cloudLayer: {
      ...StyleSheet.absoluteFillObject,
    },

    cloudOne: {
      position:
        'absolute',
      right: 14,
      top: 12,
      fontSize: 65,
      opacity: 0.42,
    },

    cloudTwo: {
      position:
        'absolute',
      right: 86,
      top: 55,
      fontSize: 45,
      opacity: 0.25,
    },

    rainLayer: {
      ...StyleSheet.absoluteFillObject,
    },

    rainDrop: {
      position:
        'absolute',
      color:
        'rgba(110,170,220,0.55)',
      fontSize: 18,
      fontWeight: '300',
    },

    snowLayer: {
      ...StyleSheet.absoluteFillObject,
    },

    snowFlake: {
      position:
        'absolute',
      color: '#ffffff',
      fontSize: 14,
      opacity: 0.78,
    },
  });