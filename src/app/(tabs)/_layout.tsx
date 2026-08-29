import { Tabs } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { BottomBar } from '@/components/nav/bottom-bar';
import { NAV_ITEMS } from '@/components/nav/items';
import { Sidebar } from '@/components/nav/sidebar';
import { COLORS, LAYOUT } from '@/constants/theme';
import { getMembers, getTasks } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { doneTaskCount, levelOf } from '@/lib/level';
import type { Member, Task } from '@/types';

/**
 * ナビゲーション（要件定義書 12.3 / 12.7）。**画面幅で形を変える。**
 *
 *   - `LAYOUT.sidebarMinWidth`（900px）以上 → 左サイドバーに10項目
 *   - それ未満                              → 下タブに5項目
 *
 * React Navigation の `tabBarPosition` に乗せているので、レイアウト自体は
 * ライブラリが組む。自前で `flexDirection: 'row'` に包み替えていない。
 *
 * `tabBar` を差し替えているため、**宣言した10ルートすべてがタブに出るわけではない**。
 * 下タブに出すのは `BOTTOM_BAR_ITEMS` の5つだけ（`components/nav/items.tsx`）。
 */
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= LAYOUT.sidebarMinWidth;
  const { session } = useSession();

  // サイドバーのメンバー行と自分のカード用。ここでしか使わないので軽く取る
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(() => {
    // 失敗しても画面は出したいので握りつぶす。各画面が自前でエラー表示を持っている
    getMembers()
      .then(setMembers)
      .catch(() => {});
    getTasks()
      .then(setTasks)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (wide) load();
  }, [wide, load]);

  const myId = session?.user.id ?? null;
  const me = useMemo(() => members.find((m) => m.id === myId) ?? null, [members, myId]);
  // レベルは完了したタスクだけで上がる加点型（要件定義書 12.6。HPは作らない）
  const level = useMemo(() => (myId ? levelOf(doneTaskCount(tasks, myId)) : null), [tasks, myId]);

  return (
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
          />
        ) : (
          <BottomBar currentRouteName={currentRouteName} onNavigate={onNavigate} />
        );
      }}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: COLORS.background },
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Tabs.Screen key={item.name} name={item.name} options={{ title: item.label }} />
      ))}
    </Tabs>
  );
}
