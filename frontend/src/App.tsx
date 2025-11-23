import { useEffect, useMemo, useState } from 'react';
import {
  Upload,
  FileText,
  Globe,
  Save,
  Download,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  Sparkles,
  LayoutTemplate,
  History
} from 'lucide-react';
import './App.css';

type Provider = 'openai' | 'gemini';
type Platform = 'AMAZON' | 'EBAY';
type ToastType = 'info' | 'error' | 'success';

type DraftItem = {
  id: string;
  source_title: string;
  bullet_points: string[];
  translations?: string[];
  language_code: string;
  trans_language_code?: string;
  platform: Platform;
  provider: Provider;
  img_link?: string;
  created_at: string;
  status: 'STAGED';
};

type Toast = { type: ToastType; message: string } | null;

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:3000' : '');
const STORAGE_KEY = 'listing_drafts_v1';
const languages = [
  { code: 'en-US', label: '英语 (美式)' },
  { code: 'en-GB', label: '英语 (英式)' },
  { code: 'de', label: '德语' },
  { code: 'fr', label: '法语' },
  { code: 'it', label: '意大利语' },
  { code: 'es', label: '西班牙语' },
  { code: 'ja', label: '日语' },
  { code: 'zh-CN', label: '中文(简体)' }
];

const emptyBullets = () => Array(5).fill('');

