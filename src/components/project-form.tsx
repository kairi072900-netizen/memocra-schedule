import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { ErrorView } from '@/components/async-state';
import { PixelIcon } from '@/components/pixel/icon';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_FAMILY,
  FONT_SIZE,
  LAYOUT,
  LONG_TEXT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import type { ProjectInput } from '@/lib/api';
import { TASK_TEMPLATES } from '@/lib/task-template';
import type { ProjectKind } from '@/types';

/**
 * 企画（動画1本）の作成・編集フォーム。**表示専用**（保存は親がやる）。
 *
 * 要件定義書 F1「種別を選ぶと対応するテンプレートが自動選択される」に沿って、
 * 種別を選ぶとその場でテンプレート名と工程数が出る。
 *
 * 日時は `stream-form.tsx` と同じく書式ヒント付きのテキスト入力で受ける
 * （専用ピッカーは後の仕上げフェーズで両方まとめて差し替える）。
 */

const KINDS: ProjectKind[] = ['long', 'short', 'sns', 'other'];

/** 種別ごとの表示名。カレンダーの色トークンとは別（sns / other は色を持たないため）。 */
const KIND_LABEL: Record<ProjectKind, string> = {
  long: 'ロング動画',
  short: 'ショート動画',
  sns: 'SNS投稿',
  other: 'その他',
};

/** 種別に対応する予定種別アイコン。sns / other は暫定でショート扱いのアイコンを使う。 */
const KIND_ICON: Record<ProjectKind, 'longPublish' | 'shortPublish'> = {
  long: 'longPublish',
  short: 'shortPublish',
  sns: 'shortPublish',
  other: 'shortPublish',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(s: string): boolean {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export interface ProjectFormInitial {
  title: string;
  kind: ProjectKind;
  publish_at: string | null;
  shoot_at: string | null;
  memo: string | null;
}

export function ProjectForm({
  initial,
  submitLabel,
  /** 作成時のみ true。テンプレート適用のチェックを出す。 */
  offerTemplate = false,
  onSubmit,
  onCancel,
}: {
  initial?: ProjectFormInitial;
  submitLabel: string;
  offerTemplate?: boolean;
  onSubmit: (input: ProjectInput, applyTemplate: boolean) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<ProjectKind>(initial?.kind ?? 'long');
  const [publishDate, setPublishDate] = useState(initial?.publish_at?.slice(0, 10) ?? '');
  const [publishTime, setPublishTime] = useState(initial?.publish_at?.slice(11, 16) ?? '19:00');
  const [shootDate, setShootDate] = useState(initial?.shoot_at?.slice(0, 10) ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [applyTemplate, setApplyTemplate] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = TASK_TEMPLATES[kind];

  const validate = (): string | null => {
    if (title.trim().length === 0) return 'タイトルを入れてください';
    if (!DATE_RE.test(publishDate) || !isRealDate(publishDate)) {
      return '公開予定日は 2026-09-05 の形式で入れてください';
    }
    if (!TIME_RE.test(publishTime)) return '公開時刻は 19:00 の形式で入れてください';
    if (shootDate.length > 0 && (!DATE_RE.test(shootDate) || !isRealDate(shootDate))) {
      return '撮影予定日は 2026-09-01 の形式で入れてください（空でも構いません）';
    }
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
      await onSubmit(
        {
          title: title.trim(),
          kind,
          publish_at: `${publishDate}T${publishTime}:00+09:00`,
          // 撮影は時刻まで決まっていないことが多いので、既定を昼にしておく
          shoot_at: shootDate.length > 0 ? `${shootDate}T12:00:00+09:00` : null,
          memo: memo.trim().length > 0 ? memo.trim() : null,
        },
        applyTemplate,
      );
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
          placeholder="巨大建築バトル"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />
      </Field>

      <Field label="種別">
        <View style={styles.kindRow}>
          {KINDS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.kindButton, kind === k && styles.kindButtonActive]}
            >
              <PixelIcon
                name={KIND_ICON[k]}
                size={LAYOUT.iconSize}
                color={SCHEDULE_KIND[KIND_ICON[k]].color}
              />
              <Text style={styles.kindText}>{KIND_LABEL[k]}</Text>
            </Pressable>
          ))}
        </View>
        {/* 要件定義書 F1「種別を選ぶと対応するテンプレートが自動選択される」 */}
        <Text style={styles.templateHint}>
          テンプレート: {template.name}（{template.steps.length}工程）
        </Text>
      </Field>

      <View style={styles.row}>
        <Field label="公開予定日" style={styles.rowItem}>
          <TextInput
            value={publishDate}
            onChangeText={setPublishDate}
            placeholder="2026-09-05"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </Field>
        <Field label="公開時刻" style={styles.rowItem}>
          <TextInput
            value={publishTime}
            onChangeText={setPublishTime}
            placeholder="19:00"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
        </Field>
      </View>

      <Field label="撮影予定日（任意）">
        <TextInput
          value={shootDate}
          onChangeText={setShootDate}
          placeholder="2026-09-01"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </Field>

      <Field label="メモ（任意）">
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="ゲスト参加あり など"
          placeholderTextColor={COLORS.textMuted}
          multiline
          style={[styles.input, styles.memoInput]}
        />
      </Field>

      {offerTemplate && (
        <Pressable onPress={() => setApplyTemplate((v) => !v)} style={styles.checkRow}>
          <View style={[styles.checkbox, applyTemplate && styles.checkboxOn]}>
            {applyTemplate && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>
            工程{template.steps.length}件を自動で作る（担当と締切つき）
          </Text>
        </Pressable>
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
  row: { flexDirection: 'row', gap: SPACING.md },
  rowItem: { flex: 1 },
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

  kindRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  kindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  kindButtonActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  kindText: { fontSize: FONT_SIZE.body },
  templateHint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.sm },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg },
  checkbox: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.surfaceSunken },
  checkMark: { fontSize: FONT_SIZE.body },
  checkLabel: { fontSize: FONT_SIZE.body, flexShrink: 1 },

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
