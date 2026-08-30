import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { MemberAvatar } from '@/components/pixel/icon';
import { PixelFrame } from '@/components/pixel/frame';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_FAMILY,
  FONT_SIZE,
  LAYOUT,
  SPACING,
} from '@/constants/theme';
import { getGoals, getMembers, getTasks, updateMyMember } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { activeGoals, goalsOfMember } from '@/lib/goal';
import { doneTaskCount, levelOf } from '@/lib/level';
import { TASK_TEMPLATES } from '@/lib/task-template';
import type { Goal, Member, Task } from '@/types';

/**
 * S6 メンバー。4人の役割・活動時間帯を見て、**自分の行だけ**編集する。
 *
 * 【なぜ自分の行だけなのか】
 * RLS の `members_update_self`（`supabase/migrations/0003_rls.sql`）が
 * `id = auth.uid()` で縛っているため、他人の行は更新できない。
 * 制限というより「各自が自分の情報に責任を持つ」という設計。
 * これで Supabase の管理画面を開かずに役割を設定できる。
 *
 * 役割（`role`）は工程テンプレートの標準担当と突き合わせる文字列なので、
 * テンプレートで使われている値を候補として並べ、手入力の揺れを防ぐ。
 */

/** テンプレートが標準担当として参照している role を集めて候補にする（重複は除く）。 */
const ROLE_SUGGESTIONS = Array.from(
  new Set(
    Object.values(TASK_TEMPLATES)
      .flatMap((t) => t.steps.map((s) => s.defaultRole))
      .filter((r): r is string => r !== null),
  ),
);

/** メンバー識別色の候補。予定種別の4色と同じ並びで、アイコンと必ずセットで使う（§3.4）。 */
const COLOR_SUGGESTIONS = ['#2F6FB5', '#3F8F45', '#C7332B', '#D9A407', '#7B3FA0', '#7A7A7A'];

