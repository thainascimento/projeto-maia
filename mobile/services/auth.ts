import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@maia:user';

export async function salvarUsuario(usuario: object) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export async function buscarUsuario() {
  const usuario = await AsyncStorage.getItem(USER_KEY);

  if (!usuario) {
    return null;
  }

  return JSON.parse(usuario);
}

export async function removerUsuario() {
  await AsyncStorage.removeItem(USER_KEY);
}