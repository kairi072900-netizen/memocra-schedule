import type { ImageSourcePropType } from 'react-native';

/**
 * メンバーのアイコン画像（本人のマイクラスキンの顔）。
 *
 * 【メンバー名をここに書かないこと】CLAUDE.md §3.2。
 * **キーは色の名前**にしてある。「どの画像か」はメンバーの `avatar_url` 列に
 * 入っていて、コードは名前を知らない。P8（他のグループへの配布）のときに
 * ここを差し替えるだけで済む。
 *
 * 【画像の置き方】
 *   1. `assets/avatars/` に PNG を置く（透過・正方形・表示サイズちょうどか、
 *      その整数倍。§3.1「拡大時に平滑化される」ため）
 *   2. 下の `SOURCES` にキーと `require` を1行足す
 *   3. メンバー画面の「アイコンを選ぶ」に自動で並ぶ
 *
 * **未登録のうちはドット絵アバター（`pixel/icon.tsx` の `MemberAvatar`）に
 * フォールバックする**ので、画像が無くてもアプリは普通に動く。
 */

/** 選べるアイコンのキー。`members.avatar_url` に入る値。 */
export const AVATAR_KEYS = ['yellow', 'gray', 'blue', 'green'] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

/**
 * キー → 画像。**ファイルを置いたらここに1行足す。**
 *
 * ここが空のあいだは全員ドット絵アバターで表示される。
 * `require` は静的に解決されるので、**存在しないパスを書くとビルドが落ちる**。
 * 必ずファイルを置いてから足すこと。
 */
const SOURCES: Partial<Record<AvatarKey, ImageSourcePropType>> = {
  // yellow: require('@/assets/avatars/yellow.png'),
  // gray:   require('@/assets/avatars/gray.png'),
  // blue:   require('@/assets/avatars/blue.png'),
  // green:  require('@/assets/avatars/green.png'),
};

/** 画像が1枚でも登録されているか。メンバー画面のピッカーの出し分けに使う。 */
export const HAS_AVATAR_IMAGES = Object.keys(SOURCES).length > 0;

function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(value);
}

/**
 * `member.avatar_url` から画像を引く。**未設定・未知のキー・未登録なら null**。
 * 呼び出し側（`ui/avatar.tsx`）は null を見てドット絵に切り替える。
 */
export function avatarSource(avatarUrl: string | null): ImageSourcePropType | null {
  if (!avatarUrl) return null;
  if (!isAvatarKey(avatarUrl)) return null;
  return SOURCES[avatarUrl] ?? null;
}
