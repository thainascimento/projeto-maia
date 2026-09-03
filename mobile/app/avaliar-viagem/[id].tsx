import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
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

type ExperienciaNoturna =
  | 'TRANQUILA'
  | 'COM_ATENCAO'
  | 'EVITARIA'
  | 'NAO_SAI';

export default function AvaliarViagemScreen() {
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

  const viagemId =
    Number(
      params.id
    );

  const destino =
    typeof params.destino ===
    'string'
      ? params.destino
      : '';

  const cidade =
    typeof params.cidade ===
    'string'
      ? params.cidade
      : '';

  const estado =
    typeof params.estado ===
    'string'
      ? params.estado
      : '';

  const pais =
    typeof params.pais ===
    'string'
      ? params.pais
      : '';

  const dataInicio =
    typeof params.dataInicio ===
    'string'
      ? params.dataInicio
      : '';

  const dataFim =
    typeof params.dataFim ===
    'string'
      ? params.dataFim
      : '';

  const [
    notaGeral,
    setNotaGeral,
  ] =
    useState(0);

  const [
    seguranca,
    setSeguranca,
  ] =
    useState(0);

  const [
    viajariaSozinhaNovamente,
    setViajariaSozinhaNovamente,
  ] =
    useState<
      boolean | null
    >(null);

  const [
    facilidadeLocomocao,
    setFacilidadeLocomocao,
  ] =
    useState(0);

  const [
    experienciaNoturna,
    setExperienciaNoturna,
  ] =
    useState<
      ExperienciaNoturna | null
    >(null);

  const [
    estruturaTuristica,
    setEstruturaTuristica,
  ] =
    useState(0);

  const [
    recomendariaParaMulherSozinha,
    setRecomendariaParaMulherSozinha,
  ] =
    useState<
      boolean | null
    >(null);

  const [
    melhorRegiaoHospedagem,
    setMelhorRegiaoHospedagem,
  ] =
    useState('');

  const [
    pontosPositivos,
    setPontosPositivos,
  ] =
    useState('');

  const [
    pontosAtencao,
    setPontosAtencao,
  ] =
    useState('');

  const [
    sentiuInsegura,
    setSentiuInsegura,
  ] =
    useState<
      boolean | null
    >(null);

  const [
    relatoInseguranca,
    setRelatoInseguranca,
  ] =
    useState('');

  const [
    comentario,
    setComentario,
  ] =
    useState('');

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  function formatarData(
    data: string
  ) {
    if (!data) {
      return '';
    }

    const [
      ano,
      mes,
      dia,
    ] =
      data.split('-');

    return `${dia}/${mes}/${ano}`;
  }

  function renderEstrelas(
    valor: number,
    alterar:
      React.Dispatch<
        React.SetStateAction<number>
      >
  ) {
    return (
      <View
        style={
          styles.starsRow
        }
      >
        {[1, 2, 3, 4, 5].map(
          (estrela) => (
            <Pressable
              key={
                estrela
              }
              onPress={() =>
                alterar(
                  estrela
                )
              }
            >
              <Text
                style={[
                  styles.starButton,

                  estrela <=
                    valor &&
                    styles.starButtonSelected,
                ]}
              >
                ★
              </Text>
            </Pressable>
          )
        )}
      </View>
    );
  }

  function botaoBinario(
    texto: string,
    selecionado: boolean,
    onPress: () => void
  ) {
    return (
      <Pressable
        style={[
          styles.optionButton,

          selecionado &&
            styles.optionButtonSelected,
        ]}
        onPress={
          onPress
        }
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

  function botaoNoturno(
    valor:
      ExperienciaNoturna,
    texto: string
  ) {
    const selecionado =
      experienciaNoturna ===
      valor;

    return (
      <Pressable
        style={[
          styles.optionButton,

          selecionado &&
            styles.optionButtonSelected,
        ]}
        onPress={() =>
          setExperienciaNoturna(
            valor
          )
        }
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

  async function enviarAvaliacao() {
    if (
      !Number.isFinite(
        viagemId
      )
    ) {
      Alert.alert(
        'Viagem inválida',
        'Não foi possível identificar a viagem.'
      );

      return;
    }

    if (
      notaGeral < 1
    ) {
      Alert.alert(
        'Falta uma avaliação',
        'Informe sua nota geral para o destino.'
      );

      return;
    }

    if (
      seguranca < 1
    ) {
      Alert.alert(
        'Falta uma avaliação',
        'Informe como você avaliou a segurança.'
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

      const avaliacao = {
        viagemId,

        usuarioId:
          usuario.id,

        notaGeral,

        seguranca,

        viajariaSozinhaNovamente,

        facilidadeLocomocao:
          facilidadeLocomocao >
          0
            ? facilidadeLocomocao
            : null,

        experienciaNoturna,

        estruturaTuristica:
          estruturaTuristica >
          0
            ? estruturaTuristica
            : null,

        recomendariaParaMulherSozinha,

        melhorRegiaoHospedagem:
          melhorRegiaoHospedagem.trim(),

        pontosPositivos:
          pontosPositivos.trim(),

        pontosAtencao:
          pontosAtencao.trim(),

        sentiuInsegura,

        relatoInseguranca:
          sentiuInsegura
            ? relatoInseguranca.trim()
            : '',

        comentario:
          comentario.trim(),
      };

      console.log(
        'Enviando avaliação da viagem:',
        avaliacao
      );

      const response =
        await fetch(
          `${API_URL}/avaliacoes-viagens`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                avaliacao
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

      await response.json();

      Alert.alert(
        'Experiência compartilhada 💜',
        'Sua avaliação da viagem foi salva.',
        [
          {
            text:
              'Voltar ao EU CONTO!',

            onPress: () =>
              router.replace(
                '/(tabs)/conto'
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Erro ao avaliar viagem:',
        error
      );

      Alert.alert(
        'Não foi possível salvar',
        'Tivemos um problema ao salvar sua avaliação. Tente novamente.'
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
          EU CONTO!
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Como foi sua viagem?
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Conte sua experiência
          para ajudar outras
          mulheres que também
          querem viajar sozinhas.
        </Text>

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
              ✈
            </Text>
          </View>

          <View
            style={
              styles.destinationMain
            }
          >
            <Text
              style={
                styles.destinationLabel
              }
            >
              DESTINO
            </Text>

            <Text
              style={
                styles.destinationName
              }
            >
              {destino}
            </Text>

            <Text
              style={
                styles.destinationLocation
              }
            >
              {[
                cidade,
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

            <Text
              style={
                styles.destinationPeriod
              }
            >
              {formatarData(
                dataInicio
              )}
              {'  →  '}
              {formatarData(
                dataFim
              )}
            </Text>
          </View>
        </View>

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
            Nota geral do destino
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Considerando sua
            experiência como um
            todo.
          </Text>

          {renderEstrelas(
            notaGeral,
            setNotaGeral
          )}
        </View>

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
            Quanto você se sentiu
            segura?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            1 significa muito
            insegura e 5 muito
            segura.
          </Text>

          {renderEstrelas(
            seguranca,
            setSeguranca
          )}
        </View>

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
            Você viajaria sozinha
            para esse destino
            novamente?
          </Text>

          <View
            style={
              styles.optionsRow
            }
          >
            {botaoBinario(
              'Sim',
              viajariaSozinhaNovamente ===
                true,
              () =>
                setViajariaSozinhaNovamente(
                  true
                )
            )}

            {botaoBinario(
              'Não',
              viajariaSozinhaNovamente ===
                false,
              () =>
                setViajariaSozinhaNovamente(
                  false
                )
            )}
          </View>
        </View>

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
            Era fácil se locomover
            sem carro?
          </Text>

          {renderEstrelas(
            facilidadeLocomocao,
            setFacilidadeLocomocao
          )}
        </View>

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
            Como foi sair à noite
            sozinha?
          </Text>

          <View
            style={
              styles.optionsWrap
            }
          >
            {botaoNoturno(
              'TRANQUILA',
              'Tranquilo'
            )}

            {botaoNoturno(
              'COM_ATENCAO',
              'Com atenção'
            )}

            {botaoNoturno(
              'EVITARIA',
              'Eu evitaria'
            )}

            {botaoNoturno(
              'NAO_SAI',
              'Não saí à noite'
            )}
          </View>
        </View>

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
            Como você avalia a
            estrutura turística?
          </Text>

          {renderEstrelas(
            estruturaTuristica,
            setEstruturaTuristica
          )}
        </View>

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
            Recomendaria esse
            destino para outra
            mulher viajando
            sozinha?
          </Text>

          <View
            style={
              styles.optionsRow
            }
          >
            {botaoBinario(
              'Sim',
              recomendariaParaMulherSozinha ===
                true,
              () =>
                setRecomendariaParaMulherSozinha(
                  true
                )
            )}

            {botaoBinario(
              'Não',
              recomendariaParaMulherSozinha ===
                false,
              () =>
                setRecomendariaParaMulherSozinha(
                  false
                )
            )}
          </View>
        </View>

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
            Melhor região para se
            hospedar
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Opcional.
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: perto da orla, centro, bairro..."
            placeholderTextColor="#999"
            value={
              melhorRegiaoHospedagem
            }
            onChangeText={
              setMelhorRegiaoHospedagem
            }
          />
        </View>

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
            O que você mais gostou?
          </Text>

          <TextInput
            style={
              styles.textArea
            }
            placeholder="Conte os principais pontos positivos..."
            placeholderTextColor="#999"
            multiline
            value={
              pontosPositivos
            }
            onChangeText={
              setPontosPositivos
            }
            textAlignVertical="top"
          />
        </View>

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
            O que exige atenção?
          </Text>

          <TextInput
            style={
              styles.textArea
            }
            placeholder="Ex.: determinada região à noite, transporte, ruas pouco movimentadas..."
            placeholderTextColor="#999"
            multiline
            value={
              pontosAtencao
            }
            onChangeText={
              setPontosAtencao
            }
            textAlignVertical="top"
          />
        </View>

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
            Em algum momento você
            se sentiu insegura ou
            desconfortável?
          </Text>

          <View
            style={
              styles.optionsRow
            }
          >
            {botaoBinario(
              'Sim',
              sentiuInsegura ===
                true,
              () =>
                setSentiuInsegura(
                  true
                )
            )}

            {botaoBinario(
              'Não',
              sentiuInsegura ===
                false,
              () => {
                setSentiuInsegura(
                  false
                );

                setRelatoInseguranca(
                  ''
                );
              }
            )}
          </View>

          {sentiuInsegura ===
            true && (
            <TextInput
              style={[
                styles.textArea,
                styles.extraInput,
              ]}
              placeholder="Se quiser, conte onde ou em que situação isso aconteceu."
              placeholderTextColor="#999"
              multiline
              value={
                relatoInseguranca
              }
              onChangeText={
                setRelatoInseguranca
              }
              textAlignVertical="top"
            />
          )}
        </View>

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

          <TextInput
            style={
              styles.textAreaLarge
            }
            placeholder="Conte sua experiência com suas próprias palavras..."
            placeholderTextColor="#999"
            multiline
            value={
              comentario
            }
            onChangeText={
              setComentario
            }
            textAlignVertical="top"
          />
        </View>

        <View
          style={
            styles.communityBox
          }
        >
          <Text
            style={
              styles.communityTitle
            }
          >
            💜 Sua experiência
            importa
          </Text>

          <Text
            style={
              styles.communityText
            }
          >
            Essas informações
            poderão ajudar outras
            mulheres a conhecer
            melhor o destino antes
            de viajar.
          </Text>
        </View>

        <Pressable
          style={[
            styles.saveButton,

            salvando &&
              styles.buttonDisabled,
          ]}
          onPress={
            enviarAvaliacao
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
                  styles.saveButtonText
                }
              >
                SALVANDO...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.saveButtonText
              }
            >
              CONTAR MINHA
              EXPERIÊNCIA
            </Text>
          )}
        </Pressable>
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
      paddingTop: 54,
      paddingHorizontal: 20,
      paddingBottom: 70,
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
      marginBottom: 22,
    },

    backText: {
      fontSize: 32,
      color: '#6d28d9',
      marginTop: -3,
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: '800',
      color: '#6d28d9',
      letterSpacing: 1.5,
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
      marginBottom: 24,
    },

    destinationCard: {
      flexDirection:
        'row',
      backgroundColor:
        '#ffffff',
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        '#e5e5ec',
      padding: 16,
      alignItems:
        'center',
      marginBottom: 28,
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
      fontSize: 22,
      color: '#6d28d9',
    },

    destinationMain: {
      flex: 1,
    },

    destinationLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.8,
      marginBottom: 3,
    },

    destinationName: {
      fontSize: 20,
      fontWeight: '800',
      color: '#222222',
    },

    destinationLocation: {
      fontSize: 12,
      color: '#777777',
      marginTop: 3,
    },

    destinationPeriod: {
      fontSize: 12,
      fontWeight: '600',
      color: '#555555',
      marginTop: 5,
    },

    section: {
      marginBottom: 27,
    },

    sectionTitle: {
      fontSize: 18,
      lineHeight: 23,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 6,
    },

    helper: {
      fontSize: 13,
      lineHeight: 19,
      color: '#777777',
      marginBottom: 10,
    },

    starsRow: {
      flexDirection:
        'row',
      gap: 8,
    },

    starButton: {
      fontSize: 38,
      color: '#d7d4de',
    },

    starButtonSelected: {
      color: '#6d28d9',
    },

    optionsRow: {
      flexDirection:
        'row',
      gap: 9,
    },

    optionsWrap: {
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
      paddingHorizontal: 15,
      paddingVertical: 11,
    },

    optionButtonSelected: {
      backgroundColor:
        '#f1ebff',
      borderColor:
        '#6d28d9',
    },

    optionText: {
      fontSize: 13,
      color: '#555555',
      fontWeight: '700',
    },

    optionTextSelected: {
      color: '#6d28d9',
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
      minHeight: 115,
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

    textAreaLarge: {
      minHeight: 155,
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

    extraInput: {
      marginTop: 12,
    },

    communityBox: {
      backgroundColor:
        '#f7f3ff',
      borderRadius: 15,
      padding: 15,
      marginBottom: 25,
    },

    communityTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#6d28d9',
      marginBottom: 5,
    },

    communityText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#555555',
    },

    saveButton: {
      minHeight: 55,
      backgroundColor:
        '#6d28d9',
      borderRadius: 15,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal: 16,
    },

    saveButtonText: {
      fontSize: 13,
      color: '#ffffff',
      fontWeight: '900',
      letterSpacing: 0.3,
    },

    loadingRow: {
      flexDirection:
        'row',
      gap: 9,
      alignItems:
        'center',
    },

    buttonDisabled: {
      opacity: 0.65,
    },
  });