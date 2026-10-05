import { useSignIn } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const C = {
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  orange: '#F97316',
  orangeDark: '#EA6C0A',
  white: '#FFFFFF',
  slate900: '#0F172A',
  slate600: '#475569',
  slate400: '#94A3B8',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#EF4444',
};

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = email.length > 0 && password.length > 0;

  async function handleLogin() {
    if (!isLoaded || !canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      await setActive({ session: result.createdSessionId });
    } catch (e: unknown) {
      const err = e as { errors?: Array<{ message: string }> };
      setError(err.errors?.[0]?.message ?? 'メールアドレスまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.indigo }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* ── ヘッダー ── */}
        <View style={s.header}>
          <View style={s.icon}>
            <Text style={s.iconText}>B</Text>
          </View>
          <Text style={s.appName}>Bokudana</Text>
          <Text style={s.tagline}>本の記録と合計金額を管理</Text>
        </View>

        {/* ── カード ── */}
        <View style={s.card}>

          {/* タイトル */}
          <Text style={s.title}>おかえりなさい</Text>
          <Text style={[s.subtitle, { marginBottom: 24 }]}>
            アカウントにログインしてください
          </Text>

          {/* メール */}
          <Text style={s.label}>メールアドレス</Text>
          <View style={[s.inputBox, emailFocused && s.focused, { marginBottom: 16 }]}>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="example@email.com"
              placeholderTextColor={C.slate400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* パスワード */}
          <Text style={s.label}>パスワード</Text>
          <View style={[s.inputBox, passwordFocused && s.focused, { marginBottom: 8 }]}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="パスワードを入力"
              placeholderTextColor={C.slate400}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Pressable onPress={() => setShowPassword(p => !p)} style={s.eye}>
              <Text style={s.eyeText}>{showPassword ? '隠す' : '表示'}</Text>
            </Pressable>
          </View>

          {/* エラー */}
          {error ? (
            <View style={[s.errorBox, { marginBottom: 8 }]}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ログインボタン */}
          <Pressable
            onPress={handleLogin}
            disabled={loading || !canSubmit}
            style={[
              s.ctaBtn,
              { marginTop: 16, marginBottom: 16 },
              (!canSubmit || loading) && { opacity: 0.45 },
            ]}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.ctaBtnText}>ログイン</Text>
            }
          </Pressable>

          {/* 区切り */}
          <View style={[s.divider, { marginBottom: 16 }]}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>または</Text>
            <View style={s.dividerLine} />
          </View>

          {/* アカウント作成 */}
          <Link href="/(auth)/signup" asChild>
            <Pressable style={[s.subBtn, { marginBottom: 24 }]}>
              <Text style={s.subBtnText}>新規アカウントを作成</Text>
            </Pressable>
          </Link>

          <Text style={s.footer}>
            ログインすることで、利用規約とプライバシーポリシーに同意したことになります
          </Text>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  icon: {
    width: 72,
    height: 72,
    backgroundColor: C.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
  },
  iconText: {
    fontSize: 28,
    fontWeight: '900',
    color: C.indigo,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.slate900,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: C.slate400,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: C.slate600,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: C.slate100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.slate200,
    paddingHorizontal: 14,
  },
  focused: {
    borderColor: C.indigo,
    backgroundColor: C.indigoLight,
  },
  input: {
    fontSize: 15,
    color: C.slate900,
  },
  eye: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  eyeText: {
    fontSize: 12,
    color: C.slate400,
  },
  errorBox: {
    backgroundColor: C.red50,
    borderWidth: 1,
    borderColor: C.red100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: C.red500,
    lineHeight: 19,
  },
  ctaBtn: {
    height: 54,
    backgroundColor: C.orange,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(249, 115, 22, 0.35)',
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.slate200,
  },
  dividerText: {
    fontSize: 12,
    color: C.slate400,
    marginHorizontal: 12,
  },
  subBtn: {
    height: 52,
    backgroundColor: C.indigoLight,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.indigoBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.indigo,
  },
  footer: {
    fontSize: 11,
    color: C.slate400,
    textAlign: 'center',
    lineHeight: 17,
  },
});
