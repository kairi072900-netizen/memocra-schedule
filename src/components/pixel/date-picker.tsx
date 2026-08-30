import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';
import {
  addMonths,
  buildMonthGrid,
  DAYS_IN_WEEK,
  dateToKey,
  formatMonthLabel,
  WEEKDAY_LABELS,
  yearMonthOf,
  type CalendarCell,
  type YearMonth,
} from '@/lib/calendar';
import { isValidDateKey, isValidTime } from '@/lib/date-input';

/**
 * 日付・時刻の入力欄（CLAUDE.md §3.1 のドット絵スタイル）。
 *
 * `stream-form.tsx` / `project-form.tsx` のコメントにあった
 * 「専用ピッカーは後の仕上げフェーズで差し替える」の差し替え先。
 *
 * 【`@react-native-community/datetimepicker` を使わない理由】
 * web では OS ネイティブのピッカーが出て**角丸が混入する**。§3.1 に例外は無い。
 * 依存も1つ増える。グリッドは `lib/calendar.ts` の `buildMonthGrid` をそのまま
 * 使い回せる（42セル・6行固定）ので、自前で描くほうが安く、見た目も揃う。
 *
 * 【テキスト入力を残す理由】
 * 慣れた人は手で打つほうが速い。ピッカーは**追加の手段**であって置き換えではない。
 */

// ---------------------------------------------------------------------------
// 日付
// ---------------------------------------------------------------------------

export function DateField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  /** 'YYYY-MM-DD'。空文字は未入力。 */
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="numeric"
        />
        <Pressable style={styles.openButton} onPress={() => setOpen(true)}>
          <Text style={styles.openButtonText}>カレンダー</Text>
        </Pressable>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <CalendarModal
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(dateKey) => {
          onChange(dateKey);
          setOpen(false);
        }}
      />
    </View>
  );
}

function CalendarModal({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: string;
  onPick: (dateKey: string) => void;
  onClose: () => void;
}) {
  const todayKey = useMemo(() => dateToKey(new Date()), []);
  // 入力済みならその月から、空なら今月から開く
  const initialMonth: YearMonth = isValidDateKey(value)
    ? yearMonthOf(value)
    : yearMonthOf(todayKey);
  const [cursor, setCursor] = useState<YearMonth>(initialMonth);

  const cells = useMemo(() => buildMonthGrid(cursor, todayKey), [cursor, todayKey]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 中身のタップで閉じないよう、内側の Pressable でイベントを止める */}
        <Pressable onPress={() => {}}>
          <PixelFrame style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable
                style={styles.monthButton}
                onPress={() => setCursor(addMonths(cursor, -1))}
              >
                <Text style={styles.monthButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{formatMonthLabel(cursor)}</Text>
              <Pressable
                style={styles.monthButton}
                onPress={() => setCursor(addMonths(cursor, 1))}
              >
                <Text style={styles.monthButtonText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((w, i) => (
                <Text
                  key={w}
                  style={[
                    styles.weekdayLabel,
                    // 日曜赤・土曜青は予定種別の色と衝突するので使わない（§3.1）
                    (i === 0 || i === DAYS_IN_WEEK - 1) && styles.weekdayLabelEnd,
                  ]}
                >
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell) => (
                <PickerCell
                  key={cell.date}
                  cell={cell}
                  selected={cell.date === value}
                  onPress={() => onPick(cell.date)}
                />
              ))}
            </View>

            <View style={styles.sheetFooter}>
              <Pressable style={styles.footerButton} onPress={() => onPick(todayKey)}>
                <Text style={styles.footerButtonText}>今日</Text>
              </Pressable>
              <Pressable style={styles.footerButton} onPress={onClose}>
                <Text style={styles.footerButtonText}>とじる</Text>
              </Pressable>
            </View>
          </PixelFrame>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerCell({
  cell,
  selected,
  onPress,
}: {
  cell: CalendarCell;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pickerCell, selected && styles.pickerCellSelected]}
    >
      {/* 今日は色ではなく硬い矩形の枠で示す（カレンダー本体と同じ作法。§3.1） */}
      {cell.isToday && <View style={styles.todayMarker} pointerEvents="none" />}
      <Text style={[styles.pickerDay, !cell.isCurrentMonth && styles.pickerDayOutside]}>
        {cell.day}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// 時刻
// ---------------------------------------------------------------------------

/** 分の候補。1分刻みは要らない（配信・公開は15分単位で足りる）。 */
const MINUTES = ['00', '15', '30', '45'] as const;

export function TimeField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  /** 'HH:MM'。空文字は未入力。 */
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);

  const hour = isValidTime(value) ? value.slice(0, 2) : '';
  const minute = isValidTime(value) ? value.slice(3, 5) : '';

  const pick = (h: string, m: string) => onChange(`${h}:${m}`);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          inputMode="numeric"
        />
        <Pressable style={styles.openButton} onPress={() => setOpen((v) => !v)}>
          <Text style={styles.openButtonText}>{open ? 'とじる' : '時刻を選ぶ'}</Text>
        </Pressable>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      {/* 時刻はモーダルにしない。候補が少なく、その場で開いたほうが手数が減る */}
      {open && (
        <View style={styles.timePanel}>
          <Text style={styles.timeSectionLabel}>時</Text>
          <View style={styles.timeRow}>
            {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map((h) => (
              <Pressable
                key={h}
                style={[styles.timeButton, h === hour && styles.timeButtonActive]}
                onPress={() => pick(h, minute || '00')}
              >
                <Text style={styles.timeButtonText}>{h}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.timeSectionLabel}>分</Text>
          <View style={styles.timeRow}>
            {MINUTES.map((m) => (
              <Pressable
                key={m}
                style={[styles.timeButton, m === minute && styles.timeButtonActive]}
                onPress={() => pick(hour || '20', m)}
              >
                <Text style={styles.timeButtonText}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  field: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.body, marginBottom: SPACING.xs },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },

  inputRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'stretch' },
  input: {
    flex: 1,
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    fontSize: FONT_SIZE.body,
  },
  openButton: {
    minHeight: LAYOUT.minTapSize,
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingHorizontal: SPACING.md,
  },
  openButtonText: { fontSize: FONT_SIZE.body },

  // --- 日付のモーダル ---
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  sheet: { backgroundColor: COLORS.background, padding: SPACING.sm },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  monthButton: {
    minWidth: LAYOUT.minTapSize,
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
  },
  monthButtonText: { fontSize: FONT_SIZE.body },
  monthLabel: { fontSize: FONT_SIZE.body },

  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    width: LAYOUT.pickerCellSize,
    textAlign: 'center',
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
  },
  weekdayLabelEnd: { color: COLORS.textWeekend },

  grid: { flexDirection: 'row', flexWrap: 'wrap', width: LAYOUT.pickerCellSize * DAYS_IN_WEEK },
  pickerCell: {
    width: LAYOUT.pickerCellSize,
    height: LAYOUT.pickerCellSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
  },
  pickerCellSelected: { backgroundColor: COLORS.surfaceSunken },
  todayMarker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.text,
  },
  pickerDay: { fontSize: FONT_SIZE.body },
  pickerDayOutside: { color: COLORS.textMuted },

  sheetFooter: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  footerButton: {
    flex: 1,
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
  },
  footerButtonText: { fontSize: FONT_SIZE.body },

  // --- 時刻 ---
  timePanel: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
  },
  timeSectionLabel: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginBottom: SPACING.xs },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
  timeButton: {
    minWidth: LAYOUT.minTapSize,
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.background,
  },
  timeButtonActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  timeButtonText: { fontSize: FONT_SIZE.body },
});
