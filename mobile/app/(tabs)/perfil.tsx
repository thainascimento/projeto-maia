import { API_URL } from '@/services/api';
import {
  buscarUsuario,
  removerUsuario,
  salvarUsuario,
} from '@/services/auth';

import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  fotoUri?: string | null;
  contatoEmergenciaNome?: string | null;
  contatoEmergenciaTelefone?: string | null;
  contatoEmergenciaRelacao?: string | null;
  perfilCompleto?: boolean;
};

type UsuarioBackend = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  contatoEmergenciaNome?: string | null;
  contatoEmergenciaTelefone?: string | null;
  contatoEmergenciaRelacao?: string | null;
  perfilCompleto?: boolean;
};

type PaisTelefone = {
  nome: string;
  codigo: string;
  bandeira: string;
};

const PAISES: PaisTelefone[] = [
  {
    nome: 'Brasil',
    codigo: '+55',
    bandeira: '🇧🇷',
  },
  {
    nome: 'Argentina',
    codigo: '+54',
    bandeira: '🇦🇷',
  },
  {
    nome: 'Bolívia',
    codigo: '+591',
    bandeira: '🇧🇴',
  },
  {
    nome: 'Chile',
    codigo: '+56',
    bandeira: '🇨🇱',
  },
  {
    nome: 'Colômbia',
    codigo: '+57',
    bandeira: '🇨🇴',
  },
  {
    nome: 'Costa Rica',
    codigo: '+506',
    bandeira: '🇨🇷',
  },
  {
    nome: 'Cuba',
    codigo: '+53',
    bandeira: '🇨🇺',
  },
  {
    nome: 'Equador',
    codigo: '+593',
    bandeira: '🇪🇨',
  },
  {
    nome: 'El Salvador',
    codigo: '+503',
    bandeira: '🇸🇻',
  },
  {
    nome: 'Estados Unidos',
    codigo: '+1',
    bandeira: '🇺🇸',
  },
  {
    nome: 'Canadá',
    codigo: '+1',
    bandeira: '🇨🇦',
  },
  {
    nome: 'Guatemala',
    codigo: '+502',
    bandeira: '🇬🇹',
  },
  {
    nome: 'Honduras',
    codigo: '+504',
    bandeira: '🇭🇳',
  },
  {
    nome: 'México',
    codigo: '+52',
    bandeira: '🇲🇽',
  },
  {
    nome: 'Nicarágua',
    codigo: '+505',
    bandeira: '🇳🇮',
  },
  {
    nome: 'Panamá',
    codigo: '+507',
    bandeira: '🇵🇦',
  },
  {
    nome: 'Paraguai',
    codigo: '+595',
    bandeira: '🇵🇾',
  },
  {
    nome: 'Peru',
    codigo: '+51',
    bandeira: '🇵🇪',
  },
  {
    nome: 'Porto Rico',
    codigo: '+1',
    bandeira: '🇵🇷',
  },
  {
    nome: 'República Dominicana',
    codigo: '+1',
    bandeira: '🇩🇴',
  },
  {
    nome: 'Uruguai',
    codigo: '+598',
    bandeira: '🇺🇾',
  },
  {
    nome: 'Venezuela',
    codigo: '+58',
    bandeira: '🇻🇪',
  },
  {
    nome: 'Portugal',
    codigo: '+351',
    bandeira: '🇵🇹',
  },
  {
    nome: 'Espanha',
    codigo: '+34',
    bandeira: '🇪🇸',
  },
  {
    nome: 'França',
    codigo: '+33',
    bandeira: '🇫🇷',
  },
  {
    nome: 'Itália',
    codigo: '+39',
    bandeira: '🇮🇹',
  },
  {
    nome: 'Alemanha',
    codigo: '+49',
    bandeira: '🇩🇪',
  },
  {
    nome: 'Reino Unido',
    codigo: '+44',
    bandeira: '🇬🇧',
  },
  {
    nome: 'Irlanda',
    codigo: '+353',
    bandeira: '🇮🇪',
  },
  {
    nome: 'Países Baixos',
    codigo: '+31',
    bandeira: '🇳🇱',
  },
  {
    nome: 'Bélgica',
    codigo: '+32',
    bandeira: '🇧🇪',
  },
  {
    nome: 'Suíça',
    codigo: '+41',
    bandeira: '🇨🇭',
  },
  {
    nome: 'Áustria',
    codigo: '+43',
    bandeira: '🇦🇹',
  },
  {
    nome: 'Grécia',
    codigo: '+30',
    bandeira: '🇬🇷',
  },
  {
    nome: 'Austrália',
    codigo: '+61',
    bandeira: '🇦🇺',
  },
  {
    nome: 'Nova Zelândia',
    codigo: '+64',
    bandeira: '🇳🇿',
  },
  {
    nome: 'Japão',
    codigo: '+81',
    bandeira: '🇯🇵',
  },
  {
    nome: 'Coreia do Sul',
    codigo: '+82',
    bandeira: '🇰🇷',
  },
];

