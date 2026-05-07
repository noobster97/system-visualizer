export type PaletteValues = {
  bg: string;
  surface: string;
  surfaceHighlight: string;
  brand: string;
  brandForeground: string;
  text: string;
  textMuted: string;
  border: string;
};

export type PaletteTheme = {
  light: PaletteValues;
  dark: PaletteValues;
};

export type FontPair = {
  headingName: string;
  headingFamily: string;
  bodyName: string;
  bodyFamily: string;
};

export type Palette = {
  id: string;
  name: string;
  description: string;
  fonts: FontPair;
  colors: PaletteTheme;
};

export type PreviewComponentCategory = 'header' | 'hero' | 'cards' | 'form' | 'table' | 'footer';
export type PreviewComponent = string;

export type PreviewBlock = {
  component: PreviewComponentCategory;
  span: 'full' | 'wide' | 'half' | 'third';
  tone: 'brand' | 'surface' | 'muted' | 'contrast';
  variant: 'standard' | 'media' | 'metric' | 'form' | 'list' | 'feature';
  arrangement?: 'bar' | 'split' | 'grid' | 'list' | 'stack' | 'media' | 'form';
  height?: 'short' | 'medium' | 'tall';
  items?: PreviewItem[];
};

export type PreviewItem = {
  kind: 'box' | 'line' | 'heading' | 'text' | 'media' | 'button' | 'avatar' | 'divider';
  x: number;
  y: number;
  w: number;
  h: number;
  tone: 'brand' | 'surface' | 'muted' | 'contrast' | 'text';
  radius?: 'none' | 'soft' | 'round';
  label?: string;
  textSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  emphasis?: 'low' | 'normal' | 'high';
  shadow?: 'none' | 'soft' | 'strong';
  opacity?: number;
  blur?: boolean;
};

export type PreviewCanvas = {
  aspect: 'desktop' | 'mobile' | 'square';
  items: PreviewItem[];
};

export type PreviewStyle = {
  layoutPattern: 'landing' | 'dashboard' | 'mobile' | 'editorial' | 'marketplace';
  navigationStyle: 'top' | 'sidebar' | 'tabs';
  density: 'compact' | 'balanced' | 'spacious';
  cardStyle: 'flat' | 'bordered' | 'elevated' | 'image-led';
  cornerStyle: 'sharp' | 'soft' | 'rounded';
  colorApplication: 'subtle' | 'branded' | 'immersive' | 'contrast';
  composition: 'classic' | 'split' | 'asymmetric' | 'stacked' | 'panelled';
  accentStyle: 'minimal' | 'badges' | 'bands' | 'blocks';
  heroTreatment: 'minimal' | 'centered' | 'split-media' | 'banner' | 'editorial';
  backgroundTreatment: 'plain' | 'soft-band' | 'brand-wash' | 'sectioned';
  componentTreatment: 'clean' | 'metric-heavy' | 'image-first' | 'form-led' | 'content-led';
};

export type PreviewCopy = {
  brandName?: string;
  eyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  primaryAction?: string;
  secondaryAction?: string;
  navItems?: string[];
  cardTitles?: string[];
  statLabels?: string[];
  tableRows?: string[];
  formFields?: string[];
  footerItems?: string[];
};

export type DesignGeneration = {
  palettes: Palette[];
  components: PreviewComponent[];
  previewCopy: PreviewCopy;
  previewStyle: PreviewStyle;
  previewBlocks: PreviewBlock[];
  previewCanvas: PreviewCanvas;
};

export const fontOptions = {
  heading: [
    'Bricolage Grotesque',
    'Syne',
    'Instrument Serif',
    'Space Grotesk',
    'Outfit',
    'Plus Jakarta Sans',
    'DM Serif Display',
    'Unbounded',
    'Playfair Display',
    'Fraunces',
    'Sora',
    'Archivo',
    'Urbanist',
    'Public Sans',
  ],
  body: [
    'Manrope',
    'DM Sans',
    'Inter',
    'Plus Jakarta Sans',
    'Figtree',
    'Source Sans 3',
    'IBM Plex Sans',
    'Nunito Sans',
    'Work Sans',
    'Lora',
  ],
};

export function toFontFamily(name: string, fallback: 'heading' | 'body') {
  const serifFonts = new Set(['Instrument Serif', 'DM Serif Display', 'Playfair Display', 'Fraunces', 'Lora']);
  const normalized = name.trim();
  const safeName = normalized || (fallback === 'heading' ? 'Bricolage Grotesque' : 'Manrope');
  return `"${safeName}", ${serifFonts.has(safeName) ? 'serif' : 'sans-serif'}`;
}
