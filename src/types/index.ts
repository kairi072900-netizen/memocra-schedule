/**
 * メモクラ スケジュール管理アプリ / データモデル
 *
 * 要件定義書 v0.4 第7章のテーブル定義をそのままTypeScriptの型にしたもの。
 * P0ではダミーデータがこの型に従い、P1でSupabaseのレスポンス型として同じものを使う。
 *
 * 【共通の約束】
 * - すべての型に `team_id` を持たせる（要件定義書 第10章「汎用化に向けて今からやっておくこと」）。
 *   後から追加するとデータ移行が発生するため、最初から入れる。
 * - 日時はすべてISO 8601文字列（例 "2026-08-21T20:00:00+09:00"）で保持する。
 *   Supabaseの `timestamptz` はJSONではstringで返るため、Dateへの変換は表示直前に行う。
 * - nullable な列は `| null` で表現する。「未設定」と「未取得」を混ぜないため `undefined` は使わない。
 */

/** 全テーブル共通。将来のマルチチーム対応（P8）とRLSの分離単位。 */
export interface TeamScoped {
  team_id: string;
}

// ---------------------------------------------------------------------------
// リテラル型（DBでは text 列。アプリ側で取りうる値を固定する）
// ---------------------------------------------------------------------------

/** プロジェクト種別。要件定義書 F1 の入力項目。 */
export type ProjectKind = 'long' | 'short' | 'sns' | 'other';

/** プロジェクトのステータス。タスクの進捗から自動判定する（要件定義書 F3）。 */
export type ProjectStatus =
  | 'planning'    // 企画中
  | 'awaiting_shoot' // 撮影待ち
  | 'shot'        // 撮影済
  | 'editing'     // 編集中
  | 'awaiting_upload' // 投稿待ち
  | 'published'   // 公開済
  | 'reviewed';   // 振り返り済

/**
 * 工程の種類。要件定義書 第7章 tasks.kind。
 * メモクラ固有の用語（建築・コマンド等）を工程「名」に固定しないこと（第10章）。
 * 表示名はテンプレート側のデータで持ち、この kind は分類のみに使う。
 */
export type TaskKind =
  | 'planning'
  | 'build'
  | 'shoot'
  | 'edit_long'
  | 'edit_short'
  | 'thumbnail'
  | 'upload'
  | 'sns'
  | 'analytics';

/** タスクのステータス。要件定義書 F3。 */
export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';

/** 配信プラットフォーム。 */
export type StreamPlatform = 'youtube' | 'twitch' | 'other';

/**
 * 出欠の回答。要件定義書 F7 の3択。
 * 「未回答」はレコードを作らないことで表現するため、この型には含めない。
 */
export type AvailabilityAnswer = 'yes' | 'maybe' | 'no';

/** 通知の種類。要件定義書 F5 の5種類のみ。自由記述のDMは実装しない。 */
export type NotificationKind =
  | 'availability_request' // 出欠依頼
  | 'assigned'             // 担当割り当て
  | 'due_soon'             // 締切リマインド
  | 'overdue'              // 締切超過
  | 'unassigned';          // 未割当の放置

/** 通知タップ時の遷移先種別。 */
export type NotificationLinkType = 'task' | 'stream' | 'project';

/**
 * 目標のスコープ。要件定義書には無く、ユーザーの要望で足した機能。
 * 対象列（`member_id` / `project_id`）との整合はDBのCHECK制約で保証する（0004_goals.sql）。
 */
export type GoalScope = 'team' | 'member' | 'project';

/** 目標の時間軸。**短期と中長期の2つだけ**にする（増やすと使い分けが曖昧になる）。 */
export type GoalHorizon = 'short' | 'long';

/**
 * 目標の状態。`dropped`（やめた）を持たせているのは、
 * 達成できなかった目標を消さずに残せるようにするため
 * （消すと「何を諦めたか」が振り返れない）。
 */
export type GoalStatus = 'active' | 'achieved' | 'dropped';

// ---------------------------------------------------------------------------
// エンティティ
// ---------------------------------------------------------------------------

/**
 * メンバー。DB上のテーブル名は `profiles`（Supabase Auth と1:1で対応するため）。
 * アプリ側では「プロフィール」より意味が明確な Member という名前で扱う。
 *
 *   profiles.id           -> Member.id           （auth.users.id と同じUUID）
 *   profiles.team_id      -> Member.team_id
 *   profiles.name         -> Member.name
 *   profiles.role         -> Member.role
 *   profiles.color        -> Member.color
 *   profiles.avatar_url   -> Member.avatar_url
 *   profiles.active_hours -> Member.active_hours
 *   profiles.push_token   -> Member.push_token
 *
 * 【重要】メンバー名（けん / らてん / 南場テル / ゆず）をコードに直接書かないこと。
 * 表示名・色・アイコンはすべてこの型のデータから読む（要件定義書 第10章）。
 */
