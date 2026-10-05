export type BookSearchResult = {
  title: string;
  author?: string;
  coverUrl?: string;
  price?: number;
  isbn?: string;
  genreId?: string;
};

type RakutenItem = {
  title?: string;
  author?: string;
  largeImageUrl?: string;
  mediumImageUrl?: string;
  itemPrice?: number;
  isbn?: string;
  booksGenreId?: string;
};

type RakutenResponse = {
  Items?: Array<{ Item: RakutenItem }>;
  error?: string;
  error_description?: string;
};

function stripExParam(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/[?&]_ex=\d+x\d+/, '');
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const appId = process.env.EXPO_PUBLIC_RAKUTEN_APP_ID;
  const accessKey = process.env.EXPO_PUBLIC_RAKUTEN_ACCESS_KEY;
  if (!appId) throw new Error('EXPO_PUBLIC_RAKUTEN_APP_ID が .env.local に設定されていません');
  if (!accessKey) throw new Error('EXPO_PUBLIC_RAKUTEN_ACCESS_KEY が .env.local に設定されていません');

  const res = await fetch(
    `https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404` +
    `?format=json` +
    `&applicationId=${appId}` +
    `&accessKey=${accessKey}` +
    `&title=${encodeURIComponent(trimmed)}` +
    `&hits=30`,
  );

  if (!res.ok) throw new Error(`APIエラー: HTTP ${res.status}`);

  const data: RakutenResponse = await res.json();
  if (data.error) throw new Error(`楽天APIエラー: ${data.error_description ?? data.error}`);

  return (data.Items ?? []).map(({ Item: item }) => ({
    title:    item.title ?? '',
    author:   item.author || undefined,
    coverUrl: stripExParam(item.largeImageUrl || item.mediumImageUrl),
    isbn:     item.isbn || undefined,
    price:    typeof item.itemPrice === 'number' ? item.itemPrice : undefined,
    genreId:  item.booksGenreId || undefined,
  }));
}
