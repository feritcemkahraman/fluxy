import React, { useState, useEffect, useRef } from 'react';
import { Smile, Search, TrendingUp, Clock, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

// Pepe Emoji Collection - From public/pepe folder
const PEPE_EMOJIS = [
  { id: 'pepe_king', name: 'King Pepe', url: '/pepe/11998-pepe-king.png' },
  { id: 'pepe_rapper', name: 'Rapper', url: '/pepe/13328-rapper.png' },
  { id: 'pepe_smoke', name: 'Smoke', url: '/pepe/136857-pepesmoke.gif' },
  { id: 'pepe_tricycle', name: 'Tricycle', url: '/pepe/13703-pepe-tricycle.gif' },
  { id: 'pepe_cuddle', name: 'Cuddle', url: '/pepe/13796-cuddle.png' },
  { id: 'pepe_laugh', name: 'Laugh', url: '/pepe/1502_pepelaugh.gif' },
  { id: 'pepe_yamero', name: 'Yamero', url: '/pepe/15891-yamero.png' },
  { id: 'pepe_cheer', name: 'Cheer', url: '/pepe/18075-pepe-cheer.gif' },
  { id: 'pepe_rockstar', name: 'Rockstar', url: '/pepe/18075-pepe-rockstar.gif' },
  { id: 'pepe_shine', name: 'Shine', url: '/pepe/18113-pepeshine.gif' },
  { id: 'pepe_closedeyes', name: 'Closed Eyes', url: '/pepe/20497-pepe-closedeyes.png' },
  { id: 'pepe_spit', name: 'Spit', url: '/pepe/21151-pepe-spit.gif' },
  { id: 'pepe_driver', name: 'Driver', url: '/pepe/2205_pepegadriver.gif' },
  { id: 'pepe_5head', name: '5Head', url: '/pepe/2246_pepe_5head.gif' },
  { id: 'pepe_steamdeck', name: 'Steam Deck', url: '/pepe/22859-steamdeck.png' },
  { id: 'pepe_vanish', name: 'Vanish', url: '/pepe/24561-pepe-vanish.gif' },
  { id: 'pepe_bellyache', name: 'Belly Ache', url: '/pepe/24714-pepe-bellyache.gif' },
  { id: 'pepe_mcbed', name: 'MC Bed', url: '/pepe/26866-pepemcbed.gif' },
  { id: 'pepe_dogehug', name: 'Doge Hug', url: '/pepe/26924-dogehug.gif' },
  { id: 'pepe_panic', name: 'Panic', url: '/pepe/2749-pepe-panic.png' },
  { id: 'pepe_doctor', name: 'Doctor', url: '/pepe/276883-doctor-pepe.gif' },
  { id: 'pepe_pray', name: 'Pray', url: '/pepe/31261-pray.png' },
  { id: 'pepe_thinking', name: 'Thinking', url: '/pepe/32226-pepethinking.png' },
  { id: 'pepe_lmfao', name: 'LMFAO', url: '/pepe/32868-pepe-lmfaoooo.gif' },
  { id: 'pepe_blushy', name: 'Blushy', url: '/pepe/3439-pepe-blushy.png' },
  { id: 'pepe_monster', name: 'Monster', url: '/pepe/345529-pepemonster.png' },
  { id: 'pepe_sadsausage', name: 'Sad Sausage', url: '/pepe/347770-pepe-sadsausage.png' },
  { id: 'pepe_jetski', name: 'Jet Ski', url: '/pepe/35745-pepejetski.gif' },
  { id: 'pepe_thumbsup', name: 'Thumbs Up', url: '/pepe/3812_pepe_thumbsup.gif' },
  { id: 'pepe_pet', name: 'Pet', url: '/pepe/398460-pepepet.gif' },
  { id: 'pepe_gamercry', name: 'Gamer Cry', url: '/pepe/411644-gamer-pepe-cry.gif' },
  { id: 'pepe_pixel', name: 'Pixel', url: '/pepe/41261-pixelpepe.gif' },
  { id: 'pepe_stare', name: 'Stare', url: '/pepe/41744-stare.png' },
  { id: 'pepe_minecraft', name: 'Minecraft', url: '/pepe/4192-pepeminecraft.png' },
  { id: 'pepe_plug', name: 'Plug', url: '/pepe/43235-pepeplug.png' },
  { id: 'pepe_disgusted', name: 'Disgusted', url: '/pepe/4506-pepedisgusted.png' },
  { id: 'pepe_jam', name: 'Jam', url: '/pepe/45997-pepejam.gif' },
  { id: 'pepe_cry', name: 'Cry', url: '/pepe/471114-pepecry.png' },
  { id: 'pepe_joker', name: 'Joker', url: '/pepe/48506-joker.png' },
  { id: 'pepe_roasted', name: 'Roasted', url: '/pepe/50320-pepe-roastedpepe.gif' },
  { id: 'pepe_chef', name: 'Chef', url: '/pepe/50440-pepe-chef.png' },
  { id: 'pepe_hart', name: 'Hart', url: '/pepe/50724-hart.png' },
  { id: 'pepe_daddy', name: 'Daddy', url: '/pepe/52925-pepedaddy.gif' },
  { id: 'pepe_poker', name: 'Poker', url: '/pepe/54890-poker.png' },
  { id: 'pepe_oops', name: 'Oops', url: '/pepe/56432-pepeoops.png' },
  { id: 'pepe_clown', name: 'Clown', url: '/pepe/56943-clown-alt.png' },
  { id: 'pepe_clowntrain', name: 'Clown Train', url: '/pepe/59958-pepeclownblobtrain.gif' },
  { id: 'pepe_point', name: 'Point', url: '/pepe/5997-pepe-point.png' },
  { id: 'pepe_squadsus', name: 'Squad Sus', url: '/pepe/60299-pepe-squad-sus.png' },
  { id: 'pepe_sitting', name: 'Sitting', url: '/pepe/6110-sitting.gif' },
  { id: 'pepe_hyperspeed', name: 'Hyperspeed', url: '/pepe/61444-pepe-hyperspeed.gif' },
  { id: 'pepe_wdym', name: 'WDYM', url: '/pepe/63226-pepewdym.png' },
  { id: 'pepe_robber', name: 'Robber', url: '/pepe/63618-pepe-robber.gif' },
  { id: 'pepe_flowerwilt', name: 'Flower Wilt', url: '/pepe/647501-pepeflowerwilt.png' },
  { id: 'pepe_prayalt', name: 'Pray Alt', url: '/pepe/6605-pepe-pray.png' },
  { id: 'pepe_sus', name: 'Sus', url: '/pepe/6605-sus.png' },
  { id: 'pepe_howdy', name: 'Howdy', url: '/pepe/6662_PepeHowdy.gif' },
  { id: 'pepe_binary', name: 'Binary', url: '/pepe/67734-binary.gif' },
  { id: 'pepe_jam2', name: 'Jam 2', url: '/pepe/67908-pepejam.gif' },
  { id: 'pepe_amongusstab', name: 'Among Us Stab', url: '/pepe/71051-pepeamongusstab.gif' },
  { id: 'pepe_ughping', name: 'Ugh Ping', url: '/pepe/71945-ughping.png' },
  { id: 'pepe_comeandgo', name: 'Come and Go', url: '/pepe/727145-pepecomeandxgo.gif' },
  { id: 'pepe_knife', name: 'Knife', url: '/pepe/727145-pepeknife.png' },
  { id: 'pepe_wizz', name: 'Wizz', url: '/pepe/7361_PepeWiZz.gif' },
  { id: 'pepe_chocoface', name: 'Choco Face', url: '/pepe/76030-pepechocoface.png' },
  { id: 'pepe_creditcard', name: 'Credit Card', url: '/pepe/761219-pepe-credit-card.gif' },
  { id: 'pepe_bdayparty', name: 'Birthday Party', url: '/pepe/77653-pepe-bdayparty.png' },
  { id: 'pepe_toasterbath', name: 'Toaster Bath', url: '/pepe/77885-pepetoasterbathtub.png' },
  { id: 'pepe_santarun', name: 'Santa Run', url: '/pepe/8056_Pepe_SantaRun.gif' },
  { id: 'pepe_crygif', name: 'Cry GIF', url: '/pepe/8321_pepecry.gif' },
  { id: 'pepe_thumbsdown', name: 'Thumbs Down', url: '/pepe/8436_pepe_thumbsdown.gif' },
  { id: 'pepe_madpuke', name: 'Mad Puke', url: '/pepe/84899-pepe-madpuke.gif' },
  { id: 'pepe_boba', name: 'Boba', url: '/pepe/89315-boba.png' },
  { id: 'pepe_clink', name: 'Clink', url: '/pepe/8932-pepeclink.png' },
  { id: 'pepe_susalt', name: 'Sus Alt', url: '/pepe/90423-pepe-sus.png' },
  { id: 'pepe_bedjump', name: 'Bed Jump', url: '/pepe/93659-pepebedjump.gif' },
  { id: 'pepe_moneyrain', name: 'Money Rain', url: '/pepe/93659-pepemoneyrain.gif' },
  { id: 'pepe_lol', name: 'LOL', url: '/pepe/94770-pepelol.png' },
  { id: 'pepe_gg', name: 'GG', url: '/pepe/95932-pepegg.png' },
  { id: 'pepe_toilet', name: 'Toilet', url: '/pepe/96012-pepe-toilet.gif' },
  { id: 'pepe_jam3', name: 'Jam 3', url: '/pepe/9812-pepejam2.gif' },
  { id: 'pepe_loving', name: 'Loving', url: '/pepe/98260-pepe-loving.gif' },
  { id: 'pepe_knifealt', name: 'Knife Alt', url: '/pepe/99281-pepe-knife.png' },
  { id: 'pepe_sadge', name: 'Sadge', url: '/pepe/99281-pepe-sadge.png' },
  { id: 'pepe_hmm', name: 'Hmm', url: '/pepe/PepeHmm.gif' },
  { id: 'pepe_rain', name: 'Rain', url: '/pepe/PepeRain.gif' },
  { id: 'pepe_sip', name: 'Sip', url: '/pepe/PepeSip.gif' },
];

// Unicode Emoji Categories
const UNICODE_EMOJIS = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴'],
  'Gestures': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽'],
  'Objects': ['⌚', '📱', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🧯', '🛢'],
};

// GIF Categories
const GIF_CATEGORIES = [
  { id: 'trending', name: '🔥 Trend', search: '' },
  { id: 'happy', name: '😊 Mutlu', search: 'happy excited' },
  { id: 'sad', name: '😢 Üzgün', search: 'sad crying' },
  { id: 'laugh', name: '😂 Komik', search: 'laugh funny lol' },
  { id: 'love', name: '❤️ Aşk', search: 'love heart kiss' },
  { id: 'angry', name: '😠 Kızgın', search: 'angry mad rage' },
  { id: 'dance', name: '💃 Dans', search: 'dance party' },
  { id: 'yes', name: '👍 Evet', search: 'yes thumbs up agree' },
  { id: 'no', name: '👎 Hayır', search: 'no nope disagree' },
  { id: 'wow', name: '😮 Vay', search: 'wow omg shocked' },
  { id: 'clap', name: '👏 Alkış', search: 'clap applause' },
  { id: 'bye', name: '👋 Hoşça kal', search: 'bye wave goodbye' },
  { id: 'anime', name: '🌸 Anime', search: 'anime manga kawaii' },
];

export function EmojiGifPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('emoji');
  const [searchTerm, setSearchTerm] = useState('');
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [selectedGifCategory, setSelectedGifCategory] = useState('trending');
  const [gifs, setGifs] = useState([]);
  const [categoryGifs, setCategoryGifs] = useState({});
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef(null);

  // Tenor API Key (get free at https://tenor.com/developer/keyregistration)
  const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Demo key

  useEffect(() => {
    // Load recent emojis from localStorage
    const recent = JSON.parse(localStorage.getItem('recentEmojis') || '[]');
    setRecentEmojis(recent.slice(0, 24));

    // Load trending GIFs
    loadCategoryGifs('trending');

    // Click outside to close
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const loadCategoryGifs = async (categoryId) => {
    // Check cache first
    if (categoryGifs[categoryId]) {
      return;
    }

    try {
      setLoading(true);
      const category = GIF_CATEGORIES.find(c => c.id === categoryId);
      
      let url;
      if (categoryId === 'trending' || !category.search) {
        url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=30&media_filter=gif`;
      } else {
        url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(category.search)}&key=${TENOR_API_KEY}&limit=30&media_filter=gif`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      setCategoryGifs(prev => ({
        ...prev,
        [categoryId]: data.results || []
      }));
    } catch (error) {
      console.error('Failed to load category GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=gif`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Failed to search GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gifSearchTerm) {
        searchGifs(gifSearchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [gifSearchTerm]);

  const handleEmojiSelect = (emoji) => {
    // Save to recent
    const recent = JSON.parse(localStorage.getItem('recentEmojis') || '[]');
    const updated = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 24);
    localStorage.setItem('recentEmojis', JSON.stringify(updated));
    setRecentEmojis(updated);

    onSelect?.(emoji);
  };

  const handleGifSelect = (gif) => {
    const gifUrl = gif.media_formats?.gif?.url || gif.url;
    onSelect?.(gifUrl, 'gif');
  };

  const filteredEmojis = (category) => {
    if (!searchTerm) return UNICODE_EMOJIS[category] || [];
    return (UNICODE_EMOJIS[category] || []).filter(emoji =>
      emoji.includes(searchTerm)
    );
  };

  const filteredPepes = PEPE_EMOJIS.filter(pepe =>
    !searchTerm || pepe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 w-96 h-[500px] bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <TabsList className="bg-black/20 p-1 rounded-lg">
            <TabsTrigger 
              value="emoji" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all text-sm font-medium"
            >
              <Smile className="w-4 h-4 mr-2" />
              Emoji
            </TabsTrigger>
            <TabsTrigger 
              value="pepe" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all text-sm font-medium"
            >
              <span className="mr-2">🐸</span>
              Pepe
            </TabsTrigger>
            <TabsTrigger 
              value="gif" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all text-sm font-medium"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              GIF
            </TabsTrigger>
          </TabsList>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emoji Tab */}
        <TabsContent value="emoji" className="flex-1 flex flex-col m-0">
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Emoji ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/30 border-white/10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(500px - 120px)' }}>
            <div className="p-3 space-y-4">
              {/* Recent Emojis */}
              {recentEmojis.length > 0 && !searchTerm && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-semibold text-gray-400 uppercase">
                      Son Kullanılanlar
                    </h3>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {recentEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-2xl p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Unicode Emoji Categories */}
              {Object.entries(UNICODE_EMOJIS).map(([category, emojis]) => {
                const filtered = filteredEmojis(category);
                if (filtered.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                      {category}
                    </h3>
                    <div className="grid grid-cols-8 gap-1">
                      {filtered.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="text-2xl p-2 hover:bg-white/10 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Pepe Tab */}
        <TabsContent value="pepe" className="flex-1 flex flex-col m-0">
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Pepe ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/30 border-white/10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(500px - 120px)' }}>
            <div className="p-3">
              <div className="grid grid-cols-6 gap-2">
                {filteredPepes.map((pepe) => (
                  <button
                    key={pepe.id}
                    onClick={() => handleEmojiSelect(`:${pepe.id}:`)}
                    className="aspect-square hover:bg-white/10 rounded transition-colors p-1 group relative overflow-hidden"
                    title={pepe.name}
                  >
                    <img 
                      src={pepe.url} 
                      alt={pepe.name}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                      <span className="text-[10px] text-white font-medium">:{pepe.id}:</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* GIF Tab */}
        <TabsContent value="gif" className="flex-1 flex flex-col m-0">
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="GIF ara..."
                value={gifSearchTerm}
                onChange={(e) => setGifSearchTerm(e.target.value)}
                className="pl-10 bg-black/30 border-white/10"
              />
            </div>
          </div>

          {/* Categories - Only show when not searching */}
          {!gifSearchTerm && (
            <div className="p-2 border-b border-white/10">
              <div className="flex flex-wrap gap-1">
                {GIF_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedGifCategory(category.id);
                      loadCategoryGifs(category.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedGifCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(500px - 180px)' }}>
            <div className="p-3">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {(gifSearchTerm ? gifs : (categoryGifs[selectedGifCategory] || [])).map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleGifSelect(gif)}
                      className="aspect-square overflow-hidden rounded hover:ring-2 ring-blue-500 transition-all group relative"
                    >
                      <img
                        src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url}
                        alt={gif.content_description || 'GIF'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-medium">GIF</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && (gifSearchTerm ? gifs : (categoryGifs[selectedGifCategory] || [])).length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  {gifSearchTerm ? 'GIF bulunamadı' : 'GIF\'ler yükleniyor...'}
                </div>
              )}
            </div>
          </div>

          {/* Powered by Tenor */}
          <div className="p-2 border-t border-white/10 text-center">
            <span className="text-xs text-gray-500">Powered by Tenor</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
