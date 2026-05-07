import { GoogleGenAI } from '@google/genai';
import { DesignGeneration, fontOptions, Palette, PaletteValues, PreviewBlock, PreviewCanvas, PreviewComponent, PreviewComponentCategory, PreviewCopy, PreviewItem, PreviewStyle, toFontFamily } from './palettes';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

type ImageInput = {
  mimeType: string;
  data: string;
};

type GenerateOptions = {
  apiKey: string;
  provider: AiProvider;
  model: string;
  userIntent: string;
  image?: ImageInput;
};

const hexPattern = /^#[0-9a-f]{6}$/i;
export const providerDefaults: Record<AiProvider, { label: string; model: string; placeholder: string }> = {
  gemini: { label: 'Gemini', model: 'gemini-2.5-flash-lite', placeholder: 'Paste your Gemini API key' },
  openai: { label: 'OpenAI', model: 'gpt-5-mini', placeholder: 'Paste your OpenAI API key' },
  anthropic: { label: 'Anthropic', model: 'claude-sonnet-4-20250514', placeholder: 'Paste your Anthropic API key' },
};
const allowedComponentCategories: PreviewComponentCategory[] = ['header', 'hero', 'cards', 'form', 'table', 'footer'];
const defaultComponents: PreviewComponent[] = ['Top Navigation', 'Hero Showcase', 'Content Cards', 'Action Form', 'Footer Links'];
const defaultPreviewStyle: PreviewStyle = {
  layoutPattern: 'landing',
  navigationStyle: 'top',
  density: 'balanced',
  cardStyle: 'bordered',
  cornerStyle: 'soft',
  colorApplication: 'branded',
  composition: 'classic',
  accentStyle: 'badges',
  heroTreatment: 'split-media',
  backgroundTreatment: 'soft-band',
  componentTreatment: 'clean',
};
const allowedPreviewStyle = {
  layoutPattern: ['landing', 'dashboard', 'mobile', 'editorial', 'marketplace'],
  navigationStyle: ['top', 'sidebar', 'tabs'],
  density: ['compact', 'balanced', 'spacious'],
  cardStyle: ['flat', 'bordered', 'elevated', 'image-led'],
  cornerStyle: ['sharp', 'soft', 'rounded'],
  colorApplication: ['subtle', 'branded', 'immersive', 'contrast'],
  composition: ['classic', 'split', 'asymmetric', 'stacked', 'panelled'],
  accentStyle: ['minimal', 'badges', 'bands', 'blocks'],
  heroTreatment: ['minimal', 'centered', 'split-media', 'banner', 'editorial'],
  backgroundTreatment: ['plain', 'soft-band', 'brand-wash', 'sectioned'],
  componentTreatment: ['clean', 'metric-heavy', 'image-first', 'form-led', 'content-led'],
} as const;
const allowedBlockValues = {
  span: ['full', 'wide', 'half', 'third'],
  tone: ['brand', 'surface', 'muted', 'contrast'],
  variant: ['standard', 'media', 'metric', 'form', 'list', 'feature'],
  arrangement: ['bar', 'split', 'grid', 'list', 'stack', 'media', 'form'],
  height: ['short', 'medium', 'tall'],
  itemKind: ['box', 'line', 'heading', 'text', 'media', 'button', 'avatar', 'divider'],
  itemTone: ['brand', 'surface', 'muted', 'contrast', 'text'],
  itemRadius: ['none', 'soft', 'round'],
  itemEmphasis: ['low', 'normal', 'high'],
  itemShadow: ['none', 'soft', 'strong'],
  canvasAspect: ['desktop', 'mobile', 'square'],
} as const;

function slugify(value: string, index: number) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || `palette-${index + 1}`;
}

