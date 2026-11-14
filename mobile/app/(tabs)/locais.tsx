import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { API_URL } from '@/services/api';
import { buscarUsuario, obterHeadersAutenticacao } from '@/services/auth';
import MapView, { Callout, Marker } from 'react-native-maps';

type Local = {
  id: string;
  nome: string;
  categoria: string;
  latitude: number;
  longitude: number;
  endereco: string;
};

type VisitaAtiva = {
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

const CATEGORIAS = [
  'Cafés',
  'Restaurantes',
  'Sorveterias',
  'Bares',
  'Supermercados',
  'Farmácias',
  'Praias',
  'Hospitais',
];

export default function LocaisScreen() {
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState('Cafés');

  const [locais, setLocais] = useState<Local[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState('');
  const [visitaAtiva, setVisitaAtiva] = useState<VisitaAtiva | null>(null);
  const [erroVisitaAtiva, setErroVisitaAtiva] = useState(false);

  const mapaRef = useRef<MapView>(null);
  const [mapaPronto, setMapaPronto] = useState(false);

  const [localizacaoBusca, setLocalizacaoBusca] =
    useState('Obtendo sua localização...');

  const [latitudeBusca, setLatitudeBusca] =
    useState<number | null>(null);

  const [longitudeBusca, setLongitudeBusca] =
    useState<number | null>(null);

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

  // Ao voltar da tela de detalhes, verifica se houve check-in ou check-out.
  // A consulta é independente da categoria atualmente selecionada no ROLÊ!.
  useFocusEffect(
    useCallback(() => {
      let telaAtiva = true;

      async function atualizarVisitaAtiva() {
        try {
          const usuario = await buscarUsuario();
          if (!telaAtiva) return;

          if (!usuario?.id) {
            setVisitaAtiva(null);
            setErroVisitaAtiva(false);
            return;
          }

          const headers = await obterHeadersAutenticacao();
          const response = await fetch(
            `${API_URL}/visitas/ativa?usuarioId=${encodeURIComponent(String(usuario.id))}`,
            { headers: { ...headers, Accept: 'application/json' } }
          );
          if (!telaAtiva) return;

          if (response.status === 204) {
            setVisitaAtiva(null);
            setErroVisitaAtiva(false);
            return;
          }

          if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
          }

          const visita: VisitaAtiva = await response.json();
          if (!telaAtiva) return;
          setVisitaAtiva(visita?.checkOut ? null : visita);
          setErroVisitaAtiva(false);
        } catch (error) {
          console.error('Erro ao consultar visita ativa no ROLÊ!:', error);
          if (telaAtiva) {
            // Evita mostrar check-in antigo como se ainda estivesse em andamento.
            setVisitaAtiva(null);
            setErroVisitaAtiva(true);
          }
        }
      }

      void atualizarVisitaAtiva();
      return () => { telaAtiva = false; };
    }, [])
  );

  function abrirVisitaAtiva() {
    if (!visitaAtiva) return;

    const distancia = latitudeBusca !== null && longitudeBusca !== null &&
      Number.isFinite(visitaAtiva.latitude) && Number.isFinite(visitaAtiva.longitude)
      ? formatarDistancia(calcularDistancia(
          latitudeBusca, longitudeBusca,
          visitaAtiva.latitude, visitaAtiva.longitude
        ))
      : '';

    router.push({
      pathname: '/local/[id]' as any,
      params: {
        id: visitaAtiva.localId,
        nome: visitaAtiva.nomeLocal,
        categoria: visitaAtiva.categoria,
        endereco: visitaAtiva.endereco || 'Endereço não disponível',
        distancia,
        latitude: String(visitaAtiva.latitude),
        longitude: String(visitaAtiva.longitude),
      },
    });
  }

  async function usarMinhaLocalizacao() {
    try {
      setErro('');

      const permissao =
        await Location.requestForegroundPermissionsAsync();

      if (permissao.status !== 'granted') {
        setErro(
          'Permissão de localização necessária para usar sua localização atual.'
        );
        return;
      }

      const localizacao =
        await Location.getCurrentPositionAsync({});

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

      if (enderecoAtual.length > 0) {
        const e = enderecoAtual[0];

        const partes = [
          e.street,
          e.streetNumber,
          e.district,
          e.city,
          e.region,
          e.postalCode,
        ].filter(Boolean);

        if (partes.length > 0) {
          enderecoFormatado =
            partes.join(', ');
        }
      }

      setLocalizacaoBusca(
        enderecoFormatado
      );

      setLatitudeBusca(latitude);
      setLongitudeBusca(longitude);

    } catch (error) {
      console.error(error);

      setErro(
        'Não foi possível obter sua localização atual.'
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
      
      // Limpa os resultados antigos antes da nova busca.
      setLocais([]);

      const categoriaApi =
        converterCategoriaParaApi(
          categoriaSelecionada
        );

      const headers = await obterHeadersAutenticacao();
      const response = await fetch(
        `${API_URL}/locais/proximos?lat=${latitude}&lon=${longitude}&categoria=${categoriaApi}`,
        { headers: { ...headers, Accept: 'application/json' } }
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

      case 'Hospitais':
        return 'hospital';  

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
    const raioTerra = 6371;

    const dLat =
      ((lat2 - lat1) * Math.PI) /
      180;

    const dLon =
      ((lon2 - lon1) * Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) / 180
      ) *
        Math.cos(
          (lat2 * Math.PI) / 180
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
    if (distanciaKm < 1) {
      return `${Math.round(
        distanciaKm * 1000
      )} m`;
    }

    return `${distanciaKm.toFixed(
      1
    )} km`;
  }

  // O mapa utiliza os mesmos resultados exibidos nos cartões.
  const locaisComCoordenadas = useMemo(
    () => locais.filter(
      (local) => Number.isFinite(local.latitude) &&
                 Number.isFinite(local.longitude) &&
                 Math.abs(local.latitude) <= 90 &&
                 Math.abs(local.longitude) <= 180
    ),
    [locais]
  );

  function abrirDetalhesLocal(local: Local) {
    const textoDistancia = latitudeBusca !== null && longitudeBusca !== null
      ? formatarDistancia(calcularDistancia(
          latitudeBusca, longitudeBusca, local.latitude, local.longitude
        ))
      : '';

    router.push({
      pathname: '/local/[id]' as any,
      params: {
        id: local.id,
        nome: local.nome,
        categoria: categoriaSelecionada,
        endereco: local.endereco || 'Endereço não disponível',
        distancia: textoDistancia,
        latitude: String(local.latitude),
        longitude: String(local.longitude),
      },
    });
  }

  function ajustarMapa() {
    if (!mapaRef.current || latitudeBusca === null || longitudeBusca === null) {
      return;
    }

    const coordenadas = [
      { latitude: latitudeBusca, longitude: longitudeBusca },
      ...locaisComCoordenadas.map((local) => ({
        latitude: local.latitude,
        longitude: local.longitude,
      })),
    ];

    if (coordenadas.length > 1) {
      mapaRef.current.fitToCoordinates(coordenadas, {
        edgePadding: { top: 45, right: 45, bottom: 45, left: 45 },
        animated: false,
      });
    } else {
      mapaRef.current.animateToRegion({
        latitude: latitudeBusca,
        longitude: longitudeBusca,
        latitudeDelta: 0.055,
        longitudeDelta: 0.055,
      }, 250);
    }
  }

  useEffect(() => {
    if (mapaPronto) ajustarMapa();
  }, [mapaPronto, locaisComCoordenadas, latitudeBusca, longitudeBusca]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          ROLÊ!
        </Text>

        <Text style={styles.title}>
          O que você quer encontrar?
        </Text>

        <Text style={styles.subtitle}>
          Explore lugares próximos da sua localização atual.
        </Text>
      </View>

      {visitaAtiva && (
        <Pressable
          style={({ pressed }) => [
            styles.activeVisitCard,
            pressed && styles.activeVisitCardPressed,
          ]}
          onPress={abrirVisitaAtiva}
          accessibilityRole="button"
          accessibilityLabel={`Visita em andamento em ${visitaAtiva.nomeLocal}. Abrir detalhes para fazer check-out.`}
        >
          <View style={styles.activeVisitIndicator} />
          <View style={styles.activeVisitContent}>
            <Text style={styles.activeVisitLabel}>VISITA EM ANDAMENTO</Text>
            <Text style={styles.activeVisitName} numberOfLines={2}>
              {visitaAtiva.nomeLocal || 'Local visitado'}
            </Text>
            <Text style={styles.activeVisitHelper}>
              Toque para ver os detalhes e fazer check-out
            </Text>
          </View>
          <Text style={styles.activeVisitChevron}>›</Text>
        </Pressable>
      )}
      {erroVisitaAtiva && !visitaAtiva && (
        <Text style={styles.activeVisitError}>
          Não foi possível verificar se há uma visita em andamento.
        </Text>
      )}

      <View style={styles.locationCard}>
        <Text style={styles.locationLabel}>
          Sua localização
        </Text>

        <Text style={styles.locationText}>
          {localizacaoBusca}
        </Text>

      </View>

      <View
        style={styles.categoriesWrapper}
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
                  key={categoria}
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
                    numberOfLines={1}
                    style={[
                      styles.categoryText,
                      selecionada &&
                        styles.categoryTextSelected,
                    ]}
                  >
                    {categoria}
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>
      </View>

      {latitudeBusca !== null && longitudeBusca !== null && (
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.mapHeaderText}>
              <Text style={styles.mapTitle}>Mapa dos locais</Text>
              <Text style={styles.mapSubtitle}>
                {carregando
                  ? 'Atualizando os locais...'
                  : `${locaisComCoordenadas.length} ${categoriaSelecionada.toLowerCase()} no mapa`}
              </Text>
            </View>
            <Pressable
              style={styles.mapCenterButton}
              onPress={ajustarMapa}
              accessibilityLabel="Centralizar mapa nos resultados"
            >
              <Text style={styles.mapCenterButtonText}>Centralizar</Text>
            </Pressable>
          </View>

          <MapView
            ref={mapaRef}
            style={styles.map}
            initialRegion={{
              latitude: latitudeBusca,
              longitude: longitudeBusca,
              latitudeDelta: 0.055,
              longitudeDelta: 0.055,
            }}
            onMapReady={() => setMapaPronto(true)}
            showsCompass
            showsScale
          >
            <Marker
              coordinate={{ latitude: latitudeBusca, longitude: longitudeBusca }}
              title="Sua localização atual"
              description={localizacaoBusca}
              pinColor="#2563eb"
            />
            {locaisComCoordenadas.map((local) => (
              <Marker
                key={local.id}
                coordinate={{ latitude: local.latitude, longitude: local.longitude }}
                pinColor="#6d28d9"
                title={local.nome}
                description={local.endereco || 'Toque para ver os detalhes'}
              >
                <Callout onPress={() => abrirDetalhesLocal(local)}>
                  <View style={styles.mapCallout}>
                    <Text style={styles.mapCalloutTitle}>{local.nome}</Text>
                    <Text style={styles.mapCalloutAddress}>
                      {local.endereco || 'Endereço não disponível'}
                    </Text>
                    <Text style={styles.mapCalloutLink}>Ver detalhes</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
          <Text style={styles.mapHint}>
            Toque em um pin roxinho para ver o local. O pin azul indica sua localização atual.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Resultados
      </Text>

      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Procurando lugares...
          </Text>
        </View>
      ) : erro ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {erro}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              if (
                latitudeBusca !== null &&
                longitudeBusca !== null
              ) {
                buscarLocais(
                  latitudeBusca,
                  longitudeBusca
                );
              }
            }}
          >
            <Text style={styles.retryText}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={locais}
          keyExtractor={(item) =>
            item.id
          }
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
                style={styles.emptyTitle}
              >
                Nenhum local encontrado
              </Text>

              <Text
                style={styles.emptyText}
              >
                Tente outra categoria.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            let textoDistancia = '';

            if (
              latitudeBusca !== null &&
              longitudeBusca !== null
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
                style={({ pressed }) => [
                  styles.card,
                  pressed &&
                    styles.cardPressed,
                ]}
                onPress={() => abrirDetalhesLocal(item)}
              >
                <View style={styles.cardTop}>
                  <View
                    style={styles.iconBox}
                  >
                    <Text
                      style={styles.iconText}
                    >
                      ⌖
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
                      {item.nome}
                    </Text>

                    <Text
                      style={
                        styles.localMeta
                      }
                    >
                      {categoriaSelecionada}
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

                  <Text style={styles.arrow}>
                    ›
                  </Text>
                </View>

                <View
                  style={styles.divider}
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
                    Distância da sua localização
                  </Text>

                  <Text
                    style={
                      styles.distanceValue
                    }
                  >
                    {textoDistancia}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
    paddingTop: 52,
    paddingHorizontal: 20,
  },

  activeVisitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1ebff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 14,
  },
  activeVisitCardPressed: {
    opacity: 0.75,
  },
  activeVisitIndicator: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#6d28d9',
    marginRight: 12,
  },
  activeVisitContent: {
    flex: 1,
  },
  activeVisitLabel: {
    color: '#6d28d9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  activeVisitName: {
    color: '#252133',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  activeVisitHelper: {
    color: '#625678',
    fontSize: 12,
  },
  activeVisitChevron: {
    color: '#6d28d9',
    fontSize: 29,
    marginLeft: 8,
  },
  activeVisitError: {
    fontSize: 12,
    color: '#765b22',
    marginBottom: 12,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e6e6ec',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedee6',
    marginRight: 8,
  },

  categoryChipSelected: {
    backgroundColor: '#6d28d9',
    borderColor: '#6d28d9',
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

  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6e6ec',
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapHeader: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapHeaderText: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  mapCenterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1ebff',
    marginLeft: 8,
  },
  mapCenterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6d28d9',
  },
  map: {
    height: 235,
    width: '100%',
  },
  mapHint: {
    fontSize: 11,
    color: '#777777',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mapCallout: {
    minWidth: 175,
    maxWidth: 240,
    padding: 4,
  },
  mapCalloutTitle: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  mapCalloutAddress: {
    fontSize: 12,
    color: '#666666',
  },
  mapCalloutLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6d28d9',
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 12,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
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
    backgroundColor: '#6d28d9',
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
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8e8ef',
  },

  cardPressed: {
    opacity: 0.75,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f1ebff',
    justifyContent: 'center',
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
    backgroundColor: '#eeeef3',
    marginVertical: 14,
  },

  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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