# Bokudana MVP — 進捗

## 凡例
- [ ] 未着手　　- [x] 完了　　- 🔄 作業中

---

## Phase 0: プロジェクト基盤
- [x] 0-1. package.json を実態に合わせる & `"main": "expo-router/entry"` に変更
- [x] 0-2. 不足パッケージのインストール
- [x] 0-3. tsconfig.json に `@/` エイリアス追加
- [x] 0-4. babel.config.js / metro.config.js / global.css / nativewind-env.d.ts 作成
- [x] 0-5. app.config.ts に `scheme` と `plugins` 追加
- [x] 0-6. @supabase/supabase-js を削除 → convex / @clerk/clerk-expo をインストール

## Phase 1: Convex + Clerk 設定
- [x] 1-1. Convex アカウント作成 → `npx convex dev` でプロジェクト初期化
- [x] 1-2. Clerk アカウント作成 → publishable key 取得 → Convex 連携有効化
- [x] 1-3. .env.local に EXPO_PUBLIC_CONVEX_URL / EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY を設定
- [x] 1-4. convex/auth.config.ts 作成（Clerk JWT 検証設定）

## Phase 2: Convex スキーマ + サーバー関数
- [ ] 2-1. convex/schema.ts（books テーブル定義）
- [ ] 2-2. convex/books.ts（list / totalPrice / create / update / remove）
- [ ] 2-3. lib/api/google-books.ts（Google Books API 検索クライアント）
- [ ] 2-4. lib/store/book-store.ts（Zustand UI ストア）

## Phase 3: Expo Router + 認証基盤
- [x] 3-1. app/_layout.tsx（ClerkProvider + ConvexProviderWithClerk + 認証リダイレクト）
- [x] 3-2. app/(auth)/_layout.tsx
- [x] 3-3. app/(tabs)/_layout.tsx

## Phase 4: 認証画面
- [x] 4-1. components/ui/button.tsx
- [x] 4-2. components/ui/labeled-input.tsx
- [x] 4-3. app/(auth)/login.tsx
- [x] 4-4. app/(auth)/signup.tsx
- [ ] 4-5. 動作確認：ログイン後ホーム画面に遷移することを確認

## Phase 5: 本の一覧画面
- [ ] 5-1. components/books/book-card.tsx（React.memo ラップ）
- [ ] 5-2. app/(tabs)/index.tsx（FlashList + 合計金額バナー）
- [ ] 5-3. 動作確認：Convex Dashboard に手動挿入 → 一覧に表示

## Phase 6: 書籍検索・追加画面
- [ ] 6-1. components/books/search-result-item.tsx
- [ ] 6-2. app/(tabs)/search.tsx（Google Books API 検索 + 追加）
- [ ] 6-3. 動作確認：検索 → 追加 → 本棚に反映

## Phase 7: 本の詳細・編集・削除
- [ ] 7-1. app/book/[id].tsx（詳細表示 + ステータス変更 + 削除）
- [ ] 7-2. 動作確認：詳細 → 編集 → 削除

## Phase 8: 最終確認
- [ ] 8-1. `npx tsc --noEmit` エラーなし
- [ ] 8-2. アプリ再起動でセッション維持確認
- [ ] 8-3. エラーケース確認（ネットワークなし、0件など）
