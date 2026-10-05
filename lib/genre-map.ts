/**
 * 楽天ブックスジャンルID → 日本語名マッピング
 * Source: BooksGenre/Search API (booksGenreId=001, level 2 children)
 *
 * booksGenreId は 9桁まであるが、先頭6桁が大カテゴリ（level 2）に対応する。
 * 本の詳細画面やフィルターでは先頭6桁で照合する。
 */

export type GenreEntry = {
  id: string;
  name: string;
  /** フィルター UI に表示するかどうか（マイナーなものは false） */
  showInFilter: boolean;
};

/** 大カテゴリ（level 2）の完全一覧 */
export const GENRE_MAP: Record<string, GenreEntry> = {
  '001001': { id: '001001', name: '漫画（コミック）',          showInFilter: true  },
  '001002': { id: '001002', name: '語学・学習参考書',           showInFilter: true  },
  '001003': { id: '001003', name: '絵本・児童書・図鑑',         showInFilter: true  },
  '001004': { id: '001004', name: '小説・エッセイ',             showInFilter: true  },
  '001005': { id: '001005', name: 'パソコン・システム開発',      showInFilter: true  },
  '001006': { id: '001006', name: 'ビジネス・経済・就職',        showInFilter: true  },
  '001007': { id: '001007', name: '旅行・留学・アウトドア',      showInFilter: true  },
  '001008': { id: '001008', name: '人文・思想・社会',           showInFilter: true  },
  '001009': { id: '001009', name: 'ホビー・スポーツ・美術',      showInFilter: true  },
  '001010': { id: '001010', name: '美容・暮らし・健康・料理',    showInFilter: true  },
  '001011': { id: '001011', name: 'エンタメ・ゲーム',           showInFilter: true  },
  '001012': { id: '001012', name: '科学・技術',                showInFilter: true  },
  '001013': { id: '001013', name: '写真集・タレント',           showInFilter: false },
  '001016': { id: '001016', name: '資格・検定',                showInFilter: true  },
  '001017': { id: '001017', name: 'ライトノベル',              showInFilter: true  },
  '001018': { id: '001018', name: '楽譜',                     showInFilter: false },
  '001019': { id: '001019', name: '文庫',                     showInFilter: true  },
  '001020': { id: '001020', name: '新書',                     showInFilter: true  },
  '001021': { id: '001021', name: 'ボーイズラブ（BL）',         showInFilter: false },
  '001022': { id: '001022', name: '付録付き',                  showInFilter: false },
  '001023': { id: '001023', name: 'バーゲン本',                showInFilter: false },
  '001025': { id: '001025', name: 'セット本',                  showInFilter: false },
  '001026': { id: '001026', name: 'カレンダー・手帳・家計簿',   showInFilter: false },
  '001027': { id: '001027', name: '文具・雑貨',                showInFilter: false },
  '001028': { id: '001028', name: '医学・薬学・看護学',         showInFilter: true  },
  '001029': { id: '001029', name: 'ティーンズラブ（TL）',       showInFilter: false },
};

/**
 * booksGenreId（最大9桁）からジャンル名を返す。
 * 先頭6桁で大カテゴリに照合し、未知の場合は "その他" を返す。
 */
export function getGenreName(genreId: string | undefined | null): string {
  if (!genreId) return 'その他';
  const topId = genreId.slice(0, 6);
  return GENRE_MAP[topId]?.name ?? 'その他';
}

/**
 * booksGenreId から大カテゴリID（先頭6桁）を返す。
 */
export function getTopGenreId(genreId: string | undefined | null): string | undefined {
  if (!genreId) return undefined;
  const topId = genreId.slice(0, 6);
  return GENRE_MAP[topId] ? topId : undefined;
}

/**
 * フィルター UI 用のジャンル一覧（showInFilter === true のもののみ）。
 */
export const FILTER_GENRES: GenreEntry[] = Object.values(GENRE_MAP)
  .filter((g) => g.showInFilter);
