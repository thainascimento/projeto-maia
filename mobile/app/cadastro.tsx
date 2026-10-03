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

type UsuarioCadastro = {
  id: number;
  nome: string;
  email: string;

  telefone?: string | null;

  contatoEmergenciaNome?: string | null;
  contatoEmergenciaTelefone?: string | null;
  contatoEmergenciaRelacao?: string | null;

  perfilCompleto?: boolean;
};

export default function CadastroScreen() {
  const [
    nome,
    setNome,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    senha,
    setSenha,
  ] = useState('');

  const [
    confirmarSenha,
    setConfirmarSenha,
  ] = useState('');

  const [
    carregando,
    setCarregando,
  ] = useState(false);

  function emailValido(
    valor: string
  ) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      valor
    );
  }

  function validarCadastro() {
    if (
      !nome.trim() ||
      !email.trim() ||
      !senha.trim() ||
      !confirmarSenha.trim()
    ) {
      Alert.alert(
        'Atenção',
        'Preencha todos os campos.'
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

    if (
      !emailValido(
        email.trim()
      )
    ) {
      Alert.alert(
        'E-mail inválido',
        'Informe um endereço de e-mail válido.'
      );

      return false;
    }

    if (
      senha.length < 6
    ) {
      Alert.alert(
        'Senha muito curta',
        'A senha deve ter pelo menos 6 caracteres.'
      );

      return false;
    }

    if (
      senha !==
      confirmarSenha
    ) {
      Alert.alert(
        'Senhas diferentes',
        'A senha e a confirmação de senha não coincidem.'
      );

      return false;
    }

    return true;
  }

  async function cadastrar() {
    if (
      !validarCadastro()
    ) {
      return;
    }

    try {
      setCarregando(true);

      const response =
        await fetch(
          `${API_URL}/usuarios`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              nome:
                nome.trim(),

              email:
                email
                  .trim()
                  .toLowerCase(),

              senha,
            }),
          }
        );

      if (
        response.status === 409
      ) {
        Alert.alert(
          'E-mail já cadastrado',
          'Já existe uma conta utilizando este e-mail.'
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
            'Confira os dados informados.'
        );

        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      const usuario:
        UsuarioCadastro =
        await response.json();

      await salvarUsuario(
        usuario
      );

      Alert.alert(
        'Conta criada!',
        'Agora vamos completar seu perfil de segurança.',
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
    } catch (error) {
      console.error(
        'Erro ao cadastrar usuária:',
        error
      );

      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor. Verifique se o backend está ligado.'
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
        Criar conta
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Cadastre-se para começar a usar o aplicativo.
      </Text>

      <TextInput
        style={
          styles.input
        }
        placeholder="Nome"
        placeholderTextColor="#777"
        value={
          nome
        }
        onChangeText={
          setNome
        }
        autoCapitalize="words"
        autoCorrect={false}
      />

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

      <TextInput
        style={
          styles.input
        }
        placeholder="Confirmar senha"
        placeholderTextColor="#777"
        secureTextEntry
        value={
          confirmarSenha
        }
        onChangeText={
          setConfirmarSenha
        }
      />

      <Text
        style={
          styles.passwordHint
        }
      >
        A senha deve ter pelo menos 6 caracteres.
      </Text>

      <Pressable
        style={[
          styles.button,

          carregando &&
            styles.buttonDisabled,
        ]}
        onPress={
          cadastrar
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
            ? 'Cadastrando...'
            : 'Cadastrar'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          router.replace(
            '/login'
          )
        }
      >
        <Text
          style={
            styles.link
          }
        >
          Já possui uma conta? Entrar
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

    passwordHint: {
      marginTop: -7,
      marginBottom: 18,
      fontSize: 12,
      color:
        '#777777',
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