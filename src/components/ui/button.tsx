import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelIcon, type PixelIconName } from '@/components/pixel/icon';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * 立体ボタン。**アプリ内のボタンはすべてこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前はボタンのスタイルが**12個**別名で定義されていた
 * （`saveButton` / `signOutButton` / `addButton` / `formButton` / `statusButton` /
 *  `button` ×2 / `primaryButton` / `editButton` / `deleteButton` / `adjustButton` …）。
 * 中身は3パターンしかなく、`buttonText` は13ファイル・`disabled` は8ファイルで同一。
 *
 * 【立体の作り方】影をぼかさない（§3.1）。**下辺に濃色の帯を出して厚みにし、
 * 押されたら同じぶん下にずらして帯を消す**。これで物理的に沈んで見える。
 *
 * 【variant の使い分け】
 *   primary   … その画面で一番やってほしい操作（青）。**1画面に1〜2個まで**
 *   secondary … 既定。木のボタン
 *   danger    … 削除など取り返しがつかない操作。刷新前は削除も編集と同じ見た目だった
 *   ghost     … 枠だけ。並べても主張しない操作（絞り込みは Chip を使うこと）
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled = false,
  /** 親の幅いっぱいに広げる。並べるときは親側で `flex: 1` を当てる。 */
  block = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: PixelIconName;
  disabled?: boolean;
  block?: boolean;
  style?: ViewStyle;
}) {
  const face = FACE[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        block && styles.block,
        // 押されたら厚みのぶん下げる。上の余白を足して全体の高さは変えない
        { paddingTop: pressed && !disabled ? LAYOUT.buttonDepth : 0 },
        disabled && styles.disabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            { backgroundColor: face.bg, borderColor: face.border },
            // 厚みは下辺の太い border で作る。押されている間は消す
            pressed && !disabled
              ? { borderBottomWidth: BORDER_WIDTH.normal }
              : { borderBottomWidth: BORDER_WIDTH.normal + LAYOUT.buttonDepth, borderBottomColor: face.edge },
          ]}
        >
          {icon && <PixelIcon name={icon} size={LAYOUT.iconSize} color={face.text} />}
          <Text style={[styles.label, { color: face.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** 見た目の4種類。**ここ以外でボタンの色を決めないこと。** */
const FACE: Record<ButtonVariant, { bg: string; border: string; edge: string; text: string }> = {
  primary: {
    bg: COLORS.primary,
    border: COLORS.frameDark,
    edge: COLORS.primaryEdge,
    text: COLORS.textOnDark,
  },
  secondary: {
    bg: COLORS.surfaceSunken,
    border: COLORS.frameDark,
    edge: COLORS.buttonEdge,
    text: COLORS.text,
  },
  danger: {
    bg: COLORS.danger,
    border: COLORS.frameDark,
    edge: COLORS.buttonEdge,
    text: COLORS.textOnDark,
  },
  ghost: {
    bg: COLORS.surface,
    border: COLORS.frameDark,
    edge: COLORS.frameLight,
    text: COLORS.text,
  },
};

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  face: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: BORDER_WIDTH.normal,
    paddingHorizontal: SPACING.md,
  },
  label: { fontSize: FONT_SIZE.body },
  disabled: { opacity: 0.5 },
});
