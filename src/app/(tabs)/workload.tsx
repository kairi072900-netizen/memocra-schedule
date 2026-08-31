import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { MemberAvatar } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import { WorkloadSummary } from '@/components/workload-summary';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SPACING,
  TASK_STATUS,
} from '@/constants/theme';
import { getMembers, getProjects, getTasks } from '@/lib/api';
import { dateToKey } from '@/lib/calendar';
import { daysUntil, myOpenTasks, unassignedTasks } from '@/lib/project-status';
import { buildWorkloads, formatShare, OVERLOAD_THRESHOLD } from '@/lib/workload';
import type { Member, Project, Task } from '@/types';

/**
 * S5 負荷ダッシュボード（要件定義書 F4）。
 *
 * **CLAUDE.md §1 の成功指標を直接見る画面。**
 * 「リーダーの担当タスク比率 60%以下」「担当者未定のまま24時間以上放置 0件/週」が
 * 守れているかを、ここを開けば判断できるようにする。
 *
 * タブは5つで埋まっているので**タブは増やさず**、カレンダー下のパネルから遷移する。
 */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/calendar');
}

export default function WorkloadScreen() {
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getTasks()
      .then(setTasks)
      .catch((e: Error) => setError(e.message));
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
    getProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workloads = useMemo(
    () => (tasks && members ? buildWorkloads(tasks, members, todayKey) : []),
    [tasks, members, todayKey],
  );
  const unassigned = useMemo(() => unassignedTasks(tasks ?? []), [tasks]);

  const projectTitle = (projectId: string) =>
    projects?.find((p) => p.id === projectId)?.title ?? '';

  const openProject = (projectId: string) =>
    router.push({ pathname: '/project/[id]', params: { id: projectId } });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.back} onPress={goBack}>
            ◀ もどる
          </Text>
          <Text style={styles.title}>負荷ダッシュボード</Text>
        </PixelFrame>

        {error && <ErrorView message={error} onRetry={load} />}

        {!tasks || !members || !projects ? (
          !error && <LoadingView label="読み込み中…" />
        ) : (
          <View style={styles.content}>
            <PixelFrame style={styles.panel}>
              <Text style={styles.panelTitle}>メンバー別の未完了タスク</Text>
              <WorkloadSummary workloads={workloads} unassigned={unassigned.length} />
            </PixelFrame>

            {/* 担当が未定のまま放置されるのが課題A。ここで具体的に何が未定かまで出す */}
            {unassigned.length > 0 && (
              <PixelFrame style={styles.panel}>
                <Text style={styles.panelTitle}>担当が未定の工程（{unassigned.length}件）</Text>
                {unassigned.map((t) => (
                  <TaskLine
                    key={t.id}
                    task={t}
                    todayKey={todayKey}
                    subtitle={projectTitle(t.project_id)}
                    onPress={() => openProject(t.project_id)}
                  />
                ))}
              </PixelFrame>
            )}

            {/* 偏っている人の中身を出す。「何を持ちすぎているか」が分からないと動かせない */}
            {workloads
              .filter((w) => w.openCount > 0)
              .map((w) => (
                <PixelFrame key={w.member.id} style={styles.panel}>
                  <View style={styles.memberHeading}>
                    <MemberAvatar member={w.member} size={LAYOUT.avatarSize} />
                    <Text style={styles.memberName}>{w.member.name}</Text>
                    <Text
                      style={[
                        styles.memberShare,
                        w.share >= OVERLOAD_THRESHOLD && styles.memberShareWarn,
                      ]}
                    >
                      {w.openCount}件・全体の{formatShare(w.share)}
                    </Text>
                  </View>
                  {myOpenTasks(tasks, w.member.id).map((t) => (
                    <TaskLine
                      key={t.id}
                      task={t}
                      todayKey={todayKey}
                      subtitle={projectTitle(t.project_id)}
                      onPress={() => openProject(t.project_id)}
                    />
                  ))}
                </PixelFrame>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskLine({
  task,
  todayKey,
  subtitle,
  onPress,
}: {
  task: Task;
  todayKey: string;
  /** どの企画の工程か。工程名だけだとどれのことか分からないため。 */
  subtitle: string;
  onPress: () => void;
}) {
  const status = TASK_STATUS[task.status];
  const remaining = task.due_at ? daysUntil(task.due_at, todayKey) : null;
  const overdue = remaining !== null && remaining < 0;

  return (
    <Pressable style={styles.taskLine} onPress={onPress}>
      <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
        <Text style={styles.statusSymbol}>{status.symbol}</Text>
      </View>
      <View style={styles.taskBody}>
        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.taskMeta} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {remaining !== null && (
        <Text style={[styles.taskDue, overdue && styles.overdue]}>
          {overdue ? `${-remaining}日超過` : `あと${remaining}日`}
        </Text>
      )}
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  // **背景を塗らない。** 画面の地に敷いた風景（`components/app-background.tsx`）を
  // 透かすため。塗ると風景が完全に隠れる（実際に本番で踏んだ）
  safeArea: { flex: 1 },
  body: { paddingBottom: SPACING.xxl },
  header: { margin: SPACING.sm, padding: SPACING.sm },
  // 「もどる」は Text の onPress。文字の高さ（17px）しか当たり判定が無いので、
  // 上下に余白を足して 44px 相当まで広げる（§3.1 minTapSize）
  back: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    paddingVertical: SPACING.md,
    alignSelf: 'flex-start',
  },
  title: { fontSize: FONT_SIZE.title, textAlign: 'center' },
  content: { paddingHorizontal: SPACING.sm, gap: SPACING.sm },
  panel: { padding: SPACING.sm },
  panelTitle: { fontSize: FONT_SIZE.body, marginBottom: SPACING.sm },

  memberHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  memberName: { fontSize: FONT_SIZE.body, flexGrow: 1, flexShrink: 1 },
  memberShare: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  memberShareWarn: { color: COLORS.text },

  taskLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
  },
  statusBadge: {
    width: LAYOUT.iconSize,
    height: LAYOUT.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  taskBody: { flexGrow: 1, flexShrink: 1 },
  taskTitle: { fontSize: FONT_SIZE.body },
  taskMeta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  taskDue: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  overdue: { color: COLORS.danger },
});
