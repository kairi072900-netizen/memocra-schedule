import { Image, Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { MemberAvatar } from '@/components/pixel/icon';
import { COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';
import { avatarSource } from '@/constants/avatars';
import type { Member } from '@/types';

/**
 * メンバーのアイコン。**アプリ内のメンバー表示はこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前はメンバーの表し方が5通りあった:
 *   アバター＋名前（大） / アバター＋名前（小） / アバターのみ /
 *   名前のみ / **単色の四角**（`stream/[id].tsx`）。
 *
 * 【画像とドット絵の2段構え】
 *   `member.avatar_url` にキーが入っていればその画像を出す（本人のスキンの顔）。
 *   入っていなければ従来のドット絵アバター（`MemberAvatar`）にフォールバックする。
 *   **どちらでも同じ場所・同じ大きさで出る**ので、設定済みの人と未設定の人が
 *   混ざっても並びが崩れない。
 *
 * 【ドット感を保つ】拡大時に平滑化されるとピクセルアートが台無しになる（§3.1）。
 * web では `imageRendering: 'pixelated'` を当てる。ネイティブは `Image` の
 * 既定が平滑化なので、将来ネイティブへ広げるときは表示サイズちょうどの
 * 解像度で書き出すこと。
 */
export function Avatar({
  member,
  size = 'md',
}: {
  member: Member;
  /** sm=12px（行に混ぜる） / md=24px（カードの見出し） / lg=48px（自分のカード）。 */
  size?: 'sm' | 'md' | 'lg';
}) {
  const px = size === 'sm' ? LAYOUT.avatarSizeSmall : size === 'lg' ? LAYOUT.avatarSizeLarge : LAYOUT.avatarSize;
  const source = avatarSource(member.avatar_url);

  if (source) {
    return (
      <Image
        source={source}
        style={[
          styles.image,
          { width: px, height: px },
          // 拡大しても平滑化させない。web でのみ効く指定
          Platform.OS === 'web' && styles.pixelated,
        ]}
        accessibilityLabel={member.name}
      />
    );
  }
  return <MemberAvatar member={member} size={px} />;
}

/**
 * アバター＋名前。**色だけで人を判別させない**ための組（§3.4）。
 *
 * アイコンだけを並べてよいのは、同じ画面のすぐ近くに名前が出ている場合だけ
 * （カレンダーのチップの中など）。それ以外はこれを使う。
 */
export function MemberChip({
  member,
  size = 'sm',
  /** 名前の右に出す補足（役割・件数など）。 */
  meta,
}: {
  member: Member;
  size?: 'sm' | 'md' | 'lg';
  meta?: string;
}) {
  return (
    <View style={styles.chip}>
      <Avatar member={member} size={size} />
      <Text style={styles.name} numberOfLines={1}>
        {member.name}
      </Text>
      {meta !== undefined && <Text style={styles.meta}>{meta}</Text>}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  image: { resizeMode: 'contain' },
  /** ピクセルアートを拡大してもぼかさない（web のみ効く） */
  pixelated: { imageRendering: 'pixelated' } as object,
  chip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexShrink: 1 },
  name: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
});
