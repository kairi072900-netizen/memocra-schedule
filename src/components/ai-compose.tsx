import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, LONG_TEXT, SPACING } from '@/constants/theme';
import { parseScheduleText, type ParsedSchedule } from '@/lib/ai';

/**
 * 文章から登録フォームを埋める入力欄（新規登録画面の一番上）。
 *
 * **読み取った結果でフォームを埋めるだけ。登録は人がボタンを押す。**
 * 担当と締切を人が確定させることがこのアプリの目的なので（CLAUDE.md §1）、
 * AI の読み取りをそのまま保存しない。読み取り間違いをその場で直せる形にしてある。
 *
 * AI が使えない（Edge Function が未デプロイ／上限に当たった）ときは、
 * **エラーを1行出すだけ**で通常のフォームはそのまま使える。
 */
export function AiCompose({ todayKey, onParsed }: {
  /** 'YYYY-MM-DD'。「来週の土曜」を解決する基準日。 */
  todayKey: string;
  onParsed: (parsed: ParsedSchedule) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (text.trim().length === 0) return;
    setError(null);
    setBusy(true);
    try {
      onParsed(await parseScheduleText(text.trim(), todayKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み取れませんでした');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>文章から作る</Text>
      <Text style={styles.hint}>
        「来週の土曜20時から雑談配信」のように書くと、下のフォームを埋めます。
        登録はこのあと自分でボタンを押します。
      </Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="来週の土曜20時から雑談配信"
          placeholderTextColor={COLORS.textMuted}
          multiline
        />
        <Pressable
          style={[styles.button, busy && styles.disabled]}
          onPress={() => void run()}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? '読み取り中…' : '読み取る'}</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
  },
  label: { fontSize: FONT_SIZE.body },
  hint: { ...LONG_TEXT, color: COLORS.textMuted, marginTop: SPACING.xs },
  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  input: {
    flex: 1,
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.body,
  },
  button: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingHorizontal: SPACING.md,
  },
  buttonText: { fontSize: FONT_SIZE.body },
  disabled: { opacity: 0.5 },
  error: { ...LONG_TEXT, color: COLORS.danger, marginTop: SPACING.xs },
});
