// 一時的な確認用ルート。コミット前に削除する。
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelIcon } from '@/components/pixel/icon';
import { Avatar, MemberChip } from '@/components/ui/avatar';
import { NotifyBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ListRow } from '@/components/ui/list-row';
import { Panel } from '@/components/ui/panel';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen, ScreenHeader, SectionHeading } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented';
import { ATTENDANCE_STATUS, COLORS, LAYOUT, SCHEDULE_KIND, SPACING, TASK_STATUS } from '@/constants/theme';
import type { Member } from '@/types';

const M: Member[] = [
  { id: '1', team_id: 't', name: 'あお', role: '企画', color: '#2F6FB5', avatar_url: null, active_hours: null, push_token: null },
  { id: '2', team_id: 't', name: 'きい', role: 'サムネ', color: '#D9A407', avatar_url: null, active_hours: null, push_token: null },
];

export default function PreviewScreen() {
  const [seg, setSeg] = useState<'month' | 'week'>('month');
  const [chip, setChip] = useState('a');
  return (
    <Screen>
      <ScreenHeader
        title="部品カタログ"
        subtitle="ui/ の共通部品"
        actions={<Button label="＋新規登録" onPress={() => {}} variant="primary" icon="plus" />}
      />

      <Panel title="ボタン（立体・押すと沈む）">
        <View style={styles.row}>
          <Button label="主アクション" onPress={() => {}} variant="primary" />
          <Button label="ふつう" onPress={() => {}} />
          <Button label="削除する" onPress={() => {}} variant="danger" />
          <Button label="控えめ" onPress={() => {}} variant="ghost" />
          <Button label="無効" onPress={() => {}} disabled />
        </View>
      </Panel>

      <Panel title="セグメント / チップ">
        <SegmentedControl
          options={[{ value: 'month', label: 'カレンダー' }, { value: 'week', label: '週表示' }]}
          value={seg}
          onChange={setSeg}
        />
        <View style={styles.gap} />
        <ChipRow>
          <Chip label="すべて" active={chip === 'a'} onPress={() => setChip('a')} />
          <Chip label="未割当" active={chip === 'b'} onPress={() => setChip('b')} />
          <Chip label="あお" active={chip === 'c'} onPress={() => setChip('c')} leading={<Avatar member={M[0]} size="sm" />} />
          <Chip label="設定" icon="settings" active={chip === 'd'} onPress={() => setChip('d')} />
        </ChipRow>
      </Panel>

      <Panel title="バッジ / ゲージ / メンバー">
        <View style={styles.row}>
          <StatusBadge badge={ATTENDANCE_STATUS.allPresent} showLabel />
          <StatusBadge badge={ATTENDANCE_STATUS.hasMaybe} showLabel />
          <StatusBadge badge={TASK_STATUS.blocked} size="sm" showLabel />
        </View>
        <View style={styles.gap} />
        <View style={styles.bellWrap}>
          <PixelIcon name="notifications" size={LAYOUT.tabIconSize} />
          <NotifyBadge count={3} />
        </View>
        <View style={styles.gap} />
        <ProgressBar value={0.66} color={COLORS.exp} />
        <Text>Lv.25　33/50 EXP</Text>
        <View style={styles.gap} />
        <MemberChip member={M[0]} size="md" meta="12件" />
        <MemberChip member={M[1]} size="md" meta="3件" />
      </Panel>

      <SectionHeading actionLabel="すべて見る ›" onPressAction={() => {}}>
        リストの行
      </SectionHeading>
      <Panel padding="sm">
        <ListRow
          leading={<PixelIcon name="stream" size={LAYOUT.iconSize} color={SCHEDULE_KIND.stream.color} />}
          title="マイクラ雑談配信"
          meta="8月15日(金) 20:00・YouTube"
          trailing={<StatusBadge badge={ATTENDANCE_STATUS.hasMaybe} size="sm" />}
          onPress={() => {}}
        />
        <ListRow
          leading={<StatusBadge badge={TASK_STATUS.doing} size="sm" />}
          title="ロング編集：カット"
          meta="新拠点づくり"
          right="3日超過"
          rightAlert
        />
      </Panel>

      <Panel title="入力">
        <Input label="タイトル" placeholder="マイクラ雑談配信" hint="あとから変えられます" />
        <Input label="メモ" placeholder="ゲスト参加あり" multiline />
        <Input label="目標値" placeholder="1000" error="0より大きい数字で入れてください" />
      </Panel>

      <Panel title="空状態">
        <EmptyState message="まだ企画がありません" hint="＋新規登録から追加できます" actionLabel="企画を作る" onPressAction={() => {}} />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', alignItems: 'center' },
  gap: { height: SPACING.md },
  bellWrap: { alignSelf: 'flex-start' },
});
