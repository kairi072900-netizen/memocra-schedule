import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { MemberAvatar, PixelIcon } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import {
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import { WEEKDAY_LABELS } from '@/lib/calendar';
import type { MemberAnswer, ScheduleEvent } from '@/lib/schedule';

/**
 * カレンダーの下に置く要約パネル（モックアップ下段の「今日の予定」「今週の公開予定」）。
 * **表示専用。データの取得元は知らない**（CLAUDE.md §4）。
 *
 * モックアップにはもう1枚「負荷サマリー」があるが、タスクが必要なので P5/P6 で足す。
 *
 * 幅が広いときは横並び、狭いときは縦積みになる（`flexWrap`）。
 */
export function ScheduleSummary({
  todayLabel,
  todayEvents,
  weekPublishEvents,
  answersOf,
  onPressEvent,
}: {
  /** '8月10日(月)' のような見出し。 */
  todayLabel: string;
  todayEvents: ScheduleEvent[];
  /** 今週の公開予定（ロング/ショート）。 */
  weekPublishEvents: ScheduleEvent[];
  /** 配信の出欠を引く。カード側はデータ取得を知らないので関数で受ける。 */
  answersOf: (streamId: string) => MemberAnswer[];
  onPressEvent: (event: ScheduleEvent) => void;
}) {
  return (
    <View style={styles.container}>
      <Panel title={`今日の予定 ${todayLabel}`}>
        {todayEvents.length === 0 ? (
          <Text style={styles.empty}>予定はありません</Text>
        ) : (
          todayEvents.map((e) => (
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
    </View>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PixelFrame style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
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

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md,
  },
  // 320px 幅でも1枚が収まり、広い画面では2枚が横に並ぶ最小幅
  panel: { flexGrow: 1, flexBasis: 280, padding: SPACING.sm },
  panelTitle: { fontSize: FONT_SIZE.body, marginBottom: SPACING.sm },
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
});
