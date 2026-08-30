import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { GoalCard } from '@/components/goal-card';
import { ReplanPanel } from '@/components/replan-panel';
import { PixelIcon } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import { ProjectForm } from '@/components/project-form';
import { TaskRow } from '@/components/task-row';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  LONG_TEXT,
  SCHEDULE_KIND,
  SPACING,
} from '@/constants/theme';
import {
  createTasks,
  deleteProject,
  getGoals,
  getMembers,
  getTasks,
  type TaskPatch,
  updateProject,
  updateTask,
} from '@/lib/api';
import { dateToKey, WEEKDAY_LABELS } from '@/lib/calendar';
import { goalsOfProject } from '@/lib/goal';
import {
  deriveProjectStatus,
  openTasks,
  PROJECT_STATUS_LABEL,
  unassignedTasks,
} from '@/lib/project-status';
import { supabase } from '@/lib/supabase';
import { buildTasksFromTemplate, TASK_TEMPLATES } from '@/lib/task-template';
import type { Goal, Member, Project, Task } from '@/types';

/** '2026-08-20T19:00:00+09:00' → '8月20日(木) 19:00' */
function formatWhen(isoAt: string): string {
  const month = Number(isoAt.slice(5, 7));
  const day = Number(isoAt.slice(8, 10));
  const weekday = WEEKDAY_LABELS[new Date(isoAt.slice(0, 10)).getUTCDay()];
  return `${month}月${day}日(${weekday}) ${isoAt.slice(11, 16)}`;
}

