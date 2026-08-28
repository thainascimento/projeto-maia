import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  buscarUsuario,
  removerUsuario,
} from '@/services/auth';

type Usuario = {
  id: number;
  nome: string;
  email: string;
};

export default function PerfilScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    carregarUsuario();
  }, []);

  async function carregarUsuario() {
    const usuarioSalvo = await buscarUsuario();

    if (!usuarioSalvo) {
      router.replace('/login');
      return;
    }

    setUsuario(usuarioSalvo);
  }

  async function sair() {
    await removerUsuario();

    router.replace('/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      {usuario ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.value}>
              {usuario.nome}
            </Text>

            <Text style={styles.label}>E-mail</Text>
            <Text style={styles.value}>
              {usuario.email}
            </Text>
          </View>

          <Pressable
            style={styles.button}
            onPress={sair}
          >
            <Text style={styles.buttonText}>
              Sair da conta
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.subtitle}>
          Carregando perfil...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: '#ffffff',
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#222222',
  },

  subtitle: {
    fontSize: 16,
    color: '#555555',
  },

  card: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    backgroundColor: '#ffffff',
  },

  label: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 4,
  },

  value: {
    fontSize: 18,
    color: '#222222',
    marginBottom: 18,
  },

  button: {
    backgroundColor: '#333333',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});