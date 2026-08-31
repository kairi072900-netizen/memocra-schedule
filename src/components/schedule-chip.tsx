import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelIcon } from '@/components/pixel/icon';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
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
  // 淡色の地。**新しい色ではなく、種別色を薄めたもの**（theme.ts の Badge.tint）
  const tint = external ? COLORS.surface : (kind.tint ?? COLORS.surface);
  // 公開予定は旗を立てる。月を眺めたときに「いつ世に出るか」が真っ先に目に入る
  const isPublish = !external && (event.kind === 'longPublish' || event.kind === 'shortPublish');

  return (
    <View style={[styles.chip, { backgroundColor: tint, borderColor: barColor }]}>
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
          {event.time.length > 0 && <Text style={styles.time}>{event.time}</Text>}
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
        </View>

        {memberAnswers && (
          <View style={styles.answerRow}>
            {memberAnswers.map(({ member }) => (
              <Avatar key={member.id} member={member} size="sm" />
            ))}
            {status && <StatusBadge badge={status} size="sm" />}
          </View>
        )}
      </View>

      {/* 公開日の旗。色ではなく形で「公開」を示す（§3.4） */}
      {isPublish && (
        <View style={[styles.flag, { backgroundColor: kind.color }]} pointerEvents="none">
          <Text style={styles.flagMark}>⚑</Text>
        </View>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  /** 種別色の枠＋淡色の地。セルの明るい地の上で「札」として浮く */
  chip: {
    flexDirection: 'row',
    borderWidth: BORDER_WIDTH.hairline,
    marginTop: BORDER_WIDTH.normal,
    // 狭いセルでタイトルが枠からはみ出さないように切る
    overflow: 'hidden',
  },
  kindBar: { width: LAYOUT.chipBarWidth },
  /** 公開日の旗。チップの右上に重ねる */
  flag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: BORDER_WIDTH.normal,
  },
  flagMark: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark, lineHeight: FONT_SIZE.body },
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

});
