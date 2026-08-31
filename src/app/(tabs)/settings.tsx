import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ExternalCalendars } from '@/components/external-calendars';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, LONG_TEXT, SPACING } from '@/constants/theme';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * 設定。**アカウントの確認とログアウト**が主目的。
 *
 * これまでカレンダーのヘッダーに置いていた暫定のログアウト導線を、
 * ようやく本来の場所へ移せる。
 *
 * 名前・役割・識別色・活動時間帯の変更は**メンバー画面**にある
 * （自分の `members` 行を編集する操作なので、そちらに集約した）。
 */
export default function SettingsScreen() {
  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    // サインアウトすると _layout.tsx のガードがログイン画面へ切り替える
    await supabase.auth.signOut();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.body}>
        <PixelFrame style={styles.header}>
          <Text style={styles.title}>設定</Text>
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <Text style={styles.value}>{session?.user.email ?? '不明'}</Text>
          <Text style={styles.hint}>Googleアカウントでログインしています</Text>

          <Pressable
            style={styles.linkRow}
            onPress={() => router.push({ pathname: '/members' })}
          >
            <Text style={styles.link}>名前・役割・識別色を変える ›</Text>
          </Pressable>
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>外部カレンダーの取り込み</Text>
          <ExternalCalendars />
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>目標</Text>
          <Text style={styles.hint}>
            チーム・個人・企画ごとに、短期（今月・今四半期）と中長期（半年・1年）の目標を置けます
          </Text>
          {/* 下タブに出ない画面なので、ここから辿れるようにする（nav/items.tsx の約束） */}
          <Pressable style={styles.linkRow} onPress={() => router.push({ pathname: '/goals' })}>
            <Text style={styles.link}>目標を見る・立てる ›</Text>
          </Pressable>
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>AI</Text>
          <Text style={styles.hint}>
            企画・タイトル・サムネの壁打ちと、今の状況のまとめ。
            予定の読み取りは新規登録画面、締切の調整は企画詳細にあります。
          </Text>
          <Pressable style={styles.linkRow} onPress={() => router.push({ pathname: '/ai' })}>
            <Text style={styles.link}>AIに相談する ›</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push({ pathname: '/meetings' })}>
            <Text style={styles.link}>議事録を見る・作る ›</Text>
          </Pressable>
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>このアプリについて</Text>
          <Text style={styles.about}>
            メモリークラフトの制作スケジュールを共有するためのアプリです。
            動画1本ごとに工程・担当・締切を管理し、配信の出欠をまとめます。
          </Text>
        </PixelFrame>

        <PixelFrame style={styles.card}>
          <Text style={styles.sectionTitle}>ログアウト</Text>
          <Text style={styles.hint}>
            次に使うときは、またGoogleでログインします（合言葉の再入力は要りません）
          </Text>
          <View style={styles.actions}>
            <Pressable
              disabled={signingOut}
              onPress={signOut}
              style={[styles.signOutButton, signingOut && styles.disabled]}
            >
              <Text style={styles.buttonText}>
                {signingOut ? 'ログアウト中…' : 'ログアウトする'}
              </Text>
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
  sectionTitle: { fontSize: FONT_SIZE.body, marginBottom: SPACING.sm },
  value: { fontSize: FONT_SIZE.body },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  about: { ...LONG_TEXT, color: COLORS.text },
  linkRow: { marginTop: SPACING.md, minHeight: LAYOUT.minTapSize, justifyContent: 'center' },
  link: { fontSize: FONT_SIZE.body, color: COLORS.text },
  actions: { flexDirection: 'row', marginTop: SPACING.lg },
  signOutButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: FONT_SIZE.body },
});
