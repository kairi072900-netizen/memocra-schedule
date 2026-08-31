import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, LONG_TEXT, SPACING } from '@/constants/theme';
import { buildMinutes } from '@/lib/ai';
import {
  createMeeting,
  createTasks,
  deleteMeeting,
  getMeetings,
  getProjects,
  uploadMeetingAudio,
} from '@/lib/api';
import { dateToKey } from '@/lib/calendar';
import type { Meeting, Project } from '@/types';

/**
 * 議事録。**手元で録音したファイルを投げると、文字起こし・要約・決定事項・ToDo を作る。**
 *
 * 【アプリの中で録音しない】iPhone Safari の録音はマイク許可や長時間録音の中断など
 * 踏む問題が多く、既存のボイスメモで足りる（2026-08-30 のユーザー判断）。
 * ここは「ファイルを受け取る」ところから始める。
 *
 * 【ToDo を自動でタスクにしない】抽出結果は候補として並べるだけで、
 * `tasks` に入れるのは人が選んだものだけ。担当と締切を人が確定させることが
 * このアプリの目的そのもの（CLAUDE.md §1）。
 *
 * 【要件定義書との関係】第7章に `meetings（v2）` として定義がある。
 * 会議モード本体（P7）はまだで、ここは議事録だけを先に作った形。
 */
export default function MeetingsScreen() {
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getMeetings()
      .then(setMeetings)
      .catch((e: Error) => setError(e.message));
    getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useFocusEffect(load);

  if (error && !meetings) return <ErrorView message={error} onRetry={load} />;
  if (!meetings) return <LoadingView label="読み込み中…" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>議事録</Text>
        </PixelFrame>

        <Composer
          todayKey={todayKey}
          onCreated={(m) => setMeetings((list) => [m, ...(list ?? [])])}
        />

        {meetings.length === 0 ? (
          <Text style={styles.hint}>まだ議事録がありません</Text>
        ) : (
          meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              projects={projects}
              onDeleted={() => setMeetings((list) => (list ?? []).filter((x) => x.id !== m.id))}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 新しい議事録を作る。音声ファイルか、文字起こし済みのテキストのどちらかを渡す。
 *
 * ファイル選択は **web の `<input type="file">` だけ**にしてある。
 * ネイティブでは `expo-document-picker` が要るが、当面 web 先行のため
 * 依存を増やさない（CLAUDE.md §7.1）。ネイティブではテキスト貼り付けを使う。
 */
function Composer({
  todayKey,
  onCreated,
}: {
  todayKey: string;
  onCreated: (meeting: Meeting) => void;
}) {
  const [transcript, setTranscript] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!file && transcript.trim().length === 0) {
      setError('録音ファイルか、文字起こしのテキストを入れてください');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let audioPath: string | undefined;
      if (file) {
        setStep('音声をアップロード中…');
        audioPath = await uploadMeetingAudio(file);
      }

      setStep('AIが議事録を作成中…');
      const result = await buildMinutes(
        audioPath ? { audioPath } : { transcript: transcript.trim() },
      );

      setStep('保存中…');
      const saved = await createMeeting({
        title: result.title ?? `${todayKey} の会議`,
        held_on: todayKey,
        transcript: result.transcript ?? (transcript.trim() || null),
        minutes: result.minutes,
        decisions: result.decisions,
        todos: result.todos,
        audio_path: audioPath ?? null,
      });
      onCreated(saved);
      setTranscript('');
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '議事録を作れませんでした');
    } finally {
      setBusy(false);
      setStep(null);
    }
  };

  return (
    <PixelFrame style={styles.card}>
      <Text style={styles.sectionTitle}>会議の記録から作る</Text>
      <Text style={styles.hint}>
        iPhoneのボイスメモなどで録音したファイルを選ぶか、
        文字起こし済みのテキストを貼ってください。アプリの中では録音しません。
      </Text>

      {Platform.OS === 'web' ? (
        <View style={styles.fileRow}>
          {/* react-native-web では素の input がそのまま使える。
              ネイティブ向けのファイル選択ライブラリは入れない（web 先行。§7.1） */}
          <input
            type="file"
            accept="audio/*"
            onChange={(e: { target: { files: FileList | null } }) =>
              setFile(e.target.files?.[0] ?? null)
            }
          />
        </View>
      ) : (
        <Text style={styles.hint}>
          （ファイルの選択はブラウザ版のみ。アプリ版では下に文字起こしを貼ってください）
        </Text>
      )}

      <Text style={styles.label}>文字起こし（音声を選んだ場合は不要）</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={transcript}
        onChangeText={setTranscript}
        placeholder="会議の内容を貼り付け"
        placeholderTextColor={COLORS.textMuted}
        multiline
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {step && <Text style={styles.hint}>{step}</Text>}

      <Pressable
        style={[styles.button, busy && styles.disabled]}
        onPress={() => void run()}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? '作成中…' : '議事録を作る'}</Text>
      </Pressable>
    </PixelFrame>
  );
}

