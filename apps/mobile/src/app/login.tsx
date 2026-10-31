import type { Role, User } from '@food-auction/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { post } from '../api';
import { useSession } from '../session';
import { Button, Chip, colors, Field } from '../ui';

export default function Login() {
  const { signIn } = useSession();
  const [registering, setRegistering] = useState(false);
  const [role, setRole] = useState<Role>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const { token, user } = await post<{ token: string; user: User }>(
        registering ? '/auth/register' : '/auth/login',
        registering
          ? { email, password, name, role, restaurantName: role === 'restaurant' ? restaurantName : undefined }
          : { email, password },
      );
      await signIn(token, user);
      router.replace('/');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{registering ? 'Create an account' : 'Welcome back'}</Text>
        {registering && (
          <>
            <View style={styles.chips}>
              <Chip label="I'm hungry" selected={role === 'customer'} onPress={() => setRole('customer')} />
              <Chip label="I run a restaurant" selected={role === 'restaurant'} onPress={() => setRole('restaurant')} />
            </View>
            <Field label="Your name" value={name} onChangeText={setName} />
            {role === 'restaurant' && (
              <Field label="Restaurant name" value={restaurantName} onChangeText={setRestaurantName} />
            )}
          </>
        )}
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label={registering ? 'Create account' : 'Sign in'} busy={busy} onPress={submit} />
        <View style={styles.gap} />
        <Button
          secondary
          label={registering ? 'I already have an account' : 'Create an account'}
          onPress={() => setRegistering(!registering)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  error: { color: colors.warn, marginBottom: 10 },
  gap: { height: 10 },
});
