import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { ErrorView } from '@/components/async-state';
import { DateField, TimeField } from '@/components/pixel/date-picker';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_FAMILY,
  FONT_SIZE,
  LAYOUT,
  LONG_TEXT,
  SPACING,
  STREAM_PLATFORM,
} from '@/constants/theme';
import type { StreamInput } from '@/lib/api';
import { isValidDateKey, isValidTime, toIsoAt } from '@/lib/date-input';
import type { Member, StreamPlatform } from '@/types';

/**
 * 配信予定の作成／編集フォーム。**表示専用**（データ取得も保存も親がやる）。
 *
 * `onSubmit` には ISO 文字列に組み立て済みの `StreamInput` を渡す。
 * 保存中/失敗の表示はこのコンポーネントが持つ（`onSubmit` は失敗時に throw する前提）。
 *
 * 日時は専用ピッカーを作らず、書式ヒント付きのテキスト入力で受ける（P2 の割り切り。
 * ドット絵スタイルのピッカーは後の「仕上げ」フェーズで差し替える。CLAUDE.md §3.1）。
 */

const PLATFORMS: StreamPlatform[] = ['youtube', 'twitch', 'other'];

export interface StreamFormInitial {
  title: string;
  /** ISO 8601（JST）。編集時に渡す。 */
  starts_at: string;
  duration_min: number;
  platform: StreamPlatform;
  memo: string | null;
}

export function StreamForm({
  initial,
  members,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: StreamFormInitial;
  members: Member[];
  submitLabel: string;
  onSubmit: (input: StreamInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  // ISO の先頭スライスで分解する（schedule.ts の dateOf / timeOf と同じ流儀）
  const [date, setDate] = useState(initial ? initial.starts_at.slice(0, 10) : '');
  const [time, setTime] = useState(initial ? initial.starts_at.slice(11, 16) : '');
  const [duration, setDuration] = useState(String(initial?.duration_min ?? 60));
  const [platform, setPlatform] = useState<StreamPlatform>(initial?.platform ?? 'youtube');
  const [memo, setMemo] = useState(initial?.memo ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (title.trim().length === 0) return 'タイトルを入れてください';
    if (!isValidDateKey(date)) return '日付は 2026-08-15 の形式で入れてください';
    if (!isValidTime(time)) return '開始時刻は 20:00 の形式で入れてください';
    const dur = Number(duration);
    if (!Number.isInteger(dur) || dur <= 0) return '所要時間は分の数字で入れてください';
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        starts_at: toIsoAt(date, time),
        duration_min: Number(duration),
        platform,
        memo: memo.trim().length > 0 ? memo.trim() : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Field label="タイトル">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="マイクラ雑談配信"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />
      </Field>

      {/* 手打ちとピッカーの両方で入れられる（date-picker.tsx の冒頭コメント参照） */}
      <DateField label="日付" value={date} onChange={setDate} placeholder="2026-08-15" />
      <TimeField label="開始時刻" value={time} onChange={setTime} placeholder="20:00" />

      <Field label="所要時間（分）">
        <TextInput
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="60"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />
      </Field>

      <Field label="プラットフォーム">
        <View style={styles.platformRow}>
          {PLATFORMS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPlatform(p)}
              style={[styles.platformButton, platform === p && styles.platformButtonActive]}
            >
              <Text style={styles.platformText}>{STREAM_PLATFORM[p]}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="メモ（任意）">
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="21時からゲスト参加あり など"
          placeholderTextColor={COLORS.textMuted}
          multiline
          style={[styles.input, styles.memoInput]}
        />
      </Field>

      {members.length > 0 && (
        <View style={styles.activeHours}>
          <Text style={styles.activeHoursHeading}>メンバーの活動時間帯</Text>
          {members.map((m) => (
            <Text key={m.id} style={styles.activeHoursRow}>
              {m.name}：{m.active_hours ?? '未登録'}
            </Text>
          ))}
        </View>
      )}

      {error && <ErrorView message={error} onRetry={handleSubmit} />}

      <View style={styles.actions}>
        {onCancel && (
          <Pressable onPress={onCancel} disabled={submitting} style={styles.cancelButton}>
            <Text style={styles.buttonText}>やめる</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{submitting ? '保存中…' : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  container: { padding: SPACING.md },
  field: { marginBottom: SPACING.lg },
  label: { fontSize: FONT_SIZE.body, marginBottom: SPACING.xs },
  input: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
  },
  memoInput: { ...LONG_TEXT, minHeight: SPACING.xxl * 2, textAlignVertical: 'top' },
  platformRow: { flexDirection: 'row', gap: SPACING.sm },
  platformButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  platformButtonActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  platformText: { fontSize: FONT_SIZE.body },
  activeHours: {
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  activeHoursHeading: { fontSize: FONT_SIZE.body, marginBottom: SPACING.xs },
  activeHoursRow: { ...LONG_TEXT, color: COLORS.textMuted },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  submitButton: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  cancelButton: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: FONT_SIZE.body },
});
