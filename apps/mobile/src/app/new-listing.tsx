import { ALLERGENS, CATEGORIES, type ListingDraft } from '@food-auction/shared';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { post, uploadPhoto } from '../api';
import { Button, Card, Chip, colors, Field } from '../ui';

const toCents = (text: string) => Math.round(Number(text) * 100);

export default function NewListing() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [source, setSource] = useState<'cancelled' | 'surplus'>('surplus');
  const [startPrice, setStartPrice] = useState('5.00');
  const [increment, setIncrement] = useState('0.50');
  const [buyNow, setBuyNow] = useState('10.00');
  const [timeLimit, setTimeLimit] = useState('10');
  const [publishing, setPublishing] = useState(false);

  async function usePhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access so you can add a food photo.');
      return;
    }
    const options = { quality: 0.6, mediaTypes: ['images'] as ImagePicker.MediaType[] };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setPhotoUri(asset.uri);
    setAnalyzing(true);
    try {
      const upload = await uploadPhoto<{ photoUrl: string; draft: ListingDraft }>(asset.uri);
      setPhotoUrl(upload.photoUrl);
      setDraft(upload.draft);
      setTitle(upload.draft.title);
      setDescription(upload.draft.description);
      setCategory(upload.draft.category);
    } catch (failure) {
      Alert.alert('Photo upload failed', (failure as Error).message);
    } finally {
      setAnalyzing(false);
    }
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

  async function publish() {
    setPublishing(true);
    try {
      await post('/listings', {
        title,
        description,
        category,
        allergens,
        source,
        photoUrl,
        reserveCents: toCents(startPrice),
        incrementCents: toCents(increment),
        buyNowCents: buyNow ? toCents(buyNow) : null,
        timeLimitMinutes: Number(timeLimit),
      });
      router.back();
    } catch (failure) {
      Alert.alert('Could not publish', (failure as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}
      <View style={styles.photoButtons}>
        <View style={styles.flex}><Button label="Take photo" busy={analyzing} onPress={() => usePhoto(true)} /></View>
        <View style={styles.flex}><Button secondary label="Choose photo" disabled={analyzing} onPress={() => usePhoto(false)} /></View>
      </View>
      {analyzing && <Text style={styles.muted}>Writing your listing...</Text>}
      {draft && !draft.aiGenerated && <Text style={styles.muted}>AI draft unavailable. Fill this in by hand.</Text>}
      {draft?.aiGenerated && <Text style={styles.muted}>AI drafted this listing. Check it before publishing.</Text>}

      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Description" multiline value={description} onChangeText={setDescription} />

      <Text style={styles.heading}>Category</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((item) => (
          <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
        ))}
      </View>

      <Text style={styles.heading}>Where it came from</Text>
      <View style={styles.chips}>
        <Chip label="Unsold food" selected={source === 'surplus'} onPress={() => setSource('surplus')} />
        <Chip label="Cancelled order" selected={source === 'cancelled'} onPress={() => setSource('cancelled')} />
      </View>

      <Card>
        <Text style={styles.heading}>Allergens (required)</Text>
        <Text style={styles.warn}>Staff must confirm these. AI can't detect allergens from a photo.</Text>
        {!!draft?.ingredientsToCheck.length && (
          <Text style={styles.muted}>Check for: {draft.ingredientsToCheck.join(', ')}</Text>
        )}
        <View style={[styles.chips, styles.allergens]}>
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

      <Field label="Starting bid ($)" keyboardType="decimal-pad" value={startPrice} onChangeText={setStartPrice} />
      <Field label="Bid increment ($)" keyboardType="decimal-pad" value={increment} onChangeText={setIncrement} />
      <Field label="Buy Now price ($, optional)" keyboardType="decimal-pad" value={buyNow} onChangeText={setBuyNow} />
      <Field label="Food time limit (minutes)" keyboardType="number-pad" value={timeLimit} onChangeText={setTimeLimit} />

      <Button
        label="Publish auction"
        busy={publishing}
        disabled={!title.trim() || allergens.length === 0 || analyzing}
        onPress={publish}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 48 },
  flex: { flex: 1 },
  photo: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  photoButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  heading: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  warn: { color: colors.warn, fontSize: 13, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  allergens: { marginBottom: 0, marginTop: 4 },
});
