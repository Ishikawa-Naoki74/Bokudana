import { useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { LabeledInput } from '@/components/ui/labeled-input';

type Step = 'register' | 'verify';

export default function SignupScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (e: unknown) {
      const err = e as { errors?: Array<{ message: string }> };
      setError(err.errors?.[0]?.message ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      await setActive({ session: result.createdSessionId });
    } catch (e: unknown) {
      const err = e as { errors?: Array<{ message: string }> };
      setError(err.errors?.[0]?.message ?? '認証コードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  // ── メール認証ステップ ──
  if (step === 'verify') {
    return (
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* 上部 */}
          <View className="bg-indigo-600 px-6 pt-20 pb-12 items-center gap-4">
            <View
              className="w-20 h-20 bg-white rounded-3xl items-center justify-center"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            >
              <Ionicons name="mail-outline" size={32} color="#4F46E5" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-white text-2xl font-bold tracking-tight">
                メールを確認
              </Text>
              <Text className="text-indigo-200 text-sm text-center">
                6桁の認証コードを送信しました
              </Text>
            </View>
          </View>

          {/* フォームカード */}
          <View
            className="flex-1 bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-10 gap-8"
            style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}
          >
            <View className="gap-1">
              <Text className="text-2xl font-bold text-slate-900">
                認証コードを入力
              </Text>
              <Text className="text-sm text-slate-500 leading-5">
                <Text className="text-indigo-600 font-medium">{email}</Text>
                {' '}に送信したコードを入力してください
              </Text>
            </View>

            <View className="gap-4">
              <LabeledInput
                label="認証コード（6桁）"
                value={code}
                onChangeText={(t) => { setCode(t); setError(''); }}
                placeholder="000000"
                keyboardType="numeric"
                hint="迷惑メールフォルダもご確認ください"
              />
              {error ? (
                <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <Text className="text-red-500 text-sm leading-5">{error}</Text>
                </View>
              ) : null}
            </View>

            <View className="gap-3">
              <Button
                label="認証して始める"
                onPress={handleVerify}
                loading={loading}
                disabled={code.length !== 6}
                variant="cta"
              />
              <Button
                label="戻る"
                variant="ghost"
                onPress={() => { setStep('register'); setError(''); setCode(''); }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── 登録ステップ ──
  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* 上部 */}
        <View className="bg-indigo-600 px-6 pt-20 pb-12 items-center gap-4">
          <View
            className="w-20 h-20 bg-white rounded-3xl items-center justify-center"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
          >
            <Text className="text-indigo-600 text-3xl font-black">B</Text>
          </View>
          <View className="items-center gap-1">
            <Text className="text-white text-2xl font-bold tracking-tight">
              Bokudana
            </Text>
            <Text className="text-indigo-200 text-sm">
              本の記録と合計金額を管理
            </Text>
          </View>
        </View>

        {/* フォームカード */}
        <View
          className="flex-1 bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-10 gap-8"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}
        >
          {/* ステップインジケーター */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5">
              <View className="w-6 h-6 rounded-full bg-indigo-600 items-center justify-center">
                <Text className="text-white text-xs font-bold">1</Text>
              </View>
              <Text className="text-xs font-medium text-indigo-600">情報入力</Text>
            </View>
            <View className="flex-1 h-px bg-slate-200" />
            <View className="flex-row items-center gap-1.5">
              <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center">
                <Text className="text-slate-400 text-xs font-bold">2</Text>
              </View>
              <Text className="text-xs text-slate-400">メール認証</Text>
            </View>
          </View>

          <View className="gap-1">
            <Text className="text-2xl font-bold text-slate-900">
              アカウント作成
            </Text>
            <Text className="text-sm text-slate-500">
              無料で始められます
            </Text>
          </View>

          <View className="gap-4">
            <LabeledInput
              label="メールアドレス"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="example@email.com"
              keyboardType="email-address"
            />
            <LabeledInput
              label="パスワード"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="8文字以上"
              secureTextEntry
              hint="英字・数字を含む8文字以上で設定してください"
            />
            {error ? (
              <View className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <Text className="text-red-500 text-sm leading-5">{error}</Text>
              </View>
            ) : null}
          </View>

          <View className="gap-3">
            <Button
              label="次へ（メール認証）"
              onPress={handleRegister}
              loading={loading}
              disabled={!email || password.length < 8}
              variant="cta"
            />
            <Button
              label="ログインに戻る"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
