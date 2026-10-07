# /security-audit — Expo + Convex + Clerk セキュリティ完全監査

> **対象スタック**: Expo (React Native) / Convex / Clerk / TypeScript
> **バージョン対応**: package.json を読み、その時点の最新バージョン・CVE を web_search で調べて動的にチェック
> **実行方法**: プロジェクトルートで `claude` を起動 → `/security-audit` と入力

---

## ⚙️ アプリ固有設定（プロジェクトごとにここだけ変更する）

```yaml
APP_NAME: "アプリ名をここに記入"

# Convex の全テーブル名（convex/schema.ts を見て記載）
TABLES:
  - users
  - categories
  - categoryLogs

# アカウント削除時に消すべきテーブル（users 以外を列挙）
DELETE_TARGETS:
  - categories
  - categoryLogs

# アプリ固有のビジネスルール（サーバーサイド強制を確認する対象）
BUSINESS_RULES:
  - "例: 1日1カテゴリにつき1回だけログを記録できる"

# 意図的に認証不要にしている箇所（false positive 除外リスト）
PUBLIC_ENDPOINTS:
  - "例: SignInScreen.tsx"

# ソーシャルログイン（Google等）の有無
# true の場合 → Sign in with Apple も必須（App Store 要件）
HAS_SOCIAL_LOGIN: false

# 課金（RevenueCat）の有無
HAS_REVENUE_CAT: false
```

---

## PHASE 1 — バージョン検出と最新情報の調査

> **このフェーズが核心。毎回必ず実行し、省略しないこと。**

### STEP 1-A: package.json から使用バージョンを取得する

```bash
# 主要3パッケージのバージョンを取得
node -e "
const p = require('./package.json');
const deps = { ...p.dependencies, ...p.devDependencies };
const targets = [
  'expo', 'react-native', 'react',
  'convex',
  '@clerk/clerk-expo',
  'expo-router', '@react-navigation/native',
  'typescript',
  'react-native-purchases',
];
targets.forEach(k => {
  if (deps[k]) console.log(k + ': ' + deps[k]);
});
"
```

### STEP 1-B: 検出した各パッケージを今すぐ web_search で調べる

上記で取得したバージョンを使い、**以下の検索を全パッケージに対して実行する。**
省略・スキップ禁止。必ず実際に web_search ツールを呼び出すこと。

#### Expo SDK

```
検索クエリ①: "expo SDK {検出したメジャーバージョン} latest release changelog"
検索クエリ②: "expo SDK {検出したメジャーバージョン} security vulnerability CVE"
```

調べること：
- 現在の最新 SDK バージョン（例: 54.0.x の最新 patch）
- 使用中バージョンより新しいリリースにセキュリティパッチが含まれるか
- 既知の CVE が報告されているか

#### React Native

```
検索クエリ①: "react-native {検出バージョン} latest version npm"
検索クエリ②: "react-native {検出バージョン} security vulnerability CVE 2025"
```

#### Convex

```
検索クエリ①: "convex npm latest version changelog"
検索クエリ②: "convex {検出バージョン} security vulnerability breaking changes"
```

調べること：
- 認証・認可に関する breaking changes が新バージョンにないか
- `getUserIdentity()` の挙動変更がないか

#### Clerk (@clerk/clerk-expo)

```
検索クエリ①: "@clerk/clerk-expo latest version npm"
検索クエリ②: "clerk expo security vulnerability CVE 2025"
検索クエリ③: "clerk changelog {検出バージョン} security"
```

調べること：
- 認証トークンの扱いに関する変更がないか
- SecureStore 連携の推奨実装に変更がないか

#### TypeScript

```
検索クエリ①: "typescript {検出バージョン} security vulnerability"
```

#### expo-router または @react-navigation（検出された方）

```
検索クエリ①: "expo-router {検出バージョン} security authentication"
または
検索クエリ①: "@react-navigation/native {検出バージョン} security vulnerability"
```

### STEP 1-C: バージョン調査結果をまとめてから次のフェーズへ

