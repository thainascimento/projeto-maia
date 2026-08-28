import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import { buscarUsuario } from '@/services/auth';

export default function IndexScreen() {
  useEffect(() => {
    verificarSessao();
  }, []);

  async function verificarSessao() {
    try {
      const usuario = await buscarUsuario();

      if (usuario) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      router.replace('/login');
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});