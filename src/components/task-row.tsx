import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { MemberAvatar } from '@/components/pixel/icon';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_FAMILY,
  FONT_SIZE,
  LAYOUT,
  LONG_TEXT,
  SPACING,
  TASK_STATUS,
  type TaskStatusToken,
} from '@/constants/theme';
import type { TaskPatch } from '@/lib/api';
import { daysUntil } from '@/lib/project-status';
import type { Member, Task } from '@/types';

/**
 * 工程タスク1行。担当とステータスをその場で変えられる（要件定義書 F3 / S3）。
 *
 * **ブロック中は理由が必須**。理由の入力欄を出し、空のままでは保存させない。
 * ここで書かれた理由が金曜会議の議題になる、というのが要件定義書の意図。
 *
 * 担当の変更はメンバーのアバターを並べて選ぶ。未割当にも戻せる
 * （「誰も決めていない」状態を表現できないと、成功指標が測れなくなる。CLAUDE.md §1）。
 */

const STATUSES: TaskStatusToken[] = ['todo', 'doing', 'done', 'blocked'];

export function TaskRow({
  task,
  members,
  todayKey,
  busy,
  onChange,
}: {
  task: Task;
  members: Member[];
  /** 'YYYY-MM-DD'。締切の残日数を出すのに使う。 */
  todayKey: string;
  busy: boolean;
  onChange: (patch: TaskPatch) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState(task.blocked_reason ?? '');
  const [reasonError, setReasonError] = useState(false);

  const status = TASK_STATUS[task.status];
  const assignee = members.find((m) => m.id === task.assignee_id) ?? null;
  const remaining = task.due_at ? daysUntil(task.due_at, todayKey) : null;
  const overdue = remaining !== null && remaining < 0 && task.status !== 'done';

  const changeStatus = (next: TaskStatusToken) => {
    if (next === 'blocked') {
      // 理由が空のまま「ブロック中」にはできない（要件定義書 F3）
      if (reason.trim().length === 0) {
        setReasonError(true);
        setExpanded(true);
        return;
      }
      onChange({ status: 'blocked', blocked_reason: reason.trim() });
      return;
    }
    setReasonError(false);
    onChange({
      status: next,
      blocked_reason: null,
      // 完了にした瞬間を記録する。戻したら消す
      done_at: next === 'done' ? new Date().toISOString() : null,
    });
  };

  return (
    <View style={styles.row}>
      <Pressable style={styles.summary} onPress={() => setExpanded((v) => !v)}>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusSymbol}>{status.symbol}</Text>
        </View>

        <View style={styles.summaryBody}>
          <Text style={[styles.title, task.status === 'done' && styles.titleDone]} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {assignee ? (
              <>
                <MemberAvatar member={assignee} size={LAYOUT.avatarSizeSmall} />
                <Text style={styles.meta}>{assignee.name}</Text>
              </>
            ) : (
              // 未割当は目立たせる。24時間放置で通知の対象になる（要件定義書 F5）
              <Text style={styles.unassigned}>担当が未定</Text>
            )}
            {task.due_at && (
              <Text style={[styles.meta, overdue && styles.overdue]}>
                {task.due_at.slice(5, 10).replace('-', '/')}
                {task.status !== 'done' &&
                  remaining !== null &&
                  (remaining < 0 ? `（${-remaining}日超過）` : `（あと${remaining}日）`)}
              </Text>
            )}
          </View>
          {task.status === 'blocked' && task.blocked_reason && (
            <Text style={styles.reason}>理由: {task.blocked_reason}</Text>
          )}
        </View>

        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>ステータス</Text>
          <View style={styles.chipRow}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                disabled={busy}
                onPress={() => changeStatus(s)}
                style={[styles.chip, task.status === s && styles.chipActive]}
              >
                <Text style={styles.chipText}>
                  {TASK_STATUS[s].symbol} {TASK_STATUS[s].label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.detailLabel}>ブロック理由（ブロック中にするとき必須）</Text>
          <TextInput
            value={reason}
            onChangeText={(t) => {
              setReason(t);
              setReasonError(false);
            }}
            placeholder="素材が届いていない など"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, reasonError && styles.inputError]}
          />
          {reasonError && <Text style={styles.errorText}>理由を入れてください</Text>}

          <Text style={styles.detailLabel}>担当</Text>
          <View style={styles.chipRow}>
            {members.map((m) => (
              <Pressable
                key={m.id}
                disabled={busy}
                onPress={() => onChange({ assignee_id: m.id })}
                style={[styles.chip, task.assignee_id === m.id && styles.chipActive]}
              >
                <MemberAvatar member={m} size={LAYOUT.avatarSizeSmall} />
                <Text style={styles.chipText}>{m.name}</Text>
              </Pressable>
            ))}
            <Pressable
              disabled={busy}
              onPress={() => onChange({ assignee_id: null })}
              style={[styles.chip, task.assignee_id === null && styles.chipActive]}
            >
              <Text style={styles.chipText}>未割当に戻す</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  row: {
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  statusBadge: {
    width: LAYOUT.badgeSize,
    height: LAYOUT.badgeSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  summaryBody: { flex: 1 },
  title: { fontSize: FONT_SIZE.body },
  titleDone: { color: COLORS.textMuted },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    marginTop: BORDER_WIDTH.normal,
  },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  overdue: { color: COLORS.danger },
  unassigned: { fontSize: FONT_SIZE.body, color: COLORS.danger },
  reason: { ...LONG_TEXT, color: COLORS.text, marginTop: BORDER_WIDTH.normal },
  chevron: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  detail: { paddingBottom: SPACING.sm, gap: SPACING.xs },
  detailLabel: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  chipRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  chip: {
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
  input: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
  },
  inputError: { borderColor: COLORS.danger },
  errorText: { fontSize: FONT_SIZE.body, color: COLORS.danger },
});