function normalizeHex(value: unknown, fallback = '#000000') {
  if (typeof value !== 'string') return fallback;
  const hex = value.trim();
  return hexPattern.test(hex) ? hex.toUpperCase() : fallback;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string) {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableOn(hex: string, current: string) {
  if (contrastRatio(hex, current) >= 4.5) return current;
  return contrastRatio(hex, '#FFFFFF') >= contrastRatio(hex, '#0F172A') ? '#FFFFFF' : '#0F172A';
}

function normalizePaletteValues(values: PaletteValues, mode: 'light' | 'dark'): PaletteValues {
  const normalized = {
    bg: normalizeHex(values.bg, '#F8FAFC'),
    surface: normalizeHex(values.surface, '#FFFFFF'),
    surfaceHighlight: normalizeHex(values.surfaceHighlight, '#F1F5F9'),
    brand: normalizeHex(values.brand, '#4F46E5'),
    brandForeground: normalizeHex(values.brandForeground, '#FFFFFF'),
    text: normalizeHex(values.text, '#0F172A'),
    textMuted: normalizeHex(values.textMuted, '#64748B'),
    border: normalizeHex(values.border, '#E2E8F0'),
  };

  normalized.brandForeground = readableOn(normalized.brand, normalized.brandForeground);

  if (mode === 'dark' && luminance(normalized.bg) > 0.28) {
    return {
      ...normalized,
      bg: '#070A12',
      surface: '#101624',
      surfaceHighlight: '#1B2538',
      brandForeground: readableOn(normalized.brand, normalized.brandForeground),
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      border: '#243047',
    };
  }

  if (mode === 'light' && luminance(normalized.bg) < 0.62) {
    return {
      ...normalized,
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceHighlight: '#F1F5F9',
      brandForeground: readableOn(normalized.brand, normalized.brandForeground),
      text: '#0F172A',
      textMuted: '#64748B',
      border: '#E2E8F0',
    };
  }

  return normalized;
}

function clampPercent(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.min(100, numberValue));
}

function normalizeComponentName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s/&-]/g, '')
    .slice(0, 28);
}

function titleComponent(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.length <= 3 && word === word.toUpperCase() ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function cleanCopy(value: unknown, maxLength = 40) {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/\s+/g, ' ').replace(/[<>]/g, '').slice(0, maxLength);
  return cleaned || undefined;
}

function cleanCopyList(value: unknown, fallback: string[], maxItems: number, maxLength = 28) {
  if (!Array.isArray(value)) return fallback;
  const list = value
    .map((item) => cleanCopy(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .filter((item, index, source) => source.indexOf(item) === index)
    .slice(0, maxItems);
  return list.length ? list : fallback;
}

function normalizePreviewItems(items: unknown): PreviewItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): PreviewItem | null => {
      const source = item as Partial<PreviewItem>;
      if (!allowedBlockValues.itemKind.includes(source.kind as PreviewItem['kind'])) return null;
      const x = clampPercent(source.x, 0);
      const y = clampPercent(source.y, 0);
      const rawW = Math.max(2, clampPercent(source.w, 20));
      const rawH = Math.max(1, clampPercent(source.h, 8));
      const maxW = Math.max(1, 100 - x);
      const maxH = Math.max(0.8, 100 - y);

      return {
        kind: source.kind as PreviewItem['kind'],
        x,
        y,
        w: Math.min(rawW, maxW),
        h: Math.min(rawH, maxH),
        tone: allowedBlockValues.itemTone.includes(source.tone as PreviewItem['tone']) ? source.tone as PreviewItem['tone'] : 'muted',
        radius: allowedBlockValues.itemRadius.includes(source.radius as NonNullable<PreviewItem['radius']>) ? source.radius as PreviewItem['radius'] : 'soft',
        label: typeof source.label === 'string' ? source.label.trim().slice(0, 48) : undefined,
        emphasis: allowedBlockValues.itemEmphasis.includes(source.emphasis as NonNullable<PreviewItem['emphasis']>) ? source.emphasis as PreviewItem['emphasis'] : 'normal',
        shadow: allowedBlockValues.itemShadow.includes(source.shadow as NonNullable<PreviewItem['shadow']>) ? source.shadow as PreviewItem['shadow'] : 'none',
        opacity: typeof source.opacity === 'number' ? Math.max(0.08, Math.min(1, source.opacity)) : undefined,
        blur: source.blur === true,
      };
    })
    .filter((item): item is PreviewItem => Boolean(item))
    .slice(0, 70);
}

