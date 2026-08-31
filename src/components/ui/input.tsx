import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_FAMILY, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * テキスト入力。**アプリ内の入力欄はこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前は5箇所で別々に定義され、**そのうち3つは
 * `fontFamily` を指定していなかった**（`goals` / `ai` / `meetings`）。
 * `app-text.tsx` の `Text` はドット絵フォントを自動で当てるが、
 * `TextInput` は素の React Native なので**指定しないと OS 標準のゴシックで出る**。
 * 画面をまたぐとフォントが変わる実質的なバグだった。
 *
 * ここで必ず `FONT_FAMILY.pixel` を当てるので、二度と起きない。
 */
export function Input({
  label,
  hint,
  error,
  multiline,
  style,
  ...rest
}: TextInputProps & { label?: string; hint?: string; error?: string }) {
  return (
    <View style={styles.field}>
      {label !== undefined && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={COLORS.textMuted}
        style={[styles.input, multiline && styles.multiline, error !== undefined && styles.errored, style]}
      />
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
      {error !== undefined && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.body, marginBottom: SPACING.xs },
  input: {
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    // **必ず当てる。** 指定を落とすと OS 標準のゴシックになる（上のコメント参照）
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
  },
  multiline: { minHeight: SPACING.xxl * 3, textAlignVertical: 'top' },
  errored: { borderColor: COLORS.danger },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  error: { fontSize: FONT_SIZE.body, color: COLORS.danger, marginTop: SPACING.xs },
});
