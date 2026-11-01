import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CO2_PER_KG, useDemo } from '../demo';
import { colors, radius, space, type } from '../theme';
import { Button, CircleButton } from '../ui';

export default function Scan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, confirmPickup } = useDemo();
  const [confirmed, setConfirmed] = useState(false);
  const insets = useSafeAreaInsets();
  const order = orders.find((item) => item.id === id);

  if (confirmed) {
    return (
      <View style={[styles.success, { paddingBottom: insets.bottom + space.xl }]}>
        <StatusBar style="dark" />
        <View style={styles.tick}>
          <Ionicons name="checkmark" size={44} color={colors.paper} />
        </View>
        <Text style={styles.successTitle}>Picked up. Enjoy!</Text>
        <Text style={styles.successItem}>{order?.title}</Text>
        {order && (
          <View style={styles.saved}>
            <Ionicons name="leaf" size={18} color={colors.forest} />
            <Text style={styles.savedText}>
              {order.kgSaved} kg of food rescued, {(order.kgSaved * CO2_PER_KG).toFixed(1)} kg CO₂e avoided
            </Text>
          </View>
        )}
        <Text style={styles.note}>Show this screen to staff.</Text>
        <Button label="Done" onPress={() => router.replace('/orders')} />
      </View>
    );
  }

  return (
    <View style={[styles.camera, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xl }]}>
      <StatusBar style="light" />
      <CircleButton icon="close" label="Close" onPress={() => router.back()} />
      <View style={styles.viewfinder}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        <Ionicons name="qr-code" size={120} color={colors.sprout} />
      </View>
      <View>
        <Text style={styles.scanTitle}>Scan the code at the counter</Text>
        <Text style={styles.scanHint}>{order?.restaurant ?? 'Your restaurant'} keeps it by the till.</Text>
        <Button
          label="Confirm pickup"
          onPress={() => {
            if (id) confirmPickup(id);
            setConfirmed(true);
          }}
          variant="sun"
        />
      </View>
    </View>
  );
}

const corner = 34;

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: colors.forestDeep, paddingHorizontal: space.xl, justifyContent: 'space-between' },
  viewfinder: {
    alignSelf: 'center',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: corner, height: corner, borderColor: colors.sun },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.md },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.md },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.md },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.md },
  scanTitle: { ...type.h1, color: colors.paper, textAlign: 'center' },
  scanHint: { ...type.body, color: colors.sprout, textAlign: 'center', marginTop: space.xs, marginBottom: space.xl },
  success: { flex: 1, backgroundColor: colors.sprout, justifyContent: 'center', padding: space.xl },
  tick: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  successTitle: { ...type.hero, color: colors.forestDeep, textAlign: 'center' },
  successItem: { ...type.body, fontSize: 18, color: colors.ink, textAlign: 'center', marginTop: space.sm },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.xl,
  },
  savedText: { ...type.small, color: colors.ink, flex: 1 },
  note: { ...type.small, color: colors.forest, textAlign: 'center', marginVertical: space.lg },
});
