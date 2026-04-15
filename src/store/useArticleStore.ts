import { create } from 'zustand';
import { articleApi } from '@/api/articleApi';
import type { IArticle, IArticleFilter, IDepot } from '@/types/article';

interface ArticleState {
  articles: IArticle[];
  totalCount: number;
  loading: boolean;
  selectedId: number;
  filter: IArticleFilter;
  depots: IDepot[];
  setFilter: (f: Partial<IArticleFilter>) => void;
  setSelectedId: (id: number) => void;
  fetchArticles: () => Promise<void>;
  fetchDepots: () => Promise<void>;
  deleteArticle: (cbMarq: number) => Promise<void>;
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  articles: [],
  totalCount: 0,
  loading: false,
  selectedId: 0,
  depots: [],
  filter: { pageIndex: 1, pageSize: 20 },

  setFilter: (f) => set((s) => ({ filter: { ...s.filter, ...f, pageIndex: 1 } })),
  setSelectedId: (id) => set({ selectedId: id }),

  fetchArticles: async () => {
    set({ loading: true });
    const response = await articleApi.getArticles(get().filter);
    const data = (response as any).data;
    set({
      articles: data?.data ?? data ?? [],
      totalCount: data?.totalCount ?? 0,
      loading: false,
    });
  },

  fetchDepots: async () => {
    const response = await articleApi.getDepots();
    set({ depots: (response as any).data ?? [] });
  },

  deleteArticle: async (cbMarq) => {
    await articleApi.remove(cbMarq);
    await get().fetchArticles();
  },
}));