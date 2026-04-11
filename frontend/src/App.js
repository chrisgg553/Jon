import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Marquee from "react-fast-marquee";
import { ShoppingCart, Menu, X, User, Package, CreditCard, MessageSquare, BarChart3, LogOut, ChevronRight, Plus, Minus, Trash2, Check, Loader2, Mail, Phone, MapPin, Instagram, Gamepad2, Save, UserCircle, DollarSign, Clock, Users, AlertCircle, Eye, Reply, Search, Filter } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Cart Context
const CartContext = createContext(null);

const useCart = () => useContext(CartContext);

const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('modzone_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('modzone_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
    } else {
      setItems(prev => prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

// Header Component
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#00FFA3]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-10 h-10 bg-[#00FFA3] flex items-center justify-center">
              <span className="font-heading font-bold text-black text-lg">M</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">MODZONE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/products" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" data-testid="nav-products">Products</Link>
            <Link to="/products?category=instagram" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" data-testid="nav-instagram">Instagram</Link>
            <Link to="/products?category=ps5" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" data-testid="nav-ps5">PS5</Link>
            <Link to="/products?category=xbox" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" data-testid="nav-xbox">Xbox</Link>
            <Link to="/contact" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" data-testid="nav-contact">Contact</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative p-2 hover:bg-zinc-900 transition-colors" data-testid="cart-link">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#00FFA3] text-black text-xs font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            {user ? (
              <Link to="/admin" className="cyber-btn text-sm py-2 px-4" data-testid="admin-link">Dashboard</Link>
            ) : (
              <Link to="/admin" className="cyber-btn-outline text-sm py-2 px-4" data-testid="login-link">Admin</Link>
            )}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#09090b] border-t border-zinc-800"
          >
            <nav className="flex flex-col p-4 gap-4">
              <Link to="/products" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" onClick={() => setMobileMenuOpen(false)}>Products</Link>
              <Link to="/products?category=instagram" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" onClick={() => setMobileMenuOpen(false)}>Instagram</Link>
              <Link to="/products?category=ps5" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" onClick={() => setMobileMenuOpen(false)}>PS5</Link>
              <Link to="/products?category=xbox" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" onClick={() => setMobileMenuOpen(false)}>Xbox</Link>
              <Link to="/contact" className="text-zinc-300 hover:text-[#00FFA3] transition-colors font-mono text-sm uppercase tracking-wider" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-[#09090b] border-t border-zinc-800 mt-20">
      <div className="border-b border-zinc-800">
        <Marquee speed={40} className="py-3 bg-black">
          <span className="marquee-content text-zinc-500 mx-8">MODZONE STORE</span>
          <span className="marquee-content text-[#00FFA3] mx-8">•</span>
          <span className="marquee-content text-zinc-500 mx-8">PREMIUM MODS</span>
          <span className="marquee-content text-[#FF007F] mx-8">•</span>
          <span className="marquee-content text-zinc-500 mx-8">INSTANT DELIVERY</span>
          <span className="marquee-content text-[#00FFA3] mx-8">•</span>
          <span className="marquee-content text-zinc-500 mx-8">24/7 SUPPORT</span>
          <span className="marquee-content text-[#FF007F] mx-8">•</span>
          <span className="marquee-content text-zinc-500 mx-8">SECURE PAYMENTS</span>
          <span className="marquee-content text-[#00FFA3] mx-8">•</span>
        </Marquee>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00FFA3] flex items-center justify-center">
                <span className="font-heading font-bold text-black text-lg">M</span>
              </div>
              <span className="font-heading font-bold text-xl">MODZONE</span>
            </div>
            <p className="text-zinc-500 text-sm">Your trusted source for premium gaming mods and digital services.</p>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#00FFA3] mb-4">Categories</h4>
            <ul className="space-y-2">
              <li><Link to="/products?category=instagram" className="text-zinc-400 hover:text-white transition-colors text-sm">Instagram</Link></li>
              <li><Link to="/products?category=ps5" className="text-zinc-400 hover:text-white transition-colors text-sm">PS5 Mods</Link></li>
              <li><Link to="/products?category=xbox" className="text-zinc-400 hover:text-white transition-colors text-sm">Xbox Mods</Link></li>
              <li><Link to="/products?category=saves" className="text-zinc-400 hover:text-white transition-colors text-sm">Game Saves</Link></li>
              <li><Link to="/products?category=accounts" className="text-zinc-400 hover:text-white transition-colors text-sm">Accounts</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#00FFA3] mb-4">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-zinc-400 hover:text-white transition-colors text-sm">Contact Us</Link></li>
              <li><span className="text-zinc-400 text-sm">FAQ</span></li>
              <li><span className="text-zinc-400 text-sm">Refund Policy</span></li>
              <li><span className="text-zinc-400 text-sm">Terms of Service</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#00FFA3] mb-4">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-zinc-400 text-sm">
                <Mail className="w-4 h-4" />
                chrisguevarap805@gmail.com
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800 mt-8 pt-8 text-center">
          <p className="text-zinc-600 text-xs font-mono">© 2026 MODZONE. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  );
};

