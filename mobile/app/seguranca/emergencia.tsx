import { buscarUsuario } from '@/services/auth';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

type LocalizacaoAtual = {
  latitude: number;
  longitude: number;
};

type ServicosEmergencia = {
  principal: string;
  policia?: string;
  samu?: string;
  bombeiros?: string;
  apoioMulher?: string;
};

const servicosPorPais: Record<
  string,
  ServicosEmergencia
> = {
  BR: {
    principal: '190',
    policia: '190',
    samu: '192',
    bombeiros: '193',
    apoioMulher: '180',
  },

  US: {
    principal: '911',
  },

  CA: {
    principal: '911',
  },

  MX: {
    principal: '911',
  },

  AR: {
    principal: '911',
  },

  CO: {
    principal: '123',
  },

  UY: {
    principal: '911',
  },

  PY: {
    principal: '911',
  },

  ES: {
    principal: '112',
  },

  PT: {
    principal: '112',
  },

  FR: {
    principal: '112',
  },

  DE: {
    principal: '112',
  },

  IT: {
    principal: '112',
  },

  NL: {
    principal: '112',
  },

  BE: {
    principal: '112',
  },

  IE: {
    principal: '112',
  },

  GR: {
    principal: '112',
  },

  GB: {
    principal: '999',
  },

  AU: {
    principal: '000',
  },
};

