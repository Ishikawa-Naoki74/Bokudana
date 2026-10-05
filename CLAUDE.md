# Bokudana — 読書管理アプリ

## プロジェクト概要

Expo (React Native) で構築する読書管理アプリ。登録した本の合計金額の把握を中心に、本の記録・管理を行う。

## 技術スタック

| 領域 | ライブラリ | バージョン |
|------|-----------|-----------|
| ランタイム | React Native | 0.81.5 |
| ランタイム | React | 19.1.0 |
| フレームワーク | Expo SDK | ~54.0.33 |
| フレームワーク | Expo Router | 6.0.23 |
| 認証 | Clerk（`@clerk/clerk-expo`）| ^2.19.31 |
| データベース | Convex | ^1.39.1 |
| トークンキャッシュ | expo-secure-store | 15.0.8 |
| スタイリング | NativeWind | 4.2.4 |
| スタイリング | Tailwind CSS | 3.4.19 |
| 状態管理 | Zustand | 5.0.13 |
| リスト | FlashList（`@shopify/flash-list`）| 2.0.2 |
| アニメーション | react-native-reanimated | 4.1.7 |
| 画像 | expo-image | 3.0.11 |
| 書籍検索 | Google Books API | — |
| 言語 | TypeScript | ~5.9.2 |
| テスト | Jest + @testing-library/react-native | — |

### Convex を選んだ理由

- プロジェクト数制限なし・非アクティブによる停止なし
- TypeScript 完全統合・バックエンド API 不要
- リアルタイム対応（将来の機能追加に強い）

### Clerk を選んだ理由

- Expo 公式 SDK あり
- Email / Google / Apple ログイン対応
- 10,000 MAU まで無料
- `expo-secure-store` をトークンキャッシュに使える

### ファイル Storage は使わない理由

本の表紙画像は Google Books API の URL をそのまま `expo-image` で表示する。

---

## ディレクトリ構成

```
app/                    # Expo Router のルート（画面のみ）
  _layout.tsx           # ルートレイアウト（ClerkProvider + ConvexProvider）
  (auth)/               # 未ログイン時のみアクセス可能
    _layout.tsx
    login.tsx           # ログイン画面
    signup.tsx          # サインアップ画面
  (tabs)/               # ログイン済みのみアクセス可能
    _layout.tsx
    index.tsx           # 本の一覧 + 合計金額
    search.tsx          # 書籍検索・追加
  book/
    [id].tsx            # 本の詳細・編集

convex/                 # Convex サーバー関数・スキーマ
  schema.ts             # テーブル定義
  books.ts              # CRUD クエリ・ミューテーション

components/             # 再利用コンポーネント
  books/                # 本関連コンポーネント
  ui/                   # 汎用UIコンポーネント

lib/                    # ユーティリティ・ビジネスロジック
  api/                  # Google Books API クライアント
  store/                # Zustand ストア

assets/                 # 画像・フォントなど
```

**ルール:**
- `app/` 配下にはルートファイルのみ置く。コンポーネント・型・ユーティリティは絶対に置かない
- ファイル名は必ず **kebab-case** （例: `book-card.tsx`）
- `tsconfig.json` にパスエイリアスを設定し、相対パスより `@/` エイリアスを優先する

---

## Convex

### スキーマ定義（`convex/schema.ts`）

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  books: defineTable({
    userId:      v.string(),            // Clerk の user.id
    title:       v.string(),
    author:      v.optional(v.string()),
    coverUrl:    v.optional(v.string()),
    price:       v.optional(v.number()), // 円
    purchasedAt: v.optional(v.string()), // YYYY-MM-DD
    status:      v.string(),             // unread / reading / done
  })
  .index('by_user', ['userId'])
  .index('by_user_status', ['userId', 'status']),
});
```

### クエリ・ミューテーションパターン（`convex/books.ts`）

```ts
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// 一覧取得
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    return ctx.db
      .query('books')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect();
  },
});

// 合計金額
export const totalPrice = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    const books = await ctx.db
      .query('books')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();
    return books.reduce((sum, b) => sum + (b.price ?? 0), 0);
  },
});

