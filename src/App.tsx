import React, { useState } from 'react';
import { Moon, Sun, Palette, CheckCircle2, ChevronRight, Search, Heart, Star, Copy, Check } from 'lucide-react';
import { palettes, Palette, PaletteValues } from './palettes';

const headingFonts = [
  { name: 'Bricolage Grotesque (Trendy/Punchy)', value: '"Bricolage Grotesque", sans-serif' },
  { name: 'Syne (Avant-Garde/Artistic)', value: '"Syne", sans-serif' },
  { name: 'Instrument Serif (Elegant/Modern)', value: '"Instrument Serif", serif' },
  { name: 'Space Grotesk (Tech/Edgy)', value: '"Space Grotesk", sans-serif' },
  { name: 'Outfit (Clean/SaaS)', value: '"Outfit", sans-serif' },
  { name: 'Plus Jakarta Sans (Friendly)', value: '"Plus Jakarta Sans", sans-serif' },
  { name: 'DM Serif Display (Classic/Editorial)', value: '"DM Serif Display", serif' },
  { name: 'Unbounded (Loud/Display)', value: '"Unbounded", display' },
];

const bodyFonts = [
  { name: 'Manrope (Readable/Geometrical)', value: '"Manrope", sans-serif' },
  { name: 'DM Sans (Friendly/Modern)', value: '"DM Sans", sans-serif' },
  { name: 'Inter (Neutral/UI)', value: '"Inter", sans-serif' },
  { name: 'Plus Jakarta Sans (Crisp)', value: '"Plus Jakarta Sans", sans-serif' },
  { name: 'Figtree (Soft/SaaS)', value: '"Figtree", sans-serif' },
];

