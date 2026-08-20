import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import {
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  SCHEDULE_KIND,
  SPACING,
  type Badge,
} from '@/constants/theme';
import { getMembers, getProjects, getStreams } from '@/data/dummy';

/**
 * P0の暫定画面。**ダミーデータの確認用で、次のステップで月カレンダー（S0）に置き換える。**
 * ここに集計ロジックは書かない（CLAUDE.md §4）。並べ替えだけに留めている。
 */
export default function IndexScreen() {
  const members = getMembers();

  // 3ソース（publish_at / shoot_at / starts_at）を日付でマージする。
  // カレンダー専用テーブルを作らない方針の確認も兼ねている（CLAUDE.md §5.3）。
  const events: { date: string; badge: Badge; title: string }[] = [];
  for (const p of getProjects()) {
    if (p.publish_at) {
      events.push({
        date: p.publish_at.slice(0, 10),
        badge: p.kind === 'long' ? SCHEDULE_KIND.longPublish : SCHEDULE_KIND.shortPublish,
        title: p.title,
      });
    }
    if (p.shoot_at) {
      events.push({ date: p.shoot_at.slice(0, 10), badge: SCHEDULE_KIND.shoot, title: p.title });
    }
  }
  for (const s of getStreams()) {
    events.push({ date: s.starts_at.slice(0, 10), badge: SCHEDULE_KIND.stream, title: s.title });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heading}>2026年8月</Text>

        <View style={styles.row}>
          {members.map((m) => (
            <View key={m.id} style={styles.member}>
              {/* 色だけで判別させない。アイコン未作成のため暫定で名前を併記（CLAUDE.md §3.4） */}
              <View style={[styles.chip, { backgroundColor: m.color }]} />
              <Text style={styles.small}>{m.name}</Text>
            </View>
          ))}
        </View>

        {events.map((e, i) => (
          <View key={`${e.date}-${i}`} style={styles.event}>
            <Text style={styles.date}>{e.date.slice(5)}</Text>
            <View style={[styles.badge, { backgroundColor: e.badge.color }]}>
              <Text style={styles.badgeText}>{e.badge.symbol}</Text>
            </View>
            <Text style={styles.small} numberOfLines={1}>
              {e.badge.label} {e.title}
            </Text>
          </View>
        ))}

        <Text style={[styles.small, styles.legendHead]}>出欠ステータス（4種類固定）</Text>
        <View style={styles.row}>
          {Object.values(ATTENDANCE_STATUS).map((a) => (
            <View key={a.label} style={styles.member}>
              <View style={[styles.badge, { backgroundColor: a.color }]}>
                <Text style={styles.badgeText}>{a.symbol}</Text>
              </View>
              <Text style={styles.small}>{a.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: SPACING.md },
  heading: { fontSize: FONT_SIZE.title, marginBottom: SPACING.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  member: { flexDirection: 'row', alignItems: 'center', marginRight: SPACING.md },
  chip: {
    width: SPACING.md,
    height: SPACING.md,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
    marginRight: SPACING.xs,
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  badge: {
    width: SPACING.xl,
    height: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.sm,
  },
  badgeText: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  small: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  // 日付は折り返させない。flexShrink を継承すると "08-\n21" になる
  date: { fontSize: FONT_SIZE.body, flexShrink: 0 },
  legendHead: { marginTop: SPACING.md, marginBottom: SPACING.xs },
});
