import { API_URL } from '@/services/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AvaliarExperienciaScreen() {
  const params = useLocalSearchParams<{
    id: string;
    nome?: string;
    categoria?: string;
    endereco?: string;
  }>();

  const [notaGeral, setNotaGeral] = useState(0);
  const [seguranca, setSeguranca] = useState(0);
  const [voltaria, setVoltaria] = useState<boolean | null>(null);
  const [iriaSozinha, setIriaSozinha] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviarAvaliacao() {
    if (!params.id) {
      Alert.alert('Erro', 'Visita não identificada.');
      return;
    }

    if (notaGeral === 0) {
      Alert.alert(
        'Avaliação incompleta',
        'Escolha uma nota geral para sua experiência.'
      );
      return;
    }

    if (seguranca === 0) {
      Alert.alert(
        'Avaliação incompleta',
        'Escolha uma nota de segurança.'
      );
      return;
    }

    try {
      setEnviando(true);

      const response = await fetch(
        `${API_URL}/avaliacoes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitaId: Number(params.id),
            notaGeral,
            seguranca,
            voltaria,
            iriaSozinha,
            comentario: comentario.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erro HTTP: ${response.status}`
        );
      }

      Alert.alert(
        'Obrigada por contar! 💜',
        'Sua avaliação foi registrada no MAIA.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Erro ao enviar avaliação:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível enviar sua avaliação.'
      );
    } finally {
      setEnviando(false);
    }
  }

  function renderEstrelas(
    valor: number,
    selecionar: (nota: number) => void
  ) {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((nota) => (
          <Pressable
            key={nota}
            onPress={() => selecionar(nota)}
          >
            <Text
              style={[
                styles.star,
                nota <= valor &&
                  styles.starSelected,
              ]}
            >
              ★
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>
          ‹ Voltar
        </Text>
      </Pressable>

      <Text style={styles.eyebrow}>
        EU CONTO!
      </Text>

      <Text style={styles.title}>
        Conte como foi
      </Text>

      <Text style={styles.subtitle}>
        Sua experiência ajuda outras viajantes a fazer escolhas melhores.
      </Text>

      <View style={styles.localCard}>
        <Text style={styles.localName}>
          {params.nome || 'Local'}
        </Text>

        <Text style={styles.category}>
          {params.categoria || ''}
        </Text>

        {!!params.endereco && (
          <Text style={styles.address}>
            {params.endereco}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Como foi sua experiência?
        </Text>

        <Text style={styles.sectionHelper}>
          Dê uma nota geral de 1 a 5.
        </Text>

        {renderEstrelas(
          notaGeral,
          setNotaGeral
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Você se sentiu segura?
        </Text>

        <Text style={styles.sectionHelper}>
          Considere o local e os arredores.
        </Text>

        {renderEstrelas(
          seguranca,
          setSeguranca
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Você voltaria?
        </Text>

        <View style={styles.choiceRow}>
          <Pressable
            style={[
              styles.choiceButton,
              voltaria === true &&
                styles.choiceSelected,
            ]}
            onPress={() => setVoltaria(true)}
          >
            <Text
              style={[
                styles.choiceText,
                voltaria === true &&
                  styles.choiceTextSelected,
              ]}
            >
              Sim
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.choiceButton,
              voltaria === false &&
                styles.choiceSelected,
            ]}
            onPress={() => setVoltaria(false)}
          >
            <Text
              style={[
                styles.choiceText,
                voltaria === false &&
                  styles.choiceTextSelected,
              ]}
            >
              Não
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Você iria sozinha novamente?
        </Text>

        <View style={styles.choiceRow}>
          <Pressable
            style={[
              styles.choiceButton,
              iriaSozinha === true &&
                styles.choiceSelected,
            ]}
            onPress={() =>
              setIriaSozinha(true)
            }
          >
            <Text
              style={[
                styles.choiceText,
                iriaSozinha === true &&
                  styles.choiceTextSelected,
              ]}
            >
              Sim
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.choiceButton,
              iriaSozinha === false &&
                styles.choiceSelected,
            ]}
            onPress={() =>
              setIriaSozinha(false)
            }
          >
            <Text
              style={[
                styles.choiceText,
                iriaSozinha === false &&
                  styles.choiceTextSelected,
              ]}
            >
              Não
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Quer contar mais?
        </Text>

        <TextInput
          style={styles.commentInput}
          placeholder="Conte como foi sua experiência..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={5}
          value={comentario}
          onChangeText={setComentario}
          textAlignVertical="top"
        />
      </View>

      <Pressable
        style={[
          styles.submitButton,
          enviando &&
            styles.buttonDisabled,
        ]}
        onPress={enviarAvaliacao}
        disabled={enviando}
      >
        <Text style={styles.submitButtonText}>
          {enviando
            ? 'ENVIANDO...'
            : 'ENVIAR AVALIAÇÃO'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
  },

  content: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  backButton: {
    marginBottom: 18,
  },

  backButtonText: {
    fontSize: 16,
    color: '#6d28d9',
    fontWeight: '700',
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#6d28d9',
    marginBottom: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1f1f1f',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
    marginBottom: 22,
  },

  localCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: '#e7e7ee',
    marginBottom: 24,
  },

  localName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#222222',
    marginBottom: 4,
  },

  category: {
    color: '#6d28d9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  address: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666666',
  },

  section: {
    marginBottom: 26,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222222',
    marginBottom: 5,
  },

  sectionHelper: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 10,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  star: {
    fontSize: 36,
    color: '#d9d9df',
  },

  starSelected: {
    color: '#6d28d9',
  },

  choiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dedee6',
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  choiceSelected: {
    borderColor: '#6d28d9',
    backgroundColor: '#f1ebff',
  },

  choiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555555',
  },

  choiceTextSelected: {
    color: '#6d28d9',
  },

  commentInput: {
    minHeight: 130,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedee6',
    borderRadius: 15,
    padding: 14,
    fontSize: 14,
    color: '#222222',
    marginTop: 10,
  },

  submitButton: {
    backgroundColor: '#6d28d9',
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
  },

  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  buttonDisabled: {
    opacity: 0.6,
  },
});