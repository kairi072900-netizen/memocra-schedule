import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LONG_TEXT, SPACING } from '@/constants/theme';

/**
 * P0の暫定ホーム。起動確認用のプレースホルダ。
 * 次のステップで data/dummy.ts を作り、この画面を月カレンダー（S0）に置き換える。
 */
export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.frame}>
          <Text style={styles.title}>メモクラ</Text>
          <Text style={styles.body}>P0: カレンダーUI 未実装</Text>
          {/* 長文はゴシックに切り替える（CLAUDE.md §3.1）。LONG_TEXT の表示確認を兼ねる。 */}
          <Text style={styles.note}>
            メモや議事録のように読ませる文章は、ドット絵フォントではなくゴシックで表示する。
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  frame: {
    borderWidth: BORDER_WIDTH.thick,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  title: { fontSize: FONT_SIZE.title, textAlign: 'center' },
  body: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  note: {
    ...LONG_TEXT,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
});
