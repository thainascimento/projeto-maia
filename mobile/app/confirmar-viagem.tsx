import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

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

type GeocodingResponse = {
  nome: string;
  latitude: number;
  longitude: number;
};

type GeocodingSugestao = {
  nome: string;
  cidade: string;
  estado: string | null;
  pais: string | null;
  latitude: number;
  longitude: number;
};

export default function ConfirmarViagemScreen() {
  const params =
    useLocalSearchParams<{
      cidade?: string;
      estado?: string;
      pais?: string;
      modo?: string;
      dataInicio?: string;
      dataFim?: string;
    }>();

  const cidadeRecebida =
    typeof params.cidade === 'string'
      ? params.cidade
      : '';

  const estadoRecebido =
    typeof params.estado === 'string'
      ? params.estado
      : '';

  const paisRecebido =
    typeof params.pais === 'string'
      ? params.pais
      : '';

  const modoDireto =
    params.modo === 'direto' ||
    !cidadeRecebida.trim();

  const [
    destinoManual,
    setDestinoManual,
  ] = useState(
    cidadeRecebida
  );

  const [
    destinoSelecionado,
    setDestinoSelecionado,
  ] =
    useState<GeocodingSugestao | null>(
      null
    );

  const [
    sugestoes,
    setSugestoes,
  ] =
    useState<GeocodingSugestao[]>(
      []
    );

  const [
    buscandoSugestoes,
    setBuscandoSugestoes,
  ] = useState(false);

  const requisicaoAtualRef =
    useRef(0);

  function converterTextoParaDate(
    texto?: string
  ): Date | null {
    if (!texto) {
      return null;
    }

    const partes =
      texto.split('/');

    if (
      partes.length !== 3
    ) {
      return null;
    }

    const dia =
      Number(
        partes[0]
      );

    const mes =
      Number(
        partes[1]
      );

    const ano =
      Number(
        partes[2]
      );

    if (
      !Number.isInteger(dia) ||
      !Number.isInteger(mes) ||
      !Number.isInteger(ano)
    ) {
      return null;
    }

    const data =
      new Date(
        ano,
        mes - 1,
        dia
      );

    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes - 1 ||
      data.getDate() !== dia
    ) {
      return null;
    }

    return data;
  }

  const [
    dataIda,
    setDataIda,
  ] =
    useState<Date | null>(
      converterTextoParaDate(
        typeof params.dataInicio ===
          'string'
          ? params.dataInicio
          : undefined
      )
    );

  const [
    dataVolta,
    setDataVolta,
  ] =
    useState<Date | null>(
      converterTextoParaDate(
        typeof params.dataFim ===
          'string'
          ? params.dataFim
          : undefined
      )
    );

  const [
    mesCalendario,
    setMesCalendario,
  ] = useState(
    dataIda
      ? new Date(
          dataIda.getFullYear(),
          dataIda.getMonth(),
          1
        )
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        )
  );

  const [
    calendarioVisivel,
    setCalendarioVisivel,
  ] = useState(false);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

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

  const cidade =
    modoDireto
      ? destinoSelecionado
          ?.cidade ?? ''
      : cidadeRecebida.trim();

  const estado =
    modoDireto
      ? destinoSelecionado
          ?.estado ?? ''
      : estadoRecebido.trim();

  const pais =
    modoDireto
      ? destinoSelecionado
          ?.pais ?? ''
      : paisRecebido.trim();

  useEffect(() => {
    if (!modoDireto) {
      return;
    }

    const texto =
      destinoManual.trim();

    if (
      destinoSelecionado &&
      texto ===
        destinoSelecionado.nome
    ) {
      setSugestoes(
        []
      );

      setBuscandoSugestoes(
        false
      );

      return;
    }

    if (
      texto.length < 2
    ) {
      setSugestoes(
        []
      );

      setBuscandoSugestoes(
        false
      );

      return;
    }

    const idRequisicao =
      requisicaoAtualRef.current +
      1;

    requisicaoAtualRef.current =
      idRequisicao;

    const temporizador =
      setTimeout(
        async () => {
          try {
            setBuscandoSugestoes(
              true
            );

            const response =
              await fetch(
                `${API_URL}/geocoding/sugestoes?texto=${encodeURIComponent(
                  texto
                )}`
              );

            if (
              idRequisicao !==
              requisicaoAtualRef.current
            ) {
              return;
            }

            if (
              !response.ok
            ) {
              console.error(
                'Erro HTTP ao buscar sugestões:',
                response.status
              );

              setSugestoes(
                []
              );

              return;
            }

            const dados =
              await response.json();

            if (
              !Array.isArray(
                dados
              )
            ) {
              setSugestoes(
                []
              );

              return;
            }

            setSugestoes(
              dados
            );
          } catch (error) {
            console.error(
              'Erro ao buscar sugestões de destino:',
              error
            );

            if (
              idRequisicao ===
              requisicaoAtualRef.current
            ) {
              setSugestoes(
                []
              );
            }
          } finally {
            if (
              idRequisicao ===
              requisicaoAtualRef.current
            ) {
              setBuscandoSugestoes(
                false
              );
            }
          }
        },
        300
      );

    return () => {
      clearTimeout(
        temporizador
      );
    };
  }, [
    destinoManual,
    destinoSelecionado,
    modoDireto,
  ]);

  function alterarDestinoManual(
    texto: string
  ) {
    setDestinoManual(
      texto
    );

    setDestinoSelecionado(
      null
    );
  }

  function selecionarDestino(
    sugestao: GeocodingSugestao
  ) {
    requisicaoAtualRef.current +=
      1;

    setDestinoSelecionado(
      sugestao
    );

    setDestinoManual(
      sugestao.nome
    );

    setSugestoes(
      []
    );

    setBuscandoSugestoes(
      false
    );
  }

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

  function formatarDataBackend(
    data: Date
  ) {
    const ano =
      data.getFullYear();

    const mes =
      String(
        data.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const dia =
      String(
        data.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${ano}-${mes}-${dia}`;
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

      return;
    }

    setDataVolta(
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

  async function buscarCoordenadas() {
    if (
      modoDireto &&
      destinoSelecionado
    ) {
      return {
        nome:
          destinoSelecionado.nome,

        latitude:
          destinoSelecionado.latitude,

        longitude:
          destinoSelecionado.longitude,
      };
    }

    const partes = [
      cidade,
      estado,
      pais,
    ].filter(
      (item) =>
        item &&
        item.trim()
    );

    const textoBusca =
      partes.join(
        ', '
      );

    const response =
      await fetch(
        `${API_URL}/geocoding/buscar?texto=${encodeURIComponent(
          textoBusca
        )}`
      );

    if (!response.ok) {
      const mensagem =
        await response.text();

      throw new Error(
        mensagem ||
          'Não foi possível localizar o destino.'
      );
    }

    const coordenadas:
      GeocodingResponse =
      await response.json();

    if (
      coordenadas.latitude ==
        null ||
      coordenadas.longitude ==
        null
    ) {
      throw new Error(
        'As coordenadas do destino não foram encontradas.'
      );
    }

    return coordenadas;
  }

  async function confirmarViagem() {
    if (
      modoDireto &&
      !destinoSelecionado
    ) {
      Alert.alert(
        'Selecione um destino',
        'Digite o destino e escolha uma das sugestões exibidas.'
      );

      return;
    }

    if (
      !cidade.trim()
    ) {
      Alert.alert(
        'Destino obrigatório',
        'Informe para onde você vai.'
      );

      return;
    }

    if (
      !dataIda ||
      !dataVolta
    ) {
      Alert.alert(
        'Faltam as datas',
        'Selecione a data de ida e a data de volta.'
      );

      return;
    }

    if (
      inicioDoDia(
        dataVolta
      ) <
      inicioDoDia(
        dataIda
      )
    ) {
      Alert.alert(
        'Período inválido',
        'A data de volta não pode ser anterior à data de ida.'
      );

      return;
    }

    try {
      setSalvando(
        true
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

      const coordenadas =
        await buscarCoordenadas();

      const viagem = {
        usuarioId:
          usuario.id,

        destino:
          cidade.trim(),

        cidade:
          cidade.trim(),

        estado:
          estado.trim(),

        pais:
          pais.trim(),

        latitude:
          coordenadas.latitude,

        longitude:
          coordenadas.longitude,

        dataInicio:
          formatarDataBackend(
            dataIda
          ),

        dataFim:
          formatarDataBackend(
            dataVolta
          ),
      };

      console.log(
        'Criando viagem:',
        viagem
      );

      const response =
        await fetch(
          `${API_URL}/viagens`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                viagem
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

      const viagemCriada =
        await response.json();

      console.log(
        'Viagem criada:',
        viagemCriada
      );

      Alert.alert(
        'Viagem confirmada',
        `${cidade} agora faz parte das suas próximas viagens.`,
        [
          {
            text:
              'Ver minhas viagens',

            onPress: () =>
              router.replace(
                '/(tabs)/viagens'
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Erro ao criar viagem:',
        error
      );

      Alert.alert(
        'Não foi possível confirmar',
        'Não conseguimos localizar ou salvar sua viagem. Tente novamente.'
      );
    } finally {
      setSalvando(
        false
      );
    }
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
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
          {modoDireto
            ? 'Vamos adicionar sua viagem?'
            : 'Vamos confirmar sua viagem?'}
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          {modoDireto
            ? 'Informe seu destino e selecione o período da viagem.'
            : 'Você escolheu um dos destinos recomendados pela maIA. Confira o período antes de confirmar.'}
        </Text>

        {modoDireto ? (
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
              Para onde você vai?
            </Text>

            <Text
              style={
                styles.helper
              }
            >
              Comece a digitar e selecione o destino correto.
            </Text>

            <TextInput
              style={[
                styles.input,

                destinoSelecionado &&
                  styles.inputSelected,
              ]}
              placeholder="Ex.: Rio de Janeiro"
              placeholderTextColor="#999"
              value={
                destinoManual
              }
              onChangeText={
                alterarDestinoManual
              }
              autoCapitalize="words"
              autoCorrect={
                false
              }
            />

            {buscandoSugestoes ? (
              <View
                style={
                  styles.searchingContainer
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#6d28d9"
                />

                <Text
                  style={
                    styles.searchingText
                  }
                >
                  Buscando destinos...
                </Text>
              </View>
            ) : null}

            {!buscandoSugestoes &&
            sugestoes.length >
              0 ? (
              <View
                style={
                  styles.suggestionsContainer
                }
              >
                {sugestoes.map(
                  (
                    sugestao,
                    index
                  ) => (
                    <Pressable
                      key={`${sugestao.latitude}-${sugestao.longitude}-${index}`}
                      style={[
                        styles.suggestionItem,

                        index <
                          sugestoes.length -
                            1 &&
                          styles.suggestionItemBorder,
                      ]}
                      onPress={() =>
                        selecionarDestino(
                          sugestao
                        )
                      }
                    >
                      <Text
                        style={
                          styles.suggestionCity
                        }
                      >
                        {
                          sugestao.cidade
                        }
                      </Text>

                      <Text
                        style={
                          styles.suggestionDetails
                        }
                      >
                        {[
                          sugestao.estado,
                          sugestao.pais,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ', '
                          )}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            ) : null}

            {destinoSelecionado ? (
              <View
                style={
                  styles.selectedDestination
                }
              >
                <Text
                  style={
                    styles.selectedDestinationLabel
                  }
                >
                  DESTINO SELECIONADO
                </Text>

                <Text
                  style={
                    styles.selectedDestinationText
                  }
                >
                  {
                    destinoSelecionado.nome
                  }
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={
              styles.destinationCard
            }
          >
            <View
              style={
                styles.destinationIcon
              }
            >
              <Text
                style={
                  styles.destinationIconText
                }
              >
                ›
              </Text>
            </View>

            <View
              style={
                styles.destinationContent
              }
            >
              <Text
                style={
                  styles.destinationLabel
                }
              >
                SEU DESTINO
              </Text>

              <Text
                style={
                  styles.destinationName
                }
              >
                {cidade}
              </Text>

              <Text
                style={
                  styles.destinationLocation
                }
              >
                {[
                  estado,
                  pais,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ', '
                  )}
              </Text>
            </View>
          </View>
        )}

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
              onPress={() => {
                if (
                  dataIda
                ) {
                  setMesCalendario(
                    new Date(
                      dataIda.getFullYear(),
                      dataIda.getMonth(),
                      1
                    )
                  );
                }

                setCalendarioVisivel(
                  true
                );
              }}
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
                    styles.dateRangePlaceholder,
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
              onPress={() => {
                if (
                  dataVolta
                ) {
                  setMesCalendario(
                    new Date(
                      dataVolta.getFullYear(),
                      dataVolta.getMonth(),
                      1
                    )
                  );
                } else if (
                  dataIda
                ) {
                  setMesCalendario(
                    new Date(
                      dataIda.getFullYear(),
                      dataIda.getMonth(),
                      1
                    )
                  );
                }

                setCalendarioVisivel(
                  true
                );
              }}
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
                    styles.dateRangePlaceholder,
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

        <View
          style={
            styles.infoBox
          }
        >
          <Text
            style={
              styles.infoTitle
            }
          >
            Depois de confirmar
          </Text>

          <Text
            style={
              styles.infoText
            }
          >
            Essa viagem aparecerá em Minhas Viagens. Quando chegar a data, a maIA poderá acompanhar você durante o destino.
          </Text>
        </View>

        <Pressable
          style={[
            styles.confirmButton,

            salvando &&
              styles.buttonDisabled,
          ]}
          onPress={
            confirmarViagem
          }
          disabled={
            salvando
          }
        >
          {salvando ? (
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
                  styles.confirmButtonText
                }
              >
                LOCALIZANDO E SALVANDO...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.confirmButtonText
              }
            >
              CONFIRMAR VIAGEM
            </Text>
          )}
        </Pressable>
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
                    {dia}
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
                        {dia}
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
      paddingTop: 54,
      paddingHorizontal: 20,
      paddingBottom: 60,
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
      marginBottom: 23,
    },

    backText: {
      fontSize: 32,
      lineHeight: 34,
      color: '#6d28d9',
      marginTop: -3,
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
      fontWeight: '800',
      color: '#222222',
      marginBottom: 8,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: '#666666',
      marginBottom: 25,
    },

    section: {
      marginBottom: 24,
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
      paddingVertical: 15,
      fontSize: 16,
      color: '#222222',
    },

    inputSelected: {
      borderColor:
        '#6d28d9',
      backgroundColor:
        '#fbf9ff',
    },

    searchingContainer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 8,
      marginTop: 10,
      paddingHorizontal: 4,
    },

    searchingText: {
      fontSize: 13,
      color: '#777777',
    },

    suggestionsContainer: {
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#dedee6',
      borderRadius: 14,
      marginTop: 6,
      overflow:
        'hidden',
    },

    suggestionItem: {
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor:
        '#ffffff',
    },

    suggestionItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        '#eeeeF3',
    },

    suggestionCity: {
      fontSize: 15,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 3,
    },

    suggestionDetails: {
      fontSize: 12,
      color: '#777777',
    },

    selectedDestination: {
      marginTop: 10,
      borderRadius: 13,
      paddingHorizontal: 13,
      paddingVertical: 11,
      backgroundColor:
        '#f7f3ff',
    },

    selectedDestinationLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.6,
      marginBottom: 4,
    },

    selectedDestinationText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#444444',
    },

    destinationCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#e5e5ec',
      borderRadius: 19,
      padding: 16,
      marginBottom: 30,
    },

    destinationIcon: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        '#f1ebff',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 13,
    },

    destinationIconText: {
      color: '#6d28d9',
      fontSize: 22,
    },

    destinationContent: {
      flex: 1,
    },

    destinationLabel: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: '#6d28d9',
      marginBottom: 3,
    },

    destinationName: {
      fontSize: 21,
      fontWeight: '800',
      color: '#222222',
    },

    destinationLocation: {
      marginTop: 3,
      fontSize: 13,
      color: '#777777',
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

    dateRangePlaceholder: {
      color: '#999999',
      fontWeight: '400',
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

    infoBox: {
      backgroundColor:
        '#f7f3ff',
      borderRadius: 15,
      padding: 15,
      marginTop: 2,
      marginBottom: 27,
    },

    infoTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#6d28d9',
      marginBottom: 5,
    },

    infoText: {
      fontSize: 13,
      lineHeight: 20,
      color: '#555555',
    },

    confirmButton: {
      minHeight: 54,
      borderRadius: 15,
      backgroundColor:
        '#6d28d9',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 15,
    },

    confirmButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.3,
      textAlign:
        'center',
    },

    loadingRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 10,
    },

    buttonDisabled: {
      opacity: 0.65,
    },
  });