export default function App() {
  const [isDark, setIsDark] = useState(true); // Default to dark since layout is dark-themed
  const [selectedHeadingFont, setSelectedHeadingFont] = useState(headingFonts[0].value);
  const [selectedBodyFont, setSelectedBodyFont] = useState(bodyFonts[0].value);
  const [selectedPaletteId, setSelectedPaletteId] = useState(palettes[0].id);
  const [hasCopied, setHasCopied] = useState(false);

  const selectedPalette = palettes.find(p => p.id === selectedPaletteId) || palettes[0];

  const handleCopyPrompt = () => {
    const light = selectedPalette.colors.light;
    const dark = selectedPalette.colors.dark;

    const promptText = `### Color Palette: ${selectedPalette.name}

**Light Mode**
- Brand Primary: \`${light.brand}\`
- Brand Foreground: \`${light.brandForeground}\`
- Background: \`${light.bg}\`
- Main Text: \`${light.text}\`
- Muted Text: \`${light.textMuted}\`
- Border: \`${light.border}\`
- Surface/Card Background: \`${light.surface}\`
- Surface Highlight: \`${light.surfaceHighlight}\`

**Dark Mode**
- Brand Primary: \`${dark.brand}\`
- Brand Foreground: \`${dark.brandForeground}\`
- Background: \`${dark.bg}\`
- Main Text: \`${dark.text}\`
- Muted Text: \`${dark.textMuted}\`
- Border: \`${dark.border}\`
- Surface/Card Background: \`${dark.surface}\`
- Surface Highlight: \`${dark.surfaceHighlight}\``;

    navigator.clipboard.writeText(promptText);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div 
      className={`h-screen flex flex-col lg:flex-row overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#050505] text-[#f5f5f5]' : 'bg-[#e2e8f0] text-slate-900'}`}
      style={{ fontFamily: selectedBodyFont }}
    >
      <aside className={`w-full lg:w-[320px] h-auto lg:h-full flex flex-col shrink-0 border-b lg:border-b-0 lg:border-r z-10 shadow-2xl relative ${isDark ? 'bg-[#111111]/95 border-zinc-800' : 'bg-white/95 border-slate-200'} backdrop-blur`}>
        <div className={`p-5 border-b flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <h2 className="text-[10px] font-bold uppercase tracking-widest">SaaS Configurator</h2>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-500" />
            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: selectedHeadingFont }}>Design Visualizer</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section>
            <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Typography Engine</h3>
            <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Display / Headings</label>
                <div className="relative">
                  <select 
                    value={selectedHeadingFont}
                    onChange={(e) => setSelectedHeadingFont(e.target.value)}
                    className={`w-full text-xs px-3 py-2 rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-offset-1 transition-shadow ${isDark ? 'bg-zinc-900 border-zinc-800 focus:ring-purple-500 focus:ring-offset-[#111]' : 'bg-slate-50 border-slate-200 hover:border-slate-300 focus:ring-purple-500 focus:ring-offset-white'}`}
                  >
                    {headingFonts.map(f => (
                      <option key={f.value} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-3 top-2.5 rotate-90 opacity-50 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>UI / Body Text</label>
                <div className="relative">
                  <select 
                    value={selectedBodyFont}
                    onChange={(e) => setSelectedBodyFont(e.target.value)}
                    className={`w-full text-xs px-3 py-2 rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-offset-1 transition-shadow ${isDark ? 'bg-zinc-900 border-zinc-800 focus:ring-purple-500 focus:ring-offset-[#111]' : 'bg-slate-50 border-slate-200 hover:border-slate-300 focus:ring-purple-500 focus:ring-offset-white'}`}
                  >
                    {bodyFonts.map(f => (
                      <option key={f.value} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-3 top-2.5 rotate-90 opacity-50 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Color Palettes ({palettes.length})</h3>
            <div className="space-y-1.5">
              {palettes.map((palette, index) => {
                const isActive = selectedPaletteId === palette.id;
                const colors = isDark ? palette.colors.dark : palette.colors.light;
                return (
                  <div 
                    key={palette.id}
                    onClick={() => setSelectedPaletteId(palette.id)}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                      isActive 
                        ? (isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-slate-100 border border-slate-200') 
                        : (isDark ? 'hover:bg-zinc-900 border border-transparent' : 'hover:bg-slate-50 border border-transparent')
                    }`}
                  >
                    <div className="flex -space-x-1 mr-3 shrink-0">
                      <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: colors.brand, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
                      <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: colors.bg, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
                      <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}></div>
                    </div>
                    <span className={`text-xs truncate ${isActive ? 'font-semibold' : 'font-medium'} ${isDark ? (isActive ? 'text-zinc-100' : 'text-zinc-400') : (isActive ? 'text-slate-800' : 'text-slate-500')}`}>
                      {(index + 1).toString().padStart(2, '0')}. {palette.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className={`p-5 flex-shrink-0 border-t ${isDark ? 'bg-[#0a0a0a] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>Background</span>
              <div className={`flex border rounded-lg p-1 shadow-inner ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-200/50 border-slate-200'}`}>
                <button 
                  onClick={() => setIsDark(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${!isDark ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sun className="w-3 h-3" /> LIGHT
                </button>
                <button 
                  onClick={() => setIsDark(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${isDark ? 'bg-zinc-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Moon className="w-3 h-3" /> DARK
                </button>
              </div>
            </div>
            
            <button
              onClick={handleCopyPrompt}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                hasCopied 
                  ? 'bg-green-500 text-white' 
                  : isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {hasCopied ? 'COPIED TO CLIPBOARD' : 'COPY DESIGN PROMPT'}
            </button>
          </div>
        </div>
      </aside>

      <main 
        className="flex-1 flex flex-col h-full overflow-hidden p-4 lg:p-8 w-full relative transition-colors duration-500"
        style={{ 
          backgroundColor: isDark ? selectedPalette.colors.dark.bg : selectedPalette.colors.light.bg,
          color: isDark ? selectedPalette.colors.dark.text : selectedPalette.colors.light.text
        }}
      >
        <div 
          className="absolute inset-x-0 top-[-10%] h-[400px] w-[80%] mx-auto opacity-30 blur-[120px] rounded-full pointer-events-none transition-colors duration-500" 
          style={{ backgroundColor: isDark ? selectedPalette.colors.dark.brand : selectedPalette.colors.light.brand }} 
        />
        <header className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end mb-6 shrink-0 relative z-10 hidden lg:flex">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1.5 opacity-60">
              Preview Mode
            </p>
            <h2 className="text-3xl tracking-tight" style={{ fontFamily: selectedHeadingFont }}>{selectedPalette.name}</h2>
          </div>
          <div className="hidden sm:flex space-x-3 mt-4 sm:mt-0 opacity-80">
            <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: isDark ? selectedPalette.colors.dark.surface : selectedPalette.colors.light.surface }}></div>
            <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: isDark ? selectedPalette.colors.dark.surfaceHighlight : selectedPalette.colors.light.surfaceHighlight }}></div>
            <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: isDark ? selectedPalette.colors.dark.brand : selectedPalette.colors.light.brand }}></div>
          </div>
        </header>

        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col overflow-hidden relative z-10 z-[1] min-h-0">
          <PaletteShowcase 
             palette={selectedPalette} 
             isDark={isDark} 
             headingFont={selectedHeadingFont}
             bodyFont={selectedBodyFont}
          />
        </div>
      </main>
    </div>
  );
}

const PaletteShowcase: React.FC<{ palette: Palette, isDark: boolean, headingFont: string, bodyFont: string }> = ({ palette, isDark, headingFont, bodyFont }) => {
  const colors = isDark ? palette.colors.dark : palette.colors.light;
  const [copied, setCopied] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'booking' | 'landing'>('search');

  const copyPalette = () => {
    const mode = isDark ? 'Dark Mode' : 'Light Mode';
    const hFontName = headingFonts.find(f => f.value === headingFont)?.name || headingFont;
    const bFontName = bodyFonts.find(f => f.value === bodyFont)?.name || bodyFont;
    
    let prompt = `Here is the ${palette.name} color palette (${mode}) for my Photographer SaaS:\n` +
      `- Main Background Mode: ${mode}\n\n` +
      `Typography Guidelines:\n` +
      `- Headings / Display Font: ${hFontName}\n` +
      `- Body / UI Text Font: ${bFontName}\n` +
      `(Please ensure CSS applies heading font to h1-h6 and body font globally)\n\n` +
      `Color Hex Codes (Tailwind format):\n`;
      
    Object.entries(colors).forEach(([name, hex]) => {
      prompt += `- ${name}: ${hex}\n`;
    });
    
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyColor = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(name);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  return (
    <section className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-opacity-20 shrink-0 mb-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            {[
              { id: 'search', label: 'Search Page' },
              { id: 'booking', label: 'Booking Page' },
              { id: 'landing', label: 'Landing Page' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'search' | 'booking' | 'landing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab.id ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                style={{ 
                  backgroundColor: activeTab === tab.id ? colors.surfaceHighlight : 'transparent',
                  color: activeTab === tab.id ? colors.text : colors.textMuted,
                  border: `1px solid ${activeTab === tab.id ? colors.border : 'transparent'}`
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={copyPalette}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                copied 
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                  : isDark 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-500' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm'
              }`}
              title="Copy to clipboard for AI Prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy UI Prompt'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-white/5" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}}>
          {Object.entries(colors).map(([name, hex]) => (
             <div key={name} className="flex flex-col items-center group relative cursor-pointer" onClick={() => copyColor(hex, name)}>
               <div 
                 className="w-10 h-10 rounded-full shadow-sm transition-transform relative overflow-hidden flex items-center justify-center hover:scale-110 active:scale-95" 
                 style={{ backgroundColor: hex, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                 title={`Copy ${name}: ${hex}`}
               />
               <span className="text-[9px] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 whitespace-nowrap bg-black text-white px-2 py-1 rounded shadow-lg flex items-center gap-1 pointer-events-none z-10">
                 {copiedHex === name ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : `${name}`}
               </span>
             </div>
          ))}
        </div>
      </div>

      <div 
        className="flex-1 w-full rounded-2xl overflow-y-auto overflow-x-hidden shadow-2xl relative"
        style={{ 
          backgroundColor: colors.bg, 
          color: colors.text,
          border: `1px solid ${colors.border}` 
        }}
      >
        <div className="min-h-full">
          {activeTab === 'search' && <SearchPreview colors={colors} font={headingFont} />}
          {activeTab === 'booking' && <BookingPreview colors={colors} font={headingFont} />}
          {activeTab === 'landing' && <LandingPreview colors={colors} font={headingFont} />}
        </div>
      </div>
    </section>
  );
}

function SearchPreview({ colors, font }: { colors: PaletteValues, font: string }) {
  const styles = ['Wedding', 'Portrait', 'Event', 'Product', 'Family', 'Corporate'];
  const prices = ['Any price', 'Under RM500', 'RM500 - RM1,500', 'RM1,500 - RM3,500', 'RM3,500+'];
  
  return (
    <div className="w-full flex flex-col min-h-full">
      {/* Top Header */}
      <header className="flex justify-between items-center py-4 px-6 md:px-12 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: colors.brand }}>
            <span className="text-xs font-bold">M</span>
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: font }}>MaiGambar</span>
        </div>
        <div className="text-sm font-medium" style={{ color: colors.textMuted }}>
          Are you a photographer? <span className="ml-1 font-bold cursor-pointer" style={{ color: colors.text }}>Sign in &rarr;</span>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle, ${colors.brand} 0%, transparent 70%)` }} />
        
        <h1 className="text-4xl md:text-5xl font-bold mb-4 relative z-10" style={{ fontFamily: font }}>
          Find Your Perfect <span style={{ color: colors.brand }}>Photographer</span>
        </h1>
        <p className="text-sm md:text-base mb-10 max-w-2xl mx-auto relative z-10" style={{ color: colors.textMuted }}>
          Browse verified photographers across Malaysia. View portfolios,<br className="hidden md:block" />packages, and book instantly.
        </p>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl relative z-10 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-4 top-3.5 opacity-50" style={{ color: colors.textMuted }} />
            <input 
              type="text" 
              placeholder="Search by name, city, or style..." 
              className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
              style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.text }}
            />
          </div>
          <button className="px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.text }}>
            Near Me
          </button>
          <button className="px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.text }}>
            Top Rated
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl relative z-10 mb-4">
          {styles.map(s => (
            <div key={s} className="px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.textMuted }}>
              # {s}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl relative z-10 mb-10">
          {prices.map((p, i) => (
            <div key={p} className="px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer" style={{ backgroundColor: i === 0 ? colors.brand : colors.surfaceHighlight, color: i === 0 ? colors.brandForeground : colors.textMuted, border: `1px solid ${i===0 ? colors.brand : colors.border}` }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto w-full">
        <p className="text-sm mb-6" style={{ color: colors.textMuted }}>3 photographers found</p>
        
        {/* Grid Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
              <div className="aspect-[4/3] relative flex items-center justify-center" style={{ backgroundColor: colors.surfaceHighlight }}>
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase flex items-center gap-1" style={{ backgroundColor: colors.brand, color: colors.brandForeground }}>
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </div>
                <Camera className="w-12 h-12 opacity-20" style={{ color: colors.textMuted }} />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-4" style={{ fontFamily: font }}>{i === 1 ? 'Test diskaun' : 'Test snapper'}</h3>
                <div className="flex justify-end pt-4 border-t" style={{ borderColor: colors.border }}>
                  <span className="text-xs" style={{ color: colors.textMuted }}>Contact for price</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto p-6 md:px-12 pb-12 w-full max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}` }}>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5" style={{ color: colors.brand }}>
              <Camera className="w-4 h-4" /> For Photographers
            </div>
            <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: font }}>Are you a photographer?</h3>
            <p className="text-sm max-w-md" style={{ color: colors.textMuted }}>Join MaiGambar and get your own booking page, manage clients, and grow your photography business online.</p>
          </div>
          <button className="px-6 py-3 rounded-xl font-bold whitespace-nowrap" style={{ backgroundColor: colors.brand, color: colors.brandForeground }}>
            Get Started Free &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}



function BookingPreview({ colors, font }: { colors: PaletteValues, font: string }) {
  return (
    <div className="w-full flex flex-col min-h-full">
      {/* Top Header */}
      <header className="flex justify-end items-center py-4 px-6 md:px-12 border-b" style={{ borderColor: colors.border }}>
        <button className="px-5 py-2 rounded-lg font-bold flex items-center gap-2 text-sm" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.text }}>
          <CheckCircle2 className="w-4 h-4" /> Check Booking
        </button>
      </header>

      <div className="px-6 md:px-12 py-12 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar */}
        <div className="w-full md:w-[320px] flex flex-col gap-6 shrink-0">
          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-inner mb-6" style={{ backgroundColor: colors.brand, color: colors.brandForeground, fontFamily: font }}>
              T
            </div>
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: font }}>Test diskaun</h2>
            
            <div className="space-y-4 pt-6 border-t" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-3 text-sm" style={{ color: colors.textMuted }}>
                <span className="w-4 flex justify-center">📞</span> 01114648597
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: colors.textMuted }}>
                <Star className="w-4 h-4 fill-current text-yellow-500" /> <span style={{ color: colors.text }} className="font-bold">0.0</span> • 0 reviews
              </div>
              <div className="flex items-center gap-3 text-sm text-emerald-500">
                <CheckCircle2 className="w-4 h-4" /> Verified Photographer
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
            <h3 className="font-bold text-lg mb-3" style={{ fontFamily: font }}>About</h3>
            <p className="text-sm" style={{ color: colors.textMuted }}>No description available yet.</p>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="rounded-2xl flex items-center p-1 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <button className="flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-xl" style={{ backgroundColor: colors.surfaceHighlight, color: colors.text }}>
              Packages
            </button>
            <button className="flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2" style={{ color: colors.textMuted }}>
              Portfolio
            </button>
            <button className="flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2" style={{ color: colors.textMuted }}>
              Reviews
            </button>
          </div>
          
          <div className="mt-8 flex justify-center py-20 text-sm italic" style={{ color: colors.textMuted }}>
            Content will be displayed here
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPreview({ colors, font }: { colors: PaletteValues, font: string }) {
  return (
    <div className="w-full flex flex-col min-h-full">
      {/* Navbar */}
      <header className="flex justify-between items-center py-4 px-6 md:px-12 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: colors.brand }}>
             <span className="text-xs font-bold">M</span>
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: font }}>MaiGambar</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: colors.textMuted }}>
          <span>Features</span>
          <span>How It Works</span>
          <span>Pricing</span>
          <span>Browse</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span style={{ color: colors.textMuted }}>BM</span>
          <span style={{ color: colors.text }}>Login</span>
          <button className="px-5 py-2 rounded-lg font-bold" style={{ backgroundColor: colors.surfaceHighlight, color: colors.text }}>
            Start Free
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-12 relative">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[600px] opacity-20 pointer-events-none rounded-full blur-[100px]" style={{ backgroundColor: colors.brand }} />
        
        <div className="flex-1 relative z-10 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.textMuted }}>
             ⭐ For Malaysian Photographers
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight" style={{ fontFamily: font }}>
            Book Clients.<br/>
            <span style={{ color: colors.brand }}>Grow Fast.</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-md leading-relaxed" style={{ color: colors.textMuted }}>
            Tired of juggling bookings in WhatsApp groups? MaiGambar gives you one link where clients book, pay, and confirm — you just show up and shoot.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg whitespace-nowrap" style={{ backgroundColor: colors.brand, color: colors.brandForeground }}>
              Start Free Trial &rarr;
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg whitespace-nowrap flex items-center justify-center gap-2" style={{ backgroundColor: colors.surfaceHighlight, border: `1px solid ${colors.border}`, color: colors.text }}>
              Browse Photographers
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium" style={{ color: colors.textMuted }}>
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> No credit card</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> 14-day free trial</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Cancel anytime</span>
          </div>
        </div>

        <div className="w-full md:w-[600px] shrink-0 relative z-10">
          <div className="rounded-xl overflow-hidden shadow-2xl relative border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <div className="h-6 flex items-center px-4 border-b gap-1.5" style={{ backgroundColor: colors.surfaceHighlight, borderColor: colors.border }}>
               <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-lg font-bold mb-1" style={{ fontFamily: font }}>Welcome back, Sarah! 👋</h3>
                   <p className="text-xs" style={{ color: colors.textMuted }}>Here's your business today.</p>
                 </div>
                 <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: colors.brand, color: colors.brandForeground }}>Verified</div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                 {[1,2,3].map(i => (
                    <div key={i} className="p-3 rounded-lg border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                       <div className="text-xs font-medium mb-1" style={{ color: colors.textMuted }}>{i===1?'Packages':i===2?'Upcoming':'Pending'}</div>
                       <div className="text-xl font-bold">{i===1?'5':i===2?'12':'3'}</div>
                    </div>
                 ))}
              </div>
              <div className="p-4 rounded-lg border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold">Revenue</span>
                  <span className="text-xs text-emerald-500 font-medium">+23%</span>
                </div>
                <div className="flex items-end gap-2 h-20">
                  {[4,7,3,8,5,9,12,6,8,10].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ backgroundColor: colors.brand, height: `${h*8}%`, opacity: i > 6 ? 1 : 0.6 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mock Section padding */}
      <div className="py-24" style={{ backgroundColor: colors.surfaceHighlight }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
           <div className="inline-flex py-1 px-3 rounded-full text-xs font-bold tracking-widest uppercase mb-4" style={{ color: colors.brand, border: `1px solid ${colors.border}` }}>Pricing Plans</div>
           <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: font }}>The Right Plan for Every Photographer</h2>
           <p className="text-lg" style={{ color: colors.textMuted }}>Start free, scale as you grow. No hidden fees, no contracts.</p>
        </div>
      </div>
    </div>
  );
}