// 登録
export const create = mutation({
  args: {
    title:       v.string(),
    author:      v.optional(v.string()),
    coverUrl:    v.optional(v.string()),
    price:       v.optional(v.number()),
    purchasedAt: v.optional(v.string()),
    status:      v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    return ctx.db.insert('books', { ...args, userId: identity.subject });
  },
});

// 更新
export const update = mutation({
  args: { id: v.id('books'), status: v.string() },
  handler: async (ctx, { id, status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    return ctx.db.patch(id, { status });
  },
});

// 削除
export const remove = mutation({
  args: { id: v.id('books') },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');
    return ctx.db.delete(id);
  },
});
```

### アプリ側の呼び出し（バックエンド不要）

```ts
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// 一覧
const books = useQuery(api.books.list);

// 合計金額
const total = useQuery(api.books.totalPrice);

// 登録
const createBook = useMutation(api.books.create);
await createBook({ title, author, price, status: 'unread' });
```

### 環境変数

```bash
# .env.local
EXPO_PUBLIC_CONVEX_URL=https://xxxx.convex.cloud
```

---

## Clerk

### セットアップ（`app/_layout.tsx`）

```tsx
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Clerk トークンを expo-secure-store に保存するキャッシュ
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <Slot />
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

### 認証ルール

- Clerk のトークンは必ず `expo-secure-store` に保存する（AsyncStorage は使わない）
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` は公開鍵なのでコードに含めて問題ない
- Clerk の Secret Key は絶対にクライアントに含めない
- ユーザー情報は `useUser()` フック、認証状態は `useAuth()` フックで取得

```ts
// NG: 認証状態をローカル state で管理する
const [isLoggedIn, setIsLoggedIn] = useState(false);

// OK: Clerk のフックを使う
const { isSignedIn, user } = useUser();
```

### 認証画面の実装

```tsx
import { useSignIn, useSignUp } from '@clerk/clerk-expo';

// ログイン
const { signIn, setActive } = useSignIn();
const result = await signIn.create({ identifier: email, password });
await setActive({ session: result.createdSessionId });

// サインアップ
const { signUp, setActive } = useSignUp();
await signUp.create({ emailAddress: email, password });
// メール確認コード送信
await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
// コード検証
const result = await signUp.attemptEmailAddressVerification({ code });
await setActive({ session: result.createdSessionId });

// ログアウト
const { signOut } = useAuth();
await signOut();
```

### 環境変数

```bash
# .env.local
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx  # 公開鍵
# CLERK_SECRET_KEY はサーバー専用・クライアントに含めない
```

- `.env.local` は必ず `.gitignore` に追加して git にコミットしない

---

## コードスタイル

### 基本ルール

- TypeScript strict モード必須
- `import` は必ずファイル先頭にまとめる
- ファイル名・ディレクトリ名は **kebab-case**
- 特殊文字をファイル名に使わない

### ライブラリ選択（必ず守る）

| 用途 | 使う | 使わない |
|------|------|---------|
| 画像 | `expo-image` | `<img>` / RN の `Image` |
| 音声 | `expo-audio` | `expo-av` |
| 動画 | `expo-video` | `expo-av` |
| セーフエリア | `react-native-safe-area-context` | RN の `SafeAreaView` |
| OS判定 | `process.env.EXPO_OS` | `Platform.OS` |
| コンテキスト | `React.use()` | `React.useContext()` |
| シャドウ | CSS `boxShadow` | RN の `shadow*` / `elevation` |
| Picker / WebView | 削除済みのため外部ライブラリを使う | RN組み込みの削除済みモジュール |

### 条件レンダリング（クラッシュ防止）

```tsx
// NG: count=0 や name="" でクラッシュする
{count && <Text>{count}</Text>}
{name && <Text>{name}</Text>}

// OK: 三項演算子
{count > 0 ? <Text>{count}</Text> : null}
{name ? <Text>{name}</Text> : null}

// Best: 早期リターン
if (!name) return null
```

### 文字列は必ず `<Text>` で囲む

```tsx
// NG: クラッシュする
<View>{someString}</View>

