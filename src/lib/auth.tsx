import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

/**
 * ログイン状態と「メンバー登録済みか」を1箇所にまとめる。
 *
 * `_layout.tsx`（画面の出し分け）と `claim.tsx`（合言葉入力後にタブ画面へ
 * 進める）と `login-callback.tsx` が**同じ状態**を参照する必要があるため、
 * ただのフックではなく Context にしている。
 * 以前はフックだったが、フックは呼び出しごとに別の state を持つため、
 * `claim.tsx` で `refreshMembership()` しても `_layout.tsx` 側が再評価されず、
 * 合言葉を通してもリロードするまでカレンダーに進めなかった。
 *
 * ログインはできても、合言葉（`claim_membership`）を通るまでは
 * `members` 行が無い状態がありうる。その間は「ログイン済みだがメンバーではない」
 * という第3の状態になる（`supabase/migrations/0002_auth.sql` §「合言葉」参照）。
 */

export interface AuthState {
  /** undefined = 未確認。null = 未ログイン。 */
  session: Session | null | undefined;
  /** undefined = 未確認（session確定後に確認する）。 */
  hasMembership: boolean | undefined;
  /** 合言葉が通った直後などに呼び、メンバー登録状態を再確認する。 */
  refreshMembership: () => void;
}

const SessionContext = createContext<AuthState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [hasMembership, setHasMembership] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const checkMembership = useCallback((userId: string) => {
    // ここで undefined に戻すと、_layout.tsx が一瞬スプラッシュ/空表示に落ちる。
    // 初期状態はもともと undefined なので、更新は結果が返ってから行う。
    supabase
      .from('members')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setHasMembership(data !== null));
  }, []);

  useEffect(() => {
    if (session === undefined) return; // まだ確認中
    if (session === null) {
      setHasMembership(undefined); // 未ログインでは無関係な値
      return;
    }
    checkMembership(session.user.id);
  }, [session, checkMembership]);

  const refreshMembership = useCallback(() => {
    if (session) checkMembership(session.user.id);
  }, [session, checkMembership]);

  return (
    <SessionContext.Provider value={{ session, hasMembership, refreshMembership }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): AuthState {
  const ctx = useContext(SessionContext);
  if (ctx === undefined) {
    throw new Error('useSession は <SessionProvider> の中で使ってください');
  }
  return ctx;
}
