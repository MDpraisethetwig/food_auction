import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '@food-auction/shared';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askForFood, speechToText } from '../assistant';
import { timeLeft, useDemo, useNow } from '../demo';
import { ListingRow } from '../listing-row';
import { colors, fonts, radius, space, type } from '../theme';
import { Chip, CircleButton, Eyebrow, type IconName } from '../ui';

const suggestions = [
  'Something spicy under $10',
  'A light dinner with no dairy',
  'Enough food for two',
  "What's closing soonest?",
];

const MAX_RECORDING_MS = 30000;

interface Message extends ChatMessage {
  listingIds?: string[];
  allergyNote?: boolean;
}

function RoundButton({ icon, label, tone, onPress, disabled }: {
  icon: IconName;
  label: string;
  tone: 'forest' | 'clay';
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.round, tone === 'clay' && styles.roundClay, disabled && styles.roundDisabled]}
    >
      <Ionicons name={icon} size={20} color={colors.paper} />
    </Pressable>
  );
}

export default function Assistant() {
  const { listings, interests } = useDemo();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder, 200);
  const insets = useSafeAreaInsets();
  const now = useNow();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [notice, setNotice] = useState('');

  const live = listings.filter((listing) => !listing.settled);
  const busy = thinking || transcribing;

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const conversation: Message[] = [...messages, { role: 'user', text: question }];
    setMessages(conversation);
    setDraft('');
    setNotice('');
    setThinking(true);
    try {
      const chat = conversation.map(({ role, text: content }) => ({ role, text: content }));
      const answer = await askForFood(chat, live, interests);
      setMessages([...conversation, {
        role: 'assistant',
        text: answer.reply,
        listingIds: answer.listingIds,
        allergyNote: answer.avoidAllergens.length > 0,
      }]);
    } catch (error) {
      console.log('AI chat failed', error);
      setNotice("I couldn't check tonight's food just now. Please try again.");
    } finally {
      setThinking(false);
    }
  }

  async function startVoice() {
    setNotice('');
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setNotice('Microphone access is off. Allow it in Settings, or type instead.');
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      console.log('Recording failed', error);
      setNotice("The microphone isn't available here. Type instead.");
    }
  }

  async function stopVoice() {
    setTranscribing(true);
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('No recording');
      const text = await speechToText(recorder.uri);
      setTranscribing(false);
      if (text) await send(text);
      else setNotice("I didn't catch that. Try again, or type it.");
    } catch (error) {
      console.log('Voice failed', error);
      setNotice("I couldn't hear that properly. Try again, or type it.");
    } finally {
      setTranscribing(false);
    }
  }

  useEffect(() => {
    if (recording.isRecording && recording.durationMillis >= MAX_RECORDING_MS) void stopVoice();
  }, [recording.isRecording, recording.durationMillis]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Eyebrow>Ask for food</Eyebrow>
        <CircleButton icon="close" label="Close" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        ref={scroll}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <View>
            <Text style={styles.title}>Tell me what you're craving.</Text>
            <Text style={styles.subtitle}>Type it or say it. I'll only suggest food you can pick up tonight.</Text>
            <View style={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <Chip key={suggestion} label={suggestion} selected={false} onPress={() => send(suggestion)} />
              ))}
            </View>
          </View>
        )}

        {messages.map((message, index) => {
          const matches = (message.listingIds ?? []).flatMap((id) => live.filter((listing) => listing.id === id));
          return (
            <View key={index} style={styles.turn}>
              <View style={[styles.bubble, message.role === 'user' ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, message.role === 'user' && styles.mineText]}>{message.text}</Text>
              </View>
              {matches.map((listing) => <ListingRow key={listing.id} listing={listing} now={now} showAllergens />)}
              {message.allergyNote && (
                <Text style={styles.allergyNote}>
                  This only covers what restaurants listed. Check with them before ordering if you have an allergy.
                </Text>
              )}
            </View>
          );
        })}

        {thinking && (
          <View style={styles.status}>
            <ActivityIndicator color={colors.forest} />
            <Text style={styles.statusText}>Checking tonight's food</Text>
          </View>
        )}
        {notice !== '' && <Text style={styles.notice}>{notice}</Text>}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
        {recording.isRecording
          ? (
            <>
              <View style={styles.listening}>
                <View style={styles.dot} />
                <Text style={styles.listeningText}>Listening {timeLeft(recording.durationMillis, 0)}</Text>
              </View>
              <RoundButton icon="stop" label="Stop recording" tone="clay" onPress={stopVoice} />
            </>
          )
          : (
            <>
              <TextInput
                editable={!busy}
                onChangeText={setDraft}
                onSubmitEditing={() => send(draft)}
                placeholder={transcribing ? 'Listening back...' : 'Describe what you want'}
                placeholderTextColor={colors.muted}
                returnKeyType="send"
                style={styles.input}
                value={draft}
              />
              {draft.trim()
                ? <RoundButton disabled={busy} icon="arrow-up" label="Send" tone="forest" onPress={() => send(draft)} />
                : <RoundButton disabled={busy} icon="mic" label="Speak" tone="forest" onPress={startVoice} />}
            </>
          )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingBottom: space.sm,
  },
  page: { paddingHorizontal: space.xl, paddingBottom: space.lg, flexGrow: 1 },
  title: { ...type.h1, fontSize: 30, lineHeight: 37, color: colors.ink, marginTop: space.lg },
  subtitle: { ...type.body, fontSize: 16, color: colors.muted, marginTop: space.sm },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xl },
  turn: { gap: space.md, marginTop: space.lg },
  bubble: { maxWidth: '86%', borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.forest },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  bubbleText: { ...type.body, color: colors.ink },
  mineText: { color: colors.paper },
  allergyNote: { ...type.small, color: colors.clay },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  statusText: { ...type.small, color: colors.muted },
  notice: { ...type.small, color: colors.clay, marginTop: space.lg },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.field,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
  },
  listening: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.clay },
  listeningText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundClay: { backgroundColor: colors.clay },
  roundDisabled: { opacity: 0.45 },
});
