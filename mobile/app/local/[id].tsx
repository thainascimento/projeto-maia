import { API_URL } from '@/services/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

type Avaliacao = {
  id: number;
  visitaId: number;
  notaGeral: number;
  seguranca: number;
  voltaria: boolean | null;
  iriaSozinha: boolean | null;
  comentario: string;
  criadaEm: string;
};

export default function LocalDetalhesScreen() {
  const params = useLocalSearchParams<{
    id: string;
    nome?: string;
    categoria?: string;
    endereco?: string;
    distancia?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const [visitaAtiva, setVisitaAtiva] =
    useState<Visita | null>(null);

  const [carregando, setCarregando] =
    useState(false);

  const [verificandoVisita, setVerificandoVisita] =
    useState(true);

  const [avaliacoes, setAvaliacoes] =
    useState<Avaliacao[]>([]);

  const [
    carregandoAvaliacoes,
    setCarregandoAvaliacoes,
  ] = useState(true);

  useEffect(() => {
    verificarVisitaAtiva();
    buscarAvaliacoes();
  }, [params.id]);

  async function verificarVisitaAtiva() {
    if (!params.id) {
      setVisitaAtiva(null);
      setVerificandoVisita(false);
      return;
    }

    try {
      setVerificandoVisita(true);

      const response = await fetch(
        `${API_URL}/visitas/ativa/${encodeURIComponent(
          params.id
        )}`
      );

      if (response.status === 204) {
        setVisitaAtiva(null);
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const visita: Visita =
        await response.json();

      setVisitaAtiva(visita);
    } catch (error) {
      console.error(
        'Erro ao verificar visita ativa:',
        error
      );

      setVisitaAtiva(null);
    } finally {
      setVerificandoVisita(false);
    }
  }

  async function buscarAvaliacoes() {
    if (!params.id) {
      setAvaliacoes([]);
      setCarregandoAvaliacoes(false);
      return;
    }

    try {
      setCarregandoAvaliacoes(true);

      const response = await fetch(
        `${API_URL}/avaliacoes/local/${encodeURIComponent(
          params.id
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dados: Avaliacao[] =
        await response.json();

      setAvaliacoes(dados);
    } catch (error) {
      console.error(
        'Erro ao buscar avaliações:',
        error
      );

      setAvaliacoes([]);
    } finally {
      setCarregandoAvaliacoes(false);
    }
  }

  async function fazerCheckIn() {
    if (
      !params.id ||
      !params.nome ||
      !params.categoria ||
      !params.latitude ||
      !params.longitude
    ) {
      Alert.alert(
        'Erro',
        'Não foi possível identificar os dados deste local.'
      );
      return;
    }

    try {
      setCarregando(true);

      const response = await fetch(
        `${API_URL}/visitas/check-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            localId: params.id,
            nomeLocal: params.nome,
            categoria: params.categoria,
            endereco:
              params.endereco ||
              'Endereço não disponível',
            latitude: Number(
              params.latitude
            ),
            longitude: Number(
              params.longitude
            ),
          }),
        }
      );

      if (response.status === 409) {
        Alert.alert(
          'Visita já iniciada',
          'Já existe uma visita ativa neste local.'
        );

        await verificarVisitaAtiva();
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const visita: Visita =
        await response.json();

      setVisitaAtiva(visita);

      Alert.alert(
        'Check-in realizado!',
        'Sua visita foi iniciada com sucesso.'
      );
    } catch (error) {
      console.error(
        'Erro no check-in:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível iniciar a visita.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function fazerCheckOut() {
    if (!visitaAtiva) {
      return;
    }

    try {
      setCarregando(true);

      const response = await fetch(
        `${API_URL}/visitas/${visitaAtiva.id}/check-out`,
        {
          method: 'POST',
        }
      );

      if (response.status === 404) {
        Alert.alert(
          'Visita não encontrada',
          'Não foi possível localizar esta visita.'
        );
        return;
      }

      if (response.status === 409) {
        Alert.alert(
          'Check-out já realizado',
          'Esta visita já foi encerrada.'
        );

        setVisitaAtiva(null);
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const visitaFinalizada: Visita =
        await response.json();

      setVisitaAtiva(null);

      Alert.alert(
        'Visita concluída!',
        'Sua experiência foi enviada para o EU CONTO! para avaliação.'
      );

      console.log(
        'Visita finalizada:',
        visitaFinalizada
      );
    } catch (error) {
      console.error(
        'Erro no check-out:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível realizar o check-out.'
      );
    } finally {
      setCarregando(false);
    }
  }

  function calcularMediaNota() {
    if (avaliacoes.length === 0) {
      return 0;
    }

    const soma = avaliacoes.reduce(
      (total, avaliacao) =>
        total + avaliacao.notaGeral,
      0
    );

    return soma / avaliacoes.length;
  }

  function calcularMediaSeguranca() {
    if (avaliacoes.length === 0) {
      return 0;
    }

    const soma = avaliacoes.reduce(
      (total, avaliacao) =>
        total + avaliacao.seguranca,
      0
    );

    return soma / avaliacoes.length;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>
          ‹ Voltar
        </Text>
      </Pressable>

      <Text style={styles.eyebrow}>
        EU BUSCO!
      </Text>

      <Text style={styles.title}>
        {params.nome || 'Local'}
      </Text>

      <Text style={styles.category}>
        {params.categoria ||
          'Categoria não informada'}
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>
          Endereço
        </Text>

        <Text style={styles.infoText}>
          {params.endereco ||
            'Endereço não disponível'}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>
          Distância
        </Text>

        <Text style={styles.infoText}>
          {params.distancia ||
            'Não calculada'}
        </Text>
      </View>

      <View style={styles.visitCard}>
        <Text style={styles.visitTitle}>
          Sua visita
        </Text>

        {verificandoVisita ? (
          <View style={styles.loadingVisit}>
            <ActivityIndicator />

            <Text style={styles.loadingVisitText}>
              Verificando visita...
            </Text>
          </View>
        ) : visitaAtiva ? (
          <>
            <Text style={styles.visitActiveBadge}>
              VISITA EM ANDAMENTO
            </Text>

            <Text style={styles.visitStatus}>
              Você marcou que está neste local.
            </Text>

            <Text style={styles.visitTime}>
              Check-in realizado em{' '}
              {new Date(
                visitaAtiva.checkIn
              ).toLocaleString('pt-BR')}
            </Text>

            <Pressable
              style={[
                styles.checkoutButton,
                carregando &&
                  styles.buttonDisabled,
              ]}
              onPress={fazerCheckOut}
              disabled={carregando}
            >
              <Text
                style={
                  styles.checkoutButtonText
                }
              >
                {carregando
                  ? 'Finalizando...'
                  : 'FAZER CHECK-OUT'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.visitStatus}>
              Está neste lugar agora?
            </Text>

            <Text style={styles.visitHelper}>
              Marque sua chegada. Quando sair,
              faça o check-out para registrar
              a experiência.
            </Text>

            <Pressable
              style={[
                styles.checkinButton,
                carregando &&
                  styles.buttonDisabled,
              ]}
              onPress={fazerCheckIn}
              disabled={carregando}
            >
              <Text
                style={
                  styles.checkinButtonText
                }
              >
                {carregando
                  ? 'Registrando...'
                  : 'ESTOU AQUI'}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Avaliações MAIA
        </Text>

        {carregandoAvaliacoes ? (
          <View style={styles.loadingEvaluations}>
            <ActivityIndicator />

            <Text
              style={styles.loadingEvaluationsText}
            >
              Buscando avaliações...
            </Text>
          </View>
        ) : avaliacoes.length === 0 ? (
          <Text style={styles.placeholderText}>
            Este local ainda não possui avaliações.
          </Text>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {calcularMediaNota().toFixed(1)}
                </Text>

                <Text style={styles.summaryLabel}>
                  Nota geral
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {calcularMediaSeguranca().toFixed(1)}
                </Text>

                <Text style={styles.summaryLabel}>
                  Segurança
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {avaliacoes.length}
                </Text>

                <Text style={styles.summaryLabel}>
                  Avaliações
                </Text>
              </View>
            </View>

            {avaliacoes.map((avaliacao) => (
              <View
                key={avaliacao.id}
                style={styles.avaliacaoCard}
              >
                <Text style={styles.avaliacaoNota}>
                  {'★'.repeat(
                    avaliacao.notaGeral
                  )}
                  {'☆'.repeat(
                    5 - avaliacao.notaGeral
                  )}
                </Text>

                <Text
                  style={
                    styles.avaliacaoSeguranca
                  }
                >
                  Segurança:{' '}
                  {avaliacao.seguranca}/5
                </Text>

                {!!avaliacao.comentario && (
                  <Text
                    style={
                      styles.avaliacaoComentario
                    }
                  >
                    “{avaliacao.comentario}”
                  </Text>
                )}

                <View
                  style={
                    styles.avaliacaoChoices
                  }
                >
                  <Text
                    style={
                      styles.avaliacaoDetalhe
                    }
                  >
                    Voltaria:{' '}
                    {avaliacao.voltaria === null
                      ? 'Não informado'
                      : avaliacao.voltaria
                      ? 'Sim'
                      : 'Não'}
                  </Text>

                  <Text
                    style={
                      styles.avaliacaoDetalhe
                    }
                  >
                    Iria sozinha:{' '}
                    {avaliacao.iriaSozinha === null
                      ? 'Não informado'
                      : avaliacao.iriaSozinha
                      ? 'Sim'
                      : 'Não'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      <Pressable
        style={styles.saveButton}
        onPress={() => {
          console.log(
            'Salvar na viagem:',
            params.id
          );
        }}
      >
        <Text style={styles.saveButtonText}>
          Salvar na viagem
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
  },

  content: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  backButton: {
    marginBottom: 18,
  },

  backButtonText: {
    fontSize: 16,
    color: '#6d28d9',
    fontWeight: '700',
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#6d28d9',
    marginBottom: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1f1f1f',
    marginBottom: 6,
  },

  category: {
    fontSize: 15,
    color: '#6d28d9',
    marginBottom: 24,
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e6e6ec',
  },

  infoLabel: {
    fontSize: 12,
    color: '#777777',
    fontWeight: '700',
    marginBottom: 6,
  },

  infoText: {
    fontSize: 15,
    color: '#222222',
    lineHeight: 21,
  },

  visitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginTop: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#e6e6ec',
  },

  visitTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#222222',
    marginBottom: 8,
  },

  visitStatus: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 8,
  },

  visitHelper: {
    fontSize: 13,
    color: '#777777',
    lineHeight: 19,
    marginBottom: 14,
  },

  visitTime: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 14,
  },

  visitActiveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1ebff',
    color: '#6d28d9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
  },

  loadingVisit: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingVisitText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#777777',
  },

  checkinButton: {
    backgroundColor: '#6d28d9',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  checkinButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  checkoutButton: {
    backgroundColor: '#222222',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 12,
  },

  placeholderText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },

  loadingEvaluations: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingEvaluationsText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#777777',
  },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6e6ec',
    marginBottom: 14,
    paddingVertical: 16,
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#6d28d9',
    marginBottom: 3,
  },

  summaryLabel: {
    fontSize: 11,
    color: '#777777',
    textAlign: 'center',
  },

  summaryDivider: {
    width: 1,
    backgroundColor: '#ececf2',
  },

  avaliacaoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6e6ec',
  },

  avaliacaoNota: {
    fontSize: 22,
    color: '#6d28d9',
    marginBottom: 8,
  },

  avaliacaoSeguranca: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444444',
    marginBottom: 8,
  },

  avaliacaoComentario: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 12,
  },

  avaliacaoChoices: {
    borderTopWidth: 1,
    borderTopColor: '#eeeef3',
    paddingTop: 10,
  },

  avaliacaoDetalhe: {
    fontSize: 13,
    color: '#777777',
    marginTop: 3,
  },

  saveButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6d28d9',
  },

  saveButtonText: {
    color: '#6d28d9',
    fontSize: 15,
    fontWeight: '700',
  },
});