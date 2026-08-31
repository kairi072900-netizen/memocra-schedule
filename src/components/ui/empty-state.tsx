import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { SceneryCastle } from '@/components/pixel/scenery';
import { Button } from '@/components/ui/button';
import { COLORS, FONT_SIZE, LAYOUT, SPACING, TEXT } from '@/constants/theme';

/**
 * 「まだ何も無い」ときの表示。**アプリ内の空状態はこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前は空状態が5パターンあった（`hint` with padding /
 * `hint` without / `empty` / `ComingSoon` の風景つき / CTA つき）。
 * 文言もスタイルも画面ごとにバラバラだった。
 *
 * 【次に何をすればいいか書く】空状態は「無い」ことを伝える場所ではなく、
 * **「どうすれば埋まるか」を伝える場所**。可能なら `action` を渡す。
 *
 * 【風景】`scenery` を true にすると城のドット絵を出す。**画面ぜんぶが空の
 * ときだけ**にすること。カードの中の小さな空欄に出すと、内容より目立つ。
 */
export function EmptyState({
  message,
  hint,
  actionLabel,
  onPressAction,
  scenery = false,
  /** カードの中に置く小さな空欄。余白を詰めて1行で出す。 */
  compact = false,
}: {
  message: string;
  hint?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  scenery?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return <Text style={styles.compact}>{message}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {scenery && <SceneryCastle width={LAYOUT.sceneryWidth} />}
      <Text style={styles.message}>{message}</Text>
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
      {actionLabel !== undefined && onPressAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onPressAction} variant="primary" />
        </View>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: SPACING.lg, gap: SPACING.xs },
  message: { fontSize: FONT_SIZE.body, color: COLORS.text, textAlign: 'center' },
  hint: { ...TEXT.body, color: COLORS.textMuted, textAlign: 'center' },
  action: { marginTop: SPACING.sm },
  /** カードの中の1行。周りの行と高さを揃える */
  compact: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
});
