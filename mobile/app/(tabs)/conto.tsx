import { API_URL } from '@/services/api';
import { buscarUsuario } from '@/services/auth';
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
  usuarioId: number;
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

type Avaliacao = {
  id: number;
  visitaId: number;
  usuarioId: number;

  nomeLocal: string;
  categoria: string;
  endereco: string;

  notaGeral: number;
  seguranca: number;
  iriaSozinha: boolean | null;
  percepcaoEntorno: string | null;
  comentario: string;
  criadaEm: string;
};

type Aba = 'pendentes' | 'avaliacoes';

export default function ContoScreen() {
  const [abaAtiva, setAbaAtiva] =
    useState<Aba>('pendentes');

  const [visitas, setVisitas] =
    useState<Visita[]>([]);

  const [avaliacoes, setAvaliacoes] =
    useState<Avaliacao[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [atualizando, setAtualizando] =
    useState(false);

  const [erro, setErro] =
    useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setErro('');

      const usuario =
        await buscarUsuario();

      if (!usuario?.id) {
        setVisitas([]);
        setAvaliacoes([]);

        setErro(
          'Não foi possível identificar a usuária logada.'
        );

        return;
      }

      const [
        responsePendentes,
        responseAvaliacoes,
      ] = await Promise.all([
        fetch(
          `${API_URL}/visitas/pendentes?usuarioId=${usuario.id}`
        ),
        fetch(
          `${API_URL}/avaliacoes/minhas?usuarioId=${usuario.id}`
        ),
      ]);

      if (!responsePendentes.ok) {
        throw new Error(
          `Erro ao buscar pendentes: ${responsePendentes.status}`
        );
      }

      if (!responseAvaliacoes.ok) {
        throw new Error(
          `Erro ao buscar avaliações: ${responseAvaliacoes.status}`
        );
      }

      const dadosPendentes: Visita[] =
        await responsePendentes.json();

      const dadosAvaliacoes: Avaliacao[] =
        await responseAvaliacoes.json();

      setVisitas(dadosPendentes);
      setAvaliacoes(dadosAvaliacoes);
    } catch (error) {
      console.error(
        'Erro ao carregar EU CONTO!:',
        error
      );

      setErro(
        'Não foi possível carregar suas experiências.'
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  async function atualizar() {
    setAtualizando(true);

    await carregarDados();
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

  function formatarEntorno(
    percepcao?: string | null
  ) {
    switch (percepcao) {
      case 'TRANQUILO_MOVIMENTADO':
        return 'Tranquilo e movimentado';

      case 'TRANQUILO_POUCO_MOVIMENTADO':
        return 'Tranquilo, mas pouco movimentado';

      case 'DESCONFORTAVEL':
        return 'Um pouco desconfortável';

      case 'INSEGURO':
        return 'Inseguro';

      default:
        return 'Não informado';
    }
  }

  function renderEstrelas(
    nota: number
  ) {
    return (
      `${'★'.repeat(nota)}` +
      `${'☆'.repeat(5 - nota)}`
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
          Suas experiências
        </Text>

        <Text style={styles.subtitle}>
          Avalie os lugares que você
          visitou e acompanhe o que já
          contou para a comunidade MAIA.
        </Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tab,
            abaAtiva === 'pendentes' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setAbaAtiva('pendentes')
          }
        >
          <Text
            style={[
              styles.tabText,
              abaAtiva === 'pendentes' &&
                styles.tabTextActive,
            ]}
          >
            Para avaliar
          </Text>

          {visitas.length > 0 && (
            <View
              style={
                styles.tabCounter
              }
            >
              <Text
                style={
                  styles.tabCounterText
                }
              >
                {visitas.length}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            abaAtiva === 'avaliacoes' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setAbaAtiva('avaliacoes')
          }
        >
          <Text
            style={[
              styles.tabText,
              abaAtiva === 'avaliacoes' &&
                styles.tabTextActive,
            ]}
          >
            Minhas avaliações
          </Text>
        </Pressable>
      </View>

      {erro ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {erro}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={carregarDados}
          >
            <Text
              style={styles.retryText}
            >
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : abaAtiva ===
        'pendentes' ? (
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
                Quando você fizer
                check-out de um lugar,
                ele aparecerá aqui para
                avaliação.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View
                style={styles.cardTop}
              >
                <View
                  style={styles.iconBox}
                >
                  <Text
                    style={
                      styles.iconText
                    }
                  >
                    ✦
                  </Text>
                </View>

                <View
                  style={
                    styles.cardMain
                  }
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
                style={styles.address}
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
      ) : (
        <FlatList
          data={avaliacoes}
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
            avaliacoes.length === 0
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
                💜
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Nenhuma avaliação ainda
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Depois que você contar
                como foi uma experiência,
                sua avaliação aparecerá
                aqui.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={
                styles.evaluationCard
              }
            >
              <View
                style={
                  styles.evaluationHeader
                }
              >
                <View
                  style={
                    styles.evaluationPlace
                  }
                >
                  <Text
                    style={
                      styles.evaluationTitle
                    }
                  >
                    {item.nomeLocal}
                  </Text>

                  <Text
                    style={
                      styles.evaluationCategory
                    }
                  >
                    {item.categoria}
                  </Text>
                </View>

                <View
                  style={
                    styles.evaluationBadge
                  }
                >
                  <Text
                    style={
                      styles.evaluationBadgeText
                    }
                  >
                    AVALIADO
                  </Text>
                </View>
              </View>

              {!!item.endereco && (
                <Text
                  style={
                    styles.evaluationAddress
                  }
                >
                  {item.endereco}
                </Text>
              )}

              <Text
                style={
                  styles.evaluationDate
                }
              >
                Avaliado em{' '}
                {formatarData(
                  item.criadaEm
                )}
              </Text>

              <Text
                style={
                  styles.stars
                }
              >
                {renderEstrelas(
                  item.notaGeral
                )}
              </Text>

              <View
                style={
                  styles.evaluationInfo
                }
              >
                <Text
                  style={
                    styles.evaluationLabel
                  }
                >
                  Segurança
                </Text>

                <Text
                  style={
                    styles.evaluationValue
                  }
                >
                  {item.seguranca}/5
                </Text>
              </View>

              <View
                style={
                  styles.evaluationInfo
                }
              >
                <Text
                  style={
                    styles.evaluationLabel
                  }
                >
                  Iria sozinha
                </Text>

                <Text
                  style={
                    styles.evaluationValue
                  }
                >
                  {item.iriaSozinha ===
                  null
                    ? 'Não informado'
                    : item.iriaSozinha
                    ? 'Sim'
                    : 'Não'}
                </Text>
              </View>

              <View
                style={
                  styles.evaluationInfoColumn
                }
              >
                <Text
                  style={
                    styles.evaluationLabel
                  }
                >
                  Entorno
                </Text>

                <Text
                  style={
                    styles.evaluationValue
                  }
                >
                  {formatarEntorno(
                    item.percepcaoEntorno
                  )}
                </Text>
              </View>

              {!!item.comentario && (
                <>
                  <View
                    style={
                      styles.divider
                    }
                  />

                  <Text
                    style={
                      styles.comment
                    }
                  >
                    “{item.comentario}”
                  </Text>
                </>
              )}
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
      marginBottom: 20,
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

    tabs: {
      flexDirection: 'row',
      backgroundColor:
        '#ececf2',
      padding: 4,
      borderRadius: 14,
      marginBottom: 20,
    },

    tab: {
      flex: 1,
      minHeight: 44,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingHorizontal: 8,
    },

    tabActive: {
      backgroundColor:
        '#ffffff',
    },

    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#777777',
    },

    tabTextActive: {
      color: '#6d28d9',
    },

    tabCounter: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 10,
      backgroundColor:
        '#6d28d9',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },

    tabCounterText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
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
      paddingBottom: 50,
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
      textAlign: 'center',
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
        '#eeeef3',
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

    evaluationCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 18,
      padding: 17,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        '#e7e7ee',
    },

    evaluationHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },

    evaluationPlace: {
      flex: 1,
      marginRight: 12,
    },

    evaluationTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#222222',
    },

    evaluationCategory: {
      fontSize: 13,
      color: '#6d28d9',
      fontWeight: '700',
      marginTop: 3,
    },

    evaluationAddress: {
      fontSize: 13,
      color: '#666666',
      lineHeight: 19,
      marginBottom: 5,
    },

    evaluationDate: {
      fontSize: 11,
      color: '#888888',
      marginBottom: 12,
    },

    evaluationBadge: {
      backgroundColor:
        '#f1ebff',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },

    evaluationBadgeText: {
      color: '#6d28d9',
      fontSize: 10,
      fontWeight: '800',
    },

    stars: {
      fontSize: 23,
      color: '#6d28d9',
      marginBottom: 14,
    },

    evaluationInfo: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },

    evaluationInfoColumn: {
      marginTop: 2,
      marginBottom: 8,
    },

    evaluationLabel: {
      fontSize: 12,
      color: '#888888',
      fontWeight: '700',
      marginBottom: 3,
    },

    evaluationValue: {
      fontSize: 14,
      color: '#444444',
      fontWeight: '600',
    },

    comment: {
      fontSize: 14,
      lineHeight: 20,
      color: '#555555',
      fontStyle: 'italic',
    },
  });