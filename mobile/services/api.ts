
import { buscarToken } from '@/services/auth';

// URL do backend MAIA via ngrok.
export const API_URL =
  'https://envoy-exerciser-swan.ngrok-free.dev';

/*
 * Realiza requisições autenticadas ao backend.
 *
 * O token JWT é recuperado automaticamente
 * e enviado no cabeçalho Authorization.
 */
export async function fetchAutenticado(
  caminho: string,
  opcoes: RequestInit = {}
): Promise<Response> {
  const token = await buscarToken();

  if (!token) {
    throw new Error(
      'Sessão não encontrada. Faça login novamente.'
    );
  }

  const headers = new Headers(opcoes.headers);

  headers.set(
    'Authorization',
    `Bearer ${token}`
  );

  const url = caminho.startsWith('http')
    ? caminho
    : `${API_URL}${caminho.startsWith('/') ? '' : '/'}${caminho}`;

  const response = await fetch(url, {
    ...opcoes,
    headers,
  });

  if (response.status === 401) {
    throw new Error(
      'Sessão expirada ou inválida. Faça login novamente.'
    );
  }

  return response;
}
