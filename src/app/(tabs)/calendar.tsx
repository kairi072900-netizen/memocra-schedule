import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView, LoadingView } from '@/components/async-state';
import { Text } from '@/components/app-text';
import { CalendarLegend } from '@/components/calendar-legend';
import { MemberAvatar, PixelIcon } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import { ScheduleChip } from '@/components/schedule-chip';
import { ScheduleSummary } from '@/components/schedule-summary';
import {
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import {
  getAvailabilities,
  getMembers,
  getNotifications,
  getProjects,
  getStreams,
  getTasks,
} from '@/lib/api';
import { myOpenTasks, unassignedTasks } from '@/lib/project-status';
import { buildWorkloads } from '@/lib/workload';
import { supabase } from '@/lib/supabase';
import {
  addMonths,
  buildMonthGrid,
  type CalendarCell,
  DAYS_IN_WEEK,
  dateToKey,
  formatMonthLabel,
  WEEKDAY_LABELS,
  WEEKS_IN_GRID,
  weekRangeOf,
  type YearMonth,
  yearMonthOf,
} from '@/lib/calendar';
import {
  buildScheduleEvents,
  groupEventsByDate,
  resolveMemberAnswers,
  type ScheduleEvent,
} from '@/lib/schedule';
import type { Availability, Member, Project, Stream, Task } from '@/types';

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
  const [weekViewNote, setWeekViewNote] = useState(false);

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

  /**
   * その日付を初期値にして登録画面を開く。
   * 「＋タブへ行く → 種別を選ぶ → 日付を打つ」の3手を1手にする（要望「日付をタップして
   * 予定を入れられる」）。**開くだけで登録はしない**ので、押し間違えても何も起きない。
   */
  const openNewFor = (dateKey: string) => {
    router.push({ pathname: '/new', params: { date: dateKey } });
  };

  /** セルの長押し。選択を合わせてから登録画面へ（戻ったときにその日が選ばれている）。 */
  const handleAddOnDate = (cell: CalendarCell) => {
    handleSelectDate(cell);
    openNewFor(cell.date);
  };

  // 4種類すべて Supabase（lib/api.ts）に切り替え済み（CLAUDE.md §5.2）
  const [members, setMembers] = useState<Member[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  // 再取得時は既存データを消さない（タブ復帰のたびに画面が「読み込み中」に落ちないように）。
  // 初期状態が null なので、最初の読み込みだけスピナーが出る。
  const loadMembers = useCallback(() => {
    setMembersError(null);
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setMembersError(e.message));
  }, []);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const loadProjects = useCallback(() => {
    setProjectsError(null);
    getProjects()
      .then(setProjects)
      .catch((e: Error) => setProjectsError(e.message));
  }, []);

  const [streams, setStreams] = useState<Stream[] | null>(null);
  const [streamsError, setStreamsError] = useState<string | null>(null);

  const loadStreams = useCallback(() => {
    setStreamsError(null);
    getStreams()
      .then(setStreams)
      .catch((e: Error) => setStreamsError(e.message));
  }, []);

  const [availabilities, setAvailabilities] = useState<Availability[] | null>(null);
  const [availabilitiesError, setAvailabilitiesError] = useState<string | null>(null);

  const loadAvailabilities = useCallback(() => {
    setAvailabilitiesError(null);
    getAvailabilities()
      .then(setAvailabilities)
      .catch((e: Error) => setAvailabilitiesError(e.message));
  }, []);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const loadTasks = useCallback(() => {
    setTasksError(null);
    getTasks()
      .then(setTasks)
      .catch((e: Error) => setTasksError(e.message));
  }, []);

  /** 自分のID。「締切タスク（自分）」を絞るのに使う。 */
  const [myId, setMyId] = useState<string | null>(null);

  /**
   * ベルの未読バッジ。**通知を発行する仕組みはまだ無い（P4）**ので今は常に0だが、
   * 読む側を先に用意しておき、P4 で発行側を足せばそのまま光るようにしている。
   */
  const [unreadCount, setUnreadCount] = useState(0);

  const retryAll = useCallback(() => {
    loadProjects();
    loadStreams();
    loadAvailabilities();
    loadMembers();
    loadTasks();
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null));
    // 失敗しても画面は出したいので握りつぶす（バッジが出ないだけ）
    getNotifications()
      .then((list) => setUnreadCount(list.filter((n) => n.read_at === null).length))
      .catch(() => {});
  }, [loadProjects, loadStreams, loadAvailabilities, loadMembers, loadTasks]);

  // マウント時とタブ復帰時に読み込む。別画面で配信を登録・削除・回答した結果を反映する。
  useFocusEffect(retryAll);

  // projects / streams / availabilities / members のいずれかが失敗したら1枚のエラーカードにまとめる。
  // 4人しか使わないアプリで、失敗の理由ごとにカードを分けるほどの必要はない（CLAUDE.md §5.2）
  const loadError =
    projectsError ?? streamsError ?? availabilitiesError ?? membersError ?? tasksError;

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

  /** 今週（日〜土）の公開予定だけを日付順に。撮影・配信は「今日の予定」側で見る */
  const weekPublishEvents = useMemo(() => {
    const { start, end } = weekRangeOf(todayKey);
    return Object.entries(eventsByDate)
      .filter(([date]) => date >= start && date <= end)
      .flatMap(([, list]) => list)
      .filter((e) => e.kind === 'longPublish' || e.kind === 'shortPublish')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [eventsByDate, todayKey]);

  const myTasks = useMemo(() => myOpenTasks(tasks ?? [], myId), [tasks, myId]);

  // 負荷サマリー（要件定義書 F4）。tasks / members は既に読んでいるので追加の取得は不要
  const workloads = useMemo(
    () => (members ? buildWorkloads(tasks ?? [], members, todayKey) : []),
    [tasks, members, todayKey],
  );

  const cells = useMemo(() => buildMonthGrid(cursor, todayKey), [cursor, todayKey]);

  /**
   * セル幅は**実際に描ける幅を測って**決める。
   * `useWindowDimensions()` を使うと、PCでサイドバーが出ているときに
   * その幅ぶんだけ余分に見積もり、7列目（土曜）がはみ出して切れる。
   */
  const [screenWidth, setScreenWidth] = useState(0);
  const onScreenLayout = useCallback(
    (e: LayoutChangeEvent) => setScreenWidth(e.nativeEvent.layout.width),
    [],
  );
  const gridWidth = Math.max(0, screenWidth - SPACING.sm * 2);
  const cellWidth = gridWidth > 0 ? gridWidth / DAYS_IN_WEEK : 0;
  // セル幅が狭いときは文字を捨ててドット表示にする（要件定義書 12.3）
  const compact = cellWidth < LAYOUT.compactCellWidth;

  /**
   * 広い画面ではスクロールさせず1画面に収める。
   * グリッド領域に残された高さを6行で割ってセルの高さを決める
   * （**6行固定なので月が変わっても高さは動かない**。CLAUDE.md §3.1）。
   * 狭い画面はスクロール前提なので固定値のまま。
   */
  const [gridAreaHeight, setGridAreaHeight] = useState(0);
  const onGridAreaLayout = useCallback(
    (e: LayoutChangeEvent) => setGridAreaHeight(e.nativeEvent.layout.height),
    [],
  );
  const cellHeight = compact
    ? LAYOUT.calendarCellHeight
    : Math.max(LAYOUT.calendarCellMinHeight, gridAreaHeight / WEEKS_IN_GRID);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']} onLayout={onScreenLayout}>
      {/* ヘッダーは2行に収める。iPhone だと縦の余裕が無く、
          4行使うと6行のグリッドが最初の画面から押し出される（実機で踏んだ） */}
      <PixelFrame style={styles.header}>
        <View style={styles.headerRow}>
          <NavButton label="‹" onPress={() => goToMonth(addMonths(cursor, -1))} />
          <Text style={styles.monthLabel} numberOfLines={1}>
            {formatMonthLabel(cursor)}
          </Text>
          <NavButton label="›" onPress={() => goToMonth(addMonths(cursor, 1))} />
        </View>

        <View style={styles.headerRow}>
          <NavButton
            label="今日"
            onPress={() => {
              setCursor(currentMonth);
              setSelectedDate(todayKey);
            }}
          />
          {/* 新規登録はタブにもあるが、カレンダーを見ながら足せる導線をここにも置く */}
          <Pressable onPress={() => router.push('/new')} style={styles.primaryButton}>
            <PixelIcon name="plus" size={LAYOUT.iconSize} color={COLORS.text} />
            <Text style={styles.navLabel}>新規登録</Text>
          </Pressable>

          {/* 月／週の切り替え。中身が未実装のスタブなので、縦に余裕がある広い画面だけ出す
              （要件定義書 F6 で実装したらモバイルにも出すか見直す） */}
          {!compact && (
            <Pressable style={styles.toggleButton} onPress={() => setWeekViewNote(true)}>
              <Text style={styles.navLabelMuted}>週表示</Text>
            </Pressable>
          )}

          {/* お知らせ。未読があるときだけ件数を出す */}
          <Pressable onPress={() => router.push('/notifications')} style={styles.bellButton}>
            <PixelIcon name="notifications" size={LAYOUT.iconSize} color={COLORS.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>

          {/* 狭い画面ではサイドバーが無いので、設定への導線をここに置く
              （メンバー・設定は下タブに出ないため。components/nav/items.tsx の約束） */}
          <Pressable onPress={() => router.push('/settings')} style={styles.bellButton}>
            <PixelIcon name="settings" size={LAYOUT.iconSize} color={COLORS.text} />
          </Pressable>
        </View>

        {weekViewNote && <Text style={styles.note}>週表示は準備中です</Text>}
      </PixelFrame>

      {/* 凡例は場所を食うので、セルがチップ表示になる幅のときだけ出す */}
      {!compact && <CalendarLegend />}

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
        <Body compact={compact}>
          {/* 広い画面ではここが残りの高さを取り、その高さからセルの高さを決める */}
          <View style={compact ? undefined : styles.gridArea} onLayout={onGridAreaLayout}>
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
                  height={cellHeight}
                  compact={compact}
                  selected={item.date === selectedDate}
                  onPress={handleSelectDate}
                  onLongPress={handleAddOnDate}
                  events={item.isCurrentMonth ? (eventsByDate[item.date] ?? []) : []}
                  members={members}
                  availabilities={availabilities}
                />
              )}
            />
          </View>

          <View style={compact ? undefined : styles.panelRow}>
            <ScheduleSummary
            selectedLabel={
              selectedDate === null
                ? '日付をタップすると予定が出ます'
                : `${formatDateHeading(selectedDate)}の予定`
            }
            selectedEvents={selectedEvents}
            weekPublishEvents={weekPublishEvents}
            myTasks={myTasks}
            todayKey={todayKey}
            workloads={workloads}
            unassignedCount={unassignedTasks(tasks ?? []).length}
            onPressWorkload={() => router.push('/workload')}
            onPressAdd={selectedDate === null ? undefined : () => openNewFor(selectedDate)}
            answersOf={(streamId) => resolveMemberAnswers(members, availabilities, streamId)}
            onPressTask={(t) =>
              router.push({ pathname: '/project/[id]', params: { id: t.project_id } })
            }
            onPressEvent={(e) => {
              if (e.stream_id) {
                router.push({ pathname: '/stream/[id]', params: { id: e.stream_id } });
              } else {
                // 企画（project）の詳細画面は P5。今は日付を選ぶところまで
                setCursor(yearMonthOf(e.date));
                setSelectedDate(e.date);
              }
              }}
            />
          </View>
        </Body>
      )}

    </SafeAreaView>
  );
}

