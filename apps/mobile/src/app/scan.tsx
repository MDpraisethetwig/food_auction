import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { post } from '../api';
import { Button, colors } from '../ui';

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [confirmed, setConfirmed] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const scanning = useRef(false);

  async function handleScan(token: string) {
    if (scanning.current) return;
    scanning.current = true;
    try {
      const { orders } = await post<{ orders: { title: string }[] }>('/pickup', { token });
      setConfirmed(orders.map((order) => order.title));
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  if (confirmed) {
    return (
      <View style={styles.success}>
        <Text style={styles.successHeading}>Pickup confirmed</Text>
        {confirmed.map((title) => <Text key={title} style={styles.successItem}>{title}</Text>)}
        <Text style={styles.successNote}>Show this screen to staff.</Text>
        <Button secondary label="Done" onPress={() => router.replace('/orders')} />
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Allow camera access to scan the code at the counter.</Text>
        <Button label="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{error}</Text>
        <Button
          label="Try again"
          onPress={() => {
            scanning.current = false;
            setError('');
          }}
        />
      </View>
    );
  }

  return (
    <CameraView
      style={styles.flex}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => handleScan(data)}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  text: { fontSize: 16, color: colors.ink, textAlign: 'center' },
  success: { flex: 1, backgroundColor: '#dff2e8', justifyContent: 'center', padding: 24, gap: 10 },
  successHeading: { fontSize: 30, fontWeight: '700', color: colors.accent, textAlign: 'center' },
  successItem: { fontSize: 18, color: colors.ink, textAlign: 'center' },
  successNote: { color: colors.muted, textAlign: 'center', marginBottom: 20 },
});
