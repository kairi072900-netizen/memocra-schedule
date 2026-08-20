import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * P0の暫定ホーム。起動確認用のプレースホルダ。
 * 次のステップで constants/theme.ts と data/dummy.ts を作り、
 * この画面を月カレンダー（S0）に置き換える。
 */
export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.frame}>
          <Text style={styles.title}>メモクラ スケジュール</Text>
          <Text style={styles.body}>P0: カレンダーUI 未実装</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 仮のスタイル。borderRadius は使わない（要件定義書 12.1）。
// 正式な色・余白・フォントサイズは constants/theme.ts に集約する。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EDE0C8' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  frame: {
    borderWidth: 4,
    borderColor: '#5C4433',
    backgroundColor: '#F5EBD8',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  title: { fontSize: 24, color: '#3A2A1C', textAlign: 'center' },
  body: { fontSize: 16, color: '#5C4433', textAlign: 'center', marginTop: 16 },
});
