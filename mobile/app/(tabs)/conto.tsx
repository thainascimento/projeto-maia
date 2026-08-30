import { API_URL } from '@/services/api';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Visita = {
  id: number;
  localId: string;
  nomeLocal: string;
  categoria: string;
  endereco: string;
  latitude: number;
  longitude: number;
  checkIn: string;
  checkOut: string | null;
  avaliada: boolean;
};

export default function ContoScreen() {
  const [visitas, setVisitas] =
    useState<Visita[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [erro, setErro] =
    useState('');

  useEffect(() => {
    carregarPendentes();
  }, []);

  async function carregarPendentes() {
    try {
      setErro('');

      const response = await fetch(
        `${API_URL}/visitas/pendentes`
      );

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dados: Visita[] =
        await response.json();

      setVisitas(dados);
    } catch (error) {
      console.error(
        'Erro ao carregar avaliações pendentes:',
        error
      );

      setErro(
        'Não foi possível carregar suas experiências pendentes.'
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  async function atualizar() {
    setAtualizando(true);
    await carregarPendentes();
  }

  function formatarData(
    data?: string | null
  ) {
    if (!data) {
      return 'Data não disponível';
    }

    return new Date(
      data
    ).toLocaleString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          Buscando suas experiências...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          EU CONTO!
        </Text>

        <Text style={styles.title}>
          Como foi sua experiência?
        </Text>

        <Text style={styles.subtitle}>
          Avalie os lugares que você visitou e ajude outras viajantes.
        </Text>
      </View>

      {erro ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {erro}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={carregarPendentes}
          >
            <Text
              style={styles.retryText}
            >
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visitas}
          keyExtractor={(item) =>
            String(item.id)
          }
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizar}
            />
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            visitas.length === 0
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
                ✨
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Tudo contado por aqui
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Quando você fizer check-out de um lugar, ele aparecerá aqui para avaliação.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View
                  style={styles.iconBox}
                >
                  <Text
                    style={styles.iconText}
                  >
                    ✦
                  </Text>
                </View>

                <View
                  style={styles.cardMain}
                >
                  <Text
                    style={
                      styles.localName
                    }
                  >
                    {item.nomeLocal}
                  </Text>

                  <Text
                    style={
                      styles.category
                    }
                  >
                    {item.categoria}
                  </Text>
                </View>
              </View>

              <View
                style={styles.divider}
              />

              <Text
                style={styles.label}
              >
                Endereço
              </Text>

              <Text
                style={
                  styles.address
                }
              >
                {item.endereco ||
                  'Endereço não disponível'}
              </Text>

              <Text
                style={[
                  styles.label,
                  styles.dateLabel,
                ]}
              >
                Visitado em
              </Text>

              <Text
                style={styles.dateText}
              >
                {formatarData(
                  item.checkOut
                )}
              </Text>

              <Pressable
                style={
                  styles.evaluateButton
                }
                onPress={() => {
                  router.push({
                    pathname:
                      '/avaliar/[id]' as any,
                    params: {
                      id: String(
                        item.id
                      ),
                      nome:
                        item.nomeLocal,
                      categoria:
                        item.categoria,
                      endereco:
                        item.endereco,
                    },
                  });
                }}
              >
                <Text
                  style={
                    styles.evaluateButtonText
                  }
                >
                  AVALIAR EXPERIÊNCIA
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#f7f7fb',
      paddingTop: 56,
      paddingHorizontal: 20,
    },

    header: {
      marginBottom: 22,
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
      lineHeight: 20,
      color: '#666666',
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#f7f7fb',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#777777',
    },

    errorBox: {
      alignItems: 'center',
      paddingTop: 40,
    },

    errorText: {
      textAlign: 'center',
      fontSize: 14,
      color: '#555555',
      marginBottom: 14,
    },

    retryButton: {
      backgroundColor:
        '#6d28d9',
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
    },

    retryText: {
      color: '#ffffff',
      fontWeight: '700',
    },

    list: {
      paddingBottom: 40,
    },

    emptyList: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingBottom: 80,
    },

    emptyEmoji: {
      fontSize: 42,
      marginBottom: 12,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 8,
    },

    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#777777',
      textAlign: 'center',
    },

    card: {
      backgroundColor:
        '#ffffff',
      borderRadius: 18,
      padding: 17,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        '#e7e7ee',
    },

    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        '#f1ebff',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    iconText: {
      fontSize: 21,
      color: '#6d28d9',
      fontWeight: '800',
    },

    cardMain: {
      flex: 1,
    },

    localName: {
      fontSize: 18,
      fontWeight: '800',
      color: '#222222',
      marginBottom: 3,
    },

    category: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6d28d9',
    },

    divider: {
      height: 1,
      backgroundColor:
        '#eeeeF3',
      marginVertical: 14,
    },

    label: {
      fontSize: 11,
      fontWeight: '700',
      color: '#888888',
      marginBottom: 4,
    },

    address: {
      fontSize: 14,
      lineHeight: 20,
      color: '#444444',
    },

    dateLabel: {
      marginTop: 14,
    },

    dateText: {
      fontSize: 14,
      color: '#444444',
      marginBottom: 16,
    },

    evaluateButton: {
      backgroundColor:
        '#6d28d9',
      borderRadius: 13,
      paddingVertical: 14,
      alignItems: 'center',
    },

    evaluateButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
  });