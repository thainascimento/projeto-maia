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

type GeocodingResponse = {
  nome: string;
  latitude: number;
  longitude: number;
};

export default function ConfirmarViagemScreen() {
  const params =
    useLocalSearchParams<{
      cidade?: string;
      estado?: string;
      pais?: string;
    }>();

  const cidade =
    typeof params.cidade === 'string'
      ? params.cidade
      : '';

  const estado =
    typeof params.estado === 'string'
      ? params.estado
      : '';

  const pais =
    typeof params.pais === 'string'
      ? params.pais
      : '';

  const [
    dataInicio,
    setDataInicio,
  ] = useState('');

  const [
    dataFim,
    setDataFim,
  ] = useState('');

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  function formatarEntradaData(
    valor: string
  ) {
    const numeros =
      valor
        .replace(/\D/g, '')
        .slice(0, 8);

    if (
      numeros.length <= 2
    ) {
      return numeros;
    }

    if (
      numeros.length <= 4
    ) {
      return (
        numeros.slice(0, 2) +
        '/' +
        numeros.slice(2)
      );
    }

    return (
      numeros.slice(0, 2) +
      '/' +
      numeros.slice(2, 4) +
      '/' +
      numeros.slice(4)
    );
  }

  function converterData(
    data: string
  ) {
    const partes =
      data
        .trim()
        .split('/');

    if (
      partes.length !== 3
    ) {
      return null;
    }

    const [
      diaTexto,
      mesTexto,
      anoTexto,
    ] = partes;

    const dia =
      Number(diaTexto);

    const mes =
      Number(mesTexto);

    const ano =
      Number(anoTexto);

    if (
      !Number.isInteger(dia) ||
      !Number.isInteger(mes) ||
      !Number.isInteger(ano)
    ) {
      return null;
    }

    if (
      ano < 2000 ||
      mes < 1 ||
      mes > 12 ||
      dia < 1 ||
      dia > 31
    ) {
      return null;
    }

    const dataTeste =
      new Date(
        Date.UTC(
          ano,
          mes - 1,
          dia
        )
      );

    if (
      dataTeste.getUTCFullYear() !==
        ano ||
      dataTeste.getUTCMonth() !==
        mes - 1 ||
      dataTeste.getUTCDate() !==
        dia
    ) {
      return null;
    }

    const mesFormatado =
      String(mes)
        .padStart(
          2,
          '0'
        );

    const diaFormatado =
      String(dia)
        .padStart(
          2,
          '0'
        );

    return (
      `${ano}-` +
      `${mesFormatado}-` +
      `${diaFormatado}`
    );
  }

  async function buscarCoordenadas() {
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
      partes.join(', ');

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

    const coordenadas: GeocodingResponse =
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
    if (!cidade.trim()) {
      Alert.alert(
        'Destino inválido',
        'Não foi possível identificar o destino escolhido.'
      );

      return;
    }

    if (
      !dataInicio.trim() ||
      !dataFim.trim()
    ) {
      Alert.alert(
        'Faltam as datas',
        'Informe a data de ida e a data de volta.'
      );

      return;
    }

    const inicio =
      converterData(
        dataInicio
      );

    const fim =
      converterData(
        dataFim
      );

    if (
      !inicio ||
      !fim
    ) {
      Alert.alert(
        'Data inválida',
        'Informe as datas no formato DD/MM/AAAA.'
      );

      return;
    }

    if (
      fim < inicio
    ) {
      Alert.alert(
        'Período inválido',
        'A data de volta não pode ser anterior à data de ida.'
      );

      return;
    }

    try {
      setSalvando(true);

      const usuario =
        await buscarUsuario();

      if (!usuario?.id) {
        Alert.alert(
          'Sessão inválida',
          'Não foi possível identificar a usuária logada.'
        );

        return;
      }

      /*
       * 1. Busca latitude
       * e longitude do destino.
       */
      const coordenadas =
        await buscarCoordenadas();

      console.log(
        'Coordenadas encontradas:',
        coordenadas
      );

      /*
       * 2. Monta a viagem
       * já com as coordenadas.
       */
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
          inicio,

        dataFim:
          fim,
      };

      console.log(
        'Criando viagem:',
        viagem
      );

      /*
       * 3. Salva no backend.
       */
      const response =
        await fetch(
          `${API_URL}/viagens`,
          {
            method: 'POST',

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

      if (!response.ok) {
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
        'Viagem confirmada ✈️',
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
      setSalvando(false);
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
          Vamos confirmar sua
          viagem?
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Você escolheu um dos
          destinos recomendados
          pela maIA. Agora só
          precisamos das datas
          exatas.
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
                .filter(Boolean)
                .join(', ')}
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
            Quando você vai?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Digite apenas os
            números. As barras
            serão adicionadas
            automaticamente.
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: 10/04/2027"
            placeholderTextColor="#999"
            value={
              dataInicio
            }
            onChangeText={(
              texto
            ) =>
              setDataInicio(
                formatarEntradaData(
                  texto
                )
              )
            }
            keyboardType="number-pad"
            maxLength={10}
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
            Quando você volta?
          </Text>

          <Text
            style={
              styles.helper
            }
          >
            Digite apenas os
            números. As barras
            serão adicionadas
            automaticamente.
          </Text>

          <TextInput
            style={
              styles.input
            }
            placeholder="Ex.: 17/04/2027"
            placeholderTextColor="#999"
            value={
              dataFim
            }
            onChangeText={(
              texto
            ) =>
              setDataFim(
                formatarEntradaData(
                  texto
                )
              )
            }
            keyboardType="number-pad"
            maxLength={10}
          />
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
            Essa viagem aparecerá
            em Minhas Viagens.
            Quando chegar a data,
            a maIA poderá acompanhar
            você durante o destino.
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
                LOCALIZANDO E
                SALVANDO...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.confirmButtonText
              }
            >
              CONFIRMAR VIAGEM ✈️
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
      alignItems: 'center',
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

    destinationCard: {
      flexDirection: 'row',
      alignItems: 'center',
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
      alignItems: 'center',
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
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 15,
    },

    confirmButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.3,
      textAlign: 'center',
    },

    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    buttonDisabled: {
      opacity: 0.65,
    },
  });