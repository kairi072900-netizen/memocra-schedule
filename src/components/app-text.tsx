import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { COLORS, FONT_FAMILY, FONT_SIZE } from '@/constants/theme';

/**
 * アプリ全体の既定のテキスト。**`react-native` の `Text` を直接importしないこと。**
 *
 * React Native にはフォントをアプリ全体に一括適用する仕組みが無く、
 * React 19 で関数コンポーネントの `defaultProps` が廃止されたため
 * `Text.defaultProps` によるパッチも効かない。
 * 既定を1箇所に持つには、この薄いラッパーを全画面で使うのが唯一の確実な方法。
 *
 * `style` は後ろにマージされるので、呼び出し側で上書きできる。
 * 長文は `fontFamily: FONT_FAMILY.gothic` に切り替えてよい（CLAUDE.md §3.1）。
 */
export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
  },
});