以下の形式で出力してから PHASE 2 に進む。
バージョンが古くセキュリティパッチが存在する場合は、その時点で 🔴 Critical / 🟡 High として記録する。

```
## バージョン調査結果（実行日時: YYYY-MM-DD）

| パッケージ         | 使用中バージョン | 最新バージョン | セキュリティパッチ | CVE        | 判定          |
|--------------------|-----------------|---------------|-------------------|------------|---------------|
| expo               | 54.0.x          | 54.0.x        | なし              | なし       | ✅ 最新       |
| react-native       | 0.x.x           | 0.x.x         | あり              | なし       | 🟡 High       |
| convex             | 1.x.x           | 1.x.x         | なし              | なし       | ✅ 最新       |
| @clerk/clerk-expo  | x.x.x           | x.x.x         | なし              | なし       | ✅ 最新       |
| typescript         | 5.x.x           | 5.x.x         | なし              | なし       | ✅ 最新       |
| expo-router        | x.x.x           | x.x.x         | なし              | なし       | ✅ 最新       |

## ナビゲーション
- [ ] Expo Router 使用
- [ ] React Navigation 使用

## 課金
- [ ] RevenueCat あり → PHASE 7 を実施
- [ ] RevenueCat なし → PHASE 7 をスキップ
```

---

## PHASE 2 — 全プロジェクト共通チェック

### 共通-1. 秘密情報のハードコード

```bash
grep -rn "sk_live\|sk_test\|secret\|password\|apiKey\|api_key\|API_KEY\|private_key\|access_token" \
  --include="*.ts" --include="*.tsx" . \
  | grep -v node_modules | grep -v "\.env" | grep -v dist \
  | grep -iv "//.*secret\|//.*password\|/\*.*secret"
```

### 共通-2. .gitignore の確認

```bash
cat .gitignore 2>/dev/null | grep -E "\.env|secret|key|credential"
ls -la | grep "^\.env"
```

`.env*` 全てが .gitignore に含まれているか確認。なければ Critical。

### 共通-3. EXPO_PUBLIC_ の誤用

```bash
grep -rn "EXPO_PUBLIC_" --include="*.ts" --include="*.tsx" --include=".env*" . \
  | grep -v node_modules
```

`EXPO_PUBLIC_` 変数はビルドに埋め込まれ誰でも読める。
秘密鍵・Convex deploy key 等が含まれていたら Critical。

### 共通-4. console.log による情報漏洩

```bash
grep -rn "console\.log\|console\.error\|console\.warn" \
  --include="*.ts" --include="*.tsx" . \
  | grep -v node_modules \
  | grep -iE "user|token|email|password|identity|key|secret"
```

### 共通-5. HTTP 通信（非HTTPS）

```bash
grep -rn "http://" --include="*.ts" --include="*.tsx" --include=".env*" . \
  | grep -v node_modules \
  | grep -v "http://localhost\|http://127\|//.*http://"
```

### 共通-6. npm audit

```bash
npm audit --audit-level=moderate 2>/dev/null | tail -30
```

### 共通-7. TypeScript の型安全性

```bash
npx tsc --noEmit 2>&1 | head -50
```

型チェックエラーが残っている場合、実行時の予期しない動作やセキュリティの穴になりうる。
特に以下を確認：

```bash
grep -rn " as any\|: any" --include="*.ts" --include="*.tsx" . \
  | grep -v node_modules | grep -v "_generated" | grep -v "\.d\.ts"
```

Convex の戻り値・引数を `any` でキャストして型安全性が失われている箇所を列挙する。

---

## PHASE 3 — Expo / React Native チェック

### Expo-1. ナビゲーション別の認証ガード

STEP 1-C で検出したナビゲーションに応じて実施する。

**Expo Router の場合：**

```bash
find . -name "_layout.tsx" | grep -v node_modules
grep -rn "useAuth\|useUser\|Redirect\|SignedIn\|SignedOut" \
  --include="*.tsx" . | grep -v node_modules
```

