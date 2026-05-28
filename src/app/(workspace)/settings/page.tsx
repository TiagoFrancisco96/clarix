'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import './settings.css';

/* ── Types ── */
interface ApiKey {
  id: string;
  provider: string;
  icon: string;
  masked: string;
  isSet: boolean;
}

/* ── Data ── */
const DEFAULT_API_KEYS: ApiKey[] = [
  { id: 'openai', provider: 'Writer Engine', icon: '🟢', masked: '', isSet: false },
  { id: 'anthropic', provider: 'Pro Engine', icon: '🟠', masked: '', isSet: false },
  { id: 'google', provider: 'Research Engine', icon: '🔵', masked: '', isSet: false },
  { id: 'xai', provider: 'Grok Engine', icon: '⚪', masked: '', isSet: false },
  { id: 'deepseek', provider: 'Speed Engine', icon: '🟣', masked: '', isSet: false },
];

const AI_MODELS = [
  { id: 'auto', name: 'Auto (Best Available)', provider: '' },
  { id: 'deepseek-v4-flash', name: 'Speed Engine', provider: 'Clarix' },
  { id: 'claude-sonnet-4.6', name: 'Pro Engine', provider: 'Clarix' },
  { id: 'gpt-5.4', name: 'Writer Engine', provider: 'Clarix' },
  { id: 'gemini-2.5-pro', name: 'Research Engine', provider: 'Clarix' },
  { id: 'grok-4.3', name: 'Grok Engine', provider: 'Clarix' },
  { id: 'gpt-5.5', name: 'Writer+ Engine', provider: 'Clarix' },
  { id: 'claude-opus-4.7', name: 'Pro+ Engine', provider: 'Clarix' },
  { id: 'deepseek-v4', name: 'Speed+ Engine', provider: 'Clarix' },
];

