import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import {
  ANSWER_BADGE,
  ATTENDANCE_STATUS,
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SPACING,
  STREAM_PLATFORM,
} from '@/constants/theme';
import {
  clearAvailability,
  getAvailabilities,
  getMembers,
  getStreams,
  setAvailability,
} from '@/lib/api';
import { dateToKey, WEEKDAY_LABELS } from '@/lib/calendar';
import { aggregateAttendance } from '@/lib/schedule';
import { supabase } from '@/lib/supabase';
import type { Availability, AvailabilityAnswer, Member, Stream } from '@/types';

/** '2026-08-15T20:00:00+09:00' → '8月15日(金) 20:00' */
function formatWhen(startsAt: string): string {
  const month = Number(startsAt.slice(5, 7));
  const day = Number(startsAt.slice(8, 10));
  const weekday = WEEKDAY_LABELS[new Date(startsAt.slice(0, 10)).getUTCDay()];
  return `${month}月${day}日(${weekday}) ${startsAt.slice(11, 16)}`;
}

const CHOICES: AvailabilityAnswer[] = ['yes', 'maybe', 'no'];

/** S7 配信・出欠。これからの配信を一覧し、その場で自分の出欠を回答する。 */
export default function AvailabilityScreen() {
  const [streams, setStreams] = useState<Stream[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [busyStreamId, setBusyStreamId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    supabase.auth.getSession().then(({ data }) => setMyId(data.session?.user.id ?? null));
    getStreams()
      .then(setStreams)
      .catch((e: Error) => setError(e.message));
    getMembers()
      .then(setMembers)
      .catch((e: Error) => setError(e.message));
    getAvailabilities()
      .then(setAvailabilities)
      .catch((e: Error) => setError(e.message));
  }, []);

  // タブに戻るたび最新化（別画面で登録・削除・回答した結果を反映）
  useFocusEffect(load);

  const todayKey = useMemo(() => dateToKey(new Date()), []);
  const upcoming = useMemo(
    () =>
      (streams ?? [])
        .filter((s) => s.starts_at.slice(0, 10) >= todayKey)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [streams, todayKey],
  );

  const answer = async (streamId: string, fn: () => Promise<void>) => {
    setBusyStreamId(streamId);
    setError(null);
    try {
      await fn();
      setAvailabilities(await getAvailabilities());
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setBusyStreamId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <PixelFrame style={styles.header}>
        <Text style={styles.title}>配信・出欠</Text>
      </PixelFrame>

      {error && <ErrorView message={error} onRetry={load} />}

      {!streams || !members || !availabilities ? (
        !error && <LoadingView label="読み込み中…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {upcoming.length === 0 ? (
            <Text style={styles.hint}>これからの配信はありません。＋タブから登録できます。</Text>
          ) : (
            upcoming.map((s) => {
              const answers = availabilities.filter((a) => a.stream_id === s.id);
              const status = ATTENDANCE_STATUS[aggregateAttendance(answers, members.length)];
              const mine = answers.find((a) => a.member_id === myId)?.answer ?? null;
              const busy = busyStreamId === s.id;

              return (
                <View key={s.id} style={styles.card}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/stream/[id]', params: { id: s.id } })}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.streamTitle} numberOfLines={1}>
                        {s.title}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <Text style={styles.statusSymbol}>{status.symbol}</Text>
                      </View>
                    </View>
                    <Text style={styles.meta}>
                      {formatWhen(s.starts_at)}・{STREAM_PLATFORM[s.platform]}
                    </Text>
                  </Pressable>

                  <View style={styles.choiceRow}>
                    {CHOICES.map((c) => {
                      const badge = ANSWER_BADGE[c];
                      const selected = mine === c;
                      return (
                        <Pressable
                          key={c}
                          disabled={busy}
                          onPress={() =>
                            answer(s.id, () =>
                              selected ? clearAvailability(s.id) : setAvailability(s.id, c, null),
                            )
                          }
                          style={[styles.choice, selected && styles.choiceActive]}
                        >
                          <Text style={styles.choiceText}>
                            {badge.symbol} {badge.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  // **背景を塗らない。** 画面の地に敷いた風景（`components/app-background.tsx`）を
  // 透かすため。塗ると風景が完全に隠れる（実際に本番で踏んだ）
  safeArea: { flex: 1 },
  header: { margin: SPACING.sm, padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, padding: SPACING.md },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
    borderBottomWidth: BORDER_WIDTH.normal,
    borderRightWidth: BORDER_WIDTH.normal,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streamTitle: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  meta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  statusBadge: {
    width: LAYOUT.badgeSize,
    height: LAYOUT.badgeSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  statusSymbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },

  choiceRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, flexWrap: 'wrap' },
  choice: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  choiceActive: { backgroundColor: COLORS.surfaceSunken, borderColor: COLORS.text },
  choiceText: { fontSize: FONT_SIZE.body },
});