- `(protected)/` や `(auth)/` グループで認証ガードされているか確認
- 未認証ユーザーが `<Redirect href="/sign-in" />` で弾かれているか確認
- `PUBLIC_ENDPOINTS` 以外の全画面がガード配下にあるか確認

**React Navigation の場合：**

```bash
grep -rn "NavigationContainer\|createNativeStackNavigator\|createBottomTabNavigator" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules
grep -rn "isSignedIn\|isAuthenticated\|useAuth\|signedIn" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules
```

- 認証状態でスタックを分岐させる実装があるか確認（未認証スタック vs 認証済みスタック）
- `PUBLIC_ENDPOINTS` 以外の全スクリーンが認証済みスタック配下にあるか確認

### Expo-2. SecureStore の使用

```bash
grep -rn "AsyncStorage" --include="*.ts" --include="*.tsx" . | grep -v node_modules
grep -rn "SecureStore\|expo-secure-store" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

- トークン・機密情報が AsyncStorage（平文）ではなく SecureStore に保存されているか確認
- AsyncStorage が使われている場合、その内容が機密情報でないか確認

### Expo-3. Privacy Manifest（iOS 必須）

```bash
find . -name "PrivacyInfo.xcprivacy" | grep -v node_modules
cat app.json 2>/dev/null | grep -A10 "privacyManifests"
```

存在しない場合は Critical。

### Expo-4. EAS Build の本番設定

```bash
cat eas.json 2>/dev/null
cat app.json | grep -E "bundleIdentifier|version|buildNumber|scheme"
```

- `eas.json` の `production` プロファイルに正しい環境変数が設定されているか確認
- `development` の設定が `production` に混入していないか確認

### Expo-5. app.json のプライバシー設定

```bash
cat app.json | grep -E "privacyPolicyUrl|usageDescription|NSCamera|NSPhoto|NSLocation|NSMicrophone"
```

- `privacyPolicyUrl` が設定されているか確認
- 使用するパーミッションに `usageDescription` があるか確認

---

## PHASE 4 — Convex チェック

### Convex-1. 全関数の認証チェック漏れ

`convex/` 配下の全 `.ts` を読み込み確認する。

```bash
# mutation / query / action で getUserIdentity を呼んでいない関数を探す
grep -rn "export const" convex/ --include="*.ts" \
  | grep -v "_generated\|schema\|node_modules"

grep -rn "getUserIdentity" convex/ --include="*.ts" \
  | grep -v "_generated\|node_modules"
```

- `mutation` / `query` / `action` 全てで `ctx.auth.getUserIdentity()` を呼んでいるか確認
- null チェック（`if (!identity) throw new Error("Unauthorized")`）が抜けていないか確認
- `PUBLIC_ENDPOINTS` に記載された関数のみ除外

### Convex-2. 所有権チェック（IDOR脆弱性）

```bash
grep -rn "ctx\.db\.get\|ctx\.db\.patch\|ctx\.db\.delete\|ctx\.db\.replace" \
  convex/ --include="*.ts" | grep -v "_generated\|node_modules"
```

ID を引数に受け取る全関数で以下のパターンがあるか確認：

```ts
// ✅ 必須パターン — これがない関数を列挙する
const record = await ctx.db.get(args.someId);
if (!record || record.userId !== user._id) {
  throw new Error("Forbidden");
}
```

### Convex-3. データ露出（userId フィルタなし全件取得）

```bash
grep -rn "\.collect()" convex/ --include="*.ts" \
  | grep -v "_generated\|node_modules"
```

各 `.collect()` の直前に `.withIndex()` で `userId` フィルタがあるか確認。
フィルタなしは他ユーザーデータが漏洩するため Critical。

### Convex-4. 入力バリデーション

```bash
grep -rn "v\.any()" convex/ --include="*.ts" | grep -v "_generated\|node_modules"
grep -rn "args:" convex/ --include="*.ts" | grep -v "_generated\|node_modules"
```

- `v.any()` を使っている箇所を列挙
- 列挙型フィールドが `v.union(v.literal(...))` で制限されているか確認
- 文字列フィールドに長さ制限がない箇所を列挙

### Convex-5. internal functions の使用

```bash
grep -rn "internalMutation\|internalQuery\|internalAction" \
  convex/ --include="*.ts" | grep -v "_generated\|node_modules"
