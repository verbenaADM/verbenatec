
export type Category = 'celular' | 'fones' | 'videogames' | 'jogos' | 'acessorios';

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  qualityScore: number; // 1-10
  priceHigh: number;
  priceLow: number;
  mostTalkedAbout: boolean;
  isTopTen: boolean;
  rank?: number;
  imageUrl: string;
  affiliateUrl: string; // Mercado Livre
  amazonUrl?: string;   // Amazon
  review?: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  category: Category;
  imageUrl: string;
  date: string;
  relatedProductIds?: string[];
}

export interface User {
  email: string;
  isAdmin: boolean;
  name: string;
}
