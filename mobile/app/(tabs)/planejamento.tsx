import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type RitmoDestino =
  | 'AGITADO'
  | 'EQUILIBRADO'
  | 'TRANQUILO';

type Mobilidade =
  | 'A_PE'
  | 'TRANSPORTE_PUBLICO'
  | 'APLICATIVOS'
  | 'TANTO_FAZ';

type Interesse =
  | 'AVENTURA'
  | 'VIDA_NOTURNA'
  | 'GASTRONOMIA'
  | 'NATUREZA'
  | 'CULTURA'
  | 'DESCANSO';

type Prioridade =
  | 'SEGURANCA'
  | 'AGUAS_CALMAS'
  | 'VENTOS'
  | 'CALOR'
  | 'FRIO'
  | 'FACIL_LOCOMOCAO'
  | 'VIDA_NOTURNA'
  | 'ESTRUTURA_TURISTICA'
  | 'CONHECER_PESSOAS';

type Indispensavel =
  | 'SEGURANCA'
  | 'AGUAS_CALMAS'
  | 'AGUAS_QUENTES'
  | 'PRAIA'
  | 'FACIL_LOCOMOCAO'
  | 'RESTAURANTES_PROXIMOS'
  | 'GASTRONOMIA_LOCAL'
  | 'ESTRUTURA_TURISTICA'
  | 'VIDA_NOTURNA'
  | 'PASSEIOS'
  | 'NATUREZA'
  | 'CALOR'
  | 'FRIO'
  | 'MONTANHAS'
  | 'TRILHAS'
  | 'NEVE'
  | 'CACHOEIRAS'
  | 'CAMPO_INTERIOR'
  | 'HISTORIA_ARQUITETURA';

const ROTULOS_INDISPENSAVEIS: Record<Indispensavel, string> = {
  SEGURANCA: 'Segurança',
  AGUAS_CALMAS: 'Águas calmas',
  AGUAS_QUENTES: 'Água do mar quente / morna',
  PRAIA: 'Praia',
  FACIL_LOCOMOCAO: 'Fácil locomoção',
  RESTAURANTES_PROXIMOS: 'Restaurantes próximos',
  GASTRONOMIA_LOCAL: 'Gastronomia local',
  ESTRUTURA_TURISTICA: 'Estrutura turística',
  VIDA_NOTURNA: 'Vida noturna',
  PASSEIOS: 'Passeios',
  NATUREZA: 'Natureza',
  CALOR: 'Calor',
  FRIO: 'Frio',
  MONTANHAS: 'Montanhas',
  TRILHAS: 'Trilhas',
  NEVE: 'Neve',
  CACHOEIRAS: 'Cachoeiras',
  CAMPO_INTERIOR: 'Campo / interior',
  HISTORIA_ARQUITETURA: 'História e arquitetura',
};

type DestinoRecomendado = {
  cidade: string;
  estadoOuRegiao: string;
  pais: string;
  resumo: string;
  porQueCombina: string;
  compatibilidade: number;
  seguranca: string;
  mobilidade: string;
  clima: string;
  melhorRegiaoParaFicar: string;
  caracteristicasRelevantes: string[];
  pontosPositivos: string[];
  pontosDeAtencao: string[];
};

