import { query, mutation } from './_generated/server';
import { Auth } from 'convex/server';
import { v } from 'convex/values';

const STATUS = v.union(
  v.literal('unread'),
  v.literal('reading'),
  v.literal('done'),
  v.literal('gave_up'),
  v.literal('on_hold'),
);

async function requireIdentity(auth: Auth) {
  const identity = await auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  return identity;
}

function validateDate(date: string | undefined) {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('purchasedAt must be YYYY-MM-DD');
  }
}

// 一覧取得（新しい順）
export const list = query({
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx.auth);
    return ctx.db
      .query('books')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect();
  },
});

// ステータス別件数 + 合計金額
export const stats = query({
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx.auth);
    const books = await ctx.db
      .query('books')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();
    return {
      total:      books.length,
      unread:     books.filter((b) => b.status === 'unread').length,
      reading:    books.filter((b) => b.status === 'reading').length,
      done:       books.filter((b) => b.status === 'done').length,
      totalPrice: books.reduce((sum, b) => sum + (b.price ?? 0), 0),
    };
  },
});

// 最近登録した本（上限100件）
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const identity = await requireIdentity(ctx.auth);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return ctx.db
      .query('books')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .take(safeLimit);
  },
});

// 1冊取得
export const get = query({
  args: { id: v.id('books') },
  handler: async (ctx, { id }) => {
    const identity = await requireIdentity(ctx.auth);
    const book = await ctx.db.get(id);
    if (!book || book.userId !== identity.subject) throw new Error('Unauthorized');
    return book;
  },
});

// 登録
export const create = mutation({
  args: {
    title:        v.string(),
    author:       v.optional(v.string()),
    coverUrl:     v.optional(v.string()),
    price:        v.optional(v.number()),
    purchasedAt:  v.optional(v.string()),
    status:       STATUS,
    memo:         v.optional(v.string()),
    isFavorite:   v.optional(v.boolean()),
    wantToReread: v.optional(v.boolean()),
    rating:       v.optional(v.number()),
    genreId:          v.optional(v.string()),
    customCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx.auth);
    validateDate(args.purchasedAt);
    return ctx.db.insert('books', { ...args, userId: identity.subject });
  },
});

// 更新
export const update = mutation({
  args: {
    id:           v.id('books'),
    status:       v.optional(STATUS),
    memo:         v.optional(v.string()),
    price:        v.optional(v.number()),
    purchasedAt:  v.optional(v.string()),
    isFavorite:       v.optional(v.boolean()),
    wantToReread:     v.optional(v.boolean()),
    rating:           v.optional(v.number()),
    customCategories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...fields }) => {
    const identity = await requireIdentity(ctx.auth);
    validateDate(fields.purchasedAt);
    const book = await ctx.db.get(id);
    if (!book || book.userId !== identity.subject) throw new Error('Unauthorized');
    return ctx.db.patch(id, fields);
  },
});

// 削除
export const remove = mutation({
  args: { id: v.id('books') },
  handler: async (ctx, { id }) => {
    const identity = await requireIdentity(ctx.auth);
    const book = await ctx.db.get(id);
    if (!book || book.userId !== identity.subject) throw new Error('Unauthorized');
    return ctx.db.delete(id);
  },
});
