# 将来やること

## セキュリティ

### 楽天Books APIをConvex Action経由でプロキシする
現在はフロント（Expo）から直接楽天APIを叩いており、アクセスキーがアプリのJSバンドルに含まれている。
Convex Actionをプロキシとして挟むことで、キーをサーバー側のみに置ける。

```
現在: Expoアプリ → 楽天API（直接）
理想: Expoアプリ → Convex Action（サーバー） → 楽天API
```

- `EXPO_PUBLIC_` プレフィックスを外した環境変数をConvexのダッシュボードに設定
- `convex/books.ts` に `action` を追加して楽天APIを呼ぶ
- `lib/api/books-search.ts` の `fetch` を `useAction(api.books.search)` に置き換える
