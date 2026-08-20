import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import {
  ANSWER_BADGE,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import type { MemberAnswer, ScheduleEvent } from '@/lib/schedule';

/**
 * 選択日の予定カード。**表示専用。データの取得元は知らない**（CLAUDE.md §4）。
 *
 * 配信予定のときだけ `memberAnswers` を受け取り、4人の出欠を横並びで出す。
 */
export function EventCard({
  event,
  memberAnswers,
}: {
  event: ScheduleEvent;
  memberAnswers?: MemberAnswer[];
}) {
  const kind = SCHEDULE_KIND[event.kind];

  return (
    <View style={styles.card}>
      {/* 左端の色帯。角丸なしの硬い矩形（CLAUDE.md §3.1） */}
      <View style={[styles.kindBar, { backgroundColor: kind.color }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          {/* 色だけで種別を伝えない。ラベルに記号と名前を必ず併記する（CLAUDE.md §3.4） */}
          <View style={[styles.kindLabel, { backgroundColor: kind.color }]}>
            <Text style={styles.kindLabelText}>
              {kind.symbol} {kind.label}
            </Text>
          </View>
          <Text style={styles.time}>{event.time}</Text>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        {memberAnswers && (
          <View style={styles.memberRow}>
            {memberAnswers.map(({ member, answer }) => {
              const badge = ANSWER_BADGE[answer];
              return (
                <View key={member.id} style={styles.member}>
                  {/* アイコンは未作成。暫定でメンバー識別色の四角を使う。
                      色だけで判別させないため名前を必ず併記する（CLAUDE.md §3.4） */}
                  <View style={[styles.avatar, { backgroundColor: member.color }]} />
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <View style={[styles.answerBadge, { backgroundColor: badge.color }]}>
                    <Text style={styles.answerSymbol}>{badge.symbol}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
    // 硬い矩形の影。ぼかさない
    borderBottomWidth: BORDER_WIDTH.normal,
    borderRightWidth: BORDER_WIDTH.normal,
    marginBottom: SPACING.sm,
  },
  kindBar: { width: SPACING.xs },
  content: { flex: 1, padding: SPACING.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kindLabel: { paddingVertical: BORDER_WIDTH.normal, paddingHorizontal: SPACING.xs },
  kindLabelText: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  time: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  title: { fontSize: FONT_SIZE.body, marginTop: SPACING.xs },

  memberRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm },
  member: { flexDirection: 'row', alignItems: 'center', marginRight: SPACING.md, marginTop: SPACING.xs },
  avatar: {
    width: LAYOUT.dotSize,
    height: LAYOUT.dotSize,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
  },
  memberName: { fontSize: FONT_SIZE.body, marginLeft: SPACING.xs },
  answerBadge: {
    width: LAYOUT.badgeSize,
    height: LAYOUT.badgeSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  answerSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
});