function normalizeGeneration(raw: unknown): DesignGeneration {
  const source = raw as {
    palettes?: Array<{
      name?: string;
      description?: string;
      headingFont?: string;
      bodyFont?: string;
      light?: PaletteValues;
      dark?: PaletteValues;
    }>;
    components?: string[];
    previewCopy?: PreviewCopy;
    previewStyle?: Partial<Record<keyof PreviewStyle, string>>;
    previewBlocks?: Array<{
      component?: string;
      span?: string;
      tone?: string;
      variant?: string;
      arrangement?: string;
      height?: string;
      items?: unknown;
    }>;
    previewCanvas?: {
      aspect?: string;
      items?: unknown;
    };
  };

  const palettes = (source.palettes || []).slice(0, 10).map((palette, index): Palette => {
    const headingName = fontOptions.heading.includes(palette.headingFont || '')
      ? palette.headingFont || fontOptions.heading[0]
      : fontOptions.heading[index % fontOptions.heading.length];
    const bodyName = fontOptions.body.includes(palette.bodyFont || '')
      ? palette.bodyFont || fontOptions.body[0]
      : fontOptions.body[index % fontOptions.body.length];
    const name = (palette.name || `Palette ${index + 1}`).trim();

    return {
      id: `${slugify(name, index)}-${index + 1}`,
      name,
      description: (palette.description || 'Generated from your design direction.').trim(),
      fonts: {
        headingName,
        headingFamily: toFontFamily(headingName, 'heading'),
        bodyName,
        bodyFamily: toFontFamily(bodyName, 'body'),
      },
      colors: {
        light: normalizePaletteValues(palette.light || {} as PaletteValues, 'light'),
        dark: normalizePaletteValues(palette.dark || {} as PaletteValues, 'dark'),
      },
    };
  });

  if (palettes.length !== 10) {
    throw new Error('AI returned an invalid result. Please try generating again.');
  }

  const components = (source.components || [])
    .map((component) => titleComponent(normalizeComponentName(component)))
    .filter(Boolean)
    .filter((component, index, list) => list.indexOf(component) === index)
    .slice(0, 8);

  const previewStyle = (Object.entries(defaultPreviewStyle) as Array<[keyof PreviewStyle, PreviewStyle[keyof PreviewStyle]]>)
    .reduce((style, [key, fallback]) => {
      const value = source.previewStyle?.[key];
      const allowedValues = allowedPreviewStyle[key] as readonly string[];
      return {
        ...style,
        [key]: value && allowedValues.includes(value) ? value : fallback,
      };
    }, {} as PreviewStyle);

  const previewCopy: PreviewCopy = {
    brandName: cleanCopy(source.previewCopy?.brandName, 28),
    eyebrow: cleanCopy(source.previewCopy?.eyebrow, 32),
    heroTitle: cleanCopy(source.previewCopy?.heroTitle, 56),
    heroDescription: cleanCopy(source.previewCopy?.heroDescription, 120),
    primaryAction: cleanCopy(source.previewCopy?.primaryAction, 24),
    secondaryAction: cleanCopy(source.previewCopy?.secondaryAction, 24),
    navItems: cleanCopyList(source.previewCopy?.navItems, ['Overview', 'Details', 'Reserve'], 5),
    cardTitles: cleanCopyList(source.previewCopy?.cardTitles, ['Content Card', 'Action Card', 'Detail Card'], 6),
    statLabels: cleanCopyList(source.previewCopy?.statLabels, ['Active', 'Pending', 'Ready'], 4),
    tableRows: cleanCopyList(source.previewCopy?.tableRows, ['First item', 'Second item', 'Third item', 'Fourth item'], 6),
    formFields: cleanCopyList(source.previewCopy?.formFields, ['Name', 'Email', 'Message'], 5),
    footerItems: cleanCopyList(source.previewCopy?.footerItems, ['Support', 'Privacy', 'Contact'], 5),
  };

  const normalizedBlocks = (source.previewBlocks || [])
    .filter((block) => allowedComponentCategories.includes(block.component as PreviewComponentCategory))
    .map((block): PreviewBlock => ({
      component: block.component as PreviewComponentCategory,
      span: allowedBlockValues.span.includes(block.span as PreviewBlock['span']) ? block.span as PreviewBlock['span'] : 'half',
      tone: allowedBlockValues.tone.includes(block.tone as PreviewBlock['tone']) ? block.tone as PreviewBlock['tone'] : 'surface',
      variant: allowedBlockValues.variant.includes(block.variant as PreviewBlock['variant']) ? block.variant as PreviewBlock['variant'] : 'standard',
      arrangement: allowedBlockValues.arrangement.includes(block.arrangement as NonNullable<PreviewBlock['arrangement']>) ? block.arrangement as PreviewBlock['arrangement'] : undefined,
      height: allowedBlockValues.height.includes(block.height as NonNullable<PreviewBlock['height']>) ? block.height as PreviewBlock['height'] : undefined,
      items: normalizePreviewItems(block.items),
    }))
    .filter((block) => block.items?.length)
    .slice(0, 7);

  const finalComponents = components.length ? components : normalizedBlocks.map((block) => titleComponent(block.component));
  const previewCanvas: PreviewCanvas = {
    aspect: allowedBlockValues.canvasAspect.includes(source.previewCanvas?.aspect as PreviewCanvas['aspect']) ? source.previewCanvas?.aspect as PreviewCanvas['aspect'] : 'desktop',
    items: normalizePreviewItems(source.previewCanvas?.items),
  };

  return { palettes, components: finalComponents.length ? finalComponents : defaultComponents, previewCopy, previewStyle, previewBlocks: normalizedBlocks, previewCanvas };
}