export default function EmergenciaScreen() {
  const [
    nomeContato,
    setNomeContato,
  ] = useState('');

  const [
    telefoneContato,
    setTelefoneContato,
  ] = useState('');

  const [
    relacaoContato,
    setRelacaoContato,
  ] = useState('');

  const [
    localizacao,
    setLocalizacao,
  ] = useState<LocalizacaoAtual | null>(
    null
  );

  const [
    carregandoLocalizacao,
    setCarregandoLocalizacao,
  ] = useState(true);

  const [
    localizacaoNegada,
    setLocalizacaoNegada,
  ] = useState(false);

  const [
    paisAtual,
    setPaisAtual,
  ] = useState<string | null>(
    null
  );

  const [
    servicosEmergencia,
    setServicosEmergencia,
  ] = useState<ServicosEmergencia | null>(
    null
  );

  useEffect(() => {
    void inicializar();
  }, []);

  async function inicializar() {
    await carregarUsuario();
    await obterLocalizacao();
  }

  async function carregarUsuario() {
    try {
      const usuario =
        await buscarUsuario();

      if (!usuario) {
        return;
      }

      setNomeContato(
        usuario.contatoEmergenciaNome?.trim() ??
          ''
      );

      setTelefoneContato(
        usuario.contatoEmergenciaTelefone?.trim() ??
          ''
      );

      setRelacaoContato(
        usuario.contatoEmergenciaRelacao?.trim() ??
          ''
      );
    } catch (error) {
      console.error(
        'Erro ao carregar contato de emergência:',
        error
      );
    }
  }

  async function obterLocalizacao() {
    try {
      setCarregandoLocalizacao(true);
      setLocalizacaoNegada(false);

      const permissao =
        await Location.requestForegroundPermissionsAsync();

      if (
        permissao.status !==
        'granted'
      ) {
        setLocalizacao(null);
        setLocalizacaoNegada(true);
        setPaisAtual(null);
        setServicosEmergencia(null);

        return;
      }

      const posicao =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        });

      const latitude =
        posicao.coords.latitude;

      const longitude =
        posicao.coords.longitude;

      setLocalizacao({
        latitude,
        longitude,
      });

      await identificarPaisEmergencia(
        latitude,
        longitude
      );
    } catch (error) {
      console.error(
        'Erro ao obter localização:',
        error
      );

      setLocalizacao(null);
      setPaisAtual(null);
      setServicosEmergencia(null);
    } finally {
      setCarregandoLocalizacao(false);
    }
  }

  async function identificarPaisEmergencia(
    latitude: number,
    longitude: number
  ) {
    try {
      const enderecos =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      const endereco =
        enderecos[0];

      if (!endereco) {
        setPaisAtual(null);
        setServicosEmergencia(null);
        return;
      }

      const codigoPais =
        endereco.isoCountryCode?.toUpperCase();

      setPaisAtual(
        endereco.country ?? null
      );

      if (
        codigoPais &&
        servicosPorPais[codigoPais]
      ) {
        setServicosEmergencia(
          servicosPorPais[codigoPais]
        );
      } else {
        setServicosEmergencia(null);
      }
    } catch (error) {
      console.error(
        'Erro ao identificar país:',
        error
      );

      setPaisAtual(null);
      setServicosEmergencia(null);
    }
  }

  function normalizarTelefone(
    telefone: string
  ) {
    const valor =
      telefone.trim();

    if (!valor) {
      return '';
    }

    const numeros =
      valor.replace(/\D/g, '');

    if (!numeros) {
      return '';
    }

    /*
     * Número já salvo no formato internacional:
     * +5511966009689
     */
    if (valor.startsWith('+')) {
      return `+${numeros}`;
    }

    /*
     * Compatibilidade com números brasileiros
     * antigos que foram salvos como:
     *
     * 5511966009689
     *
     * sem o sinal de +.
     */
    if (
      numeros.startsWith('55') &&
      (
        numeros.length === 12 ||
        numeros.length === 13
      )
    ) {
      return `+${numeros}`;
    }

    /*
     * Compatibilidade com números brasileiros
     * antigos salvos apenas com:
     *
     * DDD + telefone
     */
    if (
      numeros.length === 10 ||
      numeros.length === 11
    ) {
      return `+55${numeros}`;
    }

    /*
     * Os novos telefones cadastrados pelo Perfil
     * já chegam com o código internacional.
     *
     * Este fallback impede que o tel: seja
     * aberto sem o prefixo internacional.
     */
    return `+${numeros}`;
  }

  function formatarTelefoneExibicao(
    telefone: string
  ) {
    const normalizado =
      normalizarTelefone(
        telefone
      );

    if (!normalizado) {
      return '';
    }

    const numeros =
      normalizado.replace(
        /\D/g,
        ''
      );

    /*
     * Formatação visual para Brasil.
     *
     * +5511966009689
     *
     * vira:
     *
     * +55 11 96600-9689
     */
    if (
      numeros.startsWith('55')
    ) {
      const nacional =
        numeros.slice(2);

      if (
        nacional.length === 11
      ) {
        const ddd =
          nacional.slice(0, 2);

        const primeiraParte =
          nacional.slice(2, 7);

        const segundaParte =
          nacional.slice(7);

        return (
          `+55 ${ddd} ` +
          `${primeiraParte}-${segundaParte}`
        );
      }

      if (
        nacional.length === 10
      ) {
        const ddd =
          nacional.slice(0, 2);

        const primeiraParte =
          nacional.slice(2, 6);

        const segundaParte =
          nacional.slice(6);

        return (
          `+55 ${ddd} ` +
          `${primeiraParte}-${segundaParte}`
        );
      }
    }

    /*
     * Para outros países não aplicamos uma
     * máscara brasileira.
     */
    return normalizado;
  }

  function gerarLinkLocalizacao() {
    if (!localizacao) {
      return null;
    }

    return (
      'https://www.google.com/maps/search/?api=1&query=' +
      `${localizacao.latitude},${localizacao.longitude}`
    );
  }

  function gerarMensagemEmergencia() {
    const link =
      gerarLinkLocalizacao();

    let mensagem =
      'Oi. Estou me sentindo desconfortável e gostaria que você soubesse onde estou.';

    if (link) {
      mensagem +=
        `\n\nMinha localização atual:\n${link}`;
    }

    if (
      paisAtual &&
      servicosEmergencia
    ) {
      mensagem +=
        `\n\nContatos úteis de emergência em ${paisAtual}:`;

      if (
        servicosEmergencia.policia
      ) {
        mensagem +=
          `\nPolícia: ${servicosEmergencia.policia}`;
      }

      if (
        servicosEmergencia.samu
      ) {
        mensagem +=
          `\nSAMU: ${servicosEmergencia.samu}`;
      }

      if (
        servicosEmergencia.bombeiros
      ) {
        mensagem +=
          `\nBombeiros: ${servicosEmergencia.bombeiros}`;
      }

      if (
        servicosEmergencia.apoioMulher
      ) {
        mensagem +=
          `\nCentral de Atendimento à Mulher: ${servicosEmergencia.apoioMulher}`;
      }

      if (
        !servicosEmergencia.policia &&
        !servicosEmergencia.samu &&
        !servicosEmergencia.bombeiros &&
        !servicosEmergencia.apoioMulher
      ) {
        mensagem +=
          `\nEmergência: ${servicosEmergencia.principal}`;
      }
    }

    mensagem +=
      '\n\nSe eu não responder, por favor tente entrar em contato comigo.';

    return mensagem;
  }

  async function ligarParaContato() {
    if (!telefoneContato) {
      Alert.alert(
        'Contato não cadastrado',
        'Você ainda não possui um telefone de emergência cadastrado.'
      );

      return;
    }

    const telefone =
      normalizarTelefone(
        telefoneContato
      );

    if (!telefone) {
      Alert.alert(
        'Telefone inválido',
        'Não foi possível identificar o telefone do seu contato de emergência.'
      );

      return;
    }

    try {
      await Linking.openURL(
        `tel:${telefone}`
      );
    } catch (error) {
      console.error(
        'Erro ao abrir ligação:',
        error
      );

      Alert.alert(
        'Não foi possível ligar',
        'Não conseguimos abrir a ligação neste dispositivo.'
      );
    }
  }

  async function avisarContato() {
    if (!telefoneContato) {
      Alert.alert(
        'Contato não cadastrado',
        'Cadastre um telefone de emergência antes de usar esta opção.'
      );

      return;
    }

    const telefone =
      normalizarTelefone(
        telefoneContato
      );

    if (!telefone) {
      Alert.alert(
        'Telefone inválido',
        'Não foi possível identificar o telefone do seu contato de emergência.'
      );

      return;
    }

    const mensagem =
      gerarMensagemEmergencia();

    const separador =
      process.env.EXPO_OS === 'ios'
        ? '&'
        : '?';

    const url =
      `sms:${telefone}` +
      `${separador}body=` +
      encodeURIComponent(
        mensagem
      );

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error(
        'Erro ao abrir mensagem:',
        error
      );

      Alert.alert(
        'Não foi possível abrir a mensagem',
        'Você ainda pode compartilhar sua localização por outro aplicativo.'
      );
    }
  }

  async function compartilharLocalizacao() {
    if (!localizacao) {
      Alert.alert(
        'Localização indisponível',
        localizacaoNegada
          ? 'A permissão de localização não foi concedida.'
          : 'Ainda não conseguimos identificar sua localização.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Tentar novamente',
            onPress: () => {
              void obterLocalizacao();
            },
          },
        ]
      );

      return;
    }

    const link =
      gerarLinkLocalizacao();

    if (!link) {
      return;
    }

    try {
      await Share.share({
        message:
          'Estou compartilhando minha localização atual: ' +
          link,
      });
    } catch (error) {
      console.error(
        'Erro ao compartilhar localização:',
        error
      );
    }
  }

  function confirmarEmergencia() {
    if (!servicosEmergencia) {
      Alert.alert(
        'Serviço de emergência',
        paisAtual
          ? `A maIA identificou que você está em ${paisAtual}, mas ainda não possui um número de emergência configurado para este país.`
          : 'Não foi possível identificar com segurança o serviço de emergência da sua localização.',
        [
          {
            text: 'OK',
          },
        ]
      );

      return;
    }

    const numero =
      servicosEmergencia.principal;

    const mensagem =
      paisAtual
        ? `Sua localização indica ${paisAtual}. Deseja abrir uma ligação para o serviço de emergência (${numero})?`
        : `Deseja abrir uma ligação para o serviço de emergência (${numero})?`;

    Alert.alert(
      'Ajuda de emergência',
      mensagem,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: `Ligar ${numero}`,
          style: 'destructive',
          onPress: () => {
            void ligarEmergencia();
          },
        },
      ]
    );
  }

  async function ligarEmergencia() {
    if (!servicosEmergencia) {
      Alert.alert(
        'Número indisponível',
        'Não foi possível identificar um número de emergência para sua localização.'
      );

      return;
    }

    const numero =
      servicosEmergencia.principal;

    try {
      await Linking.openURL(
        `tel:${numero}`
      );
    } catch (error) {
      console.error(
        'Erro ao abrir ligação de emergência:',
        error
      );

      Alert.alert(
        'Não foi possível abrir a ligação',
        'Use o aplicativo de telefone do dispositivo para solicitar ajuda.'
      );
    }
  }

  function voltar() {
    router.back();
  }

  const possuiContato =
    Boolean(
      nomeContato ||
        telefoneContato
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={[
        'top',
        'bottom',
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={styles.header}
        >
          <Pressable
            onPress={voltar}
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text
              style={styles.backText}
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={
              styles.headerBrand
            }
          >
            <Text
              style={
                styles.headerBrandText
              }
            >
              maIA
            </Text>

            <Text
              style={
                styles.headerBrandSubtitle
              }
            >
              segurança
            </Text>
          </View>
        </View>

        <View
          style={styles.alertArea}
        >
          <View
            style={
              styles.alertCircleOuter
            }
          >
            <View
              style={
                styles.alertCircle
              }
            >
              <Text
                style={
                  styles.alertIcon
                }
              >
                !
              </Text>
            </View>
          </View>

          <Text
            style={styles.eyebrow}
          >
            ESTOU COM VOCÊ
          </Text>

          <Text
            style={styles.title}
          >
            Você está segura agora?
          </Text>

          <Text
            style={
              styles.description
            }
          >
            Se alguma situação estiver
            deixando você desconfortável,
            escolha abaixo como a maIA
            pode ajudar.
          </Text>
        </View>

        <View
          style={
            styles.locationStatus
          }
        >
          <View
            style={[
              styles.statusDot,
              localizacao
                ? styles.statusDotActive
                : styles.statusDotInactive,
            ]}
          />

          <View
            style={
              styles.locationStatusText
            }
          >
            <Text
              style={
                styles.locationStatusTitle
              }
            >
              {carregandoLocalizacao
                ? 'Localizando você...'
                : localizacao
                  ? 'Localização disponível'
                  : 'Localização indisponível'}
            </Text>

            <Text
              style={
                styles.locationStatusDescription
              }
            >
              {carregandoLocalizacao
                ? 'A maIA está tentando identificar sua localização atual.'
                : localizacao
                  ? paisAtual
                    ? `Localização identificada em ${paisAtual}. Ela só será compartilhada quando você escolher.`
                    : 'Sua localização pode ser compartilhada quando você escolher.'
                  : 'Você ainda pode ligar ou avisar seu contato sem compartilhar a localização.'}
            </Text>
          </View>
        </View>

        <Text
          style={styles.sectionLabel}
        >
          SEU CONTATO DE EMERGÊNCIA
        </Text>

        <View
          style={styles.contactCard}
        >
          {possuiContato ? (
            <>
              <View
                style={
                  styles.contactAvatar
                }
              >
                <Text
                  style={
                    styles.contactAvatarText
                  }
                >
                  {nomeContato
                    ? nomeContato
                        .charAt(0)
                        .toUpperCase()
                    : '!'}
                </Text>
              </View>

              <View
                style={
                  styles.contactInfo
                }
              >
                <Text
                  style={
                    styles.contactName
                  }
                >
                  {nomeContato ||
                    'Contato de emergência'}
                </Text>

                {relacaoContato ? (
                  <Text
                    style={
                      styles.contactRelation
                    }
                  >
                    {relacaoContato}
                  </Text>
                ) : null}

                {telefoneContato ? (
                  <Text
                    style={
                      styles.contactPhone
                    }
                  >
                    {formatarTelefoneExibicao(
                      telefoneContato
                    )}
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.contactMissing
                    }
                  >
                    Telefone não cadastrado
                  </Text>
                )}
              </View>
            </>
          ) : (
            <View
              style={
                styles.noContactArea
              }
            >
              <Text
                style={
                  styles.noContactTitle
                }
              >
                Nenhum contato cadastrado
              </Text>

              <Text
                style={
                  styles.noContactDescription
                }
              >
                Adicione um contato de
                emergência no seu perfil
                para utilizar as ações de
                contato rápido.
              </Text>
            </View>
          )}
        </View>

        <View
          style={styles.actions}
        >
          <Pressable
            onPress={() => {
              void avisarContato();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.buttonIcon
              }
            >
              <Text
                style={
                  styles.buttonIconText
                }
              >
                1
              </Text>
            </View>

            <View
              style={
                styles.buttonContent
              }
            >
              <Text
                style={
                  styles.primaryButtonTitle
                }
              >
                AVISAR MEU CONTATO
              </Text>

              <Text
                style={
                  styles.primaryButtonDescription
                }
              >
                Preparar uma mensagem com
                sua localização e contatos
                úteis de emergência.
              </Text>
            </View>

            <Text
              style={
                styles.primaryArrow
              }
            >
              ›
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void ligarParaContato();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.secondaryIcon
              }
            >
              <Text
                style={
                  styles.secondaryIconText
                }
              >
                2
              </Text>
            </View>

            <View
              style={
                styles.buttonContent
              }
            >
              <Text
                style={
                  styles.secondaryButtonTitle
                }
              >
                LIGAR PARA MEU CONTATO
              </Text>

              <Text
                style={
                  styles.secondaryButtonDescription
                }
              >
                Abrir uma ligação para seu
                contato de emergência.
              </Text>
            </View>

            <Text
              style={
                styles.secondaryArrow
              }
            >
              ›
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void compartilharLocalizacao();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.secondaryIcon
              }
            >
              <Text
                style={
                  styles.secondaryIconText
                }
              >
                3
              </Text>
            </View>

            <View
              style={
                styles.buttonContent
              }
            >
              <Text
                style={
                  styles.secondaryButtonTitle
                }
              >
                COMPARTILHAR LOCALIZAÇÃO
              </Text>

              <Text
                style={
                  styles.secondaryButtonDescription
                }
              >
                Escolher por qual aplicativo
                compartilhar onde você está.
              </Text>
            </View>

            <Text
              style={
                styles.secondaryArrow
              }
            >
              ›
            </Text>
          </Pressable>
        </View>

        <View
          style={styles.divider}
        />

        <Pressable
          onPress={
            confirmarEmergencia
          }
          style={({ pressed }) => [
            styles.emergencyButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <View
            style={
              styles.emergencyIcon
            }
          >
            <Text
              style={
                styles.emergencyIconText
              }
            >
              !
            </Text>
          </View>

          <View
            style={
              styles.buttonContent
            }
          >
            <Text
              style={
                styles.emergencyTitle
              }
            >
              PRECISO DE AJUDA DE EMERGÊNCIA
            </Text>

            <Text
              style={
                styles.emergencyDescription
              }
            >
              {servicosEmergencia
                ? `Abrir ligação para o serviço de emergência (${servicosEmergencia.principal}).`
                : 'Abrir uma ligação para o serviço de emergência.'}
            </Text>
          </View>

          <Text
            style={
              styles.emergencyArrow
            }
          >
            ›
          </Text>
        </Pressable>

        <Pressable
          onPress={voltar}
          style={({ pressed }) => [
            styles.safeButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={
              styles.safeButtonText
            }
          >
            Estou bem, voltar
          </Text>
        </Pressable>

        <Text
          style={styles.footer}
        >
          A maIA não substitui os serviços
          oficiais de emergência.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#f8f7fc',
    },

    scroll: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 22,
    },

    backButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#e8e0f3',
    },

    backText: {
      marginTop: -3,
      fontSize: 34,
      lineHeight: 36,
      color: '#6d28d9',
    },

    headerBrand: {
      alignItems: 'flex-end',
    },

    headerBrandText: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -1,
      color: '#6d28d9',
    },

    headerBrandSubtitle: {
      marginTop: -2,
      fontSize: 9,
      letterSpacing: 1.2,
      color: '#918a97',
    },

    alertArea: {
      alignItems: 'center',
      paddingHorizontal: 8,
      marginBottom: 24,
    },

    alertCircleOuter: {
      width: 94,
      height: 94,
      borderRadius: 47,
      backgroundColor:
        'rgba(109, 40, 217, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },

    alertCircle: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: '#6d28d9',
      alignItems: 'center',
      justifyContent: 'center',
    },

    alertIcon: {
      color: '#ffffff',
      fontSize: 31,
      fontWeight: '900',
    },

    eyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.8,
      color: '#8b5cf6',
      marginBottom: 8,
    },

    title: {
      fontSize: 29,
      lineHeight: 35,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: -0.5,
      color: '#28232d',
    },

    description: {
      marginTop: 10,
      maxWidth: 330,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      color: '#817a87',
    },

    locationStatus: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 15,
      borderRadius: 18,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e9e3f0',
      marginBottom: 25,
    },

    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 5,
      marginRight: 11,
    },

    statusDotActive: {
      backgroundColor: '#6d28d9',
    },

    statusDotInactive: {
      backgroundColor: '#b9b3bd',
    },

    locationStatusText: {
      flex: 1,
    },

    locationStatusTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: '#39323f',
    },

    locationStatusDescription: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: '#89818e',
    },

    sectionLabel: {
      marginLeft: 3,
      marginBottom: 9,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: '#8b5cf6',
    },

    contactCard: {
      minHeight: 100,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 17,
      borderRadius: 22,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e8e0f3',
      marginBottom: 16,
    },

    contactAvatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: '#eee7fb',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },

    contactAvatarText: {
      fontSize: 18,
      fontWeight: '900',
      color: '#6d28d9',
    },

    contactInfo: {
      flex: 1,
    },

    contactName: {
      fontSize: 16,
      fontWeight: '900',
      color: '#302a34',
    },

    contactRelation: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: '700',
      color: '#766d7d',
    },

    contactPhone: {
      marginTop: 5,
      fontSize: 12,
      color: '#8b8390',
    },

    contactMissing: {
      marginTop: 5,
      fontSize: 11,
      color: '#9b939f',
    },

    noContactArea: {
      flex: 1,
    },

    noContactTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: '#39323f',
    },

    noContactDescription: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: '#89818e',
    },

    actions: {
      gap: 10,
    },

    primaryButton: {
      minHeight: 79,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 13,
      borderRadius: 21,
      backgroundColor: '#6d28d9',
    },

    secondaryButton: {
      minHeight: 75,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 21,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e8e0f3',
    },

    buttonIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    buttonIconText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '900',
    },

    secondaryIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#f1ebfb',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    secondaryIconText: {
      color: '#6d28d9',
      fontSize: 14,
      fontWeight: '900',
    },

    buttonContent: {
      flex: 1,
    },

    primaryButtonTitle: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.5,
      color: '#ffffff',
    },

    primaryButtonDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color:
        'rgba(255,255,255,0.76)',
    },

    primaryArrow: {
      marginLeft: 8,
      fontSize: 27,
      color: '#ffffff',
    },

    secondaryButtonTitle: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.4,
      color: '#39323f',
    },

    secondaryButtonDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color: '#89818e',
    },

    secondaryArrow: {
      marginLeft: 8,
      fontSize: 27,
      color: '#6d28d9',
    },

    divider: {
      height: 1,
      backgroundColor: '#e7e0eb',
      marginVertical: 22,
    },

    emergencyButton: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 13,
      borderRadius: 21,
      backgroundColor: '#fff5f5',
      borderWidth: 1,
      borderColor: '#f2caca',
    },

    emergencyIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#b42318',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    emergencyIconText: {
      fontSize: 20,
      fontWeight: '900',
      color: '#ffffff',
    },

    emergencyTitle: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.3,
      color: '#8f1d18',
    },

    emergencyDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color: '#98615e',
    },

    emergencyArrow: {
      marginLeft: 8,
      fontSize: 27,
      color: '#a82a22',
    },

    safeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 17,
      marginTop: 14,
    },

    safeButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#6d28d9',
    },

    footer: {
      marginTop: 5,
      paddingHorizontal: 20,
      textAlign: 'center',
      fontSize: 9,
      lineHeight: 14,
      color: '#a29ba6',
    },

    pressed: {
      opacity: 0.72,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },
  });