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

type ViagemPendente = {
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
  avaliada: boolean;

  criadaEm: string;

  status:
    | 'PLANEJADA'
    | 'EM_ANDAMENTO'
    | 'FINALIZADA'
    | 'CANCELADA';
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

type AvaliacaoViagem = {
  id: number;
  viagemId: number;
  usuarioId: number;

  destino: string;

  cidade: string | null;
  estado: string | null;
  pais: string | null;

  dataInicio: string;
  dataFim: string;

  notaGeral: number;
  seguranca: number;

  viajariaSozinhaNovamente:
    | boolean
    | null;

  facilidadeLocomocao:
    | number
    | null;

  experienciaNoturna:
    | string
    | null;

  estruturaTuristica:
    | number
    | null;

  recomendariaParaMulherSozinha:
    | boolean
    | null;

  melhorRegiaoHospedagem:
    | string
    | null;

  pontosPositivos:
    | string
    | null;

  pontosAtencao:
    | string
    | null;

  sentiuInsegura:
    | boolean
    | null;

  relatoInseguranca:
    | string
    | null;

  comentario:
    | string
    | null;

  criadaEm: string;
};

type ItemPendente =
  | {
      tipo: 'VIAGEM';
      viagem: ViagemPendente;
    }
  | {
      tipo: 'LOCAL';
      visita: Visita;
    };

type ItemAvaliacao =
  | {
      tipo: 'VIAGEM';
      avaliacao: AvaliacaoViagem;
    }
  | {
      tipo: 'LOCAL';
      avaliacao: Avaliacao;
    };

type Aba =
  | 'pendentes'
  | 'avaliacoes';

export default function ContoScreen() {
  const [
    abaAtiva,
    setAbaAtiva,
  ] =
    useState<Aba>(
      'pendentes'
    );

  const [
    visitas,
    setVisitas,
  ] =
    useState<Visita[]>(
      []
    );

  const [
    viagensPendentes,
    setViagensPendentes,
  ] =
    useState<
      ViagemPendente[]
    >([]);

  const [
    avaliacoes,
    setAvaliacoes,
  ] =
    useState<
      Avaliacao[]
    >([]);

  const [
    avaliacoesViagens,
    setAvaliacoesViagens,
  ] =
    useState<
      AvaliacaoViagem[]
    >([]);

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
        setViagensPendentes([]);
        setAvaliacoes([]);
        setAvaliacoesViagens([]);

        setErro(
          'Não foi possível identificar a usuária logada.'
        );

        return;
      }

      const [
        responseVisitasPendentes,
        responseViagensPendentes,
        responseAvaliacoes,
        responseAvaliacoesViagens,
      ] =
        await Promise.all([
          fetch(
            `${API_URL}/visitas/pendentes?usuarioId=${usuario.id}`
          ),

          fetch(
            `${API_URL}/avaliacoes-viagens/pendentes?usuarioId=${usuario.id}`
          ),

          fetch(
            `${API_URL}/avaliacoes/minhas?usuarioId=${usuario.id}`
          ),

          fetch(
            `${API_URL}/avaliacoes-viagens/minhas?usuarioId=${usuario.id}`
          ),
        ]);

      if (
        !responseVisitasPendentes.ok
      ) {
        throw new Error(
          `Erro ao buscar visitas pendentes: ${responseVisitasPendentes.status}`
        );
      }

      if (
        !responseViagensPendentes.ok
      ) {
        throw new Error(
          `Erro ao buscar viagens pendentes: ${responseViagensPendentes.status}`
        );
      }

      if (
        !responseAvaliacoes.ok
      ) {
        throw new Error(
          `Erro ao buscar avaliações de locais: ${responseAvaliacoes.status}`
        );
      }

      if (
        !responseAvaliacoesViagens.ok
      ) {
        throw new Error(
          `Erro ao buscar avaliações de viagens: ${responseAvaliacoesViagens.status}`
        );
      }

      const dadosVisitas:
        Visita[] =
          await responseVisitasPendentes.json();

      const dadosViagens:
        ViagemPendente[] =
          await responseViagensPendentes.json();

      const dadosAvaliacoes:
        Avaliacao[] =
          await responseAvaliacoes.json();

      const dadosAvaliacoesViagens:
        AvaliacaoViagem[] =
          await responseAvaliacoesViagens.json();

      console.log(
        'VISITAS PARA AVALIAR:',
        dadosVisitas
      );

      console.log(
        'VIAGENS PARA AVALIAR:',
        dadosViagens
      );

      console.log(
        'AVALIAÇÕES DE LOCAIS:',
        dadosAvaliacoes
      );

      console.log(
        'AVALIAÇÕES DE VIAGENS:',
        dadosAvaliacoesViagens
      );

      setVisitas(
        dadosVisitas
      );

      setViagensPendentes(
        dadosViagens
      );

      setAvaliacoes(
        dadosAvaliacoes
      );

      setAvaliacoesViagens(
        dadosAvaliacoesViagens
      );
    } catch (error) {
      console.error(
        'Erro ao carregar EU CONTO!:',
        error
      );

      setErro(
        'Não foi possível carregar suas experiências.'
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

  function formatarDataViagem(
    data?: string | null
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

    if (
      !ano ||
      !mes ||
      !dia
    ) {
      return data;
    }

    return `${dia}/${mes}/${ano}`;
  }

  function formatarLocalViagem(
    viagem: ViagemPendente
  ) {
    const partes = [
      viagem.cidade,
      viagem.estado,
      viagem.pais,
    ].filter(Boolean);

    if (
      partes.length === 0
    ) {
      return viagem.destino;
    }

    return partes.join(
      ', '
    );
  }

  function formatarLocalAvaliacaoViagem(
    avaliacao: AvaliacaoViagem
  ) {
    const partes = [
      avaliacao.cidade,
      avaliacao.estado,
      avaliacao.pais,
    ].filter(Boolean);

    if (
      partes.length === 0
    ) {
      return avaliacao.destino;
    }

    return partes.join(
      ', '
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

  function formatarExperienciaNoturna(
    experiencia?: string | null
  ) {
    switch (experiencia) {
      case 'TRANQUILA':
        return 'Tranquila';

      case 'COM_ATENCAO':
        return 'Com atenção';

      case 'EVITARIA':
        return 'Eu evitaria';

      case 'NAO_SAI':
        return 'Não saí à noite';

      default:
        return 'Não informado';
    }
  }

  function renderEstrelas(
    nota: number
  ) {
    const notaValida =
      Math.max(
        0,
        Math.min(
          5,
          nota ?? 0
        )
      );

    return (
      `${'★'.repeat(
        notaValida
      )}` +
      `${'☆'.repeat(
        5 -
          notaValida
      )}`
    );
  }

  const pendentes:
    ItemPendente[] = [
      ...viagensPendentes.map(
        (viagem) => ({
          tipo:
            'VIAGEM' as const,

          viagem,
        })
      ),

      ...visitas.map(
        (visita) => ({
          tipo:
            'LOCAL' as const,

          visita,
        })
      ),
    ];

  const itensAvaliados:
    ItemAvaliacao[] = [
      ...avaliacoesViagens.map(
        (avaliacao) => ({
          tipo:
            'VIAGEM' as const,

          avaliacao,
        })
      ),

      ...avaliacoes.map(
        (avaliacao) => ({
          tipo:
            'LOCAL' as const,

          avaliacao,
        })
      ),
    ];

  const quantidadePendentes =
    pendentes.length;

  if (carregando) {
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
          Buscando suas experiências...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.header
        }
      >
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
          Suas experiências
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Conte como foram os
          lugares que você visitou
          e os destinos onde viveu
          suas viagens.
        </Text>
      </View>

      <View
        style={
          styles.tabs
        }
      >
        <Pressable
          style={[
            styles.tab,

            abaAtiva ===
              'pendentes' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setAbaAtiva(
              'pendentes'
            )
          }
        >
          <Text
            style={[
              styles.tabText,

              abaAtiva ===
                'pendentes' &&
                styles.tabTextActive,
            ]}
          >
            Para avaliar
          </Text>

          {quantidadePendentes >
            0 && (
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
                {
                  quantidadePendentes
                }
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.tab,

            abaAtiva ===
              'avaliacoes' &&
              styles.tabActive,
          ]}
          onPress={() =>
            setAbaAtiva(
              'avaliacoes'
            )
          }
        >
          <Text
            style={[
              styles.tabText,

              abaAtiva ===
                'avaliacoes' &&
                styles.tabTextActive,
            ]}
          >
            Minhas avaliações
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
            {erro}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={
              carregarDados
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
      ) : abaAtiva ===
        'pendentes' ? (
        <FlatList
          data={
            pendentes
          }
          keyExtractor={(
            item
          ) => {
            if (
              item.tipo ===
              'VIAGEM'
            ) {
              return `viagem-${item.viagem.id}`;
            }

            return `local-${item.visita.id}`;
          }}
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
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            pendentes.length ===
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
                ✨
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Tudo contado por
                aqui
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Depois de visitar
                um lugar ou
                finalizar uma
                viagem, você poderá
                contar como foi sua
                experiência.
              </Text>
            </View>
          }
          renderItem={({
            item,
          }) => {
            if (
              item.tipo ===
              'VIAGEM'
            ) {
              const viagem =
                item.viagem;

              return (
                <View
                  style={[
                    styles.card,
                    styles.tripEvaluationCard,
                  ]}
                >
                  <View
                    style={
                      styles.cardTop
                    }
                  >
                    <View
                      style={
                        styles.tripIconBox
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
                        styles.cardMain
                      }
                    >
                      <Text
                        style={
                          styles.pendingType
                        }
                      >
                        DESTINO
                      </Text>

                      <Text
                        style={
                          styles.localName
                        }
                      >
                        {
                          viagem.destino
                        }
                      </Text>

                      <Text
                        style={
                          styles.tripLocation
                        }
                      >
                        {formatarLocalViagem(
                          viagem
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.finishedBadge
                      }
                    >
                      <Text
                        style={
                          styles.finishedBadgeText
                        }
                      >
                        VIAGEM FINALIZADA
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
                      styles.label
                    }
                  >
                    Período da viagem
                  </Text>

                  <Text
                    style={
                      styles.tripPeriod
                    }
                  >
                    {formatarDataViagem(
                      viagem.dataInicio
                    )}

                    {'  →  '}

                    {formatarDataViagem(
                      viagem.dataFim
                    )}
                  </Text>

                  <View
                    style={
                      styles.tripPromptBox
                    }
                  >
                    <Text
                      style={
                        styles.tripPromptTitle
                      }
                    >
                      Como foi viajar
                      sozinha para
                      esse destino?
                    </Text>

                    <Text
                      style={
                        styles.tripPromptText
                      }
                    >
                      Sua experiência
                      pode ajudar
                      outras mulheres
                      a decidir onde
                      viajar e como se
                      preparar.
                    </Text>
                  </View>

                  <Pressable
                    style={
                      styles.evaluateTripButton
                    }
                    onPress={() => {
                      router.push({
                        pathname:
                          '/avaliar-viagem/[id]' as any,

                        params: {
                          id:
                            String(
                              viagem.id
                            ),

                          destino:
                            viagem.destino,

                          cidade:
                            viagem.cidade ??
                            '',

                          estado:
                            viagem.estado ??
                            '',

                          pais:
                            viagem.pais ??
                            '',

                          dataInicio:
                            viagem.dataInicio,

                          dataFim:
                            viagem.dataFim,
                        },
                      });
                    }}
                  >
                    <Text
                      style={
                        styles.evaluateButtonText
                      }
                    >
                      AVALIAR DESTINO
                    </Text>
                  </Pressable>
                </View>
              );
            }

            const visita =
              item.visita;

            return (
              <View
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.cardTop
                  }
                >
                  <View
                    style={
                      styles.iconBox
                    }
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
                        styles.pendingType
                      }
                    >
                      LOCAL VISITADO
                    </Text>

                    <Text
                      style={
                        styles.localName
                      }
                    >
                      {visita.nomeLocal ||
                        'Local não identificado'}
                    </Text>

                    <Text
                      style={
                        styles.category
                      }
                    >
                      {visita.categoria ||
                        'Categoria não informada'}
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
                    styles.label
                  }
                >
                  Endereço
                </Text>

                <Text
                  style={
                    styles.address
                  }
                >
                  {visita.endereco ||
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
                  style={
                    styles.dateText
                  }
                >
                  {formatarData(
                    visita.checkOut
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
                        id:
                          String(
                            visita.id
                          ),

                        nome:
                          visita.nomeLocal,

                        categoria:
                          visita.categoria,

                        endereco:
                          visita.endereco,
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
            );
          }}
        />
      ) : (
        <FlatList
          data={
            itensAvaliados
          }
          keyExtractor={(
            item
          ) => {
            if (
              item.tipo ===
              'VIAGEM'
            ) {
              return `avaliacao-viagem-${item.avaliacao.id}`;
            }

            return `avaliacao-local-${item.avaliacao.id}`;
          }}
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
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            itensAvaliados.length ===
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
                💜
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Nenhuma avaliação
                ainda
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Depois que você
                contar como foi uma
                experiência, sua
                avaliação aparecerá
                aqui.
              </Text>
            </View>
          }
          renderItem={({
            item,
          }) => {
            if (
              item.tipo ===
              'VIAGEM'
            ) {
              const avaliacao =
                item.avaliacao;

              return (
                <View
                  style={[
                    styles.evaluationCard,
                    styles.tripReviewedCard,
                  ]}
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
                          styles.reviewType
                        }
                      >
                        ✈️ DESTINO
                      </Text>

                      <Text
                        style={
                          styles.evaluationTitle
                        }
                      >
                        {
                          avaliacao.destino
                        }
                      </Text>

                      <Text
                        style={
                          styles.evaluationCategory
                        }
                      >
                        {formatarLocalAvaliacaoViagem(
                          avaliacao
                        )}
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

                  <Text
                    style={
                      styles.evaluationDate
                    }
                  >
                    Viagem de{' '}

                    {formatarDataViagem(
                      avaliacao.dataInicio
                    )}

                    {' até '}

                    {formatarDataViagem(
                      avaliacao.dataFim
                    )}
                  </Text>

                  <Text
                    style={
                      styles.evaluationDate
                    }
                  >
                    Avaliado em{' '}

                    {formatarData(
                      avaliacao.criadaEm
                    )}
                  </Text>

                  <Text
                    style={
                      styles.stars
                    }
                  >
                    {renderEstrelas(
                      avaliacao.notaGeral
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
                      {
                        avaliacao.seguranca
                      }
                      /5
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
                      Locomoção sem carro
                    </Text>

                    <Text
                      style={
                        styles.evaluationValue
                      }
                    >
                      {avaliacao.facilidadeLocomocao ==
                      null
                        ? 'Não informado'
                        : `${avaliacao.facilidadeLocomocao}/5`}
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
                      Estrutura turística
                    </Text>

                    <Text
                      style={
                        styles.evaluationValue
                      }
                    >
                      {avaliacao.estruturaTuristica ==
                      null
                        ? 'Não informado'
                        : `${avaliacao.estruturaTuristica}/5`}
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
                      Viajaria sozinha novamente
                    </Text>

                    <Text
                      style={
                        styles.evaluationValue
                      }
                    >
                      {avaliacao.viajariaSozinhaNovamente ===
                      null
                        ? 'Não informado'
                        : avaliacao.viajariaSozinhaNovamente
                        ? 'Sim'
                        : 'Não'}
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
                      Recomendaria para outra mulher
                    </Text>

                    <Text
                      style={
                        styles.evaluationValue
                      }
                    >
                      {avaliacao.recomendariaParaMulherSozinha ===
                      null
                        ? 'Não informado'
                        : avaliacao.recomendariaParaMulherSozinha
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
                      Experiência à noite
                    </Text>

                    <Text
                      style={
                        styles.evaluationValue
                      }
                    >
                      {formatarExperienciaNoturna(
                        avaliacao.experienciaNoturna
                      )}
                    </Text>
                  </View>

                  {!!avaliacao.melhorRegiaoHospedagem && (
                    <View
                      style={
                        styles.reviewSection
                      }
                    >
                      <Text
                        style={
                          styles.evaluationLabel
                        }
                      >
                        Melhor região para se hospedar
                      </Text>

                      <Text
                        style={
                          styles.reviewText
                        }
                      >
                        {
                          avaliacao.melhorRegiaoHospedagem
                        }
                      </Text>
                    </View>
                  )}

                  {!!avaliacao.pontosPositivos && (
                    <View
                      style={
                        styles.reviewSection
                      }
                    >
                      <Text
                        style={
                          styles.evaluationLabel
                        }
                      >
                        Pontos positivos
                      </Text>

                      <Text
                        style={
                          styles.reviewText
                        }
                      >
                        {
                          avaliacao.pontosPositivos
                        }
                      </Text>
                    </View>
                  )}

                  {!!avaliacao.pontosAtencao && (
                    <View
                      style={
                        styles.reviewSection
                      }
                    >
                      <Text
                        style={
                          styles.evaluationLabel
                        }
                      >
                        Pontos de atenção
                      </Text>

                      <Text
                        style={
                          styles.reviewText
                        }
                      >
                        {
                          avaliacao.pontosAtencao
                        }
                      </Text>
                    </View>
                  )}

                  {avaliacao.sentiuInsegura ===
                    true &&
                    !!avaliacao.relatoInseguranca && (
                      <View
                        style={
                          styles.attentionBox
                        }
                      >
                        <Text
                          style={
                            styles.attentionTitle
                          }
                        >
                          Relato de insegurança
                        </Text>

                        <Text
                          style={
                            styles.attentionText
                          }
                        >
                          {
                            avaliacao.relatoInseguranca
                          }
                        </Text>
                      </View>
                    )}

                  {!!avaliacao.comentario && (
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
                        “
                        {
                          avaliacao.comentario
                        }
                        ”
                      </Text>
                    </>
                  )}
                </View>
              );
            }

            const avaliacao =
              item.avaliacao;

            return (
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
                        styles.reviewType
                      }
                    >
                      📍 LOCAL
                    </Text>

                    <Text
                      style={
                        styles.evaluationTitle
                      }
                    >
                      {avaliacao.nomeLocal ||
                        'Local não identificado'}
                    </Text>

                    <Text
                      style={
                        styles.evaluationCategory
                      }
                    >
                      {avaliacao.categoria ||
                        'Categoria não informada'}
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

                <Text
                  style={
                    styles.evaluationAddress
                  }
                >
                  {avaliacao.endereco ||
                    'Endereço não disponível'}
                </Text>

                <Text
                  style={
                    styles.evaluationDate
                  }
                >
                  Avaliado em{' '}

                  {formatarData(
                    avaliacao.criadaEm
                  )}
                </Text>

                <Text
                  style={
                    styles.stars
                  }
                >
                  {renderEstrelas(
                    avaliacao.notaGeral
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
                    {
                      avaliacao.seguranca
                    }
                    /5
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
                    {avaliacao.iriaSozinha ===
                    null
                      ? 'Não informado'
                      : avaliacao.iriaSozinha
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
                      avaliacao.percepcaoEntorno
                    )}
                  </Text>
                </View>

                {!!avaliacao.comentario && (
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
                      “
                      {
                        avaliacao.comentario
                      }
                      ”
                    </Text>
                  </>
                )}
              </View>
            );
          }}
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
      justifyContent:
        'center',
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
      justifyContent:
        'center',
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
      justifyContent:
        'center',
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
      justifyContent:
        'center',
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

    tripEvaluationCard: {
      borderColor:
        '#ddd1ff',
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
      justifyContent:
        'center',
      marginRight: 12,
    },

    iconText: {
      fontSize: 21,
      color: '#6d28d9',
      fontWeight: '800',
    },

    tripIconBox: {
      width: 50,
      height: 50,
      borderRadius: 15,
      backgroundColor:
        '#f1ebff',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    tripIconText: {
      fontSize: 22,
      color: '#6d28d9',
    },

    cardMain: {
      flex: 1,
    },

    pendingType: {
      fontSize: 9,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.8,
      marginBottom: 3,
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

    tripLocation: {
      fontSize: 12,
      color: '#777777',
      lineHeight: 17,
    },

    finishedBadge: {
      maxWidth: 75,
      backgroundColor:
        '#f1ebff',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      marginLeft: 7,
    },

    finishedBadgeText: {
      fontSize: 8,
      lineHeight: 11,
      textAlign: 'center',
      color: '#6d28d9',
      fontWeight: '900',
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

    tripPeriod: {
      fontSize: 14,
      fontWeight: '700',
      color: '#444444',
      marginBottom: 15,
    },

    tripPromptBox: {
      backgroundColor:
        '#f7f3ff',
      borderRadius: 13,
      padding: 13,
      marginBottom: 15,
    },

    tripPromptTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#6d28d9',
      marginBottom: 4,
    },

    tripPromptText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#555555',
    },

    evaluateButton: {
      backgroundColor:
        '#6d28d9',
      borderRadius: 13,
      paddingVertical: 14,
      alignItems: 'center',
    },

    evaluateTripButton: {
      backgroundColor:
        '#6d28d9',
      borderRadius: 13,
      paddingVertical: 15,
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

    tripReviewedCard: {
      borderColor:
        '#ddd1ff',
    },

    evaluationHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      marginBottom: 10,
    },

    evaluationPlace: {
      flex: 1,
      marginRight: 12,
    },

    reviewType: {
      fontSize: 9,
      fontWeight: '900',
      color: '#6d28d9',
      letterSpacing: 0.8,
      marginBottom: 4,
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
      marginBottom: 6,
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
      marginTop: 5,
      marginBottom: 14,
    },

    evaluationInfo: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 8,
      gap: 10,
    },

    evaluationInfoColumn: {
      marginTop: 2,
      marginBottom: 8,
    },

    evaluationLabel: {
      flexShrink: 1,
      fontSize: 12,
      color: '#888888',
      fontWeight: '700',
      marginBottom: 3,
    },

    evaluationValue: {
      fontSize: 14,
      color: '#444444',
      fontWeight: '600',
      textAlign: 'right',
    },

    reviewSection: {
      marginTop: 12,
    },

    reviewText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#444444',
    },

    attentionBox: {
      marginTop: 12,
      backgroundColor:
        '#fff1f1',
      borderRadius: 12,
      padding: 12,
    },

    attentionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#a33a3a',
      marginBottom: 4,
    },

    attentionText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#6d4545',
    },

    comment: {
      fontSize: 14,
      lineHeight: 20,
      color: '#555555',
      fontStyle: 'italic',
    },
  });