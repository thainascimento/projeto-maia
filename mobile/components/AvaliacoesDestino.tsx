import { fetchAutenticado } from '@/services/api';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Text,
  View,
} from 'react-native';

type AvaliacaoPublica = {
  id: number;
  notaGeral: number | null;
  seguranca: number | null;
  viajariaSozinhaNovamente: boolean | null;
  facilidadeLocomocao: number | null;
  experienciaNoturna: string | null;
  estruturaTuristica: number | null;
  recomendariaParaMulherSozinha: boolean | null;
  melhorRegiaoHospedagem: string | null;
  pontosPositivos: string | null;
  pontosAtencao: string | null;
  sentiuInsegura: boolean | null;
  relatoInseguranca: string | null;
  comentario: string | null;
  criadaEm: string | null;
};

type Props = {
  cidade: string;
  estado: string;
  pais: string;
};

function textoPreenchido(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function linhaDetalhe(rotulo: string, valor: string | null | undefined) {
  if (!textoPreenchido(valor)) return null;
  return (
    <Text style={styles.detalhe}>
      <Text style={styles.detalheRotulo}>{rotulo}: </Text>
      {valor}
    </Text>
  );
}

function formatarNota(valor: number | null): string {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? `${valor}/5`
    : 'Não informada';
}

export default function AvaliacoesDestino({ cidade, estado, pais }: Props) {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPublica[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(3);
  const [expandidas, setExpandidas] = useState<number[]>([]);

  function alternarDetalhes(id: number) {
    setExpandidas((anteriores) =>
      anteriores.includes(id)
        ? anteriores.filter((atual) => atual !== id)
        : [...anteriores, id]
    );
  }

  const cidadeNormalizada = cidade.trim();
  const estadoNormalizado = estado.trim();
  const paisNormalizado = pais.trim();

  useEffect(() => {
    let ativo = true;
    setAvaliacoes([]);
    setErro(false);
    setQuantidadeVisivel(3);
    setExpandidas([]);

    if (!cidadeNormalizada || !estadoNormalizado || !paisNormalizado) {
      setCarregando(false);
      return () => { ativo = false; };
    }

    async function carregar() {
      setCarregando(true);
      try {
        const parametros = [
          `cidade=${encodeURIComponent(cidadeNormalizada)}`,
          `estado=${encodeURIComponent(estadoNormalizado)}`,
          `pais=${encodeURIComponent(paisNormalizado)}`,
        ].join('&');
        const resposta = await fetchAutenticado(
          `/avaliacoes-viagens/destino?${parametros}`
        );
        if (!resposta.ok) {
          throw new Error(`Erro HTTP ${resposta.status}`);
        }
        const dados: unknown = await resposta.json();
        if (!Array.isArray(dados)) {
          throw new Error('Formato inválido de avaliações.');
        }
        if (ativo) setAvaliacoes(dados as AvaliacaoPublica[]);
      } catch (error) {
        console.error('Erro ao carregar avaliações do destino:', error);
        if (ativo) setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => { ativo = false; };
  }, [cidadeNormalizada, estadoNormalizado, paisNormalizado]);

  if (!cidadeNormalizada || !estadoNormalizado || !paisNormalizado) {
    return null;
  }

  const media = avaliacoes.length
    ? avaliacoes.reduce((soma, item) => soma + (item.notaGeral ?? 0), 0) /
      avaliacoes.filter((item) => typeof item.notaGeral === 'number').length
    : null;
  const mediaValida = media !== null && Number.isFinite(media) ? media : null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>EXPERIÊNCIAS DE OUTRAS VIAJANTES</Text>
      <Text style={styles.subtitulo}>
        Avaliações compartilhadas por mulheres que já visitaram este destino.
      </Text>
      {carregando ? (
        <View style={styles.carregando}>
          <ActivityIndicator color="#6d28d9" size="small" />
          <Text style={styles.mensagem}>Buscando avaliações...</Text>
        </View>
      ) : erro ? (
        <Text style={styles.mensagem}>Não foi possível carregar as avaliações agora.</Text>
      ) : avaliacoes.length === 0 ? (
        <Text style={styles.mensagem}>
          Ainda não há avaliações compartilhadas para este destino.
        </Text>
      ) : (
        <>
          <Text style={styles.resumo}>
            {avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}
            {mediaValida !== null ? ` · Nota média: ${mediaValida.toFixed(1).replace('.', ',')}/5` : ''}
          </Text>
          {avaliacoes.slice(0, quantidadeVisivel).map((item, index) => {
            const idAvaliacao = item.id ?? index;
            const expandida = expandidas.includes(idAvaliacao);
            const textoPrincipal =
              item.pontosPositivos?.trim() ||
              item.comentario?.trim() ||
              item.pontosAtencao?.trim() ||
              '';
            const temDetalhes = [
              item.pontosPositivos,
              item.pontosAtencao,
              item.melhorRegiaoHospedagem,
              item.relatoInseguranca,
              item.comentario,
            ].some(textoPreenchido);
            return (
              <View key={`${idAvaliacao}-${index}`} style={styles.avaliacao}>
                <Text style={styles.nota}>
                  Nota geral: {formatarNota(item.notaGeral)}  ·  Segurança: {formatarNota(item.seguranca)}
                </Text>
                {typeof item.recomendariaParaMulherSozinha === 'boolean' && (
                  <Text style={styles.detalhe}>
                    {item.recomendariaParaMulherSozinha
                      ? 'Recomenda para mulheres viajando sozinhas'
                      : 'Não recomenda para mulheres viajando sozinhas'}
                  </Text>
                )}
                {typeof item.sentiuInsegura === 'boolean' && (
                  <Text style={styles.detalhe}>
                    {item.sentiuInsegura
                      ? 'Relatou ter se sentido insegura'
                      : 'Não relatou ter se sentido insegura'}
                  </Text>
                )}
                {expandida ? (
                  <>
                    {linhaDetalhe('Pontos positivos', item.pontosPositivos)}
                    {linhaDetalhe('Pontos de atenção', item.pontosAtencao)}
                    {linhaDetalhe('Região para hospedagem', item.melhorRegiaoHospedagem)}
                    {linhaDetalhe('Relato de insegurança', item.relatoInseguranca)}
                    {linhaDetalhe('Comentário', item.comentario)}
                  </>
                ) : textoPrincipal ? (
                  <Text style={styles.detalhe} numberOfLines={3}>
                    {textoPrincipal}
                  </Text>
                ) : null}
                {temDetalhes && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => alternarDetalhes(idAvaliacao)}
                    style={styles.botaoExpandir}
                  >
                    <Text style={styles.textoBotao}>
                      {expandida ? 'Ver menos' : 'Ler avaliação completa'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {avaliacoes.length > quantidadeVisivel && (
            <Pressable
              accessibilityRole="button"
              style={styles.botaoMaisAvaliacoes}
              onPress={() => setQuantidadeVisivel((valor) => valor + 3)}
            >
              <Text style={styles.textoBotao}>
                Ver mais avaliações ({avaliacoes.length - quantidadeVisivel} restantes)
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 23,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5ec',
  },
  titulo: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#6d28d9',
    marginBottom: 6,
  },
  subtitulo: { fontSize: 12, color: '#666666', lineHeight: 18, marginBottom: 10 },
  carregando: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mensagem: { fontSize: 13, color: '#777777', lineHeight: 19 },
  resumo: { fontSize: 13, fontWeight: '800', color: '#333333', marginBottom: 8 },
  avaliacao: {
    borderTopWidth: 1,
    borderTopColor: '#eae6f3',
    paddingTop: 11,
    paddingBottom: 7,
    gap: 5,
  },
  nota: { fontSize: 13, fontWeight: '800', color: '#6d28d9' },
  detalhe: { fontSize: 12, color: '#444444', lineHeight: 18 },
  detalheRotulo: { fontWeight: '800' },
  botaoExpandir: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 },
  botaoMaisAvaliacoes: {
    paddingVertical: 13,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#f7f3ff',
    alignItems: 'center',
  },
  textoBotao: { fontSize: 13, fontWeight: '800', color: '#6d28d9' },
});
