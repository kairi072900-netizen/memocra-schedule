/**
 * P0のダミーデータ。**P1でSupabaseに差し替えたら、このファイルごと消える。**
 *
 * 画面側はこのファイルの中身を知らず、下部のgetter関数だけを呼ぶこと。
 * そうしておけば、差し替え時に触るのは関数の実装だけで済む。
 *
 * 【メンバー名について】
 * 名前・役割・識別色をここに書くのは意図どおり（CLAUDE.md §3.2）。
 * 禁止しているのは「コンポーネント側に文字列リテラルで書くこと」であって、
 * データ層に置くこと自体は前提の構造。P1では profiles テーブルがこの位置に来る。
 *
 * 【識別色について】
 * theme.ts からは読まない。メンバーごとの色は `Member.color` が持つデータであり、
 * 定数化するとP8のマルチチーム対応で剥がせなくなる（CLAUDE.md §3.2 / §3.4）。
 * 色だけで判別させず、必ずドット絵アイコンと併用すること。
 */

import type { Availability, Member, Project, Stream } from '@/types';

/** メモクラのチーム。P1では auth のユーザーが属する team_id に置き換わる。 */
const TEAM_ID = 'team-memocra';

// ---------------------------------------------------------------------------
// メンバー（要件定義書 第3章 / 12.2）
// ---------------------------------------------------------------------------

const MEMBERS: Member[] = [
  {
    id: 'member-ken',
    team_id: TEAM_ID,
    name: 'けん',
    role: '企画・ロング編集・SNS',
    color: '#2F6FB5', // 青
    avatar_url: null, // ドット絵アイコンは未作成（未決事項5：スキン頭部にするか要確認）
    active_hours: null,
    push_token: null,
  },
  {
    id: 'member-raten',
    team_id: TEAM_ID,
    name: 'らてん',
    role: 'ショート編集',
    color: '#3F8F45', // 緑
    avatar_url: null,
    active_hours: null,
    push_token: null,
  },
  {
    id: 'member-nanba',
    team_id: TEAM_ID,
    name: '南場テル',
    role: '建築・コマンド・投稿後分析',
    color: '#7A7A7A', // 灰
    avatar_url: null,
    active_hours: null,
    push_token: null,
  },
  {
    id: 'member-yuzu',
    team_id: TEAM_ID,
    name: 'ゆず',
    role: 'サムネ・素材撮影',
    color: '#D9A407', // 黄
    avatar_url: null,
    active_hours: '平日20時以降', // 締切設定時に参照する（要件定義書 F7）
    push_token: null,
  },
];

// ---------------------------------------------------------------------------
// プロジェクト（ロング3件 / ショート2件）
// ---------------------------------------------------------------------------

/**
 * カレンダーには `publish_at`（公開予定）と `shoot_at`（撮影予定）の2つが別々の予定として出る。
 * 撮影予定は4件になるよう、5件中4件に `shoot_at` を入れている。
 */
const PROJECTS: Project[] = [
  {
    id: 'project-long-1',
    team_id: TEAM_ID,
    title: '巨大装置づくり企画',
    kind: 'long',
    status: 'published',
    shoot_at: '2026-08-02T13:00:00+09:00',
    publish_at: '2026-08-07T19:00:00+09:00',
    owner_id: 'member-ken',
    memo: null,
    created_at: '2026-07-20T10:00:00+09:00',
  },
  {
    id: 'project-long-2',
    team_id: TEAM_ID,
    title: '4人でサバイバル生活',
    kind: 'long',
    status: 'editing',
    shoot_at: '2026-08-16T13:00:00+09:00',
    publish_at: '2026-08-21T19:00:00+09:00',
    owner_id: 'member-ken',
    memo: '素材が多いので編集の分担を相談する',
    created_at: '2026-08-01T10:00:00+09:00',
  },
  {
    id: 'project-long-3',
    team_id: TEAM_ID,
    title: '街づくり企画 第3回',
    kind: 'long',
    status: 'awaiting_shoot',
    shoot_at: '2026-08-23T13:00:00+09:00',
    publish_at: '2026-08-28T19:00:00+09:00',
    owner_id: 'member-nanba',
    memo: null,
    created_at: '2026-08-10T10:00:00+09:00',
  },
  {
    id: 'project-short-1',
    team_id: TEAM_ID,
    title: '小ネタ集 #12',
    kind: 'short',
    status: 'published',
    shoot_at: '2026-08-09T15:00:00+09:00',
    publish_at: '2026-08-12T18:00:00+09:00',
    owner_id: 'member-raten',
    memo: null,
    created_at: '2026-08-03T10:00:00+09:00',
  },
  {
    id: 'project-short-2',
    team_id: TEAM_ID,
    title: '建築テクニック紹介',
    kind: 'short',
    status: 'planning',
    shoot_at: null, // 撮影日が未定のケース。カレンダーに撮影予定が出ないことの確認用
    publish_at: '2026-08-25T18:00:00+09:00',
    owner_id: 'member-raten',
    memo: null,
    created_at: '2026-08-18T10:00:00+09:00',
  },
];

// ---------------------------------------------------------------------------
// 配信予定（4件）
// ---------------------------------------------------------------------------

