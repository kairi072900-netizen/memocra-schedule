import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { PixelFrame } from '@/components/pixel/frame';
import { SceneryCastle } from '@/components/pixel/scenery';
import { COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/** 未実装タブの中身。タブバーの骨組みだけ先に置くための仮画面。 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <PixelFrame style={styles.frame}>
          {/* 空状態は風景を出してよい数少ない場所のひとつ（§3.1 / scenery.tsx 冒頭） */}
          <SceneryCastle width={LAYOUT.sceneryWidth} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>準備中</Text>
        </PixelFrame>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  frame: { paddingVertical: SPACING.xl, paddingHorizontal: SPACING.xl, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  body: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.md },
});
