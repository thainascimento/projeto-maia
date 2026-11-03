
import { router } from 'expo-router';
import { useEffect } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  buscarToken,
  buscarUsuario,
} from '@/services/auth';

export default function IndexScreen() {
  useEffect(() => {
    void verificarSessao();
  }, []);

  async function verificarSessao() {
    try {
      const [token, usuario] =
        await Promise.all([
          buscarToken(),
          buscarUsuario(),
        ]);

      if (!token || !usuario?.id) {
        router.replace('/login');
        return;
      }

      if (usuario.perfilCompleto) {
        router.replace('/(tabs)/inicio');
      } else {
        router.replace('/perfil');
      }
    } catch (error) {
      console.error(
        'Erro ao verificar sessão:',
        error
      );

      router.replace('/login');
    }
  }

  return (
    <View
      style={styles.container}
    >
      <ActivityIndicator
        size="large"
        color="#6d28d9"
      />
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
