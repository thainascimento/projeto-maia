import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';
import { router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  | 'PRAIA'
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
  const [origem, setOrigem] =
    useState('');

  const [destino, setDestino] =
    useState('');

  const [periodo, setPeriodo] =
    useState('');

  const [orcamento, setOrcamento] =
    useState('');

  const [
    ritmoDestino,
    setRitmoDestino,
  ] =
    useState<RitmoDestino | null>(
      null
    );

  const [
    mobilidade,
    setMobilidade,
  ] =
    useState<Mobilidade | null>(
      null
    );

  const [
    interesses,
    setInteresses,
  ] =
    useState<Interesse[]>([]);

  const [
    prioridades,
    setPrioridades,
  ] =
    useState<Prioridade[]>([]);

  const [
    observacoes,
    setObservacoes,
  ] =
    useState('');

  const [
    requisitosIndispensaveis,
    setRequisitosIndispensaveis,
  ] =
    useState('');

  const [
    carregando,
    setCarregando,
  ] =
    useState(false);

  const [
    destinosRecomendados,
    setDestinosRecomendados,
  ] =
    useState<
      DestinoRecomendado[]
    >([]);

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

  function alternarPrioridade(
    prioridade: Prioridade
  ) {
    if (
      prioridades.includes(
        prioridade
      )
    ) {
      setPrioridades(
        prioridades.filter(
          (item) =>
            item !== prioridade
        )
      );
    } else {
      setPrioridades([
        ...prioridades,
        prioridade,
      ]);
    }
  }

  function botaoOpcao(
    selecionado: boolean,
    texto: string,
    onPress: () => void
  ) {
    return (
      <Pressable
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
    if (!origem.trim()) {
      Alert.alert(
        'Falta uma informação',
        'Informe de onde você vai sair.'
      );

      return;
    }

    if (!periodo.trim()) {
      Alert.alert(
        'Falta uma informação',
        'Informe quando você pretende viajar.'
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
      prioridades.length === 0
    ) {
      Alert.alert(
        'Falta uma informação',
        'Escolha pelo menos uma prioridade.'
      );

      return;
    }

    try {
      setCarregando(true);

      setDestinosRecomendados(
        []
      );

      const usuario =
        await buscarUsuario();

      if (!usuario?.id) {
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
          origem.trim(),

        destino:
          destino.trim() ||
          'AINDA_NAO_SEI',

        periodo:
          periodo.trim(),

        orcamento:
          orcamento.trim(),

        ritmoDestino,

        mobilidade,

        interesses,

        prioridades,

        requisitosIndispensaveis:
          requisitosIndispensaveis.trim(),

        observacoes:
          observacoes.trim(),
      };

      console.log(
        'Enviando planejamento:',
        planejamento
      );

      const response =
        await fetch(
          `${API_URL}/planejamentos`,
          {
            method: 'POST',

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

      if (!response.ok) {
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
        destinos.length === 0
      ) {
        throw new Error(
          'A maIA não retornou destinos.'
        );
      }

      setDestinosRecomendados(
        destinos
      );
    } catch (error) {
      console.error(
        'Erro ao enviar planejamento:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível gerar suas recomendações.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={
        styles.keyboardView
      }
      behavior={
        Platform.OS === 'ios'
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
              ✈
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

        {/* ORIGEM */}
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
            De onde você vai sair?
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: São Paulo"
            placeholderTextColor="#999"
            value={origem}
            onChangeText={
              setOrigem
            }
          />
        </View>

        {/* DESTINO */}
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
            Já tem algum destino
            em mente?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Se ainda não souber,
            deixe em branco.
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: Maceió, Caribe..."
            placeholderTextColor="#999"
            value={destino}
            onChangeText={
              setDestino
            }
          />
        </View>

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
            Quando pretende
            viajar?
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: Abril de 2027"
            placeholderTextColor="#999"
            value={periodo}
            onChangeText={
              setPeriodo
            }
          />
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
            Quanto pretende
            gastar?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Pode informar um valor
            aproximado.
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: R$ 5.000"
            placeholderTextColor="#999"
            value={
              orcamento
            }
            onChangeText={
              setOrcamento
            }
            keyboardType="numeric"
          />
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
            O que não pode faltar?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Você pode escolher
            várias opções.
          </Text>

          <View
            style={
              styles.optionsGrid
            }
          >
            {botaoOpcao(
              interesses.includes(
                'PRAIA'
              ),
              '🏖️ Praia',
              () =>
                alternarInteresse(
                  'PRAIA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'VIDA_NOTURNA'
              ),
              '🍸 Vida noturna',
              () =>
                alternarInteresse(
                  'VIDA_NOTURNA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'GASTRONOMIA'
              ),
              '🍽️ Gastronomia',
              () =>
                alternarInteresse(
                  'GASTRONOMIA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'NATUREZA'
              ),
              '🌿 Natureza',
              () =>
                alternarInteresse(
                  'NATUREZA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'CULTURA'
              ),
              '🏛️ Cultura',
              () =>
                alternarInteresse(
                  'CULTURA'
                )
            )}

            {botaoOpcao(
              interesses.includes(
                'DESCANSO'
              ),
              '✨ Descanso',
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

        {/* PRIORIDADES */}
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
            O que é mais
            importante para você?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Pense especialmente
            no que faria você se
            sentir confortável
            viajando sozinha.
          </Text>

          <View
            style={
              styles.optionsGrid
            }
          >
            {botaoOpcao(
              prioridades.includes(
                'SEGURANCA'
              ),
              '🛡️ Segurança',
              () =>
                alternarPrioridade(
                  'SEGURANCA'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'FACIL_LOCOMOCAO'
              ),
              '🚶 Fácil locomoção',
              () =>
                alternarPrioridade(
                  'FACIL_LOCOMOCAO'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'VIDA_NOTURNA'
              ),
              '🌙 Boa vida noturna',
              () =>
                alternarPrioridade(
                  'VIDA_NOTURNA'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'ESTRUTURA_TURISTICA'
              ),
              '🏨 Estrutura turística',
              () =>
                alternarPrioridade(
                  'ESTRUTURA_TURISTICA'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'CONHECER_PESSOAS'
              ),
              '👋 Facilidade para conhecer pessoas',
              () =>
                alternarPrioridade(
                  'CONHECER_PESSOAS'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'AGUAS_CALMAS'
              ),
              '🌊 Águas calmas',
              () =>
                alternarPrioridade(
                  'AGUAS_CALMAS'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'CALOR'
              ),
              '☀️ Calor',
              () =>
                alternarPrioridade(
                  'CALOR'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'FRIO'
              ),
              '❄️ Frio',
              () =>
                alternarPrioridade(
                  'FRIO'
                )
            )}

            {botaoOpcao(
              prioridades.includes(
                'VENTOS'
              ),
              '💨 Ventos',
              () =>
                alternarPrioridade(
                  'VENTOS'
                )
            )}
          </View>
        </View>

        {/* INDISPENSÁVEL */}
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
            Tem algo que é
            indispensável nessa
            viagem?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Conte o que o destino
            realmente precisa ter.
            A maIA dará mais
            importância a esses
            requisitos.
          </Text>

          <TextInput
            style={
              styles.textArea
            }
            placeholder="Ex.: Quero praia com mar calmo e falésias. Preciso conseguir fazer a maioria das coisas a pé e não quero depender de carro."
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            value={
              requisitosIndispensaveis
            }
            onChangeText={
              setRequisitosIndispensaveis
            }
            textAlignVertical="top"
          />
        </View>

        {/* OBSERVAÇÕES */}
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
            Quer contar mais
            alguma coisa?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Este espaço é para
            outras preferências,
            desejos ou detalhes
            que possam ajudar a
            maIA a entender melhor
            sua viagem.
          </Text>

          <TextInput
            style={
              styles.textArea
            }
            placeholder="Ex.: Quero praia de água quente e calma, vida noturna perto, não quero depender de carro..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            value={
              observacoes
            }
            onChangeText={
              setObservacoes
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
              ENCONTRAR MEU
              DESTINO
            </Text>
          )}
        </Pressable>

        {/* RESULTADOS */}
        {destinosRecomendados
          .length > 0 && (
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
              RECOMENDAÇÕES DA
              maIA
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
              planejamento e
              encontrou estas
              opções.
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
                    ?.length > 0 && (
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
                    ?.length > 0 && (
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
                    ?.length > 0 && (
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
                        pathname:
                          '/confirmar-viagem' as any,

                        params: {
                          cidade:
                            destinoItem.cidade,

                          estado:
                            destinoItem.estadoOuRegiao,

                          pais:
                            destinoItem.pais,
                        },
                      })
                    }
                  >
                    <Text
                      style={
                        styles.chooseDestinationButtonText
                      }
                    >
                      QUERO IR PARA ESTE DESTINO ✈️
                    </Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>
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
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      alignItems: 'center',
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
      flexDirection: 'row',
      alignItems: 'center',
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
      flexDirection: 'row',
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
      alignItems: 'center',
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
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 20,
    },

    chooseDestinationButtonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.2,
      textAlign: 'center',
    },
  });