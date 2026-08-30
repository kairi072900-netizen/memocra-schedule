import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_FAMILY, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * 合言葉入力画面。
 *
 * Googleログインは済んだが、まだ `members` 行が無い人だけが見る画面
 * （`src/app/_layout.tsx` の `Stack.Protected` で出し分け）。
 * 4人だけが知っている合言葉を入力すると `members` 行が作られ、タブ画面へ進める
 * （`supabase/migrations/0002_auth.sql` の `claim_membership`）。
 */
export default function ClaimScreen() {
  const { refreshMembership } = useSession();
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('claim_membership', {
        input_passcode: passcode,
      });
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      // 成功。useSession に登録状態を確認させると、_layout.tsx がタブ画面へ切り替える
      refreshMembership();
    } catch (e) {
      setError(e instanceof Error ? e.message : '合言葉の確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PixelFrame style={styles.frame}>
          <Text style={styles.title}>合言葉を入力</Text>
          <Text style={styles.subtitle}>メンバーに教えてもらった合言葉を入れてください</Text>

          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="合言葉"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={loading || passcode.length === 0}
            style={[
              styles.button,
              (loading || passcode.length === 0) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>{loading ? '確認中…' : '参加する'}</Text>
          </Pressable>

          {/* 別のGoogleアカウントでやり直したい場合の導線。ここで詰まないようにする */}
          <Text style={styles.signOut} onPress={() => supabase.auth.signOut()}>
            別のアカウントでログインし直す
          </Text>
        </PixelFrame>

        {error && <ErrorView message={error} onRetry={handleSubmit} />}
      </View>
    </SafeAreaView>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  frame: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: { fontSize: FONT_SIZE.title },
  subtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  input: {
    width: '100%',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    // TextInputは @/components/app-text の既定フォントが効かないため明示する
    fontFamily: FONT_FAMILY.pixel,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  button: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: FONT_SIZE.body },
  signOut: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
});
