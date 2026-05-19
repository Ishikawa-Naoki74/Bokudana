import { useAuth, useUser } from '@clerk/clerk-expo';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 20, gap: 20 }}
    >
      {/* 合計金額バナー（仮） */}
      <View
        className="bg-violet-700 rounded-3xl p-6 gap-1"
        style={{ boxShadow: '0 8px 24px rgba(109, 40, 217, 0.25)' }}
      >
        <Text className="text-violet-200 text-sm font-medium">総購入金額</Text>
        <Text className="text-white text-4xl font-bold" style={{ fontVariant: ['tabular-nums'] }}>
          ¥0
        </Text>
        <Text className="text-violet-300 text-sm">0冊登録済み</Text>
      </View>

      {/* 空の状態 */}
      <View className="bg-white rounded-3xl p-8 items-center gap-4"
        style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
        <View className="w-16 h-16 bg-slate-100 rounded-2xl items-center justify-center">
          <Text className="text-3xl">📚</Text>
        </View>
        <View className="items-center gap-1">
          <Text className="text-slate-900 font-semibold text-lg">本棚が空です</Text>
          <Text className="text-slate-400 text-sm text-center">
            検索タブから本を追加してみましょう
          </Text>
        </View>
      </View>

      <Button label="ログアウト" variant="ghost" onPress={() => signOut()} />
    </ScrollView>
  );
}
