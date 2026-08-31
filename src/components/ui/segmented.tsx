import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT } from '@/constants/theme';

/**
 * 表示の切り替え（モックアップの［カレンダー｜週表示］）。
 *
 * 【Chip との違い】Chip は「複数の中から選ぶ・絞り込む」ためのもので、
 * 選ばれていない状態もありうる。こちらは**常にどれか1つが選ばれている**
 * 表示モードの切り替えで、区切り線でひと続きに見せる。
 *
 * 選択中は青（`COLORS.primary`）。§3.4 の「青＝選択中・主アクション」に沿う。
 * 色だけに頼らないよう、選択中は文字色も反転させる。
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.item, active && styles.itemActive, i > 0 && styles.divider]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
  },
  item: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  itemActive: { backgroundColor: COLORS.primary },
  /** 区切りは枠と同じ濃さの1本線。ひと続きの部品に見せる */
  divider: { borderLeftWidth: BORDER_WIDTH.normal, borderLeftColor: COLORS.frameDark },
  label: { fontSize: FONT_SIZE.body, color: COLORS.text },
  labelActive: { color: COLORS.textOnDark },
});
