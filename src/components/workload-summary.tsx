import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Avatar } from '@/components/ui/avatar';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  SPACING,
  WORKLOAD,
} from '@/constants/theme';
import { formatShare, type MemberWorkload, OVERLOAD_THRESHOLD } from '@/lib/workload';

/**
 * メンバー別の負荷を横棒グラフで出す（要件定義書 F4 / S5）。
 * **表示専用。データの取得元も集計も知らない**（CLAUDE.md §4）。
 *
 * グラフはライブラリを使わず、**角丸なしの硬い矩形**を並べて作る（§3.1）。
 *
 * **色だけで警告しない**（§3.4）。負荷が集中している行は、
 * バーの色に加えて ⚠ と「全体の57%」という数値の言葉を必ず併記する。
 */
export function WorkloadSummary({
  workloads,
  unassigned,
  /** カレンダー下のパネル用。上位3人だけ出して縦を詰める。 */
  compact = false,
}: {
  workloads: MemberWorkload[];
  unassigned: number;
  compact?: boolean;
}) {
  // 未完了0件の人まで並べると、始めたばかりの時期にほぼ空のバーが並ぶ
  const shown = compact ? workloads.filter((w) => w.openCount > 0).slice(0, 3) : workloads;
  const max = Math.max(1, ...workloads.map((w) => w.openCount));
  const overloaded = workloads.filter(
    (w) => w.share >= OVERLOAD_THRESHOLD && w.openCount > 0,
  );
  // 担当が1人しかいないうちは「集中」ではないので警告しない（lib/workload.ts と同じ判断）
  const showWarning = overloaded.length > 0 && workloads.filter((w) => w.openCount > 0).length >= 2;

  if (workloads.every((w) => w.openCount === 0) && unassigned === 0) {
    return <Text style={styles.empty}>未完了のタスクはありません</Text>;
  }

  return (
    <View>
      {shown.map((w) => {
        const isOver = showWarning && w.share >= OVERLOAD_THRESHOLD;
        const token = isOver ? WORKLOAD.overloaded : WORKLOAD.normal;
        return (
          <View key={w.member.id} style={styles.row}>
            <View style={styles.labelRow}>
              <Avatar member={w.member} size="sm" />
              <Text style={styles.name} numberOfLines={1}>
                {w.member.name}
              </Text>
              <Text style={styles.count}>
                {isOver && `${token.symbol} `}
                {w.openCount}件
              </Text>
            </View>

            {/* バーは**常にメンバーの識別色**（モックアップ）。誰の分かが一目で分かる。
                集中していても色は変えない — 変えると「色＝その人」という対応が崩れ、
                誰のバーか読めなくなる。**警告は ⚠ と「全体の57%」という言葉で出す**（§3.4） */}
            <ProgressBar value={w.openCount / max} color={w.member.color} />

            {/* 数値の言葉を必ず添える。色だけで意味を伝えない（§3.4） */}
            <Text style={styles.detail}>
              全体の{formatShare(w.share)}・7日以内の締切 {w.dueSoonCount}件
            </Text>
          </View>
        );
      })}

      {showWarning && (
        <Text style={styles.warning}>
          {WORKLOAD.overloaded.symbol}{' '}
          {overloaded.map((w) => w.member.name).join('・')}に負荷が集中しています（
          {overloaded.map((w) => formatShare(w.share)).join('・')}）
        </Text>
      )}

      {/* 誰の負荷でもないが、いちばん大きな問題（成功指標「未割当0件/週」。CLAUDE.md §1） */}
      {unassigned > 0 && (
        <Text style={styles.unassigned}>担当が未定のタスクが {unassigned} 件あります</Text>
      )}

      {compact && workloads.filter((w) => w.openCount > 0).length > shown.length && (
        <Text style={styles.more}>ほか {workloads.filter((w) => w.openCount > 0).length - shown.length} 人</Text>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  empty: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  row: { marginBottom: SPACING.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  name: { fontSize: FONT_SIZE.body, flexShrink: 1, flexGrow: 1 },
  count: { fontSize: FONT_SIZE.body },
  detail: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: BORDER_WIDTH.normal },
  warning: { fontSize: FONT_SIZE.body, marginTop: SPACING.xs },
  unassigned: { fontSize: FONT_SIZE.body, color: COLORS.danger, marginTop: SPACING.xs },
  more: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
});
