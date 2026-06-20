import { create } from 'zustand';
import { Article, CatalogItem, DeletionRequest, HydrominesCatalogItem } from '../../types';

interface ArticlesState {
  articles: Article[];
  catalog: CatalogItem[];
  hydrominesCatalog: HydrominesCatalogItem[];
  deletionRequests: DeletionRequest[];
  setArticles: (articles: Article[] | ((prev: Article[]) => Article[])) => void;
  setCatalog: (catalog: CatalogItem[] | ((prev: CatalogItem[]) => CatalogItem[])) => void;
  setHydrominesCatalog: (catalog: HydrominesCatalogItem[] | ((prev: HydrominesCatalogItem[]) => HydrominesCatalogItem[])) => void;
  setDeletionRequests: (requests: DeletionRequest[] | ((prev: DeletionRequest[]) => DeletionRequest[])) => void;
  
  // Actions
  addArticleLocal: (a: Article) => void;
  updateArticleLocal: (id: string, a: Partial<Article>) => void;
  deleteArticleLocal: (id: string) => void;
  deleteArticlesLocal: (ids: string[]) => void;
  addDeletionRequestLocal: (req: DeletionRequest) => void;
  updateDeletionRequestStatusLocal: (reqId: string, status: 'APPROVED' | 'REJECTED') => void;
  
  // Hydromines Catalog Actions
  addHydrominesCatalogItemLocal: (item: HydrominesCatalogItem) => void;
  updateHydrominesCatalogItemLocal: (id: string, item: Partial<HydrominesCatalogItem>) => void;
}

export const useArticlesStore = create<ArticlesState>((set) => ({
  articles: [],
  catalog: [],
  hydrominesCatalog: [],
  deletionRequests: [],
  setArticles: (arg) => set((state) => ({
    articles: typeof arg === 'function' ? (arg as Function)(state.articles) : arg
  })),
  setCatalog: (arg) => set((state) => ({
    catalog: typeof arg === 'function' ? (arg as Function)(state.catalog) : arg
  })),
  setHydrominesCatalog: (arg) => set((state) => ({
    hydrominesCatalog: typeof arg === 'function' ? (arg as Function)(state.hydrominesCatalog) : arg
  })),
  setDeletionRequests: (arg) => set((state) => ({
    deletionRequests: typeof arg === 'function' ? (arg as Function)(state.deletionRequests) : arg
  })),
  
  addArticleLocal: (a) => set((state) => ({ 
    articles: [a, ...state.articles] 
  })),
  
  updateArticleLocal: (id, updatedFields) => set((state) => ({
    articles: state.articles.map(art => art.id === id ? { ...art, ...updatedFields } : art)
  })),

  deleteArticleLocal: (id) => set((state) => ({
    articles: state.articles.filter(art => art.id !== id)
  })),

  deleteArticlesLocal: (ids) => set((state) => ({
    articles: state.articles.filter(art => !ids.includes(art.id))
  })),

  addDeletionRequestLocal: (req) => set((state) => ({
    deletionRequests: [req, ...state.deletionRequests]
  })),

  updateDeletionRequestStatusLocal: (reqId, status) => set((state) => ({
    deletionRequests: state.deletionRequests.map(req => 
      req.id === reqId ? { ...req, status } : req
    )
  })),

  addHydrominesCatalogItemLocal: (item) => set((state) => ({
    hydrominesCatalog: [item, ...state.hydrominesCatalog]
  })),

  updateHydrominesCatalogItemLocal: (id, updatedFields) => set((state) => ({
    hydrominesCatalog: state.hydrominesCatalog.map(item => item.id === id ? { ...item, ...updatedFields } : item)
  }))
}));
