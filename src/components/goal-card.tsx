import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { MemberAvatar } from '@/components/pixel/icon';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';
import {
  daysUntilDue,
  GOAL_HORIZON_LABEL,
  GOAL_SCOPE_LABEL,
  GOAL_STATUS_LABEL,
  isReached,
  progressOf,
} from '@/lib/goal';
import type { Goal, Member, Project } from '@/types';

/**
 * 目標1件のカード。**表示専用。データの取得元を知らない**（CLAUDE.md §4）。
 *
 * 進捗バーは負荷グラフ（`workload-summary.tsx`）と同じ作法で、
 * ライブラリを使わず**角丸なしの硬い矩形**を並べて描く（§3.1）。
 *
 * **色だけで意味を伝えない**（§3.4）。
 * 「短期／中長期」の言葉、`3 / 10` の数字、期限までの日数を必ず併記する。
 * バーの色は状態を補強するだけで、それ単独では何も意味しない。
 *
 * 進捗は手入力。`onAdjust` を渡すと ＋／− のボタンが出る
 * （YouTube からの自動取得は要件定義書 v2 の項目。ここではやらない）。
 */
export function GoalCard({
  goal,
  member,
  project,
  todayKey,
  onAdjust,
  onPress,
}: {
  goal: Goal;
  /** `scope: 'member'` のとき、誰の目標かを出すために渡す。 */
  member?: Member;
  /** `scope: 'project'` のとき、どの企画かを出すために渡す。 */
  project?: Project;
  todayKey: string;
  /** 現在値を変える。渡さなければ読み取り専用のカードになる。 */
  onAdjust?: (delta: number) => void;
  onPress?: () => void;
}) {
  const progress = progressOf(goal);
  const reached = isReached(goal);
  const days = daysUntilDue(goal, todayKey);

  // 期限切れは色ではなく言葉で出す（§3.4）。バーの色は達成/進行中の2値だけ
  const overdue = goal.status === 'active' && days !== null && days < 0;

  return (
    <Pressable
      style={[styles.card, goal.status !== 'active' && styles.cardDone]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.top}>
        <Text style={styles.badge}>{GOAL_HORIZON_LABEL[goal.horizon]}</Text>
        <Text style={styles.scope}>{GOAL_SCOPE_LABEL[goal.scope]}</Text>
        {member && (
          <View style={styles.owner}>
            <MemberAvatar member={member} size={LAYOUT.avatarSizeSmall} />
            <Text style={styles.ownerName} numberOfLines={1}>
              {member.name}
            </Text>
          </View>
        )}
        {goal.status !== 'active' && (
          <Text style={styles.statusLabel}>{GOAL_STATUS_LABEL[goal.status]}</Text>
        )}
      </View>

      <Text style={styles.title}>{goal.title}</Text>
      {project && (
        <Text style={styles.meta} numberOfLines={1}>
          企画: {project.title}
        </Text>
      )}

      {progress === null ? (
        // 数値で測らない目標。バーを出すとゼロ進捗に見えるので出さない
        <Text style={styles.meta}>数値では測らない目標</Text>
      ) : (
        <>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: reached ? COLORS.grass : COLORS.exp,
                },
              ]}
            />
          </View>
          {/* 数字を必ず併記する。バーの長さと色だけで読ませない（§3.4） */}
          <Text style={styles.numbers}>
            {reached && '✓ '}
            {goal.current_value} / {goal.target_value}
            {goal.metric ? ` ${goal.metric}` : ''}
          </Text>
        </>
      )}

      {/* 残り日数は進行中のときだけ出す。終わった目標に「30日超過」と出ても意味が無い */}
      <Text style={[styles.meta, overdue && styles.overdue]}>
        {goal.due_on === null
          ? '期限なし'
          : days === null || goal.status !== 'active'
            ? goal.due_on
            : days < 0
              ? `${goal.due_on}（${-days}日超過）`
              : days === 0
                ? `${goal.due_on}（今日まで）`
                : `${goal.due_on}（あと${days}日）`}
      </Text>

      {/* 目標値が無い目標は数を増やしても意味を持たないので、±を出さない
          （終わったかどうかは目標画面で「達成」に変えて示す） */}
      {onAdjust && goal.status === 'active' && progress !== null && (
        <View style={styles.adjustRow}>
          <AdjustButton label="−1" onPress={() => onAdjust(-1)} />
          <AdjustButton label="＋1" onPress={() => onAdjust(1)} />
          <AdjustButton label="＋10" onPress={() => onAdjust(10)} />
        </View>
      )}
    </Pressable>
  );
}

function AdjustButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.adjustButton} onPress={onPress}>
      <Text style={styles.adjustText}>{label}</Text>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  card: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  /** 達成・やめた目標は地を沈めて、進行中との差を出す */
  cardDone: { backgroundColor: COLORS.surfaceSunken },

  top: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' },
  /** 「短期 / 中長期」。この機能でいちばん大事な区別なので枠で囲って目立たせる */
  badge: {
    fontSize: FONT_SIZE.body,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingHorizontal: SPACING.xs,
  },
  scope: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  owner: { flexDirection: 'row', alignItems: 'center', gap: BORDER_WIDTH.normal },
  ownerName: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  statusLabel: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  title: { fontSize: FONT_SIZE.body, marginTop: SPACING.xs },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: BORDER_WIDTH.normal },
  overdue: { color: COLORS.danger },

  barTrack: {
    height: SPACING.md,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameLight,
    backgroundColor: COLORS.background,
    marginTop: SPACING.xs,
  },
  /** 角丸なし・グラデーションなしの硬い矩形（負荷グラフと同じ） */
  barFill: { height: '100%' },
  numbers: { fontSize: FONT_SIZE.body, marginTop: BORDER_WIDTH.normal },

  adjustRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  adjustButton: {
    minHeight: LAYOUT.minTapSize,
    minWidth: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
  },
  adjustText: { fontSize: FONT_SIZE.body },
});