```

アカウント削除・管理操作などの機密処理が `internal*` として分離されているか確認。
internal であっても所有権チェックが省略されていないか確認。

### Convex-6. JSON.parse の安全性

```bash
grep -rn "JSON\.parse" --include="*.ts" --include="*.tsx" . \
  | grep -v node_modules
```

try-catch が行われていない `JSON.parse` を列挙。

### Convex-7. ビジネスロジックのサーバー強制

`BUSINESS_RULES` に記載した各ルールについて、
クライアントではなく Convex サーバーサイドで強制されているか確認。

### Convex-8. 本番環境設定

```bash
cat .env.local 2>/dev/null
cat .env 2>/dev/null
cat convex/auth.config.ts 2>/dev/null
```

- `CONVEX_DEPLOYMENT` が本番環境のものか確認
- `CLERK_ISSUER_URL` が本番 Clerk アプリ（`clerk.xxx.com`）を向いているか確認

```bash
grep -rn "seed\|seedData\|testUser\|isAdmin\|bypass\|debug.*true" \
  convex/ --include="*.ts" | grep -v "_generated\|node_modules"
```

開発用データ・バイパス処理が残っていないか確認。

### Convex-9. DoS 対策（データ件数上限）

```bash
grep -rn "ctx\.db\.insert" convex/ --include="*.ts" \
  | grep -v "_generated\|node_modules"
```

insert を行う関数で1ユーザーあたりの件数上限チェックがあるか確認：

```ts
// ✅ 推奨パターン
const count = await ctx.db.query("items")
  .withIndex("by_user", q => q.eq("userId", user._id))
  .collect();
if (count.length >= 100) throw new Error("上限に達しました");
```

### Convex-10. cron ジョブのセキュリティ

```bash
cat convex/crons.ts 2>/dev/null || echo "crons.ts なし"
```

cron が存在する場合、以下を確認：
- cron 内で他ユーザーのデータを意図せず操作していないか
- cron から呼び出す internal 関数に所有権チェックがあるか
- 外部APIを叩く cron でシークレットが環境変数から取得されているか

### Convex-11. HTTP Actions のセキュリティ

```bash
cat convex/http.ts 2>/dev/null || echo "http.ts なし"
```

HTTP Action が存在する場合、以下を確認：
- 外部からのリクエスト（Webhook等）で署名検証を行っているか
- 認証なしで DB を操作する HTTP Action がないか

```bash
grep -rn "httpAction\|httpRouter" convex/ --include="*.ts" \
  | grep -v "_generated\|node_modules"
```

---

## PHASE 5 — Clerk チェック

### Clerk-1. トークンキャッシュの安全性

```bash
find . -name "tokenCache*" | grep -v node_modules
grep -rn "tokenCache\|SecureStore\|getItemAsync\|setItemAsync" \
  --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

- `expo-secure-store` の `SecureStore` を使っているか確認
- `AsyncStorage` を直接使っていないか確認（平文保存になるため Critical）

### Clerk-2. ClerkProvider の設定

```bash
grep -rn "ClerkProvider\|publishableKey" \
  --include="*.tsx" --include="*.ts" . | grep -v node_modules
```

- `publishableKey` が環境変数から取得されているか（ハードコードされていないか）確認
- `tokenCache` が `ClerkProvider` に渡されているか確認

### Clerk-3. 本番キーへの切り替え

```bash
grep -rn "pk_test_\|pk_live_" \
  --include="*.ts" --include="*.tsx" --include=".env*" . | grep -v node_modules
```

- `pk_test_` が残っている場合は High（本番環境では `pk_live_` が必要）
- Clerk ダッシュボードで Development → Production に切り替えているか確認

