import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RESTAURANT, useDemo } from '../demo';
import { colors, fonts, radius, softShadow, space, tabBarClearance, type } from '../theme';
import { Eyebrow, type IconName, TabBar } from '../ui';

function Row({ icon, label, detail, onPress }: {
  icon: IconName;
  label: string;
  detail?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.forest} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {detail && <Text style={styles.rowDetail}>{detail}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function Profile() {
  const { role, setRole, interests } = useDemo();
  const insets = useSafeAreaInsets();
  const restaurant = role === 'restaurant';

  function switchView() {
    setRole(restaurant ? 'customer' : 'restaurant');
    router.replace(restaurant ? '/' : '/kitchen');
  }

  function leave() {
    setRole(null);
    router.replace('/login');
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow>Profile</Eyebrow>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{restaurant ? 'W' : 'A'}</Text>
          </View>
          <View>
            <Text style={styles.name}>{restaurant ? RESTAURANT : 'Alex Rivera'}</Text>
            <Text style={styles.since}>{restaurant ? 'Partner kitchen' : 'Rescuing food since March'}</Text>
          </View>
        </View>

        <View style={styles.group}>
          {restaurant
            ? (
              <>
                <Row icon="storefront-outline" label="Kitchen details" detail="King St W" />
                <Row icon="cash-outline" label="Payouts" detail="Weekly" />
              </>
            )
            : (
              <>
                <Row
                  icon="heart-outline"
                  label="Food preferences"
                  detail={interests.length ? `${interests.length} picked` : 'None yet'}
                  onPress={() => router.push('/preferences')}
                />
                <Row icon="card-outline" label="Payment card" detail="•••• 4242" />
                <Row icon="alert-circle-outline" label="Allergy filters" detail="None" />
                <Row icon="location-outline" label="Pickup area" detail="3 km" />
              </>
            )}
        </View>

        <View style={styles.group}>
          <Row
            icon="swap-horizontal"
            label={restaurant ? 'Switch to customer view' : 'Switch to kitchen view'}
            onPress={switchView}
          />
          <Row icon="log-out-outline" label="Back to welcome" onPress={leave} />
        </View>
      </ScrollView>
      <TabBar active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: space.xl, paddingBottom: tabBarClearance },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.lg },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.sun },
  name: { ...type.h2, color: colors.ink },
  since: { ...type.small, color: colors.muted },
  group: {
    ...softShadow,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: space.xl,
    paddingVertical: space.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sprout,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink, flex: 1 },
  rowDetail: { ...type.small, color: colors.muted },
});
