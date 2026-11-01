import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { food, type Role, useDemo } from '../demo';
import { colors, space, type } from '../theme';
import { Button } from '../ui';

export default function Welcome() {
  const { setRole, interests } = useDemo();
  const insets = useSafeAreaInsets();

  function enter(role: Role) {
    setRole(role);
    if (role === 'restaurant') router.replace('/kitchen');
    else router.replace(interests.length ? '/' : '/preferences?onboarding=1');
  }

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <Image source={food.hero} style={styles.photo} />
      <View style={[styles.content, { paddingBottom: insets.bottom + space.lg }]}>
        <Image
          source={require('../../assets/logo-reversed.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Full for Less"
        />
        <Text style={styles.title}>Get full for less.</Text>
        <Text style={styles.subtitle}>
          Bid on tonight's unsold meals from kitchens nearby, and keep them out of the bin.
        </Text>
        <Button label="Find food near me" variant="sun" icon="compass" onPress={() => enter('customer')} />
        <View style={styles.gap} />
        <Button label="I run a kitchen" variant="paper" icon="restaurant" onPress={() => enter('restaurant')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.forestDeep },
  photo: { flex: 1, width: '100%' },
  content: {
    marginTop: -28,
    backgroundColor: colors.forestDeep,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  logo: { width: 176, height: 35, marginBottom: space.lg },
  title: { ...type.hero, color: colors.paper, marginBottom: space.md },
  subtitle: { ...type.body, color: colors.sprout, marginBottom: space.xl },
  gap: { height: space.md },
});