export default function MembersScreen() {
  const { session } = useSession();
  const myId = session?.user.id ?? null;

  const [members, setMembers] = useState<Member[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getGoals()
      .then(setGoals)
      .catch((e: Error) => setError(e.message));
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
    getTasks()
      .then(setTasks)
      .catch((e: Error) => setError(e.message));
  }, []);

  useFocusEffect(load);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>メンバー</Text>
        </PixelFrame>

        {error && <ErrorView message={error} onRetry={load} />}

        {!members || !tasks || !goals ? (
          !error && <LoadingView label="読み込み中…" />
        ) : members.length === 0 ? (
          <Text style={styles.hint}>メンバーが取得できませんでした。再読み込みしてください。</Text>
        ) : (
          members.map((m) =>
            m.id === myId ? (
              <MyProfile key={m.id} member={m} tasks={tasks} goals={goals} onSaved={load} />
            ) : (
              <OtherMember key={m.id} member={m} tasks={tasks} goals={goals} />
            ),
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** 自分の行。編集できる。 */
function MyProfile({
  member,
  tasks,
  goals,
  onSaved,
}: {
  member: Member;
  tasks: Task[];
  goals: Goal[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [color, setColor] = useState(member.color);
  const [activeHours, setActiveHours] = useState(member.active_hours ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const level = levelOf(doneTaskCount(tasks, member.id));
  // 表示中の値でプレビューする。保存前でも色の見え方が分かる
  const preview: Member = { ...member, color };

  const save = async () => {
    if (name.trim().length === 0) {
      setSaveError('名前を入れてください');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await updateMyMember({
        name: name.trim(),
        role: role.trim(),
        color,
        active_hours: activeHours.trim().length > 0 ? activeHours.trim() : null,
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PixelFrame style={styles.card}>
      <View style={styles.cardTop}>
        <MemberAvatar member={preview} size={LAYOUT.avatarSize} />
        <Text style={styles.cardName}>{name || '（名前未設定）'}</Text>
        <Text style={styles.badge}>自分</Text>
      </View>
      <Text style={styles.level}>
        Lv.{level.level}　{level.expInLevel}/{level.expForNext} EXP（完了 {level.exp / 10} 件）
      </Text>
      {/* Lv とは別物。Lv は完了数だけで増える加点型、目標は未達がありうる（CLAUDE.md §2） */}
      <GoalLine goals={goals} memberId={member.id} />

      <Text style={styles.label}>名前</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>役割</Text>
      <TextInput
        value={role}
        onChangeText={setRole}
        placeholder="企画 など"
        placeholderTextColor={COLORS.textMuted}
        style={styles.input}
      />
      {/* テンプレートの標準担当と一致させたいので、使われている値を候補で出す */}
      <View style={styles.chipRow}>
        {ROLE_SUGGESTIONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={[styles.chip, role === r && styles.chipActive]}
          >
            <Text style={styles.chipText}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        役割を入れると、企画を作ったときにその工程の担当へ自動で入ります
      </Text>

      <Text style={styles.label}>識別色</Text>
      <View style={styles.chipRow}>
        {COLOR_SUGGESTIONS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorChip, { backgroundColor: c }, color === c && styles.colorChipActive]}
          >
            {color === c && <Text style={styles.colorCheck}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>活動時間帯</Text>
      <TextInput
        value={activeHours}
        onChangeText={setActiveHours}
        placeholder="平日20時以降 など"
        placeholderTextColor={COLORS.textMuted}
        style={styles.input}
      />
      <Text style={styles.hint}>配信を登録するときに参考として表示されます</Text>

      {saveError && <Text style={styles.error}>{saveError}</Text>}

      <View style={styles.actions}>
        <Pressable
          disabled={saving}
          onPress={save}
          style={[styles.saveButton, saving && styles.disabled]}
        >
          <Text style={styles.buttonText}>{saving ? '保存中…' : '保存する'}</Text>
        </Pressable>
        {saved && !saving && <Text style={styles.savedNote}>保存しました</Text>}
      </View>
    </PixelFrame>
  );
}

/** 他の人の行。読み取り専用（RLSで更新できない）。 */
function OtherMember({
  member,
  tasks,
  goals,
}: {
  member: Member;
  tasks: Task[];
  goals: Goal[];
}) {
  const level = levelOf(doneTaskCount(tasks, member.id));
  return (
    <PixelFrame style={styles.card}>
      <View style={styles.cardTop}>
        <MemberAvatar member={member} size={LAYOUT.avatarSize} />
        <Text style={styles.cardName}>{member.name}</Text>
      </View>
      <Text style={styles.level}>
        Lv.{level.level}　完了 {level.exp / 10} 件
      </Text>
      <GoalLine goals={goals} memberId={member.id} />
      <Text style={styles.readonly}>役割: {member.role.length > 0 ? member.role : '未設定'}</Text>
      <Text style={styles.readonly}>活動時間帯: {member.active_hours ?? '未登録'}</Text>
      <Text style={styles.hint}>他の人の情報は本人だけが変更できます</Text>
    </PixelFrame>
  );
}

/**
 * その人の進行中の目標を1行で出す。詳細と編集は目標画面（`/goals`）で行う。
 * ここに一覧を丸ごと置くと、メンバー画面が「誰がいるか」を見る画面でなくなるため。
 */
function GoalLine({ goals, memberId }: { goals: Goal[]; memberId: string }) {
  const mine = activeGoals(goalsOfMember(goals, memberId));
  if (mine.length === 0) return null;
  return (
    <Text style={styles.readonly} numberOfLines={2}>
      目標: {mine.map((g) => g.title).join('・')}
    </Text>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  header: { padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },

  card: { padding: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardName: { fontSize: FONT_SIZE.body, flexGrow: 1, flexShrink: 1 },
  badge: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textOnDark,
    backgroundColor: COLORS.frameLight,
    paddingHorizontal: SPACING.xs,
  },
  level: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  readonly: { fontSize: FONT_SIZE.body, marginTop: SPACING.xs },

  label: { fontSize: FONT_SIZE.body, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
  },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },

  chipRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap', marginTop: SPACING.xs },
  chip: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  chipActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  chipText: { fontSize: FONT_SIZE.body },
  colorChip: {
    minHeight: LAYOUT.minTapSize,
    width: LAYOUT.badgeSize,
    height: LAYOUT.badgeSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipActive: { borderColor: COLORS.text, borderWidth: BORDER_WIDTH.thick },
  colorCheck: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },

  error: { fontSize: FONT_SIZE.body, color: COLORS.danger, marginTop: SPACING.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  saveButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: FONT_SIZE.body },
  savedNote: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
});
