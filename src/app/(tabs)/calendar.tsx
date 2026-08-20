import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
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
import { getAvailabilities, getMembers, getProjects, getStreams } from '@/data/dummy';
import {
  addMonths,
  buildMonthGrid,
  type CalendarCell,
  DAYS_IN_WEEK,
  dateToKey,
  formatMonthLabel,
  WEEKDAY_LABELS,
  type YearMonth,
} from '@/lib/calendar';
import { buildScheduleEvents, groupEventsByDate, type ScheduleEvent } from '@/lib/schedule';

/** S0 カレンダー。月表示のみ。週表示・選択日の予定リストは後のフェーズ。 */
export default function CalendarScreen() {
  const todayKey = useMemo(() => dateToKey(new Date()), []);
  const currentMonth = useMemo<YearMonth>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const [cursor, setCursor] = useState<YearMonth>(currentMonth);

  // P1でSupabaseに差し替えると、この3行がasyncになり loading/error 処理が要る（CLAUDE.md §5.2）
  const eventsByDate = useMemo(() => {
    const events = buildScheduleEvents({
      projects: getProjects(),
      streams: getStreams(),
      availabilities: getAvailabilities(),
      memberCount: getMembers().length,
    });
    return groupEventsByDate(events);
  }, []);

  const cells = useMemo(() => buildMonthGrid(cursor, todayKey), [cursor, todayKey]);

  // セル幅が狭いときは文字を捨ててドット表示にする（要件定義書 12.3）
  const { width } = useWindowDimensions();
  const gridWidth = width - SPACING.sm * 2;
  const cellWidth = gridWidth / DAYS_IN_WEEK;
  const compact = cellWidth < LAYOUT.compactCellWidth;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <PixelFrame style={styles.header}>
        {/* 月ラベルは独立した行に置く。ボタンと同じ行にすると狭い画面で「2026年8/月」と折り返す */}
        <Text style={styles.monthLabel} numberOfLines={1}>
          {formatMonthLabel(cursor)}
        </Text>
        <View style={styles.headerRow}>
          <NavButton label="◀ 前月" onPress={() => setCursor(addMonths(cursor, -1))} />
          <NavButton label="今日" onPress={() => setCursor(currentMonth)} />
          <NavButton label="次月 ▶" onPress={() => setCursor(addMonths(cursor, 1))} />
        </View>
      </PixelFrame>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={label} style={[styles.weekdayCell, { width: cellWidth }]}>
            {/* 土日は文字色だけ変える。セル背景には色を敷かない（CLAUDE.md §3.4） */}
            <Text
              style={[
                styles.weekdayText,
                (i === 0 || i === DAYS_IN_WEEK - 1) && styles.weekdayTextWeekend,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        data={cells}
        numColumns={DAYS_IN_WEEK}
        scrollEnabled={false}
        keyExtractor={(cell) => cell.date}
        style={styles.grid}
        renderItem={({ item }) => (
          <DayCell
            cell={item}
            width={cellWidth}
            compact={compact}
            events={item.isCurrentMonth ? (eventsByDate[item.date] ?? []) : []}
          />
        )}
      />
    </SafeAreaView>
  );
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.navButton}>
      <Text style={styles.navLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * 1日ぶんのセル。
 * 隣接月（`isCurrentMonth === false`）は日付をグレーで出すだけで、予定は表示しない。
 */
function DayCell({
  cell,
  width,
  compact,
  events,
}: {
  cell: CalendarCell;
  width: number;
  compact: boolean;
  events: ScheduleEvent[];
}) {
  const stream = events.find((e) => e.attendance);

  return (
    <View style={[styles.cell, { width }]}>
      {/* 今日は硬い矩形の枠で囲む。色ではなく枠なので、予定の色と衝突しない */}
      {cell.isToday && <View style={styles.todayMarker} pointerEvents="none" />}

      <View style={styles.cellHeader}>
        <Text style={[styles.dayNumber, !cell.isCurrentMonth && styles.dayNumberOutside]}>
          {cell.day}
        </Text>
        {/* 出欠バッジは色と記号を必ずセットで出す（CLAUDE.md §3.4） */}
        {stream?.attendance && <AttendanceBadge token={stream.attendance} />}
      </View>

      {compact ? (
        <View style={styles.dotRow}>
          {events.map((e) => (
            <View key={e.id} style={[styles.dot, { backgroundColor: SCHEDULE_KIND[e.kind].color }]} />
          ))}
        </View>
      ) : (
        <View>
          {events.map((e) => (
            <View key={e.id} style={styles.eventRow}>
              <View style={[styles.dot, { backgroundColor: SCHEDULE_KIND[e.kind].color }]} />
              <Text style={styles.eventText} numberOfLines={1}>
                {SCHEDULE_KIND[e.kind].symbol} {e.title}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AttendanceBadge({ token }: { token: keyof typeof ATTENDANCE_STATUS }) {
  const badge = ATTENDANCE_STATUS[token];
  return (
    <View style={[styles.badge, { backgroundColor: badge.color }]}>
      <Text style={styles.badgeSymbol}>{badge.symbol}</Text>
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  header: { margin: SPACING.sm, padding: SPACING.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: { fontSize: FONT_SIZE.title, textAlign: 'center', marginBottom: SPACING.xs },
  navButton: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  navLabel: { fontSize: FONT_SIZE.body },

  weekdayRow: { flexDirection: 'row', paddingHorizontal: SPACING.sm },
  weekdayCell: { alignItems: 'center', paddingVertical: SPACING.xs },
  weekdayText: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  weekdayTextWeekend: { color: COLORS.textWeekend },

  grid: { paddingHorizontal: SPACING.sm },
  cell: {
    height: LAYOUT.calendarCellHeight,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  todayMarker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.text,
  },
  cellHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayNumber: { fontSize: FONT_SIZE.body },
  dayNumberOutside: { color: COLORS.textMuted },

  dotRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.xs },
  dot: {
    width: LAYOUT.dotSize,
    height: LAYOUT.dotSize,
    marginRight: BORDER_WIDTH.normal,
    marginBottom: BORDER_WIDTH.normal,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  eventText: { fontSize: FONT_SIZE.body, marginLeft: SPACING.xs, flexShrink: 1 },

  badge: {
    width: LAYOUT.badgeSize,
    height: LAYOUT.badgeSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
});
