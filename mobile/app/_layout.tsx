
import {
  buscarToken,
  buscarUsuario,
  observarAutenticacao,
} from '@/services/auth';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  View,
} from 'react-native';

import 'react-native-reanimated';

export default function RootLayout() {
  const [autenticado, setAutenticado] =
    useState(false);

  const [verificando, setVerificando] =
    useState(true);

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        const [token, usuario] =
          await Promise.all([
            buscarToken(),
            buscarUsuario(),
          ]);

        if (ativo) {
          setAutenticado(
            Boolean(token && usuario?.id)
          );
        }
      } catch (error) {
        console.error(
          'Erro ao verificar autenticação:',
          error
        );

        if (ativo) {
          setAutenticado(false);
        }
      } finally {
        if (ativo) {
          setVerificando(false);
        }
      }
    }

    void verificarSessao();

    const pararObservacao =
      observarAutenticacao(() => {
        void verificarSessao();
      });

    return () => {
      ativo = false;
      pararObservacao();
    };
  }, []);

  if (verificando) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <ActivityIndicator
          size="large"
          color="#6d28d9"
        />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />

        <Stack.Protected guard={!autenticado}>
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
        </Stack.Protected>

        <Stack.Protected guard={autenticado}>
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
