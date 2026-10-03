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
import { salvarUsuario } from '@/services/auth';

type UsuarioLogin = {
  id: number;
  nome: string;
  email: string;

  telefone?: string | null;

  contatoEmergenciaNome?: string | null;
  contatoEmergenciaTelefone?: string | null;
  contatoEmergenciaRelacao?: string | null;

  perfilCompleto?: boolean;
};

export default function LoginScreen() {
  const [
    email,
    setEmail,
  ] = useState('');

  const [
    senha,
    setSenha,
  ] = useState('');

  const [
    carregando,
    setCarregando,
  ] = useState(false);

  async function entrar() {
    if (
      !email.trim() ||
      !senha.trim()
    ) {
      Alert.alert(
        'Atenção',
        'Preencha o e-mail e a senha.'
      );

      return;
    }

    try {
      setCarregando(true);

      const response =
        await fetch(
          `${API_URL}/usuarios/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              email:
                email
                  .trim()
                  .toLowerCase(),

              senha,
            }),
          }
        );

      if (
        response.status === 401
      ) {
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

      const usuario:
        UsuarioLogin =
        await response.json();

      await salvarUsuario(
        usuario
      );

      if (
        usuario.perfilCompleto
      ) {
        router.replace(
          '/(tabs)/inicio'
        );
      } else {
        Alert.alert(
          'Complete seu perfil',
          'Antes de continuar, cadastre seu contato de emergência.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                router.replace(
                  '/(tabs)/perfil'
                );
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
        'Erro de conexão',
        'Não foi possível conectar ao servidor.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.title
        }
      >
        Entrar
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Acesse sua conta para continuar.
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholder="E-mail"
        placeholderTextColor="#777"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={
          email
        }
        onChangeText={
          setEmail
        }
      />

      <TextInput
        style={
          styles.input
        }
        placeholder="Senha"
        placeholderTextColor="#777"
        secureTextEntry
        value={
          senha
        }
        onChangeText={
          setSenha
        }
      />

      <Pressable
        style={[
          styles.button,

          carregando &&
            styles.buttonDisabled,
        ]}
        onPress={
          entrar
        }
        disabled={
          carregando
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          {carregando
            ? 'Entrando...'
            : 'Entrar'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.push(
            '/cadastro'
          )
        }
      >
        <Text
          style={
            styles.link
          }
        >
          Ainda não possui uma conta? Cadastre-se
        </Text>
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent:
        'center',
      padding: 24,
      backgroundColor:
        '#ffffff',
    },

    title: {
      fontSize: 32,
      fontWeight:
        'bold',
      marginBottom: 8,
      color:
        '#222222',
    },

    subtitle: {
      fontSize: 16,
      marginBottom: 32,
      color:
        '#555555',
    },

    input: {
      borderWidth: 1,
      borderColor:
        '#cccccc',
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      fontSize: 16,
      color:
        '#222222',
      backgroundColor:
        '#ffffff',
    },

    button: {
      padding: 16,
      borderRadius: 10,
      alignItems:
        'center',
      backgroundColor:
        '#333333',
      marginBottom: 20,
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    buttonText: {
      color:
        '#ffffff',
      fontSize: 16,
      fontWeight:
        'bold',
    },

    link: {
      textAlign:
        'center',
      fontSize: 15,
      color:
        '#6d28d9',
      fontWeight:
        '600',
    },
  });