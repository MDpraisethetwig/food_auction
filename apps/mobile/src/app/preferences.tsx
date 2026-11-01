import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askAlertPermission } from '../alerts';
import { INTERESTS, useDemo } from '../demo';
import { colors, fonts, radius, shadow, softShadow, space, type } from '../theme';
import { Button, CircleButton, Eyebrow } from '../ui';

function SettingRow({ title, detail, value, onChange, disabled }: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.setting, disabled && styles.settingOff]}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.forest, false: colors.line }}
        value={value}
      />
    </View>
  );
}

export default function Preferences() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { interests, toggleInterest, alerts, setAlerts } = useDemo();
  const insets = useSafeAreaInsets();
  const firstRun = onboarding === '1';

  async function finish() {
    await askAlertPermission();
    router.replace('/');
  }

  async function setEnabled(enabled: boolean) {
    setAlerts({ ...alerts, enabled });
    if (enabled) await askAlertPermission();
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + space.md, paddingBottom: firstRun ? 130 : insets.bottom + space.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!firstRun && (
          <View style={styles.back}>
            <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          </View>
        )}
        <Eyebrow>{firstRun ? 'Make it yours' : 'Food preferences'}</Eyebrow>
        <Text style={styles.title}>What are you craving?</Text>
        <Text style={styles.subtitle}>
          Pick what you love and we'll alert you the moment a kitchen nearby lists it.
        </Text>

        <View style={styles.grid}>
          {INTERESTS.map((interest) => {
            const selected = interests.includes(interest.name);
            return (
              <Pressable
                accessibilityLabel={interest.name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                key={interest.name}
                onPress={() => toggleInterest(interest.name)}
                style={styles.tile}
              >
                <Image source={interest.image} style={styles.tilePhoto} />
                <Text style={styles.tileLabel}>{interest.name}</Text>
                {selected && (
                  <>
                    <View style={styles.ring} />
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={16} color={colors.ink} />
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {!firstRun && (
          <View style={styles.settings}>
            <SettingRow
              detail="When a kitchen nearby lists something you picked."
              onChange={setEnabled}
              title="Push alerts"
              value={alerts.enabled}
            />
            <SettingRow
              detail="Also tell me about similar food, like a poke bowl if you love sushi."
              disabled={!alerts.enabled}
              onChange={(closeMatches) => setAlerts({ ...alerts, closeMatches })}
              title="Close matches"
              value={alerts.enabled && alerts.closeMatches}
            />
          </View>
        )}
      </ScrollView>

      {firstRun && (
        <View style={[styles.bar, shadow, { paddingBottom: insets.bottom + space.sm }]}>
          <Button
            disabled={interests.length === 0}
            label={interests.length === 0 ? 'Pick at least one' : `Continue with ${interests.length}`}
            onPress={finish}
          />
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: space.xl },
  back: { marginBottom: space.lg, alignSelf: 'flex-start' },
  title: { ...type.h1, fontSize: 30, lineHeight: 37, color: colors.ink, marginTop: space.xs },
  subtitle: { ...type.body, fontSize: 16, color: colors.muted, marginTop: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.xl },
  tile: {
    width: '47.9%',
    height: 128,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: colors.sun,
    borderRadius: radius.md,
  },
  tilePhoto: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  tileLabel: {
    position: 'absolute',
    left: space.sm,
    bottom: space.sm,
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  check: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settings: {
    ...softShadow,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: space.xl,
    paddingVertical: space.xs,
  },
  setting: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  settingOff: { opacity: 0.5 },
  settingText: { flex: 1 },
  settingTitle: { ...type.h3, color: colors.ink },
  settingDetail: { ...type.small, color: colors.muted },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  skip: { alignItems: 'center', paddingTop: space.md, paddingBottom: space.xs },
  skipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
});