const BRASIL =
  PAISES.find(
    (pais) =>
      pais.nome === 'Brasil'
  ) ?? PAISES[0];

function somenteNumeros(
  valor: string
) {
  return valor.replace(/\D/g, '');
}

function separarTelefoneSalvo(
  valor?: string | null
): {
  pais: PaisTelefone;
  numero: string;
} {
  if (!valor?.trim()) {
    return {
      pais: BRASIL,
      numero: '',
    };
  }

  const limpo = valor.trim();

  if (!limpo.startsWith('+')) {
    return {
      pais: BRASIL,
      numero: somenteNumeros(limpo),
    };
  }

  const paisesOrdenados = [
    ...PAISES,
  ].sort(
    (a, b) =>
      b.codigo.length -
      a.codigo.length
  );

  const paisEncontrado =
    paisesOrdenados.find(
      (pais) =>
        limpo.startsWith(
          pais.codigo
        )
    );

  if (!paisEncontrado) {
    return {
      pais: BRASIL,
      numero: somenteNumeros(limpo),
    };
  }

  return {
    pais: paisEncontrado,
    numero: somenteNumeros(
      limpo.slice(
        paisEncontrado.codigo.length
      )
    ),
  };
}

function montarTelefoneInternacional(
  pais: PaisTelefone,
  numero: string
) {
  const numeroLimpo =
    somenteNumeros(numero);

  if (!numeroLimpo) {
    return null;
  }

  return `${pais.codigo}${numeroLimpo}`;
}

