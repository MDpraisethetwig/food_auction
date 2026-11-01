import { Ionicons } from '@expo/vector-icons';
import { ALLERGENS } from '@food-auction/shared';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES, food, useDemo } from '../demo';
import { draftFromPhoto } from '../draft';
import { colors, radius, space, type } from '../theme';
import { Button, Card, Chip, CircleButton, Eyebrow, Field, Tag } from '../ui';

const toCents = (text: string) => Math.round(Number(text) * 100);

const pickerOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5 };

// Anything missing here, like 'other', leaves the category for staff to pick.
const draftCategories: Record<string, string> = {
  pizza: 'Pizza',
  burger: 'Burgers',
  wrap: 'Wraps',
  sandwich: 'Wraps',
  bowl: 'Bowls',
  bakery: 'Bakery',
  sushi: 'Sushi',
  salad: 'Salads',
  'hot meal': 'Hot meals',
};

const biddingPresets = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
];
const MAX_BIDDING_MINUTES = 240;

const closingTime = (minutes: number) =>
  new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function NewListing() {
  const { publish } = useDemo();
  const [analyzing, setAnalyzing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [photoProblem, setPhotoProblem] = useState('');
  const [ingredientsToCheck, setIngredientsToCheck] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [source, setSource] = useState<'cancelled' | 'surplus'>('surplus');
  const [startPrice, setStartPrice] = useState('5.00');
  const [increment, setIncrement] = useState('0.50');
  const [buyNow, setBuyNow] = useState('10.00');
  const [bidding, setBidding] = useState<number | 'custom'>(15);
  const [customMinutes, setCustomMinutes] = useState('45');

  const biddingMinutes = bidding === 'custom' ? Number(customMinutes) : bidding;
  const validBidding = Number.isInteger(biddingMinutes)
    && biddingMinutes >= 1
    && biddingMinutes <= MAX_BIDDING_MINUTES;

  async function draftPhoto(result: ImagePicker.ImagePickerResult) {
    const asset = result.assets?.[0];
    if (!asset) return;
    setPhoto(asset.uri);
    setAiDrafted(false);
    setPhotoProblem('');
    setAnalyzing(true);
    try {
      const next = await draftFromPhoto(asset.uri);
      if (!next.aiGenerated) throw new Error('No AI draft');
      setTitle(next.title);
      setDescription(next.description);
      setCategory(draftCategories[next.category] ?? '');
      setIngredientsToCheck(next.ingredientsToCheck);
      setAiDrafted(true);
    } catch (error) {
      console.log('AI draft failed', error);
      setPhotoProblem("AI couldn't draft this one. Fill in the details yourself.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function takePhoto() {
    setPhotoProblem('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoProblem('Camera access is off. Allow it in Settings, or choose a photo.');
      return;
    }
    try {
      await draftPhoto(await ImagePicker.launchCameraAsync(pickerOptions));
    } catch {
      setPhotoProblem('No camera is available here. Choose a photo instead.');
    }
  }

  async function choosePhoto() {
    setPhotoProblem('');
    await draftPhoto(await ImagePicker.launchImageLibraryAsync(pickerOptions));
  }

  function retakePhoto() {
    setPhoto(null);
    setAiDrafted(false);
    setPhotoProblem('');
    setIngredientsToCheck([]);
  }

  function toggleAllergen(allergen: string) {
    setAllergens((current) => {
      if (allergen === 'none') return current.includes('none') ? [] : ['none'];
      const others = current.filter((item) => item !== 'none');
      return others.includes(allergen)
        ? others.filter((item) => item !== allergen)
        : [...others, allergen];
    });
  }

  function submit() {
    publish({
      title,
      description,
      category,
      allergens,
      source,
      image: photo ? { uri: photo } : food.bowl,
      startCents: toCents(startPrice),
      incrementCents: toCents(increment),
      buyNowCents: buyNow ? toCents(buyNow) : null,
      biddingMinutes,
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Eyebrow>New listing</Eyebrow>
            <Text style={styles.title}>What's left tonight?</Text>
          </View>
          <CircleButton icon="close" label="Close" onPress={() => router.back()} />
        </View>

        {photo
          ? (
            <View>
              <Image source={{ uri: photo }} style={styles.photo} />
              {!analyzing && (
                <View style={styles.retake}>
                  <CircleButton icon="camera-reverse" label="Retake photo" onPress={retakePhoto} />
                </View>
              )}
              {(analyzing || aiDrafted) && (
                <View style={styles.aiTag}>
                  <Tag
                    label={analyzing ? 'AI is reading your photo' : 'AI drafted. Check it before publishing.'}
                    tone="dark"
                    icon="sparkles"
                  />
                </View>
              )}
            </View>
          )
          : (
            <View style={styles.dropzone}>
              <Ionicons name="camera" size={36} color={colors.forest} />
              <Text style={styles.dropTitle}>Photograph the food</Text>
              <Text style={styles.dropHint}>AI writes the listing. You confirm the details.</Text>
              <Button label="Take photo" onPress={takePhoto} style={styles.dropButton} />
              <Button label="Choose a photo" onPress={choosePhoto} style={styles.dropChoose} variant="secondary" />
            </View>
          )}
        {photoProblem !== '' && <Text style={styles.photoProblem}>{photoProblem}</Text>}

        <View style={styles.fields}>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Description" multiline value={description} onChangeText={setDescription} />

          <Text style={styles.heading}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.slice(1).map((item) => (
              <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
            ))}
          </View>

          <Text style={styles.heading}>Where it came from</Text>
          <View style={styles.chips}>
            <Chip label="Unsold food" selected={source === 'surplus'} onPress={() => setSource('surplus')} />
            <Chip label="Cancelled order" selected={source === 'cancelled'} onPress={() => setSource('cancelled')} />
          </View>

          <Card style={styles.allergens}>
            <View style={styles.allergenHeader}>
              <Ionicons name="alert-circle" size={18} color={colors.clay} />
              <Text style={styles.allergenTitle}>Allergens (required)</Text>
            </View>
            <Text style={styles.allergenHint}>Staff must confirm these. AI can't detect allergens from a photo.</Text>
            {ingredientsToCheck.length > 0 && (
              <Text style={styles.allergenCheck}>Check for: {ingredientsToCheck.join(', ')}</Text>
            )}
            <View style={styles.chips}>
              {ALLERGENS.map((item) => (
                <Chip
                  key={item}
                  label={item === 'none' ? 'None of these' : item}
                  selected={allergens.includes(item)}
                  onPress={() => toggleAllergen(item)}
                />
              ))}
            </View>
          </Card>

          <View style={styles.prices}>
            <View style={styles.flex}>
              <Field label="Start ($)" keyboardType="decimal-pad" value={startPrice} onChangeText={setStartPrice} />
            </View>
            <View style={styles.flex}>
              <Field label="Step ($)" keyboardType="decimal-pad" value={increment} onChangeText={setIncrement} />
            </View>
            <View style={styles.flex}>
              <Field label="Buy now ($)" keyboardType="decimal-pad" value={buyNow} onChangeText={setBuyNow} />
            </View>
          </View>

          <Text style={styles.heading}>Bidding time</Text>
          <View style={styles.chips}>
            {biddingPresets.map((preset) => (
              <Chip
                key={preset.minutes}
                label={preset.label}
                selected={bidding === preset.minutes}
                onPress={() => setBidding(preset.minutes)}
              />
            ))}
            <Chip label="Custom" selected={bidding === 'custom'} onPress={() => setBidding('custom')} />
          </View>
          {bidding === 'custom' && (
            <Field
              keyboardType="number-pad"
              label="Minutes"
              onChangeText={setCustomMinutes}
              value={customMinutes}
            />
          )}
          <View style={styles.closing}>
            <Ionicons name="time" size={18} color={validBidding ? colors.forest : colors.clay} />
            <Text style={[styles.closingText, !validBidding && styles.closingError]}>
              {validBidding
                ? `Bidding closes at ${closingTime(biddingMinutes)}`
                : `Enter 1 to ${MAX_BIDDING_MINUTES} minutes`}
            </Text>
          </View>

          <Button
            disabled={!title.trim() || !category || allergens.length === 0 || analyzing || !validBidding}
            label="Publish auction"
            onPress={submit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: space.xl, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.lg },
  title: { ...type.h1, color: colors.ink, marginTop: space.xs },
  dropzone: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.moss,
    backgroundColor: colors.sprout,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  dropTitle: { ...type.h2, color: colors.forestDeep, marginTop: space.sm },
  dropHint: { ...type.small, color: colors.forest, marginTop: 2, textAlign: 'center' },
  dropButton: { marginTop: space.lg, alignSelf: 'stretch' },
  dropChoose: { marginTop: space.sm, alignSelf: 'stretch' },
  photo: { width: '100%', height: 200, borderRadius: radius.lg },
  retake: { position: 'absolute', top: space.md, right: space.md },
  aiTag: { position: 'absolute', left: space.md, bottom: space.md },
  photoProblem: { ...type.small, color: colors.clay, marginTop: space.sm },
  fields: { marginTop: space.xl },
  heading: { ...type.label, color: colors.muted, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  allergens: { marginBottom: space.lg, paddingBottom: 0 },
  allergenHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  allergenTitle: { ...type.h3, color: colors.ink },
  allergenHint: { ...type.small, color: colors.clay, marginTop: space.xs, marginBottom: space.md },
  allergenCheck: { ...type.small, color: colors.muted, marginTop: -space.sm, marginBottom: space.md },
  prices: { flexDirection: 'row', gap: space.sm },
  closing: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  closingText: { ...type.h3, fontSize: 15, color: colors.forest },
  closingError: { color: colors.clay },
});
