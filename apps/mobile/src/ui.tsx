import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Role, useDemo } from './demo';
import { colors, fonts, radius, shadow, softShadow, space, type } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'primary' | 'secondary' | 'sun' | 'paper';

const buttonText: Record<Variant, string> = {
  primary: colors.paper,
  secondary: colors.forest,
  sun: colors.ink,
  paper: colors.forestDeep,
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, busy, style }: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const color = buttonText[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {busy
        ? <ActivityIndicator color={color} />
        : (
          <>
            {icon && <Ionicons name={icon} size={18} color={color} />}
            <Text style={[styles.buttonText, { color }]}>{label}</Text>
          </>
        )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const tagTones = {
  forest: { backgroundColor: colors.sprout, color: colors.forest },
  clay: { backgroundColor: colors.clayTint, color: colors.clay },
  sun: { backgroundColor: colors.sunTint, color: colors.ink },
  dark: { backgroundColor: colors.forestDeep, color: colors.paper },
};

export function Tag({ label, tone = 'forest', icon }: {
  label: string;
  tone?: keyof typeof tagTones;
  icon?: IconName;
}) {
  const { backgroundColor, color } = tagTones[tone];
  return (
    <View style={[styles.tag, { backgroundColor }]}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

export function TimerBadge({ label, large }: { label: string; large?: boolean }) {
  return (
    <View style={[styles.timer, large && styles.timerLarge]}>
      <Ionicons name="time" size={large ? 18 : 14} color={colors.paper} />
      <Text style={[styles.timerText, large && styles.timerTextLarge]}>{label}</Text>
    </View>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export const Card = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const Eyebrow = ({ children }: { children: string }) => <Text style={styles.eyebrow}>{children}</Text>;

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && <Text style={styles.sectionAction}>{action}</Text>}
      </View>
      {children}
    </View>
  );
}

export function CircleButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.circle}>
      <Ionicons name={icon} size={20} color={colors.forestDeep} />
    </Pressable>
  );
}

const tabs: Record<Role, { key: string; label: string; icon: IconName; route: string }[]> = {
  customer: [
    { key: 'discover', label: 'Discover', icon: 'compass', route: '/' },
    { key: 'orders', label: 'Orders', icon: 'bag-handle', route: '/orders' },
    { key: 'impact', label: 'Impact', icon: 'leaf', route: '/impact' },
    { key: 'profile', label: 'Profile', icon: 'person', route: '/profile' },
  ],
  restaurant: [
    { key: 'kitchen', label: 'Kitchen', icon: 'restaurant', route: '/kitchen' },
    { key: 'impact', label: 'Impact', icon: 'leaf', route: '/impact' },
    { key: 'profile', label: 'Profile', icon: 'person', route: '/profile' },
  ],
};

export function TabBar({ active }: { active: string }) {
  const { role } = useDemo();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, shadow, { bottom: Math.max(insets.bottom - 6, space.md) }]}>
      {tabs[role ?? 'customer'].map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => { if (!selected) router.replace(tab.route as never); }}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Ionicons name={tab.icon} size={20} color={selected ? colors.forestDeep : colors.sprout} />
            {selected && <Text style={styles.tabLabel}>{tab.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToastHost() {
  const { toast, dismissToast } = useDemo();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(dismissToast, 5000);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;
  const good = toast.tone === 'good';
  return (
    <Pressable
      onPress={() => {
        dismissToast();
        if (toast.listingId) router.push(`/listing/${toast.listingId}`);
      }}
      style={[styles.toast, shadow, { top: insets.top + space.sm }]}
    >
      <View style={[styles.toastIcon, { backgroundColor: good ? colors.sprout : colors.clayTint }]}>
        <Ionicons name={good ? 'trophy' : 'flash'} size={18} color={good ? colors.forest : colors.clay} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        <Text style={styles.toastBody}>{toast.body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: {
    flexDirection: 'row',
    gap: space.sm,
    borderRadius: radius.pill,
    minHeight: 52,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.forest },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.forest },
  sun: { backgroundColor: colors.sun },
  paper: { backgroundColor: colors.paper },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  buttonText: { fontFamily: fonts.bold, fontSize: 16 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  chipTextSelected: { color: colors.paper },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: { ...type.timer, fontSize: 12, lineHeight: 16 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.clay,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  timerLarge: { paddingVertical: 6, paddingHorizontal: 12 },
  timerText: { ...type.timer, color: colors.paper },
  timerTextLarge: { fontSize: 16, lineHeight: 22 },
  field: { marginBottom: space.lg },
  fieldLabel: { ...type.label, color: colors.muted, marginBottom: 6 },
  input: {
    fontFamily: fonts.body,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  card: {
    ...softShadow,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  eyebrow: { ...type.label, color: colors.muted },
  section: { marginTop: space.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.md,
  },
  sectionTitle: { ...type.h2, color: colors.ink },
  sectionAction: { fontFamily: fonts.medium, fontSize: 14, color: colors.forest },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.forestDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
  },
  tab: {
    height: 48,
    minWidth: 48,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabSelected: { backgroundColor: colors.sprout, paddingHorizontal: space.lg },
  tabLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.forestDeep },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toastIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  toastTitle: { ...type.h3, color: colors.ink },
  toastBody: { ...type.small, color: colors.muted },
});
