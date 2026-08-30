import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, LONG_TEXT, SPACING } from '@/constants/theme';
import {
  createExternalCalendar,
  deleteExternalCalendar,
  getExternalCalendars,
  syncExternalCalendars,
  updateExternalCalendar,
} from '@/lib/api';
import type { ExternalCalendar } from '@/types';

/**
 * 外部カレンダー（Google カレンダー / TimeTree）の登録と取り込み。
 *
 * **読み取り専用の連携。** アプリの予定を外部へ書き戻すことはしない。
 * 取り込みは Edge Function `sync-ics` が行う（ブラウザから ICS の URL を
 * 直接 fetch すると CORS で弾かれるため）。
 *
 * この部品は**設定画面に置く**。カレンダー本体に設定を持ち込むと、
 * 1画面に収める制約（§3.1）に響く。
 *
 * ここだけデータ取得を持っている（設定画面から丸ごと切り出した部品なので、
 * §4 の「components は表示専用」から外れる。他所から使い回さないこと）。
 */
export function ExternalCalendars() {
  const [calendars, setCalendars] = useState<ExternalCalendar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const load = useCallback(() => {
    getExternalCalendars()
      .then(setCalendars)
      .catch((e: Error) => {
        setCalendars([]);
        setError(e.message);
      });
  }, []);

  // 設定画面は開いたときに1回読めば足りる（頻繁に変わるものではない）
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (label.trim().length === 0) return setError('名前を入れてください');
    // http(s) 以外を弾く。webcal:// で貼られることがあるので https に読み替える
    const normalized = url.trim().replace(/^webcal:\/\//i, 'https://');
    if (!/^https?:\/\//i.test(normalized)) {
      return setError('URLは https:// で始まるものを貼ってください');
    }
    setError(null);
    setBusy(true);
    try {
      const created = await createExternalCalendar({ label: label.trim(), ics_url: normalized });
      setCalendars((list) => [...(list ?? []), created]);
      setLabel('');
      setUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '登録に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setError(null);
    setSyncNote(null);
    setBusy(true);
    try {
      const result = await syncExternalCalendars();
      const total = result.results.reduce((n, r) => n + r.count, 0);
      setSyncNote(`${result.synced}件のカレンダーから ${total}件の予定を取り込みました`);
      load();
    } catch (e) {
      // Edge Function が未デプロイのうちは必ずここに来る。何をすればよいかまで出す
      setError(
        `${e instanceof Error ? e.message : '取り込みに失敗しました'}\n` +
          '（取り込みには Edge Function「sync-ics」のデプロイが必要です）',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cal: ExternalCalendar) => {
    setBusy(true);
    try {
      await deleteExternalCalendar(cal.id);
      setCalendars((list) => (list ?? []).filter((c) => c.id !== cal.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (cal: ExternalCalendar) => {
    setBusy(true);
    try {
      const saved = await updateExternalCalendar(cal.id, { enabled: !cal.enabled });
      setCalendars((list) => (list ?? []).map((c) => (c.id === saved.id ? saved : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.about}>
        Googleカレンダーや TimeTree の予定を、このアプリのカレンダーに重ねて表示します。
        取り込むだけで、こちらの予定を相手側に書き込むことはありません。
      </Text>

      {/* 貼る URL の性質を必ず伝える。知らずに共有すると私的な予定が漏れる */}
      <Text style={styles.warning}>
        ⚠ Googleカレンダーの「非公開URL（iCal形式）」は、URLを知っている人なら誰でも
        中身を見られます。チームに見せてよいカレンダーだけを登録してください。
      </Text>
      <Text style={styles.hint}>
        繰り返しの予定は最初の1回だけ取り込まれます（毎週の予定は1件として出ます）。
      </Text>

      {(calendars ?? []).map((cal) => (
        <View key={cal.id} style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {cal.enabled ? '' : '（停止中）'}
              {cal.label}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {cal.last_error
                ? `失敗: ${cal.last_error}`
                : cal.last_synced_at
                  ? `最終取り込み ${cal.last_synced_at.slice(0, 16).replace('T', ' ')}`
                  : 'まだ取り込んでいません'}
            </Text>
          </View>
          <SmallButton label={cal.enabled ? '停止' : '再開'} onPress={() => void toggle(cal)} />
          <SmallButton label="削除" onPress={() => void remove(cal)} />
        </View>
      ))}

      {calendars !== null && calendars.length === 0 && (
        <Text style={styles.hint}>まだ登録がありません</Text>
      )}

      <Text style={styles.label}>名前</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="メモクラ共有カレンダー"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>iCal（ICS）のURL</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="url"
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {syncNote && <Text style={styles.hint}>{syncNote}</Text>}

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, busy && styles.disabled]}
          onPress={() => void add()}
          disabled={busy}
        >
          <Text style={styles.buttonText}>追加する</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonPrimary, busy && styles.disabled]}
          onPress={() => void sync()}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? '取り込み中…' : 'いま取り込む'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.smallButton} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  about: { ...LONG_TEXT, color: COLORS.text },
  warning: {
    ...LONG_TEXT,
    color: COLORS.text,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  hint: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, marginTop: SPACING.xs },
  error: { ...LONG_TEXT, color: COLORS.danger, marginTop: SPACING.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  rowMain: { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.body },
  rowMeta: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  label: { fontSize: FONT_SIZE.body, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    minHeight: LAYOUT.minTapSize,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
    fontSize: FONT_SIZE.body,
  },

  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  button: {
    flex: 1,
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
  },
  buttonPrimary: { backgroundColor: COLORS.surfaceSunken },
  buttonText: { fontSize: FONT_SIZE.body },
  smallButton: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
  },
  disabled: { opacity: 0.5 },
});