### Clerk-4. Sign in with Apple（条件付き）

`HAS_SOCIAL_LOGIN: true` の場合のみ実施。

```bash
grep -rn "useSignInWithApple\|SignInWithApple\|apple" \
  --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Google 等のソーシャルログインがある場合、Sign in with Apple も実装されているか確認。
なければ **App Store 審査リジェクト確定** のため Critical。

### Clerk-5. 最新 Clerk API パターンの使用確認

PHASE 1 の web_search 結果を参照し、
現在の Clerk バージョンで非推奨になった API を使っていないか確認。

```bash
grep -rn "useClerk\|useUser\|useAuth\|useSession" \
  --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

---

## PHASE 6 — App Store 要件（iOS 必須）

### AppStore-1. アカウント削除機能（必須要件）

```bash
grep -rn "deleteAccount\|delete.*user\|退会\|アカウント削除" \
  --include="*.ts" --include="*.tsx" . | grep -v node_modules

grep -rn "deleteAccount\|deleteUser" convex/ --include="*.ts" \
  | grep -v "_generated\|node_modules"
```

アカウント削除 mutation が存在しない場合は **リジェクト確定** のため Critical。

削除時に `DELETE_TARGETS` の全テーブルと Clerk 側ユーザーが削除されているか確認：

```ts
// ✅ 必要な削除処理のパターン
// 1. DELETE_TARGETS の各テーブルを userId で全件取得して削除
// 2. Clerk の clerk.users.deleteUser(clerkId) を呼ぶ（HTTP Action 経由）
```

### AppStore-2. データ収集の申告

コードから実際に収集しているデータを列挙し、
App Store Connect の「データのプライバシー」欄への申告漏れを確認：

```bash
grep -rn "email\|name\|identifier" convex/ --include="*.ts" \
  | grep "insert\|patch" | grep -v "_generated\|node_modules"
```

---

## PHASE 7 — RevenueCat 課金セキュリティ

`HAS_REVENUE_CAT: false` の場合はこの PHASE をスキップ。

### RevenueCat-1. 最新バージョン確認

PHASE 1 で `react-native-purchases` のバージョンを確認済みであることを前提とする。
未確認の場合は以下で追加検索する：

```
検索クエリ: "react-native-purchases latest version CVE security 2025"
```

### RevenueCat-2. エンタイトルメントのサーバー検証

```bash
grep -rn "entitlement\|isPro\|isSubscribed\|customerInfo\|Purchases" \
  --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

プレミアム機能のアクセス判定がクライアントだけで完結していないか確認：

```ts
// ❌ 危険 — クライアント側だけで判定
if (customerInfo.entitlements.active["premium"]) { ... }

// ✅ 安全 — Convex サーバーサイドで都度確認
const sub = await ctx.db.query("subscriptions")
  .withIndex("by_user", q => q.eq("userId", user._id))
  .first();