function App() {
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('AMAZON');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [bulletPoints, setBulletPoints] = useState<string[]>(() => emptyBullets());
  const [translations, setTranslations] = useState<string[]>(() => emptyBullets());
  const [showTranslation, setShowTranslation] = useState(false);
  const [language, setLanguage] = useState('en-US'); // Source language
  const [transLanguage, setTransLanguage] = useState('de'); // Default translation target
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [staged, setStaged] = useState<DraftItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setStaged(JSON.parse(saved));
    } catch (err) {
      console.error('Failed to load drafts', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staged));
  }, [staged]);

  const canStage = useMemo(
    () => bulletPoints.filter(Boolean).length === 5 && title.trim().length > 0,
    [bulletPoints, title]
  );

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleFile = (file?: File) => {
    if (!file) {
      setImageBase64(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImageBase64(base64);
      showToast('图片已加载', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!title.trim() && !imageUrl.trim() && !imageBase64) {
      showToast('请输入标题或上传图片', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        prompt_context: {
          title: title.trim(),
          img_link: imageUrl.trim() || undefined,
          image_base64: imageBase64 || undefined
        },
        target_platform: platform,
        model_provider: provider
      };
      const res = await fetch(`${API_BASE}/api/v1/listing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '生成失败');
      setBulletPoints(data.data.bullet_points || emptyBullets());
      setLanguage(data.data.language || 'en-US');
      setTranslations(emptyBullets()); // Reset translations on new generation
      setShowTranslation(false); // Hide translation on new generation
      showToast(`生成成功 (${data.data.provider || provider})`, 'success');
    } catch (err: any) {
      showToast(err.message || '生成失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (targetLang: string) => {
    setTransLanguage(targetLang);
    if (!targetLang) return;
    setShowTranslation(true); // Show translation area immediately
    if (!bulletPoints.filter(Boolean).length) {
      showToast('暂无内容可翻译', 'error');
      return;
    }
    // No confirmation needed as we are not overwriting
    setTranslating(true);
    try {
      const payload = {
        content_array: bulletPoints,
        target_language: targetLang,
        model_provider: provider
      };
      const res = await fetch(`${API_BASE}/api/v1/listing/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '翻译失败');
      setTranslations(data.data.translated_array || translations);
      showToast(`已翻译为 ${targetLang}`, 'success');
    } catch (err: any) {
      showToast(err.message || '翻译失败', 'error');
    } finally {
      setTranslating(false);
    }
  };


  const handleStage = () => {
    if (!canStage) {
      showToast('标题和 5 点描述均为必填项', 'error');
      return;
    }
    const draft: DraftItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      source_title: title.trim(),
      bullet_points: bulletPoints,
      translations: translations.some(t => t) ? translations : undefined,
      language_code: language,
      trans_language_code: translations.some(t => t) ? transLanguage : undefined,
      platform,
      provider,
      img_link: imageUrl.trim() || undefined,
      created_at: new Date().toISOString(),
      status: 'STAGED'
    };
    setStaged((prev) => [draft, ...prev]);
    setTitle('');
    setBulletPoints(emptyBullets());
    setTranslations(emptyBullets());
    setImageUrl('');
    setImageBase64(null);
    showToast('已保存至草稿箱', 'success');
  };

  const downloadCSV = () => {
    if (!staged.length) {
      showToast('暂无草稿可导出', 'error');
      return;
    }
    const header = [
      'title', 
      'point1', 'point2', 'point3', 'point4', 'point5', 
      'trans_point1', 'trans_point2', 'trans_point3', 'trans_point4', 'trans_point5',
      'img-link', 'platform', 'language', 'trans_language'
    ];
    const rows = staged.map((item) => [
      item.source_title,
      item.bullet_points[0] || '',
      item.bullet_points[1] || '',
      item.bullet_points[2] || '',
      item.bullet_points[3] || '',
      item.bullet_points[4] || '',
      (item.translations && item.translations[0]) || '',
      (item.translations && item.translations[1]) || '',
      (item.translations && item.translations[2]) || '',
      (item.translations && item.translations[3]) || '',
      (item.translations && item.translations[4]) || '',
      item.img_link || '',
      item.platform,
      item.language_code,
      item.trans_language_code || ''
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${(cell ?? '').toString().replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listing_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV 导出成功', 'success');
  };

  const updateBullet = (idx: number, value: string) => {
    setBulletPoints((prev) => prev.map((bp, i) => (i === idx ? value : bp)));
  };

  const updateTranslation = (idx: number, value: string) => {
    setTranslations((prev) => prev.map((t, i) => (i === idx ? value : t)));
  };

  return (
    <div className="layout">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div className="brand-text">
            <h1>ListingGenius</h1>
            <p>AI 驱动的跨境文案生成器</p>
          </div>
        </div>
        <div className="nav-controls">
          <div className="control-group">
            <span className="control-label">AI 模型</span>
            <select 
              className="select-input"
              value={provider} 
              onChange={(e) => setProvider(e.target.value as Provider)}
            >
              <option value="gemini">Gemini Pro</option>
              <option value="openai">GPT-4o</option>
            </select>
          </div>
          <div className="control-group">
             <span className="control-label">平台</span>
             <div className="toggle-group">
                {(['AMAZON', 'EBAY'] as Platform[]).map((p) => (
                  <button
                    key={p}
                    className={`toggle-btn ${platform === p ? 'active' : ''}`}
                    onClick={() => setPlatform(p)}
                  >
                    {p}
                  </button>
                ))}
             </div>
          </div>
          <button className="btn btn-secondary" onClick={downloadCSV}>
            <Download size={16} />
            导出 CSV
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Left Panel: Input */}
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <LayoutTemplate size={18} />
              输入素材
            </div>
          </div>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">商品标题</label>
              <textarea
                className="textarea-field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：无线降噪蓝牙耳机，超长续航..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">商品图片</label>
              <div className="upload-zone">
                <input 
                  type="file" 
                  accept="image/*" 
                  id="file-upload" 
                  style={{display: 'none'}}
                  onChange={(e) => handleFile(e.target.files?.[0])} 
                />
                <label htmlFor="file-upload" style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%'}}>
                  {imageBase64 ? (
                    <>
                      <CheckCircle size={24} className="text-success" color="var(--success)" />
                      <span>图片已选择</span>
                    </>
                  ) : (
                    <>
                      <Upload size={24} />
                      <span>点击或拖拽上传图片</span>
                    </>
                  )}
                </label>
              </div>
              <input
                type="url"
                className="input-field"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="或粘贴图片 URL..."
              />
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }} 
                onClick={handleGenerate} 
                disabled={loading}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                生成文案
              </button>
            </div>
          </div>
        </section>

        {/* Middle Panel: Editor */}
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <FileText size={18} />
              编辑与预览
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <button 
                className={`btn btn-ghost ${showTranslation ? 'active' : ''}`}
                style={{padding: '4px 8px', fontSize: '0.8rem'}}
                onClick={() => setShowTranslation(!showTranslation)}
                title="显示/隐藏翻译"
              >
                <Globe size={14} />
                {showTranslation ? '隐藏翻译' : '显示翻译'}
              </button>
              {showTranslation && (
                <select 
                  className="select-input" 
                  style={{fontSize: '0.8rem', maxWidth: '100px'}}
                  value={transLanguage}
                  onChange={(e) => handleTranslate(e.target.value)}
                  disabled={translating}
                >
                  {languages.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              )}
              {translating && <Loader2 size={14} className="spin" />}
            </div>
          </div>
          <div className="panel-body">
            <div className="bullets-list">
              {bulletPoints.map((bp, idx) => (
                <div key={idx} className="bullet-group">
                  <div className="bullet-number">{idx + 1}</div>
                  <div className="bullet-inputs">
                    <div className="input-wrapper">
                      <span className="input-label">Original ({language})</span>
                      <textarea
                        className="textarea-field"
                        value={bp}
                        onChange={(e) => updateBullet(idx, e.target.value)}
                        placeholder={`卖点描述 #${idx + 1}...`}
                      />
                    </div>
                    {showTranslation && (
                      <div className="input-wrapper translation">
                        <span className="input-label">Translation ({transLanguage})</span>
                        <textarea
                          className="textarea-field translation-field"
                          value={translations[idx]}
                          onChange={(e) => updateTranslation(idx, e.target.value)}
                          placeholder="点击上方翻译按钮生成..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-success" onClick={handleStage} disabled={!canStage}>
                <Save size={18} />
                保存至草稿
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel: History */}
        <section className="panel history">
          <div className="panel-header">
            <div className="panel-title">
              <History size={18} />
              草稿箱 ({staged.length})
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            {staged.length === 0 ? (
              <div className="empty-state">
                <ImageIcon size={48} strokeWidth={1} />
                <p>暂无草稿<br/>生成的文案将显示在这里</p>
              </div>
            ) : (
              <div className="history-list">
                {staged.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-title">{item.source_title}</div>
                    <div className="history-meta">
                      <div className="badges">
                        <span className={`badge ${item.platform.toLowerCase()}`}>{item.platform}</span>
                        <span className="badge">{item.language_code}</span>
                        {item.translations && <span className="badge trans">{item.trans_language_code}</span>}
                      </div>
                      <button className="btn btn-ghost danger" onClick={() => {
                          if(confirm('确认删除此草稿？')) {
                              setStaged(prev => prev.filter(p => p.id !== item.id))
                          }
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
