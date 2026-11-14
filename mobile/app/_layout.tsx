
import {
  buscarToken,
  buscarUsuario,
  observarAutenticacao,
  removerUsuario,
} from '@/services/auth';

import { API_URL } from '@/services/api';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import 'react-native-reanimated';

export default function RootLayout() {
  const [autenticado, setAutenticado] =
    useState(false);

  const [verificando, setVerificando] =
    useState(true);

  const [erroConexao, setErroConexao] =
    useState(false);

  const verificarSessaoInicial = useCallback(async () => {
    setVerificando(true);
    setErroConexao(false);

    try {
      const [token, usuario] =
        await Promise.all([
          buscarToken(),
          buscarUsuario(),
        ]);

      if (!token || !usuario?.id) {
        setAutenticado(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/usuarios/${usuario.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );

      if (response.ok) {
        setAutenticado(true);
        return;
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        await removerUsuario();
        setAutenticado(false);
        return;
      }

      throw new Error(
        `Erro ao validar sessão: ${response.status}`
      );
    } catch (error) {
      console.warn(
        'Não foi possível validar a sessão. Verifique a conexão com o backend.',
        error
      );

      setAutenticado(false);
      setErroConexao(true);
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    void verificarSessaoInicial();

    const pararObservacao =
      observarAutenticacao(() => {
        // No login/logout, atualiza a navegação
        // usando os dados que acabaram de ser salvos.
        void (async () => {
          const [token, usuario] =
            await Promise.all([
              buscarToken(),
              buscarUsuario(),
            ]);

          setAutenticado(
            Boolean(token && usuario?.id)
          );
        })();
      });

    return () => {
      pararObservacao();
    };
  }, [verificarSessaoInicial]);

  if (verificando) {
    return (
      <View style={stylesCentro}>
        <ActivityIndicator
          size="large"
          color="#6d28d9"
        />
      </View>
    );
  }

  if (erroConexao) {
    return (
      <View style={stylesCentro}>
        <Text style={{
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 16,
          color: '#333',
        }}>
          Não foi possível verificar sua sessão.
          Verifique a conexão com o servidor.
        </Text>

        <Pressable
          onPress={() => {
            void verificarSessaoInicial();
          }}
          style={{
            backgroundColor: '#6d28d9',
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{
            color: '#fff',
            fontWeight: '700',
          }}>
            Tentar novamente
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!autenticado}>
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
        </Stack.Protected>

        <Stack.Protected guard={autenticado}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="confirmar-viagem" />
          <Stack.Screen name="viagens" />
        </Stack.Protected>
      </Stack>

      <StatusBar style="dark" />
    </>
  );
}

const stylesCentro = {
  flex: 1 as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  paddingHorizontal: 24,
  backgroundColor: '#ffffff',
};
