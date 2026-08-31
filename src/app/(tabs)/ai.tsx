import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, LONG_TEXT, SPACING } from '@/constants/theme';
import { brainstorm, summarizeProgress, type ProgressSummary } from '@/lib/ai';
import { getMembers, getProjects, getTasks } from '@/lib/api';
import { dateToKey } from '@/lib/calendar';

/**
 * 専用AI。**壁打ち**と**進捗のまとめ**の2つを置く。
 *
 * 【自然文での登録は別の場所】新規登録画面の「文章から作る」にある。
 * 予定を作る流れの中にあったほうが手数が少ないため、ここには置いていない。
 *
 * 【工程の自動調整も別の場所】企画詳細の「締切を引き直す」。
 * どの企画に対する調整かが決まっている場所でないと、案の当てどころが無いため。
 *
 * 【AIが使えなくても他は動く】Edge Function `ai` が未デプロイなら
 * この画面だけがエラーを出す。カレンダーもタスクも通常どおり使える。
 */
export default function AiScreen() {
  const todayKey = useMemo(() => dateToKey(new Date()), []);

  // 壁打ち。発言を古い順に持つだけの単純な履歴
  const [history, setHistory] = useState<{ me: boolean; text: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const send = async () => {
    const text = draft.trim();
    if (text.length === 0 || chatBusy) return;
    setChatError(null);
    setDraft('');
    const next = [...history, { me: true, text }];
    setHistory(next);
    setChatBusy(true);
    try {
      const { text: reply } = await brainstorm(next.map((h) => h.text));
      setHistory([...next, { me: false, text: reply }]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : '応答がありませんでした');
    } finally {
      setChatBusy(false);
    }
  };

  // 進捗のまとめ
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const makeSummary = useCallback(async () => {
    setSummaryError(null);
    setSummaryBusy(true);
    try {
      const [tasks, members, projects] = await Promise.all([
        getTasks(),
        getMembers(),
        getProjects(),
      ]);
      setSummary(await summarizeProgress({ tasks, members, projects, todayKey }));
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'まとめを作れませんでした');
    } finally {
      setSummaryBusy(false);
    }
  }, [todayKey]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>AI</Text>
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>今の状況をまとめる</Text>
          <Text style={styles.hint}>
            締切を過ぎている工程・担当が未定の工程・ブロック中の工程をまとめ、
            誰に何を頼むかの下書きを作ります。AIに送るのはこの3種類だけです。
          </Text>
          <Pressable
            style={[styles.button, summaryBusy && styles.disabled]}
            onPress={() => void makeSummary()}
            disabled={summaryBusy}
          >
            <Text style={styles.buttonText}>
              {summaryBusy ? '作成中…' : '今週のまとめを作る'}
            </Text>
          </Pressable>

          {summaryError && <Text style={styles.error}>{summaryError}</Text>}

          {summary && (
            <View style={styles.result}>
              <Text style={styles.body_}>{summary.overview}</Text>
              {summary.nudges.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>声をかける下書き</Text>
                  {/* **送信はしない。** コピーして LINE / Discord に貼る想定
                      （アプリ内DMは作らない。要件定義書 F5） */}
                  {summary.nudges.map((n, i) => (
                    <View key={i} style={styles.nudge}>
                      <Text style={styles.nudgeTo}>{n.to}</Text>
                      <Text style={styles.body_}>{n.message}</Text>
                    </View>
                  ))}
                  <Text style={styles.hint}>
                    自動では送りません。読んでから LINE / Discord に貼ってください。
                  </Text>
                </>
              )}
            </View>
          )}
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>企画・タイトル・サムネの壁打ち</Text>

          {history.length === 0 ? (
            <Text style={styles.hint}>
              「マイクラで新しい企画のネタが欲しい」「この動画のタイトル案を5つ」など。
            </Text>
          ) : (
            history.map((h, i) => (
              <View key={i} style={[styles.bubble, h.me ? styles.bubbleMe : styles.bubbleAi]}>
                <Text style={styles.bubbleWho}>{h.me ? 'あなた' : 'AI'}</Text>
                <Text style={styles.body_}>{h.text}</Text>
              </View>
            ))
          )}

          {chatError && <Text style={styles.error}>{chatError}</Text>}

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="タイトル案を5つ出して"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            <Pressable
              style={[styles.button, chatBusy && styles.disabled]}
              onPress={() => void send()}
              disabled={chatBusy}
            >
              <Text style={styles.buttonText}>{chatBusy ? '考え中…' : '送る'}</Text>
            </Pressable>
          </View>
        </PixelFrame>
      </ScrollView>
    </SafeAreaView>
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
  sectionTitle: { fontSize: FONT_SIZE.body, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  hint: { ...LONG_TEXT, color: COLORS.textMuted, marginBottom: SPACING.sm },
  /** AIの出力は長文になるのでゴシック（§3.1 の長文の例外） */
  body_: { ...LONG_TEXT, color: COLORS.text },
  error: { ...LONG_TEXT, color: COLORS.danger, marginTop: SPACING.sm },

  result: { marginTop: SPACING.sm },
  nudge: {
    borderLeftWidth: BORDER_WIDTH.thick,
    borderLeftColor: COLORS.frameLight,
    paddingLeft: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  nudgeTo: { fontSize: FONT_SIZE.body },

  bubble: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bubbleMe: { backgroundColor: COLORS.surfaceSunken },
  bubbleAi: { backgroundColor: COLORS.surface },
  bubbleWho: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  row: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  input: {
    flex: 1,
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.body,
  },
  button: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingHorizontal: SPACING.md,
  },
  buttonText: { fontSize: FONT_SIZE.body },
  disabled: { opacity: 0.5 },
});