function MeetingCard({
  meeting,
  projects,
  onDeleted,
}: {
  meeting: Meeting;
  projects: Project[];
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * 抽出された ToDo を工程タスクにする。
   *
   * **担当と締切は入れない。** AI が推測した担当を入れると、
   * 「誰も決めていない」ことが見えなくなり成功指標を測れなくなる（CLAUDE.md §1）。
   * 未割当のまま作り、担当は工程一覧で人が決める。
   */
  const toTask = async (todo: string, projectId: string) => {
    setBusy(true);
    try {
      await createTasks([
        {
          project_id: projectId,
          kind: 'planning',
          title: todo,
          assignee_id: null,
          due_at: null,
          status: 'todo',
          blocked_reason: null,
          sort_order: 999,
          done_at: null,
        },
      ]);
      setNote(`「${todo}」を工程に追加しました（担当は未定です）`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : '追加に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PixelFrame style={styles.card}>
      <Pressable style={styles.cardTop} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {meeting.title || meeting.held_on}
        </Text>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      <Text style={styles.meta}>{meeting.held_on}</Text>

      {meeting.minutes && <Text style={styles.longText}>{meeting.minutes}</Text>}

      {meeting.decisions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>決まったこと</Text>
          {meeting.decisions.map((d, i) => (
            <Text key={i} style={styles.longText}>
              ・{d}
            </Text>
          ))}
        </>
      )}

      {meeting.todos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>やること（候補）</Text>
          <Text style={styles.hint}>
            工程にするものだけ選んでください。担当は未定のまま作られます。
          </Text>
          {meeting.todos.map((t, i) => (
            <View key={i} style={styles.todoRow}>
              <Text style={styles.longText}>・{t}</Text>
              <View style={styles.chipRow}>
                {projects.length === 0 ? (
                  <Text style={styles.hint}>企画がまだありません</Text>
                ) : (
                  projects.slice(0, 4).map((p) => (
                    <Pressable
                      key={p.id}
                      style={[styles.chip, busy && styles.disabled]}
                      onPress={() => void toTask(t, p.id)}
                      disabled={busy}
                    >
                      <Text style={styles.buttonText} numberOfLines={1}>
                        ＋ {p.title}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          ))}
        </>
      )}

      {note && <Text style={styles.hint}>{note}</Text>}

      {open && (
        <>
          {meeting.transcript && (
            <>
              <Text style={styles.sectionTitle}>文字起こし</Text>
              <Text style={styles.longText}>{meeting.transcript}</Text>
            </>
          )}
          <Pressable
            style={styles.button}
            onPress={() => {
              void deleteMeeting(meeting.id).then(onDeleted);
            }}
          >
            <Text style={styles.buttonText}>この議事録を削除する</Text>
          </Pressable>
        </>
      )}
    </PixelFrame>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  // **背景を塗らない。** 画面の地に敷いた風景（`components/app-background.tsx`）を
  // 透かすため。塗ると風景が完全に隠れる（実際に本番で踏んだ）
  safeArea: { flex: 1 },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  header: { padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  card: { padding: SPACING.md },
  cardTop: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  chevron: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  sectionTitle: { fontSize: FONT_SIZE.body, marginTop: SPACING.md, marginBottom: SPACING.xs },
  /** 議事録は長文なのでゴシック（§3.1 の長文の例外） */
  longText: { ...LONG_TEXT, color: COLORS.text },
  hint: { ...LONG_TEXT, color: COLORS.textMuted, marginTop: SPACING.xs },
  error: { ...LONG_TEXT, color: COLORS.danger, marginTop: SPACING.sm },

  fileRow: { marginTop: SPACING.sm },
  label: { fontSize: FONT_SIZE.body, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.body,
  },
  textarea: { minHeight: SPACING.xxl * 3, textAlignVertical: 'top' },

  todoRow: { marginTop: SPACING.sm },
  chipRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap', marginTop: SPACING.xs },
  chip: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    maxWidth: LAYOUT.sidebarWidth,
  },

  button: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  buttonText: { fontSize: FONT_SIZE.body },
  disabled: { opacity: 0.5 },
});
