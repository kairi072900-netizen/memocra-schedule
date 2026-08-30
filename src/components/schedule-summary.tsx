import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { MemberAvatar, PixelIcon } from '@/components/pixel/icon';
import { WorkloadSummary } from '@/components/workload-summary';
import { PixelFrame } from '@/components/pixel/frame';
import {
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
  TASK_STATUS,
} from '@/constants/theme';
import { WEEKDAY_LABELS } from '@/lib/calendar';
import { daysUntil } from '@/lib/project-status';
import type { MemberAnswer, ScheduleEvent } from '@/lib/schedule';
import type { MemberWorkload } from '@/lib/workload';
import type { Task } from '@/types';

/**
 * カレンダーの下に置く要約パネル（モックアップ下段）。
 * **表示専用。データの取得元は知らない**（CLAUDE.md §4）。
 *
 * 1枚目は**選択日の予定**。以前はカレンダー直下に別セクションを置いていたが、
 * 初期選択が今日なので「今日の予定」パネルと同じ内容が2回出ていた。
 * 1枚目に統合して重複を消し、そのぶん縦を詰めている。
 *
 * 幅が広いときは横並び、狭いときは縦積みになる（`flexWrap`）。
 */
export function ScheduleSummary({
  selectedLabel,
  selectedEvents,
  weekPublishEvents,
  myTasks,
  todayKey,
  workloads,
  unassignedCount,
  answersOf,
  onPressEvent,
  onPressTask,
  onPressWorkload,
  onPressAdd,
}: {
  /** '8月10日(月)' のような見出し。選択日（未選択なら今日）。 */
  selectedLabel: string;
  selectedEvents: ScheduleEvent[];
  /** 今週の公開予定（ロング/ショート）。 */
  weekPublishEvents: ScheduleEvent[];
  /** 自分が担当する未完了タスク（締切の近い順）。 */
  myTasks: Task[];
  /** 'YYYY-MM-DD'。締切の残日数を出すのに使う。 */
  todayKey: string;
  /** メンバー別の負荷（要件定義書 F4）。 */
  workloads: MemberWorkload[];
  /** 担当が未定の未完了タスク数。 */
  unassignedCount: number;
  /** 配信の出欠を引く。カード側はデータ取得を知らないので関数で受ける。 */
  answersOf: (streamId: string) => MemberAnswer[];
  onPressEvent: (event: ScheduleEvent) => void;
  onPressTask: (task: Task) => void;
  /** 負荷サマリーの見出しをタップしたとき（S5 の専用画面へ）。 */
  onPressWorkload: () => void;
  /**
   * 選択日に予定を足したいとき。**日付が選ばれているときだけ**渡す
   * （未選択のまま「この日に追加」を出すと、どの日に入るのか分からないため）。
   */
  onPressAdd?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Panel title={selectedLabel} onPressTitle={onPressAdd} actionLabel="＋ 追加">
        {selectedEvents.length === 0 ? (
          <Text style={styles.empty}>予定はありません</Text>
        ) : (
          selectedEvents.map((e) => (
            <SummaryRow key={e.id} event={e} answersOf={answersOf} onPress={onPressEvent} />
          ))
        )}
      </Panel>

      <Panel title="今週の公開予定">
        {weekPublishEvents.length === 0 ? (
          <Text style={styles.empty}>公開予定はありません</Text>
        ) : (
          weekPublishEvents.map((e) => (
            <SummaryRow key={e.id} event={e} answersOf={answersOf} onPress={onPressEvent} showDate />
          ))
        )}
      </Panel>

      {/* モックアップ下段の3枚目「負荷サマリー」。要件定義書 F4 */}
      <Panel title="負荷サマリー" onPressTitle={onPressWorkload}>
        <WorkloadSummary workloads={workloads} unassigned={unassignedCount} compact />
      </Panel>

      {/* モックアップの「締切タスク（自分）」。要件定義書 S1 の一部でもある */}
      <Panel title={`締切タスク（自分） ${myTasks.length}件`}>
        {myTasks.length === 0 ? (
          <Text style={styles.empty}>自分の未完了タスクはありません</Text>
        ) : (
          myTasks.map((t) => <TaskSummaryRow key={t.id} task={t} todayKey={todayKey} onPress={onPressTask} />)
        )}
      </Panel>
    </View>
  );
}

