
import { router } from 'expo-router';
import { useState } from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_URL } from '@/services/api';

import {
  salvarUsuario,
  salvarToken,
  notificarAutenticacao,
} from '@/services/auth';

type UsuarioLogin = {
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

type RespostaLogin = {
  token: string;
  usuario: UsuarioLogin;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert(
        'Atenção',
        'Preencha o e-mail e a senha.'
      );

      return;
    }

    try {
      setCarregando(true);

      const response = await fetch(
        `${API_URL}/usuarios/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            senha,
          }),
        }
      );

      console.log(
        'Status HTTP do login:',
        response.status
      );

      if (response.status === 401) {
        Alert.alert(
          'Login inválido',
          'E-mail ou senha incorretos.'
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const dados: RespostaLogin =
        await response.json();

      // Diagnóstico da resposta do backend.
      // Não exibe token, senha ou dados pessoais.
      console.log(
        'Campos retornados pelo login:',
        dados && typeof dados === 'object'
          ? Object.keys(dados)
          : 'Resposta não é um objeto'
      );

      console.log(
        'Token presente:',
        Boolean(dados?.token)
      );

      console.log(
        'Usuário presente:',
        Boolean(dados?.usuario)
      );

      console.log(
        'ID presente:',
        Boolean(dados?.usuario?.id)
      );

      if (
        !dados?.token ||
        !dados?.usuario?.id
      ) {
        throw new Error(
          'Resposta de autenticação inválida.'
        );
      }

      await salvarToken(dados.token);

      await salvarUsuario(dados.usuario);

      notificarAutenticacao();

      const usuario = dados.usuario;

      if (usuario.perfilCompleto) {
        router.replace('/(tabs)/inicio');
      } else {
        Alert.alert(
          'Complete seu perfil',
          'Antes de continuar, cadastre seu contato de emergência.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                router.replace('/perfil');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error(
        'Erro ao realizar login:',
        error
      );

      Alert.alert(
        'Erro ao entrar',
        error instanceof Error &&
        error.message ===
          'Resposta de autenticação inválida.'
          ? 'O servidor respondeu, mas não enviou os dados de autenticação esperados.'
          : 'Não foi possível concluir o login. Verifique a conexão e tente novamente.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Entrar
      </Text>

      <Text style={styles.subtitle}>
        Acesse sua conta para continuar.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#777"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#777"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <Pressable
        style={[
          styles.button,
          carregando && styles.buttonDisabled,
        ]}
        onPress={entrar}
        disabled={carregando}
      >
        <Text style={styles.buttonText}>
          {carregando
            ? 'Entrando...'
            : 'Entrar'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.push('/cadastro')
        }
      >
        <Text style={styles.link}>
          Ainda não possui uma conta? Cadastre-se
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222222',
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    color: '#555555',
  },

  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#222222',
    backgroundColor: '#ffffff',
  },

  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#333333',
    marginBottom: 20,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  link: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6d28d9',
    fontWeight: '600',
  },
});
