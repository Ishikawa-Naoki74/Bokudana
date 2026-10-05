import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  books: defineTable({
    userId:      v.string(),             // Clerk の user.id
    title:       v.string(),             // タイトル（必須）
    author:      v.optional(v.string()), // 著者名（Google Books API から自動取得）
    coverUrl:    v.optional(v.string()), // 表紙画像URL（Google Books API から自動取得）
    price:       v.optional(v.number()), // 価格（円）
    purchasedAt: v.optional(v.string()), // 購入日（YYYY-MM-DD）
    status:      v.union(
      v.literal('unread'),
      v.literal('reading'),
      v.literal('done'),
      v.literal('gave_up'),
      v.literal('on_hold'),
    ),
    memo:         v.optional(v.string()),   // メモ・感想
    isFavorite:   v.optional(v.boolean()), // お気に入り
    wantToReread: v.optional(v.boolean()), // もう一度読みたい
    rating:           v.optional(v.number()),          // 評価（1〜5）
    genreId:          v.optional(v.string()),          // 楽天ブックス booksGenreId
    customCategories: v.optional(v.array(v.string())), // ユーザー定義カテゴリー
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_genre', ['userId', 'genreId']),
});