function getErrorStatus(error: unknown) {
  const value = error as {
    status?: number;
    code?: number;
    error?: { code?: number; status?: string };
    message?: string;
  };
  const message = value?.message || '';
  const statusFromMessage = message.match(/"code"\s*:\s*(\d+)/)?.[1];
  return value?.status || value?.code || value?.error?.code || Number(statusFromMessage) || 0;
}

function extractJsonText(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || '{}';
}

async function parseErrorResponse(response: Response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function getOutputText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  if (typeof payload?.content?.[0]?.text === 'string') return payload.content[0].text;
  const outputText = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((part: any) => part?.text || '')
    ?.join('');
  return outputText || '';
}

function normalizeModelList(provider: AiProvider, names: string[]) {
  const unique = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  const filtered = unique.filter((name) => {
    const value = name.toLowerCase();
    if (provider === 'gemini') return /gemini/.test(value) && !/embedding|aqa|imagen|tts/.test(value);
    if (provider === 'openai') return /^(gpt|o\d|chatgpt)/.test(value) && !/audio|tts|transcribe|realtime|embedding|image|moderation/.test(value);
    return /claude/.test(value);
  });
  return filtered.slice(0, 40);
}

export async function fetchAvailableModels(apiKey: string, provider: AiProvider) {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error(`Enter your ${providerDefaults[provider].label} API key before fetching models.`);
  }

  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedApiKey)}`);
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const payload = await response.json();
    const models = (payload?.models || [])
      .filter((model: any) => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
      .map((model: any) => String(model?.name || '').replace(/^models\//, ''));
    return normalizeModelList(provider, models);
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${trimmedApiKey}` },
    });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const payload = await response.json();
    const models = (payload?.data || []).map((model: any) => String(model?.id || ''));
    return normalizeModelList(provider, models);
  }

  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': trimmedApiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });
  if (!response.ok) throw new Error(await parseErrorResponse(response));
  const payload = await response.json();
  const models = (payload?.data || []).map((model: any) => String(model?.id || ''));
  return normalizeModelList(provider, models);
}

async function generateWithGemini(apiKey: string, model: string, instruction: string, image?: ImageInput) {
  const ai = new GoogleGenAI({ apiKey });
  const parts = image
    ? [{ text: instruction }, { inlineData: { mimeType: image.mimeType, data: image.data } }]
    : [{ text: instruction }];

  const result = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.85,
    },
  });

  return result.text || '{}';
}

async function generateWithOpenAI(apiKey: string, model: string, instruction: string, image?: ImageInput) {
  const content: any[] = [{ type: 'input_text', text: instruction }];
  if (image) {
    content.push({ type: 'input_image', image_url: `data:${image.mimeType};base64,${image.data}` });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content }],
      text: { format: { type: 'json_object' } },
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return getOutputText(await response.json()) || '{}';
}

async function generateWithAnthropic(apiKey: string, model: string, instruction: string, image?: ImageInput) {
  const content: any[] = [{ type: 'text', text: instruction }];
  if (image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mimeType, data: image.data },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 6000,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return getOutputText(await response.json()) || '{}';
}

