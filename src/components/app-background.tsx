import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SceneryGround } from '@/components/pixel/scenery';
import { COLORS, LAYOUT } from '@/constants/theme';

/**
 * アプリ全体の地。空を敷き、下端に風景（丘・木・村・城・草原）を置く。
 *
 * 【なぜスクロールしないのか】要件定義書 12.6 #6 は
 * 「縦スクロールする画面に風景を敷くと破綻する」と警告している。
 * ここは**画面に固定**で、コンテンツだけがその上をスクロールする。
 * 風景自体は動かないので、その破綻は起きない。
 *
 * 【可読性を落とさない】コンテンツは不透明な羊皮紙のパネル（`ui/panel.tsx`）で
 * 覆う。文字が風景の上に直接乗ることはない。
 * **リスト領域そのものに風景を敷いてはいけない**という約束は維持する（§3.1）。
 *
 * 【狭い画面】地面の帯を低くする。iPhone では縦の余裕が無く、
 * 風景に高さを取られるとカレンダーの6行目が押し出される（過去に踏んだ）。
 */
export function AppBackground({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= LAYOUT.tabletMinWidth;
  const groundHeight = wide ? LAYOUT.sceneryGroundHeight : LAYOUT.sceneryGroundHeightCompact;

  return (
    <View style={styles.root}>
      {/* 地。ここだけが色を持ち、上に乗る画面は背景を塗らない */}
      <View style={styles.sky} pointerEvents="none" />
      <View style={styles.groundWrap} pointerEvents="none">
        <SceneryGround width={width} height={groundHeight} />
      </View>
      {/**
       * **広い画面では地面のぶんだけ下を空ける。**
       * 空けないとコンテンツが画面の一番下まで伸びて、風景を完全に覆ってしまう
       * （実際に本番で踏んだ）。モックアップでもサイドバーは草原の上で止まっている。
       *
       * 狭い画面では空けない。下タブは指の届く一番下に置きたいし、
       * iPhone は縦の余裕が無く、風景に高さを取られるとカレンダーが押し出される。
       * スマホでは**パネルの隙間から覗く空**が世界観を担う。
       */}
      <View style={[styles.content, wide && { paddingBottom: groundHeight }]}>{children}</View>
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  /** 空。パネルの隙間から覗く色 */
  sky: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.sky },
  /** 風景は下端に固定。スクロールしない */
  groundWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  content: { flex: 1 },
});
