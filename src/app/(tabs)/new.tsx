import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { StreamForm } from '@/components/stream-form';
import { COLORS, FONT_SIZE, SPACING } from '@/constants/theme';
import { createStream, getMembers } from '@/lib/api';
import type { Member } from '@/types';

/**
 * ＋タブ。P2 時点では **配信予定の登録フォームだけ**。
 * 企画（project）の登録は P5 で足す（CLAUDE.md §2）。
 *
 * 登録すると本来は全員に出欠依頼の通知が飛ぶ（要件定義書 F7）が、
 * 通知は P4。ここでは登録して詳細画面へ遷移するだけ。
 */
export default function NewScreen() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <Text style={styles.title}>配信予定を登録</Text>
        </PixelFrame>

        {error ? (
          <ErrorView message={error} onRetry={load} />
        ) : !members ? (
          <LoadingView label="読み込み中…" />
        ) : (
          <StreamForm
            members={members}
            submitLabel="登録する"
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingBottom: SPACING.xxl },
  header: { margin: SPACING.sm, padding: SPACING.sm, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.title },
});
