import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { GoalCard } from '@/components/goal-card';
import { DateField } from '@/components/pixel/date-picker';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';
import {
  createGoal,
  deleteGoal,
  getGoals,
  getMembers,
  getProjects,
  updateGoal,
  type GoalInput,
} from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dateToKey } from '@/lib/calendar';
import { isValidDateKey } from '@/lib/date-input';
import {
  GOAL_HORIZON_HINT,
  GOAL_HORIZON_LABEL,
  GOAL_HORIZON_ORDER,
  GOAL_SCOPE_LABEL,
} from '@/lib/goal';
import type { Goal, GoalHorizon, GoalScope, Member, Project } from '@/types';

/**
 * 目標。要件定義書には無く、ユーザーの要望で足した画面。
 *
 * **短期と中長期を並べて見せる**のがこの画面の要点。
 * 「今月やること」と「半年後に居たい場所」が同じ画面にあると、
 * 目先のタスクが何に繋がっているかが見える。
 *
 * 3つのスコープ（チーム / 個人 / 企画）を1画面にまとめている。
 * スコープごとに画面を分けると、4人のチームでは画面数のほうが多くなるため。
 *
 * **Lv（`lib/level.ts`）とは無関係。** レベルは完了タスク数だけで決まる加点型で、
 * 減る要素を持たない（CLAUDE.md §2）。目標には未達があるので、混ぜない。
 */