const STREAMS: Stream[] = [
  {
    id: 'stream-1',
    team_id: TEAM_ID,
    title: '雑談配信',
    starts_at: '2026-08-05T21:00:00+09:00',
    duration_min: 90,
    platform: 'youtube',
    memo: null,
    created_by: 'member-ken',
  },
  {
    id: 'stream-2',
    team_id: TEAM_ID,
    title: '視聴者参加型サバイバル',
    starts_at: '2026-08-15T20:00:00+09:00',
    duration_min: 120,
    platform: 'youtube',
    memo: null,
    created_by: 'member-ken',
  },
  {
    id: 'stream-3',
    team_id: TEAM_ID,
    title: '建築リクエスト配信',
    starts_at: '2026-08-22T21:00:00+09:00',
    duration_min: 60,
    platform: 'youtube',
    memo: null,
    created_by: 'member-nanba',
  },
  {
    id: 'stream-4',
    team_id: TEAM_ID,
    title: '月末振り返り配信',
    starts_at: '2026-08-29T21:00:00+09:00',
    duration_min: 90,
    platform: 'youtube',
    memo: null,
    created_by: 'member-ken',
  },
];

// ---------------------------------------------------------------------------
// 出欠（4種類の集約ステータスが最低1件ずつ出るようにしている）
// ---------------------------------------------------------------------------

/**
 * 集約ステータスと、それを再現するための回答の組み合わせ:
 *
 *   stream-1 → 全員出席（緑 ○）  … 4人ともyes
 *   stream-2 → 未確定あり（黄 ⚠）… maybeが1人。noと未回答は無し
 *   stream-3 → 欠席あり（赤 ✕）  … noが1人
 *   stream-4 → 未回答あり（灰 ―）… レコードが2件しかない（2人が未回答）
 *
 * 「未回答」はレコードを作らないことで表現する（要件定義書 第7章）。
 * 集約ロジック自体は後で `src/lib/` に純粋関数として置く。
 */
const AVAILABILITIES: Availability[] = [
  // stream-1: 全員出席
  { id: 'av-1-ken',   team_id: TEAM_ID, stream_id: 'stream-1', member_id: 'member-ken',   answer: 'yes', comment: null, answered_at: '2026-08-01T12:00:00+09:00' },
  { id: 'av-1-raten', team_id: TEAM_ID, stream_id: 'stream-1', member_id: 'member-raten', answer: 'yes', comment: null, answered_at: '2026-08-01T13:00:00+09:00' },
  { id: 'av-1-nanba', team_id: TEAM_ID, stream_id: 'stream-1', member_id: 'member-nanba', answer: 'yes', comment: null, answered_at: '2026-08-01T14:00:00+09:00' },
  { id: 'av-1-yuzu',  team_id: TEAM_ID, stream_id: 'stream-1', member_id: 'member-yuzu',  answer: 'yes', comment: null, answered_at: '2026-08-01T21:00:00+09:00' },

  // stream-2: 未確定あり
  { id: 'av-2-ken',   team_id: TEAM_ID, stream_id: 'stream-2', member_id: 'member-ken',   answer: 'yes',   comment: null,                 answered_at: '2026-08-10T12:00:00+09:00' },
  { id: 'av-2-raten', team_id: TEAM_ID, stream_id: 'stream-2', member_id: 'member-raten', answer: 'yes',   comment: null,                 answered_at: '2026-08-10T13:00:00+09:00' },
  { id: 'av-2-nanba', team_id: TEAM_ID, stream_id: 'stream-2', member_id: 'member-nanba', answer: 'yes',   comment: null,                 answered_at: '2026-08-10T14:00:00+09:00' },
  { id: 'av-2-yuzu',  team_id: TEAM_ID, stream_id: 'stream-2', member_id: 'member-yuzu',  answer: 'maybe', comment: '21時からなら出れる', answered_at: '2026-08-10T21:00:00+09:00' },

  // stream-3: 欠席あり
  { id: 'av-3-ken',   team_id: TEAM_ID, stream_id: 'stream-3', member_id: 'member-ken',   answer: 'yes', comment: null,           answered_at: '2026-08-17T12:00:00+09:00' },
  { id: 'av-3-raten', team_id: TEAM_ID, stream_id: 'stream-3', member_id: 'member-raten', answer: 'no',  comment: '当日は外せない用事あり', answered_at: '2026-08-17T13:00:00+09:00' },
  { id: 'av-3-nanba', team_id: TEAM_ID, stream_id: 'stream-3', member_id: 'member-nanba', answer: 'yes', comment: null,           answered_at: '2026-08-17T14:00:00+09:00' },
  { id: 'av-3-yuzu',  team_id: TEAM_ID, stream_id: 'stream-3', member_id: 'member-yuzu',  answer: 'yes', comment: null,           answered_at: '2026-08-17T21:00:00+09:00' },

  // stream-4: 未回答あり（南場テルとゆずのレコードを作らない）
  { id: 'av-4-ken',   team_id: TEAM_ID, stream_id: 'stream-4', member_id: 'member-ken',   answer: 'yes', comment: null, answered_at: '2026-08-20T12:00:00+09:00' },
  { id: 'av-4-raten', team_id: TEAM_ID, stream_id: 'stream-4', member_id: 'member-raten', answer: 'yes', comment: null, answered_at: '2026-08-20T13:00:00+09:00' },
];

// ---------------------------------------------------------------------------
// 取得関数
//
// P1でSupabaseに差し替えるときは、この関数の中身だけを置き換える。
// そのとき戻り値が Promise になり、呼び出し側にloading/error処理が必要になる
// （CLAUDE.md §5.2 の申し送り参照）。
// ---------------------------------------------------------------------------

export function getMembers(): Member[] {
  return MEMBERS;
}

export function getMemberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function getProjects(): Project[] {
  return PROJECTS;
}

export function getStreams(): Stream[] {
  return STREAMS;
}

export function getAvailabilities(): Availability[] {
  return AVAILABILITIES;
}

/** 配信1件ぶんの出欠。未回答のメンバーはレコードが無いので、件数が4未満になりうる。 */
export function getAvailabilitiesByStream(streamId: string): Availability[] {
  return AVAILABILITIES.filter((a) => a.stream_id === streamId);
}