export interface Member extends TeamScoped {
  id: string;
  /** 表示名。コード内にハードコードしない。 */
  name: string;
  /** 役割（企画 / ショート編集 / 建築 / サムネ など）。自由記述。 */
  role: string;
  /** UI上の識別色。色だけで判別させず、必ずアイコンと併用する（要件定義書 12.2 注意1）。 */
  color: string;
  /** アイコン画像URL。Supabase Storageに置き、コードに埋め込まない。 */
  avatar_url: string | null;
  /** 活動可能時間帯（例「平日20時以降」）。締切設定時の参考にする（要件定義書 F7）。 */
  active_hours: string | null;
  /** Expo Notifications のプッシュトークン。P4で使用。 */
  push_token: string | null;
}

/** 動画1本 = 1プロジェクト（要件定義書 第5章）。 */
export interface Project extends TeamScoped {
  id: string;
  title: string;
  kind: ProjectKind;
  status: ProjectStatus;
  /** 撮影予定。カレンダーに「撮影予定（青）」として表示。未定なら null。 */
  shoot_at: string | null;
  /** 公開予定。タスクの締切逆算の基点（要件定義書 F2）。 */
  publish_at: string | null;
  /** 企画責任者。Member.id を参照。 */
  owner_id: string | null;
  memo: string | null;
  created_at: string;
}

/**
 * 工程タスク。テンプレートから自動生成される（要件定義書 F2）。
 *
 * 【team_id について】
 * 要件定義書 第7章の tasks テーブルには team_id が無く、projects 経由で辿る設計だった。
 * 本アプリでは P1 のRLSポリシーで親テーブルへのサブクエリを不要にするため、
 * tasks にも team_id を持たせる方針で確定している（CLAUDE.md「P1への申し送り」参照）。
 */
export interface Task extends TeamScoped {
  id: string;
  /** 所属プロジェクト。Project.id を参照。 */
  project_id: string;
  kind: TaskKind;
  title: string;
  /** 担当者。null = 未割当（24時間放置でリーダーに通知）。Member.id を参照。 */
  assignee_id: string | null;
  due_at: string | null;
  status: TaskStatus;
  /** status が 'blocked' のときは必須（要件定義書 F3）。 */
  blocked_reason: string | null;
  /** プロジェクト内での工程の並び順。 */
  sort_order: number;
  done_at: string | null;
}

/** 配信予定。カレンダーに「配信予定（緑）」として表示。 */
export interface Stream extends TeamScoped {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  platform: StreamPlatform;
  memo: string | null;
  /** 登録者。Member.id を参照。 */
  created_by: string;
}

/**
 * 配信への出欠回答（要件定義書 F7）。
 * DB上は UNIQUE(stream_id, member_id)。未回答のメンバーはレコードが存在しない。
 *
 * 【team_id について】Task と同じ理由で、要件定義書の定義に加えて持たせている。
 */
export interface Availability extends TeamScoped {
  id: string;
  /** Stream.id を参照。 */
  stream_id: string;
  /** Member.id を参照。 */
  member_id: string;
  answer: AvailabilityAnswer;
  /** ひとことコメント（例「21時からなら出れる」）。 */
  comment: string | null;
  answered_at: string;
}

/** お知らせ履歴（要件定義書 F5 / S8）。自動発行される業務通知のみ。 */
export interface Notification extends TeamScoped {
  id: string;
  /** 宛先。Member.id を参照。 */
  recipient_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** タップ時の遷移先。link_type と link_id はセットで使う。 */
  link_type: NotificationLinkType;
  link_id: string;
  /** null = 未読。未読バッジの判定に使う。 */
  read_at: string | null;
  created_at: string;
}

/**
 * 目標（要件定義書には無い。ユーザーの要望で追加）。
 *
 * 【Lv とは別物】`src/lib/level.ts` の加点型レベルには影響させない。
 * レベルは完了タスク数だけで決まり、減る要素を持たない（CLAUDE.md §2）。
 * 目標は「達成できなかった」があり得るので、混ぜると却下したHP案に戻る。
 *
 * 【進捗は手入力】`current_value` は人が更新する。
 * YouTube Data API からの自動取得は要件定義書 v2 の項目なので、ここではやらない。
 */
export interface Goal extends TeamScoped {
  id: string;
  scope: GoalScope;
  horizon: GoalHorizon;
  /** `scope: 'member'` のときだけ入る。Member.id を参照。 */
  member_id: string | null;
  /** `scope: 'project'` のときだけ入る。Project.id を参照。 */
  project_id: string | null;
  title: string;
  /** 「登録者数」「本」など、数える対象の名前。自由記述。 */
  metric: string | null;
  /** 目標値。null なら数値で測らない目標（「編集を覚える」など）。 */
  target_value: number | null;
  current_value: number;
  /** 期限（'YYYY-MM-DD'）。null なら期限なし。 */
  due_on: string | null;
  status: GoalStatus;
  created_at: string;
}
