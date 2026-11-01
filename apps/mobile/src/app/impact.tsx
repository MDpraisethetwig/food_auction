import { Ionicons } from '@expo/vector-icons';
import { formatMoney } from '@food-auction/shared';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemo, weeklyMeals } from '../demo';
import { colors, radius, space, tabBarClearance, type } from '../theme';
import { Card, Eyebrow, type IconName, Section, TabBar } from '../ui';

const most = Math.max(...weeklyMeals.map((day) => day.meals));

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Ionicons name={icon} size={20} color={colors.forest} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export default function Impact() {
  const { impact, role } = useDemo();
  const insets = useSafeAreaInsets();
  const restaurant = role === 'restaurant';

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
      >
        <Eyebrow>{restaurant ? 'Your kitchen' : 'Your impact'}</Eyebrow>
        <View style={styles.hero}>
          <Ionicons name="leaf" size={150} color={colors.forestDeep} style={styles.heroLeaf} />
          <Text style={styles.heroNumber}>{impact.meals}</Text>
          <Text style={styles.heroLabel}>meals rescued from the bin</Text>
        </View>

        <View style={styles.stats}>
          <Stat icon="trash-bin-outline" value={`${impact.kg.toFixed(1)} kg`} label="Food saved" />
          <Stat icon="cloud-outline" value={`${impact.co2.toFixed(0)} kg`} label="CO₂e avoided" />
        </View>
        <Card style={styles.money}>
          <View>
            <Text style={styles.statLabel}>{restaurant ? 'Recovered' : 'Saved at checkout'}</Text>
            <Text style={styles.moneyValue}>{formatMoney(impact.savedCents)}</Text>
          </View>
          <Ionicons name="wallet-outline" size={26} color={colors.forest} />
        </Card>

        <Section title="This week">
          <Card>
            <View style={styles.chart}>
              {weeklyMeals.map((day, index) => (
                <View key={`${day.label}${index}`} style={styles.bar}>
                  <Text style={styles.barValue}>{day.meals}</Text>
                  <View
                    style={[
                      styles.barFill,
                      { height: (day.meals / most) * 96, opacity: day.meals === most ? 1 : 0.55 },
                    ]}
                  />
                  <Text style={styles.barLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Section>
      </ScrollView>
      <TabBar active="impact" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: space.xl, paddingBottom: tabBarClearance },
  hero: {
    backgroundColor: colors.forest,
    borderRadius: radius.lg,
    padding: space.xl,
    marginTop: space.md,
    overflow: 'hidden',
  },
  heroLeaf: { position: 'absolute', right: -24, bottom: -28, opacity: 0.55 },
  heroNumber: { ...type.price, fontSize: 84, lineHeight: 92, color: colors.sun },
  heroLabel: { ...type.h2, color: colors.paper },
  stats: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  stat: { flex: 1 },
  statValue: { ...type.price, fontSize: 26, lineHeight: 32, color: colors.ink, marginTop: space.sm },
  statLabel: { ...type.small, color: colors.muted },
  money: {
    marginTop: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moneyValue: { ...type.price, fontSize: 26, lineHeight: 32, color: colors.forest },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bar: { alignItems: 'center', gap: space.xs, width: 32 },
  barValue: { ...type.small, color: colors.muted },
  barFill: { width: 24, borderRadius: 8, backgroundColor: colors.forest },
  barLabel: { ...type.timer, color: colors.muted },
});
