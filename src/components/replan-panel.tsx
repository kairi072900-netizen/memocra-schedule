import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, LONG_TEXT, SPACING } from '@/constants/theme';
import { replanProject, type ReplanChange } from '@/lib/ai';
import type { Member, Project, Task } from '@/types';

/**
 * 工程の自動調整（企画詳細に置く）。
 *
 * 【案を出すだけ。適用は人が押す】これがこの部品の全部。
 * 公開日を動かしたときの締切の引き直しや、負荷が偏ったときの担当の振り直しを
 * AI に考えてもらうが、**押されるまで DB は一切変わらない。**
 * 担当と締切を人が確定させることがこのアプリの目的そのもの（CLAUDE.md §1）。
 *
 * 適用前に「どの工程が・何から何に変わるか」を必ず並べる。
 * 変更の中身を見ずに押せる形にしない。
 */
export function ReplanPanel({
  project,
  tasks,
  members,
  todayKey,
  onApply,
}: {
  project: Project;
  tasks: Task[];
  members: Member[];
  todayKey: string;
  /** 人が「適用」を押したときだけ呼ばれる。実際の更新は呼び出し側の責任。 */
  onApply: (changes: ReplanChange[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState('');
  const [result, setResult] = useState<{ reason: string; changes: ReplanChange[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const nameOf = (id: string | null | undefined) =>
    id ? (members.find((m) => m.id === id)?.name ?? '不明') : '未定';
  const taskOf = (id: string) => tasks.find((t) => t.id === id);

  const ask = async () => {
    if (request.trim().length === 0) {
      setError('何を変えたいかを書いてください');
      return;
    }
    setError(null);
    setBusy(true);
    setApplied(false);
    try {
      setResult(
        await replanProject({ project, tasks, members, todayKey, request: request.trim() }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '調整案を作れませんでした');
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!result) return;
    setBusy(true);
    try {
      await onApply(result.changes);
      setApplied(true);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '適用に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={styles.buttonText}>AIに締切・担当の調整を相談する</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>締切・担当の調整</Text>
      <Text style={styles.hint}>
        「公開日を9/20に動かしたい」「編集が1人に寄っているので分けたい」など。
        AIは案を出すだけで、押すまで工程は変わりません。
      </Text>

      <TextInput
        style={styles.input}
        value={request}
        onChangeText={setRequest}
        placeholder="公開日を1週間うしろにずらしたい"
        placeholderTextColor={COLORS.textMuted}
        multiline
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {applied && <Text style={styles.hint}>適用しました。工程一覧を確認してください。</Text>}

      <View style={styles.row}>
        <Pressable style={[styles.button, styles.flex]} onPress={() => setOpen(false)}>
          <Text style={styles.buttonText}>とじる</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.flex, busy && styles.disabled]}
          onPress={() => void ask()}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? '考え中…' : '案をもらう'}</Text>
        </Pressable>
      </View>

      {result && (
        <View style={styles.result}>
          <Text style={styles.longText}>{result.reason}</Text>

          {result.changes.length === 0 ? (
            <Text style={styles.hint}>変えたほうがよい工程はありませんでした。</Text>
          ) : (
            <>
              <Text style={styles.heading}>変わるところ（{result.changes.length}件）</Text>
              {/* 何から何に変わるかを必ず出す。中身を見ずに適用させない */}
              {result.changes.map((c) => {
                const task = taskOf(c.task_id);
                return (
                  <View key={c.task_id} style={styles.change}>
                    <Text style={styles.changeTitle}>{task?.title ?? c.title}</Text>
                    {c.due_at !== undefined && (
                      <Text style={styles.changeLine}>
                        締切: {task?.due_at?.slice(0, 10) ?? 'なし'} → {c.due_at?.slice(0, 10) ?? 'なし'}
                      </Text>
                    )}
                    {c.assignee_id !== undefined && (
                      <Text style={styles.changeLine}>
                        担当: {nameOf(task?.assignee_id)} → {nameOf(c.assignee_id)}
                      </Text>
                    )}
                    {!task && (
                      <Text style={styles.changeLine}>
                        （この工程が見つかりません。適用しても変わりません）
                      </Text>
                    )}
                  </View>
                );
              })}

              <Pressable
                style={[styles.button, styles.primary, busy && styles.disabled]}
                onPress={() => void apply()}
                disabled={busy}
              >
                <Text style={styles.buttonText}>この案を適用する</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  panel: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  heading: { fontSize: FONT_SIZE.body, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  hint: { ...LONG_TEXT, color: COLORS.textMuted, marginTop: SPACING.xs },
  longText: { ...LONG_TEXT, color: COLORS.text },
  error: { ...LONG_TEXT, color: COLORS.danger, marginTop: SPACING.xs },

  input: {
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.body,
    marginTop: SPACING.sm,
  },

  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  flex: { flex: 1 },
  button: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  primary: { backgroundColor: COLORS.surfaceSunken },
  buttonText: { fontSize: FONT_SIZE.body },
  disabled: { opacity: 0.5 },

  result: { marginTop: SPACING.md },
  change: {
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
  },
  changeTitle: { fontSize: FONT_SIZE.body },
  changeLine: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
});