export default function GoalsScreen() {
  const { session } = useSession();
  const myId = session?.user.id ?? null;
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);

  const load = useCallback(() => {
    setError(null);
    const fail = (e: Error) => setError(e.message);
    getGoals().then(setGoals).catch(fail);
    getMembers().then(setMembers).catch(fail);
    getProjects().then(setProjects).catch(fail);
  }, []);

  useFocusEffect(load);

  const memberOf = (id: string | null) => members?.find((m) => m.id === id);
  const projectOf = (id: string | null) => projects?.find((p) => p.id === id);

  const adjust = async (goal: Goal, delta: number) => {
    if (busy) return;
    setBusy(true);
    try {
      // 0未満には落とさない。マイナスの進捗は意味を持たない
      const next = Math.max(0, goal.current_value + delta);
      const saved = await updateGoal(goal.id, { current_value: next });
      setGoals((list) => (list ?? []).map((g) => (g.id === saved.id ? saved : g)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  if (error && !goals) return <ErrorView message={error} onRetry={load} />;
  if (!goals || !members || !projects) return <LoadingView label="読み込み中…" />;

  const active = goals.filter((g) => g.status === 'active');
  const closed = goals.filter((g) => g.status !== 'active');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>目標</Text>
          <Text style={styles.hint}>短期＝今月・今四半期／中長期＝半年・1年</Text>
          <Pressable style={styles.addButton} onPress={() => setComposing((v) => !v)}>
            <Text style={styles.addText}>{composing ? 'とじる' : '＋ 目標を立てる'}</Text>
          </Pressable>
        </PixelFrame>

        {error && <Text style={styles.error}>{error}</Text>}

        {composing && (
          <GoalForm
            members={members}
            projects={projects}
            myId={myId}
            onCancel={() => setComposing(false)}
            onSubmit={async (input) => {
              const created = await createGoal(input);
              setGoals((list) => [...(list ?? []), created]);
              setComposing(false);
            }}
          />
        )}

        {/* 短期 → 中長期 の順。手前の期間から見るほうが行動に繋がる */}
        {GOAL_HORIZON_ORDER.map((h) => {
          const list = active.filter((g) => g.horizon === h);
          return (
            <View key={h} style={styles.section}>
              <Text style={styles.sectionHeading}>
                {GOAL_HORIZON_LABEL[h]}（{GOAL_HORIZON_HINT[h]}） {list.length}件
              </Text>
              {list.length === 0 ? (
                <Text style={styles.empty}>まだありません</Text>
              ) : (
                list.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    member={memberOf(g.member_id)}
                    project={projectOf(g.project_id)}
                    todayKey={todayKey}
                    onAdjust={(d) => void adjust(g, d)}
                  />
                ))
              )}
            </View>
          );
        })}

        {closed.length > 0 && (
          <View style={styles.section}>
            {/* 達成・やめた目標は消さずに残す。何を諦めたかが振り返れなくなるため */}
            <Text style={styles.sectionHeading}>終わった目標 {closed.length}件</Text>
            {closed.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                member={memberOf(g.member_id)}
                project={projectOf(g.project_id)}
                todayKey={todayKey}
              />
            ))}
          </View>
        )}

        {/* 進行中の目標だけ、状態を変える操作をまとめて出す */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>状態を変える</Text>
            {active.map((g) => (
              <View key={g.id} style={styles.statusRow}>
                <Text style={styles.statusTitle} numberOfLines={1}>
                  {g.title}
                </Text>
                <StatusButton
                  label="達成"
                  onPress={async () => {
                    const saved = await updateGoal(g.id, { status: 'achieved' });
                    setGoals((l) => (l ?? []).map((x) => (x.id === saved.id ? saved : x)));
                  }}
                />
                <StatusButton
                  label="やめた"
                  onPress={async () => {
                    const saved = await updateGoal(g.id, { status: 'dropped' });
                    setGoals((l) => (l ?? []).map((x) => (x.id === saved.id ? saved : x)));
                  }}
                />
                <StatusButton
                  label="削除"
                  onPress={async () => {
                    await deleteGoal(g.id);
                    setGoals((l) => (l ?? []).filter((x) => x.id !== g.id));
                  }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusButton({ label, onPress }: { label: string; onPress: () => Promise<void> }) {
  return (
    <Pressable style={styles.statusButton} onPress={() => void onPress()}>
      <Text style={styles.statusButtonText}>{label}</Text>
    </Pressable>
  );
}

const SCOPES: GoalScope[] = ['team', 'member', 'project'];

function GoalForm({
  members,
  projects,
  myId,
  onSubmit,
  onCancel,
}: {
  members: Member[];
  projects: Project[];
  myId: string | null;
  onSubmit: (input: GoalInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [scope, setScope] = useState<GoalScope>('team');
  const [horizon, setHorizon] = useState<GoalHorizon>('short');
  // 個人の目標は自分の分を立てるのが既定。他人の分も立てられる（4人なので許す）
  const [memberId, setMemberId] = useState<string | null>(myId);
  const [projectId, setProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState('');
  const [target, setTarget] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (title.trim().length === 0) return '目標を入れてください';
    if (scope === 'member' && !memberId) return '誰の目標かを選んでください';
    if (scope === 'project' && !projectId) return 'どの企画かを選んでください';
    if (target.length > 0 && !(Number(target) > 0)) return '目標値は0より大きい数字で入れてください';
    if (dueOn.length > 0 && !isValidDateKey(dueOn)) return '期限は 2026-12-31 の形式で入れてください';
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        scope,
        horizon,
        member_id: scope === 'member' ? memberId : null,
        project_id: scope === 'project' ? projectId : null,
        title: title.trim(),
        metric: metric.trim().length > 0 ? metric.trim() : null,
        target_value: target.length > 0 ? Number(target) : null,
        due_on: dueOn.length > 0 ? dueOn : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PixelFrame style={styles.form}>
      <Text style={styles.label}>何についての目標か</Text>
      <View style={styles.chipRow}>
        {SCOPES.map((s) => (
          <Chip
            key={s}
            label={GOAL_SCOPE_LABEL[s]}
            active={scope === s}
            onPress={() => setScope(s)}
          />
        ))}
      </View>

      {scope === 'member' && (
        <>
          <Text style={styles.label}>誰の目標か</Text>
          <View style={styles.chipRow}>
            {members.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                active={memberId === m.id}
                onPress={() => setMemberId(m.id)}
              />
            ))}
          </View>
        </>
      )}

      {scope === 'project' && (
        <>
          <Text style={styles.label}>どの企画か</Text>
          <View style={styles.chipRow}>
            {projects.length === 0 ? (
              <Text style={styles.empty}>企画がまだありません</Text>
            ) : (
              projects.map((p) => (
                <Chip
                  key={p.id}
                  label={p.title}
                  active={projectId === p.id}
                  onPress={() => setProjectId(p.id)}
                />
              ))
            )}
          </View>
        </>
      )}

      <Text style={styles.label}>いつまでの目標か</Text>
      <View style={styles.chipRow}>
        {GOAL_HORIZON_ORDER.map((h) => (
          <Chip
            key={h}
            label={`${GOAL_HORIZON_LABEL[h]}（${GOAL_HORIZON_HINT[h]}）`}
            active={horizon === h}
            onPress={() => setHorizon(h)}
          />
        ))}
      </View>

      <Text style={styles.label}>目標</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="登録者1000人"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>数えるもの（任意）</Text>
      <TextInput
        style={styles.input}
        value={metric}
        onChangeText={setMetric}
        placeholder="人 / 本 / 枚"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>目標値（任意）</Text>
      <TextInput
        style={styles.input}
        value={target}
        onChangeText={setTarget}
        keyboardType="number-pad"
        placeholder="1000"
        placeholderTextColor={COLORS.textMuted}
      />
      <Text style={styles.hint}>空のままなら数値では測らない目標になります</Text>

      <DateField
        label="期限（任意）"
        value={dueOn}
        onChange={setDueOn}
        placeholder="2026-12-31"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.formActions}>
        <Pressable style={styles.formButton} onPress={onCancel}>
          <Text style={styles.addText}>やめる</Text>
        </Pressable>
        <Pressable
          style={[styles.formButton, styles.formButtonPrimary, submitting && styles.disabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          <Text style={styles.addText}>{submitting ? '登録中…' : '目標を立てる'}</Text>
        </Pressable>
      </View>
    </PixelFrame>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  // **背景を塗らない。** 画面の地に敷いた風景（`components/app-background.tsx`）を
  // 透かすため。塗ると風景が完全に隠れる（実際に本番で踏んだ）
  safeArea: { flex: 1 },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.sm },

  header: { padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  addButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  addText: { fontSize: FONT_SIZE.body },

  section: { marginTop: SPACING.sm },
  sectionHeading: { fontSize: FONT_SIZE.body, marginBottom: SPACING.xs },
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  error: { fontSize: FONT_SIZE.body, color: COLORS.danger },

  form: { padding: SPACING.sm },
  label: { fontSize: FONT_SIZE.body, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  input: {
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    fontSize: FONT_SIZE.body,
  },
  chipRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  chip: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
  },
  chipActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  chipText: { fontSize: FONT_SIZE.body, maxWidth: LAYOUT.sidebarWidth },

  formActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  formButton: {
    flex: 1,
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
  },
  formButtonPrimary: { backgroundColor: COLORS.surfaceSunken },
  disabled: { opacity: 0.5 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  statusTitle: { fontSize: FONT_SIZE.body, flex: 1 },
  statusButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
  },
  statusButtonText: { fontSize: FONT_SIZE.body },
});
