
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Product, User, Category, News } from './types';

const supabaseUrl = 'https://dybizeczoftefwxjptkm.supabase.co';
const supabaseKey = 'sb_publishable_K6eACFcZ35n_bXocHNC-zQ_Tk1vW-9y';
const supabase = createClient(supabaseUrl, supabaseKey);

// Máscara de preço para o input (125000 -> 1.250,00)
const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

// Converte string formatada (1.250,00) de volta para número (1250.00)
const parseCurrencyToNumber = (formattedValue: string) => {
  return Number(formattedValue.replace(/\./g, "").replace(",", "."));
};

const Logo = () => (
  <div className="flex items-center space-x-2 cursor-pointer group">
    <div className="bg-white p-2 rounded-lg text-primary shadow-lg transition-transform group-hover:scale-110">
      <i className="fas fa-microchip text-2xl"></i>
    </div>
    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase flex items-baseline">
      verbenaTec<span className="text-[0.45em] text-blue-300 ml-0.5 leading-none bg-white/10 px-1 rounded">.tr</span>
    </h1>
  </div>
);

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('verbenatec_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTab, setAdminTab] = useState<'product' | 'news'>('product');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Estados para máscaras de preço
  const [priceLowDisplay, setPriceLowDisplay] = useState("");
  const [priceHighDisplay, setPriceHighDisplay] = useState("");
  
  const [newsCategory, setNewsCategory] = useState<Category>('celular');
  const [selectedNewsProducts, setSelectedNewsProducts] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const { data: pData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: nData } = await supabase.from('news').select('*').order('created_at', { ascending: false });
      
      if (pData) {
        setProducts(pData.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          qualityScore: p.quality_score,
          priceHigh: p.price_high,
          priceLow: p.price_low,
          mostTalkedAbout: p.most_talked_about,
          isTopTen: p.is_top_ten,
          rank: p.rank,
          imageUrl: p.image_url,
          affiliateUrl: p.affiliate_url,
          amazonUrl: p.amazon_url,
          review: p.review
        })));
      }

      if (nData) {
        setNews(nData.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          imageUrl: n.image_url,
          date: n.date,
          relatedProductIds: n.related_product_ids
        })));
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('verbenatec_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (editingItem && adminTab === 'product') {
      setPriceLowDisplay(editingItem.priceLow?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "");
      setPriceHighDisplay(editingItem.priceHigh?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "");
    } else {
      setPriceLowDisplay("");
      setPriceHighDisplay("");
    }
  }, [editingItem, adminTab]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    if (isSignUp) {
      const { error } = await supabase.from('site_users').insert([{ email, password, name, is_admin: email === 'emanuelrothmamn@gmail.com' }]);
      if (!error) {
        alert("Conta criada!");
        setIsSignUp(false);
      } else {
        alert("Erro: " + error.message);
      }
    } else {
      if (email === 'emanuelrothmamn@gmail.com' && password === 'senhadmin') {
        setUser({ email, isAdmin: true, name: 'Emanuel Admin' });
        setShowLoginModal(false);
        setIsMenuOpen(false);
        return;
      }
      const { data } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).single();
      if (data) {
        setUser({ email: data.email, isAdmin: data.is_admin, name: data.name || data.email });
        setShowLoginModal(false);
        setIsMenuOpen(false);
      } else {
        alert("Falha no login.");
      }
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9);
    
    const productData = {
      id,
      name: formData.get('name') as string,
      category: formData.get('category') as Category,
      description: formData.get('description') as string,
      quality_score: Number(formData.get('qualityScore')),
      price_high: parseCurrencyToNumber(priceHighDisplay),
      price_low: parseCurrencyToNumber(priceLowDisplay),
      most_talked_about: formData.get('mostTalkedAbout') === 'on',
      is_top_ten: formData.get('isTopTen') === 'on',
      rank: formData.get('rank') ? Number(formData.get('rank')) : null,
      image_url: formData.get('imageUrl') as string || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800",
      affiliate_url: formData.get('affiliateUrl') as string,
      amazon_url: formData.get('amazonUrl') as string || null,
      review: formData.get('review') as string,
    };

    const { error } = await (editingItem 
      ? supabase.from('products').update(productData).eq('id', id)
      : supabase.from('products').insert([productData]));

    if (!error) {
      await fetchData();
      setShowAdminModal(false);
      setEditingItem(null);
    } else {
      alert("Erro ao salvar produto: " + error.message);
    }
  };

  const handleSaveNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const id = editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9);
    const date = editingItem ? editingItem.date : new Date().toLocaleDateString('pt-BR');

    const newsData = {
      id,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: newsCategory,
      image_url: formData.get('imageUrl') as string || "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=800",
      date,
      related_product_ids: selectedNewsProducts
    };

    const { error } = await (editingItem 
      ? supabase.from('news').update(newsData).eq('id', id)
      : supabase.from('news').insert([newsData]));

    if (!error) {
      await fetchData();
      setShowAdminModal(false);
      setEditingItem(null);
      setSelectedNewsProducts([]);
    } else {
      alert("Erro ao salvar notícia: " + error.message);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('CUIDADO: Isso excluirá o item PARA TODOS os usuários do site. Confirmar?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        setProducts(prev => prev.filter(p => p.id !== id));
        if (selectedProductId === id) setSelectedProductId(null);
        alert("Produto excluído globalmente.");
      } else {
        alert("Erro Supabase Delete: " + error.message);
      }
    }
  };

  const handleDeleteNews = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('CUIDADO: Isso excluirá a notícia PARA TODOS os usuários do site. Confirmar?')) {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (!error) {
        setNews(prev => prev.filter(n => n.id !== id));
        if (selectedNewsId === id) setSelectedNewsId(null);
        alert("Notícia excluída globalmente.");
      } else {
        alert("Erro Supabase Delete: " + error.message);
      }
    }
  };

  const categoryLists = useMemo(() => {
    if (activeCategory === 'all') return null;
    const catProducts = products.filter(p => p.category === activeCategory);
    return {
      best: [...catProducts].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0)).slice(0, 10),
      lowestPrice: [...catProducts].sort((a, b) => (a.priceLow || 0) - (b.priceLow || 0)).slice(0, 10)
    };
  }, [products, activeCategory]);

  const topTenHome = products.filter(p => p.isTopTen).sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 10);
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedNews = news.find(n => n.id === selectedNewsId);

  const ProductCard: React.FC<{ product: Product, rankLabel?: string }> = ({ product, rankLabel }) => (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 h-full group relative">
      {user?.isAdmin && (
        <div className="absolute top-2 right-2 z-10 flex space-x-2">
          <button onClick={(e) => { e.stopPropagation(); setEditingItem(product); setAdminTab('product'); setShowAdminModal(true); }} className="bg-blue-500 text-white p-2 rounded-lg text-[10px] shadow-lg"><i className="fas fa-edit"></i></button>
          <button onClick={(e) => handleDeleteProduct(product.id, e)} className="bg-red-500 text-white p-2 rounded-lg text-[10px] shadow-lg"><i className="fas fa-trash"></i></button>
        </div>
      )}
      <div className="relative h-44 cursor-pointer overflow-hidden" onClick={() => { setSelectedProductId(product.id); setSelectedNewsId(null); window.scrollTo(0,0); }}>
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
        {rankLabel && (
          <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">
            {rankLabel}
          </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h4 className="font-black text-sm uppercase line-clamp-1 mb-2 hover:text-primary cursor-pointer" onClick={() => setSelectedProductId(product.id)}>{product.name}</h4>
        <div className="mt-auto pt-2 border-t border-gray-50 dark:border-gray-700 space-y-3">
          <div className="flex flex-col">
            {product.priceHigh && product.priceHigh > product.priceLow && (
              <span className="text-[10px] text-gray-400 line-through">R$ {product.priceHigh.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
            <div className="flex justify-between items-end">
              <span className="text-sm font-black text-primary dark:text-blue-400">R$ {product.priceLow?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span className="text-blue-500 font-bold text-xs">Nota {product.qualityScore}</span>
            </div>
          </div>
          <button onClick={() => setSelectedProductId(product.id)} className="w-full bg-blue-50 dark:bg-blue-900/20 text-primary dark:text-blue-400 py-2 rounded-lg font-black text-[10px] uppercase border border-primary/20 hover:bg-primary hover:text-white transition">Review Completa</button>
          <div className="flex gap-2">
            <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer" className="flex-grow bg-primary text-white text-center py-2 rounded-lg font-black text-[10px] uppercase">M. Livre</a>
            {product.amazonUrl && <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex-grow bg-yellow-500 text-black text-center py-2 rounded-lg font-black text-[10px] uppercase">Amazon</a>}
          </div>
        </div>
      </div>
    </div>
  );

  const NewsCard: React.FC<{ item: News }> = ({ item }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-lg group hover:shadow-2xl transition-all duration-300 relative">
      {user?.isAdmin && (
        <div className="absolute top-4 right-4 z-10 flex space-x-2">
           <button onClick={() => { setEditingItem(item); setAdminTab('news'); setShowAdminModal(true); setNewsCategory(item.category); setSelectedNewsProducts(item.relatedProductIds || []); }} className="bg-blue-500 text-white p-2 rounded-lg text-xs"><i className="fas fa-edit"></i></button>
           <button onClick={(e) => handleDeleteNews(item.id, e)} className="bg-red-500 text-white p-2 rounded-lg text-xs"><i className="fas fa-trash"></i></button>
        </div>
      )}
      <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => { setSelectedNewsId(item.id); window.scrollTo(0,0); }}>
        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        <span className="absolute top-4 left-4 bg-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">{item.category}</span>
      </div>
      <div className="p-6">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.date}</span>
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter mt-2 mb-4 group-hover:text-primary cursor-pointer" onClick={() => setSelectedNewsId(item.id)}>{item.title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6">{item.content}</p>
        <button onClick={() => setSelectedNewsId(item.id)} className="text-primary dark:text-blue-400 font-black text-xs uppercase hover:underline">Ler notícia completa</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white mb-6"></div>
        <p className="font-black uppercase tracking-widest text-xs">Sincronizando Banco de Dados Global...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 dark:text-gray-100 text-gray-900 bg-white dark:bg-gray-950">
      
      {/* HEADER COM MENU HAMBÚRGUER */}
      <header className="sticky top-0 z-50 w-full bg-primary/95 dark:bg-gray-950/90 backdrop-blur-md border-b border-primary/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div onClick={() => { setActiveCategory('all'); setSelectedProductId(null); setSelectedNewsId(null); setIsMenuOpen(false); }}>
            <Logo />
          </div>

          <div className="hidden lg:flex items-center space-x-6 text-[10px] font-black uppercase tracking-widest text-white/90">
            {['all', 'celular', 'fones', 'videogames', 'jogos', 'acessorios'].map((cat) => (
              <button 
                key={cat}
                onClick={() => { setActiveCategory(cat as any); setSelectedProductId(null); setSelectedNewsId(null); window.scrollTo(0,0); }} 
                className={`hover:text-blue-400 transition pb-1 ${activeCategory === cat ? 'text-blue-400 border-b-2 border-blue-400' : ''}`}
              >
                {cat === 'all' ? 'Início' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center">
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-12 h-12 flex items-center justify-center text-white text-2xl hover:bg-white/10 rounded-lg transition"
             >
                <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
             </button>
          </div>
        </div>

        {/* MENU LATERAL / HAMBÚRGUER DROPDOWN */}
        {isMenuOpen && (
          <div className="absolute top-20 right-0 w-full md:max-w-xs bg-white dark:bg-gray-900 border-b md:border-l border-gray-100 dark:border-gray-800 shadow-2xl animate-in slide-in-from-right duration-300">
             <div className="p-6 space-y-6">
                <div className="space-y-2 lg:hidden">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Categorias</p>
                   {['all', 'celular', 'fones', 'videogames', 'jogos', 'acessorios'].map((cat) => (
                      <button key={cat} onClick={() => { setActiveCategory(cat as any); setSelectedProductId(null); setSelectedNewsId(null); setIsMenuOpen(false); }} className="w-full text-left py-2 text-sm font-black uppercase hover:text-primary transition">{cat}</button>
                   ))}
                </div>

                <div className="border-t dark:border-gray-800 pt-6 space-y-4">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Configurações</p>
                   <button onClick={() => { setIsDarkMode(!isDarkMode); setIsMenuOpen(false); }} className="flex items-center space-x-3 w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold transition">
                      <i className={`fas ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon text-blue-500'}`}></i>
                      <span>Modo {isDarkMode ? 'Claro' : 'Escuro'}</span>
                   </button>
                   
                   {user ? (
                      <div className="space-y-3">
                         <div className="p-4 bg-primary/10 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-primary mb-1">Usuário</p>
                            <p className="font-bold text-sm truncate">{user.name}</p>
                         </div>
                         {user.isAdmin && (
                            <button onClick={() => { setEditingItem(null); setShowAdminModal(true); setIsMenuOpen(false); }} className="w-full bg-blue-500 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg">Painel Administrativo</button>
                         )}
                         <button onClick={() => { setUser(null); setIsMenuOpen(false); }} className="w-full text-red-500 font-black uppercase text-[10px] hover:underline">Sair</button>
                      </div>
                   ) : (
                      <button onClick={() => { setIsSignUp(false); setShowLoginModal(true); setIsMenuOpen(false); }} className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl">Entrar / Cadastrar</button>
                   )}
                </div>
             </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {selectedNews ? (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            <button onClick={() => setSelectedNewsId(null)} className="mb-8 flex items-center text-primary dark:text-blue-400 font-black uppercase text-xs">
              <i className="fas fa-arrow-left mr-2"></i> Voltar para Notícias
            </button>
            <article className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-64 md:h-96 object-cover" />
              <div className="p-8 md:p-16">
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8 leading-tight">{selectedNews.title}</h1>
                <div className="text-gray-700 dark:text-gray-200 text-lg md:text-xl whitespace-pre-line leading-relaxed mb-12">{selectedNews.content}</div>
                
                {/* PRODUTOS RELACIONADOS NA NOTÍCIA */}
                {selectedNews.relatedProductIds && selectedNews.relatedProductIds.length > 0 && (
                  <div className="border-t dark:border-gray-800 pt-10">
                    <h3 className="text-xl font-black uppercase mb-6 flex items-center">
                      <i className="fas fa-link text-primary mr-3"></i> Itens Relacionados
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {products.filter(p => selectedNews.relatedProductIds?.includes(p.id)).map(p => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </div>
        ) : selectedProduct ? (
          <div className="max-w-4xl mx-auto animate-in fade-in">
            <button onClick={() => setSelectedProductId(null)} className="mb-8 flex items-center text-primary dark:text-blue-400 font-black uppercase text-xs tracking-widest">
              <i className="fas fa-arrow-left mr-2"></i> Voltar
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-64 md:h-96 object-cover" />
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                   <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">{selectedProduct.name}</h2>
                   <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-primary/20">
                      <p className="text-[10px] font-black uppercase text-primary opacity-70">Localização no Ranking</p>
                      <p className="font-black text-xl text-primary">#{selectedProduct.rank || '?'} em {selectedProduct.category}</p>
                   </div>
                </div>
                
                <div className="flex items-center space-x-6 mb-10">
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-gray-400">Avaliação Técnica</p>
                      <p className="text-4xl font-black text-blue-500">{selectedProduct.qualityScore}/10</p>
                   </div>
                   <div className="h-10 w-px bg-gray-200 dark:bg-gray-800"></div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-gray-400">Preço em Oferta</p>
                      <div className="flex items-baseline space-x-2">
                        <p className="text-2xl font-black text-primary dark:text-blue-400">R$ {selectedProduct.priceLow?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {selectedProduct.priceHigh && selectedProduct.priceHigh > selectedProduct.priceLow && (
                          <span className="text-sm text-gray-400 line-through">R$ {selectedProduct.priceHigh.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                   </div>
                </div>

                <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-200 text-lg whitespace-pre-line mb-12">
                   {selectedProduct.review || selectedProduct.description}
                </div>

                <div className="flex flex-col md:flex-row gap-4 border-t dark:border-gray-800 pt-8">
                  <a href={selectedProduct.affiliateUrl} target="_blank" rel="noopener noreferrer" className="flex-grow bg-primary text-white text-center py-4 rounded-xl font-black uppercase transition hover:bg-blue-800 shadow-xl">Comprar no Mercado Livre</a>
                  {selectedProduct.amazonUrl && <a href={selectedProduct.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex-grow bg-yellow-500 text-black text-center py-4 rounded-xl font-black uppercase transition hover:bg-yellow-600 shadow-xl">Ver na Amazon</a>}
                </div>
              </div>
            </div>
          </div>
        ) : activeCategory === 'all' ? (
          <div className="space-y-16">
            <section>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-8 border-l-8 border-primary pl-4">Radar de Notícias</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {news.map(item => <NewsCard key={item.id} item={item} />)}
              </div>
            </section>
            
            <section className="bg-gray-50 dark:bg-gray-800/50 -mx-4 px-4 py-16 rounded-[2rem] md:rounded-[4rem]">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-xl font-black uppercase mb-10 text-center tracking-widest">🏆 Ranking Geral da Home</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {topTenHome.map(p => <ProductCard key={p.id} product={p} rankLabel={`HOME #${p.rank}`} />)}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
               <h2 className="text-2xl md:text-4xl font-black uppercase text-primary tracking-tighter mb-4">{activeCategory}</h2>
               <div className="w-24 h-1.5 bg-primary mx-auto rounded-full"></div>
            </div>
            
            <section>
               <h3 className="text-lg md:text-xl font-black uppercase mb-8 flex items-center"><i className="fas fa-medal text-yellow-500 mr-3"></i> Top 10 Melhores {activeCategory}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                 {categoryLists?.best.map((p, i) => <ProductCard key={p.id} product={p} rankLabel={`Rank #${i + 1}`} />)}
               </div>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900/50 -mx-4 px-4 py-16 rounded-[2rem] md:rounded-[4rem]">
               <div className="max-w-7xl mx-auto">
                 <h3 className="text-lg md:text-xl font-black uppercase mb-8 flex items-center"><i className="fas fa-tags text-green-500 mr-3"></i> Top 10 {activeCategory} com os menores preços</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                   {categoryLists?.lowestPrice.map((p, i) => <ProductCard key={p.id} product={p} rankLabel={`Oferta`} />)}
                 </div>
               </div>
            </section>
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-8 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black uppercase tracking-tighter">{isSignUp ? 'Nova Conta' : 'Acesso Administrador'}</h2><button onClick={() => setShowLoginModal(false)}><i className="fas fa-times"></i></button></div>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && <input name="name" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 outline-none focus:border-primary transition" placeholder="Nome" />}
              <input name="email" type="email" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 outline-none focus:border-primary transition" placeholder="Email" />
              <input name="password" type="password" required className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 outline-none focus:border-primary transition" placeholder="Senha" />
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl">{isSignUp ? 'Criar Conta' : 'Fazer Login'}</button>
            </form>
            <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-xs font-bold text-gray-400 uppercase hover:text-primary transition">
              {isSignUp ? 'Já possui acesso? Clique aqui' : 'Ainda não tem conta? Clique aqui'}
            </button>
          </div>
        </div>
      )}

      {/* ADMIN MODAL */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/95 overflow-y-auto py-10">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl p-6 md:p-10 my-auto">
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">{editingItem ? 'Editar Registro Global' : 'Adicionar Novo Registro'}</h2>
               <button onClick={() => { setShowAdminModal(false); setEditingItem(null); setPriceHighDisplay(""); setPriceLowDisplay(""); }}><i className="fas fa-times text-2xl"></i></button>
            </div>
            
            <div className="flex space-x-4 mb-8">
              <button onClick={() => setAdminTab('product')} className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] ${adminTab === 'product' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>Produtos</button>
              <button onClick={() => setAdminTab('news')} className={`px-4 py-2 rounded-lg font-black uppercase text-[10px] ${adminTab === 'news' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>Notícias</button>
            </div>

            {adminTab === 'product' ? (
              <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" defaultValue={editingItem?.name} required className="col-span-full bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="Nome do Produto" />
                <select name="category" defaultValue={editingItem?.category} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none">
                  {['celular', 'fones', 'videogames', 'jogos', 'acessorios'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="imageUrl" defaultValue={editingItem?.imageUrl} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="URL da Imagem" />
                <input name="affiliateUrl" defaultValue={editingItem?.affiliateUrl} required className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="Link Mercado Livre" />
                <input name="amazonUrl" defaultValue={editingItem?.amazonUrl} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="Link Amazon (Opcional)" />
                <input name="qualityScore" defaultValue={editingItem?.qualityScore} type="number" step="0.1" className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="Nota Técnica (0-10)" />
                
                {/* Inputs de preço com máscara */}
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-black mb-1 ml-1 text-gray-400">Preço Atual (Venda)</label>
                  <input 
                    value={priceLowDisplay} 
                    onChange={(e) => setPriceLowDisplay(formatCurrencyInput(e.target.value))}
                    placeholder="R$ 0,00" required
                    className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none font-bold text-primary" 
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-black mb-1 ml-1 text-gray-400">Preço Original (Riscado)</label>
                  <input 
                    value={priceHighDisplay} 
                    onChange={(e) => setPriceHighDisplay(formatCurrencyInput(e.target.value))}
                    placeholder="R$ 0,00 (opcional)" 
                    className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" 
                  />
                </div>

                <input name="rank" defaultValue={editingItem?.rank} type="number" className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="Posição no Ranking (1-10)" />
                <textarea name="description" defaultValue={editingItem?.description} required className="col-span-full bg-gray-100 dark:bg-gray-800 p-4 rounded-xl h-20 outline-none" placeholder="Resumo simples" />
                <textarea name="review" defaultValue={editingItem?.review} className="col-span-full bg-gray-100 dark:bg-gray-800 p-4 rounded-xl h-40 outline-none" placeholder="Análise completa e detalhada..." />
                
                <div className="col-span-full flex flex-wrap gap-6 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input name="isTopTen" defaultChecked={editingItem?.isTopTen} type="checkbox" className="w-5 h-5 accent-primary" /> 
                    <span className="text-[10px] font-black uppercase">Exibir na Home</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input name="mostTalkedAbout" defaultChecked={editingItem?.mostTalkedAbout} type="checkbox" className="w-5 h-5 accent-primary" /> 
                    <span className="text-[10px] font-black uppercase">Produto em Tendência (🔥)</span>
                  </label>
                </div>
                <button type="submit" className="col-span-full bg-primary text-white py-5 rounded-xl font-black uppercase shadow-xl hover:bg-blue-800 transition">Salvar Alterações Globalmente</button>
              </form>
            ) : (
              <form onSubmit={handleSaveNews} className="grid grid-cols-1 gap-4">
                <input name="title" defaultValue={editingItem?.title} required className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="Título da Notícia" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={newsCategory} onChange={(e) => setNewsCategory(e.target.value as Category)} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none">
                    {['celular', 'fones', 'videogames', 'jogos', 'acessorios'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input name="imageUrl" defaultValue={editingItem?.imageUrl} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" placeholder="URL da Imagem Principal" />
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl">
                   <p className="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center"><i className="fas fa-link mr-2"></i> Vincular Itens Relacionados</p>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {products.map(p => (
                         <label key={p.id} className="flex items-center space-x-2 text-[10px] font-bold p-3 bg-white dark:bg-gray-700 rounded-xl cursor-pointer border dark:border-gray-600 hover:border-primary transition">
                            <input 
                               type="checkbox" 
                               checked={selectedNewsProducts.includes(p.id)}
                               onChange={(e) => {
                                  if(e.target.checked) setSelectedNewsProducts([...selectedNewsProducts, p.id]);
                                  else setSelectedNewsProducts(selectedNewsProducts.filter(id => id !== p.id));
                               }}
                               className="w-4 h-4"
                            />
                            <span className="truncate">{p.name}</span>
                         </label>
                      ))}
                   </div>
                </div>

                <textarea name="content" defaultValue={editingItem?.content} required className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl h-64 outline-none" placeholder="Escreva o conteúdo da notícia..." />
                <button type="submit" className="bg-primary text-white py-5 rounded-xl font-black uppercase shadow-xl hover:bg-blue-800 transition">Publicar Notícia Global</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
