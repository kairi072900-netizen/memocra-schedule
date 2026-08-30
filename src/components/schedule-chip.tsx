import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { MemberAvatar, PixelIcon } from '@/components/pixel/icon';
import {
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import type { MemberAnswer, ScheduleEvent } from '@/lib/schedule';

/**
 * カレンダーのセルに入る予定チップ（モックアップの色付きブロック）。
 * **表示専用。データの取得元は知らない**（CLAUDE.md §4）。
 *
 * 左端に種別色の帯を置き、種別アイコンと時刻・タイトルを並べる。
 * 配信のときだけ、下段にメンバーのミニアバターと出欠の集約バッジを出す。
 *
 * 角丸なし・影はぼかさない（§3.1）。色だけで種別を伝えず必ずアイコンを添える（§3.4）。
 */
export function ScheduleChip({
  event,
  memberAnswers,
}: {
  event: ScheduleEvent;
  /** 配信予定のときだけ渡す。渡されると下段に出欠が出る。 */
  memberAnswers?: MemberAnswer[];
}) {
  const kind = SCHEDULE_KIND[event.kind];
  const status = event.attendance ? ATTENDANCE_STATUS[event.attendance] : null;

  // 外部カレンダーから取り込んだ予定は**種別の色を持たない**。
  // 4色（ロング/ショート/配信/撮影）は自前の予定の意味に予約されていて、
  // ここに5色目を足すと凡例が増える（§3.4「凡例を画面ごとに変えない」）。
  const external = event.source === 'external';
  const barColor = external ? COLORS.textMuted : kind.color;

  return (
    <View style={styles.chip}>
      <View style={[styles.kindBar, { backgroundColor: barColor }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          {/* 外部予定はアイコンを出さず「外」の1文字にする。
              種別アイコンを流用すると、撮影予定と見分けがつかなくなる */}
          {external ? (
            <Text style={styles.externalMark}>外</Text>
          ) : (
            <PixelIcon name={event.kind} size={LAYOUT.iconSize} color={kind.color} />
          )}
          {/* 時刻は縮めない。狭いセルではタイトルだけが省略され、時刻は必ず読める */}
          <Text style={styles.time}>{event.time}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
        </View>

        {memberAnswers && (
          <View style={styles.answerRow}>
            {memberAnswers.map(({ member }) => (
              <MemberAvatar key={member.id} member={member} size={LAYOUT.avatarSizeSmall} />
            ))}
            {status && (
              <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                <Text style={styles.statusSymbol}>{status.symbol}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
    marginTop: BORDER_WIDTH.normal,
    // 狭いセルでタイトルが枠からはみ出さないように切る
    overflow: 'hidden',
  },
  kindBar: { width: BORDER_WIDTH.thick },
  body: { flex: 1, paddingHorizontal: BORDER_WIDTH.normal, paddingVertical: BORDER_WIDTH.hairline },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: BORDER_WIDTH.normal },
  time: { fontSize: FONT_SIZE.body },
  /** 外部カレンダーの予定の目印。色ではなく文字で示す（§3.4） */
  externalMark: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  title: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BORDER_WIDTH.hairline,
    marginTop: BORDER_WIDTH.hairline,
  },
  statusBadge: {
    width: LAYOUT.avatarSizeSmall,
    height: LAYOUT.avatarSizeSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: BORDER_WIDTH.normal,
  },
  statusSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
});