/**
 * 本文の入れ物。
 *
 *   - 狭い画面: `ScrollView`。6行のグリッドと4枚のパネルは物理的に1画面へ入らない
 *   - 広い画面: ただの `View`。**スクロールさせず1画面に収める**
 *              （グリッド領域が残りの高さを取り、パネル行は固定高さ）
 */
function Body({ compact, children }: { compact: boolean; children: React.ReactNode }) {
  if (compact) {
    return <ScrollView contentContainerStyle={styles.scrollBody}>{children}</ScrollView>;
  }
  return <View style={styles.fitBody}>{children}</View>;
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
  height,
  compact,
  selected,
  onPress,
  onLongPress,
  events,
  members,
  availabilities,
}: {
  cell: CalendarCell;
  width: number;
  height: number;
  compact: boolean;
  selected: boolean;
  onPress: (cell: CalendarCell) => void;
  onLongPress: (cell: CalendarCell) => void;
  events: ScheduleEvent[];
  members: Member[];
  availabilities: Availability[];
}) {
  const stream = events.find((e) => e.attendance);

  return (
    <Pressable
      onPress={() => onPress(cell)}
      onLongPress={() => onLongPress(cell)}
      style={[
        styles.cell,
        { width, height },
        selected && styles.cellSelected,
      ]}
    >
      {/* 今日は硬い矩形の枠で囲む。色ではなく枠なので、予定の色と衝突しない */}
      {cell.isToday && <View style={styles.todayMarker} pointerEvents="none" />}

      <View style={styles.cellHeader}>
        <Text style={[styles.dayNumber, !cell.isCurrentMonth && styles.dayNumberOutside]}>
          {cell.day}
        </Text>
        {/* 狭いときはセル右上に集約バッジを出す。広いときはチップの中に入るので出さない */}
        {compact && stream?.attendance && <AttendanceBadge token={stream.attendance} />}
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
            <ScheduleChip
              key={e.id}
              event={e}
              memberAnswers={
                e.stream_id ? resolveMemberAnswers(members, availabilities, e.stream_id) : undefined
              }
            />
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
  navLabelMuted: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  viewToggle: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xs },
  toggleButton: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  toggleButtonActive: { backgroundColor: COLORS.surfaceSunken },
  note: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, textAlign: 'center' },
  bellButton: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  bellBadge: {
    position: 'absolute',
    top: -SPACING.xs,
    right: -SPACING.xs,
    minWidth: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BORDER_WIDTH.normal,
  },
  bellBadgeText: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  memberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  memberItem: { alignItems: 'center' },
  memberName: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  weekdayRow: { flexDirection: 'row', paddingHorizontal: SPACING.sm },
  weekdayCell: { alignItems: 'center', paddingVertical: SPACING.xs },
  weekdayText: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  weekdayTextWeekend: { color: COLORS.textWeekend },

  scrollBody: { paddingBottom: SPACING.xl },
  /** 広い画面用。縦に伸ばして、中の gridArea が残りを取れるようにする */
  fitBody: { flex: 1 },
  /** カレンダーのグリッドが占める領域。ここの高さからセルの高さを決める */
  gridArea: { flex: 1, minHeight: 0 },
  /** 広い画面で下部に敷くパネル行。溢れる中身は各パネルの中でスクロールする */
  panelRow: { height: LAYOUT.panelRowHeight },
  grid: { paddingHorizontal: SPACING.sm },
  selectedSection: { paddingHorizontal: SPACING.sm, paddingTop: SPACING.md },
  selectedHeading: { fontSize: FONT_SIZE.title, marginBottom: SPACING.sm },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  cell: {
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