function confirmDelete(taskCount: number): Promise<boolean> {
  const message =
    taskCount > 0
      ? `この企画には${taskCount}件の工程があります。削除すると工程も消えます。`
      : 'この企画を削除します。';
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert('企画を削除', message, [
      { text: 'やめる', style: 'cancel', onPress: () => resolve(false) },
      { text: '削除', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

/** 履歴が無ければプロジェクト一覧へ（`router.replace` で来ると戻り先が無い）。 */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/projects');
}

/** S3 プロジェクト詳細。工程タスクの一覧と、担当・締切・ステータスの変更。 */
export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .then(({ data, error: e }) => {
        if (e) setError(`企画の取得に失敗しました: ${e.message}`);
        else setProjects(data);
      });
    getTasks()
      .then(setTasks)
      .catch((e: Error) => setError(e.message));
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
    getGoals()
      .then(setGoals)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const project = projects?.[0];
  const projectTasks = useMemo(
    () => (tasks ?? []).filter((t) => t.project_id === id).sort((a, b) => a.sort_order - b.sort_order),
    [tasks, id],
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const handleTaskChange = (taskId: string, patch: TaskPatch) =>
    run(async () => {
      await updateTask(taskId, patch);
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.back} onPress={goBack}>
            ◀ もどる
          </Text>
        </PixelFrame>

        {error && <ErrorView message={error} onRetry={load} />}

        {!project || !tasks || !members ? (
          !error && <LoadingView label="読み込み中…" />
        ) : editing ? (
          <ProjectForm
            initial={{
              title: project.title,
              kind: project.kind,
              publish_at: project.publish_at,
              shoot_at: project.shoot_at,
              memo: project.memo,
            }}
            submitLabel="保存"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await updateProject(project.id, input);
              setEditing(false);
              load();
            }}
          />
        ) : (
          <View style={styles.content}>
            <ProjectHeader project={project} tasks={projectTasks} />

            {/* この企画に紐づく目標（要望「企画ごとの目標」）。編集は目標画面で行う */}
            <ProjectGoals goals={goals ?? []} projectId={project.id} todayKey={todayKey} />

            {/* AIは案を出すだけ。押すまで工程は変わらない（replan-panel.tsx 冒頭） */}
            <ReplanPanel
              project={project}
              tasks={projectTasks}
              members={members ?? []}
              todayKey={todayKey}
              onApply={async (changes) => {
                for (const c of changes) {
                  const patch: TaskPatch = {};
                  if (c.due_at !== undefined) patch.due_at = c.due_at;
                  if (c.assignee_id !== undefined) patch.assignee_id = c.assignee_id;
                  if (Object.keys(patch).length > 0) await updateTask(c.task_id, patch);
                }
                load();
              }}
            />

            <Text style={styles.sectionHeading}>
              工程（{openTasks(projectTasks).length}/{projectTasks.length} 未完了）
            </Text>

            {projectTasks.length === 0 ? (
              <View>
                <Text style={styles.hint}>工程がまだありません。</Text>
                <Pressable
                  disabled={busy || !project.publish_at}
                  onPress={() =>
                    run(async () => {
                      await createTasks(
                        buildTasksFromTemplate({
                          projectId: project.id,
                          kind: project.kind,
                          publishAt: project.publish_at!,
                          members,
                        }),
                      );
                    })
                  }
                  style={styles.primaryButton}
                >
                  <Text style={styles.buttonText}>
                    テンプレートから{TASK_TEMPLATES[project.kind].steps.length}工程を作る
                  </Text>
                </Pressable>
                {!project.publish_at && (
                  <Text style={styles.hint}>
                    公開予定日が無いと締切を逆算できません。先に編集で入れてください。
                  </Text>
                )}
              </View>
            ) : (
              projectTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  members={members}
                  todayKey={todayKey}
                  busy={busy}
                  onChange={(patch) => handleTaskChange(t.id, patch)}
                />
              ))
            )}

            <View style={styles.actions}>
              <Pressable onPress={() => setEditing(true)} style={styles.editButton}>
                <Text style={styles.buttonText}>編集</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={async () => {
                  if (!(await confirmDelete(projectTasks.length))) return;
                  setBusy(true);
                  try {
                    await deleteProject(project.id);
                    goBack();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '削除に失敗しました');
                    setBusy(false);
                  }
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.buttonText}>削除</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectHeader({ project, tasks }: { project: Project; tasks: Task[] }) {
  // 保存されている status ではなく、タスクの進捗から導いた値を出す（要件定義書 F3）
  const status = deriveProjectStatus(tasks, project.publish_at);
  const unassigned = unassignedTasks(tasks);
  const iconName = project.kind === 'long' ? 'longPublish' : 'shortPublish';

  return (
    <View>
      <View style={styles.titleRow}>
        <PixelIcon
          name={iconName}
          size={LAYOUT.iconSize}
          color={SCHEDULE_KIND[iconName].color}
        />
        <Text style={styles.title}>{project.title}</Text>
      </View>

      <Text style={styles.status}>{PROJECT_STATUS_LABEL[status]}</Text>
      {project.publish_at && (
        <Text style={styles.meta}>公開予定: {formatWhen(project.publish_at)}</Text>
      )}
      {project.shoot_at && <Text style={styles.meta}>撮影予定: {formatWhen(project.shoot_at)}</Text>}
      {project.memo && <Text style={styles.memo}>{project.memo}</Text>}

      {/* 担当未定の放置が課題A。CLAUDE.md §1 の成功指標そのものなので目立たせる */}
      {unassigned.length > 0 && (
        <Text style={styles.warning}>担当が未定の工程が {unassigned.length} 件あります</Text>
      )}
    </View>
  );
}

/**
 * この企画の目標。**一覧するだけで、ここでは編集しない**（編集は `/goals`）。
 * 投稿後分析の工程でここを見返せるように、詳細画面の上のほうに置いている。
 */
function ProjectGoals({
  goals,
  projectId,
  todayKey,
}: {
  goals: Goal[];
  projectId: string;
  todayKey: string;
}) {
  const list = goalsOfProject(goals, projectId);
  if (list.length === 0) return null;
  return (
    <>
      <Text style={styles.sectionHeading}>この企画の目標 {list.length}件</Text>
      {list.map((g) => (
        <GoalCard key={g.id} goal={g} todayKey={todayKey} />
      ))}
    </>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
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
  content: { paddingHorizontal: SPACING.md },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { fontSize: FONT_SIZE.title, flexShrink: 1 },
  status: { fontSize: FONT_SIZE.body, marginTop: SPACING.xs },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: BORDER_WIDTH.normal },
  memo: { ...LONG_TEXT, color: COLORS.text, marginTop: SPACING.sm },
  warning: { fontSize: FONT_SIZE.body, color: COLORS.danger, marginTop: SPACING.sm },

  sectionHeading: { fontSize: FONT_SIZE.body, marginTop: SPACING.xl, marginBottom: SPACING.xs },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.sm },

  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xxl },
  primaryButton: {
    minHeight: LAYOUT.minTapSize,
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  editButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  deleteButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: { fontSize: FONT_SIZE.body },
});
