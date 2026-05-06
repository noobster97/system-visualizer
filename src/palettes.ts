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

export type Palette = {
  id: string;
  name: string;
  description: string;
  colors: PaletteTheme;
};

export const palettes: Palette[] = [
  {
    name: 'MaiGambar Platform',
    id: 'maigambar-platform',
    description: 'Deep midnight blues and electric purple accents. High contrast and futuristic, perfect for modern SaaS.',
    colors: {
      light: { bg: '#F8FAFC', surface: '#FFFFFF', surfaceHighlight: '#F1F5F9', brand: '#9333EA', brandForeground: '#FFFFFF', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0' },
      dark: { bg: '#050711', surface: '#0F1423', surfaceHighlight: '#192033', brand: '#A855F7', brandForeground: '#FFFFFF', text: '#F8FAFC', textMuted: '#94A3B8', border: '#1E293B' }
    }
  },
  {
    name: 'Dune Terracotta',
    id: 'dune-terracotta',
    description: 'Warm, earthy neutral tones with a bold terracotta accent. Provides a highly refined, editorial aesthetic.',
    colors: {
      light: { bg: '#FCFAF8', surface: '#F5EFE8', surfaceHighlight: '#EFE7DE', brand: '#D95C3C', brandForeground: '#FFFFFF', text: '#2C221D', textMuted: '#8A7D73', border: '#E4DFD5' },
      dark: { bg: '#161413', surface: '#201D1A', surfaceHighlight: '#2D2824', brand: '#DE6B4C', brandForeground: '#FFFFFF', text: '#E8E1DB', textMuted: '#A39992', border: '#332E2B' }
    }
  },
  {
    name: 'Oceanic Depth',
    id: 'oceanic-depth',
    description: 'Inky marine blues layered with glowing cyber mint. Brings a calm but highly technical and precise vibe.',
    colors: {
      light: { bg: '#F2F9F9', surface: '#FFFFFF', surfaceHighlight: '#E5F3F3', brand: '#00B89F', brandForeground: '#FFFFFF', text: '#071829', textMuted: '#5C748C', border: '#DCE7EE' },
      dark: { bg: '#020C14', surface: '#071626', surfaceHighlight: '#0C233B', brand: '#12E5B6', brandForeground: '#020C14', text: '#E6F3F8', textMuted: '#84A1BB', border: '#172C42' }
    }
  },
  {
    name: 'Peach Editorial',
    id: 'peach-editorial',
    description: 'Soft alabaster and warm stone grays, highlighted by a friendly peach coral. Ideal for elegant, human-centric design.',
    colors: {
      light: { bg: '#FFF9F7', surface: '#FFFFFF', surfaceHighlight: '#F7EBE8', brand: '#FF7A6A', brandForeground: '#FFFFFF', text: '#291F1E', textMuted: '#998684', border: '#F2E4E1' },
      dark: { bg: '#1C1615', surface: '#29211F', surfaceHighlight: '#3B2F2E', brand: '#FF8A7A', brandForeground: '#291F1E', text: '#F7E7E4', textMuted: '#B39E9B', border: '#3B2F2E' }
    }
  },
  {
    name: 'Monochrome Pearl',
    id: 'monochrome-pearl',
    description: 'A completely neutral canvas. Crisp whites, stark blacks, and balanced grays let photography speak for itself.',
    colors: {
      light: { bg: '#FAFAFA', surface: '#FFFFFF', surfaceHighlight: '#F4F4F5', brand: '#18181B', brandForeground: '#FFFFFF', text: '#09090B', textMuted: '#71717A', border: '#E4E4E7' },
      dark: { bg: '#09090B', surface: '#141414', surfaceHighlight: '#27272A', brand: '#FAFAFA', brandForeground: '#09090B', text: '#FAFAFA', textMuted: '#A1A1AA', border: '#27272A' }
    }
  },
  {
    name: 'Olive & Stone',
    id: 'olive-stone',
    description: 'Subtle olive greens paired with off-white stone interfaces. A soft, grounded palette that feels organic and calming.',
    colors: {
      light: { bg: '#F6F6F2', surface: '#FFFFFF', surfaceHighlight: '#E8EADF', brand: '#6D8A3F', brandForeground: '#FFFFFF', text: '#212A18', textMuted: '#818A76', border: '#E0E3D8' },
      dark: { bg: '#131611', surface: '#1B2017', surfaceHighlight: '#293022', brand: '#87AB4D', brandForeground: '#131611', text: '#E1E6D5', textMuted: '#96A186', border: '#293022' }
    }
  },
  {
    name: 'Electric Stealth',
    id: 'electric-stealth',
    description: 'Matte blacks and cool grays brutally interrupted by a piercing, electric tangerine orange. Edgy and energetic.',
    colors: {
      light: { bg: '#F4F6F8', surface: '#FFFFFF', surfaceHighlight: '#E7EAF0', brand: '#FF5722', brandForeground: '#FFFFFF', text: '#0D1117', textMuted: '#6E7A8A', border: '#DCE1E8' },
      dark: { bg: '#0D1117', surface: '#151B23', surfaceHighlight: '#212833', brand: '#FF6838', brandForeground: '#0D1117', text: '#E5EBF2', textMuted: '#8193A6', border: '#2E3846' }
    }
  },
  {
    name: 'Lavender Dream',
    id: 'lavender-dream',
    description: 'Airy, whimsical purples with a very soft contrast balance. Perfect for feminine, creative, or luxury bookings.',
    colors: {
      light: { bg: '#FBFAFF', surface: '#FFFFFF', surfaceHighlight: '#F3F0FA', brand: '#835AF1', brandForeground: '#FFFFFF', text: '#1E1533', textMuted: '#8D7EA8', border: '#E9E5F5' },
      dark: { bg: '#100B1A', surface: '#171026', surfaceHighlight: '#251A3D', brand: '#9C78FF', brandForeground: '#FFFFFF', text: '#EDE8F7', textMuted: '#A091C2', border: '#2B2042' }
    }
  },
  {
    name: 'Swiss Azure',
    id: 'swiss-azure',
    description: 'Ultra-clean, crisp icy whites and blues. A no-nonsense, highly legible theme inspired by Swiss design.',
    colors: {
      light: { bg: '#F8FAFC', surface: '#FFFFFF', surfaceHighlight: '#F1F5F9', brand: '#0284C7', brandForeground: '#FFFFFF', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0' },
      dark: { bg: '#020617', surface: '#0F172A', surfaceHighlight: '#1E293B', brand: '#0EA5E9', brandForeground: '#FFFFFF', text: '#F8FAFC', textMuted: '#94A3B8', border: '#1E293B' }
    }
  },
  {
    name: 'Vintage Film',
    id: 'vintage-film',
    description: 'Grainy, muted sepia undertones that evoke analog photography. Deep charcoal blacks and warm parchment whites.',
    colors: {
      light: { bg: '#F2EFEB', surface: '#EBE7E1', surfaceHighlight: '#DFD9CE', brand: '#A17F5B', brandForeground: '#FFFFFF', text: '#24211F', textMuted: '#877E76', border: '#D9D3C8' },
      dark: { bg: '#1A1817', surface: '#22201E', surfaceHighlight: '#302E2B', brand: '#B89673', brandForeground: '#1A1817', text: '#E5DFDA', textMuted: '#999088', border: '#363330' }
    }
  }
];
