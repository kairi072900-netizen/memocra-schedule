import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { PixelIcon } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import { getProjects, getTasks } from '@/lib/api';
import { WEEKDAY_LABELS } from '@/lib/calendar';
import {
  deriveProjectStatus,
  openTasks,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  unassignedTasks,
} from '@/lib/project-status';
import type { Project, ProjectStatus, Task } from '@/types';

/** '2026-08-20T19:00:00+09:00' → '8/20(木)' */
function shortDate(isoAt: string): string {
  const month = Number(isoAt.slice(5, 7));
  const day = Number(isoAt.slice(8, 10));
  const weekday = WEEKDAY_LABELS[new Date(isoAt.slice(0, 10)).getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

/**
 * S2 プロジェクト一覧。ステータス別にまとめたリスト。
 *
 * かんばんではなくリストにしたのは、モバイルで横スクロールが要らないため
 * （要件定義書 S2 は「かんばん or リスト」）。
 * 表示するステータスは**保存値ではなくタスクから導いた値**（要件定義書 F3）。
 */
export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message));
    getTasks()
      .then(setTasks)
      .catch((e: Error) => setError(e.message));
  }, []);

  // タブに戻るたび最新化（別画面で企画を作った・工程を進めた結果を反映）
  useFocusEffect(load);

  const grouped = useMemo(() => {
    if (!projects || !tasks) return null;
    const byStatus = new Map<ProjectStatus, { project: Project; tasks: Task[] }[]>();
    for (const p of projects) {
      const own = tasks.filter((t) => t.project_id === p.id);
      const status = deriveProjectStatus(own, p.publish_at);
      const list = byStatus.get(status) ?? [];
      list.push({ project: p, tasks: own });
      byStatus.set(status, list);
    }
    return byStatus;
  }, [projects, tasks]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <PixelFrame style={styles.header}>
        <Text style={styles.title}>プロジェクト</Text>
      </PixelFrame>

      {error && <ErrorView message={error} onRetry={load} />}

      {!grouped ? (
        !error && <LoadingView label="読み込み中…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {projects?.length === 0 ? (
            <Text style={styles.hint}>
              企画がまだありません。＋タブから登録すると、工程が自動で並びます。
            </Text>
          ) : (
            PROJECT_STATUS_ORDER.filter((s) => (grouped.get(s)?.length ?? 0) > 0).map((status) => (
              <View key={status} style={styles.group}>
                <Text style={styles.groupHeading}>
                  {PROJECT_STATUS_LABEL[status]}（{grouped.get(status)!.length}）
                </Text>
                {grouped.get(status)!.map(({ project, tasks: own }) => (
                  <ProjectRow key={project.id} project={project} tasks={own} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ProjectRow({ project, tasks }: { project: Project; tasks: Task[] }) {
  const open = openTasks(tasks);
  const unassigned = unassignedTasks(tasks);
  const iconName = project.kind === 'long' ? 'longPublish' : 'shortPublish';

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/project/[id]', params: { id: project.id } })}
    >
      <View style={styles.cardTop}>
        <PixelIcon name={iconName} size={LAYOUT.iconSize} color={SCHEDULE_KIND[iconName].color} />
        <Text style={styles.cardTitle} numberOfLines={1}>
          {project.title}
        </Text>
        {project.publish_at && <Text style={styles.meta}>{shortDate(project.publish_at)}</Text>}
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.meta}>
          工程 {tasks.length - open.length}/{tasks.length} 完了
        </Text>
        {/* 担当未定の放置が課題A。件数を一覧の時点で見せる（CLAUDE.md §1） */}
        {unassigned.length > 0 && (
          <Text style={styles.warning}>担当が未定 {unassigned.length}件</Text>
        )}
      </View>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { margin: SPACING.sm, padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, padding: SPACING.md },

  group: { marginBottom: SPACING.lg },
  groupHeading: { fontSize: FONT_SIZE.body, marginBottom: SPACING.xs },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
    // 硬い矩形の影。ぼかさない
    borderBottomWidth: BORDER_WIDTH.normal,
    borderRightWidth: BORDER_WIDTH.normal,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  cardTitle: { fontSize: FONT_SIZE.body, flexShrink: 1, flexGrow: 1 },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  warning: { fontSize: FONT_SIZE.body, color: COLORS.danger },
});
