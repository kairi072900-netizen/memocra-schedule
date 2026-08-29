import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { MemberAvatar, PixelIcon } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import {
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
  TASK_STATUS,
} from '@/constants/theme';
import { getAvailabilities, getMembers, getProjects, getStreams, getTasks } from '@/lib/api';
import { dateToKey, WEEKDAY_LABELS, weekRangeOf } from '@/lib/calendar';
import { daysUntil, myOpenTasks } from '@/lib/project-status';
import { aggregateAttendance, resolveMemberAnswers } from '@/lib/schedule';
import { useSession } from '@/lib/auth';
import type { Availability, Member, Project, Stream, Task } from '@/types';

/**
 * S1 ホーム（今週）。**「今週の自分がやること」だけに絞った画面。**
 *
 * カレンダー（S0）が月全体を俯瞰する画面なのに対し、こちらは
 *   1. 自分の未完了タスク（締切順）
 *   2. 今週公開予定の動画
 *   3. **自分がまだ回答していない出欠依頼**
 * の3つだけを出す（要件定義書 S1）。
 *
 * 3つ目はカレンダーには無い情報。未回答が埋もれるのが要件定義書 F7 の課題なので、
 * ここで「あなたが答えていないもの」として名指しする。
 */
export default function HomeScreen() {
  const { session } = useSession();
  const myId = session?.user.id ?? null;
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [streams, setStreams] = useState<Stream[] | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    const fail = (e: Error) => setError(e.message);
    getTasks().then(setTasks).catch(fail);
    getProjects().then(setProjects).catch(fail);
    getStreams().then(setStreams).catch(fail);
    getAvailabilities().then(setAvailabilities).catch(fail);
    getMembers().then(setMembers).catch(fail);
  }, []);

  useFocusEffect(load);

  const week = useMemo(() => weekRangeOf(todayKey), [todayKey]);

  const myTasks = useMemo(() => myOpenTasks(tasks ?? [], myId), [tasks, myId]);

  /** 今週公開予定の企画。 */
  const weekProjects = useMemo(
    () =>
      (projects ?? [])
        .filter(
          (p) =>
            p.publish_at !== null &&
            p.publish_at.slice(0, 10) >= week.start &&
            p.publish_at.slice(0, 10) <= week.end,
        )
        .sort((a, b) => (a.publish_at ?? '').localeCompare(b.publish_at ?? '')),
    [projects, week],
  );

  /** これからの配信のうち、**自分がまだ回答していない**もの（要件定義書 F7）。 */
  const unanswered = useMemo(() => {
    if (!streams || !availabilities || !myId) return [];
    return streams
      .filter((s) => s.starts_at.slice(0, 10) >= todayKey)
      .filter((s) => !availabilities.some((a) => a.stream_id === s.id && a.member_id === myId))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [streams, availabilities, myId, todayKey]);

  const loading = !tasks || !projects || !streams || !availabilities || !members;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>今週</Text>
          <Text style={styles.subtitle}>
            {shortDate(week.start)} 〜 {shortDate(week.end)}
          </Text>
        </PixelFrame>

        {error && <ErrorView message={error} onRetry={load} />}

        {loading ? (
          !error && <LoadingView label="読み込み中…" />
        ) : (
          <>
            {/* 未回答を一番上に。埋もれさせないのがこの画面の主目的（F7） */}
            <PixelFrame style={styles.card}>
              <Text style={styles.cardTitle}>
                まだ答えていない出欠（{unanswered.length}件）
              </Text>
              {unanswered.length === 0 ? (
                <Text style={styles.empty}>未回答の出欠依頼はありません</Text>
              ) : (
                unanswered.map((s) => {
                  const answers = availabilities.filter((a) => a.stream_id === s.id);
                  const status = ATTENDANCE_STATUS[aggregateAttendance(answers, members.length)];
                  return (
                    <Pressable
                      key={s.id}
                      style={styles.row}
                      onPress={() =>
                        router.push({ pathname: '/stream/[id]', params: { id: s.id } })
                      }
                    >
                      <PixelIcon
                        name="stream"
                        size={LAYOUT.iconSize}
                        color={SCHEDULE_KIND.stream.color}
                      />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {s.title}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {shortDate(s.starts_at.slice(0, 10))} {s.starts_at.slice(11, 16)}
                        </Text>
                      </View>
                      <View style={styles.answerRow}>
                        {resolveMemberAnswers(members, availabilities, s.id).map(({ member }) => (
                          <MemberAvatar
                            key={member.id}
                            member={member}
                            size={LAYOUT.avatarSizeSmall}
                          />
                        ))}
                        <View style={[styles.badge, { backgroundColor: status.color }]}>
                          <Text style={styles.badgeSymbol}>{status.symbol}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </PixelFrame>

            <PixelFrame style={styles.card}>
              <Text style={styles.cardTitle}>自分のタスク（{myTasks.length}件）</Text>
              {myTasks.length === 0 ? (
                <Text style={styles.empty}>
                  {myId ? '未完了のタスクはありません' : 'ログイン情報を確認中です'}
                </Text>
              ) : (
                myTasks.map((t) => {
                  const status = TASK_STATUS[t.status];
                  const remaining = t.due_at ? daysUntil(t.due_at, todayKey) : null;
                  const overdue = remaining !== null && remaining < 0;
                  const projectTitle =
                    projects.find((p) => p.id === t.project_id)?.title ?? '';
                  return (
                    <Pressable
                      key={t.id}
                      style={styles.row}
                      onPress={() =>
                        router.push({ pathname: '/project/[id]', params: { id: t.project_id } })
                      }
                    >
                      <View style={[styles.badge, { backgroundColor: status.color }]}>
                        <Text style={styles.badgeSymbol}>{status.symbol}</Text>
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {t.title}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {projectTitle}
                        </Text>
                      </View>
                      {remaining !== null && (
                        <Text style={[styles.rowDue, overdue && styles.overdue]}>
                          {overdue ? `${-remaining}日超過` : `あと${remaining}日`}
                        </Text>
                      )}
                    </Pressable>
                  );
                })
              )}
            </PixelFrame>

            <PixelFrame style={styles.card}>
              <Text style={styles.cardTitle}>今週の公開予定（{weekProjects.length}件）</Text>
              {weekProjects.length === 0 ? (
                <Text style={styles.empty}>今週の公開予定はありません</Text>
              ) : (
                weekProjects.map((p) => {
                  const iconName = p.kind === 'long' ? 'longPublish' : 'shortPublish';
                  return (
                    <Pressable
                      key={p.id}
                      style={styles.row}
                      onPress={() =>
                        router.push({ pathname: '/project/[id]', params: { id: p.id } })
                      }
                    >
                      <PixelIcon
                        name={iconName}
                        size={LAYOUT.iconSize}
                        color={SCHEDULE_KIND[iconName].color}
                      />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                      </View>
                      <Text style={styles.rowDue}>
                        {p.publish_at ? shortDate(p.publish_at.slice(0, 10)) : ''}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </PixelFrame>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** '2026-08-30' → '8/30(日)' */
function shortDate(dateKey: string): string {
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const weekday = WEEKDAY_LABELS[new Date(dateKey).getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  header: { padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  subtitle: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  card: { padding: SPACING.sm },
  cardTitle: { fontSize: FONT_SIZE.body, marginBottom: SPACING.sm },
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
    flexWrap: 'wrap',
  },
  rowBody: { flexGrow: 1, flexShrink: 1, minWidth: SPACING.xxl * 3 },
  rowTitle: { fontSize: FONT_SIZE.body },
  rowMeta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  rowDue: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  overdue: { color: COLORS.danger },

  answerRow: { flexDirection: 'row', alignItems: 'center', gap: BORDER_WIDTH.normal },
  badge: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
});
