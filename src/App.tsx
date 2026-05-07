import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  History,
  Loader2,
  Moon,
  Palette as PaletteIcon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AiProvider, fetchAvailableModels, generateDesignPalettes, providerDefaults } from './designGenerator';
import { fontOptions, Palette, PaletteValues, PreviewBlock, PreviewCanvas, PreviewComponent, PreviewComponentCategory, PreviewCopy, PreviewItem, PreviewStyle, toFontFamily } from './palettes';

type UploadedImage = {
  name: string;
  mimeType: string;
  data: string;
  previewUrl: string;
};

type DesignBrief = {
  systemType: string;
  designType: string;
  industry: string;
  audience: string;
  mood: string;
  notes: string;
};

type InputMode = 'screenshot' | 'brief';

type SavedGeneration = {
  id: string;
  createdAt: string;
  intent: string;
  inputMode?: InputMode;
  brief?: DesignBrief;
  imageName?: string;
  palettes: Palette[];
  components?: PreviewComponent[];
  previewCopy?: PreviewCopy;
  previewStyle?: PreviewStyle;
  previewBlocks?: PreviewBlock[];
  previewCanvas?: PreviewCanvas;
};

const providerOptions = Object.entries(providerDefaults) as Array<[AiProvider, typeof providerDefaults[AiProvider]]>;

type PreviewContent = {
  brandName: string;
  initial: string;
  systemType: string;
  designType: string;
  useCase: string;
  audience: string;
  mood: string;
  pageSubject: string;
  resultLabel: string;
  cardTitles: string[];
  statLabels: string[];
  navItems: string[];
  formFields: string[];
  tableRows: string[];
  footerItems: string[];
  primaryAction: string;
  secondaryAction: string;
  heroTitle: string;
  heroDescription: string;
};

const maxSavedHistory = 20;
const generateCooldownMs = 8000;
const autoProjectType = 'Auto-detect from upload';
const designTypes = ['Minimal', 'Corporate', 'Luxury', 'Playful', 'Editorial', 'Futuristic', 'Warm', 'Bold', 'Calm', 'High Contrast'];
const defaultPreviewComponents: PreviewComponent[] = ['Header', 'Hero Showcase', 'Feature Cards', 'Contact Form', 'Footer'];
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

const emptyBrief: DesignBrief = {
  systemType: autoProjectType,
  designType: 'Minimal',
  industry: '',
  audience: '',
  mood: '',
  notes: '',
};

const samplePalette: Palette = {
  id: 'waiting-for-generation',
  name: 'Waiting for Direction',
  description: 'Describe the mood, brand, audience, or upload a visual reference to generate 10 tailored options.',
  fonts: {
    headingName: 'Bricolage Grotesque',
    headingFamily: toFontFamily('Bricolage Grotesque', 'heading'),
    bodyName: 'Manrope',
    bodyFamily: toFontFamily('Manrope', 'body'),
  },
  colors: {
    light: { bg: '#F8FAFC', surface: '#FFFFFF', surfaceHighlight: '#F1F5F9', brand: '#4F46E5', brandForeground: '#FFFFFF', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0' },
    dark: { bg: '#070A12', surface: '#101624', surfaceHighlight: '#1B2538', brand: '#8B5CF6', brandForeground: '#FFFFFF', text: '#F8FAFC', textMuted: '#94A3B8', border: '#243047' },
  },
};

async function writeJsonFile(directoryHandle: any, fileName: string, data: unknown) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readJsonFile<T>(directoryHandle: any, fileName: string): Promise<T | null> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

async function readHistoryFiles(directoryHandle: any): Promise<SavedGeneration[]> {
  try {
    const historyDirectory = await directoryHandle.getDirectoryHandle('history', { create: true });
    const entries: SavedGeneration[] = [];

    for await (const [, handle] of historyDirectory.entries()) {
      if (handle.kind !== 'file' || !handle.name.endsWith('.json')) continue;
      const file = await handle.getFile();
      const parsed = JSON.parse(await file.text()) as SavedGeneration;
      if (parsed?.id && Array.isArray(parsed.palettes)) {
        entries.push(parsed);
      }
    }

    return entries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxSavedHistory);
  } catch {
    return [];
  }
}

function buildBriefPrompt(brief: DesignBrief, inputMode: InputMode, hasUploadedImage: boolean) {
  const modeLabel = inputMode === 'screenshot' ? 'From Screenshot' : 'From Brief';
  return [
    `Input mode: ${modeLabel}`,
    `Uploaded screenshot provided: ${hasUploadedImage ? 'Yes' : 'No'}`,
    `Project type: Auto-detect`,
    `Project type rule: ${inputMode === 'screenshot' ? 'Auto-detect the interface type and layout from the uploaded image.' : 'Auto-detect the interface type and layout from the written use case and brief.'}`,
    `Design type: ${brief.designType}`,
    `Industry/use case: ${brief.industry || 'Not specified'}`,
    `Target audience: ${brief.audience || 'Not specified'}`,
    `Visual mood: ${brief.mood || 'Not specified'}`,
    `Specific palette/font notes: ${brief.notes || 'None'}`,
  ].join('\n');
}