// Category icons
const getCategoryIcon = (category) => {
  switch (category) {
    case 'instagram': return <Instagram className="w-5 h-5" />;
    case 'ps5': return <Gamepad2 className="w-5 h-5" />;
    case 'xbox': return <Gamepad2 className="w-5 h-5" />;
    case 'saves': return <Save className="w-5 h-5" />;
    case 'accounts': return <UserCircle className="w-5 h-5" />;
    default: return <Package className="w-5 h-5" />;
  }
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'instagram': return '#E4405F';
    case 'ps5': return '#003791';
    case 'xbox': return '#107C10';
    case 'saves': return '#FDE047';
    case 'accounts': return '#FF007F';
    default: return '#00FFA3';
  }
};

// Home Page
const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    { id: 'instagram', name: 'Instagram', desc: 'Followers & Engagement', image: 'https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/655e1532e1292ee0ed97a3630f535f85eec26b99fc53ccd59c9fd1e6a02c0bfa.png', from: '$2.99' },
    { id: 'ps5', name: 'PS5 Mods', desc: 'Jailbreak & Saves', image: 'https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/f6d5a23131a3a8713ddb671a2aee3c848f0214443cefa5726d7399ba61540f98.png', from: '$19.99' },
    { id: 'xbox', name: 'Xbox Mods', desc: 'Accounts & Modes', image: 'https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/f6d5a23131a3a8713ddb671a2aee3c848f0214443cefa5726d7399ba61540f98.png', from: '$14.99' },
    { id: 'saves', name: 'Game Saves', desc: 'Online & Offline', image: 'https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/97f8067cc30f730e27308c2788eff05ffd24a991ae75b51c4a9e9431d20353.png', from: '$7.99' },
    { id: 'accounts', name: 'Modded Accounts', desc: 'GTA, Warzone, Fortnite', image: 'https://static.prod-images.emergentagent.com/jobs/6d346769-3e47-4bc5-b07b-3bc09e1b0e9a/images/e5e116757e86bb4c47405791dd8bf4cd9843346436ab28f401172b5fa4071eb3.png', from: '$9.99' },
  ];

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-bg min-h-[90vh] flex items-center relative">
        <div className="absolute inset-0 scanlines"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase mb-4 block">// PREMIUM DIGITAL MARKETPLACE</span>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter uppercase mb-6">
              <span className="text-white">MOD</span>
              <span className="text-[#00FFA3] text-glow">ZONE</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mb-8">
              Your trusted source for premium gaming mods, modded accounts, and social media growth services.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products" className="cyber-btn" data-testid="shop-now-btn">
                SHOP NOW <ChevronRight className="inline w-4 h-4 ml-1" />
              </Link>
              <Link to="/contact" className="cyber-btn-outline" data-testid="contact-btn">
                CONTACT US
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase">// BROWSE</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold uppercase mt-2">Categories</h2>
            </div>
            <Link to="/products" className="cyber-btn-outline text-sm py-2 px-4" data-testid="view-all-btn">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {categories.map((cat, index) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link 
                  to={`/products?category=${cat.id}`}
                  className="cyber-card block overflow-hidden group"
                  data-testid={`category-${cat.id}`}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="cyber-badge mb-2" style={{ background: `${getCategoryColor(cat.id)}20`, color: getCategoryColor(cat.id) }}>
                        From {cat.from}
                      </div>
                      <h3 className="font-heading text-lg font-bold uppercase">{cat.name}</h3>
                      <p className="text-zinc-400 text-sm">{cat.desc}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase">// HOT ITEMS</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold uppercase mt-2">Featured Products</h2>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#00FFA3]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="cyber-card group"
                  data-testid={`product-card-${product.id}`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2">
                      <span className="cyber-badge" style={{ background: `${getCategoryColor(product.category)}20`, color: getCategoryColor(product.category) }}>
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-sm font-bold uppercase mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-zinc-500 text-xs mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#00FFA3] text-lg">${product.price.toFixed(2)}</span>
                      <button 
                        onClick={() => addItem(product)}
                        className="cyber-btn text-xs py-2 px-3"
                        data-testid={`add-to-cart-${product.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Clock className="w-6 h-6" />, title: 'Instant Delivery', desc: 'Most products delivered within minutes of purchase' },
              { icon: <CreditCard className="w-6 h-6" />, title: 'Secure Payment', desc: 'Multiple payment options including Stripe, Zelle & Debit' },
              { icon: <MessageSquare className="w-6 h-6" />, title: '24/7 Support', desc: 'Our team is here to help you anytime' },
            ].map((feature, index) => (
              <div key={index} className="cyber-card p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-[#00FFA3]/10 flex items-center justify-center text-[#00FFA3]">
                  {feature.icon}
                </div>
                <h3 className="font-heading text-lg font-bold uppercase mb-2">{feature.title}</h3>
                <p className="text-zinc-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Products Page
const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = category ? `${API}/products?category=${category}` : `${API}/products`;
        const response = await axios.get(url);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category]);

  const categories = ['instagram', 'ps5', 'xbox', 'saves', 'accounts'];

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="products-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase">// CATALOG</span>
          <h1 className="font-heading text-4xl font-bold uppercase mt-2">
            {category ? category.toUpperCase() : 'ALL PRODUCTS'}
          </h1>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link 
            to="/products"
            className={`cyber-btn-outline text-xs py-2 px-4 ${!category ? 'bg-[#00FFA3] text-black' : ''}`}
            data-testid="filter-all"
          >
            All
          </Link>
          {categories.map(cat => (
            <Link
              key={cat}
              to={`/products?category=${cat}`}
              className={`cyber-btn-outline text-xs py-2 px-4 ${category === cat ? 'bg-[#00FFA3] text-black' : ''}`}
              data-testid={`filter-${cat}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#00FFA3]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="cyber-card group"
                data-testid={`product-card-${product.id}`}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2">
                    <span className="cyber-badge" style={{ background: `${getCategoryColor(product.category)}20`, color: getCategoryColor(product.category) }}>
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-sm font-bold uppercase mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{product.description}</p>
                  {product.features && product.features.length > 0 && (
                    <ul className="mb-4 space-y-1">
                      {product.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#00FFA3]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#00FFA3] text-lg">${product.price.toFixed(2)}</span>
                    <button 
                      onClick={() => addItem(product)}
                      className="cyber-btn text-xs py-2 px-3"
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Cart Page
const Cart = () => {
  const { items, updateQuantity, removeItem, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12" data-testid="cart-page">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <ShoppingCart className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
          <h1 className="font-heading text-2xl font-bold uppercase mb-4">Your Cart is Empty</h1>
          <p className="text-zinc-500 mb-8">Browse our products and add items to your cart.</p>
          <Link to="/products" className="cyber-btn" data-testid="continue-shopping">
            CONTINUE SHOPPING
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="cart-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase">// YOUR ORDER</span>
          <h1 className="font-heading text-4xl font-bold uppercase mt-2">Shopping Cart</h1>
        </div>

        <div className="cyber-card divide-y divide-zinc-800">
          {items.map(item => (
            <div key={item.id} className="p-4 flex items-center gap-4" data-testid={`cart-item-${item.id}`}>
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover" />
              <div className="flex-1">
                <h3 className="font-heading text-sm font-bold uppercase">{item.name}</h3>
                <p className="text-[#00FFA3] font-mono">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center border border-zinc-700 hover:border-[#00FFA3] transition-colors"
                  data-testid={`decrease-${item.id}`}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center border border-zinc-700 hover:border-[#00FFA3] transition-colors"
                  data-testid={`increase-${item.id}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="font-mono text-[#00FFA3] w-24 text-right">${(item.price * item.quantity).toFixed(2)}</span>
              <button 
                onClick={() => removeItem(item.id)}
                className="text-zinc-500 hover:text-[#FF007F] transition-colors"
                data-testid={`remove-${item.id}`}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 cyber-card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-400">Subtotal</span>
            <span className="font-mono text-xl">${total.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="cyber-btn w-full"
            data-testid="checkout-btn"
          >
            PROCEED TO CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
};

// Checkout Page
const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [error, setError] = useState('');

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 text-center py-20">
          <p className="text-zinc-500">Your cart is empty.</p>
          <Link to="/products" className="cyber-btn mt-4 inline-block">Shop Now</Link>
        </div>
      </div>
    );
  }

  const handleStripeCheckout = async () => {
    if (!formData.name || !formData.email) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API}/payments/checkout`, {
        items: items.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        customer_email: formData.email,
        customer_name: formData.name,
        origin_url: window.location.origin
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      setError('Failed to create checkout session. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!formData.name || !formData.email) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    
    try {
      await axios.post(`${API}/orders`, {
        items: items.map(item => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        customer_email: formData.email,
        customer_name: formData.name,
        payment_method: paymentMethod,
        total: total
      });
      
      clearCart();
      navigate('/checkout/success?method=' + paymentMethod);
    } catch (err) {
      setError('Failed to create order. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="checkout-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase">// SECURE CHECKOUT</span>
          <h1 className="font-heading text-4xl font-bold uppercase mt-2">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Info */}
          <div>
            <div className="cyber-card p-6 mb-6">
              <h2 className="font-heading text-lg font-bold uppercase mb-4">Customer Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="cyber-input w-full"
                    placeholder="John Doe"
                    data-testid="checkout-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="cyber-input w-full"
                    placeholder="john@example.com"
                    data-testid="checkout-email"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="cyber-card p-6">
              <h2 className="font-heading text-lg font-bold uppercase mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border cursor-pointer transition-all ${paymentMethod === 'stripe' ? 'border-[#00FFA3] bg-[#00FFA3]/5' : 'border-zinc-800'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                    data-testid="payment-stripe"
                  />
                  <CreditCard className={`w-5 h-5 mr-3 ${paymentMethod === 'stripe' ? 'text-[#00FFA3]' : 'text-zinc-500'}`} />
                  <div className="flex-1">
                    <span className="font-mono text-sm uppercase">Credit/Debit Card</span>
                    <p className="text-xs text-zinc-500">Secure payment via Stripe</p>
                  </div>
                  {paymentMethod === 'stripe' && <Check className="w-5 h-5 text-[#00FFA3]" />}
                </label>

                <label className={`flex items-center p-4 border cursor-pointer transition-all ${paymentMethod === 'zelle' ? 'border-[#00FFA3] bg-[#00FFA3]/5' : 'border-zinc-800'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="zelle"
                    checked={paymentMethod === 'zelle'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                    data-testid="payment-zelle"
                  />
                  <DollarSign className={`w-5 h-5 mr-3 ${paymentMethod === 'zelle' ? 'text-[#00FFA3]' : 'text-zinc-500'}`} />
                  <div className="flex-1">
                    <span className="font-mono text-sm uppercase">Zelle</span>
                    <p className="text-xs text-zinc-500">Send to anag8920@gmail.com</p>
                  </div>
                  {paymentMethod === 'zelle' && <Check className="w-5 h-5 text-[#00FFA3]" />}
                </label>

                <label className={`flex items-center p-4 border cursor-pointer transition-all ${paymentMethod === 'cashapp' ? 'border-[#00FFA3] bg-[#00FFA3]/5' : 'border-zinc-800'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cashapp"
                    checked={paymentMethod === 'cashapp'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                    data-testid="payment-cashapp"
                  />
                  <DollarSign className={`w-5 h-5 mr-3 ${paymentMethod === 'cashapp' ? 'text-[#00FFA3]' : 'text-zinc-500'}`} />
                  <div className="flex-1">
                    <span className="font-mono text-sm uppercase">Cash App</span>
                    <p className="text-xs text-zinc-500">Fast & easy payment</p>
                  </div>
                  {paymentMethod === 'cashapp' && <Check className="w-5 h-5 text-[#00FFA3]" />}
                </label>

                <label className={`flex items-center p-4 border cursor-pointer transition-all ${paymentMethod === 'venmo' ? 'border-[#00FFA3] bg-[#00FFA3]/5' : 'border-zinc-800'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="venmo"
                    checked={paymentMethod === 'venmo'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                    data-testid="payment-venmo"
                  />
                  <DollarSign className={`w-5 h-5 mr-3 ${paymentMethod === 'venmo' ? 'text-[#00FFA3]' : 'text-zinc-500'}`} />
                  <div className="flex-1">
                    <span className="font-mono text-sm uppercase">Venmo</span>
                    <p className="text-xs text-zinc-500">Quick & secure</p>
                  </div>
                  {paymentMethod === 'venmo' && <Check className="w-5 h-5 text-[#00FFA3]" />}
                </label>

                <label className={`flex items-center p-4 border cursor-pointer transition-all ${paymentMethod === 'paypal' ? 'border-[#00FFA3] bg-[#00FFA3]/5' : 'border-zinc-800'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                    data-testid="payment-paypal"
                  />
                  <CreditCard className={`w-5 h-5 mr-3 ${paymentMethod === 'paypal' ? 'text-[#00FFA3]' : 'text-zinc-500'}`} />
                  <div className="flex-1">
                    <span className="font-mono text-sm uppercase">PayPal</span>
                    <p className="text-xs text-zinc-500">Buyer protection included</p>
                  </div>
                  {paymentMethod === 'paypal' && <Check className="w-5 h-5 text-[#00FFA3]" />}
                </label>

                <label className={`flex items-center p-4 border cursor-pointer transition-all ${paymentMethod === 'applepay' ? 'border-[#00FFA3] bg-[#00FFA3]/5' : 'border-zinc-800'}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="applepay"
                    checked={paymentMethod === 'applepay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                    data-testid="payment-applepay"
                  />
                  <CreditCard className={`w-5 h-5 mr-3 ${paymentMethod === 'applepay' ? 'text-[#00FFA3]' : 'text-zinc-500'}`} />
                  <div className="flex-1">
                    <span className="font-mono text-sm uppercase">Apple Pay / Google Pay</span>
                    <p className="text-xs text-zinc-500">Tap to pay - instant</p>
                  </div>
                  {paymentMethod === 'applepay' && <Check className="w-5 h-5 text-[#00FFA3]" />}
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="cyber-card p-6 sticky top-24">
              <h2 className="font-heading text-lg font-bold uppercase mb-4">Order Summary</h2>
              <div className="divide-y divide-zinc-800">
                {items.map(item => (
                  <div key={item.id} className="py-3 flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-heading uppercase">{item.name}</p>
                      <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-mono text-[#00FFA3]">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-800 mt-4 pt-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-heading uppercase">Total</span>
                  <span className="font-mono text-[#00FFA3] text-2xl">${total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-[#FF007F]/10 border border-[#FF007F]/30 text-[#FF007F] text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={paymentMethod === 'stripe' ? handleStripeCheckout : handleManualPayment}
                disabled={loading}
                className="cyber-btn w-full mt-6"
                data-testid="place-order-btn"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> PROCESSING...</>
                ) : paymentMethod === 'stripe' ? (
                  'PAY WITH CARD'
                ) : (
                  'PLACE ORDER'
                )}
              </button>

              {paymentMethod === 'zelle' && (
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  After placing order, send ${total.toFixed(2)} via Zelle to <span className="text-[#00FFA3]">anag8920@gmail.com</span>
                </p>
              )}
              {paymentMethod === 'cashapp' && (
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  After placing order, we'll send you our Cash App tag to complete payment
                </p>
              )}
              {paymentMethod === 'venmo' && (
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  After placing order, we'll send you our Venmo username to complete payment
                </p>
              )}
              {paymentMethod === 'paypal' && (
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  After placing order, we'll send you a PayPal invoice to <span className="text-[#00FFA3]">{formData.email || 'your email'}</span>
                </p>
              )}
              {paymentMethod === 'applepay' && (
                <p className="text-xs text-zinc-500 mt-4 text-center">
                  After placing order, we'll send you a payment link for Apple Pay / Google Pay
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Success Page
const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const method = searchParams.get('method');
  const [status, setStatus] = useState('checking');
  const { clearCart } = useCart();

  useEffect(() => {
    if (sessionId) {
      // Poll for payment status
      const checkStatus = async (attempts = 0) => {
        if (attempts >= 5) {
          setStatus('timeout');
          return;
        }
        try {
          const response = await axios.get(`${API}/payments/status/${sessionId}`);
          if (response.data.payment_status === 'paid') {
            setStatus('paid');
            clearCart();
          } else if (response.data.status === 'expired') {
            setStatus('expired');
          } else {
            setTimeout(() => checkStatus(attempts + 1), 2000);
          }
        } catch {
          setTimeout(() => checkStatus(attempts + 1), 2000);
        }
      };
      checkStatus();
    } else if (method) {
      setStatus('manual');
    }
  }, [sessionId, method, clearCart]);

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="checkout-success-page">
      <div className="max-w-2xl mx-auto px-4 text-center py-20">
        {status === 'checking' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-[#00FFA3] animate-spin mb-6" />
            <h1 className="font-heading text-2xl font-bold uppercase mb-4">Processing Payment...</h1>
            <p className="text-zinc-500">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <div className="w-20 h-20 mx-auto bg-[#00FFA3] flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-black" />
            </div>
            <h1 className="font-heading text-3xl font-bold uppercase mb-4 text-[#00FFA3]">Payment Successful!</h1>
            <p className="text-zinc-400 mb-8">Thank you for your purchase. Your order has been confirmed.</p>
            <Link to="/products" className="cyber-btn">Continue Shopping</Link>
          </>
        )}
        {status === 'manual' && (
          <>
            <div className="w-20 h-20 mx-auto bg-[#FDE047] flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-black" />
            </div>
            <h1 className="font-heading text-3xl font-bold uppercase mb-4 text-[#FDE047]">Order Placed!</h1>
            <p className="text-zinc-400 mb-4">Your order has been received and is pending payment.</p>
            {method === 'zelle' && (
              <div className="cyber-card p-6 text-left mb-8">
                <h3 className="font-heading text-lg font-bold uppercase mb-3">Payment Instructions</h3>
                <p className="text-zinc-400 text-sm mb-2">Please send your payment via Zelle to:</p>
                <p className="font-mono text-[#00FFA3]">anag8920@gmail.com</p>
                <p className="text-zinc-500 text-xs mt-3">Include your email in the memo for faster processing.</p>
              </div>
            )}
            {(method === 'cashapp' || method === 'venmo' || method === 'paypal' || method === 'applepay') && (
              <div className="cyber-card p-6 text-left mb-8">
                <h3 className="font-heading text-lg font-bold uppercase mb-3">Payment Instructions</h3>
                <p className="text-zinc-400 text-sm mb-2">We've received your order!</p>
                <p className="text-zinc-400 text-sm">Check your email at <span className="text-[#00FFA3]">{searchParams.get('email') || 'your inbox'}</span> for payment details.</p>
                <p className="text-zinc-500 text-xs mt-3">We'll send you the payment link within a few minutes.</p>
              </div>
            )}
            <Link to="/products" className="cyber-btn">Continue Shopping</Link>
          </>
        )}
        {(status === 'expired' || status === 'timeout') && (
          <>
            <div className="w-20 h-20 mx-auto bg-[#FF007F] flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold uppercase mb-4 text-[#FF007F]">Payment Issue</h1>
            <p className="text-zinc-400 mb-8">There was an issue processing your payment. Please try again.</p>
            <Link to="/checkout" className="cyber-btn">Try Again</Link>
          </>
        )}
      </div>
    </div>
  );
};

// Checkout Cancel Page
const CheckoutCancel = () => {
  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="checkout-cancel-page">
      <div className="max-w-2xl mx-auto px-4 text-center py-20">
        <div className="w-20 h-20 mx-auto bg-zinc-800 flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-zinc-400" />
        </div>
        <h1 className="font-heading text-3xl font-bold uppercase mb-4">Payment Cancelled</h1>
        <p className="text-zinc-400 mb-8">Your payment was cancelled. Your cart items are still saved.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/cart" className="cyber-btn-outline">View Cart</Link>
          <Link to="/products" className="cyber-btn">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};

// Contact Page
const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${API}/contact`, formData);
      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12" data-testid="contact-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="font-mono text-[#00FFA3] text-xs tracking-[0.3em] uppercase">// GET IN TOUCH</span>
          <h1 className="font-heading text-4xl font-bold uppercase mt-2">Contact Us</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="cyber-card p-6 mb-6">
              <h2 className="font-heading text-lg font-bold uppercase mb-4">Contact Info</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#00FFA3]" />
                  <span className="text-zinc-300">chrisguevarap805@gmail.com</span>
                </div>
              </div>
            </div>
            <div className="cyber-card p-6">
              <h2 className="font-heading text-lg font-bold uppercase mb-4">FAQ</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-[#00FFA3] font-mono">How fast is delivery?</p>
                  <p className="text-zinc-500 mt-1">Most digital products are delivered within minutes to a few hours.</p>
                </div>
                <div>
                  <p className="text-[#00FFA3] font-mono">Is it safe?</p>
                  <p className="text-zinc-500 mt-1">Yes! All transactions are secure and we never share your information.</p>
                </div>
                <div>
                  <p className="text-[#00FFA3] font-mono">Do you offer refunds?</p>
                  <p className="text-zinc-500 mt-1">Refunds are available for undelivered products. Contact us for details.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="cyber-card p-6">
            {success ? (
              <div className="text-center py-8">
                <Check className="w-16 h-16 mx-auto text-[#00FFA3] mb-4" />
                <h3 className="font-heading text-xl font-bold uppercase mb-2">Message Sent!</h3>
                <p className="text-zinc-500">We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="cyber-input w-full"
                    required
                    data-testid="contact-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="cyber-input w-full"
                    required
                    data-testid="contact-email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="cyber-input w-full"
                    required
                    data-testid="contact-subject"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="cyber-input w-full h-32 resize-none"
                    required
                    data-testid="contact-message"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-[#FF007F]/10 border border-[#FF007F]/30 text-[#FF007F] text-sm">
                    {error}
                  </div>
                )}
                <button type="submit" className="cyber-btn w-full" disabled={loading} data-testid="contact-submit">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> SENDING...</> : 'SEND MESSAGE'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Login
const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      } else {
        setError('Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center" data-testid="admin-login-page">
      <div className="w-full max-w-md px-4">
        <div className="cyber-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-[#00FFA3] flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-black" />
            </div>
            <h1 className="font-heading text-2xl font-bold uppercase">Admin Login</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input w-full"
                required
                data-testid="admin-email"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input w-full"
                required
                data-testid="admin-password"
              />
            </div>
            {error && (
              <div className="p-3 bg-[#FF007F]/10 border border-[#FF007F]/30 text-[#FF007F] text-sm">
                {error}
              </div>
            )}
            <button type="submit" className="cyber-btn w-full" disabled={loading} data-testid="admin-login-submit">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> LOGGING IN...</> : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [user, navigate, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'all') {
        const [statsRes, ordersRes, customersRes, paymentsRes, messagesRes] = await Promise.all([
          axios.get(`${API}/admin/stats`, { withCredentials: true }),
          axios.get(`${API}/orders`, { withCredentials: true }),
          axios.get(`${API}/customers`, { withCredentials: true }),
          axios.get(`${API}/payments`, { withCredentials: true }),
          axios.get(`${API}/contact`, { withCredentials: true })
        ]);
        setStats(statsRes.data);
        setOrders(ordersRes.data);
        setCustomers(customersRes.data);
        setPayments(paymentsRes.data);
        setMessages(messagesRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`${API}/orders/${orderId}/status?status=${status}`, {}, { withCredentials: true });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const markMessageRead = async (messageId) => {
    try {
      await axios.patch(`${API}/contact/${messageId}/read`, {}, { withCredentials: true });
      setMessages(messages.map(m => m.id === messageId ? { ...m, read: true } : m));
    } catch (error) {
      console.error('Error marking message read:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  if (!user) return null;

  const filteredOrders = orders.filter(o => {
    const matchesFilter = !orderFilter || o.status === orderFilter;
    const matchesSearch = !searchTerm || 
      o.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="admin-dashboard">
      {/* Admin Header */}
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00FFA3] flex items-center justify-center">
                <span className="font-heading font-bold text-black">M</span>
              </div>
              <span className="font-heading font-bold">MODZONE</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="font-mono text-xs text-[#00FFA3] uppercase">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <button onClick={handleLogout} className="cyber-btn-outline text-xs py-2 px-3" data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-16 flex">
        {/* Sidebar */}
        <div className="w-64 fixed left-0 top-16 bottom-0 bg-[#09090b] border-r border-zinc-800 p-4">
          <nav className="space-y-2">
            {[
              { id: 'overview', icon: <BarChart3 className="w-5 h-5" />, label: 'Overview' },
              { id: 'orders', icon: <Package className="w-5 h-5" />, label: 'Orders' },
              { id: 'customers', icon: <Users className="w-5 h-5" />, label: 'Customers' },
              { id: 'payments', icon: <CreditCard className="w-5 h-5" />, label: 'Payments' },
              { id: 'messages', icon: <MessageSquare className="w-5 h-5" />, label: 'Support Inbox' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-[#00FFA3]/10 text-[#00FFA3] border-l-2 border-[#00FFA3]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                data-testid={`nav-${tab.id}`}
              >
                {tab.icon}
                <span className="font-mono text-sm uppercase">{tab.label}</span>
                {tab.id === 'messages' && messages.filter(m => !m.read).length > 0 && (
                  <span className="ml-auto w-5 h-5 bg-[#FF007F] text-white text-xs flex items-center justify-center">
                    {messages.filter(m => !m.read).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="ml-64 flex-1 p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#00FFA3]" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && stats && (
                <div>
                  <h1 className="font-heading text-2xl font-bold uppercase mb-6">Dashboard Overview</h1>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="cyber-card p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 text-sm">Total Revenue</span>
                        <DollarSign className="w-5 h-5 text-[#00FFA3]" />
                      </div>
                      <p className="font-mono text-2xl text-[#00FFA3]">${stats.total_revenue?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="cyber-card p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 text-sm">Orders Today</span>
                        <Package className="w-5 h-5 text-[#FDE047]" />
                      </div>
                      <p className="font-mono text-2xl">{stats.today_orders || 0}</p>
                    </div>
                    <div className="cyber-card p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 text-sm">Total Customers</span>
                        <Users className="w-5 h-5 text-[#FF007F]" />
                      </div>
                      <p className="font-mono text-2xl">{stats.total_customers || 0}</p>
                    </div>
                    <div className="cyber-card p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 text-sm">Pending Orders</span>
                        <Clock className="w-5 h-5 text-[#FDE047]" />
                      </div>
                      <p className="font-mono text-2xl">{stats.pending_orders || 0}</p>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="cyber-card">
                    <div className="p-4 border-b border-zinc-800">
                      <h2 className="font-heading text-lg font-bold uppercase">Recent Orders</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full admin-table">
                        <thead>
                          <tr>
                            <th className="p-4 text-left">Order ID</th>
                            <th className="p-4 text-left">Customer</th>
                            <th className="p-4 text-left">Total</th>
                            <th className="p-4 text-left">Status</th>
                            <th className="p-4 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 5).map(order => (
                            <tr key={order.id}>
                              <td className="p-4 font-mono text-xs">{order.id?.slice(0, 8)}...</td>
                              <td className="p-4">{order.customer_email}</td>
                              <td className="p-4 text-[#00FFA3]">${order.total?.toFixed(2)}</td>
                              <td className="p-4">
                                <span className={`cyber-badge status-${order.status}`}>{order.status}</span>
                              </td>
                              <td className="p-4 text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="font-heading text-2xl font-bold uppercase">Orders</h1>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          placeholder="Search orders..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="cyber-input pl-10 w-64"
                          data-testid="search-orders"
                        />
                      </div>
                      <select
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value)}
                        className="cyber-input"
                        data-testid="filter-orders"
                      >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="cyber-card">
                    <div className="overflow-x-auto">
                      <table className="w-full admin-table">
                        <thead>
                          <tr>
                            <th className="p-4 text-left">Order ID</th>
                            <th className="p-4 text-left">Customer</th>
                            <th className="p-4 text-left">Items</th>
                            <th className="p-4 text-left">Total</th>
                            <th className="p-4 text-left">Payment</th>
                            <th className="p-4 text-left">Status</th>
                            <th className="p-4 text-left">Date</th>
                            <th className="p-4 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(order => (
                            <tr key={order.id}>
                              <td className="p-4 font-mono text-xs">{order.id?.slice(0, 8)}...</td>
                              <td className="p-4">
                                <div>
                                  <p className="text-sm">{order.customer_name}</p>
                                  <p className="text-xs text-zinc-500">{order.customer_email}</p>
                                </div>
                              </td>
                              <td className="p-4 text-sm">{order.items?.length || 0} items</td>
                              <td className="p-4 text-[#00FFA3] font-mono">${order.total?.toFixed(2)}</td>
                              <td className="p-4 text-sm uppercase">{order.payment_method}</td>
                              <td className="p-4">
                                <span className={`cyber-badge status-${order.status}`}>{order.status}</span>
                              </td>
                              <td className="p-4 text-zinc-500 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                              <td className="p-4">
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className="cyber-input text-xs py-1"
                                  data-testid={`update-status-${order.id}`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === 'customers' && (
                <div>
                  <h1 className="font-heading text-2xl font-bold uppercase mb-6">Customers</h1>
                  <div className="cyber-card">
                    <div className="overflow-x-auto">
                      <table className="w-full admin-table">
                        <thead>
                          <tr>
                            <th className="p-4 text-left">Customer</th>
                            <th className="p-4 text-left">Email</th>
                            <th className="p-4 text-left">Orders</th>
                            <th className="p-4 text-left">Total Spent</th>
                            <th className="p-4 text-left">Last Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map(customer => (
                            <tr key={customer.id}>
                              <td className="p-4">{customer.name}</td>
                              <td className="p-4 text-zinc-400">{customer.email}</td>
                              <td className="p-4 font-mono">{customer.order_count || 0}</td>
                              <td className="p-4 text-[#00FFA3] font-mono">${customer.total_spent?.toFixed(2) || '0.00'}</td>
                              <td className="p-4 text-zinc-500">{customer.last_order ? new Date(customer.last_order).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div>
                  <h1 className="font-heading text-2xl font-bold uppercase mb-6">Payments</h1>
                  <div className="cyber-card">
                    <div className="overflow-x-auto">
                      <table className="w-full admin-table">
                        <thead>
                          <tr>
                            <th className="p-4 text-left">Transaction ID</th>
                            <th className="p-4 text-left">Session ID</th>
                            <th className="p-4 text-left">Customer</th>
                            <th className="p-4 text-left">Amount</th>
                            <th className="p-4 text-left">Status</th>
                            <th className="p-4 text-left">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map(payment => (
                            <tr key={payment.id}>
                              <td className="p-4 font-mono text-xs">{payment.id?.slice(0, 8)}...</td>
                              <td className="p-4 font-mono text-xs">{payment.session_id?.slice(0, 12)}...</td>
                              <td className="p-4">{payment.customer_email}</td>
                              <td className="p-4 text-[#00FFA3] font-mono">${payment.amount?.toFixed(2)}</td>
                              <td className="p-4">
                                <span className={`cyber-badge status-${payment.payment_status}`}>{payment.payment_status}</span>
                              </td>
                              <td className="p-4 text-zinc-500">{new Date(payment.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Tab */}
              {activeTab === 'messages' && (
                <div>
                  <h1 className="font-heading text-2xl font-bold uppercase mb-6">Support Inbox</h1>
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="cyber-card p-8 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                        <p className="text-zinc-500">No messages yet</p>
                      </div>
                    ) : (
                      messages.map(message => (
                        <div key={message.id} className={`cyber-card p-6 ${!message.read ? 'border-[#00FFA3]/30' : ''}`}>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-heading font-bold uppercase">{message.subject}</h3>
                                {!message.read && (
                                  <span className="cyber-badge bg-[#00FFA3]/10 text-[#00FFA3]">New</span>
                                )}
                              </div>
                              <p className="text-sm text-zinc-500">{message.name} • {message.email}</p>
                            </div>
                            <span className="text-xs text-zinc-600">{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-zinc-300 mb-4">{message.message}</p>
                          <div className="flex gap-2">
                            {!message.read && (
                              <button 
                                onClick={() => markMessageRead(message.id)}
                                className="cyber-btn-outline text-xs py-2 px-3"
                                data-testid={`mark-read-${message.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1 inline" /> Mark Read
                              </button>
                            )}
                            <a 
                              href={`mailto:${message.email}?subject=Re: ${message.subject}`}
                              className="cyber-btn text-xs py-2 px-3"
                            >
                              <Reply className="w-4 h-4 mr-1 inline" /> Reply
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00FFA3]" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return children;
};

// Main App
function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={
              <>
                <Header />
                <main>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/checkout/success" element={<CheckoutSuccess />} />
                    <Route path="/checkout/cancel" element={<CheckoutCancel />} />
                    <Route path="/contact" element={<Contact />} />
                  </Routes>
                </main>
                <Footer />
              </>
            } />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
