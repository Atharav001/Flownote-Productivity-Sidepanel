import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getExtensionId, getStoredClientId, setStoredClientId } from '../services/googleAuth.js';

const STEPS = [
  {
    num: 1,
    title: 'Go to Google Cloud Console',
    detail: 'Open console.cloud.google.com and create a new project (or select an existing one).',
    link: 'https://console.cloud.google.com/',
    linkLabel: 'Open Cloud Console',
  },
  {
    num: 2,
    title: 'Enable Google Tasks API',
    detail: 'Go to "APIs & Services" > "Library", search for "Google Tasks API", and click "Enable".',
  },
  {
    num: 3,
    title: 'Create OAuth Client ID',
    detail: 'Go to "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth client ID".',
  },
  {
    num: 4,
    title: 'Choose Application Type',
    detail: 'Select "Web application" as the application type. You can also use "Chrome Extension" type.',
  },
  {
    num: 5,
    title: 'Add Authorized Redirect URI',
    detail: 'Under "Authorized redirect URIs", click "Add URI" and paste the redirect URL shown below.',
  },
  {
    num: 6,
    title: 'Copy Your Client ID',
    detail: 'After creating, copy the "Client ID" string and paste it in the input below.',
  },
];

export default function SetupGuide({ onClientIdSet, onBack }) {
  const [clientId, setClientId] = useState('');
  const [savedClientId, setSavedClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const extensionId = getExtensionId();
  const redirectUri = extensionId ? `https://${extensionId}.chromiumapp.org/` : null;

  useEffect(() => {
    getStoredClientId().then(id => {
      if (id) {
        setClientId(id);
        setSavedClientId(id);
      }
    });
  }, []);

  const handleCopy = async () => {
    if (redirectUri) {
      try {
        await navigator.clipboard.writeText(redirectUri);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const handleSave = async () => {
    const trimmed = clientId.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Please enter a valid Client ID.' });
      return;
    }
    if (!trimmed.includes('.apps.googleusercontent.com')) {
      setMessage({ type: 'error', text: 'That does not look like a valid Google OAuth Client ID. It should end with .apps.googleusercontent.com' });
      return;
    }
    setSaving(true);
    try {
      await setStoredClientId(trimmed);
      setSavedClientId(trimmed);
      setMessage({ type: 'success', text: 'Client ID saved! You can now sign in.' });
      setTimeout(() => setMessage(null), 3000);
      onClientIdSet?.(trimmed);
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to save: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">sync</span> Google Tasks Setup
        </h3>
        {onBack && (
          <button onClick={onBack} className="text-[10px] text-outline font-bold uppercase hover:text-on-surface transition-colors">Back</button>
        )}
      </div>

      <div className="bg-surface-container-high border border-primary/20 rounded-xl p-4 space-y-3">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          To sync with Google Tasks, you need to create your own OAuth credentials in Google Cloud Console.
          Follow the steps below — it takes about 5 minutes.
        </p>

        {!extensionId ? (
          <div className="bg-error/10 border border-error/30 rounded-xl p-3 text-xs text-error font-bold">
            Not running as a Chrome extension. Load this app as an unpacked extension first.
          </div>
        ) : (
          <div className="bg-surface-container border border-surface-variant rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Your Extension ID</span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{extensionId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Redirect URI</span>
              <div className="flex items-center gap-1">
                <code className="text-[10px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-mono truncate max-w-[160px]">{redirectUri}</code>
                <button
                  onClick={handleCopy}
                  className="text-[10px] text-primary hover:text-primary/80 font-bold uppercase shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {STEPS.map(step => (
            <div key={step.num} className="flex gap-2 items-start py-1">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{step.num}</span>
              <div className="flex-1">
                <span className="text-xs font-bold text-on-surface">{step.title}</span>
                <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">{step.detail}</p>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary font-bold underline inline-block mt-0.5"
                  >
                    {step.linkLabel} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-high border border-surface-variant rounded-xl p-3 space-y-2">
        <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Your OAuth Client ID</label>
        <input
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
          className="w-full bg-surface-container border border-surface-variant/50 rounded-xl px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary/50"
        />
        <div className="flex gap-2">
          {savedClientId && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-primary/20 text-primary rounded-xl py-2 text-xs font-bold hover:bg-primary/30 border border-primary/30 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : savedClientId === clientId.trim() ? 'Update' : 'Save'}
            </motion.button>
          )}
          {savedClientId && (
            <button
              onClick={onClientIdSet}
              className="flex-1 bg-green-400/20 text-green-400 rounded-xl py-2 text-xs font-bold hover:bg-green-400/30 border border-green-400/30 transition-colors"
            >
              Sign In →
            </button>
          )}
        </div>
        {!savedClientId && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary/20 text-primary rounded-xl py-2 text-xs font-bold hover:bg-primary/30 border border-primary/30 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </motion.button>
        )}
      </div>

      {message && (
        <div className={`text-xs font-bold px-3 py-2 rounded-xl border ${message.type === 'error' ? 'bg-error/20 text-error border-error/30' : 'bg-green-400/20 text-green-400 border-green-400/30'}`}>
          {message.text}
        </div>
      )}
    </motion.div>
  );
}
