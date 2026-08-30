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
 *
 * 【外部カレンダー】Google / TimeTree から取り込んだ予定は**4つの種別の外側**に
 * 独立した1項目として置く。種別に5つ目を足すのではないことを、区切り線で示す。
 * `showExternal` は外部カレンダーを1つでも登録しているときだけ true にする
 * （使っていない人に無関係な凡例を見せない）。
 */
const KINDS = Object.keys(SCHEDULE_KIND) as ScheduleKindToken[];
const STATUSES = Object.keys(ATTENDANCE_STATUS) as AttendanceStatusToken[];

export function CalendarLegend({ showExternal = false }: { showExternal?: boolean }) {
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

      {showExternal && (
        <>
          <View style={styles.divider} />
          <View style={styles.item}>
            {/* 色ではなく文字で示す。チップ側の目印と揃える（§3.4） */}
            <Text style={styles.externalMark}>外</Text>
            <Text style={styles.label}>外部カレンダー</Text>
          </View>
        </>
      )}
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
  externalMark: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
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