if (!sub?.isActive) throw new Error("Subscription required");
```

### RevenueCat-3. Webhook の署名検証

RevenueCat の Webhook を受け取る Convex HTTP Action で
`X-RevenueCat-Signature` ヘッダーを検証しているか確認。

---

---

## PHASE 8 — React Native バンドルの難読化・改ざん対策

### RN-1. Hermes エンジンの有効化

```bash
cat app.json | grep -E "jsEngine|hermes"
cat package.json | grep "hermes"
```

- `"jsEngine": "hermes"` が設定されているか確認
- Hermes が無効の場合、バンドルが逆コンパイルされやすくなるため Medium として報告

### RN-2. 本番ビルドの minify 設定

```bash
cat metro.config.js 2>/dev/null || cat metro.config.ts 2>/dev/null || echo "metro.config なし"
cat eas.json | grep -A10 "production"
```

- 本番ビルドで minify が有効になっているか確認（EAS Build のデフォルトは有効）
- `"minify": false` が production プロファイルに残っていないか確認

### RN-3. デバッグフラグの本番混入確認

```bash
grep -rn "__DEV__\|IS_DEV\|DEBUG" --include="*.ts" --include="*.tsx" .   | grep -v node_modules   | grep -v "if.*__DEV__\|__DEV__ &&\|__DEV__ ?"
```

`__DEV__` の条件分岐なしにデバッグ用コードが本番に残っていないか確認。

---

## PHASE 9 — Convex レートリミット

### Rate-1. @convex-dev/rate-limiter の導入確認

```bash
npm list @convex-dev/rate-limiter 2>/dev/null
grep -rn "rateLimiter\|RateLimiter\|rate_limit\|rateLimit"   convex/ --include="*.ts" | grep -v "_generated\|node_modules"
```

- `@convex-dev/rate-limiter` が導入されているか確認
- 導入されていない場合は以下の観点で High として報告：
  - 認証済みユーザーが短時間に大量リクエストを送れる状態
  - Convex の従量課金コストが意図せず爆増するリスク

### Rate-2. 高コスト操作へのレート制限

以下の操作にレートリミットが設定されているか確認：

```bash
# insert が多い関数を列挙
grep -rn "ctx\.db\.insert" convex/ --include="*.ts"   | grep -v "_generated\|node_modules"

# 外部APIを叩く action を列挙
grep -rn "fetch(\|axios\|action(" convex/ --include="*.ts"   | grep -v "_generated\|node_modules"
```

特に insert・外部API呼び出しを行う mutation / action にレートリミットがないものを列挙する。

---

## PHASE 10 — EAS Update（OTA更新）のセキュリティ

### OTA-1. Update チャンネルの設定確認

```bash
cat eas.json 2>/dev/null | grep -A5 "channel\|updates"
cat app.json 2>/dev/null | grep -A10 '"updates"'
```

- `production` プロファイルのチャンネルが `"production"` になっているか確認
- `development` / `preview` チャンネルが `production` ビルドに混入していないか確認

**問題パターン（Critical）：**
```json
// ❌ 危険 — production ビルドが development チャンネルを向いている
"production": {
  "channel": "development"
}
```

### OTA-2. コードサイニングの設定

```bash
cat eas.json | grep -A5 "codeSigningCertificateKeyId\|codesigning"
```

EAS Code Signing（更新の署名検証）が設定されているか確認。
未設定の場合は改ざんされた OTA 更新を受け取るリスクがあるため Medium として報告。

### OTA-3. update の自動適用タイミング

```bash
cat app.json | grep -A5 '"checkAutomatically"\|"fallbackToCacheTimeout"'
```

`"checkAutomatically": "ON_ERROR_RECOVERY"` のような設定で
意図しないタイミングで更新が適用されないか確認。

---

## PHASE 11 — 監視・インシデント対応

### Monitor-1. クラッシュ監視（Sentry 等）の導入確認

```bash
npm list @sentry/react-native 2>/dev/null
grep -rn "Sentry\|sentry" --include="*.ts" --include="*.tsx" .   | grep -v node_modules | head -10
```

- `@sentry/react-native` が導入されているか確認
- `Sentry.init()` が呼ばれているか確認
- 導入されていない場合は Medium として報告（攻撃や異常に気づけないリスク）

### Monitor-2. Convex の異常ログ監視

Convex ダッシュボードの以下の設定を確認するよう促す（コード上では確認不可）：

- Functions タブで各関数のエラー率を確認しているか
- 短時間に大量のエラーが発生した場合のアラート設定があるか

### Monitor-3. インシデント発生時の対応手段

以下が整備されているか確認：

```bash
# ユーザー向けの問い合わせ窓口
cat app.json | grep -E "supportUrl\|supportEmail"

