import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  paper: '#FFFFFF',
  surface: '#FFFFFF',
  field: '#F4F5F2',
  ink: '#1B2A22',
  muted: '#5E6B60',
  line: '#E6E7E3',
  forest: '#1E4D3B',
  forestDeep: '#143629',
  sprout: '#DCE8D3',
  moss: '#5C7F52',
  clay: '#B4472A',
  clayTint: '#FBEBE3',
  sun: '#E8B04A',
  sunTint: '#F9ECCF',
};

export const fonts = {
  display: 'Poppins_600SemiBold',
  displayBold: 'Poppins_700Bold',
  body: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  bold: 'Poppins_600SemiBold',
};

export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 41, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.display, fontSize: 27, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 27, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: 'uppercase' },
  price: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26 },
  timer: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const shadow: ViewStyle = {
  shadowColor: colors.forestDeep,
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

// Separates white cards from the white page.
export const softShadow: ViewStyle = {
  shadowColor: colors.forestDeep,
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

// Leaves room under scrolling content for the floating tab bar.
export const tabBarClearance = 120;