export default function PlanejamentoScreen() {
  const [modoPlanejamento, setModoPlanejamento] =
    useState<'ESCOLHA' | 'MAIA'>('ESCOLHA');

  const [periodo, setPeriodo] =
    useState('');

  const [dataIda, setDataIda] =
    useState<Date | null>(null);

  const [dataVolta, setDataVolta] =
    useState<Date | null>(null);

  const [mesCalendario, setMesCalendario] =
    useState(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );

  const [calendarioVisivel, setCalendarioVisivel] =
    useState(false);

  const [orcamentoValor, setOrcamentoValor] =
    useState(0);

  const [larguraSlider, setLarguraSlider] =
    useState(1);

  const [
    ritmoDestino,
    setRitmoDestino,
  ] = useState<RitmoDestino | null>(
    null
  );

  const [
    mobilidade,
    setMobilidade,
  ] = useState<Mobilidade | null>(
    null
  );

  const [
    interesses,
    setInteresses,
  ] = useState<Interesse[]>([]);

  const [
    indispensaveis,
    setIndispensaveis,
  ] = useState<Indispensavel[]>([]);

  const [
    requisitosIndispensaveis,
    setRequisitosIndispensaveis,
  ] = useState('');

  const [
    carregando,
    setCarregando,
  ] = useState(false);

  const [
    destinosRecomendados,
    setDestinosRecomendados,
  ] = useState<DestinoRecomendado[]>([]);

  function alternarInteresse(
    interesse: Interesse
  ) {
    if (
      interesses.includes(
        interesse
      )
    ) {
      setInteresses(
        interesses.filter(
          (item) =>
            item !== interesse
        )
      );
    } else {
      setInteresses([
        ...interesses,
        interesse,
      ]);
    }
  }

  function alternarIndispensavel(
    item: Indispensavel
  ) {
    if (
      indispensaveis.includes(
        item
      )
    ) {
      setIndispensaveis(
        indispensaveis.filter(
          (valor) =>
            valor !== item
        )
      );

      return;
    }

    if (
      indispensaveis.length >= 4
    ) {
      Alert.alert(
        'Limite de itens essenciais',
        'Escolha no máximo 4 itens essenciais.'
      );

      return;
    }

    setIndispensaveis([
      ...indispensaveis,
      item,
    ]);
  }

  const MESES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  function formatarData(
    data: Date
  ) {
    return `${String(
      data.getDate()
    ).padStart(
      2,
      '0'
    )}/${String(
      data.getMonth() + 1
    ).padStart(
      2,
      '0'
    )}/${data.getFullYear()}`;
  }

  function mesmaData(
    primeira: Date | null,
    segunda: Date
  ) {
    return (
      primeira?.getFullYear() ===
        segunda.getFullYear() &&
      primeira?.getMonth() ===
        segunda.getMonth() &&
      primeira?.getDate() ===
        segunda.getDate()
    );
  }

  function inicioDoDia(
    data: Date
  ) {
    return new Date(
      data.getFullYear(),
      data.getMonth(),
      data.getDate()
    ).getTime();
  }

  function atualizarPeriodo(
    ida: Date | null,
    volta: Date | null
  ) {
    if (
      !ida ||
      !volta
    ) {
      setPeriodo('');
      return;
    }

    setPeriodo(
      `${formatarData(
        ida
      )} a ${formatarData(
        volta
      )}`
    );
  }

  function selecionarData(
    dia: number
  ) {
    const data =
      new Date(
        mesCalendario.getFullYear(),
        mesCalendario.getMonth(),
        dia
      );

    if (
      !dataIda ||
      dataVolta
    ) {
      setDataIda(
        data
      );

      setDataVolta(
        null
      );

      setPeriodo('');

      return;
    }

    if (
      inicioDoDia(
        data
      ) <
      inicioDoDia(
        dataIda
      )
    ) {
      setDataIda(
        data
      );

      setDataVolta(
        null
      );

      setPeriodo('');

      return;
    }

    setDataVolta(
      data
    );

    atualizarPeriodo(
      dataIda,
      data
    );
  }

  function alterarMes(
    quantidade: number
  ) {
    setMesCalendario(
      new Date(
        mesCalendario.getFullYear(),
        mesCalendario.getMonth() +
          quantidade,
        1
      )
    );
  }

  function diasDoCalendario() {
    const ano =
      mesCalendario.getFullYear();

    const mes =
      mesCalendario.getMonth();

    const primeiroDia =
      new Date(
        ano,
        mes,
        1
      ).getDay();

    const totalDias =
      new Date(
        ano,
        mes + 1,
        0
      ).getDate();

    const celulas:
      Array<number | null> =
      [];

    for (
      let i = 0;
      i < primeiroDia;
      i += 1
    ) {
      celulas.push(
        null
      );
    }

    for (
      let dia = 1;
      dia <= totalDias;
      dia += 1
    ) {
      celulas.push(
        dia
      );
    }

    while (
      celulas.length % 7 !==
      0
    ) {
      celulas.push(
        null
      );
    }

    return celulas;
  }

  function atualizarOrcamentoPelaPosicao(
    posicaoX: number
  ) {
    const minimo = 0;
    const maximo = 20000;
    const passo = 250;

    const proporcao =
      Math.max(
        0,
        Math.min(
          1,
          posicaoX /
            larguraSlider
        )
      );

    const bruto =
      minimo +
      proporcao *
        (
          maximo -
          minimo
        );

    const valor =
      Math.round(
        bruto /
          passo
      ) *
      passo;

    setOrcamentoValor(
      Math.max(
        minimo,
        Math.min(
          maximo,
          valor
        )
      )
    );
  }

  function formatarMoeda(
    valor: number
  ) {
    return `R$ ${valor.toLocaleString(
      'pt-BR'
    )}`;
  }

  function botaoOpcao(
    selecionado: boolean,
    texto: string,
    onPress: () => void
  ) {
    return (
      <Pressable
        key={texto}
        style={[
          styles.optionButton,
          selecionado &&
            styles.optionButtonSelected,
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.optionText,
            selecionado &&
              styles.optionTextSelected,
          ]}
        >
          {texto}
        </Text>
      </Pressable>
    );
  }

  async function planejar() {
    if (
      !dataIda ||
      !dataVolta ||
      !periodo.trim()
    ) {
      Alert.alert(
        'Falta o período da viagem',
        'Selecione a data de ida e a data de volta.'
      );

      return;
    }

    if (
      interesses.length === 0
    ) {
      Alert.alert(
        'Falta uma informação',
        'Escolha pelo menos um interesse.'
      );

      return;
    }

    if (
      indispensaveis.length < 3
    ) {
      Alert.alert(
        'Faltam itens essenciais',
        'Escolha entre 3 e 4 itens que são mais importantes e não podem faltar.'
      );

      return;
    }

    try {
      setCarregando(
        true
      );

      setDestinosRecomendados(
        []
      );

      const usuario =
        await buscarUsuario();

      if (
        !usuario?.id
      ) {
        Alert.alert(
          'Sessão inválida',
          'Não foi possível identificar a usuária logada.'
        );

        return;
      }

      const planejamento = {
        usuarioId:
          usuario.id,

        origem:
          'NAO_APLICAVEL',

        destino:
          'AINDA_NAO_SEI',

        periodo:
          periodo.trim(),

        orcamento:
          formatarMoeda(
            orcamentoValor
          ),

        ritmoDestino,

        mobilidade,

        interesses,

        prioridades:
          [] as Prioridade[],

        requisitosSelecionados:
          indispensaveis.map(
            (
              item
            ) =>
              ROTULOS_INDISPENSAVEIS[
                item
              ]
          ),

        requisitosIndispensaveis:
          [
            ...indispensaveis.map(
              (
                item
              ) =>
                ROTULOS_INDISPENSAVEIS[
                  item
                ]
            ),

            requisitosIndispensaveis.trim(),
          ]
            .filter(
              Boolean
            )
            .join(
              '; '
            ),

        observacoes:
          '',
      };

      console.log(
        'Enviando planejamento:',
        planejamento
      );

      const response =
        await fetch(
          `${API_URL}/planejamentos`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                planejamento
              ),
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

      const resposta =
        await response.json();

      console.log(
        'Resposta do planejamento:',
        resposta
      );

      const destinos =
        resposta?.destinos;

      if (
        !Array.isArray(
          destinos
        ) ||
        destinos.length ===
          0
      ) {
        throw new Error(
          'A maIA não retornou destinos.'
        );
      }

      const destinosOrdenados =
        [
          ...destinos,
        ].sort(
          (
            a: DestinoRecomendado,
            b: DestinoRecomendado
          ) =>
            Number(
              b.compatibilidade ??
                0
            ) -
            Number(
              a.compatibilidade ??
                0
            )
        );

      setDestinosRecomendados(
        destinosOrdenados
      );
    } catch (
      error
    ) {
      console.error(
        'Erro ao enviar planejamento:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível gerar suas recomendações.'
      );
    } finally {
      setCarregando(
        false
      );
    }
  }

  if (
    modoPlanejamento ===
    'ESCOLHA'
  ) {
    return (
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
        <Text
          style={
            styles.eyebrow
          }
        >
          EU VOU!
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Como você quer planejar
          sua próxima viagem?
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Se você já sabe para onde vai,
          pode cadastrar sua viagem
          diretamente. Se ainda está
          escolhendo, a maIA pode ajudar
          a encontrar um destino.
        </Text>

        <Pressable
          style={
            styles.myTripsCard
          }
          onPress={() =>
            router.push({
              pathname: '/confirmar-viagem',
              params: {
                modo: 'direto',
              },
            })
          }
        >
          <View
            style={
              styles.myTripsContent
            }
          >
            <Text
              style={
                styles.myTripsTitle
              }
            >
              JÁ SEI PARA ONDE VOU
            </Text>

            <Text
              style={
                styles.myTripsText
              }
            >
              Informe seu destino e as datas
              para cadastrar a viagem
              diretamente.
            </Text>
          </View>

          <Text
            style={
              styles.myTripsArrow
            }
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.myTripsCard
          }
          onPress={() =>
            setModoPlanejamento(
              'MAIA'
            )
          }
        >
          <View
            style={
              styles.myTripsContent
            }
          >
            <Text
              style={
                styles.myTripsTitle
              }
            >
              QUERO AJUDA DA maIA
            </Text>

            <Text
              style={
                styles.myTripsText
              }
            >
              Responda ao questionário para
              receber recomendações de destinos
              de acordo com suas preferências.
            </Text>
          </View>

          <Text
            style={
              styles.myTripsArrow
            }
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.myTripsCard
          }
          onPress={() =>
            router.push(
              '/(tabs)/viagens'
            )
          }
        >
          <View
            style={
              styles.myTripsContent
            }
          >
            <Text
              style={
                styles.myTripsTitle
              }
            >
              MINHAS VIAGENS
            </Text>

            <Text
              style={
                styles.myTripsText
              }
            >
              Veja suas próximas viagens,
              acompanhe a viagem atual e
              relembre os lugares onde já esteve.
            </Text>
          </View>

          <Text
            style={
              styles.myTripsArrow
            }
          >
            ›
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={
        styles.keyboardView
      }
      behavior={
        Platform.OS ===
        'ios'
          ? 'padding'
          : 'height'
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
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={
            styles.eyebrow
          }
        >
          EU VOU!
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Vamos encontrar sua
          próxima viagem?
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Conte o que você
          procura para viajar
          sozinha. A maIA vai
          usar essas preferências
          para encontrar destinos
          que façam sentido para
          você.
        </Text>

        <Pressable
          onPress={() =>
            setModoPlanejamento(
              'ESCOLHA'
            )
          }
          style={{
            alignSelf:
              'flex-start',
            marginBottom:
              18,
            paddingVertical:
              4,
          }}
        >
          <Text
            style={{
              color:
                '#6d28d9',
              fontSize:
                12,
              fontWeight:
                '800',
              letterSpacing:
                0.4,
            }}
          >
            ‹ VOLTAR PARA AS OPÇÕES
          </Text>
        </Pressable>

        {/* MINHAS VIAGENS */}

        <Pressable
          style={
            styles.myTripsCard
          }
          onPress={() =>
            router.push(
              '/(tabs)/viagens'
            )
          }
        >
          <View
            style={
              styles.myTripsIcon
            }
          >
            <Text
              style={
                styles.myTripsIconText
              }
            >
              ›
            </Text>
          </View>

          <View
            style={
              styles.myTripsContent
            }
          >
            <Text
              style={
                styles.myTripsTitle
              }
            >
              MINHAS VIAGENS
            </Text>

            <Text
              style={
                styles.myTripsText
              }
            >
              Veja suas próximas
              viagens, acompanhe a
              viagem atual e
              relembre os lugares
              onde já esteve.
            </Text>
          </View>

          <Text
            style={
              styles.myTripsArrow
            }
          >
            ›
          </Text>
        </Pressable>

        {/* PERÍODO */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Quando será a viagem?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Selecione primeiro a ida e depois a volta.
          </Text>

          <View
            style={
              styles.dateRangeRow
            }
          >
            <Pressable
              style={[
                styles.dateRangeCard,
                dataIda &&
                  styles.dateRangeCardFilled,
              ]}
              onPress={() =>
                setCalendarioVisivel(
                  true
                )
              }
            >
              <Text
                style={
                  styles.dateRangeLabel
                }
              >
                IDA
              </Text>

              <Text
                style={[
                  styles.dateRangeValue,
                  !dataIda &&
                    styles.inputSelectorPlaceholder,
                ]}
              >
                {dataIda
                  ? formatarData(
                      dataIda
                    )
                  : 'Selecionar'}
              </Text>
            </Pressable>

            <View
              style={
                styles.dateRangeConnector
              }
            >
              <View
                style={
                  styles.dateRangeLine
                }
              />

              <Text
                style={
                  styles.dateRangeConnectorText
                }
              >
                até
              </Text>

              <View
                style={
                  styles.dateRangeLine
                }
              />
            </View>

            <Pressable
              style={[
                styles.dateRangeCard,
                dataVolta &&
                  styles.dateRangeCardFilled,
              ]}
              onPress={() =>
                setCalendarioVisivel(
                  true
                )
              }
            >
              <Text
                style={
                  styles.dateRangeLabel
                }
              >
                VOLTA
              </Text>

              <Text
                style={[
                  styles.dateRangeValue,
                  !dataVolta &&
                    styles.inputSelectorPlaceholder,
                ]}
              >
                {dataVolta
                  ? formatarData(
                      dataVolta
                    )
                  : 'Selecionar'}
              </Text>
            </Pressable>
          </View>

          {dataIda &&
          !dataVolta ? (
            <Text
              style={
                styles.dateRangeHint
              }
            >
              Ida selecionada. Agora escolha a data de volta.
            </Text>
          ) : null}

          {dataIda &&
          dataVolta ? (
            <Text
              style={
                styles.dateRangeHint
              }
            >
              Período selecionado:{' '}
              {formatarData(
                dataIda
              )}{' '}
              a{' '}
              {formatarData(
                dataVolta
              )}
            </Text>
          ) : null}
        </View>

        {/* ORÇAMENTO */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Quanto pretende gastar?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Arraste o marcador para informar o orçamento disponível para a viagem.
          </Text>

          <View
            style={
              styles.budgetHeader
            }
          >
            <Text
              style={
                styles.budgetCaption
              }
            >
              Orçamento disponível
            </Text>

            <Text
              style={
                styles.budgetValue
              }
            >
              {formatarMoeda(
                orcamentoValor
              )}
            </Text>
          </View>

          <View
            style={
              styles.sliderTouchArea
            }
            onLayout={(
              event
            ) =>
              setLarguraSlider(
                Math.max(
                  1,
                  event
                    .nativeEvent
                    .layout
                    .width
                )
              )
            }
            onStartShouldSetResponder={() =>
              true
            }
            onMoveShouldSetResponder={() =>
              true
            }
            onResponderTerminationRequest={() =>
              false
            }
            onResponderGrant={(
              event
            ) =>
              atualizarOrcamentoPelaPosicao(
                event
                  .nativeEvent
                  .locationX
              )
            }
            onResponderMove={(
              event
            ) =>
              atualizarOrcamentoPelaPosicao(
                event
                  .nativeEvent
                  .locationX
              )
            }
          >
            <View
              style={
                styles.sliderTrack
              }
            >
              <View
                style={[
                  styles.sliderProgress,
                  {
                    width:
                      `${(
                        orcamentoValor /
                        20000
                      ) *
                      100}%`,
                  },
                ]}
              />

              <View
                pointerEvents="none"
                style={[
                  styles.sliderThumb,
                  {
                    left:
                      `${(
                        orcamentoValor /
                        20000
                      ) *
                      100}%`,
                  },
                ]}
              >
                <View
                  style={
                    styles.sliderThumbCenter
                  }
                />
              </View>
            </View>
          </View>

          <View
            style={
              styles.sliderLabels
            }
          >
            <Text
              style={
                styles.sliderLabel
              }
            >
              R$ 0
            </Text>

            <Text
              style={
                styles.sliderLabel
              }
            >
              R$ 20.000
            </Text>
          </View>

          <Text
            style={
              styles.sliderHelper
            }
          >
            Ajuste em intervalos de R$ 250.
          </Text>
        </View>

        {/* INTERESSES */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            O que você gostaria de encontrar?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Escolha tudo o que combina
            com a viagem que você imagina.
          </Text>

          <View
            style={
              styles.optionsGrid
            }
          >
            {botaoOpcao(
              interesses.includes(
                'AVENTURA'
              ),
              'Aventura',
              () =>
                alternarInteresse(
                  'AVENTURA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'VIDA_NOTURNA'
              ),
              'Vida noturna',
              () =>
                alternarInteresse(
                  'VIDA_NOTURNA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'GASTRONOMIA'
              ),
              'Gastronomia',
              () =>
                alternarInteresse(
                  'GASTRONOMIA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'NATUREZA'
              ),
              'Natureza',
              () =>
                alternarInteresse(
                  'NATUREZA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'CULTURA'
              ),
              'Cultura',
              () =>
                alternarInteresse(
                  'CULTURA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'DESCANSO'
              ),
              'Descanso',
              () =>
                alternarInteresse(
                  'DESCANSO'
                )
            )}
          </View>
        </View>

        {/* RITMO */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Que tipo de destino
            combina mais com você?
          </Text>

          <View
            style={
              styles.optionsGrid
            }
          >
            {botaoOpcao(
              ritmoDestino ===
                'AGITADO',
              'Agitado',
              () =>
                setRitmoDestino(
                  'AGITADO'
                )
            )}

            {botaoOpcao(
              ritmoDestino ===
                'EQUILIBRADO',
              'Equilibrado',
              () =>
                setRitmoDestino(
                  'EQUILIBRADO'
                )
            )}

            {botaoOpcao(
              ritmoDestino ===
                'TRANQUILO',
              'Tranquilo',
              () =>
                setRitmoDestino(
                  'TRANQUILO'
                )
            )}
          </View>
        </View>

        {/* MOBILIDADE */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Como pretende se
            locomover?
          </Text>

          <View
            style={
              styles.optionsGrid
            }
          >
            {botaoOpcao(
              mobilidade ===
                'A_PE',
              'Quero fazer tudo a pé',
              () =>
                setMobilidade(
                  'A_PE'
                )
            )}

            {botaoOpcao(
              mobilidade ===
                'TRANSPORTE_PUBLICO',
              'Transporte público',
              () =>
                setMobilidade(
                  'TRANSPORTE_PUBLICO'
                )
            )}

            {botaoOpcao(
              mobilidade ===
                'APLICATIVOS',
              'Aplicativos',
              () =>
                setMobilidade(
                  'APLICATIVOS'
                )
            )}

            {botaoOpcao(
              mobilidade ===
                'TANTO_FAZ',
              'Tanto faz',
              () =>
                setMobilidade(
                  'TANTO_FAZ'
                )
            )}
          </View>
        </View>

        {/* ITENS ESSENCIAIS */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            O que é mais importante e não pode faltar?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Escolha entre 3 e 4 opções essenciais para a sua viagem. A maIA dará prioridade máxima a esses itens.
          </Text>

          <View
            style={
              styles.optionsGrid
            }
          >
            {([
              [
                'SEGURANCA',
                'Segurança',
              ],
              [
                'FACIL_LOCOMOCAO',
                'Fácil locomoção',
              ],
              [
                'ESTRUTURA_TURISTICA',
                'Estrutura turística',
              ],
              [
                'RESTAURANTES_PROXIMOS',
                'Restaurantes próximos',
              ],
              [
                'GASTRONOMIA_LOCAL',
                'Gastronomia local',
              ],
              [
                'VIDA_NOTURNA',
                'Vida noturna',
              ],
              [
                'PASSEIOS',
                'Passeios',
              ],
              [
                'HISTORIA_ARQUITETURA',
                'História e arquitetura',
              ],
              [
                'CAMPO_INTERIOR',
                'Campo / interior',
              ],
              [
                'PRAIA',
                'Praia',
              ],
              [
                'AGUAS_CALMAS',
                'Águas calmas',
              ],
              [
                'AGUAS_QUENTES',
                'Águas quentes',
              ],
              [
                'CALOR',
                'Calor',
              ],
              [
                'FRIO',
                'Frio',
              ],
              [
                'MONTANHAS',
                'Montanhas',
              ],
              [
                'TRILHAS',
                'Trilhas',
              ],
              [
                'NEVE',
                'Neve',
              ],
              [
                'CACHOEIRAS',
                'Cachoeiras',
              ],
            ] as [
              Indispensavel,
              string
            ][]).map(
              ([
                valor,
                rotulo,
              ]) =>
                botaoOpcao(
                  indispensaveis.includes(
                    valor
                  ),
                  rotulo,
                  () =>
                    alternarIndispensavel(
                      valor
                    )
                )
            )}
          </View>
        </View>

        {/* DETALHES LIVRES */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Conte todos os detalhes
            da viagem que você procura
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Escreva livremente tudo o que
            você considera importante.
            Quanto mais detalhes você der,
            melhor a maIA poderá entender
            o tipo de destino que procura.
          </Text>

          <TextInput
            style={
              styles.textArea
            }
            placeholder="Ex.: Quero um destino frio, com montanhas e trilhas; ou uma cidade histórica com boa gastronomia; ou praias tranquilas. Conte aqui o que faria essa viagem ser ideal para você."
            placeholderTextColor="#999"
            multiline
            numberOfLines={
              7
            }
            value={
              requisitosIndispensaveis
            }
            onChangeText={
              setRequisitosIndispensaveis
            }
            textAlignVertical="top"
          />
        </View>

        {/* BOTÃO PLANEJAR */}

        <Pressable
          style={[
            styles.planButton,

            carregando &&
              styles.buttonDisabled,
          ]}
          onPress={
            planejar
          }
          disabled={
            carregando
          }
        >
          {carregando ? (
            <View
              style={
                styles.loadingRow
              }
            >
              <ActivityIndicator
                size="small"
                color="#ffffff"
              />

              <Text
                style={
                  styles.planButtonText
                }
              >
                ANALISANDO...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.planButtonText
              }
            >
              {destinosRecomendados.length >
              0
                ? 'ANALISAR NOVAMENTE'
                : 'ENCONTRAR MEU DESTINO'}
            </Text>
          )}
        </Pressable>

        {/* RESULTADOS */}

        {destinosRecomendados.length >
          0 && (
          <View
            style={
              styles.resultadosSection
            }
          >
            <Text
              style={
                styles.resultadosEyebrow
              }
            >
              RECOMENDAÇÕES DA maIA
            </Text>

            <Text
              style={
                styles.resultadosTitle
              }
            >
              Destinos que combinam
              com você
            </Text>

            <Text
              style={
                styles.resultadosSubtitle
              }
            >
              A maIA analisou seu
              planejamento e encontrou
              estas opções. Você pode
              alterar qualquer informação
              acima e analisar novamente.
            </Text>

            {destinosRecomendados.map(
              (
                destinoItem,
                index
              ) => (
                <View
                  key={`${destinoItem.cidade}-${index}`}
                  style={
                    styles.destinoCard
                  }
                >
                  <View
                    style={
                      styles.destinoHeader
                    }
                  >
                    <View
                      style={
                        styles.destinoHeaderMain
                      }
                    >
                      <Text
                        style={
                          styles.destinoRanking
                        }
                      >
                        #{index + 1}
                      </Text>

                      <Text
                        style={
                          styles.destinoNome
                        }
                      >
                        {
                          destinoItem.cidade
                        }
                      </Text>

                      <Text
                        style={
                          styles.destinoLocal
                        }
                      >
                        {
                          destinoItem.estadoOuRegiao
                        }

                        {destinoItem.estadoOuRegiao &&
                        destinoItem.pais
                          ? ', '
                          : ''}

                        {
                          destinoItem.pais
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.compatibilidadeBadge
                      }
                    >
                      <Text
                        style={
                          styles.compatibilidadeValor
                        }
                      >
                        {
                          destinoItem.compatibilidade
                        }
                        %
                      </Text>

                      <Text
                        style={
                          styles.compatibilidadeLabel
                        }
                      >
                        compatível
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.destinoResumo
                    }
                  >
                    {
                      destinoItem.resumo
                    }
                  </Text>

                  <View
                    style={
                      styles.highlightBox
                    }
                  >
                    <Text
                      style={
                        styles.highlightLabel
                      }
                    >
                      Por que combina
                      com você
                    </Text>

                    <Text
                      style={
                        styles.highlightText
                      }
                    >
                      {
                        destinoItem.porQueCombina
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.destinoLabel
                    }
                  >
                    Segurança
                  </Text>

                  <Text
                    style={
                      styles.destinoTexto
                    }
                  >
                    {
                      destinoItem.seguranca
                    }
                  </Text>

                  <Text
                    style={
                      styles.destinoLabel
                    }
                  >
                    Mobilidade
                  </Text>

                  <Text
                    style={
                      styles.destinoTexto
                    }
                  >
                    {
                      destinoItem.mobilidade
                    }
                  </Text>

                  <Text
                    style={
                      styles.destinoLabel
                    }
                  >
                    Clima
                  </Text>

                  <Text
                    style={
                      styles.destinoTexto
                    }
                  >
                    {
                      destinoItem.clima
                    }
                  </Text>

                  <Text
                    style={
                      styles.destinoLabel
                    }
                  >
                    Região sugerida
                    para ficar
                  </Text>

                  <Text
                    style={
                      styles.destinoTexto
                    }
                  >
                    {
                      destinoItem.melhorRegiaoParaFicar
                    }
                  </Text>

                  {destinoItem
                    .caracteristicasRelevantes
                    ?.length >
                    0 && (
                    <>
                      <Text
                        style={
                          styles.destinoLabel
                        }
                      >
                        O que combina
                        com seu perfil
                      </Text>

                      <View
                        style={
                          styles.tagsContainer
                        }
                      >
                        {destinoItem.caracteristicasRelevantes.map(
                          (
                            caracteristica,
                            itemIndex
                          ) => (
                            <View
                              key={
                                itemIndex
                              }
                              style={
                                styles.tag
                              }
                            >
                              <Text
                                style={
                                  styles.tagText
                                }
                              >
                                {
                                  caracteristica
                                }
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                    </>
                  )}

                  {destinoItem
                    .pontosPositivos
                    ?.length >
                    0 && (
                    <>
                      <Text
                        style={
                          styles.destinoLabel
                        }
                      >
                        Pontos positivos
                      </Text>

                      {destinoItem.pontosPositivos.map(
                        (
                          ponto,
                          itemIndex
                        ) => (
                          <Text
                            key={
                              itemIndex
                            }
                            style={
                              styles.listaItem
                            }
                          >
                            • {ponto}
                          </Text>
                        )
                      )}
                    </>
                  )}

                  {destinoItem
                    .pontosDeAtencao
                    ?.length >
                    0 && (
                    <>
                      <Text
                        style={
                          styles.destinoLabel
                        }
                      >
                        Pontos de atenção
                      </Text>

                      {destinoItem.pontosDeAtencao.map(
                        (
                          ponto,
                          itemIndex
                        ) => (
                          <Text
                            key={
                              itemIndex
                            }
                            style={
                              styles.listaItemAtencao
                            }
                          >
                            • {ponto}
                          </Text>
                        )
                      )}
                    </>
                  )}

                  {/* ESCOLHER DESTINO */}

                  <Pressable
                    style={
                      styles.chooseDestinationButton
                    }
                    onPress={() =>
                      router.push({
                        pathname: '/confirmar-viagem',
                        params: {
                          cidade: destinoItem.cidade,
                          estado: destinoItem.estadoOuRegiao,
                          pais: destinoItem.pais,
                          dataInicio: dataIda
                            ? formatarData(dataIda)
                            : '',
                          dataFim: dataVolta
                            ? formatarData(dataVolta)
                            : '',
                        },
                      })
                    }
                  >
                    <Text
                      style={
                        styles.chooseDestinationButtonText
                      }
                    >
                      QUERO IR PARA ESTE DESTINO
                    </Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={
          calendarioVisivel
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCalendarioVisivel(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalBackdrop
          }
          onPress={() =>
            setCalendarioVisivel(
              false
            )
          }
        >
          <Pressable
            style={
              styles.calendarCard
            }
            onPress={() => {}}
          >
            <Text
              style={
                styles.calendarSelectionTitle
              }
            >
              {!dataIda ||
              dataVolta
                ? 'Selecione a data de ida'
                : 'Agora selecione a data de volta'}
            </Text>

            <Text
              style={
                styles.calendarSelectionSubtitle
              }
            >
              {!dataIda ||
              dataVolta
                ? 'O primeiro toque define o início da viagem.'
                : `Ida: ${formatarData(
                    dataIda
                  )}`}
            </Text>

            <View
              style={
                styles.calendarHeader
              }
            >
              <Pressable
                style={
                  styles.calendarArrow
                }
                onPress={() =>
                  alterarMes(
                    -1
                  )
                }
              >
                <Text
                  style={
                    styles.calendarArrowText
                  }
                >
                  ‹
                </Text>
              </Pressable>

              <Text
                style={
                  styles.calendarTitle
                }
              >
                {
                  MESES[
                    mesCalendario.getMonth()
                  ]
                }{' '}
                {mesCalendario.getFullYear()}
              </Text>

              <Pressable
                style={
                  styles.calendarArrow
                }
                onPress={() =>
                  alterarMes(
                    1
                  )
                }
              >
                <Text
                  style={
                    styles.calendarArrowText
                  }
                >
                  ›
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.weekHeader
              }
            >
              {[
                'D',
                'S',
                'T',
                'Q',
                'Q',
                'S',
                'S',
              ].map(
                (
                  dia,
                  index
                ) => (
                  <Text
                    key={`${dia}-${index}`}
                    style={
                      styles.weekDay
                    }
                  >
                    {
                      dia
                    }
                  </Text>
                )
              )}
            </View>

            <View
              style={
                styles.calendarGrid
              }
            >
              {diasDoCalendario().map(
                (
                  dia,
                  index
                ) => {
                  if (
                    dia ===
                    null
                  ) {
                    return (
                      <View
                        key={`vazio-${index}`}
                        style={
                          styles.calendarDay
                        }
                      />
                    );
                  }

                  const dataCelula =
                    new Date(
                      mesCalendario.getFullYear(),
                      mesCalendario.getMonth(),
                      dia
                    );

                  const ehIda =
                    mesmaData(
                      dataIda,
                      dataCelula
                    );

                  const ehVolta =
                    mesmaData(
                      dataVolta,
                      dataCelula
                    );

                  const estaNoIntervalo =
                    !!dataIda &&
                    !!dataVolta &&
                    inicioDoDia(
                      dataCelula
                    ) >
                      inicioDoDia(
                        dataIda
                      ) &&
                    inicioDoDia(
                      dataCelula
                    ) <
                      inicioDoDia(
                        dataVolta
                      );

                  return (
                    <Pressable
                      key={`${mesCalendario.getFullYear()}-${mesCalendario.getMonth()}-${dia}`}
                      style={[
                        styles.calendarDay,

                        estaNoIntervalo &&
                          styles.calendarDayInRange,

                        (
                          ehIda ||
                          ehVolta
                        ) &&
                          styles.calendarDaySelected,
                      ]}
                      onPress={() =>
                        selecionarData(
                          dia
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.calendarDayText,

                          estaNoIntervalo &&
                            styles.calendarDayTextInRange,

                          (
                            ehIda ||
                            ehVolta
                          ) &&
                            styles.calendarDayTextSelected,
                        ]}
                      >
                        {
                          dia
                        }
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <Pressable
              style={
                styles.calendarCancel
              }
              onPress={() =>
                setCalendarioVisivel(
                  false
                )
              }
            >
              <Text
                style={
                  styles.calendarCancelText
                }
              >
                Fechar calendário
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    keyboardView: {
      flex: 1,
    },

    container: {
      flex: 1,
      backgroundColor:
        '#f7f7fb',
    },

    content: {
      paddingTop: 56,
      paddingHorizontal: 20,
      paddingBottom: 80,
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: '#6d28d9',
      marginBottom: 6,
    },

    title: {
      fontSize: 29,
      fontWeight: 'bold',
      color: '#1f1f1f',
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: '#666666',
      marginBottom: 20,
    },

    myTripsCard: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e5e5ec',
      borderRadius: 18,
      padding: 15,
      marginBottom: 28,
      flexDirection: 'row',
      alignItems: 'center',
    },

    myTripsIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        '#f1ebff',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    myTripsIconText: {
      fontSize: 21,
      color: '#6d28d9',
    },

    myTripsContent: {
      flex: 1,
    },

    myTripsTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.6,
      marginBottom: 4,
    },

    myTripsText: {
      fontSize: 13,
      lineHeight: 18,
      color: '#666666',
    },

    myTripsArrow: {
      fontSize: 30,
      color: '#6d28d9',
      marginLeft: 8,
    },

    section: {
      marginBottom: 28,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 5,
    },

    helper: {
      fontSize: 13,
      lineHeight: 19,
      color: '#777777',
      marginBottom: 10,
    },

    input: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#dedee6',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 14,
      color: '#222222',
    },

    dateRangeRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 8,
    },

    dateRangeCard: {
      flex: 1,
      minHeight: 76,
      borderWidth: 1,
      borderColor:
        '#dedee6',
      borderRadius: 16,
      backgroundColor:
        '#ffffff',
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent:
        'center',
    },

    dateRangeCardFilled: {
      borderColor:
        '#6d28d9',
      backgroundColor:
        '#f8f5ff',
    },

    dateRangeLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6d28d9',
      letterSpacing: 0.7,
      marginBottom: 5,
    },

    dateRangeValue: {
      fontSize: 15,
      fontWeight: '800',
      color: '#222222',
    },

    dateRangeConnector: {
      width: 54,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 5,
    },

    dateRangeLine: {
      width: 20,
      height: 1,
      backgroundColor:
        '#d7d2df',
    },

    dateRangeConnectorText: {
      fontSize: 11,
      color: '#777777',
      fontWeight: '700',
      marginVertical: 3,
    },

    dateRangeHint: {
      marginTop: 10,
      fontSize: 12,
      color: '#6d28d9',
      fontWeight: '600',
    },

    inputSelector: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#dedee6',
      borderRadius: 14,
      paddingHorizontal: 14,
      minHeight: 52,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    inputSelectorText: {
      fontSize: 14,
      color: '#222222',
      fontWeight: '600',
    },

    inputSelectorPlaceholder: {
      color: '#999999',
      fontWeight: '400',
    },

    inputSelectorAction: {
      color: '#6d28d9',
      fontSize: 13,
      fontWeight: '800',
    },

    budgetHeader: {
      marginTop: 8,
      marginBottom: 8,
    },

    budgetCaption: {
      fontSize: 12,
      color: '#777777',
      fontWeight: '600',
      marginBottom: 2,
    },

    budgetValue: {
      fontSize: 30,
      fontWeight: '800',
      color: '#222222',
    },

    sliderTouchArea: {
      height: 58,
      justifyContent:
        'center',
      paddingVertical: 18,
    },

    sliderTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor:
        '#e7e3ec',
      position:
        'relative',
      overflow:
        'visible',
    },

    sliderProgress: {
      height: 10,
      borderRadius: 999,
      backgroundColor:
        '#6d28d9',
    },

    sliderThumb: {
      position:
        'absolute',
      top: -9,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        '#ffffff',
      marginLeft: -14,
      borderWidth: 3,
      borderColor:
        '#6d28d9',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    sliderThumbCenter: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        '#6d28d9',
    },

    sliderLabels: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
    },

    sliderLabel: {
      color: '#777777',
      fontSize: 12,
      fontWeight: '600',
    },

    sliderHelper: {
      marginTop: 7,
      color: '#999999',
      fontSize: 11,
      textAlign:
        'center',
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.35)',
      justifyContent:
        'center',
      padding: 24,
    },

    calendarCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 20,
      padding: 18,
    },

    calendarSelectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#222222',
      textAlign:
        'center',
    },

    calendarSelectionSubtitle: {
      marginTop: 5,
      marginBottom: 14,
      fontSize: 12,
      color: '#777777',
      textAlign:
        'center',
    },

    calendarHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 16,
    },

    calendarTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#222222',
    },

    calendarArrow: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#f3f0f8',
    },

    calendarArrowText: {
      fontSize: 28,
      lineHeight: 30,
      color: '#6d28d9',
    },

    weekHeader: {
      flexDirection:
        'row',
      marginBottom: 6,
    },

    weekDay: {
      width:
        '14.2857%',
      textAlign:
        'center',
      color: '#777777',
      fontSize: 12,
      fontWeight: '700',
    },

    calendarGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
    },

    calendarDay: {
      width:
        '14.2857%',
      aspectRatio: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderRadius: 999,
    },

    calendarDayInRange: {
      backgroundColor:
        '#eee7fb',
      borderRadius: 0,
    },

    calendarDaySelected: {
      backgroundColor:
        '#6d28d9',
    },

    calendarDayText: {
      color: '#333333',
      fontSize: 14,
      fontWeight: '600',
    },

    calendarDayTextInRange: {
      color: '#5b21b6',
      fontWeight: '700',
    },

    calendarDayTextSelected: {
      color: '#ffffff',
      fontWeight: '800',
    },

    calendarCancel: {
      alignSelf:
        'flex-end',
      marginTop: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },

    calendarCancelText: {
      color: '#6d28d9',
      fontSize: 14,
      fontWeight: '800',
    },

    textArea: {
      minHeight: 140,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#dedee6',
      borderRadius: 14,
      padding: 14,
      fontSize: 14,
      lineHeight: 20,
      color: '#222222',
    },

    optionsGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 9,
    },

    optionButton: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#dedee6',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },

    optionButtonSelected: {
      borderColor:
        '#6d28d9',
      backgroundColor:
        '#f1ebff',
    },

    optionText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#555555',
    },

    optionTextSelected: {
      color: '#6d28d9',
    },

    planButton: {
      backgroundColor:
        '#6d28d9',
      borderRadius: 15,
      paddingVertical: 17,
      alignItems:
        'center',
      justifyContent:
        'center',
      minHeight: 52,
    },

    planButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.3,
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    loadingRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 10,
    },

    resultadosSection: {
      marginTop: 38,
    },

    resultadosEyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.3,
      color: '#6d28d9',
      marginBottom: 5,
    },

    resultadosTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 6,
    },

    resultadosSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: '#777777',
      marginBottom: 20,
    },

    destinoCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 20,
      padding: 18,
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        '#e5e5ec',
    },

    destinoHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 14,
    },

    destinoHeaderMain: {
      flex: 1,
      paddingRight: 12,
    },

    destinoRanking: {
      fontSize: 12,
      fontWeight: '800',
      color: '#6d28d9',
      marginBottom: 3,
    },

    destinoNome: {
      fontSize: 23,
      fontWeight: '800',
      color: '#222222',
    },

    destinoLocal: {
      fontSize: 13,
      color: '#777777',
      marginTop: 3,
    },

    compatibilidadeBadge: {
      backgroundColor:
        '#f1ebff',
      borderRadius: 14,
      paddingHorizontal: 11,
      paddingVertical: 8,
      alignItems:
        'center',
    },

    compatibilidadeValor: {
      fontSize: 18,
      fontWeight: '900',
      color: '#6d28d9',
    },

    compatibilidadeLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#6d28d9',
      marginTop: 1,
    },

    destinoResumo: {
      fontSize: 14,
      lineHeight: 21,
      color: '#555555',
      marginBottom: 15,
    },

    highlightBox: {
      backgroundColor:
        '#f7f3ff',
      borderRadius: 14,
      padding: 14,
      marginBottom: 6,
    },

    highlightLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6d28d9',
      marginBottom: 5,
    },

    highlightText: {
      fontSize: 14,
      lineHeight: 21,
      color: '#444444',
    },

    destinoLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#888888',
      marginTop: 15,
      marginBottom: 5,
      textTransform:
        'uppercase',
      letterSpacing: 0.3,
    },

    destinoTexto: {
      fontSize: 14,
      lineHeight: 21,
      color: '#444444',
    },

    tagsContainer: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap: 7,
    },

    tag: {
      backgroundColor:
        '#f1ebff',
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },

    tagText: {
      fontSize: 12,
      color: '#6d28d9',
      fontWeight: '700',
    },

    listaItem: {
      fontSize: 14,
      lineHeight: 21,
      color: '#444444',
      marginBottom: 4,
    },

    listaItemAtencao: {
      fontSize: 14,
      lineHeight: 21,
      color: '#555555',
      marginBottom: 4,
    },

    chooseDestinationButton: {
      backgroundColor:
        '#6d28d9',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 20,
    },

    chooseDestinationButtonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.2,
      textAlign:
        'center',
    },
  });