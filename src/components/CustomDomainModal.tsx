import React, { useState } from 'react';
import { Globe, X, Check, ExternalLink, ShieldCheck, Sparkles } from 'lucide-react';

interface CustomDomainModalProps {
  currentDomain: string;
  onSaveDomain: (domain: string) => void;
  onClose: () => void;
}

export const CustomDomainModal: React.FC<CustomDomainModalProps> = ({
  currentDomain,
  onSaveDomain,
  onClose,
}) => {
  const [domainInput, setDomainInput] = useState<string>(
    currentDomain || (typeof window !== 'undefined' ? window.location.host : 'share.mydomain.tld')
  );
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const presets = [
    window.location.host,
    'share.mydomain.tld',
    'files.cloudstorage.net',
    'dl.brandnetwork.io',
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    onSaveDomain(cleanDomain);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
          <Globe className="w-5 h-5" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Custom Domain Links</h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Configure a custom domain or brand alias so all shared download links format neatly as{' '}
          <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
            https://your-domain.tld/file/file-id
          </span>
          .
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Custom Domain / Hostname
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="text-xs font-mono text-slate-400 mr-1">https://</span>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="share.mydomain.tld"
                className="flex-1 bg-transparent text-sm font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                required
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Generated share links will look like:{' '}
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                https://{domainInput.trim() || 'domain.tld'}/file/x8f2a1
              </span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDomainInput(preset)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition ${
                    domainInput === preset
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Production DNS Deployment Info</span>
            </div>
            <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
              In a production DNS provider (Cloudflare, AWS Route53, Namecheap), add a{' '}
              <span className="font-mono font-semibold">CNAME</span> record pointing your custom subdomain
              to this server's host. DropGig's routing layer will serve all files under{' '}
              <code className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 font-mono">
                /file/:id
              </code>{' '}
              seamlessly.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Save Domain
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
