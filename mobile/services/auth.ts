
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type UsuarioSalvo = {
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

const USER_KEY = '@maia:user';
const TOKEN_KEY = 'maia_auth_token';

type OuvinteAutenticacao = () => void;

const ouvintesAutenticacao =
  new Set<OuvinteAutenticacao>();

export function observarAutenticacao(
  ouvinte: OuvinteAutenticacao
): () => void {
  ouvintesAutenticacao.add(ouvinte);

  return () => {
    ouvintesAutenticacao.delete(ouvinte);
  };
}

export function notificarAutenticacao(): void {
  ouvintesAutenticacao.forEach((ouvinte) => {
    ouvinte();
  });
}

/*
 * Salva o token JWT em armazenamento seguro.
 */
export async function salvarToken(
  token: string
): Promise<void> {
  if (!token?.trim()) {
    throw new Error('Token inválido.');
  }

  await SecureStore.setItemAsync(
    TOKEN_KEY,
    token
  );
}

/*
 * Recupera o token JWT salvo.
 */
export async function buscarToken():
  Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(
      TOKEN_KEY
    );
  } catch (error) {
    console.error(
      'Erro ao buscar token:',
      error
    );

    return null;
  }
}

/*
 * Remove o token JWT.
 */
export async function removerToken():
  Promise<void> {
  await SecureStore.deleteItemAsync(
    TOKEN_KEY
  );
}

/*
 * Retorna o cabeçalho de autenticação
 * para requisições protegidas.
 */
export async function obterHeadersAutenticacao():
  Promise<Record<string, string>> {
  const token = await buscarToken();

  if (!token) {
    throw new Error(
      'Sessão não encontrada. Faça login novamente.'
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

/*
 * Salva os dados da usuária.
 *
 * Preserva informações existentes apenas
 * quando pertencem à mesma conta.
 */
export async function salvarUsuario(
  usuario: UsuarioSalvo
): Promise<void> {
  try {
    const usuarioAnterior =
      await buscarUsuario();

    const mesmoUsuario =
      usuarioAnterior?.id === usuario.id;

    const usuarioCompleto: UsuarioSalvo = {
      ...(mesmoUsuario
        ? usuarioAnterior
        : {}),

      ...usuario,

      fotoUri:
        usuario.fotoUri !== undefined
          ? usuario.fotoUri
          : mesmoUsuario
            ? usuarioAnterior?.fotoUri ?? null
            : null,
    };

    await AsyncStorage.setItem(
      USER_KEY,
      JSON.stringify(usuarioCompleto)
    );
  } catch (error) {
    console.error(
      'Erro ao salvar usuário:',
      error
    );

    throw error;
  }
}

/*
 * Recupera os dados da usuária.
 */
export async function buscarUsuario():
  Promise<UsuarioSalvo | null> {
  try {
    const usuario =
      await AsyncStorage.getItem(
        USER_KEY
      );

    if (!usuario) {
      return null;
    }

    return JSON.parse(
      usuario
    ) as UsuarioSalvo;
  } catch (error) {
    console.error(
      'Erro ao buscar usuário:',
      error
    );

    return null;
  }
}

/*
 * Remove os dados da usuária e o token.
 *
 * Utilizado no logout para evitar que
 * uma conta continue autenticada após sair.
 */
export async function removerUsuario():
  Promise<void> {
  try {
    await removerToken();

    await AsyncStorage.removeItem(
      USER_KEY
    );

    notificarAutenticacao();
  } catch (error) {
    console.error(
      'Erro ao remover usuário:',
      error
    );

    throw error;
  }
}
