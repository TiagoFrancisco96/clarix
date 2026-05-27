'use client';

import React, { useState } from 'react';
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
  { id: 'openai', provider: 'OpenAI', icon: '🟢', masked: '', isSet: false },
  { id: 'anthropic', provider: 'Anthropic', icon: '🟠', masked: '', isSet: false },
  { id: 'google', provider: 'Google AI', icon: '🔵', masked: '', isSet: false },
  { id: 'xai', provider: 'xAI (Grok)', icon: '⚪', masked: '', isSet: false },
  { id: 'deepseek', provider: 'DeepSeek', icon: '🟣', masked: '', isSet: false },
];

const AI_MODELS = [
  { id: 'auto', name: 'Auto (Best Available)', provider: '' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash', provider: 'DeepSeek' },
  { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'OpenAI' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { id: 'grok-4.3', name: 'Grok 4.3', provider: 'xAI' },
  { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI' },
  { id: 'claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'Anthropic' },
  { id: 'deepseek-v4', name: 'DeepSeek V4-Pro', provider: 'DeepSeek' },
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

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetApiKey = (id: string) => {
    setApiKeys(prev => prev.map(k =>
      k.id === id ? { ...k, isSet: true, masked: 'sk-••••••••••••••••' } : k
    ));
  };

  /* ── Usage data (simulated) ── */
  const usageData = {
    creditsUsed: 4_280,
    creditsTotal: 12_000,
    storageUsed: 12.4,
    storageTotal: 50,
    topModels: [
      { name: 'DeepSeek V4-Flash', pct: 38 },
      { name: 'Claude Sonnet 4.6', pct: 28 },
      { name: 'GPT-5.5', pct: 18 },
      { name: 'Other', pct: 16 },
    ],
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
              <button className="settings__save-btn" onClick={() => alert('Profile settings saved!')}>Save Changes</button>
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
                    <span>Credits</span>
                    <span className="settings__usage-value">{usageData.creditsUsed.toLocaleString()} / {usageData.creditsTotal.toLocaleString()}</span>
                  </div>
                  <div className="settings__usage-track">
                    <div className="settings__usage-fill" style={{ width: `${(usageData.creditsUsed / usageData.creditsTotal) * 100}%` }} />
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
                <span className="settings__plan-badge">Free</span>
                <span className="settings__plan-info">200 credits / month · 1 GB storage</span>
              </div>

              <div className="settings__plans">
                <div className="settings__plan">
                  <div className="settings__plan-name">Plus</div>
                  <div className="settings__plan-price">$25<span>/mo</span></div>
                  <ul className="settings__plan-features">
                    <li>12,000 credits/month</li>
                    <li>50 GB AI Drive</li>
                    <li>All premium models</li>
                    <li>Priority generation queue</li>
                    <li>Custom agents (up to 10)</li>
                  </ul>
                  <button className="settings__upgrade-btn" onClick={() => alert('Redirecting to checkout for Plus plan...')}>Upgrade to Plus</button>
                </div>
                <div className="settings__plan settings__plan--pro">
                  <div className="settings__plan-popular">Most Popular</div>
                  <div className="settings__plan-name">Pro</div>
                  <div className="settings__plan-price">$49<span>/mo</span></div>
                  <ul className="settings__plan-features">
                    <li>30,000 credits/month</li>
                    <li>100 GB AI Drive</li>
                    <li>Priority queue & support</li>
                    <li>Custom agents (unlimited)</li>
                    <li>API access & webhooks</li>
                  </ul>
                  <button className="settings__upgrade-btn settings__upgrade-btn--pro" onClick={() => alert('Redirecting to checkout for Pro plan...')}>Upgrade to Pro</button>
                </div>
                <div className="settings__plan">
                  <div className="settings__plan-name">Enterprise</div>
                  <div className="settings__plan-price">$249<span>/mo</span></div>
                  <ul className="settings__plan-features">
                    <li>200,000 credits/month</li>
                    <li>500 GB AI Drive</li>
                    <li>SSO & SAML</li>
                    <li>Dedicated support & SLA</li>
                    <li>Team collaboration</li>
                  </ul>
                  <button className="settings__upgrade-btn" onClick={() => alert('Opening contact form for Enterprise sales...')}>Contact Sales</button>
                </div>
              </div>
            </div>

            <div className="settings__card">
              <h2 className="settings__card-title">Buy More Credits</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                Need more credits? Purchase a pack anytime. Credits never expire and stack on top of your plan.
              </p>
              <div className="settings__credit-packs">
                <button className="settings__credit-pack" onClick={() => alert('Purchasing 2,500 credits for $5...')}>
                  <span className="settings__credit-pack-amount">2,500 credits</span>
                  <span className="settings__credit-pack-price">$5</span>
                  <span className="settings__credit-pack-rate">$0.002/credit</span>
                </button>
                <button className="settings__credit-pack" onClick={() => alert('Purchasing 10,000 credits for $15...')}>
                  <span className="settings__credit-pack-amount">10,000 credits</span>
                  <span className="settings__credit-pack-price">$15</span>
                  <span className="settings__credit-pack-rate">$0.0015/credit · Save 25%</span>
                </button>
                <button className="settings__credit-pack settings__credit-pack--popular" onClick={() => alert('Purchasing 50,000 credits for $59...')}>
                  <span className="settings__credit-pack-badge">Best Value</span>
                  <span className="settings__credit-pack-amount">50,000 credits</span>
                  <span className="settings__credit-pack-price">$59</span>
                  <span className="settings__credit-pack-rate">$0.00118/credit · Save 41%</span>
                </button>
                <button className="settings__credit-pack" onClick={() => alert('Purchasing 100,000 credits for $99...')}>
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
                  <button className="settings__save-btn" onClick={() => alert('Preparing data export... This may take a few minutes.')}>Export</button>
                </div>
                <div className="settings__data-action">
                  <div className="settings__data-action-info">
                    <span className="settings__data-action-label">🗑️ Clear Chat History</span>
                    <span className="settings__data-action-desc">Permanently delete all conversation history. This cannot be undone.</span>
                  </div>
                  <button className="settings__danger-btn" onClick={() => { if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) alert('Chat history cleared.'); }}>Clear</button>
                </div>
                <div className="settings__data-action">
                  <div className="settings__data-action-info">
                    <span className="settings__data-action-label">⚠️ Delete Account</span>
                    <span className="settings__data-action-desc">Permanently delete your account and all associated data.</span>
                  </div>
                  <button className="settings__danger-btn" onClick={() => { if (confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) alert('Account deletion requested. You will receive a confirmation email.'); }}>Delete Account</button>
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
