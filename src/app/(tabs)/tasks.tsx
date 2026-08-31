import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { MemberAvatar } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import { TaskRow } from '@/components/task-row';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SPACING,
  TASK_STATUS,
  type TaskStatusToken,
} from '@/constants/theme';
import { getMembers, getProjects, getTasks, type TaskPatch, updateTask } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dateToKey } from '@/lib/calendar';
import { openTasks } from '@/lib/project-status';
import type { Member, Project, Task } from '@/types';

/**
 * タスク一覧。**全プロジェクトの工程を横断で見る画面。**
 *
 * プロジェクト詳細（S3）が「この動画の工程」を見るのに対し、こちらは
 * 「誰の・どの状態の工程が・いつ締切か」を全体から探す。
 * 金曜会議で「ブロック中はどれか」「未割当はどれか」を洗い出すのに使う想定。
 *
 * 行の中身と操作は `TaskRow` をそのまま使う（プロジェクト詳細と挙動を揃える）。
 */

/** 担当の絞り込み。'all' と '未割当' は特別扱い。 */
type AssigneeFilter = 'all' | 'unassigned' | string;
type StatusFilter = 'open' | 'all' | TaskStatusToken;

export default function TasksScreen() {
  const { session } = useSession();
  const myId = session?.user.id ?? null;
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [assignee, setAssignee] = useState<AssigneeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('open');

  const load = useCallback(() => {
    setError(null);
    const fail = (e: Error) => setError(e.message);
    getTasks().then(setTasks).catch(fail);
    getMembers().then(setMembers).catch(fail);
    getProjects().then(setProjects).catch(fail);
  }, []);

  useFocusEffect(load);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    // 既定は「未完了だけ」。完了まで全部出すと、やることを探す画面として使えない
    if (status === 'open') list = openTasks(list);
    else if (status !== 'all') list = list.filter((t) => t.status === status);

    if (assignee === 'unassigned') list = list.filter((t) => t.assignee_id === null);
    else if (assignee !== 'all') list = list.filter((t) => t.assignee_id === assignee);

    // 締切の近い順。締切なしは末尾
    return [...list].sort((a, b) => {
      if (a.due_at === null) return 1;
      if (b.due_at === null) return -1;
      return a.due_at.localeCompare(b.due_at);
    });
  }, [tasks, status, assignee]);

  const change = (taskId: string, patch: TaskPatch) => {
    setBusy(true);
    setError(null);
    updateTask(taskId, patch)
      .then(() => load())
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <PixelFrame style={styles.header}>
        <Text style={styles.title}>タスク一覧</Text>
      </PixelFrame>

      {error && <ErrorView message={error} onRetry={load} />}

      {!tasks || !members || !projects ? (
        !error && <LoadingView label="読み込み中…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.filters}>
            <Text style={styles.filterLabel}>状態</Text>
            <View style={styles.chipRow}>
              <FilterChip
                label="未完了"
                active={status === 'open'}
                onPress={() => setStatus('open')}
              />
              {(Object.keys(TASK_STATUS) as TaskStatusToken[]).map((s) => (
                <FilterChip
                  key={s}
                  label={`${TASK_STATUS[s].symbol} ${TASK_STATUS[s].label}`}
                  active={status === s}
                  onPress={() => setStatus(s)}
                />
              ))}
              <FilterChip label="すべて" active={status === 'all'} onPress={() => setStatus('all')} />
            </View>

            <Text style={styles.filterLabel}>担当</Text>
            <View style={styles.chipRow}>
              <FilterChip
                label="全員"
                active={assignee === 'all'}
                onPress={() => setAssignee('all')}
              />
              {myId && (
                <FilterChip
                  label="自分"
                  active={assignee === myId}
                  onPress={() => setAssignee(myId)}
                />
              )}
              {members
                .filter((m) => m.id !== myId)
                .map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setAssignee(m.id)}
                    style={[styles.chip, assignee === m.id && styles.chipActive]}
                  >
                    <MemberAvatar member={m} size={LAYOUT.avatarSizeSmall} />
                    <Text style={styles.chipText}>{m.name}</Text>
                  </Pressable>
                ))}
              {/* 未割当の放置が課題A。ワンタップで洗い出せるようにする（§1の成功指標） */}
              <FilterChip
                label="担当が未定"
                active={assignee === 'unassigned'}
                onPress={() => setAssignee('unassigned')}
              />
            </View>
          </View>

          <PixelFrame style={styles.list}>
            <Text style={styles.count}>{filtered.length}件</Text>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>条件に合うタスクはありません</Text>
            ) : (
              filtered.map((t) => (
                <View key={t.id}>
                  <Text style={styles.projectName} numberOfLines={1}>
                    {projects.find((p) => p.id === t.project_id)?.title ?? ''}
                  </Text>
                  <TaskRow
                    task={t}
                    members={members}
                    todayKey={todayKey}
                    busy={busy}
                    onChange={(patch) => change(t.id, patch)}
                  />
                </View>
              ))
            )}
          </PixelFrame>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  // **背景を塗らない。** 画面の地に敷いた風景（`components/app-background.tsx`）を
  // 透かすため。塗ると風景が完全に隠れる（実際に本番で踏んだ）
  safeArea: { flex: 1 },
  header: { margin: SPACING.sm, padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl },

  filters: { marginBottom: SPACING.sm },
  filterLabel: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginBottom: SPACING.xs },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  chip: {
    minHeight: LAYOUT.minTapSize,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  chipActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  chipText: { fontSize: FONT_SIZE.body },

  list: { padding: SPACING.sm },
  count: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginBottom: SPACING.xs },
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  /** どの企画の工程かを行の上に出す。工程名だけでは判別できないため */
  projectName: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.sm },
});