// OK
<View><Text>{someString}</Text></View>
```

---

## レイアウト・スタイリング

- SafeAreaView の代わりに `<ScrollView contentInsetAdjustmentBehavior="automatic" />` を使う
- `FlatList` / `SectionList` にも `contentInsetAdjustmentBehavior="automatic"` を付与
- 画面サイズは `Dimensions.get()` ではなく `useWindowDimensions` を使う
- 余白は `margin` より `padding` を優先。スペーシングは flex `gap` を活用
- 角丸には `{ borderCurve: 'continuous' }` を使う（カプセル形状以外）
- シャドウは CSS `boxShadow` のみ使用:

```tsx
<View style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }} />
```

- ページタイトルはカスタムテキストでなく必ず Stack.Screen の `options={{ title: "..." }}` で設定
- ScrollView にパディングを当てる場合は `contentContainerStyle` を使う

---

## ナビゲーション

- `_layout.tsx` で Stack を定義する（インラインで書かない）
- モーダルは `presentation: "modal"` で Expo Router のスクリーンとして定義
- ボトムシートは `presentation: "formSheet"` を使用

```tsx
<Stack.Screen name="modal" options={{ presentation: "modal" }} />

<Stack.Screen
  name="add-book"
  options={{
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.5, 1.0],
  }}
/>
```

---

## パフォーマンス

### リスト（CRITICAL）

- 3件以上のリストは必ず `FlashList` を使う（`ScrollView` は使わない）
- `renderItem` にインラインオブジェクト・関数を渡さない
- リストアイテムコンポーネントは `React.memo` でラップする
- コールバックはリストコンポーネントのルートで安定化する（`useCallback`）

```tsx
const renderItem = useCallback(({ item }: { item: Book }) => (
  <BookCard itemId={item._id} onPress={handlePress} />
), [handlePress]);

<FlashList data={books} renderItem={renderItem} estimatedItemSize={80} />
```

### アニメーション

- `transform` と `opacity` のみアニメートする（`width` / `height` は不可）
- `useDerivedValue` を使って計算アニメーションを派生させる
- タップアニメーションには `GestureDetector` + `Gesture.Tap()` を使う

### バンドルサイズ

- barrel exports は避ける。ソースから直接インポートする
- `Intl` フォーマッターはコンポーネント外でホイストする:

```tsx
const formatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
function PriceText({ amount }: { amount: number }) {
  return <Text>{formatter.format(amount)}</Text>;
}
```

---

## 状態管理（Zustand）

- 派生値（合計金額など）は state に持たず Convex の `useQuery` から取得する
- Convex のリアルタイムクエリが信頼できる情報源

```ts
// NG: 合計金額をZustandに持つ
const total = useStore((s) => s.totalPrice);

// OK: Convexから直接取得（リアルタイム更新される）
const total = useQuery(api.books.totalPrice);
```

---

## UI/UX ガイドライン

### アクセシビリティ（必須）

- タッチターゲットは最小 **44×44pt** 確保する
- 重要なデータを表示する `<Text>` には `selectable` prop を付ける
- アイコンのみのボタンには必ず `aria-label` を付ける
- カラーだけで情報を伝えない

### インタラクション

- ロード中はボタンを disabled にし、スピナーを表示する
- エラーメッセージは問題箇所の近くに表示する
- アニメーションは 150〜300ms を基本とする

### 数値表示

- 大きな数字は `1.4万` `38万` のようにフォーマットする
- 金額などのカウンターには `fontVariant: 'tabular-nums'` を使って桁揃えする

### 禁止事項

- UI アイコンに絵文字を使わない（SVG アイコンを使う）
- `div` / `img` などの Web 専用要素を使わない

---

## テスト（@testing-library/react-native）

### クエリ優先順位

`getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`（最終手段）

### 基本ルール

```tsx
screen.getByRole('button', { name: '追加' });
expect(screen.queryByText('エラー')).not.toBeOnTheScreen();
const button = await screen.findByRole('button');

const user = userEvent.setup();
await user.press(screen.getByRole('button', { name: '登録' }));

await waitFor(() => {
  expect(screen.getByText('登録完了')).toBeOnTheScreen();
});
```

---

## 開発フロー

1. `npx convex dev` でローカル開発サーバー起動（別ターミナル）
2. `npx expo start` で Expo Go 起動
3. パフォーマンス問題が出たら Metro の `j` キーで React Native DevTools を開く

## アプリ起動コマンド

```bash
npx convex dev   # Convex 開発サーバー（別ターミナルで常時起動）
npm start        # Expo Go で起動
npm run ios      # iOS シミュレーター
npm run android  # Android エミュレーター
```

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