function briefHasInput(brief: DesignBrief) {
  return Boolean(brief.industry.trim() || brief.audience.trim() || brief.mood.trim() || brief.notes.trim());
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function derivePreviewContent(brief: DesignBrief, previewCopy: PreviewCopy = {}): PreviewContent {
  const projectType = brief.systemType === autoProjectType ? 'Detected Project' : brief.systemType;
  const useCase = brief.industry.trim() || `${projectType} concept`;
  const audience = brief.audience.trim() || 'your target users';
  const mood = brief.mood.trim() || brief.designType.toLowerCase();
  const brandName = titleCase(useCase.replace(/\b(platform|system|website|web|app|application|dashboard|landing|page)\b/gi, '').trim()) || 'Your Project';
  const pageSubject = useCase.toLowerCase();

  const copyBrandName = previewCopy.brandName || brandName;
  return {
    brandName: copyBrandName,
    initial: copyBrandName.charAt(0).toUpperCase(),
    systemType: projectType,
    designType: brief.designType,
    useCase,
    audience,
    mood: previewCopy.eyebrow || mood,
    pageSubject,
    resultLabel: `${brief.designType} directions`,
    cardTitles: previewCopy.cardTitles?.length ? previewCopy.cardTitles : [
      `${brief.designType} direction`,
      `${mood} concept`,
      `${projectType} option`,
    ],
    statLabels: previewCopy.statLabels?.length ? previewCopy.statLabels : ['Styles', 'Screens', 'Saved'],
    navItems: previewCopy.navItems?.length ? previewCopy.navItems : ['Overview', 'Details', 'Reserve'],
    formFields: previewCopy.formFields?.length ? previewCopy.formFields : ['Name', 'Email', 'Notes'],
    tableRows: previewCopy.tableRows?.length ? previewCopy.tableRows : ['Primary item', 'Second item', 'Third item', 'Fourth item'],
    footerItems: previewCopy.footerItems?.length ? previewCopy.footerItems : ['Support', 'Privacy', 'Contact'],
    primaryAction: previewCopy.primaryAction || 'Primary action',
    secondaryAction: previewCopy.secondaryAction || 'Secondary',
    heroTitle: previewCopy.heroTitle || `${brief.designType} ${projectType}`,
    heroDescription: previewCopy.heroDescription || `${useCase} preview for ${audience}.`,
  };
}

function getComponentCategory(component: PreviewComponent): PreviewComponentCategory {
  const value = component.toLowerCase();
  if (/\b(header|nav|navigation|topbar|navbar|sidebar|menu|app bar)\b/.test(value)) return 'header';
  if (/\b(hero|banner|showcase|intro|cover|masthead|featured|gallery|media)\b/.test(value)) return 'hero';
  if (/\b(card|cards|product grid|feature|benefit|testimonial|pricing|plan|kpi|metric|stat|reservation card|workspace card)\b/.test(value)) return 'cards';
  if (/\b(form|input|field|search|filter|booking|reservation|checkout|contact|signup|sign up|login|approval|guest|lead)\b/.test(value)) return 'form';
  if (/\b(table|list|queue|kanban|pipeline|chart|analytics|report|grid|schedule|calendar|activity|feed|timeline)\b/.test(value)) return 'table';
  if (/\b(footer|support|links|legal|bottom)\b/.test(value)) return 'footer';
  return 'cards';
}

function getComponentLabel(component: PreviewComponent) {
  return component
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
  const [aiModel, setAiModel] = useState(providerDefaults.gemini.model);
  const [availableModels, setAvailableModels] = useState<string[]>([providerDefaults.gemini.model]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelNotice, setModelNotice] = useState('');
  const [showAdvancedModel, setShowAdvancedModel] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savedApiKeyValue, setSavedApiKeyValue] = useState('');
  const [savedProviderValue, setSavedProviderValue] = useState<AiProvider>('gemini');
  const [savedModelValue, setSavedModelValue] = useState(providerDefaults.gemini.model);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [folderHandle, setFolderHandle] = useState<any | null>(null);
  const [folderName, setFolderName] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('brief');
  const [brief, setBrief] = useState<DesignBrief>(emptyBrief);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [previewComponents, setPreviewComponents] = useState<PreviewComponent[]>(defaultPreviewComponents);
  const [componentChoices, setComponentChoices] = useState<PreviewComponent[]>(defaultPreviewComponents);
  const [previewCopy, setPreviewCopy] = useState<PreviewCopy>({});
  const [previewStyle, setPreviewStyle] = useState<PreviewStyle>(defaultPreviewStyle);
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([]);
  const [previewCanvas, setPreviewCanvas] = useState<PreviewCanvas | null>(null);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [selectedHeadingFont, setSelectedHeadingFont] = useState<string | null>(null);
  const [selectedBodyFont, setSelectedBodyFont] = useState<string | null>(null);
  const [sidebarView, setSidebarView] = useState<'generate' | 'history'>('generate');
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nextGenerateAt, setNextGenerateAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [history, setHistory] = useState<SavedGeneration[]>([]);
  const generateLockRef = useRef(false);

  const selectedPalette = useMemo(() => {
    return palettes.find((palette) => palette.id === selectedPaletteId) || palettes[0] || samplePalette;
  }, [palettes, selectedPaletteId]);

  const colors = isDark ? selectedPalette.colors.dark : selectedPalette.colors.light;
  const hasGenerated = palettes.length > 0;
  const currentBriefPrompt = buildBriefPrompt(brief, inputMode, Boolean(uploadedImage));
  const isFolderPickerSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const cooldownRemaining = Math.max(0, Math.ceil((nextGenerateAt - now) / 1000));
  const isGenerateBlocked = isGenerating || cooldownRemaining > 0;
  const headingFontName = selectedHeadingFont || selectedPalette.fonts.headingName;
  const bodyFontName = selectedBodyFont || selectedPalette.fonts.bodyName;
  const headingFontFamily = toFontFamily(headingFontName, 'heading');
  const bodyFontFamily = toFontFamily(bodyFontName, 'body');
  const headingFontChoices = useMemo(() => Array.from(new Set([...palettes.map((palette) => palette.fonts.headingName), ...fontOptions.heading])), [palettes]);
  const bodyFontChoices = useMemo(() => Array.from(new Set([...palettes.map((palette) => palette.fonts.bodyName), ...fontOptions.body])), [palettes]);
  const isCredentialSaved = Boolean(savedApiKeyValue) && apiKey.trim() === savedApiKeyValue && aiProvider === savedProviderValue && aiModel.trim() === savedModelValue;
  const currentModelOptions = useMemo(() => Array.from(new Set([aiModel || providerDefaults[aiProvider].model, providerDefaults[aiProvider].model, ...availableModels])).filter(Boolean), [aiModel, aiProvider, availableModels]);

  useEffect(() => {
    if (!isGenerating && cooldownRemaining <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [isGenerating, cooldownRemaining]);

  useEffect(() => {
    setSelectedHeadingFont(null);
    setSelectedBodyFont(null);
  }, [selectedPaletteId]);

  useEffect(() => {
    setIsApiKeySaved(isCredentialSaved);
  }, [isCredentialSaved]);

  const updateBrief = (key: keyof DesignBrief, value: string) => {
    setBrief((current) => ({ ...current, [key]: value }));
  };

  const updateInputMode = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === 'screenshot') {
      setBrief((current) => ({ ...current, systemType: autoProjectType }));
    }
  };

  const loadModels = async () => {
    if (!apiKey.trim()) {
      setError(`Enter your ${providerDefaults[aiProvider].label} API key before fetching models.`);
      return;
    }

    setIsFetchingModels(true);
    setModelNotice('');
    setError('');
    try {
      const models = await fetchAvailableModels(apiKey, aiProvider);
      const nextModels = models.length ? models : [providerDefaults[aiProvider].model];
      setAvailableModels(nextModels);
      const preferred = nextModels.includes(providerDefaults[aiProvider].model) ? providerDefaults[aiProvider].model : nextModels[0];
      setAiModel((current) => models.includes(current) ? current : preferred);
      setIsApiKeySaved(false);
      setModelNotice(models.length ? `Found ${models.length} available models.` : 'No model list returned. Using the recommended model.');
    } catch (err) {
      setAvailableModels([providerDefaults[aiProvider].model]);
      setAiModel((current) => current || providerDefaults[aiProvider].model);
      setModelNotice('Could not fetch models. Using the recommended model.');
      setError(err instanceof Error ? `Model list failed: ${err.message}` : 'Could not fetch models. Using the recommended model.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const syncHistoryToFolder = async (nextHistory: SavedGeneration[], directoryHandle = folderHandle) => {
    if (!directoryHandle) return;

    const historyDirectory = await directoryHandle.getDirectoryHandle('history', { create: true });
    await writeJsonFile(directoryHandle, 'history-index.json', nextHistory);
    await Promise.all(nextHistory.map((entry) => writeJsonFile(historyDirectory, `${entry.id}.json`, entry)));
  };

  const chooseLocalFolder = async () => {
    if (!isFolderPickerSupported) {
      setError('This browser cannot choose a local folder. Open the app in Chrome or Edge on HTTPS/localhost to save files locally.');
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setFolderHandle(handle);
      setFolderName(handle.name);
      setError('');

      const savedCredential = await readJsonFile<{ apiKey?: string; provider?: AiProvider; model?: string }>(handle, 'credentials.json');
      const savedHistory = await readHistoryFiles(handle);
      const nextProvider = savedCredential?.provider && providerDefaults[savedCredential.provider] ? savedCredential.provider : 'gemini';
      const nextModel = savedCredential?.model || providerDefaults[nextProvider].model;
      setAiProvider(nextProvider);
      setAiModel(nextModel);
      setAvailableModels([nextModel, providerDefaults[nextProvider].model]);
      setApiKey(savedCredential?.apiKey || '');
      setSavedApiKeyValue(savedCredential?.apiKey || '');
      setSavedProviderValue(nextProvider);
      setSavedModelValue(nextModel);
      setIsApiKeySaved(Boolean(savedCredential?.apiKey));
      setHasSavedApiKey(Boolean(savedCredential?.apiKey));
      setShowApiKey(false);
      setHistory(savedHistory);
      showSavedNotice(`Using local folder: ${handle.name}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Folder was not connected. If you selected a folder and still see this, open the app URL in Chrome or Edge because this browser view may block local folder access.');
        return;
      }
      setError('Could not open that folder. Please choose a writable local folder.');
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a photo or screenshot image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [, data = ''] = result.split(',');
      setUploadedImage({
        name: file.name,
        mimeType: file.type,
        data,
        previewUrl: result,
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (generateLockRef.current || isGenerating) {
      return;
    }

    if (cooldownRemaining > 0) {
      setError(`Please wait ${cooldownRemaining}s before generating again.`);
      return;
    }

    if (!apiKey.trim()) {
      setError(`Enter your ${providerDefaults[aiProvider].label} API key before generating.`);
      return;
    }

    if (inputMode === 'screenshot' && !uploadedImage) {
      setError('Upload a screenshot for this mode, or switch to From Brief if you do not have one.');
      return;
    }

    if (inputMode === 'brief' && !briefHasInput(brief)) {
      setError('Add at least one brief detail or upload a photo/screenshot first.');
      return;
    }

    generateLockRef.current = true;
    setIsGenerating(true);
    setError('');

    try {
      const generation = await generateDesignPalettes({
        apiKey,
        provider: aiProvider,
        model: aiModel,
        userIntent: currentBriefPrompt,
        image: inputMode === 'screenshot' && uploadedImage ? { mimeType: uploadedImage.mimeType, data: uploadedImage.data } : undefined,
      });
      setPalettes(generation.palettes);
      setPreviewComponents(generation.components);
      setComponentChoices(generation.components);
      setPreviewCopy(generation.previewCopy);
      setPreviewStyle(generation.previewStyle);
      setPreviewBlocks(generation.previewBlocks);
      setPreviewCanvas(generation.previewCanvas);
      setSelectedPaletteId(generation.palettes[0].id);
      setSelectedHeadingFont(null);
      setSelectedBodyFont(null);
      setActiveHistoryId(null);
      await saveGeneration(generation.palettes, generation.components, generation.previewStyle, generation.previewBlocks, generation.previewCanvas, generation.previewCopy, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      generateLockRef.current = false;
      setIsGenerating(false);
      setNextGenerateAt(Date.now() + generateCooldownMs);
    }
  };

  const showSavedNotice = (message: string) => {
    setSavedNotice(message);
    setTimeout(() => setSavedNotice(''), 2200);
  };

  const saveCredential = async () => {
    if (!apiKey.trim()) {
      setError(`Enter your ${providerDefaults[aiProvider].label} API key before saving.`);
      return;
    }

    if (!folderHandle) {
      setError('Choose a local folder before saving your API key.');
      return;
    }

    await writeJsonFile(folderHandle, 'credentials.json', { apiKey: apiKey.trim(), provider: aiProvider, model: aiModel.trim() || providerDefaults[aiProvider].model, savedAt: new Date().toISOString() });
    setSavedApiKeyValue(apiKey.trim());
    setSavedProviderValue(aiProvider);
    setSavedModelValue(aiModel.trim() || providerDefaults[aiProvider].model);
    setIsApiKeySaved(true);
    setHasSavedApiKey(true);
    setShowApiKey(false);
    setError('');
    showSavedNotice('Credential saved to credentials.json.');
  };

  const saveGeneration = async (nextPalettes = palettes, nextComponents = previewComponents, nextPreviewStyle = previewStyle, nextPreviewBlocks = previewBlocks, nextPreviewCanvas = previewCanvas, nextPreviewCopy = previewCopy, showManualNotice = true) => {
    if (!nextPalettes.length) {
      setError('Generate palettes before saving a result.');
      return;
    }

    if (!folderHandle) {
      if (showManualNotice) {
        setError('Choose a local folder before saving results.');
      } else {
        showSavedNotice('Generated. Choose a folder to save this result.');
      }
      return;
    }

    const entry: SavedGeneration = {
      id: `history-${Date.now()}`,
      createdAt: new Date().toISOString(),
      intent: currentBriefPrompt,
      inputMode,
      brief,
      imageName: inputMode === 'screenshot' ? uploadedImage?.name : undefined,
      palettes: nextPalettes,
      components: nextComponents,
      previewCopy: nextPreviewCopy,
      previewStyle: nextPreviewStyle,
      previewBlocks: nextPreviewBlocks,
      previewCanvas: nextPreviewCanvas || undefined,
    };
    const nextHistory = [entry, ...history].slice(0, maxSavedHistory);
    setHistory(nextHistory);
    await syncHistoryToFolder(nextHistory);
    showSavedNotice('Result saved to local history files.');
  };

  const viewHistoryEntry = (entry: SavedGeneration) => {
    setPalettes(entry.palettes);
    setPreviewComponents(entry.components?.length ? entry.components : defaultPreviewComponents);
    setComponentChoices(entry.components?.length ? entry.components : defaultPreviewComponents);
    setPreviewCopy(entry.previewCopy || {});
    setPreviewStyle(entry.previewStyle || defaultPreviewStyle);
    setPreviewBlocks(entry.previewBlocks?.length ? entry.previewBlocks : []);
    setPreviewCanvas(entry.previewCanvas || null);
    setSelectedPaletteId(entry.palettes[0]?.id || null);
    setActiveHistoryId(entry.id);
    setSidebarView('history');
    showSavedNotice('History result opened read-only.');
  };

  const deleteHistoryItem = (entryId: string) => {
    if (folderHandle) {
      folderHandle.getDirectoryHandle('history', { create: true })
        .then((historyDirectory: any) => historyDirectory.removeEntry(`${entryId}.json`))
        .catch(() => {});
    }
    const nextHistory = history.filter((entry) => entry.id !== entryId);
    setHistory(nextHistory);
    if (activeHistoryId === entryId) {
      setActiveHistoryId(null);
    }
    syncHistoryToFolder(nextHistory).catch(() => {});
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
    if (folderHandle) {
      folderHandle.removeEntry('history', { recursive: true }).catch(() => {});
      folderHandle.removeEntry('history-index.json').catch(() => {});
    }
    showSavedNotice('History cleared.');
  };

  return (
    <div
      className={`app-scrollbar min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#070707] text-[#f5f5f5]' : 'bg-slate-100 text-slate-900'}`}
      style={{ fontFamily: bodyFontFamily }}
    >
      <aside className={`w-full lg:w-[360px] h-auto lg:h-full flex flex-col shrink-0 border-b lg:border-b-0 lg:border-r z-10 shadow-2xl relative ${isDark ? 'bg-[#111111]/95 border-zinc-800' : 'bg-white/95 border-slate-200'} backdrop-blur`}>
        <div className={`p-5 border-b flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <h2 className="text-[10px] font-bold uppercase tracking-widest">AI Generator</h2>
          </div>
          <div className="flex items-center gap-2">
            <PaletteIcon className="w-5 h-5" style={{ color: colors.brand }} />
            <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: headingFontFamily }}>Design Visualizer</h1>
          </div>
        </div>

        <div className="app-scrollbar flex-1 overflow-visible lg:overflow-y-auto p-4 sm:p-5 space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Local Folder</h3>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${folderHandle ? 'bg-emerald-500/15 text-emerald-500' : isFolderPickerSupported ? 'bg-amber-500/15 text-amber-500' : isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-slate-100 text-slate-500'}`}>
                {folderHandle ? 'Connected' : isFolderPickerSupported ? 'Not Chosen' : 'Unsupported'}
              </span>
            </div>
            {folderName ? (
              <div className={`rounded-lg border p-3 ${isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{folderName}</p>
                  <button
                    onClick={chooseLocalFolder}
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                  >
                    Change
                  </button>
                </div>
                <p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                  Saves keys and history on this device only.
                </p>
              </div>
            ) : (
              <div className={`rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-zinc-800 bg-zinc-900/50 text-zinc-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <p>
                  {isFolderPickerSupported
                    ? 'Optional. Save keys and history on this device.'
                    : 'Folder saving is not supported here. Use Chrome or Edge.'}
                </p>
                {isFolderPickerSupported && (
                  <button
                    onClick={chooseLocalFolder}
                    className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Choose Folder
                  </button>
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>AI Credential</h3>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${isApiKeySaved ? 'bg-emerald-500/15 text-emerald-500' : hasSavedApiKey ? 'bg-amber-500/15 text-amber-500' : isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-slate-100 text-slate-500'}`}>
                {isApiKeySaved ? 'Saved' : hasSavedApiKey ? 'Modified' : 'Not Saved'}
              </span>
            </div>
            <div className="mb-3 space-y-2">
              <select
                value={aiProvider}
                onChange={(event) => {
                  const nextProvider = event.target.value as AiProvider;
                  setAiProvider(nextProvider);
                  setAiModel(providerDefaults[nextProvider].model);
                  setAvailableModels([providerDefaults[nextProvider].model]);
                  setModelNotice('');
                  setShowAdvancedModel(false);
                  setIsApiKeySaved(false);
                }}
                className={`pretty-select w-full rounded-lg border px-3 py-2.5 text-xs font-semibold outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                title="AI provider"
              >
                {providerOptions.map(([id, option]) => <option key={id} value={id}>{option.label}</option>)}
              </select>
              <div className={`rounded-lg border p-2.5 ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className={`min-w-0 truncate text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Model: <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>{aiModel || providerDefaults[aiProvider].model}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedModel((current) => !current)}
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    {showAdvancedModel ? 'Hide' : 'Advanced'}
                  </button>
                </div>
                {showAdvancedModel && (
                  <div className="mt-2 grid gap-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value={aiModel}
                        onChange={(event) => {
                          setAiModel(event.target.value);
                          setIsApiKeySaved(false);
                        }}
                        className={`pretty-select min-w-0 rounded-md border px-3 py-2 text-xs font-semibold outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'}`}
                        title="Available model"
                      >
                        {currentModelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={loadModels}
                        disabled={isFetchingModels || !apiKey.trim()}
                        className={`rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                      >
                        {isFetchingModels ? 'Loading' : 'Fetch'}
                      </button>
                    </div>
                    <input
                      value={aiModel}
                      onChange={(event) => {
                        setAiModel(event.target.value);
                        setIsApiKeySaved(false);
                      }}
                      placeholder={providerDefaults[aiProvider].model}
                      className={`w-full rounded-md border px-3 py-2 text-xs font-semibold outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                      title="Custom model name"
                    />
                    {modelNotice && (
                      <p className={`text-[11px] ${modelNotice.startsWith('Found') ? 'text-emerald-500' : isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{modelNotice}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => {
                  const nextKey = event.target.value;
                  setApiKey(nextKey);
                  setIsApiKeySaved(false);
                }}
                placeholder={providerDefaults[aiProvider].placeholder}
                autoComplete="off"
                className={`w-full text-sm px-3 py-3 pr-12 rounded-lg border outline-none focus:ring-2 focus:ring-offset-1 transition-shadow ${isDark ? 'bg-zinc-900 border-zinc-800 focus:ring-violet-500 focus:ring-offset-[#111]' : 'bg-slate-50 border-slate-200 hover:border-slate-300 focus:ring-violet-500 focus:ring-offset-white'}`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((current) => !current)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 ${isDark ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
                title={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={saveCredential}
                disabled={!apiKey.trim() || !folderHandle || isApiKeySaved}
                className={`sm:col-span-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
              >
                {isApiKeySaved ? 'Key Saved' : hasSavedApiKey ? 'Update Key' : 'Save Key'}
              </button>
            </div>
            <p className={`mt-2 text-[11px] leading-relaxed ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Use your own provider key. It stays in this browser unless saved to your chosen folder.
            </p>
            <p className={`mt-1 text-[11px] leading-relaxed ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
              Most users can keep the recommended model. Fetch uses your key only in this browser.
            </p>
            {savedNotice && (
              <p className="mt-2 text-[11px] font-semibold text-emerald-500">{savedNotice}</p>
            )}
          </section>

          <section>
            <div className={`grid grid-cols-2 rounded-lg p-1 ${isDark ? 'bg-zinc-950 border border-zinc-800' : 'bg-slate-100 border border-slate-200'}`}>
              <button
                onClick={() => setSidebarView('generate')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-bold uppercase tracking-widest ${sidebarView === 'generate' ? (isDark ? 'bg-zinc-800 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800')}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate
              </button>
              <button
                onClick={() => setSidebarView('history')}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-bold uppercase tracking-widest ${sidebarView === 'history' ? (isDark ? 'bg-zinc-800 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800')}`}
              >
                <History className="h-3.5 w-3.5" />
                History
              </button>
            </div>
          </section>

          {sidebarView === 'generate' && (
            <>
              <section>
                <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Design Brief</h3>
                <div className={`mb-3 rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-zinc-800 bg-zinc-900/50 text-zinc-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  Choose one path. Use Brief when you do not have a screenshot, or Screenshot when you want AI to follow an existing UI.
                </div>
                <div className={`mb-3 grid grid-cols-2 rounded-lg p-1 ${isDark ? 'bg-zinc-950 border border-zinc-800' : 'bg-slate-100 border border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => updateInputMode('screenshot')}
                    className={`rounded-md py-2 text-[10px] font-bold uppercase tracking-widest ${inputMode === 'screenshot' ? (isDark ? 'bg-zinc-800 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800')}`}
                  >
                    From Screenshot
                  </button>
                  <button
                    type="button"
                    onClick={() => updateInputMode('brief')}
                    className={`rounded-md py-2 text-[10px] font-bold uppercase tracking-widest ${inputMode === 'brief' ? (isDark ? 'bg-zinc-800 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800')}`}
                  >
                    From Brief
                  </button>
                </div>

                {inputMode === 'screenshot' && (
                  <div className={`mb-3 rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-violet-500/20 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-800'}`}>
                    Screenshot mode uses your upload as the layout reference. The fields below only guide palette, fonts, audience, and mood.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Design</label>
                    <select
                      value={brief.designType}
                      onChange={(event) => updateBrief('designType', event.target.value)}
                      className={`pretty-select w-full text-xs px-3 py-2.5 rounded-lg border outline-none shadow-inner transition-all hover:-translate-y-px focus:ring-2 focus:ring-violet-500/70 ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700 focus:bg-zinc-950' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:bg-white'}`}
                    >
                      {designTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {inputMode === 'brief' && (
                    <input
                      value={brief.industry}
                      onChange={(event) => updateBrief('industry', event.target.value)}
                      placeholder="What is it for? e.g. restaurant reservation app"
                      className={`w-full text-sm px-3 py-3 rounded-lg border outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  )}
                  <input
                    value={brief.audience}
                    onChange={(event) => updateBrief('audience', event.target.value)}
                    placeholder={inputMode === 'screenshot' ? 'Optional audience e.g. premium clients' : 'Who will use it? e.g. premium wedding clients'}
                    className={`w-full text-sm px-3 py-3 rounded-lg border outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                  />
                  <input
                    value={brief.mood}
                    onChange={(event) => updateBrief('mood', event.target.value)}
                    placeholder="How should it feel? e.g. romantic, clean, trustworthy"
                    className={`w-full text-sm px-3 py-3 rounded-lg border outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                  />
                  <textarea
                    value={brief.notes}
                    onChange={(event) => updateBrief('notes', event.target.value)}
                    placeholder={inputMode === 'screenshot' ? 'Color/font notes only. Example: warmer palette, avoid neon, elegant headings...' : 'Color/font rules only. Example: avoid neon, soft contrast, elegant headings, readable body text...'}
                    className={`app-scrollbar w-full min-h-[92px] resize-none text-sm leading-relaxed px-3 py-3 rounded-lg border outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                  />
                </div>

                {inputMode === 'screenshot' && (
                  <div className="mt-3">
                    <label className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-dashed text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors ${isDark ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/70 text-zinc-300' : 'border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-600'}`}>
                      <Upload className="w-4 h-4" />
                      Upload Screenshot
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                )}

                {inputMode === 'screenshot' && uploadedImage && (
                  <div className={`mt-3 flex items-center gap-3 rounded-lg border p-2 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                    <img src={uploadedImage.previewUrl} alt="" className="h-12 w-16 object-cover rounded-md border border-black/10" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{uploadedImage.name}</p>
                      <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Used as visual reference</p>
                    </div>
                    <button
                      onClick={() => setUploadedImage(null)}
                      className={`p-1.5 rounded-md ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'}`}
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerateBlocked}
                  aria-busy={isGenerating}
                  className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: colors.brand, color: colors.brandForeground }}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? 'Generating, Please Wait' : cooldownRemaining > 0 ? `Ready in ${cooldownRemaining}s` : 'Generate Palettes & Fonts'}
                </button>
                {isGenerating && (
                  <div className={`mt-3 rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-violet-200 bg-violet-50 text-violet-800'}`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating one request only
                    </div>
                    <p className="mt-1 opacity-80">Keep this tab open. Extra clicks are blocked.</p>
                  </div>
                )}
              </section>

              {hasGenerated && (
                <div className={`rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-zinc-800 bg-zinc-900/50 text-zinc-500' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  Use the preview toolbar to switch palettes, fonts, and components.
                </div>
              )}
            </>
          )}

          {sidebarView === 'history' && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>History ({history.length})</h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className={`rounded-lg border p-3 text-xs leading-relaxed ${isDark ? 'border-zinc-800 bg-zinc-900/50 text-zinc-500' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                Choose your saved folder to load history.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className={`rounded-lg border p-3 ${activeHistoryId === entry.id ? (isDark ? 'border-violet-500/60 bg-violet-500/10' : 'border-violet-300 bg-violet-50') : (isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-200 bg-slate-50')}`}>
                    <button onClick={() => viewHistoryEntry(entry)} className="w-full text-left">
                      <div className="flex items-center gap-2">
                        <History className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                        <p className={`text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{entry.brief?.industry || entry.brief?.systemType || entry.intent}</p>
                      </div>
                      <p className={`mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {new Date(entry.createdAt).toLocaleString()} / {entry.palettes.length} options{entry.imageName ? ` / ${entry.imageName}` : ''}
                      </p>
                    </button>
                    {activeHistoryId === entry.id && (
                      <div className={`mt-3 rounded-md border p-2 text-[11px] leading-relaxed whitespace-pre-line ${isDark ? 'border-zinc-800 bg-zinc-950/60 text-zinc-400' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {entry.intent}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex -space-x-1">
                        {entry.palettes.slice(0, 4).map((palette) => (
                          <span key={palette.id} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: palette.colors.dark.brand }} />
                        ))}
                      </div>
                      <button
                        onClick={() => deleteHistoryItem(entry.id)}
                        className={`rounded-md p-1.5 ${isDark ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'}`}
                        title="Delete history item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}
        </div>

        <div className={`p-5 flex-shrink-0 border-t ${isDark ? 'bg-[#0a0a0a] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => saveGeneration()}
              disabled={!hasGenerated || sidebarView === 'history'}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
            >
              <History className="w-4 h-4" />
              SAVE RESULT
            </button>

          </div>
        </div>
      </aside>

      <main
        className="flex-1 flex flex-col min-h-[560px] sm:min-h-[640px] lg:min-h-0 lg:h-full overflow-hidden p-2 sm:p-4 lg:p-5 w-full relative transition-colors duration-500"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        <div className="absolute inset-x-0 top-[-10%] h-[400px] w-[80%] mx-auto opacity-30 blur-[120px] rounded-full pointer-events-none transition-colors duration-500" style={{ backgroundColor: colors.brand }} />
        <header className="sm:justify-between items-start sm:items-end mb-3 shrink-0 relative z-10 hidden lg:flex">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1.5 opacity-60">
              {hasGenerated ? 'Generated Preview' : 'No Preview Yet'}
            </p>
            <h2 className="text-3xl tracking-tight" style={{ fontFamily: headingFontFamily }}>{hasGenerated ? selectedPalette.name : 'Generate first'}</h2>
            <p className="text-sm mt-2 max-w-xl" style={{ color: colors.textMuted }}>{hasGenerated ? selectedPalette.description : 'Generate first to see the preview.'}</p>
          </div>
          <div className="hidden sm:flex space-x-3 mt-4 sm:mt-0 opacity-80">
            {[colors.surface, colors.surfaceHighlight, colors.brand].map((hex) => (
              <div key={hex} className="w-10 h-1.5 rounded-full" style={{ backgroundColor: hex }} />
            ))}
          </div>
        </header>

        <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col overflow-hidden relative z-[1] min-h-0">
          {hasGenerated ? (
            <PaletteShowcase
              palettes={palettes}
              palette={selectedPalette}
              selectedPaletteId={selectedPalette.id}
              setSelectedPaletteId={setSelectedPaletteId}
              isDark={isDark}
              setIsDark={setIsDark}
              brief={activeHistoryId ? history.find((entry) => entry.id === activeHistoryId)?.brief || brief : brief}
              components={previewComponents}
              componentChoices={componentChoices}
              previewCopy={previewCopy}
              setPreviewComponents={setPreviewComponents}
              previewStyle={previewStyle}
              previewBlocks={previewBlocks}
              previewCanvas={previewCanvas}
              headingFontName={headingFontName}
              bodyFontName={bodyFontName}
              headingFontFamily={headingFontFamily}
              headingFontChoices={headingFontChoices}
              bodyFontChoices={bodyFontChoices}
              setSelectedHeadingFont={setSelectedHeadingFont}
              setSelectedBodyFont={setSelectedBodyFont}
            />
          ) : (
            <EmptyPreview isDark={isDark} />
          )}
        </div>
      </main>
    </div>
  );
}

function buildDesignPrompt(palette: Palette, isDark: boolean, headingFontName = palette.fonts.headingName, bodyFontName = palette.fonts.bodyName, components: PreviewComponent[] = ['header', 'hero', 'cards', 'form', 'footer']) {
  const mode = isDark ? 'Dark Mode' : 'Light Mode';
  const colors = isDark ? palette.colors.dark : palette.colors.light;
  let prompt = `Use this generated design direction only for color tokens and typography.\n\n`;
  prompt += `Palette: ${palette.name}\n`;
  prompt += `Mode: ${mode}\n`;
  prompt += `Heading font: ${headingFontName}\n`;
  prompt += `Body font: ${bodyFontName}\n`;
  prompt += `Preview components: ${components.join(', ')}\n\n`;
  prompt += `Color tokens:\n`;
  Object.entries(colors).forEach(([name, hex]) => {
    prompt += `- ${name}: ${hex}\n`;
  });
  return prompt;
}

function EmptyPreview({ isDark }: { isDark: boolean }) {
  return (
    <section className={`flex min-h-full items-center justify-center rounded-xl sm:rounded-2xl border p-6 text-center ${isDark ? 'border-zinc-800 bg-zinc-950/40 text-zinc-400' : 'border-slate-200 bg-white/70 text-slate-500'}`}>
      <div className="max-w-md">
        <PaletteIcon className={`mx-auto mb-4 h-10 w-10 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`} />
        <h2 className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>No preview generated yet</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Fill the brief, then generate palettes and fonts.
        </p>
      </div>
    </section>
  );
}

function colorToRgb(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function mixColor(from: string, to: string, amount: number) {
  const a = colorToRgb(from);
  const b = colorToRgb(to);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount,
  );
}

function colorLuminance(hex: string) {
  const { r, g, b } = colorToRgb(hex);
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatioForColors(a: string, b: string) {
  const lighter = Math.max(colorLuminance(a), colorLuminance(b));
  const darker = Math.min(colorLuminance(a), colorLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableColor(background: string, preferred: string) {
  if (contrastRatioForColors(background, preferred) >= 4.5) return preferred;
  return contrastRatioForColors(background, '#FFFFFF') >= contrastRatioForColors(background, '#0F172A') ? '#FFFFFF' : '#0F172A';
}

const PaletteShowcase: React.FC<{
  palettes: Palette[];
  palette: Palette;
  selectedPaletteId: string;
  setSelectedPaletteId: (value: string) => void;
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  brief: DesignBrief;
  components: PreviewComponent[];
  componentChoices: PreviewComponent[];
  previewCopy: PreviewCopy;
  setPreviewComponents: React.Dispatch<React.SetStateAction<PreviewComponent[]>>;
  previewStyle: PreviewStyle;
  previewBlocks: PreviewBlock[];
  previewCanvas: PreviewCanvas | null;
  headingFontName: string;
  bodyFontName: string;
  headingFontFamily: string;
  headingFontChoices: string[];
  bodyFontChoices: string[];
  setSelectedHeadingFont: (value: string) => void;
  setSelectedBodyFont: (value: string) => void;
}> = ({
  palettes,
  palette,
  selectedPaletteId,
  setSelectedPaletteId,
  isDark,
  setIsDark,
  brief,
  components,
  componentChoices,
  previewCopy,
  setPreviewComponents,
  previewStyle,
  previewBlocks,
  previewCanvas,
  headingFontName,
  bodyFontName,
  headingFontFamily,
  headingFontChoices,
  bodyFontChoices,
  setSelectedHeadingFont,
  setSelectedBodyFont,
}) => {
  const colors = isDark ? palette.colors.dark : palette.colors.light;
  const content = derivePreviewContent(brief, previewCopy);
  const [copied, setCopied] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copyPalette = () => {
    navigator.clipboard.writeText(buildDesignPrompt(palette, isDark, headingFontName, bodyFontName, components));
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
      <div className="grid gap-3 pb-3 border-b border-opacity-20 shrink-0 mb-3 xl:grid-cols-[1fr_auto]" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <div className="space-y-3 min-w-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>Preview</p>
            <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
              {previewStyle.layoutPattern} / {previewStyle.heroTreatment} / {previewStyle.componentTreatment}
            </p>
          </div>

          <div className="app-scrollbar flex gap-2 overflow-x-auto pb-1">
            {palettes.map((option, index) => {
              const optionColors = isDark ? option.colors.dark : option.colors.light;
              const active = option.id === selectedPaletteId;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedPaletteId(option.id)}
                  className={`flex min-w-[150px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                    active
                      ? isDark ? 'border-violet-400 bg-violet-500/15' : 'border-violet-300 bg-violet-50'
                      : isDark ? 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700' : 'border-slate-200 bg-white/80 hover:border-slate-300'
                  }`}
                  title={`${option.name}: ${option.fonts.headingName} + ${option.fonts.bodyName}`}
                >
                  <span className="text-[10px] font-bold opacity-60">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex -space-x-1">
                    {[optionColors.brand, optionColors.surface, optionColors.bg].map((hex) => (
                      <span key={hex} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{option.name}</span>
                    <span className="block truncate text-[10px]" style={{ color: colors.textMuted }}>{option.fonts.headingName}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex border rounded-lg p-1 shadow-inner ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-200/50 border-slate-200'}`}>
              <button
                onClick={() => setIsDark(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${!isDark ? 'bg-white text-slate-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Preview light mode"
              >
                <Sun className="w-3 h-3" /> LIGHT
              </button>
              <button
                onClick={() => setIsDark(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${isDark ? 'bg-zinc-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Preview dark mode"
              >
                <Moon className="w-3 h-3" /> DARK
              </button>
            </div>

            <button
              onClick={copyPalette}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  : isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm'
              }`}
              title="Copy palette and font prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy UI Prompt'}
            </button>
          </div>
        </div>

        <div className="grid gap-2 xl:w-[380px]">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={headingFontName}
              onChange={(event) => setSelectedHeadingFont(event.target.value)}
              className={`pretty-select rounded-lg border px-3 py-2 text-xs font-semibold outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'}`}
              title="Heading font"
            >
              {headingFontChoices.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select
              value={bodyFontName}
              onChange={(event) => setSelectedBodyFont(event.target.value)}
              className={`pretty-select rounded-lg border px-3 py-2 text-xs font-semibold outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'}`}
              title="Body font"
            >
              {bodyFontChoices.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {componentChoices.map((component) => {
              const category = getComponentCategory(component);
              const active = components.includes(component);
              return (
                <button
                  key={component}
                  onClick={() => {
                    setPreviewComponents((current) => {
                      if (!current.includes(component)) return Array.from(new Set([...current, component]));
                      const next = current.filter((item) => item !== component);
                      return next.length ? next : current;
                    });
                  }}
                  className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
                    active
                      ? isDark
                        ? 'border-violet-400 bg-violet-500/15 text-violet-200'
                        : 'border-violet-300 bg-violet-50 text-violet-700'
                      : isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-zinc-300' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                  }`}
                  title={`${component} maps to ${category}`}
                >
                  {getComponentLabel(component)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/5 p-1.5" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
            {(Object.entries(colors) as [keyof PaletteValues, string][]).slice(0, 6).map(([name, hex]) => (
              <button key={name} className="group relative cursor-pointer" onClick={() => copyColor(hex, name)} title={`Copy ${name}: ${hex}`}>
                <div className="h-7 w-7 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-95" style={{ backgroundColor: hex, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }} />
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-[9px] font-bold uppercase text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {copiedHex === name ? 'Copied' : name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="app-scrollbar flex-1 w-full rounded-xl sm:rounded-2xl overflow-y-auto overflow-x-hidden shadow-2xl relative" style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
        <div className="min-h-full">
          <ImplementationPreview colors={colors} font={headingFontFamily} content={content} previewStyle={previewStyle} components={components} previewCanvas={previewCanvas} />
        </div>
      </div>
    </section>
  );
};

function TemplateMedia({ colors }: { colors: PaletteValues }) {
  const textColor = readableColor(colors.surface, colors.text);
  const muted = mixColor(textColor, colors.surface, 0.52);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="grid h-full w-full grid-cols-5 grid-rows-4 gap-2 overflow-hidden rounded-2xl p-3" style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}>
        <div className="col-span-3 row-span-4 overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${colors.brand}, ${mixColor(colors.brand, colors.bg, 0.42)})` }}>
          <div className="flex h-full flex-col justify-end p-4">
            <div className="mb-2 h-2 w-16 rounded-full" style={{ backgroundColor: colors.brandForeground, opacity: 0.85 }} />
            <div className="h-2 w-28 rounded-full" style={{ backgroundColor: colors.brandForeground, opacity: 0.45 }} />
          </div>
        </div>
        <div className="col-span-2 rounded-xl p-3" style={{ backgroundColor: colors.surfaceHighlight }}>
          <div className="h-2 w-16 rounded-full" style={{ backgroundColor: textColor }} />
          <div className="mt-2 h-2 w-10 rounded-full" style={{ backgroundColor: muted }} />
        </div>
        <div className="col-span-2 row-span-2 rounded-xl p-3" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
          {[72, 46, 88].map((width) => (
            <div key={width} className="mb-2 h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: muted }} />
          ))}
          <div className="mt-3 h-8 rounded-lg" style={{ backgroundColor: colors.brand }} />
        </div>
        <div className="col-span-2 rounded-xl p-3" style={{ backgroundColor: colors.surfaceHighlight }}>
          <div className="grid h-full grid-cols-4 items-end gap-1.5">
            {[35, 62, 48, 76].map((height) => (
              <div key={height} className="rounded-sm" style={{ height: `${height}%`, backgroundColor: colors.brand }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getItemColor(item: PreviewItem, colors: PaletteValues, display: { bg: string; surface: string; highlight: string; text: string; muted: string; border: string; brand: string; brandText: string }) {
  if (item.tone === 'brand') return display.brand;
  if (item.tone === 'surface') return display.surface;
  if (item.tone === 'contrast') return display.text;
  if (item.tone === 'text') return display.text;
  return item.kind === 'line' || item.kind === 'divider' ? display.border : display.highlight || colors.surfaceHighlight;
}

function clampCanvasRect(item: PreviewItem) {
  const x = Math.min(98, Math.max(0, item.x));
  const y = Math.min(98, Math.max(0, item.y));
  const maxW = Math.max(1, 100 - x);
  const maxH = Math.max(0.8, 100 - y);
  const minW = item.kind === 'line' || item.kind === 'divider' ? 0.6 : 1.4;
  const minH = item.kind === 'line' || item.kind === 'divider' ? 0.35 : 0.8;

  return {
    x,
    y,
    w: Math.min(Math.max(item.w, minW), maxW),
    h: Math.min(Math.max(item.h, minH), maxH),
  };
}

function rectOverlapRatio(a: ReturnType<typeof clampCanvasRect>, b: ReturnType<typeof clampCanvasRect>) {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const overlapArea = xOverlap * yOverlap;
  const minArea = Math.max(0.1, Math.min(a.w * a.h, b.w * b.h));
  return overlapArea / minArea;
}

function isReadablePreviewItem(item: PreviewItem) {
  return item.kind === 'heading' || item.kind === 'text' || item.kind === 'button' || item.kind === 'avatar';
}

function previewItemLayer(item: PreviewItem) {
  if (item.kind === 'box' || item.kind === 'media') return 1;
  if (item.kind === 'line' || item.kind === 'divider') return 2;
  if (item.kind === 'avatar') return 3;
  if (item.kind === 'heading' || item.kind === 'text') return 4;
  if (item.kind === 'button') return 5;
  return 1;
}

function getPreviewRhythm(previewStyle: PreviewStyle, aspect: PreviewCanvas['aspect']) {
  const compactness = previewStyle.density === 'compact' ? 0.72 : previewStyle.density === 'spacious' ? 1.28 : 1;
  const isMobile = aspect === 'mobile';
  const isEditorial = previewStyle.layoutPattern === 'editorial' || previewStyle.heroTreatment === 'editorial';
  const isOperational = previewStyle.layoutPattern === 'dashboard' || previewStyle.navigationStyle === 'sidebar';
  const basePadding = isMobile ? 10 : isOperational ? 14 : isEditorial ? 22 : 16;
  const edgeMargin = Math.round(basePadding * compactness);
  const frameRadius = previewStyle.cornerStyle === 'sharp' ? 8 : previewStyle.cornerStyle === 'rounded' ? 30 : 18;
  const itemScale = previewStyle.componentTreatment === 'metric-heavy' || isOperational ? 0.9 : previewStyle.componentTreatment === 'image-first' ? 1.08 : 1;
  const borderWidth = previewStyle.cardStyle === 'bordered' || previewStyle.colorApplication === 'contrast' ? 1 : 0;

  return {
    edgeMargin,
    frameRadius,
    itemScale,
    borderWidth,
    frameShadow: previewStyle.cardStyle === 'elevated'
      ? '0 34px 90px rgba(0,0,0,0.24)'
      : previewStyle.cardStyle === 'image-led'
        ? '0 24px 70px rgba(0,0,0,0.18)'
        : '0 14px 44px rgba(15,23,42,0.1)',
  };
}

function FreeformPreview({
  colors,
  font,
  content,
  previewCanvas,
  previewStyle,
  components,
}: {
  colors: PaletteValues;
  font: string;
  content: PreviewContent;
  previewCanvas: PreviewCanvas;
  previewStyle: PreviewStyle;
  components: PreviewComponent[];
}) {
  const darkMode = colorLuminance(colors.bg) < 0.35;
  const displayBg = darkMode ? mixColor(colors.bg, '#000000', 0.18) : colors.bg;
  const displaySurface = darkMode ? mixColor(colors.surface, '#FFFFFF', 0.04) : colors.surface;
  const displayHighlight = darkMode ? mixColor(colors.surfaceHighlight, '#FFFFFF', 0.08) : colors.surfaceHighlight;
  const displayText = readableColor(displayBg, colors.text);
  const displayMuted = darkMode ? mixColor(displayText, displayBg, 0.45) : colors.textMuted;
  const displayBorder = darkMode ? mixColor(colors.border, '#FFFFFF', 0.12) : colors.border;
  const calmBrand = darkMode ? mixColor(colors.brand, displayBg, 0.28) : mixColor(colors.brand, displaySurface, 0.1);
  const brandText = readableColor(calmBrand, colors.brandForeground);
  const rhythm = getPreviewRhythm(previewStyle, previewCanvas.aspect);
  const radius = rhythm.frameRadius;
  const aspectClass = previewCanvas.aspect === 'mobile' ? 'aspect-[9/16]' : previewCanvas.aspect === 'square' ? 'aspect-square' : 'aspect-[16/10]';
  const canvasWidth = previewCanvas.aspect === 'mobile'
    ? 'min(100%, 340px, calc((100dvh - 210px) * 0.5625))'
    : previewCanvas.aspect === 'square'
      ? 'min(100%, 600px, calc(100dvh - 210px))'
      : 'min(100%, 960px, calc((100dvh - 210px) * 1.6))';
  const display = { bg: displayBg, surface: displaySurface, highlight: displayHighlight, text: displayText, muted: displayMuted, border: displayBorder, brand: calmBrand, brandText };
  const visibleItems = [...previewCanvas.items].sort((a, b) => previewItemLayer(a) - previewItemLayer(b));
  const readableRects: Array<ReturnType<typeof clampCanvasRect>> = [];

  return (
    <div
      className="min-h-full"
      style={{
        background: previewStyle.backgroundTreatment === 'sectioned'
          ? `linear-gradient(180deg, ${displayBg}, ${mixColor(displayBg, displaySurface, 0.42)} 48%, ${displayBg})`
          : displayBg,
        color: displayText,
        padding: `clamp(8px, ${rhythm.edgeMargin / 9}vw, ${rhythm.edgeMargin + 6}px)`,
      }}
    >
      <div
        className={`relative mx-auto overflow-hidden ${aspectClass}`}
        style={{
          width: canvasWidth,
          minWidth: previewCanvas.aspect === 'mobile' ? 220 : 280,
          backgroundColor: displayBg,
          border: rhythm.borderWidth ? `${rhythm.borderWidth}px solid ${displayBorder}` : undefined,
          borderRadius: radius,
          boxShadow: rhythm.frameShadow,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: previewStyle.backgroundTreatment === 'brand-wash'
              ? `linear-gradient(135deg, ${mixColor(displayBg, colors.brand, previewStyle.colorApplication === 'immersive' ? 0.34 : 0.18)}, ${displayBg} 46%, ${mixColor(displaySurface, colors.brand, 0.1)})`
              : previewStyle.backgroundTreatment === 'soft-band'
                ? `linear-gradient(180deg, ${mixColor(displayBg, displaySurface, 0.35)}, ${displayBg} 44%, ${mixColor(displaySurface, displayBg, 0.18)})`
                : displayBg,
          }}
        />
        {visibleItems.map((item, index) => {
          const rect = clampCanvasRect(item);
          const readableItem = isReadablePreviewItem(item);
          const hasTextCollision = readableItem && readableRects.some((existingRect) => rectOverlapRatio(rect, existingRect) > 0.22);
          const itemColor = getItemColor(item, colors, display);
          const itemRadius = item.radius === 'none' ? 0 : item.radius === 'round' ? 999 : Math.max(4, radius * rhythm.itemScale * (item.kind === 'button' ? 0.72 : 0.56));
          const opacity = item.opacity ?? (item.emphasis === 'low' ? 0.58 : item.emphasis === 'high' ? 1 : 0.86);
          const shadow = item.shadow === 'strong'
            ? `0 ${Math.round(24 * rhythm.itemScale)}px ${Math.round(62 * rhythm.itemScale)}px rgba(0,0,0,${darkMode ? 0.34 : 0.2})`
            : item.shadow === 'soft'
              ? `0 ${Math.round(14 * rhythm.itemScale)}px ${Math.round(34 * rhythm.itemScale)}px rgba(0,0,0,${darkMode ? 0.24 : 0.12})`
              : 'none';
          const layer = previewItemLayer(item);
          const commonStyle: React.CSSProperties = {
            left: `${rect.x}%`,
            top: `${rect.y}%`,
            width: `${rect.w}%`,
            height: `${rect.h}%`,
            opacity,
            borderRadius: itemRadius,
            boxShadow: shadow,
            filter: item.blur ? 'blur(14px)' : undefined,
            pointerEvents: 'none',
            zIndex: layer,
          };

          if (item.kind === 'heading' || item.kind === 'text') {
            const hasRoomForText = rect.w >= (item.kind === 'heading' ? 9 : 7) && rect.h >= (item.kind === 'heading' ? 3.6 : 2.1);

            if (!hasRoomForText || hasTextCollision) {
              return (
                <div
                  key={`${item.kind}-${index}`}
                  className="absolute"
                  style={{ ...commonStyle, height: `${Math.min(rect.h, 1.2)}%`, backgroundColor: item.kind === 'heading' ? displayText : displayMuted, borderRadius: 999, opacity: Math.min(opacity, 0.48) }}
                />
              );
            }

            readableRects.push(rect);
            return (
              <div
                key={`${item.kind}-${index}`}
                className="absolute flex items-center overflow-hidden break-words leading-tight"
                style={{ ...commonStyle, color: displayText, fontFamily: item.kind === 'heading' ? font : undefined, fontWeight: item.kind === 'heading' ? 800 : 600, fontSize: item.kind === 'heading' ? 'clamp(8px, 1.2vw, 26px)' : 'clamp(6px, 0.72vw, 12px)' }}
              >
                <span className="line-clamp-2">{item.label || (item.kind === 'heading' ? content.heroTitle : content.heroDescription)}</span>
              </div>
            );
          }

          if (item.kind === 'line' || item.kind === 'divider') {
            return <div key={`${item.kind}-${index}`} className="absolute" style={{ ...commonStyle, backgroundColor: displayBorder }} />;
          }

          if (item.kind === 'button') {
            const canShowButtonLabel = rect.w >= 7 && rect.h >= 3 && !hasTextCollision;
            if (canShowButtonLabel) readableRects.push(rect);
            return (
              <div key={`${item.kind}-${index}`} className="absolute grid place-items-center overflow-hidden px-1.5 text-center text-[8px] font-bold leading-none sm:text-[10px]" style={{ ...commonStyle, backgroundColor: calmBrand, color: brandText }}>
                {canShowButtonLabel ? <span className="max-w-full truncate">{item.label || content.primaryAction}</span> : null}
              </div>
            );
          }

          if (item.kind === 'media') {
            return (
              <div key={`${item.kind}-${index}`} className="absolute overflow-hidden" style={{ ...commonStyle, background: `linear-gradient(135deg, ${mixColor(itemColor, colors.brand, 0.2)}, ${mixColor(itemColor, displayBg, 0.24)})`, border: `1px solid ${displayBorder}` }}>
                <div className="absolute inset-x-2 bottom-2 h-1.5 rounded-full sm:inset-x-4 sm:bottom-4 sm:h-2" style={{ backgroundColor: mixColor(displayText, displayBg, 0.55), opacity: 0.6 }} />
                <div className="absolute bottom-5 left-2 h-1.5 w-1/2 rounded-full sm:bottom-8 sm:left-4 sm:h-2" style={{ backgroundColor: displayText, opacity: 0.22 }} />
              </div>
            );
          }

          if (item.kind === 'avatar') {
            const canShowAvatarLabel = rect.w >= 3 && rect.h >= 3 && !hasTextCollision;
            if (canShowAvatarLabel) readableRects.push(rect);
            return <div key={`${item.kind}-${index}`} className="absolute grid place-items-center text-[9px] font-black sm:text-xs" style={{ ...commonStyle, backgroundColor: calmBrand, color: brandText }}>{canShowAvatarLabel ? item.label || content.initial : null}</div>;
          }

          return (
            <div key={`${item.kind}-${index}`} className="absolute overflow-hidden" style={{ ...commonStyle, backgroundColor: itemColor, border: item.tone === 'surface' || item.tone === 'muted' ? `1px solid ${displayBorder}` : undefined }}>
              {item.label && rect.h > 4 && rect.w > 10 && (
                <span className="absolute left-2 top-1.5 max-w-[85%] truncate text-[8px] font-bold sm:left-3 sm:top-2 sm:text-[10px]" style={{ color: item.tone === 'brand' ? brandText : displayText }}>{item.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImplementationPreview({ colors, font, content, previewStyle, components, previewCanvas }: { colors: PaletteValues; font: string; content: PreviewContent; previewStyle: PreviewStyle; components: PreviewComponent[]; previewCanvas: PreviewCanvas | null }) {
  const darkMode = colorLuminance(colors.bg) < 0.35;
  const displayBg = darkMode ? mixColor(colors.bg, '#000000', 0.22) : colors.bg;
  const displaySurface = darkMode ? mixColor(colors.surface, '#FFFFFF', 0.04) : colors.surface;
  const displayHighlight = darkMode ? mixColor(colors.surfaceHighlight, '#FFFFFF', 0.06) : colors.surfaceHighlight;
  const displayText = readableColor(displayBg, colors.text);
  const displayMuted = darkMode ? mixColor(displayText, displayBg, 0.42) : colors.textMuted;
  const displayBorder = darkMode ? mixColor(colors.border, '#FFFFFF', 0.1) : colors.border;
  const softSurface = darkMode ? mixColor(displaySurface, colors.brand, 0.06) : mixColor(displaySurface, colors.brand, 0.03);
  const liftedSurface = darkMode ? mixColor(displayHighlight, colors.brand, 0.08) : mixColor(displayHighlight, colors.brand, 0.05);
  const calmBrand = darkMode ? mixColor(colors.brand, displayBg, 0.34) : mixColor(colors.brand, displaySurface, 0.14);
  const brandText = readableColor(calmBrand, colors.brandForeground);
  const radius = previewStyle.cornerStyle === 'sharp' ? '0.45rem' : previewStyle.cornerStyle === 'rounded' ? '1.4rem' : '0.85rem';
  const surfaceShadow = previewStyle.cardStyle === 'elevated' ? (darkMode ? '0 28px 80px rgba(0,0,0,0.5)' : '0 24px 70px rgba(15,23,42,0.16)') : 'none';
  const compact = previewStyle.density === 'compact';
  const spacious = previewStyle.density === 'spacious';
  const immersive = previewStyle.colorApplication === 'immersive';
  const previewBackground = immersive || previewStyle.backgroundTreatment === 'brand-wash'
    ? darkMode
      ? `linear-gradient(135deg, ${mixColor(displayBg, colors.brand, 0.18)} 0%, ${displayBg} 46%, ${mixColor(displayHighlight, colors.brand, 0.08)} 100%)`
      : `linear-gradient(135deg, ${mixColor(displayHighlight, colors.brand, 0.2)} 0%, ${displayBg} 46%, ${displaySurface} 100%)`
    : previewStyle.backgroundTreatment === 'soft-band'
      ? `linear-gradient(180deg, ${liftedSurface} 0%, ${displayBg} 38%, ${displayBg} 100%)`
      : previewStyle.backgroundTreatment === 'sectioned'
        ? `linear-gradient(90deg, ${displayBg} 0%, ${displayBg} 52%, ${liftedSurface} 52%, ${liftedSurface} 100%)`
        : previewStyle.layoutPattern === 'dashboard' ? liftedSurface : displayBg;
  const panelStyle: React.CSSProperties = { backgroundColor: displaySurface, border: `1px solid ${displayBorder}`, borderRadius: radius, boxShadow: surfaceShadow };
  const mutedPanelStyle: React.CSSProperties = { backgroundColor: liftedSurface, border: `1px solid ${displayBorder}`, borderRadius: radius };
  const brandStyle: React.CSSProperties = { background: `linear-gradient(135deg, ${calmBrand}, ${mixColor(colors.brand, displayBg, darkMode ? 0.5 : 0.08)})`, color: brandText, borderRadius: radius };
  const systemType = content.systemType.toLowerCase();
  const isBooking = /restaurant|booking|reservation|hotel|venue|dining/i.test(content.useCase);
  const templateType = /mobile app/.test(systemType)
    ? 'mobile'
    : /dashboard/.test(systemType)
      ? 'dashboard'
      : /saas/.test(systemType)
        ? 'saas'
        : /web system/.test(systemType)
          ? 'system'
          : /commerce|e-commerce/.test(systemType)
            ? 'commerce'
            : /portfolio/.test(systemType)
              ? 'portfolio'
              : /landing/.test(systemType)
                ? 'landing'
                : 'website';
  const metricLabels = content.statLabels.length ? content.statLabels : isBooking ? ['VIP clients', 'Reservations', 'Experience'] : templateType === 'system' ? ['Projects', 'Tasks', 'Health'] : templateType === 'saas' ? ['Accounts', 'Activation', 'MRR'] : ['Revenue', 'Users', 'Status'];
  const listLabels = content.cardTitles.length ? content.cardTitles : isBooking ? ['Romantic table', 'Private room', 'Chef menu'] : templateType === 'system' ? ['Design audit', 'Client brief', 'Launch check'] : templateType === 'saas' ? ['Onboarding', 'Billing', 'Workspace'] : ['Active', 'Pending', 'Resolved'];
  const tableRows = content.tableRows.length ? content.tableRows : isBooking ? ['Private suite', 'Window table', 'Chef counter', 'Garden room'] : templateType === 'system' ? ['Client portal', 'Brand system', 'Wireframe set', 'QA review'] : templateType === 'saas' ? ['Starter plan', 'Team rollout', 'Usage review', 'Upgrade path'] : ['North region', 'Product line', 'Retention', 'Campaign'];
  const navLabels = content.navItems.length ? content.navItems : ['Overview', 'Details', 'Reserve'];
  const footerLabels = content.footerItems.length ? content.footerItems : ['Support', 'Privacy', 'Contact'];
  const formLabels = content.formFields.length ? content.formFields : ['Name', 'Email', 'Notes'];
  const mockupTabs = navLabels.slice(0, 3);
  const show = (category: PreviewComponentCategory) => components.some((component) => getComponentCategory(component) === category);
  const miniForm = (
    <div className="p-4" style={mutedPanelStyle}>
      <div className="mb-4 flex items-center justify-between">
        <strong style={{ fontFamily: font }}>{formLabels[0] || 'Form'}</strong>
        <span className="rounded-lg px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>Input</span>
      </div>
      <div className="grid gap-3">
        {formLabels.slice(0, 3).map((field, index) => (
          <div key={field} className="rounded-lg p-3" style={{ backgroundColor: displaySurface, border: `1px solid ${displayBorder}` }}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: displayMuted }}>{field}</div>
            <div className="h-2 rounded-full" style={{ width: `${[76, 54, 88][index]}%`, backgroundColor: displayMuted }} />
          </div>
        ))}
        <button className="rounded-lg px-4 py-3 text-sm font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</button>
      </div>
    </div>
  );
  const miniTable = (
    <div className="overflow-hidden" style={panelStyle}>
      <div className="grid grid-cols-[1.2fr_0.8fr_auto] gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: liftedSurface, color: displayMuted }}>
        <span>{tableRows[0] || 'Item'}</span><span>{listLabels[0] || 'Status'}</span><span>{content.primaryAction}</span>
      </div>
      {tableRows.slice(0, 3).map((item, index) => (
        <div key={item} className="grid grid-cols-[1.2fr_0.8fr_auto] items-center gap-3 px-4 py-3 text-xs" style={{ borderTop: `1px solid ${displayBorder}` }}>
          <strong>{item}</strong>
          <span style={{ color: displayMuted }}>{listLabels[index % listLabels.length]}</span>
          <span className="h-7 w-7 rounded-lg" style={{ backgroundColor: index === 0 ? calmBrand : liftedSurface }} />
        </div>
      ))}
    </div>
  );
  const canUseFreeform = Boolean(previewCanvas?.items?.length && previewCanvas.items.length >= 4);

  if (canUseFreeform && previewCanvas) {
    return (
      <FreeformPreview
        colors={colors}
        font={font}
        content={content}
        previewCanvas={previewCanvas}
        previewStyle={previewStyle}
        components={components}
      />
    );
  }

  return (
    <div className={`min-h-full ${compact ? 'p-2 sm:p-3' : spacious ? 'p-5 sm:p-6' : 'p-3 sm:p-4'}`} style={{ background: previewBackground }}>
      {templateType === 'mobile' ? (
        <div className="mx-auto max-w-[390px] p-3" style={panelStyle}>
          <div className="overflow-hidden rounded-[1.75rem]" style={{ backgroundColor: displayBg, border: `1px solid ${displayBorder}` }}>
            <div className="mx-auto my-3 h-1 w-16 rounded-full" style={{ backgroundColor: displayBorder }} />
            <div className="p-4">
              {show('header') && <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: colors.brand }}>{content.designType}</p>
                  <h2 className="mt-1 text-2xl font-bold" style={{ fontFamily: font }}>{content.brandName}</h2>
                </div>
                <div className="h-10 w-10 rounded-full" style={{ backgroundColor: calmBrand, color: brandText }} />
              </div>}
              {show('hero') && <div className="aspect-[4/3] overflow-hidden" style={{ ...brandStyle }}>
                <TemplateMedia colors={colors} />
              </div>}
              {show('cards') && <div className="mt-4 grid grid-cols-3 gap-2">
                {metricLabels.slice(0, 3).map((item, index) => (
                  <div key={item} className="rounded-xl p-3 text-center" style={index === 1 ? brandStyle : mutedPanelStyle}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item}</p>
                    <p className="mt-1 text-lg font-black" style={{ fontFamily: font }}>{['12', '08', '24'][index]}</p>
                  </div>
                ))}
              </div>}
              {show('cards') && <div className="mt-4 grid gap-3">
                {listLabels.slice(0, 3).map((item, index) => (
                  <div key={item} className="flex items-center justify-between p-3 text-sm font-semibold" style={index === 0 ? brandStyle : mutedPanelStyle}>
                    <span>{item}</span>
                    <span className="h-2 w-12 rounded-full" style={{ backgroundColor: index === 0 ? brandText : colors.brand }} />
                  </div>
                ))}
              </div>}
              {show('form') && <div className="mt-4 p-3" style={panelStyle}>
                <div className="mb-3 flex items-center justify-between">
                  <strong className="text-xs">{formLabels[0] || 'Quick action'}</strong>
                  <span className="h-2 w-10 rounded-full" style={{ backgroundColor: colors.brand }} />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="rounded-lg p-2" style={{ backgroundColor: liftedSurface }}>
                    <div className="h-2 w-20 rounded-full" style={{ backgroundColor: displayText }} />
                    <div className="mt-2 h-2 w-14 rounded-full" style={{ backgroundColor: displayMuted }} />
                  </div>
                  <button className="rounded-lg px-3 text-xs font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</button>
                </div>
              </div>}
              {show('footer') && <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl p-2" style={{ backgroundColor: liftedSurface, border: `1px solid ${displayBorder}` }}>
                {footerLabels.slice(0, 4).map((item, index) => (
                  <div key={item} className="rounded-xl py-2 text-center text-[10px] font-bold" style={{ backgroundColor: index === 0 ? calmBrand : 'transparent', color: index === 0 ? brandText : displayMuted }}>{item}</div>
                ))}
              </div>}
            </div>
          </div>
        </div>
      ) : templateType === 'dashboard' ? (
        <div className="mx-auto grid max-w-5xl gap-4 xl:grid-cols-[220px_1fr]" style={{ color: displayText }}>
          {show('header') && <aside className="hidden p-4 xl:block" style={brandStyle}>
            <div className="mb-8 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <div>
                <p className="font-bold" style={{ fontFamily: font }}>{content.brandName}</p>
                <p className="text-xs opacity-75">{content.systemType}</p>
              </div>
            </div>
            {navLabels.slice(0, 4).map((item, index) => (
              <div key={item} className="mb-2 rounded-lg px-3 py-2 text-sm font-semibold" style={{ backgroundColor: index === 0 ? 'rgba(255,255,255,0.18)' : 'transparent' }}>{item}</div>
            ))}
            <div className="mt-8 rounded-xl p-3 text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <div className="mb-2 h-2 w-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} />
              <div className="h-2 w-28 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.32)' }} />
              <button className="mt-4 rounded-lg px-3 py-2 font-bold" style={{ backgroundColor: brandText, color: calmBrand }}>{content.primaryAction}</button>
            </div>
          </aside>}
          <main className="grid gap-4">
            {show('header') && <header className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" style={panelStyle}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand }}>{content.mood}</p>
                <h1 className="mt-1 text-3xl font-bold" style={{ fontFamily: font }}>{content.useCase}</h1>
              </div>
              <button className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</button>
            </header>}
            {show('cards') && <section className="grid gap-4 md:grid-cols-3">
              {metricLabels.map((item, index) => (
                <div key={item} className="p-4" style={index === 0 ? brandStyle : panelStyle}>
                  <p className="text-xs opacity-75">{item}</p>
                  <p className="mt-3 text-3xl font-bold" style={{ fontFamily: font }}>{['24', '18', '98%'][index]}</p>
                  <div className="mt-4 grid h-10 grid-cols-7 items-end gap-1">
                    {[42, 58, 46, 72, 64, 86, 70].map((height, barIndex) => (
                      <span key={height} className="rounded-sm" style={{ height: `${height}%`, backgroundColor: index === 0 ? 'rgba(255,255,255,0.36)' : barIndex > 3 ? colors.brand : displayBorder }} />
                    ))}
                  </div>
                </div>
              ))}
            </section>}
            {(show('table') || show('hero') || show('cards')) && <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              {show('table') && <div className="p-4" style={panelStyle}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold" style={{ fontFamily: font }}>{content.heroTitle}</h3>
                  <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: liftedSurface }}>
                    {mockupTabs.map((item, index) => (
                      <span key={item} className="rounded-md px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: index === 0 ? calmBrand : 'transparent', color: index === 0 ? brandText : displayMuted }}>{item}</span>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${displayBorder}` }}>
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: liftedSurface, color: displayMuted }}>
                    <span>{tableRows[0] || 'Name'}</span><span>{listLabels[0] || 'Status'}</span><span>{metricLabels[0] || 'Time'}</span><span></span>
                  </div>
                  {tableRows.map((item, index) => (
                    <div key={item} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto] items-center gap-3 px-3 py-3 text-xs" style={{ backgroundColor: index % 2 ? displayBg : displaySurface, borderTop: `1px solid ${displayBorder}` }}>
                      <span className="font-semibold">{item}</span>
                      <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: index === 0 ? calmBrand : liftedSurface, color: index === 0 ? brandText : displayMuted }}>{listLabels[index % listLabels.length]}</span>
                      <strong style={{ color: colors.brand }}>{['Tonight', 'VIP', 'Ready', 'Soon'][index]}</strong>
                      <span className="h-7 w-7 rounded-lg" style={{ backgroundColor: liftedSurface }} />
                    </div>
                  ))}
                </div>
              </div>}
              {(show('hero') || show('cards')) && <div className="grid gap-4">
                {show('hero') && <div className="overflow-hidden" style={panelStyle}>
                  <div className="aspect-[16/10]" style={{ backgroundColor: liftedSurface }}>
                    <TemplateMedia colors={colors} />
                  </div>
                </div>}
                {show('cards') && <div className="grid grid-cols-2 gap-4">
                  {['Progress', 'Review'].map((item, index) => (
                    <div key={item} className="p-4" style={index === 0 ? brandStyle : mutedPanelStyle}>
                      <p className="text-xs opacity-70">{item}</p>
                      <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: index === 0 ? 'rgba(255,255,255,0.3)' : displayBorder }}>
                        <div className="h-2 rounded-full" style={{ width: index === 0 ? '78%' : '52%', backgroundColor: index === 0 ? brandText : colors.brand }} />
                      </div>
                    </div>
                  ))}
                </div>}
              </div>}
            </section>}
            {show('form') && <section>{miniForm}</section>}
          </main>
        </div>
      ) : templateType === 'system' ? (
        <div className="mx-auto grid max-w-5xl gap-4 xl:grid-cols-[200px_1fr_250px]" style={{ color: displayText }}>
          {show('header') && <aside className="hidden p-4 xl:block" style={panelStyle}>
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black" style={{ backgroundColor: calmBrand, color: brandText }}>{content.initial}</div>
              <div>
                <p className="font-bold" style={{ fontFamily: font }}>{content.brandName}</p>
                <p className="text-xs" style={{ color: displayMuted }}>Operations</p>
              </div>
            </div>
            {navLabels.slice(0, 5).map((item, index) => (
              <div key={item} className="mb-2 rounded-lg px-3 py-2 text-sm font-semibold" style={{ backgroundColor: index === 1 ? calmBrand : 'transparent', color: index === 1 ? brandText : displayMuted }}>{item}</div>
            ))}
          </aside>}
          <main className="grid gap-4">
            {show('header') && <header className="p-5" style={brandStyle}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70">{content.mood}</p>
                  <h1 className="mt-2 text-3xl font-bold" style={{ fontFamily: font }}>{content.useCase}</h1>
                  <p className="mt-2 text-sm opacity-75">Structured workflow preview for {content.audience}.</p>
                </div>
                <button className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: brandText, color: calmBrand }}>{content.primaryAction}</button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {metricLabels.map((item, index) => (
                  <div key={item} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item}</p>
                    <p className="mt-2 text-2xl font-black" style={{ fontFamily: font }}>{['12', '36', '94%'][index]}</p>
                  </div>
                ))}
              </div>
            </header>}
            {(show('table') || show('form') || show('hero')) && <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
              {show('table') && <div className="p-4" style={panelStyle}>
                <div className="mb-4 flex items-center justify-between">
                  <strong style={{ fontFamily: font }}>{content.heroTitle}</strong>
                  <span className="rounded-lg px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: liftedSurface, color: displayMuted }}>Live</span>
                </div>
                {tableRows.map((item, index) => (
                  <div key={item} className="mb-2 grid grid-cols-[1fr_auto] rounded-xl p-3 text-sm" style={{ backgroundColor: index === 0 ? liftedSurface : displayBg, border: `1px solid ${displayBorder}` }}>
                    <div>
                      <p className="font-bold">{item}</p>
                      <p className="mt-1 text-xs" style={{ color: displayMuted }}>{listLabels[index % listLabels.length]}</p>
                    </div>
                    <span className="rounded-lg px-2 py-1 text-[10px] font-black self-start" style={{ backgroundColor: index === 0 ? calmBrand : liftedSurface, color: index === 0 ? brandText : displayMuted }}>{['Review', 'Draft', 'Ready', 'Sent'][index]}</span>
                  </div>
                ))}
              </div>}
              {(show('form') || show('hero')) && <div className="grid gap-4">
                {show('form') && <div className="p-4" style={mutedPanelStyle}>
                  <strong style={{ fontFamily: font }}>Approval form</strong>
                  <div className="mt-4 grid gap-3">
                    {[72, 54, 88].map((width) => (
                      <div key={width} className="rounded-lg p-3" style={{ backgroundColor: displaySurface, border: `1px solid ${displayBorder}` }}>
                        <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: displayMuted }} />
                      </div>
                    ))}
                    <button className="rounded-lg px-4 py-3 text-sm font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</button>
                  </div>
                </div>}
                {show('hero') && <div className="min-h-[160px] overflow-hidden" style={panelStyle}>
                  <TemplateMedia colors={colors} />
                </div>}
              </div>}
            </section>}
          </main>
          {(show('cards') || show('footer')) && <aside className="hidden grid-rows-[auto_1fr] gap-4 xl:grid">
            {show('cards') && (
            <div className="p-4" style={panelStyle}>
              <strong style={{ fontFamily: font }}>{listLabels[0] || 'Activity'}</strong>
              {listLabels.slice(0, 3).map((item) => (
                <div key={item} className="mt-3 flex items-center gap-3 text-xs" style={{ color: displayMuted }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.brand }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            )}
            {show('footer') && <div className="p-4" style={mutedPanelStyle}>
              <strong style={{ fontFamily: font }}>{footerLabels[0] || 'Files'}</strong>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="aspect-square rounded-xl" style={{ backgroundColor: item === 0 ? calmBrand : displaySurface, border: `1px solid ${displayBorder}` }} />
                ))}
              </div>
            </div>}
          </aside>}
        </div>
      ) : templateType === 'saas' ? (
        <div className="mx-auto max-w-5xl overflow-hidden" style={panelStyle}>
          {show('header') && <header className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: `1px solid ${displayBorder}` }}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black" style={{ backgroundColor: calmBrand, color: brandText }}>{content.initial}</div>
              <div>
                <strong style={{ fontFamily: font }}>{content.brandName}</strong>
                <p className="text-xs" style={{ color: displayMuted }}>{content.systemType}</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2 text-xs font-bold" style={{ color: displayMuted }}>
              {navLabels.slice(0, 4).map((item, index) => (
                <span key={item} className="rounded-lg px-3 py-2" style={{ backgroundColor: index === 0 ? liftedSurface : 'transparent' }}>{item}</span>
              ))}
            </nav>
            <button className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</button>
          </header>}
          <section className="grid gap-4 p-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="grid gap-4">
              {show('hero') && <div className="p-6" style={brandStyle}>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">{content.mood}</p>
                <h1 className="mt-3 text-4xl font-bold leading-tight" style={{ fontFamily: font }}>{content.heroTitle}</h1>
                <p className="mt-4 text-sm leading-relaxed opacity-80">{content.heroDescription}</p>
                {show('cards') && <div className="mt-6 grid grid-cols-3 gap-3">
                  {metricLabels.map((item, index) => (
                    <div key={item} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item}</p>
                      <p className="mt-2 text-xl font-black" style={{ fontFamily: font }}>{['214', '68%', '$18k'][index]}</p>
                    </div>
                  ))}
                </div>}
              </div>}
              {show('cards') && <div className="grid gap-3 sm:grid-cols-3">
                {listLabels.slice(0, 3).map((item, index) => (
                  <div key={item} className="p-4" style={index === 1 ? brandStyle : mutedPanelStyle}>
                    <div className="mb-4 h-8 w-8 rounded-lg" style={{ backgroundColor: index === 1 ? 'rgba(255,255,255,0.18)' : calmBrand }} />
                    <p className="font-bold" style={{ fontFamily: font }}>{item}</p>
                    <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: index === 1 ? 'rgba(255,255,255,0.25)' : displayBorder }}>
                      <div className="h-2 rounded-full" style={{ width: ['76%', '54%', '38%'][index], backgroundColor: index === 1 ? brandText : colors.brand }} />
                    </div>
                  </div>
                ))}
              </div>}
            </div>
            <div className="grid gap-4">
              {(show('table') || show('cards')) && <div className="overflow-hidden" style={mutedPanelStyle}>
                <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${displayBorder}` }}>
                  <strong style={{ fontFamily: font }}>{content.heroTitle}</strong>
                  <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: displayBg }}>
                    {mockupTabs.map((item, index) => (
                      <span key={item} className="rounded-md px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: index === 0 ? calmBrand : 'transparent', color: index === 0 ? brandText : displayMuted }}>{item}</span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 p-4 lg:grid-cols-[1fr_180px]">
                  {show('table') && <div className="rounded-xl p-4" style={{ backgroundColor: displaySurface, border: `1px solid ${displayBorder}` }}>
                    <div className="grid h-40 grid-cols-8 items-end gap-2">
                      {[30, 48, 42, 68, 55, 78, 64, 88].map((height, index) => (
                        <div key={height} className="rounded-t-md" style={{ height: `${height}%`, backgroundColor: index > 4 ? colors.brand : displayBorder }} />
                      ))}
                    </div>
                  </div>}
                  {show('cards') && <div className="grid gap-3">
                    {listLabels.map((item, index) => (
                      <div key={item} className="rounded-xl p-3" style={index === 0 ? brandStyle : panelStyle}>
                        <p className="text-xs font-bold">{item}</p>
                        <p className="mt-2 text-2xl font-black" style={{ fontFamily: font }}>{['82%', '12', 'Live'][index]}</p>
                      </div>
                    ))}
                  </div>}
                </div>
              </div>}
              {show('table') && <div className="grid gap-3 md:grid-cols-2">
                {tableRows.slice(0, 4).map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl p-3 text-sm" style={panelStyle}>
                    <div>
                      <p className="font-bold">{item}</p>
                      <p className="text-xs" style={{ color: displayMuted }}>{listLabels[index % listLabels.length]}</p>
                    </div>
                    <span className="rounded-lg px-2 py-1 text-[10px] font-black" style={{ backgroundColor: index === 0 ? calmBrand : liftedSurface, color: index === 0 ? brandText : displayMuted }}>{['Hot', 'Good', 'Watch', 'Next'][index]}</span>
                  </div>
                ))}
              </div>}
            </div>
          </section>
          {(show('form') || show('table')) && <section className="grid gap-4 p-5 md:grid-cols-2" style={{ borderTop: `1px solid ${displayBorder}` }}>
            {show('form') && miniForm}
            {show('table') && miniTable}
          </section>}
          {show('footer') && <footer className="grid gap-3 p-5 text-xs md:grid-cols-4" style={{ borderTop: `1px solid ${displayBorder}`, color: displayMuted }}>
            {footerLabels.slice(0, 4).map((item) => (
              <div key={item} className="rounded-lg p-3" style={{ backgroundColor: liftedSurface }}>{item}</div>
            ))}
          </footer>}
        </div>
      ) : templateType === 'commerce' ? (
        <div className="mx-auto max-w-5xl overflow-hidden" style={panelStyle}>
          {show('header') && <header className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: `1px solid ${displayBorder}` }}>
            <strong style={{ fontFamily: font }}>{content.brandName}</strong>
            <nav className="flex gap-3 text-xs font-semibold" style={{ color: displayMuted }}>
              {navLabels.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
            </nav>
          </header>}
          <section className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            {show('hero') && <div className="p-6 sm:p-10" style={brandStyle}>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75">{content.mood}</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl" style={{ fontFamily: font }}>{content.heroTitle}</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-80">{content.heroDescription}</p>
              <button className="mt-6 rounded-lg px-5 py-3 text-sm font-bold" style={{ backgroundColor: brandText, color: calmBrand }}>{content.primaryAction}</button>
              {show('cards') && <div className="mt-8 grid grid-cols-3 gap-3">
                {metricLabels.slice(0, 3).map((item, index) => (
                  <div key={item} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item}</p>
                    <p className="mt-2 text-2xl font-black" style={{ fontFamily: font }}>{['4.9', '18', 'VIP'][index]}</p>
                  </div>
                ))}
              </div>}
            </div>}
            {show('cards') && <div className="grid gap-4 p-5 md:grid-cols-2" style={{ backgroundColor: displayBg }}>
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="overflow-hidden" style={mutedPanelStyle}>
                  <div className="aspect-[4/3]" style={{ backgroundColor: item === 0 ? colors.brand : liftedSurface }}><TemplateMedia colors={colors} /></div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="h-2 w-24 rounded-full" style={{ backgroundColor: displayText }} />
                        <div className="mt-2 h-2 w-16 rounded-full" style={{ backgroundColor: displayMuted }} />
                      </div>
                      <span className="rounded-md px-2 py-1 text-[10px] font-black" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[44, 72, 58].map((width) => (
                        <div key={width} className="h-1.5 rounded-full" style={{ width: `${width}%`, backgroundColor: item === 0 ? colors.brand : displayBorder }} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>}
          </section>
          {(show('form') || show('table')) && <section className="grid gap-4 p-5 md:grid-cols-2" style={{ borderTop: `1px solid ${displayBorder}` }}>
            {show('form') && miniForm}
            {show('table') && miniTable}
          </section>}
          {show('footer') && <footer className="grid gap-3 p-5 text-xs md:grid-cols-3" style={{ borderTop: `1px solid ${displayBorder}`, color: displayMuted }}>
            {footerLabels.slice(0, 3).map((item) => (
              <div key={item} className="rounded-lg p-3" style={{ backgroundColor: liftedSurface }}>{item}</div>
            ))}
          </footer>}
        </div>
      ) : templateType === 'portfolio' ? (
        <div className="mx-auto max-w-5xl" style={{ color: displayText }}>
          <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            {show('hero') && <div className="p-6 sm:p-8" style={panelStyle}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand }}>{content.designType}</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl" style={{ fontFamily: font }}>{content.brandName}</h1>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: displayMuted }}>{content.useCase} portfolio for {content.audience}.</p>
              {show('cards') && <div className="mt-8 grid gap-3">
                {listLabels.slice(0, 3).map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl p-3 text-sm font-semibold" style={index === 0 ? brandStyle : mutedPanelStyle}>
                    <span>{item}</span>
                    <span className="h-2 w-10 rounded-full" style={{ backgroundColor: index === 0 ? brandText : colors.brand }} />
                  </div>
                ))}
              </div>}
            </div>}
            {show('cards') && <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className={item === 0 ? 'sm:row-span-2' : ''} style={item === 0 ? brandStyle : mutedPanelStyle}>
                  <div className={item === 0 ? 'min-h-[280px]' : 'min-h-[130px]'}><TemplateMedia colors={colors} /></div>
                </div>
              ))}
            </div>}
          </section>
          {(show('form') || show('table')) && <section className="mt-4 grid gap-4 md:grid-cols-2">
            {show('form') && miniForm}
            {show('table') && miniTable}
          </section>}
          {show('footer') && <footer className="mt-4 grid gap-4 md:grid-cols-3">
            {footerLabels.slice(0, 3).map((item, index) => (
              <div key={item} className="p-4" style={index === 1 ? brandStyle : panelStyle}>
                <p className="font-bold" style={{ fontFamily: font }}>{item}</p>
                <div className="mt-4 h-2 w-24 rounded-full" style={{ backgroundColor: index === 1 ? brandText : displayMuted }} />
                <div className="mt-2 h-2 w-16 rounded-full" style={{ backgroundColor: index === 1 ? 'rgba(255,255,255,0.35)' : displayBorder }} />
              </div>
            ))}
          </footer>}
        </div>
      ) : templateType === 'landing' ? (
        <div className="mx-auto max-w-5xl overflow-hidden" style={panelStyle}>
          {show('hero') && <section className="min-h-[440px] p-5 sm:p-8" style={brandStyle}>
            {show('header') && <header className="mb-16 flex items-center justify-between">
              <strong style={{ fontFamily: font }}>{content.brandName}</strong>
              <nav className="hidden gap-6 text-xs font-bold opacity-75 sm:flex">
                {navLabels.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
              </nav>
              <button className="rounded-lg px-4 py-2 text-xs font-bold" style={{ backgroundColor: brandText, color: calmBrand }}>{content.primaryAction}</button>
            </header>}
            <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-widest opacity-75">{content.mood}</p>
                <h1 className="mt-4 text-5xl font-bold leading-tight sm:text-7xl" style={{ fontFamily: font }}>{content.heroTitle}</h1>
                <p className="mt-5 max-w-xl text-sm leading-relaxed opacity-80">{content.heroDescription}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button className="rounded-lg px-5 py-3 text-sm font-bold" style={{ backgroundColor: brandText, color: calmBrand }}>{content.primaryAction}</button>
                  <button className="rounded-lg px-5 py-3 text-sm font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.14)', color: brandText }}>{content.secondaryAction}</button>
                </div>
              </div>
              <div className="hidden min-h-[260px] overflow-hidden lg:block" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius }}>
                <TemplateMedia colors={colors} />
              </div>
            </div>
          </section>}
          {show('cards') && <section className="grid gap-4 p-5 md:grid-cols-3">
            {content.cardTitles.map((item, index) => (
              <div key={item} className="p-4" style={index === 0 ? brandStyle : mutedPanelStyle}>
                <p className="font-bold" style={{ fontFamily: font }}>{item}</p>
                <div className="mt-4 h-2 w-24 rounded-full" style={{ backgroundColor: index === 0 ? brandText : displayText }} />
                <div className="mt-2 h-2 w-16 rounded-full" style={{ backgroundColor: index === 0 ? 'rgba(255,255,255,0.35)' : displayMuted }} />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((bar) => (
                    <div key={bar} className="h-8 rounded-lg" style={{ backgroundColor: index === 0 ? 'rgba(255,255,255,0.16)' : displayBg }} />
                  ))}
                </div>
              </div>
            ))}
          </section>}
          {(show('form') || show('table')) && <section className="grid gap-4 p-5 md:grid-cols-2" style={{ borderTop: `1px solid ${displayBorder}` }}>
            {show('form') && miniForm}
            {show('table') && miniTable}
          </section>}
          {show('footer') && <footer className="flex flex-col gap-3 p-5 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: `1px solid ${displayBorder}`, color: displayMuted }}>
            <span>{content.brandName}</span>
            <span>{footerLabels[0] || 'Palette and font preview'}</span>
          </footer>}
        </div>
      ) : (
        <div className="mx-auto max-w-5xl overflow-hidden" style={panelStyle}>
          {show('header') && <header className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: `1px solid ${displayBorder}` }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: calmBrand }} />
              <strong style={{ fontFamily: font }}>{content.brandName}</strong>
            </div>
            <nav className="flex gap-2 text-xs font-semibold" style={{ color: displayMuted }}>
              {navLabels.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
            </nav>
          </header>}
          {(show('hero') || show('cards')) && <section className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
            {show('hero') && (
            <div className="p-6 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand }}>{content.mood}</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl" style={{ fontFamily: font }}>{content.heroTitle}</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: displayMuted }}>{content.heroDescription}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-lg px-5 py-3 text-sm font-bold" style={{ backgroundColor: calmBrand, color: brandText }}>{content.primaryAction}</button>
                <button className="rounded-lg px-5 py-3 text-sm font-bold" style={{ backgroundColor: liftedSurface, color: displayText, border: `1px solid ${displayBorder}` }}>{content.secondaryAction}</button>
              </div>
              {show('cards') && <div className="mt-8 grid grid-cols-3 gap-3">
                {metricLabels.map((item, index) => (
                  <div key={item} className="rounded-xl p-3" style={index === 0 ? brandStyle : mutedPanelStyle}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item}</p>
                    <p className="mt-2 text-2xl font-black" style={{ fontFamily: font }}>{['10', '32', '99%'][index]}</p>
                  </div>
                ))}
              </div>}
            </div>
            )}
            {show('hero') && <div className="min-h-[360px]" style={{ backgroundColor: liftedSurface }}>
              <TemplateMedia colors={colors} />
            </div>}
          </section>}
          {show('cards') && <section className="grid gap-4 p-5 md:grid-cols-3" style={{ borderTop: `1px solid ${displayBorder}` }}>
            {listLabels.slice(0, 3).map((item, index) => (
              <div key={item} className="p-4" style={index === 0 ? brandStyle : mutedPanelStyle}>
                <p className="text-sm font-bold" style={{ fontFamily: font }}>{item}</p>
                <p className="mt-2 text-xs opacity-75">{metricLabels[index % metricLabels.length]}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((bar) => (
                    <span key={bar} className="h-8 rounded-lg" style={{ backgroundColor: index === 0 ? 'rgba(255,255,255,0.16)' : displayBg }} />
                  ))}
                </div>
              </div>
            ))}
          </section>}
          {(show('form') || show('cards')) && <section className="grid gap-4 p-5 lg:grid-cols-[0.8fr_1.2fr]" style={{ borderTop: `1px solid ${displayBorder}` }}>
            {show('form') && <div className="p-4" style={mutedPanelStyle}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.brand }}>Contact block</p>
              <h3 className="mt-2 text-2xl font-bold" style={{ fontFamily: font }}>{content.heroTitle}</h3>
              <div className="mt-4 grid gap-3">
                {[72, 88, 56].map((width) => (
                  <div key={width} className="rounded-lg p-3" style={{ backgroundColor: displaySurface, border: `1px solid ${displayBorder}` }}>
                    <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: displayMuted }} />
                  </div>
                ))}
              </div>
            </div>}
            {show('cards') && <div className="grid gap-3 sm:grid-cols-3">
              {footerLabels.slice(0, 3).map((item, index) => (
                <div key={item} className="p-4" style={index === 2 ? brandStyle : panelStyle}>
                  <div className="mb-5 h-12 rounded-xl" style={{ backgroundColor: index === 2 ? 'rgba(255,255,255,0.16)' : liftedSurface }} />
                  <p className="font-bold" style={{ fontFamily: font }}>{item}</p>
                  <div className="mt-3 h-2 w-20 rounded-full" style={{ backgroundColor: index === 2 ? brandText : displayMuted }} />
                </div>
              ))}
            </div>}
          </section>}
          {show('footer') && <footer className="flex flex-col gap-3 p-5 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ borderTop: `1px solid ${displayBorder}`, color: displayMuted }}>
            <span>{content.brandName}</span>
            <span>{content.systemType} / {content.designType}</span>
          </footer>}
        </div>
      )}
    </div>
  );
}