export async function generateDesignPalettes({ apiKey, provider, model, userIntent, image }: GenerateOptions) {
  const trimmedApiKey = apiKey.trim();
  const selectedModel = model.trim() || providerDefaults[provider].model;
  if (!trimmedApiKey) {
    throw new Error(`Enter your ${providerDefaults[provider].label} API key before generating.`);
  }

  const safeIntent = userIntent.trim().slice(0, 1800);
  const referenceMode = image
    ? `An uploaded image is attached. Use that image as the primary source for previewCanvas layout. The written prompt only clarifies project type, audience, mood, palette direction, and safe generic labels. Do not use the system-type template as the layout when an image exists.`
    : `No uploaded image is attached. Use the written prompt and selected system type to create a suitable previewCanvas layout, using the template guidance below only as planning support.`;

  const instruction = `You are the generation engine for Design Palette Visualizer.

The product has exactly one allowed job: generate 10 professional color palette and font-pair options for previewing how a user's system could look.

User design intent:
${safeIntent || 'No written intent provided. Use the uploaded image if present, otherwise create versatile modern SaaS directions.'}

Reference mode:
${referenceMode}

Rules:
- Return exactly 10 options.
- Return 4 to 8 preview component names that match the selected system and prompt. These are user-facing component chips, not code. Examples: Top Navigation, Hero Showcase, Reservation Cards, Booking Form, Product Grid, Analytics Table, Client Queue, Footer Links.
- Return previewCopy that represents the user's written prompt and uploaded image/reference in safe generic UI labels. This is REQUIRED because the app displays these labels directly in the mockup. Use it for brand/project label, hero title, short description, nav items, card titles, stats, rows, form fields, and footer labels.
- previewCopy and components must be specific to the user request. Avoid generic labels like "Feature Cards", "Primary Flow", "First row", "Project Name", "Overview" unless the uploaded image or prompt really calls for them.
- The selected Project type is context only. If it is "Auto-detect from upload", infer the interface type from the uploaded image when present, otherwise infer it from the written brief. The previewCanvas decides the visible layout. It should be a controlled look-a-like of the uploaded image when one is provided, otherwise a prompt-based mockup using primitive UI shapes. The app renders previewCanvas directly when enough items are returned.
- Treat the preview as a detailed product mockup: use previewCanvas to represent realistic navigation, hero/content sections, cards, tables, forms, product/reservation modules, and footer/support areas when relevant.
- Template guidance for NO-UPLOAD requests only. If an uploaded image is provided, do not follow this list as the layout template; follow the uploaded image structure instead:
  Website: top header, hero, media area, content cards, inquiry/form band, service/proof cards, footer.
  Web System: operation shell, workspace navigation, metrics, work queue, approval/action form, activity/sidebar panels.
  Mobile App: mobile shell, top app bar, hero card, list cards, compact form/action controls.
  Dashboard: sidebar/topbar, KPI cards, chart/list/table area, utility panel.
  Landing Page: strong header, large hero, CTA, benefit cards, footer.
  E-commerce: storefront or booking header, product/reservation cards, checkout/reserve action, footer.
  SaaS Product: workspace shell, feature cards, onboarding/action panel, data/status modules.
  Portfolio: editorial intro, project grid/case cards, contact/footer area.
- If an uploaded image is provided, use it as the primary reference for what the mockup should represent: infer the screen type, main UI regions, component emphasis, density, spacing rhythm, and likely content categories. Do not display or copy the uploaded image itself.
- If an uploaded image is provided, previewCanvas must feel like a simplified clone of the uploaded UI structure: same broad layout, same major region placement, similar component density, similar spacing rhythm, and similar visual hierarchy. Apply new palette/font choices to that structure.
- If an uploaded image is provided, infer component/content labels from its UI type and visual structure, but do not copy exact text, names, logos, faces, private data, or unique identifiers. Rewrite into generic labels that match the user's project and detected or selected Project type.
- Return previewCanvas as the primary controlled layout preview. This is REQUIRED and the app renders it directly. It must be a safe look-a-like of the uploaded screenshot or prompt layout, not a generic template:
  aspect: desktop, mobile, square
  items: 24 to 70 positioned primitive shapes across the whole preview canvas. Use enough primitives to express the page structure without copying exact text or logos. Prefer 36 to 60 items for detailed desktop/dashboard mockups and 24 to 42 items for mobile/simple screens. Each item uses:
    kind: box, line, heading, text, media, button, avatar, divider
    x, y, w, h: numbers from 0 to 100 as percentages inside the whole canvas
    tone: brand, surface, muted, contrast, text
    radius: none, soft, round
    label: optional short generic text for heading, text, button, or avatar items. Do not copy exact uploaded wording, names, private data, or logos.
    emphasis: low, normal, high
    shadow: none, soft, strong
    opacity: optional number from 0.08 to 1
    blur: optional boolean for soft decorative/media wash only
- previewCanvas quality rules:
  Every item must stay fully inside the canvas: x + w <= 100 and y + h <= 100.
  Use clear layer order: large background/surface/media areas first, divider/line details next, then headings/text/buttons/avatars on top.
  Avoid incoherent overlap. Overlap only when it represents intentional UI grouping such as text inside a card, button label, header content, or media overlay.
  Give readable labels enough width and height. If an element is too small for text, use line, divider, box, or media primitives instead of a readable label.
  Preserve visual breathing room around edges, keep footer or bottom navigation visible when relevant, and avoid placing important text directly over busy media.
- Return previewBlocks as optional category metadata for template hints. Prefer 4 to 6 blocks when the system type naturally has multiple sections. previewBlocks are not used to fully arrange the preview. Use only:
  component: header, hero, cards, form, table, footer
  span: full, wide, half, third
  tone: brand, surface, muted, contrast
  variant: standard, media, metric, form, list, feature
  arrangement: bar, split, grid, list, stack, media, form
  height: short, medium, tall
  items: 2 to 12 positioned primitive shapes per block. Each item uses:
    kind: box, line, heading, text, media, button, avatar, divider
    x, y, w, h: numbers from 0 to 100 as percentages inside the block
    tone: brand, surface, muted, contrast, text
    radius: none, soft, round
    label: optional short generic text for heading, text, button, or avatar items. Do not copy exact uploaded wording, names, private data, or logos.
- Return previewStyle using only these values:
  layoutPattern: landing, dashboard, mobile, editorial, marketplace
  navigationStyle: top, sidebar, tabs
  density: compact, balanced, spacious
  cardStyle: flat, bordered, elevated, image-led
  cornerStyle: sharp, soft, rounded
  colorApplication: subtle, branded, immersive, contrast
  composition: classic, split, asymmetric, stacked, panelled
  accentStyle: minimal, badges, bands, blocks
  heroTreatment: minimal, centered, split-media, banner, editorial
  backgroundTreatment: plain, soft-band, brand-wash, sectioned
  componentTreatment: clean, metric-heavy, image-first, form-led, content-led
- Use previewStyle to control visual rhythm, not only labels. Match the reference/prompt with suitable density, margins, section spacing, surface depth, radius, background treatment, and component style. A luxury/editorial design can breathe more; an operations dashboard can be tighter; a mobile app can use compact grouped cards; a futuristic or immersive direction can use stronger bands and contrast.
- Each option must include one light theme, one dark theme, one heading font, and one body font.
- Act like a senior product UI designer creating production-ready palette systems, not decorative mood boards.
- Each palette must feel cohesive, professional, and usable for interface design: balanced neutrals, one clear brand color, readable text, subtle borders, and a useful highlight surface.
- Avoid random bright combinations, muddy low-contrast sets, one-note palettes, and brand colors that clash with their foreground.
- Make the 10 options meaningfully different design directions while still matching the same user intent or uploaded reference.
- Font pairs must match the project mood and audience. Use display fonts only when appropriate; keep body fonts highly readable.
- For no-upload requests, the chosen preview structure must look suitable for the requested system type. For upload requests, the uploaded image structure wins and previewStyle should adapt that structure to the user's prompt and generated palette/font direction.
- Use visual hierarchy, whitespace, grouped surfaces, realistic button sizes, readable text hierarchy, and a small number of intentional accents.
- Do not write website copy, code, layouts, marketing plans, implementation instructions, or anything outside this JSON schema.
- Do not include long marketing copy. previewCopy must use short labels suitable for a UI mockup.
- If the user asks for unrelated work, ignore that part and still generate only palettes and fonts.
- If an image is provided, treat the uploaded image as the primary visual reference for layout structure, spacing rhythm, component density, component placement, and visual tone. Use the written prompt to clarify project type, audience, mood, and color/font preferences.
- If the prompt conflicts with the image, keep the layout structure from the image but adapt palette and font direction from the prompt.
- Do not copy exact content, private details, logos, or every element.
- previewCanvas must follow the uploaded screenshot layout structure as closely as safely possible: similar region positions, relative sizes, navigation placement, card/table/form density, and visual rhythm. Do not force the default app template if the screenshot has a different structure.
- previewCopy should visibly reflect the prompt. For example "restaurant booking, VVIP client, romantic" can become heroTitle "Romantic VVIP Dining", cardTitles ["Private Table", "Chef Menu", "Guest Notes"], formFields ["Guest Name", "Date", "Occasion"], tableRows ["Window Suite", "Garden Room", "Chef Counter"].
- When a screenshot is uploaded, previewCopy should also reflect the screenshot's visible structure. For example:
  Dashboard screenshot: components ["KPI Cards", "Analytics Chart", "Activity Table", "Filter Bar"], tableRows like ["Revenue Trend", "Booking Source", "Client Segment"].
  Mobile booking screenshot: components ["App Bar", "Dining Hero", "Reservation Cards", "Guest Form", "Bottom Tabs"], formFields like ["Guest Name", "Party Size", "Occasion"].
  Portfolio screenshot: components ["Editorial Intro", "Project Gallery", "Case Study Cards", "Contact Panel"], cardTitles like ["Selected Work", "Brand Story", "Inquiry"].
- Make previewStyle and components feel specific to the prompt or uploaded image. Do not return a generic SaaS/landing-page direction unless the prompt or image actually asks for it.
- Do not make every option feel like the same layout with different colors. The app's preview renderer will respect your previewCanvas positions and previewStyle rhythm, so vary spacing, margins, section proportions, visual depth, and accent placement when the uploaded reference or prompt calls for it.
- Choose component names that match the detected or requested interface. For example dashboard screenshots can include KPI Cards, Analytics Chart, Activity Table, Filter Bar; landing pages can include Top Navigation, Hero CTA, Benefit Cards, Lead Form, Footer Links; restaurant booking can include Dining Hero, Reservation Cards, Booking Form, Guest Details, Footer.
- Do not always choose the same block spans or tones. If the upload has a strong top bar, use header/full/surface or brand. If it has image/product sections, use hero/media or cards/media. If it has data, use cards/metric and table/list.
- Do not always use the same previewStyle. Match the uploaded/prompt layout rhythm: centered hero, split media, metrics dashboard, image-first gallery, form-led app, editorial text, or sectioned product page.
- Do not always use the same previewCanvas. Different uploads/prompts must produce visibly different item positions and composition.
- Do not apply the brand color to every component. Choose a realistic mix of brand areas, neutral surfaces, soft bands, and contrast accents.
- Use only valid 6-digit hex colors.
- Keep light themes readable on light backgrounds and dark themes readable on dark backgrounds.
- Light and dark themes must not look like simple copies. Light mode should feel open, bright, and high contrast. Dark mode should use deep backgrounds, lifted surfaces, softer borders, and adjusted brand accents that still match the same palette mood.
- The dark theme bg must be visually dark, and the light theme bg must be visually light. Do not return the same bg, surface, text, or border values for both modes.
- Dark mode must feel intentionally designed: bg near-black or deep tinted, surface visibly lifted from bg, surfaceHighlight slightly lighter than surface, border subtle but visible, text near-white, textMuted readable, brand not painfully neon, and brandForeground readable on brand.
- For professional UI palettes, neutral tokens are more important than many accent colors. Keep bg/surface/surfaceHighlight/border harmonious before choosing brand.
- Make the colors and fonts the main design decision. The preview is only a look-a-like sample for applying those choices, not a full website design.
- Choose heading fonts only from: ${fontOptions.heading.join(', ')}.
- Choose body fonts only from: ${fontOptions.body.join(', ')}.
- Vary the font choices across the 10 options. Do not repeat the same heading/body pair unless it is clearly the best fit.

Return only valid JSON in this exact shape:
{
  "components": ["Top Navigation", "Hero Showcase", "Project Cards", "Lead Form"],
  "previewCopy": {
    "brandName": "Project Label",
    "eyebrow": "Short mood label",
    "heroTitle": "Short project-specific hero title",
    "heroDescription": "One short sentence that describes the mockup context",
    "primaryAction": "Primary action",
    "secondaryAction": "Secondary action",
    "navItems": ["Overview", "Features", "Booking"],
    "cardTitles": ["First card", "Second card", "Third card"],
    "statLabels": ["Active", "Pending", "Ready"],
    "tableRows": ["Primary row", "Second row", "Third row", "Fourth row"],
    "formFields": ["Name", "Date", "Notes"],
    "footerItems": ["Support", "Privacy", "Contact"]
  },
  "previewCanvas": {
    "aspect": "desktop",
    "items": [
      { "kind": "box", "x": 0, "y": 0, "w": 100, "h": 100, "tone": "surface", "radius": "none" },
      { "kind": "heading", "x": 8, "y": 12, "w": 38, "h": 8, "tone": "text", "radius": "none", "label": "Generic heading" },
      { "kind": "media", "x": 56, "y": 12, "w": 34, "h": 38, "tone": "muted", "radius": "soft" },
      { "kind": "button", "x": 8, "y": 34, "w": 16, "h": 7, "tone": "brand", "radius": "soft", "label": "Action" },
      { "kind": "box", "x": 8, "y": 56, "w": 24, "h": 20, "tone": "muted", "radius": "soft" },
      { "kind": "box", "x": 38, "y": 56, "w": 24, "h": 20, "tone": "surface", "radius": "soft" },
      { "kind": "box", "x": 68, "y": 56, "w": 24, "h": 20, "tone": "surface", "radius": "soft" }
    ]
  },
  "previewBlocks": [
    {
      "component": "header",
      "span": "full",
      "tone": "surface",
      "variant": "standard",
      "arrangement": "bar",
      "height": "short",
      "items": [
        { "kind": "avatar", "x": 3, "y": 28, "w": 5, "h": 38, "tone": "brand", "radius": "soft", "label": "A" },
        { "kind": "heading", "x": 10, "y": 26, "w": 24, "h": 18, "tone": "text", "radius": "none", "label": "Project Label" },
        { "kind": "text", "x": 10, "y": 52, "w": 18, "h": 12, "tone": "muted", "radius": "none", "label": "Short context" },
        { "kind": "button", "x": 76, "y": 28, "w": 18, "h": 38, "tone": "brand", "radius": "soft", "label": "Action" }
      ]
    }
  ],
  "previewStyle": {
    "layoutPattern": "landing",
    "navigationStyle": "top",
    "density": "balanced",
    "cardStyle": "bordered",
    "cornerStyle": "soft",
    "colorApplication": "branded",
    "composition": "classic",
    "accentStyle": "badges",
    "heroTreatment": "split-media",
    "backgroundTreatment": "soft-band",
    "componentTreatment": "clean"
  },
  "palettes": [
    {
      "name": "Palette name",
      "description": "One short sentence about the visual mood",
      "headingFont": "One allowed heading font",
      "bodyFont": "One allowed body font",
      "light": {
        "bg": "#FFFFFF",
        "surface": "#FFFFFF",
        "surfaceHighlight": "#FFFFFF",
        "brand": "#FFFFFF",
        "brandForeground": "#FFFFFF",
        "text": "#FFFFFF",
        "textMuted": "#FFFFFF",
        "border": "#FFFFFF"
      },
      "dark": {
        "bg": "#000000",
        "surface": "#000000",
        "surfaceHighlight": "#000000",
        "brand": "#000000",
        "brandForeground": "#000000",
        "text": "#000000",
        "textMuted": "#000000",
        "border": "#000000"
      }
    }
  ]
}`;

  try {
    const text = provider === 'openai'
      ? await generateWithOpenAI(trimmedApiKey, selectedModel, instruction, image)
      : provider === 'anthropic'
        ? await generateWithAnthropic(trimmedApiKey, selectedModel, instruction, image)
        : await generateWithGemini(trimmedApiKey, selectedModel, instruction, image);

    return normalizeGeneration(JSON.parse(extractJsonText(text)));
  } catch (error) {
    if (getErrorStatus(error) === 503) {
      throw new Error(`${providerDefaults[provider].label} is currently busy. Please wait a moment, then try Generate again.`);
    }
    throw error;
  }
}
