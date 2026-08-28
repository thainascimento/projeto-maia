import { View, Text, StyleSheet } from 'react-native';

export default function MaiaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>maIA</Text>

      <Text style={styles.subtitle}>
        Sua assistente virtual de viagem.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});