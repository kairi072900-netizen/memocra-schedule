import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelFrame } from '@/components/pixel/frame';
import { SceneryCastle } from '@/components/pixel/scenery';
import { COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * データ取得中/失敗時の共通表示。
 *
 * 4人しか使わないアプリなので、凝ったリトライ（指数バックオフ等）は作らない。
 * 「読み込み中」の1行と、失敗時は理由＋やり直しボタンだけで足りる（CLAUDE.md §5.2）。
 */
export function LoadingView({ label = '読み込み中…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <PixelFrame style={styles.frame}>
        {/* 失敗して何も出せない画面＝空状態。風景を出してよい場所（§3.1） */}
        <SceneryCastle width={LAYOUT.sceneryWidth} />
        <Text style={styles.text}>{message}</Text>
        <Text style={styles.retry} onPress={onRetry}>
          ↻ もう一度試す
        </Text>
      </PixelFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, alignItems: 'center' },
  frame: { padding: SPACING.lg, alignItems: 'center' },
  text: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, textAlign: 'center' },
  retry: { fontSize: FONT_SIZE.body, color: COLORS.text, marginTop: SPACING.md },
});
