import { Redirect } from 'expo-router';

/** 起動時はカレンダー（S0）を開く。要件定義書 F6「開いた瞬間に今月なにが出るか分かる」ため。 */
export default function IndexScreen() {
  return <Redirect href="/calendar" />;
}