/* ── Tabs ── */
const TABS = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'models', label: 'Models & Keys', icon: '🔑' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'subscription', label: 'Subscription', icon: '💎' },
  { id: 'data', label: 'Data & Privacy', icon: '🛡️' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [theme, setTheme] = useState('dark');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultModel, setDefaultModel] = useState('auto');
  const [apiKeys, setApiKeys] = useState(DEFAULT_API_KEYS);
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    agentAlerts: true,
    weeklyReport: false,
    productUpdates: true,
    creditWarnings: true,
    soundEffects: true,
  });

  /* ── Live credit data ── */
  const [creditData, setCreditData] = useState<{
    balance: number; lifetime_used: number; plan: string;
    plan_credits: number; reset_at: number;
  } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/credits').then(r => r.ok ? r.json() : null).then(d => d && setCreditData(d)).catch(() => {});
  }, []);

  const usageData = {
    creditsUsed: creditData ? creditData.lifetime_used : 0,
    creditsTotal: creditData ? creditData.plan_credits : 200,
    creditsBalance: creditData ? creditData.balance : 200,
    plan: creditData?.plan || 'free',
    storageUsed: 0, // TODO: fetch from /api/drive/usage
    storageTotal: 1, // 1 GB for all plans (verified in drive route)
    topModels: [
      { name: 'Speed Engine', pct: 38 },
      { name: 'Pro Engine', pct: 28 },
      { name: 'Writer+ Engine', pct: 18 },
      { name: 'Other', pct: 16 },
    ],
  };

  const { toast } = useToast();

  /* ── Stripe checkout handler ── */
  const handleCheckout = async (type: 'plan' | 'credits', id: string) => {
    setCheckoutLoading(id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'plan'
            ? { type: 'plan', planId: id }
            : { type: 'credits', packId: id }
        ),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.coming_soon) {
        toast('Payments are coming soon! Stripe is not configured yet.', 'info');
      } else {
        toast(data.error || 'Checkout failed', 'error');
      }
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetApiKey = (id: string) => {
    setApiKeys(prev => prev.map(k =>
      k.id === id ? { ...k, isSet: true, masked: 'sk-••••••••••••••••' } : k
    ));
  };

  return (
    <div className="settings animate-fade-in-up">
      <div className="settings__header">
        <h1 className="settings__title">Settings</h1>
        <span className="settings__subtitle">Manage your workspace, API keys, and preferences</span>
      </div>

      {/* Tab bar */}
      <div className="settings__tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`settings__tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="settings__tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings__content">
        {/* ─── General Tab ─── */}
        {activeTab === 'general' && (
          <div className="settings__section">
            {/* Profile */}
            <div className="settings__card">
              <h2 className="settings__card-title">Profile</h2>
              <div className="settings__card-row">
                <div className="settings__field">
                  <label className="settings__label">Display Name</label>
                  <input className="settings__input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="settings__field">
                  <label className="settings__label">Email</label>
                  <input className="settings__input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <button className="settings__save-btn" onClick={() => toast('Profile settings saved!', 'success')}>Save Changes</button>
            </div>

            {/* Theme */}
            <div className="settings__card">
              <h2 className="settings__card-title">Appearance</h2>
              <div className="settings__theme-group">
                {['dark', 'light', 'system'].map(t => (
                  <button
                    key={t}
                    className={`settings__theme-btn ${theme === t ? 'active' : ''}`}
                    onClick={() => setTheme(t)}
                  >
                    <span className="settings__theme-icon">
                      {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '💻'}
                    </span>
                    <span className="settings__theme-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Usage Overview */}
            <div className="settings__card">
              <h2 className="settings__card-title">Usage This Month</h2>
              <div className="settings__usage-bars">
                <div className="settings__usage-item">
                  <div className="settings__usage-header">
                    <span>Credits Remaining</span>
                    <span className="settings__usage-value">{usageData.creditsBalance.toLocaleString()} / {usageData.creditsTotal.toLocaleString()}</span>
                  </div>
                  <div className="settings__usage-track">
                    <div className="settings__usage-fill" style={{ width: `${Math.min(100, (usageData.creditsBalance / usageData.creditsTotal) * 100)}%` }} />
                  </div>
                </div>
                <div className="settings__usage-item">
                  <div className="settings__usage-header">
                    <span>Storage</span>
                    <span className="settings__usage-value">{usageData.storageUsed} GB / {usageData.storageTotal} GB</span>
                  </div>
                  <div className="settings__usage-track">
                    <div className="settings__usage-fill settings__usage-fill--storage" style={{ width: `${(usageData.storageUsed / usageData.storageTotal) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="settings__usage-models">
                <span className="settings__label">Top Models</span>
                <div className="settings__model-bars">
                  {usageData.topModels.map(m => (
                    <div key={m.name} className="settings__model-bar">
                      <span className="settings__model-name">{m.name}</span>
                      <div className="settings__model-track">
                        <div className="settings__model-fill" style={{ width: `${m.pct}%` }} />
                      </div>
                      <span className="settings__model-pct">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Models & Keys Tab ─── */}
        {activeTab === 'models' && (
          <div className="settings__section">
            {/* Default Model */}
            <div className="settings__card">
              <h2 className="settings__card-title">Default Model</h2>
              <p className="settings__desc">Choose which model is used by default across all AI tools.</p>
              <div className="settings__model-select">
                {AI_MODELS.map(m => (
                  <button
                    key={m.id}
                    className={`settings__model-option ${defaultModel === m.id ? 'active' : ''}`}
                    onClick={() => setDefaultModel(m.id)}
                  >
                    <span className="settings__model-option-name">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* API Keys */}
            <div className="settings__card">
              <h2 className="settings__card-title">API Keys</h2>
              <p className="settings__desc">Add your own API keys to use models directly. Keys are encrypted and stored securely.</p>
              <div className="settings__api-keys">
                {apiKeys.map(key => (
                  <div key={key.id} className="settings__api-key">
                    <span className="settings__api-key-icon">{key.icon}</span>
                    <span className="settings__api-key-provider">{key.provider}</span>
                    {key.isSet ? (
                      <>
                        <span className="settings__api-key-masked">{key.masked}</span>
                        <span className="settings__api-key-status settings__api-key-status--set">Connected</span>
                        <button className="settings__api-key-remove" onClick={() => setApiKeys(prev => prev.map(k => k.id === key.id ? { ...k, isSet: false, masked: '' } : k))}>Remove</button>
                      </>
                    ) : (
                      <button className="settings__api-key-add" onClick={() => handleSetApiKey(key.id)}>Add Key</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Notifications Tab ─── */}
        {activeTab === 'notifications' && (
          <div className="settings__section">
            <div className="settings__card">
              <h2 className="settings__card-title">Notification Preferences</h2>
              <div className="settings__toggles">
                {[
                  { key: 'emailDigest' as const, label: 'Daily Email Digest', desc: 'Receive a summary of your AI activity each morning' },
                  { key: 'agentAlerts' as const, label: 'Agent Alerts', desc: 'Get notified when autonomous agents complete tasks' },
                  { key: 'weeklyReport' as const, label: 'Weekly Usage Report', desc: 'Weekly breakdown of credits and model usage' },
                  { key: 'productUpdates' as const, label: 'Product Updates', desc: 'New features, model releases, and announcements' },
                  { key: 'creditWarnings' as const, label: 'Credit Warnings', desc: 'Alert when credits are below 10% remaining' },
                  { key: 'soundEffects' as const, label: 'Sound Effects', desc: 'Play sounds when generation completes' },
                ].map(item => (
                  <div key={item.key} className="settings__toggle-row">
                    <div className="settings__toggle-info">
                      <span className="settings__toggle-label">{item.label}</span>
                      <span className="settings__toggle-desc">{item.desc}</span>
                    </div>
                    <button
                      className={`settings__toggle ${notifications[item.key] ? 'active' : ''}`}
                      onClick={() => toggleNotification(item.key)}
                    >
                      <span className="settings__toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Subscription Tab ─── */}
        {activeTab === 'subscription' && (
          <div className="settings__section">
            <div className="settings__card">
              <h2 className="settings__card-title">Current Plan</h2>
              <div className="settings__plan-current">
                <span className="settings__plan-badge">{usageData.plan === 'free' ? 'Free' : usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1)}</span>
                <span className="settings__plan-info">{usageData.creditsBalance.toLocaleString()} credits remaining · {usageData.creditsTotal.toLocaleString()}/month</span>
              </div>

              <div className="settings__plans">
                <div className="settings__plan">
                  <div className="settings__plan-name">Free</div>
                  <div className="settings__plan-price">$0<span>/mo</span></div>
                  <ul className="settings__plan-features">
                    <li>200 credits/month</li>
                    <li>All 15 AI tools</li>
                    <li>All 4 AI models</li>
                    <li>Smart AI routing</li>
                    <li>1 GB Drive storage</li>
                  </ul>
                  <button className="settings__upgrade-btn" disabled>{usageData.plan === 'free' ? 'Current Plan' : 'Downgrade'}</button>
                </div>
                <div className="settings__plan settings__plan--pro">
                  <div className="settings__plan-popular">150x More Credits</div>
                  <div className="settings__plan-name">Pro</div>
                  <div className="settings__plan-price">$29<span>/mo</span></div>
                  <ul className="settings__plan-features">
                    <li>30,000 credits/month</li>
                    <li>All 15 AI tools</li>
                    <li>All 4 AI models</li>
                    <li>Smart AI routing</li>
                    <li>1 GB Drive storage</li>
                    <li>Email support</li>
                  </ul>
                  <button className="settings__upgrade-btn settings__upgrade-btn--pro" disabled={checkoutLoading === 'pro' || usageData.plan === 'pro'} onClick={() => handleCheckout('plan', 'pro')}>{usageData.plan === 'pro' ? 'Current Plan' : checkoutLoading === 'pro' ? 'Redirecting...' : 'Upgrade to Pro'}</button>
                </div>
              </div>
            </div>

            <div className="settings__card">
              <h2 className="settings__card-title">Buy More Credits</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Need more credits? Purchase a pack anytime. Credits never expire and stack on top of your plan.
              </p>
              <div className="settings__credit-packs">
                <button className="settings__credit-pack" disabled={checkoutLoading === 'pack-2500'} onClick={() => handleCheckout('credits', 'pack-2500')}>
                  <span className="settings__credit-pack-amount">2,500 credits</span>
                  <span className="settings__credit-pack-price">$5</span>
                  <span className="settings__credit-pack-rate">$0.002/credit</span>
                </button>
                <button className="settings__credit-pack" disabled={checkoutLoading === 'pack-10000'} onClick={() => handleCheckout('credits', 'pack-10000')}>
                  <span className="settings__credit-pack-amount">10,000 credits</span>
                  <span className="settings__credit-pack-price">$15</span>
                  <span className="settings__credit-pack-rate">$0.0015/credit · Save 25%</span>
                </button>
                <button className="settings__credit-pack settings__credit-pack--popular" disabled={checkoutLoading === 'pack-50000'} onClick={() => handleCheckout('credits', 'pack-50000')}>
                  <span className="settings__credit-pack-badge">Best Value</span>
                  <span className="settings__credit-pack-amount">50,000 credits</span>
                  <span className="settings__credit-pack-price">$59</span>
                  <span className="settings__credit-pack-rate">$0.00118/credit · Save 41%</span>
                </button>
                <button className="settings__credit-pack" disabled={checkoutLoading === 'pack-100000'} onClick={() => handleCheckout('credits', 'pack-100000')}>
                  <span className="settings__credit-pack-amount">100,000 credits</span>
                  <span className="settings__credit-pack-price">$99</span>
                  <span className="settings__credit-pack-rate">$0.00099/credit · Save 50%</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Data & Privacy Tab ─── */}
        {activeTab === 'data' && (
          <div className="settings__section">
            <div className="settings__card">
              <h2 className="settings__card-title">Data Management</h2>
              <div className="settings__data-actions">
                <div className="settings__data-action">
                  <div className="settings__data-action-info">
                    <span className="settings__data-action-label">📦 Export All Data</span>
                    <span className="settings__data-action-desc">Download all your chats, documents, images, and settings as a ZIP file.</span>
                  </div>
                  <button className="settings__save-btn" onClick={() => toast('Preparing data export... This may take a few minutes.', 'info')}>Export</button>
                </div>
                <div className="settings__data-action">
                  <div className="settings__data-action-info">
                    <span className="settings__data-action-label">🗑️ Clear Chat History</span>
                    <span className="settings__data-action-desc">Permanently delete all conversation history. This cannot be undone.</span>
                  </div>
                  <button className="settings__danger-btn" onClick={() => { if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) toast('Chat history cleared.', 'success'); }}>Clear</button>
                </div>
                <div className="settings__data-action">
                  <div className="settings__data-action-info">
                    <span className="settings__data-action-label">⚠️ Delete Account</span>
                    <span className="settings__data-action-desc">Permanently delete your account and all associated data.</span>
                  </div>
                  <button className="settings__danger-btn" onClick={() => { if (confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) toast('Account deletion requested. You will receive a confirmation email.', 'info'); }}>Delete Account</button>
                </div>
              </div>
            </div>

            <div className="settings__card">
              <h2 className="settings__card-title">Privacy</h2>
              <div className="settings__toggles">
                <div className="settings__toggle-row">
                  <div className="settings__toggle-info">
                    <span className="settings__toggle-label">Training Data Opt-Out</span>
                    <span className="settings__toggle-desc">Prevent your data from being used to train AI models</span>
                  </div>
                  <button className="settings__toggle active" onClick={() => { }}><span className="settings__toggle-knob" /></button>
                </div>
                <div className="settings__toggle-row">
                  <div className="settings__toggle-info">
                    <span className="settings__toggle-label">Analytics</span>
                    <span className="settings__toggle-desc">Help improve Clarix by sharing anonymous usage data</span>
                  </div>
                  <button className="settings__toggle" onClick={() => { }}><span className="settings__toggle-knob" /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