function Panel({
  title,
  children,
  onPressTitle,
  actionLabel = 'すべて見る ›',
}: {
  title: string;
  children: React.ReactNode;
  /** 渡すと見出しが右端のラベル付きタップ領域になる。 */
  onPressTitle?: () => void;
  /** 見出し右端の文言。遷移だけでなく「＋ この日に追加」のような操作にも使う。 */
  actionLabel?: string;
}) {
  return (
    <PixelFrame style={styles.panel}>
      {onPressTitle ? (
        <Pressable style={styles.panelTitleRow} onPress={onPressTitle}>
          <Text style={styles.panelTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.panelMore} numberOfLines={1}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.panelTitle} numberOfLines={1}>
          {title}
        </Text>
      )}
      {/* 広い画面ではパネルの高さが固定なので、中身が多いときはここでスクロールする */}
      <ScrollView style={styles.panelBody}>{children}</ScrollView>
    </PixelFrame>
  );
}

/** '2026-08-10' → '8/10(月)' */
function shortDate(dateKey: string): string {
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const weekday = WEEKDAY_LABELS[new Date(dateKey).getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

function SummaryRow({
  event,
  answersOf,
  onPress,
  showDate = false,
}: {
  event: ScheduleEvent;
  answersOf: (streamId: string) => MemberAnswer[];
  onPress: (event: ScheduleEvent) => void;
  showDate?: boolean;
}) {
  const kind = SCHEDULE_KIND[event.kind];
  const status = event.attendance ? ATTENDANCE_STATUS[event.attendance] : null;
  const answers = event.stream_id ? answersOf(event.stream_id) : null;

  return (
    <Pressable style={styles.row} onPress={() => onPress(event)}>
      <View style={styles.rowTop}>
        <PixelIcon name={event.kind} size={LAYOUT.iconSize} color={kind.color} />
        <Text style={styles.rowKind}>{kind.label}</Text>
        <Text style={styles.rowTime}>
          {showDate ? `${shortDate(event.date)} ` : ''}
          {event.time}
        </Text>
      </View>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {event.title}
      </Text>
      {answers && (
        <View style={styles.answerRow}>
          {answers.map(({ member }) => (
            <MemberAvatar key={member.id} member={member} size={LAYOUT.avatarSizeSmall} />
          ))}
          {status && (
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusSymbol}>{status.symbol}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function TaskSummaryRow({
  task,
  todayKey,
  onPress,
}: {
  task: Task;
  todayKey: string;
  onPress: (task: Task) => void;
}) {
  const status = TASK_STATUS[task.status];
  const remaining = task.due_at ? daysUntil(task.due_at, todayKey) : null;
  const overdue = remaining !== null && remaining < 0;

  return (
    <Pressable style={styles.row} onPress={() => onPress(task)}>
      <View style={styles.rowTop}>
        <View style={[styles.taskBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusSymbol}>{status.symbol}</Text>
        </View>
        <Text style={styles.rowKind} numberOfLines={1}>
          {task.title}
        </Text>
        {remaining !== null && (
          <Text style={[styles.rowTime, overdue && styles.overdue]}>
            {overdue ? `${-remaining}日超過` : `あと${remaining}日`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
  },
  /**
   * 320px 幅でも1枚が収まり、**PC（サイドバーを引いた約1000px）では4枚が横1列**に並ぶ幅。
   * 4枚 × 220 + 余白 ≒ 940 なので、1000px あれば折り返さない。
   */
  panel: { flexGrow: 1, flexBasis: 220, padding: SPACING.sm, minHeight: 0 },
  panelTitle: { fontSize: FONT_SIZE.body, marginBottom: SPACING.sm, flexShrink: 1 },
  panelBody: { flexGrow: 0, flexShrink: 1 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // 右端のラベルは縮めない（縮むのは見出しのほう）。
  // 折り返すと見出しが1行ぶん押し下げられ、パネルの中身が隠れる
  panelMore: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    flexShrink: 0,
    marginLeft: SPACING.sm,
  },
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  row: {
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  rowKind: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  rowTime: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginLeft: 'auto' },
  rowTitle: { fontSize: FONT_SIZE.body, marginTop: BORDER_WIDTH.normal },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BORDER_WIDTH.normal,
    marginTop: BORDER_WIDTH.normal,
  },
  statusBadge: {
    width: LAYOUT.avatarSizeSmall,
    height: LAYOUT.avatarSizeSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  statusSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  taskBadge: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdue: { color: COLORS.danger },
});
