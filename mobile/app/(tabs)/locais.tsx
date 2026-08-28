import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_URL } from '@/services/api';

type Local = {
  id: string;
  nome: string;
  categoria: string;
  latitude: number;
  longitude: number;
  endereco: string;
};

type GeoapifyResultado = {
  lat?: number;
  lon?: number;
  formatted?: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
};

type GeoapifyResposta = {
  results?: GeoapifyResultado[];
};

const CATEGORIAS = [
  'Cafés',
  'Restaurantes',
  'Pizzarias',
  'Sorveterias',
  'Bares',
  'Supermercados',
  'Farmácias',
  'Praias',
];

export default function LocaisScreen() {
  const [busca, setBusca] =
    useState('');

  const [
    buscaLocalizacao,
    setBuscaLocalizacao,
  ] = useState('');

  const [
    categoriaSelecionada,
    setCategoriaSelecionada,
  ] = useState('Cafés');

  const [locais, setLocais] =
    useState<Local[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [
    carregandoLocalizacao,
    setCarregandoLocalizacao,
  ] = useState(false);

  const [erro, setErro] =
    useState('');

  const [
    localizacaoBusca,
    setLocalizacaoBusca,
  ] = useState(
    'Obtendo sua localização...'
  );

  const [
    latitudeBusca,
    setLatitudeBusca,
  ] = useState<number | null>(null);

  const [
    longitudeBusca,
    setLongitudeBusca,
  ] = useState<number | null>(null);

  useEffect(() => {
    usarMinhaLocalizacao();
  }, []);

  useEffect(() => {
    if (
      latitudeBusca !== null &&
      longitudeBusca !== null
    ) {
      buscarLocais(
        latitudeBusca,
        longitudeBusca
      );
    }
  }, [
    categoriaSelecionada,
    latitudeBusca,
    longitudeBusca,
  ]);

  async function usarMinhaLocalizacao() {
    try {
      setCarregandoLocalizacao(true);
      setErro('');

      const permissao =
        await Location
          .requestForegroundPermissionsAsync();

      if (
        permissao.status !==
        'granted'
      ) {
        setErro(
          'Permissão de localização necessária para usar sua localização atual.'
        );
        return;
      }

      const localizacao =
        await Location
          .getCurrentPositionAsync({});

      const latitude =
        localizacao.coords.latitude;

      const longitude =
        localizacao.coords.longitude;

      const enderecoAtual =
        await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

      let enderecoFormatado =
        'Sua localização atual';

      if (
        enderecoAtual.length > 0
      ) {
        const e =
          enderecoAtual[0];

        const partes = [
          e.street,
          e.streetNumber,
          e.district,
          e.city,
          e.region,
          e.postalCode,
        ].filter(Boolean);

        if (
          partes.length > 0
        ) {
          enderecoFormatado =
            partes.join(', ');
        }
      }

      setLocalizacaoBusca(
        enderecoFormatado
      );

      setLatitudeBusca(
        latitude
      );

      setLongitudeBusca(
        longitude
      );

      setBuscaLocalizacao('');
    } catch (error) {
      console.error(error);

      setErro(
        'Não foi possível obter sua localização atual.'
      );
    } finally {
      setCarregandoLocalizacao(
        false
      );
    }
  }

  async function pesquisarLocalizacao() {
    const texto =
      buscaLocalizacao.trim();

    if (!texto) {
      setErro(
        'Digite uma cidade, bairro, endereço ou destino.'
      );
      return;
    }

    try {
      setCarregandoLocalizacao(
        true
      );

      setErro('');

      const response =
        await fetch(
          `${API_URL}/geocoding/buscar?texto=${encodeURIComponent(
            texto
          )}`
        );

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dados:
        GeoapifyResposta =
        await response.json();

      if (
        !dados.results ||
        dados.results.length === 0
      ) {
        setErro(
          'Não encontramos essa localização.'
        );
        return;
      }

      const resultado =
        dados.results[0];

      if (
        resultado.lat === undefined ||
        resultado.lon === undefined
      ) {
        setErro(
          'A localização foi encontrada, mas não possui coordenadas válidas.'
        );
        return;
      }

      const nomeLocal =
        resultado.formatted ||
        [
          resultado.name,
          resultado.city,
          resultado.state,
          resultado.country,
        ]
          .filter(Boolean)
          .join(', ');

      setLocalizacaoBusca(
        nomeLocal || texto
      );

      setLatitudeBusca(
        resultado.lat
      );

      setLongitudeBusca(
        resultado.lon
      );

      setBusca('');
    } catch (error) {
      console.error(error);

      setErro(
        'Não foi possível pesquisar essa localização.'
      );
    } finally {
      setCarregandoLocalizacao(
        false
      );
    }
  }

  async function buscarLocais(
    latitude: number,
    longitude: number
  ) {
    try {
      setCarregando(true);
      setErro('');

      const categoriaApi =
        converterCategoriaParaApi(
          categoriaSelecionada
        );

      const response =
        await fetch(
          `${API_URL}/locais/proximos?lat=${latitude}&lon=${longitude}&categoria=${categoriaApi}`
        );

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dados: Local[] =
        await response.json();

      setLocais(dados);
    } catch (error) {
      console.error(error);

      setErro(
        'Não foi possível carregar os locais próximos.'
      );
    } finally {
      setCarregando(false);
    }
  }

  function converterCategoriaParaApi(
    categoria: string
  ) {
    switch (categoria) {
      case 'Cafés':
        return 'cafe';

      case 'Restaurantes':
        return 'restaurante';

      case 'Pizzarias':
        return 'pizzaria';

      case 'Sorveterias':
        return 'sorveteria';

      case 'Bares':
        return 'bar';

      case 'Supermercados':
        return 'supermercado';

      case 'Farmácias':
        return 'farmacia';

      case 'Praias':
        return 'praia';

      default:
        return 'cafe';
    }
  }

  function calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const raioTerra =
      6371;

    const dLat =
      ((lat2 - lat1) *
        Math.PI) /
      180;

    const dLon =
      ((lon2 - lon1) *
        Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) /
          180
      ) *
        Math.cos(
          (lat2 * Math.PI) /
            180
        ) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return raioTerra * c;
  }

  function formatarDistancia(
    distanciaKm: number
  ) {
    if (
      distanciaKm < 1
    ) {
      return `${Math.round(
        distanciaKm * 1000
      )} m`;
    }

    return `${distanciaKm.toFixed(
      1
    )} km`;
  }

  const termoBusca =
    busca
      .trim()
      .toLowerCase();

  const locaisFiltrados =
    locais.filter(
      (local) => {
        return (
          local.nome
            .toLowerCase()
            .includes(
              termoBusca
            ) ||
          local.endereco
            ?.toLowerCase()
            .includes(
              termoBusca
            )
        );
      }
    );

  return (
    <View
      style={styles.container}
    >
      <View
        style={styles.header}
      >
        <Text
          style={styles.eyebrow}
        >
          EU BUSCO!
        </Text>

        <Text
          style={styles.title}
        >
          O que você quer encontrar?
        </Text>

        <Text
          style={styles.subtitle}
        >
          Explore lugares próximos de você ou pesquise qualquer outro destino.
        </Text>
      </View>

      <View
        style={
          styles.locationCard
        }
      >
        <Text
          style={
            styles.locationLabel
          }
        >
          Buscando perto de
        </Text>

        <Text
          style={
            styles.locationText
          }
        >
          {localizacaoBusca}
        </Text>

        <View
          style={
            styles.locationSearchRow
          }
        >
          <TextInput
            style={
              styles.locationInput
            }
            placeholder="Cidade, bairro ou endereço..."
            placeholderTextColor="#888"
            value={
              buscaLocalizacao
            }
            onChangeText={
              setBuscaLocalizacao
            }
            returnKeyType="search"
            onSubmitEditing={
              pesquisarLocalizacao
            }
          />

          <Pressable
            style={
              styles.locationSearchButton
            }
            onPress={
              pesquisarLocalizacao
            }
            disabled={
              carregandoLocalizacao
            }
          >
            <Text
              style={
                styles.locationSearchButtonText
              }
            >
              Buscar
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={
            styles.currentLocationButton
          }
          onPress={
            usarMinhaLocalizacao
          }
          disabled={
            carregandoLocalizacao
          }
        >
          <Text
            style={
              styles.currentLocationText
            }
          >
            {carregandoLocalizacao
              ? 'Obtendo localização...'
              : '📍 Usar minha localização atual'}
          </Text>
        </Pressable>
      </View>

      <View
        style={styles.searchBox}
      >
        <Text
          style={styles.searchIcon}
        >
          ⌕
        </Text>

        <TextInput
          style={
            styles.searchInput
          }
          placeholder="Filtrar resultados..."
          placeholderTextColor="#888"
          value={busca}
          onChangeText={
            setBusca
          }
        />
      </View>

      <View
        style={
          styles.categoriesWrapper
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.categoriesContainer
          }
        >
          {CATEGORIAS.map(
            (categoria) => {
              const selecionada =
                categoriaSelecionada ===
                categoria;

              return (
                <Pressable
                  key={
                    categoria
                  }
                  onPress={() =>
                    setCategoriaSelecionada(
                      categoria
                    )
                  }
                  style={[
                    styles.categoryChip,
                    selecionada &&
                      styles.categoryChipSelected,
                  ]}
                >
                  <Text
                    numberOfLines={
                      1
                    }
                    style={[
                      styles.categoryText,
                      selecionada &&
                        styles.categoryTextSelected,
                    ]}
                  >
                    {
                      categoria
                    }
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>
      </View>

      <Text
        style={
          styles.sectionTitle
        }
      >
        Resultados
      </Text>

      {carregando ? (
        <View
          style={styles.center}
        >
          <ActivityIndicator
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Procurando lugares...
          </Text>
        </View>
      ) : erro ? (
        <View
          style={styles.center}
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
            onPress={() => {
              if (
                latitudeBusca !==
                  null &&
                longitudeBusca !==
                  null
              ) {
                buscarLocais(
                  latitudeBusca,
                  longitudeBusca
                );
              }
            }}
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
      ) : (
        <FlatList
          data={
            locaisFiltrados
          }
          keyExtractor={(
            item
          ) => item.id}
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.list
          }
          ListEmptyComponent={
            <View
              style={
                styles.emptyContainer
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                Nenhum local encontrado
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Tente outra categoria ou outra localização.
              </Text>
            </View>
          }
          renderItem={({
            item,
          }) => {
            let textoDistancia =
              '';

            if (
              latitudeBusca !==
                null &&
              longitudeBusca !==
                null
            ) {
              textoDistancia =
                formatarDistancia(
                  calcularDistancia(
                    latitudeBusca,
                    longitudeBusca,
                    item.latitude,
                    item.longitude
                  )
                );
            }

            return (
              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.card,
                  pressed &&
                    styles.cardPressed,
                ]}
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
                      ⌖
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
                      {
                        item.nome
                      }
                    </Text>

                    <Text
                      style={
                        styles.localMeta
                      }
                    >
                      {
                        categoriaSelecionada
                      }
                    </Text>

                    <Text
                      style={
                        styles.addressText
                      }
                    >
                      {item.endereco ||
                        'Endereço não disponível'}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.arrow
                    }
                  >
                    ›
                  </Text>
                </View>

                <View
                  style={
                    styles.divider
                  }
                />

                <View
                  style={
                    styles.distanceRow
                  }
                >
                  <Text
                    style={
                      styles.distanceLabel
                    }
                  >
                    Distância do ponto pesquisado
                  </Text>

                  <Text
                    style={
                      styles.distanceValue
                    }
                  >
                    {
                      textoDistancia
                    }
                  </Text>
                </View>
              </Pressable>
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
      paddingTop: 52,
      paddingHorizontal: 20,
    },

    header: {
      marginBottom: 16,
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
      marginBottom: 7,
    },

    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: '#666666',
    },

    locationCard: {
      backgroundColor:
        '#ffffff',
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        '#e6e6ec',
    },

    locationLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#777777',
      marginBottom: 4,
    },

    locationText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#222222',
      lineHeight: 20,
      marginBottom: 12,
    },

    locationSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },

    locationInput: {
      flex: 1,
      backgroundColor:
        '#f7f7fb',
      borderWidth: 1,
      borderColor:
        '#e2e2ea',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: '#222222',
      fontSize: 14,
      marginRight: 8,
    },

    locationSearchButton: {
      backgroundColor:
        '#6d28d9',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    locationSearchButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },

    currentLocationButton: {
      paddingVertical: 5,
      alignItems: 'flex-start',
    },

    currentLocationText: {
      color: '#6d28d9',
      fontSize: 13,
      fontWeight: '700',
    },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#ffffff',
      borderRadius: 16,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        '#e6e6ec',
    },

    searchIcon: {
      fontSize: 22,
      marginRight: 8,
      color: '#777777',
    },

    searchInput: {
      flex: 1,
      paddingVertical: 13,
      fontSize: 15,
      color: '#222222',
    },

    categoriesWrapper: {
      height: 52,
      marginBottom: 13,
    },

    categoriesContainer: {
      alignItems: 'center',
      paddingRight: 12,
    },

    categoryChip: {
      minHeight: 40,
      paddingHorizontal: 17,
      justifyContent:
        'center',
      alignItems: 'center',
      borderRadius: 999,
      backgroundColor:
        '#ffffff',
      borderWidth: 1,
      borderColor:
        '#dedee6',
      marginRight: 8,
    },

    categoryChipSelected: {
      backgroundColor:
        '#6d28d9',
      borderColor:
        '#6d28d9',
    },

    categoryText: {
      fontSize: 14,
      lineHeight: 18,
      color: '#555555',
      fontWeight: '600',
    },

    categoryTextSelected: {
      color: '#ffffff',
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: 'bold',
      color: '#222222',
      marginBottom: 12,
    },

    center: {
      flex: 1,
      justifyContent:
        'center',
      alignItems: 'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#777777',
    },

    errorText: {
      fontSize: 15,
      color: '#555555',
      textAlign: 'center',
      marginBottom: 16,
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
      paddingBottom: 30,
    },

    card: {
      backgroundColor:
        '#ffffff',
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        '#e8e8ef',
    },

    cardPressed: {
      opacity: 0.75,
    },

    cardTop: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
    },

    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        '#f1ebff',
      justifyContent:
        'center',
      alignItems: 'center',
      marginRight: 12,
    },

    iconText: {
      fontSize: 23,
      color: '#6d28d9',
    },

    cardMain: {
      flex: 1,
    },

    localName: {
      fontSize: 18,
      fontWeight: '700',
      color: '#222222',
      marginBottom: 4,
    },

    localMeta: {
      fontSize: 14,
      color: '#6d28d9',
      marginBottom: 4,
    },

    addressText: {
      fontSize: 13,
      color: '#666666',
      lineHeight: 18,
    },

    arrow: {
      fontSize: 28,
      color: '#aaaaaa',
      marginLeft: 8,
    },

    divider: {
      height: 1,
      backgroundColor:
        '#eeeef3',
      marginVertical: 14,
    },

    distanceRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    distanceLabel: {
      flex: 1,
      fontSize: 12,
      color: '#888888',
      marginRight: 12,
    },

    distanceValue: {
      fontSize: 14,
      fontWeight: '700',
      color: '#333333',
    },

    emptyContainer: {
      alignItems: 'center',
      paddingTop: 45,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#333333',
      marginBottom: 6,
    },

    emptyText: {
      fontSize: 14,
      color: '#777777',
      textAlign: 'center',
    },
  });