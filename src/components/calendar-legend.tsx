import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelIcon } from '@/components/pixel/icon';
import {
  ATTENDANCE_STATUS,
  type AttendanceStatusToken,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  type ScheduleKindToken,
  SPACING,
} from '@/constants/theme';

/**
 * カレンダーの凡例（要件定義書 12.2 / モックアップ上部）。
 *
 * **予定種別4つ・出欠ステータス4つで固定。画面ごとに凡例を変えないこと**（CLAUDE.md §3.4）。
 * アイコンと記号を必ず色に添える。色だけで意味を伝えない。
 *
 * 狭い画面では場所を食うので、呼び出し側が幅を見て出し分ける
 * （カレンダーのセルがドット表示になる幅では出さない）。
 */
const KINDS = Object.keys(SCHEDULE_KIND) as ScheduleKindToken[];
const STATUSES = Object.keys(ATTENDANCE_STATUS) as AttendanceStatusToken[];

export function CalendarLegend() {
  return (
    <View style={styles.container}>
      {KINDS.map((k) => (
        <View key={k} style={styles.item}>
          <PixelIcon name={k} size={LAYOUT.iconSize} color={SCHEDULE_KIND[k].color} />
          <Text style={styles.label}>{SCHEDULE_KIND[k].label}</Text>
        </View>
      ))}

      {/* 種別と出欠は別の軸なので、縦線で区切って混ざらないようにする */}
      <View style={styles.divider} />

      {STATUSES.map((s) => (
        <View key={s} style={styles.item}>
          <View style={[styles.badge, { backgroundColor: ATTENDANCE_STATUS[s].color }]}>
            <Text style={styles.badgeSymbol}>{ATTENDANCE_STATUS[s].symbol}</Text>
          </View>
          <Text style={styles.label}>{ATTENDANCE_STATUS[s].label}</Text>
        </View>
      ))}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  label: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  divider: {
    width: BORDER_WIDTH.normal,
    height: LAYOUT.iconSize,
    backgroundColor: COLORS.frameLight,
  },
  badge: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
});