# プライバシーポリシーの存在
cat app.json | grep "privacyPolicyUrl"
```

- サポート URL・メールが設定されているか
- 不正アクセス発生時に特定ユーザーのアカウントを停止する手段が Convex 上にあるか確認

```bash
grep -rn "banUser\|suspendUser\|blockUser\|disableUser"   convex/ --include="*.ts" | grep -v "_generated\|node_modules"
```

---

## PHASE 12 — サプライチェーン・依存関係のセキュリティ

### Supply-1. package-lock.json の存在確認

```bash
ls -la | grep -E "package-lock\.json|yarn\.lock|pnpm-lock\.yaml"
```

ロックファイルが存在しない場合は Critical。
ロックファイルなしでは依存パッケージのバージョンが毎回変わり、
悪意あるパッケージへの置き換え攻撃に気づけない。

### Supply-2. ロックファイルの Git 管理確認

```bash
cat .gitignore | grep -E "package-lock|yarn\.lock|pnpm-lock"
```

ロックファイルが .gitignore に含まれていたら High（Git 管理から外れている）。

### Supply-3. 依存パッケージの公開元確認

```bash
# スクリプトを実行するパッケージを列挙（postinstall 等）
cat package.json | grep -A5 '"scripts"'
node -e "
const p = require('./package.json');
const deps = { ...p.dependencies, ...p.devDependencies };
console.log('総依存パッケージ数:', Object.keys(deps).length);
"
```

- `postinstall` スクリプトが存在する依存パッケージが不審でないか確認
- 総依存数が極端に多い場合は精査を推奨

### Supply-4. 既知の悪意あるパッケージ名チェック

```bash
# タイポスクワッティングの代表的パターンを確認
node -e "
const p = require('./package.json');
const deps = { ...p.dependencies, ...p.devDependencies };
const suspicious = Object.keys(deps).filter(k =>
  k.includes('expo-') && !k.startsWith('@') ||
  k.includes('convex-') ||
  k.includes('clerk-')
).filter(k => !['expo-router','expo-secure-store','expo-haptics',
  'expo-linking','expo-constants','expo-font','expo-splash-screen',
  'expo-status-bar','expo-system-ui','expo-web-browser'].includes(k));
if (suspicious.length) console.log('要確認パッケージ:', suspicious);
else console.log('タイポスクワッティング候補: なし');
"
```


## 監査レポート出力

全 PHASE 完了後、以下の形式で出力してください：

```
## セキュリティ監査レポート
- アプリ名    : [APP_NAME]
- 実行日時    : [YYYY-MM-DD HH:MM]
- スタック    : Expo {バージョン} / Convex {バージョン} / Clerk {バージョン}

---

### パッケージバージョン状況
| パッケージ        | 使用中  | 最新    | セキュリティパッチ | 判定       |
|-------------------|---------|---------|-------------------|------------|
| expo              | x.x.x   | x.x.x   | なし              | ✅ 最新    |
| react-native      | x.x.x   | x.x.x   | あり              | 🟡 High    |
| convex            | x.x.x   | x.x.x   | なし              | ✅ 最新    |
| @clerk/clerk-expo | x.x.x   | x.x.x   | なし              | ✅ 最新    |
| typescript        | x.x.x   | x.x.x   | なし              | ✅ 最新    |

---

### 🔴 Critical（リリース不可・即修正）
| # | PHASE | ファイル:行 | 問題内容 | 修正案 |
|---|-------|-------------|----------|--------|

### 🟡 High（リリース前に必ず修正）
| # | PHASE | ファイル:行 | 問題内容 | 修正案 |
|---|-------|-------------|----------|--------|

### 🟢 Medium（リリース後でも可だが推奨）
| # | PHASE | ファイル:行 | 問題内容 | 修正案 |
|---|-------|-------------|----------|--------|

### ✅ 問題なし
- [問題のなかった PHASE とカテゴリ]

---

### 総評
- Critical : X件
- High     : X件
- Medium   : X件
- リリース判定 : ✅ 可能 / ❌ 要対応（Critical または High が残っている場合）
```

---

> **このコマンドは静的解析です。**
> 完了後、必ず `/security-test-manual`（手動テスト）も実施してください。
> 問題が見つかった場合は Claude Code に「Critical の問題を全部修正して」と伝えてください。

