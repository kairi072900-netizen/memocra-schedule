import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/async-state';
import { Text } from '@/components/app-text';
import { EventCard } from '@/components/event-card';
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
import { getAvailabilities, getMembers, getProjects, getStreams } from '@/lib/api';
import {
  addMonths,
  buildMonthGrid,
  type CalendarCell,
  DAYS_IN_WEEK,
  dateToKey,
  formatMonthLabel,
  WEEKDAY_LABELS,
  type YearMonth,
  yearMonthOf,
} from '@/lib/calendar';
import {
  buildScheduleEvents,
  groupEventsByDate,
  resolveMemberAnswers,
  type ScheduleEvent,
} from '@/lib/schedule';
import type { Availability, Member, Project, Stream } from '@/types';

/** S0 カレンダー。月表示のみ。週表示への切り替えは後のフェーズ（要件定義書 F6）。 */
export default function CalendarScreen() {
  const todayKey = useMemo(() => dateToKey(new Date()), []);
  const currentMonth = useMemo<YearMonth>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const [cursor, setCursor] = useState<YearMonth>(currentMonth);
  // 起動時は今日を選択しておく。開いた瞬間に今日の予定が見える状態にするため
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);

  /** 月送りでは選択を解除する。移動先の月に選択日が無く、状態が噛み合わなくなるため */
  const goToMonth = (next: YearMonth) => {
    setCursor(next);
    setSelectedDate(null);
  };

  /**
   * セルのタップ。隣接月のセルなら、その月へ移動したうえでその日を選択する。
   * 「日付をタップすれば予定が見える」挙動をカレンダー全体で揃えるため、
   * 隣接月だけ反応しない、という作りにはしない。
   */
  const handleSelectDate = (cell: CalendarCell) => {
    if (!cell.isCurrentMonth) setCursor(yearMonthOf(cell.date));
    setSelectedDate(cell.date);
  };

  // 4種類すべて Supabase（lib/api.ts）に切り替え済み（CLAUDE.md §5.2）
  const [members, setMembers] = useState<Member[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  const loadMembers = useCallback(() => {
    setMembersError(null);
    setMembers(null);
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setMembersError(e.message));
  }, []);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    setProjectsError(null);
    setProjects(null);
    getProjects()
      .then(setProjects)
      .catch((e: Error) => setProjectsError(e.message));
  }, []);

  const [streams, setStreams] = useState<Stream[] | null>(null);
  const [streamsError, setStreamsError] = useState<string | null>(null);

  const loadStreams = useCallback(() => {
    setStreamsError(null);
    setStreams(null);
    getStreams()
      .then(setStreams)
      .catch((e: Error) => setStreamsError(e.message));
  }, []);

  const [availabilities, setAvailabilities] = useState<Availability[] | null>(null);
  const [availabilitiesError, setAvailabilitiesError] = useState<string | null>(null);

  const loadAvailabilities = useCallback(() => {
    setAvailabilitiesError(null);
    setAvailabilities(null);
    getAvailabilities()
      .then(setAvailabilities)
      .catch((e: Error) => setAvailabilitiesError(e.message));
  }, []);

  useEffect(() => {
    loadProjects();
    loadStreams();
    loadAvailabilities();
    loadMembers();
  }, [loadProjects, loadStreams, loadAvailabilities, loadMembers]);

  // projects / streams / availabilities / members のいずれかが失敗したら1枚のエラーカードにまとめる。
  // 4人しか使わないアプリで、失敗の理由ごとにカードを分けるほどの必要はない（CLAUDE.md §5.2）
  const loadError = projectsError ?? streamsError ?? availabilitiesError ?? membersError;
  const retryAll = () => {
    loadProjects();
    loadStreams();
    loadAvailabilities();
    loadMembers();
  };

  const eventsByDate = useMemo(() => {
    if (!projects || !streams || !availabilities || !members) return {};
    const events = buildScheduleEvents({
      projects,
      streams,
      availabilities,
      memberCount: members.length,
    });
    return groupEventsByDate(events);
  }, [projects, streams, availabilities, members]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

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
          <NavButton label="◀ 前月" onPress={() => goToMonth(addMonths(cursor, -1))} />
          <NavButton
            label="今日"
            onPress={() => {
              setCursor(currentMonth);
              setSelectedDate(todayKey);
            }}
          />
          <NavButton label="次月 ▶" onPress={() => goToMonth(addMonths(cursor, 1))} />
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

      {loadError ? (
        <ErrorView message={loadError} onRetry={retryAll} />
      ) : !projects || !streams || !availabilities || !members ? (
        <LoadingView label="予定を読み込み中…" />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody}>
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
                selected={item.date === selectedDate}
                onPress={handleSelectDate}
                events={item.isCurrentMonth ? (eventsByDate[item.date] ?? []) : []}
              />
            )}
          />

          <View style={styles.selectedSection}>
            {selectedDate === null ? (
              <Text style={styles.hint}>日付をタップすると、その日の予定が出ます</Text>
            ) : (
              <>
                <Text style={styles.selectedHeading}>{formatDateHeading(selectedDate)}</Text>
                {selectedEvents.length === 0 ? (
                  <Text style={styles.hint}>予定はありません</Text>
                ) : (
                  selectedEvents.map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      memberAnswers={
                        e.stream_id
                          ? resolveMemberAnswers(members, availabilities, e.stream_id)
                          : undefined
                      }
                    />
                  ))
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** '2026-08-21' → '8月21日(金)' */
function formatDateHeading(dateKey: string): string {
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const weekday = WEEKDAY_LABELS[new Date(dateKey).getUTCDay()];
  return `${month}月${day}日(${weekday})`;
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
  selected,
  onPress,
  events,
}: {
  cell: CalendarCell;
  width: number;
  compact: boolean;
  selected: boolean;
  onPress: (cell: CalendarCell) => void;
  events: ScheduleEvent[];
}) {
  const stream = events.find((e) => e.attendance);

  return (
    <Pressable
      onPress={() => onPress(cell)}
      style={[styles.cell, { width }, selected && styles.cellSelected]}
    >
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
    </Pressable>
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

  scrollBody: { paddingBottom: SPACING.xl },
  grid: { paddingHorizontal: SPACING.sm },
  selectedSection: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.md },
  selectedHeading: { fontSize: FONT_SIZE.title, marginBottom: SPACING.sm },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  cell: {
    height: LAYOUT.calendarCellHeight,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  /** 選択中のセル。今日マーカー（枠）と併用できるよう、背景で示す */
  cellSelected: { backgroundColor: COLORS.surfaceSunken },
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
