
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Product, User, Category, News } from './types';

// Supabase Client Initialization
const supabaseUrl = 'https://dybizeczoftefwxjptkm.supabase.co';
const supabaseKey = 'sb_publishable_K6eACFcZ35n_bXocHNC-zQ_Tk1vW-9y';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helpers de Performance e Formatação ---
const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
};

const parseCurrencyToNumber = (formattedValue: string) => {
  if (!formattedValue) return 0;
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
  // --- Estados Core ---
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('verbenatec_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // --- Estados de UI ---
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

  // --- Estados de Formulário ---
  const [priceLowDisplay, setPriceLowDisplay] = useState("");
  const [priceHighDisplay, setPriceHighDisplay] = useState("");
  const [selectedNewsProducts, setSelectedNewsProducts] = useState<string[]>([]);

  // --- Data Fetching (Otimizado) ---
  const fetchData = useCallback(async () => {
    try {
      const [{ data: pData }, { data: nData }] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('news').select('*').order('created_at', { ascending: false })
      ]);
      
      if (pData) setProducts(pData.map(p => ({
        id: p.id, name: p.name, category: p.category, description: p.description,
        qualityScore: p.quality_score, priceHigh: p.price_high, priceLow: p.price_low,
        mostTalkedAbout: p.most_talked_about, isTopTen: p.is_top_ten, rank: p.rank,
        imageUrl: p.image_url, affiliateUrl: p.affiliate_url, amazonUrl: p.amazon_url, review: p.review
      })));

      if (nData) setNews(nData.map(n => ({
        id: n.id, title: n.title, content: n.content, category: n.category,
        imageUrl: n.image_url, date: n.date, relatedProductIds: n.related_product_ids || []
      })));
    } catch (err) {
      console.error("Critical Sync Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    localStorage.setItem('verbenatec_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Sincroniza campos de preço ao editar
  useEffect(() => {
    if (editingItem && adminTab === 'product') {
      setPriceLowDisplay(editingItem.priceLow?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "");
      setPriceHighDisplay(editingItem.priceHigh?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "");
    }
  }, [editingItem, adminTab]);

  // --- Handlers de Ação ---
  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;

    if (isSignUp) {
      const { error } = await supabase.from('site_users').insert([{ 
        email, password, name: fd.get('name'), is_admin: email === 'emanuelrothmamn@gmail.com' 
      }]);
      if (!error) { alert("Sucesso!"); setIsSignUp(false); }
    } else {
      if (email === 'emanuelrothmamn@gmail.com' && password === 'senhadmin') {
        setUser({ email, isAdmin: true, name: 'Admin Verbena' });
        setShowLoginModal(false);
        return;
      }
      const { data } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).single();
      if (data) {
        setUser({ email: data.email, isAdmin: data.is_admin, name: data.name || data.email });
        setShowLoginModal(false);
      } else alert("Credenciais inválidas.");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = editingItem?.id || Math.random().toString(36).substr(2, 9);
    
    const payload = {
      id,
      name: fd.get('name'),
      category: fd.get('category'),
      description: fd.get('description'),
      quality_score: Number(fd.get('qualityScore')),
      price_high: parseCurrencyToNumber(priceHighDisplay),
      price_low: parseCurrencyToNumber(priceLowDisplay),
      most_talked_about: fd.get('mostTalkedAbout') === 'on',
      is_top_ten: fd.get('isTopTen') === 'on',
      rank: fd.get('rank') ? Number(fd.get('rank')) : null,
      image_url: fd.get('imageUrl'),
      affiliate_url: fd.get('affiliateUrl'),
      amazon_url: fd.get('amazonUrl'),
      review: fd.get('review')
    };

    const { error } = await (editingItem 
      ? supabase.from('products').update(payload).eq('id', id)
      : supabase.from('products').insert([payload]));

    if (!error) { fetchData(); setShowAdminModal(false); setEditingItem(null); }
    else alert("Erro: " + error.message);
  };

  const handleSaveNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = editingItem?.id || Math.random().toString(36).substr(2, 9);
    
    const payload = {
      id,
      title: fd.get('title'),
      content: fd.get('content'),
      category: fd.get('category'),
      image_url: fd.get('imageUrl'),
      date: editingItem?.date || new Date().toLocaleDateString('pt-BR'),
      related_product_ids: selectedNewsProducts
    };

    const { error } = await (editingItem 
      ? supabase.from('news').update(payload).eq('id', id)
      : supabase.from('news').insert([payload]));

    if (!error) { fetchData(); setShowAdminModal(false); setEditingItem(null); }
  };

  // --- FIX: Global Delete com Atualização Reativa ---
  const handleDelete = async (type: 'products' | 'news', id: string) => {
    if (!window.confirm("Atenção: Excluir este item removerá ele permanentemente para TODOS os usuários. Confirmar?")) return;
    
    const { error } = await supabase.from(type).delete().eq('id', id);
    if (!error) {
      if (type === 'products') {
        setProducts(prev => prev.filter(p => p.id !== id));
        if (selectedProductId === id) setSelectedProductId(null);
      } else {
        setNews(prev => prev.filter(n => n.id !== id));
        if (selectedNewsId === id) setSelectedNewsId(null);
      }
    } else alert("Falha ao deletar: " + error.message);
  };

  // --- Lógica de Seleção de Itens para Detalhes ---
  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId)
  , [products, selectedProductId]);

  const selectedNews = useMemo(() => 
    news.find(n => n.id === selectedNewsId)
  , [news, selectedNewsId]);

  const homeTopTen = useMemo(() => 
    products.filter(p => p.isTopTen).sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 10)
  , [products]);

  // --- Componentes de UI ---
  const ProductCard = ({ product, label }: { product: Product, label?: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border dark:border-gray-700 group relative flex flex-col h-full">
      {user?.isAdmin && (
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          <button onClick={() => { setEditingItem(product); setAdminTab('product'); setShowAdminModal(true); }} className="bg-blue-600 text-white p-2 rounded-lg text-xs shadow-xl"><i className="fas fa-edit"></i></button>
          <button onClick={() => handleDelete('products', product.id)} className="bg-red-600 text-white p-2 rounded-lg text-xs shadow-xl"><i className="fas fa-trash"></i></button>
        </div>
      )}
      <div className="h-48 overflow-hidden cursor-pointer" onClick={() => setSelectedProductId(product.id)}>
        <img src={product.imageUrl} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" alt={product.name} />
        {label && <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">{label}</div>}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-black text-sm uppercase mb-2 line-clamp-1">{product.name}</h3>
        <div className="mt-auto">
          <div className="flex flex-col mb-4">
            {product.priceHigh > product.priceLow && (
              <span className="text-[10px] text-gray-400 line-through">R$ {product.priceHigh.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            )}
            <span className="text-lg font-black text-primary dark:text-blue-400">R$ {product.priceLow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <button onClick={() => setSelectedProductId(product.id)} className="w-full bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-400 py-2 rounded-xl text-[10px] font-black uppercase mb-2 hover:bg-primary hover:text-white transition">Review Técnica</button>
          <div className="flex gap-2">
            <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-primary text-white text-center py-2 rounded-xl text-[10px] font-black uppercase shadow-md">M. Livre</a>
            {product.amazonUrl && <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-yellow-500 text-black text-center py-2 rounded-xl text-[10px] font-black uppercase shadow-md">Amazon</a>}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-white p-10 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-white mb-6"></div>
      <h2 className="text-xl font-black uppercase tracking-widest">Verbena Sincronizando...</h2>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-white dark:bg-gray-950 transition-colors">
      
      {/* HEADER DINÂMICO COM MENU HAMBÚRGUER */}
      <header className="sticky top-0 z-50 bg-primary/95 dark:bg-gray-950/90 backdrop-blur shadow-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div onClick={() => { setActiveCategory('all'); setSelectedProductId(null); setSelectedNewsId(null); setIsMenuOpen(false); }}>
            <Logo />
          </div>

          <nav className="hidden lg:flex space-x-6 text-[10px] font-black uppercase tracking-widest text-white/90">
            {['all', 'celular', 'fones', 'videogames', 'jogos', 'acessorios'].map(c => (
              <button key={c} onClick={() => { setActiveCategory(c as any); setSelectedProductId(null); setSelectedNewsId(null); }} className={`hover:text-blue-300 transition ${activeCategory === c ? 'text-blue-300' : ''}`}>
                {c === 'all' ? 'Início' : c}
              </button>
            ))}
          </nav>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-12 h-12 flex items-center justify-center text-white bg-white/10 rounded-xl">
            <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>

        {/* DROPDOWN MENU HAMBÚRGUER */}
        {isMenuOpen && (
          <div className="absolute top-20 right-0 w-full md:max-w-sm bg-white dark:bg-gray-900 shadow-2xl animate-in slide-in-from-right overflow-hidden rounded-bl-3xl">
            <div className="p-8 space-y-8">
              <div className="space-y-4 lg:hidden">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Navegação</p>
                {['all', 'celular', 'fones', 'videogames', 'jogos', 'acessorios'].map(c => (
                  <button key={c} onClick={() => { setActiveCategory(c as any); setIsMenuOpen(false); setSelectedProductId(null); setSelectedNewsId(null); }} className="block w-full text-left py-2 font-black uppercase hover:text-primary transition">{c}</button>
                ))}
              </div>
              <div className="space-y-6 pt-6 border-t dark:border-gray-800">
                <button onClick={() => { setIsDarkMode(!isDarkMode); setIsMenuOpen(false); }} className="flex items-center space-x-4 w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold">
                  <i className={`fas ${isDarkMode ? 'fa-sun text-yellow-500' : 'fa-moon text-blue-500'} text-xl`}></i>
                  <span>Alternar para Modo {isDarkMode ? 'Claro' : 'Escuro'}</span>
                </button>
                {user ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary">Conta Conectada</p>
                      <p className="font-bold truncate">{user.name}</p>
                    </div>
                    {user.isAdmin && (
                      <button onClick={() => { setShowAdminModal(true); setIsMenuOpen(false); setEditingItem(null); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Painel Admin</button>
                    )}
                    <button onClick={() => { setUser(null); setIsMenuOpen(false); }} className="w-full text-red-500 font-black uppercase text-[10px] py-2">Sair do Site</button>
                  </div>
                ) : (
                  <button onClick={() => { setShowLoginModal(true); setIsMenuOpen(false); }} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Acessar / Cadastrar</button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {selectedNews ? (
          <article className="max-w-4xl mx-auto animate-in fade-in zoom-in-95">
             <button onClick={() => setSelectedNewsId(null)} className="mb-8 font-black uppercase text-[10px] text-primary flex items-center"><i className="fas fa-arrow-left mr-2"></i> Voltar Notícias</button>
             <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
               <img src={selectedNews.imageUrl} className="w-full h-[500px] object-cover" alt={selectedNews.title} />
               <div className="p-10 md:p-20">
                 <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-10">{selectedNews.title}</h1>
                 <div className="prose dark:prose-invert max-w-none text-xl leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
                   {selectedNews.content}
                 </div>
                 {/* ITENS RELACIONADOS */}
                 {selectedNews.relatedProductIds && selectedNews.relatedProductIds.length > 0 && (
                   <div className="mt-20 pt-10 border-t dark:border-gray-800">
                     <h3 className="text-xl font-black uppercase mb-10 flex items-center"><i className="fas fa-shopping-bag mr-3 text-primary"></i> Itens Mencionados</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {products.filter(p => selectedNews.relatedProductIds?.includes(p.id)).map(p => <ProductCard key={p.id} product={p} />)}
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </article>
        ) : selectedProduct ? (
          <div className="max-w-4xl mx-auto animate-in fade-in">
             <button onClick={() => setSelectedProductId(null)} className="mb-8 font-black uppercase text-[10px] text-primary flex items-center"><i className="fas fa-arrow-left mr-2"></i> Voltar</button>
             <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
                <img src={selectedProduct.imageUrl} className="w-full h-96 object-cover" alt={selectedProduct.name} />
                <div className="p-10 md:p-16">
                   <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-10">
                      <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{selectedProduct.name}</h2>
                      <div className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20">
                        <p className="text-[10px] font-black uppercase text-primary mb-1">Status no Ranking</p>
                        <p className="text-2xl font-black text-primary">#{selectedProduct.rank || 'N/A'} em {selectedProduct.category}</p>
                      </div>
                   </div>
                   <div className="flex items-center space-x-8 mb-12">
                      <div className="text-center">
                         <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Review Nota</p>
                         <p className="text-5xl font-black text-blue-500">{selectedProduct.qualityScore}</p>
                      </div>
                      <div className="h-12 w-px bg-gray-200 dark:bg-gray-800"></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Preço Atual</p>
                         <div className="flex items-baseline space-x-3">
                            <p className="text-3xl font-black text-primary dark:text-blue-400">R$ {selectedProduct.priceLow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            {selectedProduct.priceHigh > selectedProduct.priceLow && (
                              <span className="text-sm text-gray-400 line-through font-bold">R$ {selectedProduct.priceHigh.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            )}
                         </div>
                      </div>
                   </div>
                   <div className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line mb-16">
                      {selectedProduct.review || selectedProduct.description}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t dark:border-gray-800 pt-10">
                      <a href={selectedProduct.affiliateUrl} target="_blank" rel="noopener noreferrer" className="bg-primary text-white text-center py-5 rounded-2xl font-black uppercase shadow-2xl hover:scale-105 transition">Comprar via Mercado Livre</a>
                      {selectedProduct.amazonUrl && (
                        <a href={selectedProduct.amazonUrl} target="_blank" rel="noopener noreferrer" className="bg-yellow-500 text-black text-center py-5 rounded-2xl font-black uppercase shadow-2xl hover:scale-105 transition">Verificar na Amazon</a>
                      )}
                   </div>
                </div>
             </div>
          </div>
        ) : activeCategory === 'all' ? (
          <div className="space-y-24">
            <section>
              <h2 className="text-3xl font-black uppercase tracking-tighter border-l-8 border-primary pl-4 mb-10">Verbena Radar News</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 {news.slice(0, 4).map(n => (
                   <div key={n.id} className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-lg border dark:border-gray-800 group cursor-pointer" onClick={() => setSelectedNewsId(n.id)}>
                      <div className="h-64 overflow-hidden"><img src={n.imageUrl} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" /></div>
                      <div className="p-8">
                         <span className="text-[10px] font-black uppercase text-primary tracking-widest">{n.category} • {n.date}</span>
                         <h3 className="text-2xl font-black uppercase mt-4 mb-4 leading-tight group-hover:text-primary transition">{n.title}</h3>
                         <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">{n.content}</p>
                      </div>
                   </div>
                 ))}
              </div>
            </section>
            <section className="bg-gray-50 dark:bg-gray-900/40 -mx-4 px-4 py-20 rounded-[4rem]">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-black uppercase tracking-widest text-center mb-16">🏆 Top 10 Oficial Verbena</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                   {homeTopTen.map(p => <ProductCard key={p.id} product={p} label={`#${p.rank}`} />)}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-12 animate-in slide-in-from-bottom-6">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-primary mb-4">{activeCategory}</h1>
              <div className="w-32 h-2 bg-primary mx-auto rounded-full"></div>
            </div>
            <section className="max-w-7xl mx-auto">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {products.filter(p => p.category === activeCategory).map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
               </div>
            </section>
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-10 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black uppercase tracking-tighter">{isSignUp ? 'Criar Perfil' : 'Login Admin'}</h2><button onClick={() => setShowLoginModal(false)}><i className="fas fa-times text-2xl"></i></button></div>
              <form onSubmit={handleAuth} className="space-y-4">
                 {isSignUp && <input name="name" required className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Nome Completo" />}
                 <input name="email" type="email" required className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Email" />
                 <input name="password" type="password" required className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Senha" />
                 <button type="submit" className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl">{isSignUp ? 'Cadastrar' : 'Entrar'}</button>
              </form>
              <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-primary transition">{isSignUp ? 'Já tem conta? Login' : 'Novo por aqui? Criar conta'}</button>
           </div>
        </div>
      )}

      {/* ADMIN MODAL REFORMULADO */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto py-20">
           <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-[2.5rem] p-8 md:p-14 my-auto">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">{editingItem ? 'Editar Registro' : 'Publicar Globalmente'}</h2>
                 <button onClick={() => setShowAdminModal(false)} className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full"><i className="fas fa-times text-xl"></i></button>
              </div>
              
              <div className="flex space-x-2 mb-10 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                 <button onClick={() => setAdminTab('product')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] ${adminTab === 'product' ? 'bg-primary text-white shadow-xl' : 'text-gray-500'}`}>Produtos</button>
                 <button onClick={() => setAdminTab('news')} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] ${adminTab === 'news' ? 'bg-primary text-white shadow-xl' : 'text-gray-500'}`}>Notícias</button>
              </div>

              {adminTab === 'product' ? (
                <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input name="name" defaultValue={editingItem?.name} required className="col-span-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Nome do Produto" />
                   <select name="category" defaultValue={editingItem?.category} className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none">
                      {['celular', 'fones', 'videogames', 'jogos', 'acessorios'].map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <input name="imageUrl" defaultValue={editingItem?.imageUrl} required className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="URL da Imagem" />
                   <input name="affiliateUrl" defaultValue={editingItem?.affiliateUrl} required className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Link Mercado Livre" />
                   <input name="amazonUrl" defaultValue={editingItem?.amazonUrl} className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Link Amazon (Opcional)" />
                   
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Preço Original (R$)</label>
                      <input value={priceHighDisplay} onChange={e => setPriceHighDisplay(formatCurrencyInput(e.target.value))} className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="0,00" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-primary ml-4">Preço Oferta (R$)</label>
                      <input value={priceLowDisplay} onChange={e => setPriceLowDisplay(formatCurrencyInput(e.target.value))} required className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold text-primary" placeholder="0,00" />
                   </div>
                   
                   <input name="qualityScore" type="number" step="0.1" defaultValue={editingItem?.qualityScore} className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Nota Review (0-10)" />
                   <input name="rank" type="number" defaultValue={editingItem?.rank} className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="Posição Ranking (1-10)" />
                   <textarea name="description" defaultValue={editingItem?.description} required className="col-span-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none h-24" placeholder="Resumo Comercial" />
                   <textarea name="review" defaultValue={editingItem?.review} className="col-span-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none h-48" placeholder="Análise Técnica Completa..." />
                   
                   <div className="col-span-full flex gap-10 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <label className="flex items-center space-x-3 cursor-pointer"><input name="isTopTen" defaultChecked={editingItem?.isTopTen} type="checkbox" className="w-6 h-6 rounded accent-primary" /> <span className="font-black uppercase text-xs">Aparecer no Top 10</span></label>
                      <label className="flex items-center space-x-3 cursor-pointer"><input name="mostTalkedAbout" defaultChecked={editingItem?.mostTalkedAbout} type="checkbox" className="w-6 h-6 rounded accent-primary" /> <span className="font-black uppercase text-xs">Trending 🔥</span></label>
                   </div>
                   <button type="submit" className="col-span-full bg-primary text-white py-6 rounded-2xl font-black uppercase shadow-2xl hover:bg-blue-800 transition">Salvar Produto</button>
                </form>
              ) : (
                <form onSubmit={handleSaveNews} className="space-y-4">
                   <input name="title" defaultValue={editingItem?.title} required className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold text-xl" placeholder="Título Impactante" />
                   <div className="grid grid-cols-2 gap-4">
                      <select name="category" defaultValue={editingItem?.category} className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none font-bold uppercase text-xs">
                         {['celular', 'fones', 'videogames', 'jogos', 'acessorios'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input name="imageUrl" defaultValue={editingItem?.imageUrl} required className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none" placeholder="URL Capa" />
                   </div>
                   
                   <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-4 flex items-center"><i className="fas fa-link mr-2"></i> Relacionar Itens Mencionados</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2">
                         {products.map(p => (
                            <label key={p.id} className="flex items-center space-x-2 text-[10px] font-bold p-3 bg-white dark:bg-gray-700 rounded-xl cursor-pointer border dark:border-gray-600 hover:border-primary transition">
                               <input type="checkbox" checked={selectedNewsProducts.includes(p.id)} onChange={e => e.target.checked ? setSelectedNewsProducts([...selectedNewsProducts, p.id]) : setSelectedNewsProducts(selectedNewsProducts.filter(id => id !== p.id))} />
                               <span className="truncate">{p.name}</span>
                            </label>
                         ))}
                      </div>
                   </div>

                   <textarea name="content" defaultValue={editingItem?.content} required className="w-full bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl outline-none h-80 leading-relaxed" placeholder="Escreva o texto da notícia aqui..." />
                   <button type="submit" className="w-full bg-primary text-white py-6 rounded-2xl font-black uppercase shadow-2xl hover:bg-blue-800 transition">Publicar Notícia</button>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
