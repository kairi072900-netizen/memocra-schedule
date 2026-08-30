import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { ProjectForm } from '@/components/project-form';
import { StreamForm } from '@/components/stream-form';
import { BORDER_WIDTH, COLORS, FONT_SIZE, SPACING } from '@/constants/theme';
import { createProject, createStream, createTasks, getMembers } from '@/lib/api';
import { dateToKey } from '@/lib/calendar';
import { isValidDateKey, toIsoAt } from '@/lib/date-input';
import { buildTasksFromTemplate, pastDueTasks } from '@/lib/task-template';
import type { Member } from '@/types';

/**
 * ＋タブ。企画（動画1本）と配信予定のどちらかを登録する。
 *
 * 既定は**企画**。工程テンプレートの自動生成が本アプリの中核機能なので、
 * 開いた瞬間にそれが選ばれている状態にする（要件定義書 第5章）。
 *
 * 登録すると本来は全員に通知が飛ぶ（要件定義書 F5/F7）が、通知は P4。
 *
 * 【クエリパラメータ】カレンダーの日付から直接ここへ来られる（`?date=2026-09-05&mode=stream`）。
 * 「＋タブへ行く → 種別を選ぶ → 日付を打つ」の3手を1手に縮めるため。
 * 受け取った日付は**フォームの初期値を作るだけ**で、登録は従来どおり人がボタンを押す。
 */
type Mode = 'project' | 'stream';

/** 既定の時刻。企画の公開は 19:00（ProjectForm の既定と揃える）、配信は 20:00。 */
const DEFAULT_PUBLISH_TIME = '19:00';
const DEFAULT_STREAM_TIME = '20:00';

export default function NewScreen() {
  // params は string | string[] で来ることがあるので、素の string のときだけ採用する
  const params = useLocalSearchParams<{ date?: string; mode?: string }>();
  const presetDate =
    typeof params.date === 'string' && isValidDateKey(params.date) ? params.date : null;

  const [mode, setMode] = useState<Mode>(params.mode === 'stream' ? 'stream' : 'project');
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 締切が過去日になった工程の警告（要件定義書 F2）。登録は止めない。 */
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setMembers(null);
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>新規登録</Text>
          <View style={styles.modeRow}>
            <ModeButton
              label="企画（動画1本）"
              active={mode === 'project'}
              onPress={() => setMode('project')}
            />
            <ModeButton
              label="配信予定"
              active={mode === 'stream'}
              onPress={() => setMode('stream')}
            />
          </View>
        </PixelFrame>

        {warning && <Text style={styles.warning}>{warning}</Text>}

        {error ? (
          <ErrorView message={error} onRetry={load} />
        ) : !members ? (
          <LoadingView label="読み込み中…" />
        ) : mode === 'project' ? (
          <ProjectForm
            initial={
              presetDate
                ? {
                    title: '',
                    kind: 'long',
                    publish_at: toIsoAt(presetDate, DEFAULT_PUBLISH_TIME),
                    shoot_at: null,
                    memo: null,
                  }
                : undefined
            }
            submitLabel="企画を登録する"
            offerTemplate
            onSubmit={async (input, applyTemplate) => {
              const project = await createProject(input);

              if (applyTemplate && input.publish_at) {
                const rows = buildTasksFromTemplate({
                  projectId: project.id,
                  kind: input.kind,
                  publishAt: input.publish_at,
                  members,
                });
                await createTasks(rows);

                // 「公開まで3日しかないのに-14日の工程がある」を気づかせる（要件定義書 F2）
                const past = pastDueTasks(rows, dateToKey(new Date()));
                if (past.length > 0) {
                  setWarning(
                    `${past.length}件の工程は締切が既に過ぎています（${past
                      .map((t) => t.title)
                      .join('・')}）。詳細画面で締切を直せます。`,
                  );
                }
              }
              router.replace({ pathname: '/project/[id]', params: { id: project.id } });
            }}
          />
        ) : (
          <StreamForm
            initial={
              presetDate
                ? {
                    title: '',
                    starts_at: toIsoAt(presetDate, DEFAULT_STREAM_TIME),
                    duration_min: 60,
                    platform: 'youtube',
                    memo: null,
                  }
                : undefined
            }
            members={members}
            submitLabel="配信を登録する"
            onSubmit={async (input) => {
              const stream = await createStream(input);
              router.replace({ pathname: '/stream/[id]', params: { id: stream.id } });
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Text style={styles.modeText}>{label}</Text>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingBottom: SPACING.xxl },
  header: { margin: SPACING.sm, padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title, marginBottom: SPACING.sm },
  modeRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', justifyContent: 'center' },
  modeButton: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  modeButtonActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  modeText: { fontSize: FONT_SIZE.body },
  warning: {
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    padding: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
});
