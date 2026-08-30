import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { StreamForm } from '@/components/stream-form';
import {
  ANSWER_BADGE,
  BORDER_WIDTH,
  COLORS,
  FONT_FAMILY,
  FONT_SIZE,
  LAYOUT,
  LONG_TEXT,
  SPACING,
  STREAM_PLATFORM,
} from '@/constants/theme';
import {
  clearAvailability,
  deleteStream,
  getAvailabilities,
  getMembers,
  setAvailability,
  updateStream,
} from '@/lib/api';
import { WEEKDAY_LABELS } from '@/lib/calendar';
import { resolveMemberAnswers } from '@/lib/schedule';
import { supabase } from '@/lib/supabase';
import type { Availability, AvailabilityAnswer, Member, Stream } from '@/types';

/** '2026-08-15T20:00:00+09:00' → '8月15日(金) 20:00' */
function formatWhen(startsAt: string): string {
  const month = Number(startsAt.slice(5, 7));
  const day = Number(startsAt.slice(8, 10));
  const time = startsAt.slice(11, 16);
  const weekday = WEEKDAY_LABELS[new Date(startsAt.slice(0, 10)).getUTCDay()];
  return `${month}月${day}日(${weekday}) ${time}`;
}

function confirmDelete(answerCount: number): Promise<boolean> {
  const message =
    answerCount > 0
      ? `この配信には${answerCount}件の出欠回答があります。削除すると回答も消えます。`
      : 'この配信を削除します。';
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('配信を削除', message, [
      { text: 'やめる', style: 'cancel', onPress: () => resolve(false) },
      { text: '削除', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

const ANSWER_CHOICES: AvailabilityAnswer[] = ['yes', 'maybe', 'no'];

/**
 * 前の画面へ戻る。履歴が無ければカレンダーへ。
 *
 * ＋タブでの登録は `router.replace` で詳細へ来る（フォームに戻れても意味が無いため）。
 * その結果スタックが空になり、`router.back()` だけだと何も起きない。
 */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/calendar');
}

export default function StreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [streams, setStreams] = useState<Stream[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [commentDirty, setCommentDirty] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setStreams(null);
    setMembers(null);
    setAvailabilities(null);
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null));
    supabase
      .from('streams')
      .select('*')
      .eq('id', id)
      .then(({ data, error: e }) => {
        if (e) setError(`配信予定の取得に失敗しました: ${e.message}`);
        else setStreams(data);
      });
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
    getAvailabilities()
      .then(setAvailabilities)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const stream = streams?.[0];
  const streamAnswers = useMemo(
    () => (availabilities ?? []).filter((a) => a.stream_id === id),
    [availabilities, id],
  );
  const myAnswer = streamAnswers.find((a) => a.member_id === myId) ?? null;

  useEffect(() => {
    // 自分の既存コメントをフォームに反映（ユーザーが編集し始めたら上書きしない）
    if (!commentDirty) setComment(myAnswer?.comment ?? '');
  }, [myAnswer, commentDirty]);

  const runAnswer = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setCommentDirty(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const memberAnswers =
    members && availabilities ? resolveMemberAnswers(members, availabilities, id) : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.back} onPress={goBack}>
            ◀ もどる
          </Text>
        </PixelFrame>

        {error && <ErrorView message={error} onRetry={load} />}

        {!stream || !members || !availabilities ? (
          !error && <LoadingView label="読み込み中…" />
        ) : editing ? (
          <StreamForm
            members={members}
            initial={{
              title: stream.title,
              starts_at: stream.starts_at,
              duration_min: stream.duration_min,
              platform: stream.platform,
              memo: stream.memo,
            }}
            submitLabel="保存"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              await updateStream(stream.id, input);
              setEditing(false);
              load();
            }}
          />
        ) : (
          <View style={styles.content}>
            <Text style={styles.title}>{stream.title}</Text>
            <Text style={styles.meta}>{formatWhen(stream.starts_at)}</Text>
            <Text style={styles.meta}>
              {stream.duration_min}分・{STREAM_PLATFORM[stream.platform]}
            </Text>
            {stream.memo && <Text style={styles.memo}>{stream.memo}</Text>}
            <Text style={styles.createdBy}>
              登録: {members.find((m) => m.id === stream.created_by)?.name ?? '不明'}
            </Text>

            <Text style={styles.sectionHeading}>メンバーの出欠</Text>
            <View style={styles.answerList}>
              {memberAnswers.map(({ member, answer }) => {
                const badge = ANSWER_BADGE[answer];
                const c = streamAnswers.find((a) => a.member_id === member.id)?.comment;
                return (
                  <View key={member.id} style={styles.answerRow}>
                    <View style={[styles.avatar, { backgroundColor: member.color }]} />
                    <Text style={styles.answerName}>{member.name}</Text>
                    <View style={[styles.answerBadge, { backgroundColor: badge.color }]}>
                      <Text style={styles.answerSymbol}>{badge.symbol}</Text>
                    </View>
                    {c && <Text style={styles.answerComment}>{c}</Text>}
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionHeading}>あなたの回答</Text>
            <View style={styles.choiceRow}>
              {ANSWER_CHOICES.map((choice) => {
                const badge = ANSWER_BADGE[choice];
                const selected = myAnswer?.answer === choice;
                return (
                  <Pressable
                    key={choice}
                    disabled={busy}
                    onPress={() =>
                      runAnswer(() =>
                        setAvailability(id, choice, comment.trim().length > 0 ? comment.trim() : null),
                      )
                    }
                    style={[styles.choiceButton, selected && styles.choiceButtonActive]}
                  >
                    <Text style={styles.choiceText}>
                      {badge.symbol} {badge.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={comment}
              onChangeText={(t) => {
                setComment(t);
                setCommentDirty(true);
              }}
              placeholder="ひとこと（例: 21時からなら出れる）"
              placeholderTextColor={COLORS.textMuted}
              style={styles.commentInput}
            />
            {commentDirty && myAnswer && (
              <Text
                style={styles.link}
                onPress={() =>
                  runAnswer(() =>
                    setAvailability(
                      id,
                      myAnswer.answer,
                      comment.trim().length > 0 ? comment.trim() : null,
                    ),
                  )
                }
              >
                コメントを保存
              </Text>
            )}
            {myAnswer && (
              <Text style={styles.link} onPress={() => runAnswer(() => clearAvailability(id))}>
                回答を取り消す
              </Text>
            )}

            <View style={styles.actions}>
              <Pressable onPress={() => setEditing(true)} style={styles.editButton}>
                <Text style={styles.buttonText}>編集</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={async () => {
                  const others = streamAnswers.length;
                  if (!(await confirmDelete(others))) return;
                  setBusy(true);
                  try {
                    await deleteStream(stream.id);
                    goBack();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '削除に失敗しました');
                    setBusy(false);
                  }
                }}
                style={styles.deleteButton}
              >
                <Text style={styles.buttonText}>削除</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingBottom: SPACING.xxl },
  header: { margin: SPACING.sm, padding: SPACING.sm },
  // 「もどる」は Text の onPress。文字の高さ（17px）しか当たり判定が無いので、
  // 上下に余白を足して 44px 相当まで広げる（§3.1 minTapSize）
  back: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    paddingVertical: SPACING.md,
    alignSelf: 'flex-start',
  },
  content: { paddingHorizontal: SPACING.md },
  title: { fontSize: FONT_SIZE.title, marginBottom: SPACING.xs },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  memo: { ...LONG_TEXT, marginTop: SPACING.sm },
  createdBy: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.sm },

  sectionHeading: { fontSize: FONT_SIZE.body, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  answerList: { gap: SPACING.xs },
  answerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  avatar: {
    width: LAYOUT.dotSize,
    height: LAYOUT.dotSize,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
  },
  answerName: { fontSize: FONT_SIZE.body, marginLeft: SPACING.xs, minWidth: SPACING.xxl * 2 },
  answerBadge: {
    width: LAYOUT.badgeSize,
    height: LAYOUT.badgeSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  answerSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  answerComment: { ...LONG_TEXT, color: COLORS.textMuted, marginLeft: SPACING.sm },

  choiceRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  choiceButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  choiceButtonActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  choiceText: { fontSize: FONT_SIZE.body },
  commentInput: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  link: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.md },

  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xxl },
  editButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  deleteButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: { fontSize: FONT_SIZE.body },
});
