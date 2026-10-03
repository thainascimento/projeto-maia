import AsyncStorage from '@react-native-async-storage/async-storage';

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

const USER_KEY =
  '@maia:user';

export async function salvarUsuario(
  usuario: UsuarioSalvo
) {
  try {
    /*
     * Busca primeiro o usuário que já está salvo.
     *
     * Isso é importante porque alguns fluxos
     * recebem novamente os dados do backend,
     * e o backend não possui fotoUri.
     *
     * Sem essa preservação, um login/atualização
     * poderia apagar a foto local.
     */
    const usuarioAnterior =
      await buscarUsuario();

    const mesmoUsuario =
      usuarioAnterior?.id ===
      usuario.id;

    const usuarioCompleto:
      UsuarioSalvo = {
      ...(mesmoUsuario
        ? usuarioAnterior
        : {}),

      ...usuario,

      /*
       * Se o novo objeto não trouxe fotoUri,
       * mantemos a que já estava salva para
       * esta mesma usuária.
       *
       * Se fotoUri vier explicitamente null,
       * respeitamos o null.
       */
      fotoUri:
        usuario.fotoUri !==
        undefined
          ? usuario.fotoUri
          : mesmoUsuario
            ? usuarioAnterior?.fotoUri ??
              null
            : null,
    };

    await AsyncStorage.setItem(
      USER_KEY,
      JSON.stringify(
        usuarioCompleto
      )
    );
  } catch (error) {
    console.error(
      'Erro ao salvar usuário:',
      error
    );

    throw error;
  }
}

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

export async function removerUsuario() {
  try {
    await AsyncStorage.removeItem(
      USER_KEY
    );
  } catch (error) {
    console.error(
      'Erro ao remover usuário:',
      error
    );

    throw error;
  }
}