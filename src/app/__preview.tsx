// 一時的な確認用ルート。コミット前に削除する。
import { StyleSheet, View } from 'react-native';

import { AppBackground } from '@/components/app-background';
import { Text } from '@/components/app-text';
import { Panel } from '@/components/ui/panel';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { SPACING } from '@/constants/theme';

export default function PreviewScreen() {
  return (
    <AppBackground>
      <Screen>
        <ScreenHeader title="背景の確認" subtitle="空・丘・木・村・城・草原" />
        <Panel title="パネルは不透明">
          <Text>この上に文字が乗る。風景は下端に固定でスクロールしない。</Text>
        </Panel>
        <View style={styles.spacer} />
        <Panel title="下までスクロールしても風景は動かない">
          <Text>継ぎ目が出ないか、横幅を変えて確認する。</Text>
        </Panel>
      </Screen>
    </AppBackground>
  );
}

const styles = StyleSheet.create({ spacer: { height: SPACING.xxl * 10 } });