export default function PerfilScreen() {
  const [
    usuario,
    setUsuario,
  ] = useState<Usuario | null>(
    null
  );

  const [
    nome,
    setNome,
  ] = useState('');

  const [
    telefone,
    setTelefone,
  ] = useState('');

  const [
    paisTelefone,
    setPaisTelefone,
  ] =
    useState<PaisTelefone>(
      BRASIL
    );

  const [
    fotoUri,
    setFotoUri,
  ] = useState<string | null>(
    null
  );

  const [
    contatoNome,
    setContatoNome,
  ] = useState('');

  const [
    contatoTelefone,
    setContatoTelefone,
  ] = useState('');

  const [
    paisContato,
    setPaisContato,
  ] =
    useState<PaisTelefone>(
      BRASIL
    );

  const [
    contatoRelacao,
    setContatoRelacao,
  ] = useState('');

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    seletorAberto,
    setSeletorAberto,
  ] = useState<
    'usuario' | 'contato' | null
  >(null);

  const [
    buscaPais,
    setBuscaPais,
  ] = useState('');

  useEffect(() => {
    void carregarUsuario();
  }, []);

  async function carregarUsuario() {
    try {
      setCarregando(true);

      const usuarioSalvo =
        await buscarUsuario();

      if (!usuarioSalvo) {
        router.replace('/login');
        return;
      }

      const usuarioCompleto =
        usuarioSalvo as Usuario;

      setUsuario(
        usuarioCompleto
      );

      setNome(
        usuarioCompleto.nome ?? ''
      );

      setFotoUri(
        usuarioCompleto.fotoUri ??
          null
      );

      const telefoneSeparado =
        separarTelefoneSalvo(
          usuarioCompleto.telefone
        );

      setPaisTelefone(
        telefoneSeparado.pais
      );

      setTelefone(
        telefoneSeparado.numero
      );

      setContatoNome(
        usuarioCompleto
          .contatoEmergenciaNome ??
          ''
      );

      const contatoSeparado =
        separarTelefoneSalvo(
          usuarioCompleto
            .contatoEmergenciaTelefone
        );

      setPaisContato(
        contatoSeparado.pais
      );

      setContatoTelefone(
        contatoSeparado.numero
      );

      setContatoRelacao(
        usuarioCompleto
          .contatoEmergenciaRelacao ??
          ''
      );
    } catch (error) {
      console.error(
        'Erro ao carregar perfil:',
        error
      );

      Alert.alert(
        'Não foi possível carregar o perfil',
        'Tente novamente.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function escolherFoto() {
    try {
      const permissao =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          'Permissão necessária',
          'Para escolher uma foto de perfil, permita o acesso à sua galeria.'
        );

        return;
      }

      const resultado =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              'images',
            ],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (resultado.canceled) {
        return;
      }

      const imagem =
        resultado.assets[0];

      if (!imagem?.uri) {
        return;
      }

      if (
        !FileSystem.documentDirectory
      ) {
        throw new Error(
          'Diretório persistente indisponível.'
        );
      }

      const nomeOriginal =
        imagem.fileName ??
        imagem.uri
          .split('/')
          .pop() ??
        '';

      const extensaoEncontrada =
        nomeOriginal
          .split('.')
          .pop()
          ?.toLowerCase();

      const extensoesValidas = [
        'jpg',
        'jpeg',
        'png',
        'heic',
        'heif',
        'webp',
      ];

      const extensao =
        extensaoEncontrada &&
        extensoesValidas.includes(
          extensaoEncontrada
        )
          ? extensaoEncontrada
          : 'jpg';

      const destino =
        `${FileSystem.documentDirectory}` +
        `perfil_usuario_${usuario?.id ?? 'local'}.${extensao}`;

      const arquivoAnterior =
        await FileSystem.getInfoAsync(
          destino
        );

      if (
        arquivoAnterior.exists
      ) {
        await FileSystem.deleteAsync(
          destino,
          {
            idempotent: true,
          }
        );
      }

      await FileSystem.copyAsync({
        from: imagem.uri,
        to: destino,
      });

      const arquivoSalvo =
        await FileSystem.getInfoAsync(
          destino
        );

      if (!arquivoSalvo.exists) {
        throw new Error(
          'A foto não foi copiada corretamente.'
        );
      }

      setFotoUri(destino);

      if (usuario) {
        const usuarioComFoto: Usuario =
          {
            ...usuario,
            fotoUri: destino,
          };

        await salvarUsuario(
          usuarioComFoto
        );

        setUsuario(
          usuarioComFoto
        );
      }
    } catch (error) {
      console.error(
        'Erro ao selecionar foto:',
        error
      );

      Alert.alert(
        'Não foi possível selecionar a foto',
        'Tente novamente.'
      );
    }
  }

  function abrirSeletorPais(
    tipo:
      | 'usuario'
      | 'contato'
  ) {
    setBuscaPais('');
    setSeletorAberto(tipo);
  }

  function fecharSeletorPais() {
    setBuscaPais('');
    setSeletorAberto(null);
  }

  function selecionarPais(
    pais: PaisTelefone
  ) {
    if (
      seletorAberto ===
      'usuario'
    ) {
      setPaisTelefone(pais);
    }

    if (
      seletorAberto ===
      'contato'
    ) {
      setPaisContato(pais);
    }

    fecharSeletorPais();
  }

  function validarPerfil() {
    if (!nome.trim()) {
      Alert.alert(
        'Nome obrigatório',
        'Informe seu nome.'
      );

      return false;
    }

    if (
      nome.trim().length < 2
    ) {
      Alert.alert(
        'Nome inválido',
        'Informe um nome válido.'
      );

      return false;
    }

    if (!contatoNome.trim()) {
      Alert.alert(
        'Contato de emergência',
        'Informe o nome do seu contato de emergência.'
      );

      return false;
    }

    const numeroContato =
      somenteNumeros(
        contatoTelefone
      );

    if (!numeroContato) {
      Alert.alert(
        'Contato de emergência',
        'Informe o telefone do seu contato de emergência.'
      );

      return false;
    }

    if (
      numeroContato.length < 6
    ) {
      Alert.alert(
        'Telefone inválido',
        'Confira o telefone do seu contato de emergência.'
      );

      return false;
    }

    return true;
  }

  async function salvarPerfil() {
    if (!usuario) {
      return;
    }

    if (!validarPerfil()) {
      return;
    }

    const telefoneCompleto =
      montarTelefoneInternacional(
        paisTelefone,
        telefone
      );

    const contatoTelefoneCompleto =
      montarTelefoneInternacional(
        paisContato,
        contatoTelefone
      );

    try {
      setSalvando(true);

      const response =
        await fetch(
          `${API_URL}/usuarios/${usuario.id}/perfil`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              nome:
                nome.trim(),

              telefone:
                telefoneCompleto,

              contatoEmergenciaNome:
                contatoNome.trim(),

              contatoEmergenciaTelefone:
                contatoTelefoneCompleto,

              contatoEmergenciaRelacao:
                contatoRelacao.trim() ||
                null,
            }),
          }
        );

      if (
        response.status === 404
      ) {
        Alert.alert(
          'Usuária não encontrada',
          'Não foi possível localizar sua conta.'
        );

        return;
      }

      if (
        response.status === 400
      ) {
        const mensagem =
          await response.text();

        Alert.alert(
          'Dados inválidos',
          mensagem ||
            'Confira as informações do perfil.'
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dadosBackend:
        UsuarioBackend =
        await response.json();

      const usuarioAtualizado:
        Usuario = {
        id:
          dadosBackend.id,

        nome:
          dadosBackend.nome,

        email:
          dadosBackend.email,

        telefone:
          dadosBackend.telefone ??
          null,

        fotoUri,

        contatoEmergenciaNome:
          dadosBackend
            .contatoEmergenciaNome ??
          null,

        contatoEmergenciaTelefone:
          dadosBackend
            .contatoEmergenciaTelefone ??
          null,

        contatoEmergenciaRelacao:
          dadosBackend
            .contatoEmergenciaRelacao ??
          null,

        perfilCompleto:
          dadosBackend
            .perfilCompleto ??
          false,
      };

      await salvarUsuario(
        usuarioAtualizado
      );

      setUsuario(
        usuarioAtualizado
      );

      setNome(
        usuarioAtualizado.nome
      );

      const telefoneAtualizado =
        separarTelefoneSalvo(
          usuarioAtualizado.telefone
        );

      setPaisTelefone(
        telefoneAtualizado.pais
      );

      setTelefone(
        telefoneAtualizado.numero
      );

      setContatoNome(
        usuarioAtualizado
          .contatoEmergenciaNome ??
          ''
      );

      const contatoAtualizado =
        separarTelefoneSalvo(
          usuarioAtualizado
            .contatoEmergenciaTelefone
        );

      setPaisContato(
        contatoAtualizado.pais
      );

      setContatoTelefone(
        contatoAtualizado.numero
      );

      setContatoRelacao(
        usuarioAtualizado
          .contatoEmergenciaRelacao ??
          ''
      );

      Alert.alert(
        'Perfil atualizado',
        'Suas informações foram salvas.'
      );
    } catch (error) {
      console.error(
        'Erro ao salvar perfil:',
        error
      );

      Alert.alert(
        'Não foi possível salvar',
        'Não foi possível atualizar seu perfil no servidor.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function sair() {
    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text: 'Sair',
          style:
            'destructive',

          onPress:
            async () => {
              await removerUsuario();

              router.replace(
                '/login'
              );
            },
        },
      ]
    );
  }

  const paisesFiltrados =
    PAISES.filter((pais) => {
      const busca =
        buscaPais
          .trim()
          .toLowerCase();

      if (!busca) {
        return true;
      }

      return (
        pais.nome
          .toLowerCase()
          .includes(busca) ||
        pais.codigo.includes(
          buscaPais.trim()
        )
      );
    });

  function renderCampoTelefone(
    pais: PaisTelefone,
    numero: string,
    alterarNumero:
      (valor: string) => void,
    tipo:
      | 'usuario'
      | 'contato'
  ) {
    return (
      <View
        style={
          styles.phoneContainer
        }
      >
        <Pressable
          style={({ pressed }) => [
            styles.countryButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={() =>
            abrirSeletorPais(
              tipo
            )
          }
        >
          <Text
            style={
              styles.countryFlag
            }
          >
            {pais.bandeira}
          </Text>

          <Text
            style={
              styles.countryCode
            }
          >
            {pais.codigo}
          </Text>

          <Text
            style={
              styles.countryArrow
            }
          >
            ▾
          </Text>
        </Pressable>

        <View
          style={
            styles.phoneDivider
          }
        />

        <TextInput
          style={
            styles.phoneInput
          }
          value={numero}
          onChangeText={(
            valor
          ) =>
            alterarNumero(
              somenteNumeros(
                valor
              )
            )
          }
          placeholder={
            pais.codigo === '+55'
              ? '11 99999-9999'
              : 'Número de telefone'
          }
          placeholderTextColor="#aaa3ae"
          keyboardType="phone-pad"
        />
      </View>
    );
  }

  if (carregando) {
    return (
      <View
        style={
          styles.loadingContainer
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
          Carregando seu perfil...
        </Text>
      </View>
    );
  }

  if (!usuario) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={styles.header}
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
                styles.backButtonText
              }
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={
              styles.headerTextArea
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              SUA CONTA
            </Text>

            <Text
              style={styles.title}
            >
              Perfil
            </Text>
          </View>
        </View>

        <View
          style={
            styles.photoArea
          }
        >
          <Pressable
            style={
              styles.photoButton
            }
            onPress={
              escolherFoto
            }
          >
            {fotoUri ? (
              <Image
                source={{
                  uri: fotoUri,
                }}
                style={
                  styles.photo
                }
              />
            ) : (
              <View
                style={
                  styles.photoPlaceholder
                }
              >
                <Text
                  style={
                    styles.photoInitial
                  }
                >
                  {nome
                    .trim()
                    .charAt(0)
                    .toUpperCase() ||
                    'U'}
                </Text>
              </View>
            )}

            <View
              style={
                styles.photoBadge
              }
            >
              <Text
                style={
                  styles.photoBadgeText
                }
              >
                +
              </Text>
            </View>
          </Pressable>

          <Text
            style={
              styles.userName
            }
          >
            {nome.trim() ||
              usuario.nome}
          </Text>

          <Text
            style={
              styles.userEmail
            }
          >
            {usuario.email}
          </Text>

          <Pressable
            onPress={
              escolherFoto
            }
          >
            <Text
              style={
                styles.changePhotoText
              }
            >
              {fotoUri
                ? 'Alterar foto'
                : 'Adicionar foto'}
            </Text>
          </Pressable>
        </View>

        <View
          style={styles.section}
        >
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            DADOS PESSOAIS
          </Text>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Sobre você
          </Text>

          <View
            style={
              styles.inputGroup
            }
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              NOME *
            </Text>

            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={
                setNome
              }
              placeholder="Seu nome"
              placeholderTextColor="#aaa3ae"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={100}
            />
          </View>

          <View
            style={
              styles.readOnlyField
            }
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              E-MAIL
            </Text>

            <Text
              style={
                styles.readOnlyValue
              }
            >
              {usuario.email}
            </Text>

            <Text
              style={
                styles.readOnlyHint
              }
            >
              O e-mail da conta não pode ser alterado por aqui.
            </Text>
          </View>

          <View
            style={
              styles.inputGroup
            }
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              SEU TELEFONE
            </Text>

            {renderCampoTelefone(
              paisTelefone,
              telefone,
              setTelefone,
              'usuario'
            )}
          </View>
        </View>

        <View
          style={[
            styles.section,
            styles.emergencySection,
          ]}
        >
          <View
            style={
              styles.emergencyHeader
            }
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
                styles.emergencyHeaderText
              }
            >
              <Text
                style={
                  styles.emergencyEyebrow
                }
              >
                SEGURANÇA
              </Text>

              <Text
                style={
                  styles.emergencyTitle
                }
              >
                Contato de emergência
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.emergencyDescription
            }
          >
            Este contato será usado nos recursos de segurança da maIA quando você solicitar ajuda.
          </Text>

          <View
            style={
              styles.requiredNotice
            }
          >
            <View
              style={
                styles.requiredDot
              }
            />

            <Text
              style={
                styles.requiredText
              }
            >
              Nome e telefone são obrigatórios.
            </Text>
          </View>

          <View
            style={
              styles.inputGroup
            }
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              NOME DO CONTATO *
            </Text>

            <TextInput
              style={styles.input}
              value={contatoNome}
              onChangeText={
                setContatoNome
              }
              placeholder="Ex.: Maria Santos"
              placeholderTextColor="#aaa3ae"
              autoCapitalize="words"
            />
          </View>

          <View
            style={
              styles.inputGroup
            }
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              TELEFONE DO CONTATO *
            </Text>

            {renderCampoTelefone(
              paisContato,
              contatoTelefone,
              setContatoTelefone,
              'contato'
            )}
          </View>

          <View
            style={
              styles.inputGroup
            }
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              RELAÇÃO COM VOCÊ
            </Text>

            <TextInput
              style={styles.input}
              value={
                contatoRelacao
              }
              onChangeText={
                setContatoRelacao
              }
              placeholder="Ex.: mãe, irmã, amiga"
              placeholderTextColor="#aaa3ae"
              autoCapitalize="sentences"
            />
          </View>

          <View
            style={
              styles.securityInfo
            }
          >
            <Text
              style={
                styles.securityInfoTitle
              }
            >
              Como isso será usado?
            </Text>

            <Text
              style={
                styles.securityInfoText
              }
            >
              Quando você acionar um recurso de segurança, a maIA poderá usar esse contato para ajudar a informar onde você está e solicitar que a pessoa confirme se você está bem.
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed &&
              styles.buttonPressed,
            salvando &&
              styles.buttonDisabled,
          ]}
          onPress={salvarPerfil}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator
              size="small"
              color="#ffffff"
            />
          ) : (
            <>
              <Text
                style={
                  styles.saveButtonText
                }
              >
                SALVAR ALTERAÇÕES
              </Text>

              <Text
                style={
                  styles.saveButtonArrow
                }
              >
                ›
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={sair}
        >
          <Text
            style={
              styles.logoutButtonText
            }
          >
            Sair da conta
          </Text>
        </Pressable>

        <Text
          style={
            styles.footerText
          }
        >
          Seus dados ajudam a maIA a acompanhar sua jornada de forma mais personalizada.
        </Text>
      </ScrollView>

      <Modal
        visible={
          seletorAberto !== null
        }
        transparent
        animationType="slide"
        onRequestClose={
          fecharSeletorPais
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={
              fecharSeletorPais
            }
          />

          <View
            style={
              styles.countryModal
            }
          >
            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalHeaderText
                }
              >
                <Text
                  style={
                    styles.modalEyebrow
                  }
                >
                  TELEFONE
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Código do país
                </Text>

                <Text
                  style={
                    styles.modalDescription
                  }
                >
                  Selecione o país do número de telefone.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={
                  fecharSeletorPais
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={
                styles.countrySearch
              }
              value={buscaPais}
              onChangeText={
                setBuscaPais
              }
              placeholder="Buscar país ou código"
              placeholderTextColor="#aaa3ae"
              autoCorrect={false}
            />

            <ScrollView
              style={
                styles.countryList
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              {paisesFiltrados.map(
                (pais, index) => {
                  const paisSelecionado =
                    seletorAberto ===
                    'usuario'
                      ? paisTelefone
                      : paisContato;

                  const selecionado =
                    paisSelecionado.nome ===
                      pais.nome &&
                    paisSelecionado.codigo ===
                      pais.codigo;

                  return (
                    <Pressable
                      key={`${pais.nome}-${pais.codigo}-${index}`}
                      style={({
                        pressed,
                      }) => [
                        styles.countryOption,

                        selecionado &&
                          styles.countryOptionSelected,

                        pressed &&
                          styles.countryOptionPressed,
                      ]}
                      onPress={() =>
                        selecionarPais(
                          pais
                        )
                      }
                    >
                      <Text
                        style={
                          styles.optionFlag
                        }
                      >
                        {
                          pais.bandeira
                        }
                      </Text>

                      <View
                        style={
                          styles.optionInfo
                        }
                      >
                        <Text
                          style={[
                            styles.optionName,

                            selecionado &&
                              styles.optionNameSelected,
                          ]}
                        >
                          {pais.nome}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.optionCode,

                          selecionado &&
                            styles.optionCodeSelected,
                        ]}
                      >
                        {pais.codigo}
                      </Text>

                      {selecionado && (
                        <View
                          style={
                            styles.selectedIndicator
                          }
                        >
                          <Text
                            style={
                              styles.selectedIndicatorText
                            }
                          >
                            ✓
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                }
              )}

              {paisesFiltrados.length ===
                0 && (
                <View
                  style={
                    styles.noCountryResult
                  }
                >
                  <Text
                    style={
                      styles.noCountryTitle
                    }
                  >
                    País não encontrado
                  </Text>

                  <Text
                    style={
                      styles.noCountryText
                    }
                  >
                    Tente buscar por outro nome ou código.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    keyboard: {
      flex: 1,
      backgroundColor:
        '#f8f7fc',
    },

    container: {
      flex: 1,
      backgroundColor:
        '#f8f7fc',
    },

    content: {
      paddingTop: 54,
      paddingHorizontal: 20,
      paddingBottom: 60,
    },

    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#f8f7fc',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      color: '#87808c',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 25,
    },

    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        '#ffffff',
      alignItems: 'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        '#ece7f1',
      marginRight: 14,
    },

    backButtonText: {
      marginTop: -3,
      fontSize: 31,
      lineHeight: 33,
      color: '#6d28d9',
      fontWeight: '400',
    },

    headerTextArea: {
      flex: 1,
    },

    headerEyebrow: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.7,
      color: '#8b5cf6',
    },

    title: {
      marginTop: 3,
      fontSize: 29,
      lineHeight: 34,
      fontWeight: '900',
      color: '#28232d',
    },

    photoArea: {
      alignItems: 'center',
      marginBottom: 28,
    },

    photoButton: {
      position: 'relative',
    },

    photo: {
      width: 112,
      height: 112,
      borderRadius: 56,
      borderWidth: 4,
      borderColor:
        '#ffffff',
    },

    photoPlaceholder: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor:
        '#eee6fa',
      borderWidth: 4,
      borderColor:
        '#ffffff',
      alignItems: 'center',
      justifyContent:
        'center',
      shadowColor:
        '#6d28d9',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },

    photoInitial: {
      fontSize: 39,
      fontWeight: '900',
      color: '#6d28d9',
    },

    photoBadge: {
      position: 'absolute',
      right: 0,
      bottom: 4,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        '#6d28d9',
      borderWidth: 3,
      borderColor:
        '#ffffff',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    photoBadgeText: {
      color: '#ffffff',
      fontSize: 21,
      lineHeight: 22,
      fontWeight: '900',
    },

    userName: {
      marginTop: 15,
      fontSize: 22,
      fontWeight: '900',
      color: '#2c2730',
    },

    userEmail: {
      marginTop: 4,
      fontSize: 12,
      color: '#8e8792',
    },

    changePhotoText: {
      marginTop: 10,
      fontSize: 11,
      fontWeight: '800',
      color: '#6d28d9',
    },

    section: {
      borderRadius: 26,
      backgroundColor:
        '#ffffff',
      padding: 20,
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        '#ebe5f1',
      shadowColor:
        '#291d3d',
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.045,
      shadowRadius: 16,
      elevation: 2,
    },

    sectionEyebrow: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: '#8b5cf6',
    },

    sectionTitle: {
      marginTop: 5,
      marginBottom: 18,
      fontSize: 19,
      fontWeight: '900',
      color: '#302a34',
    },

    readOnlyField: {
      marginBottom: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        '#eeeaf2',
    },

    inputLabel: {
      marginBottom: 7,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.1,
      color: '#918999',
    },

    readOnlyValue: {
      fontSize: 15,
      lineHeight: 21,
      color: '#312c35',
      fontWeight: '600',
    },

    readOnlyHint: {
      marginTop: 5,
      fontSize: 9,
      lineHeight: 14,
      color: '#a19aa5',
    },

    inputGroup: {
      marginTop: 5,
      marginBottom: 15,
    },

    input: {
      minHeight: 52,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        '#e4ddeb',
      backgroundColor:
        '#fbfafd',
      paddingHorizontal: 15,
      fontSize: 14,
      color: '#302a34',
    },

    phoneContainer: {
      minHeight: 54,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        '#e4ddeb',
      backgroundColor:
        '#fbfafd',
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },

    countryButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 10,
    },

    countryFlag: {
      fontSize: 20,
      marginRight: 6,
    },

    countryCode: {
      fontSize: 14,
      fontWeight: '800',
      color: '#3c3441',
    },

    countryArrow: {
      marginLeft: 5,
      fontSize: 11,
      color: '#8c8391',
    },

    phoneDivider: {
      width: 1,
      height: 28,
      backgroundColor:
        '#e4ddeb',
    },

    phoneInput: {
      flex: 1,
      minHeight: 52,
      paddingHorizontal: 12,
      fontSize: 14,
      color: '#302a34',
    },

    emergencySection: {
      borderColor:
        '#e2d5f3',
    },

    emergencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    emergencyIcon: {
      width: 43,
      height: 43,
      borderRadius: 22,
      backgroundColor:
        '#f5e9eb',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    emergencyIconText: {
      fontSize: 20,
      fontWeight: '900',
      color: '#a72b36',
    },

    emergencyHeaderText: {
      flex: 1,
    },

    emergencyEyebrow: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: '#a72b36',
    },

    emergencyTitle: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: '900',
      color: '#302a34',
    },

    emergencyDescription: {
      fontSize: 12,
      lineHeight: 19,
      color: '#77707c',
      marginBottom: 14,
    },

    requiredNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 13,
      backgroundColor:
        '#faf5fc',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },

    requiredDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        '#8b5cf6',
      marginRight: 8,
    },

    requiredText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 15,
      color: '#746b79',
    },

    securityInfo: {
      marginTop: 3,
      borderRadius: 16,
      backgroundColor:
        '#f8f5fc',
      padding: 14,
    },

    securityInfoTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: '#6d28d9',
    },

    securityInfoText: {
      marginTop: 5,
      fontSize: 10,
      lineHeight: 16,
      color: '#756d7a',
    },

    saveButton: {
      height: 58,
      borderRadius: 19,
      backgroundColor:
        '#6d28d9',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 18,
      shadowColor:
        '#6d28d9',
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.16,
      shadowRadius: 13,
      elevation: 4,
    },

    saveButtonText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
    },

    saveButtonArrow: {
      color: '#ffffff',
      fontSize: 28,
      lineHeight: 29,
    },

    logoutButton: {
      marginTop: 13,
      height: 52,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        '#e5dfe9',
      backgroundColor:
        '#ffffff',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    logoutButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#8c3c44',
    },

    buttonPressed: {
      opacity: 0.8,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    footerText: {
      marginTop: 22,
      paddingHorizontal: 15,
      textAlign: 'center',
      fontSize: 10,
      lineHeight: 16,
      color: '#9a939d',
    },

    modalOverlay: {
      flex: 1,
      justifyContent:
        'flex-end',
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor:
        'rgba(28, 21, 34, 0.42)',
    },

    countryModal: {
      maxHeight: '78%',
      minHeight: '58%',
      backgroundColor:
        '#ffffff',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom:
        Platform.OS === 'ios'
          ? 34
          : 20,
    },

    modalHandle: {
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        '#ded7e3',
      alignSelf: 'center',
      marginBottom: 18,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      marginBottom: 16,
    },

    modalHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    modalEyebrow: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: '#8b5cf6',
    },

    modalTitle: {
      marginTop: 4,
      fontSize: 23,
      fontWeight: '900',
      color: '#302a34',
    },

    modalDescription: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 17,
      color: '#817986',
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        '#f5f1f8',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    closeButtonText: {
      marginTop: -2,
      fontSize: 26,
      lineHeight: 28,
      color: '#655d69',
      fontWeight: '400',
    },

    countrySearch: {
      height: 50,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        '#e4ddeb',
      backgroundColor:
        '#faf9fc',
      paddingHorizontal: 15,
      fontSize: 14,
      color: '#302a34',
      marginBottom: 12,
    },

    countryList: {
      flexGrow: 0,
    },

    countryOption: {
      minHeight: 58,
      borderRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor:
        'transparent',
    },

    countryOptionSelected: {
      backgroundColor:
        '#f5effd',
      borderColor:
        '#e2d3f6',
    },

    countryOptionPressed: {
      backgroundColor:
        '#f8f5fa',
    },

    optionFlag: {
      width: 37,
      fontSize: 23,
    },

    optionInfo: {
      flex: 1,
    },

    optionName: {
      fontSize: 14,
      fontWeight: '700',
      color: '#3b343f',
    },

    optionNameSelected: {
      color: '#6d28d9',
      fontWeight: '900',
    },

    optionCode: {
      marginLeft: 10,
      fontSize: 13,
      fontWeight: '800',
      color: '#7d7482',
    },

    optionCodeSelected: {
      color: '#6d28d9',
    },

    selectedIndicator: {
      width: 25,
      height: 25,
      marginLeft: 10,
      borderRadius: 13,
      backgroundColor:
        '#6d28d9',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    selectedIndicatorText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '900',
    },

    noCountryResult: {
      paddingVertical: 35,
      alignItems: 'center',
    },

    noCountryTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: '#443c48',
    },

    noCountryText: {
      marginTop: 5,
      fontSize: 11,
      color: '#918995',
      textAlign: 'center',
    },
  });