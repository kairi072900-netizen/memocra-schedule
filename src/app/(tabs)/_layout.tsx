import { Tabs } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { AppBackground } from '@/components/app-background';
import { BottomBar } from '@/components/nav/bottom-bar';
import { NAV_ITEMS } from '@/components/nav/items';
import { Sidebar } from '@/components/nav/sidebar';
import { LAYOUT } from '@/constants/theme';
import { getMembers, getNotifications, getTasks } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { doneTaskCount, levelOf } from '@/lib/level';
import type { Member, Task } from '@/types';

/**
 * ナビゲーション（要件定義書 12.3 / 12.7）。**画面幅で形を変える。**
 *
 *   - `LAYOUT.sidebarMinWidth`（1024px）以上 → 左サイドバーに13項目
 *   - それ未満                               → 下タブに5項目＋「その他」
 *
 * React Navigation の `tabBarPosition` に乗せているので、レイアウト自体は
 * ライブラリが組む。自前で `flexDirection: 'row'` に包み替えていない。
 *
 * `tabBar` を差し替えているため、**宣言した13ルートすべてがタブに出るわけではない**。
 * 下タブに出すのは `BOTTOM_BAR_ITEMS` の5つだけで、残りは「その他」シートから開く
 * （`components/nav/items.tsx`）。
 *
 * **画面の地の風景（`AppBackground`）もここで敷く。** 各画面は背景を塗らず、
 * その上に羊皮紙のパネルを重ねる（CLAUDE.md §3.1）。
 */
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= LAYOUT.sidebarMinWidth;
  const { session } = useSession();

  // サイドバーのメンバー行と自分のカード用。ここでしか使わないので軽く取る
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  /** お知らせの未読件数。ナビのバッジに出す（発行側は P4 なので今は常に0） */
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    // 失敗しても画面は出したいので握りつぶす。各画面が自前でエラー表示を持っている
    getMembers()
      .then(setMembers)
      .catch(() => {});
    getTasks()
      .then(setTasks)
      .catch(() => {});
    getNotifications()
      .then((list) => setUnreadCount(list.filter((n) => n.read_at === null).length))
      .catch(() => {});
  }, []);

  // 下タブにも未読バッジを出すので、幅によらず読む
  useEffect(() => {
    load();
  }, [load]);

  const myId = session?.user.id ?? null;
  const me = useMemo(() => members.find((m) => m.id === myId) ?? null, [members, myId]);
  // レベルは完了したタスクだけで上がる加点型（要件定義書 12.6。HPは作らない）
  const level = useMemo(() => (myId ? levelOf(doneTaskCount(tasks, myId)) : null), [tasks, myId]);

  return (
    <AppBackground>
      <Tabs
        tabBar={(props) => {
          const currentRouteName = props.state.routes[props.state.index]?.name;
          const onNavigate = (name: string) => props.navigation.navigate(name as never);
          return wide ? (
            <Sidebar
              currentRouteName={currentRouteName}
              onNavigate={onNavigate}
              members={members}
              me={me}
              level={level}
              unreadCount={unreadCount}
            />
          ) : (
            <BottomBar
              currentRouteName={currentRouteName}
              onNavigate={onNavigate}
              unreadCount={unreadCount}
            />
          );
        }}
        screenOptions={{
          headerShown: false,
          tabBarPosition: wide ? 'left' : 'bottom',
          // **背景を塗らない。** 下に敷いた風景を透かす
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label }} />
        ))}
      </Tabs>
    </AppBackground>
  );
}
