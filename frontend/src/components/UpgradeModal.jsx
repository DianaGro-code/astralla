/**
 * UpgradeModal — shown when the user hits the free reading limit.
 *
 * Props:
 *   open     — boolean
 *   onClose  — () => void
 *   limit    — number (how many free readings they had)
 */
import { useState } from 'react';
import { usePurchases } from '../hooks/usePurchases.js';
import { useNative } from '../hooks/useNative.js';

function Spinner() {
  return <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

export default function UpgradeModal({ open, onClose, limit }) {
  const native = useNative();
  const { offerings, isPro, purchase, restore, loading, error } = usePurchases();
  const [restoring, setRestoring] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [plan, setPlan] = useState('annual');

  if (!open) return null;

  // If the user is already premium, just show success.
  if (isPro) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative card border-gold/30 max-w-sm w-full text-center space-y-4 py-10 px-6 animate-slide-up">
          <div className="text-4xl">✦</div>
          <h3 className="font-serif text-xl text-text-p">You're on Premium</h3>
          <p className="text-text-m text-sm font-sans">Unlimited readings unlocked.</p>
          <button onClick={onClose} className="btn-gold w-full">Continue →</button>
        </div>
      </div>
    );
  }

  // Get packages from RevenueCat offerings
  const monthlyPkg = offerings?.monthly ?? offerings?.availablePackages?.find(p => p.packageType === 'MONTHLY') ?? null;
  const annualPkg  = offerings?.annual  ?? offerings?.availablePackages?.find(p => p.packageType === 'ANNUAL')  ?? null;

  const monthlyPrice = monthlyPkg?.product?.priceString ?? '$8.99';
  const annualPrice  = annualPkg?.product?.priceString  ?? '$53.99';

  const selectedPkg = plan === 'annual' ? annualPkg : monthlyPkg;

  async function handlePurchase() {
    if (!selectedPkg) return;
    const result = await purchase(selectedPkg);
    if (result?.success) {
      setSuccessMsg('Welcome to Premium ✦');
      setTimeout(onClose, 1500);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    if (result?.restored) {
      setSuccessMsg('Purchases restored ✦');
      setTimeout(onClose, 1500);
    } else if (!result?.error) {
      setSuccessMsg('No previous purchase found.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card border-gold/20 max-w-sm w-full space-y-5 py-8 px-6 animate-slide-up">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-m hover:text-text-p transition-colors w-7 h-7 flex items-center justify-center"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl leading-none text-gold">✦</div>
          <h2 className="font-serif text-2xl text-text-p">Astralla Premium</h2>
          <p className="text-text-s text-sm font-sans leading-relaxed">
            You've used all {limit} free readings. Upgrade for unlimited access.
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2 text-sm font-sans text-text-s">
          {[
            'Unlimited city, travel & solar return readings',
            'Unlimited weekly & partner readings',
            'Unlimited Chapter Planner searches',
            'All future features included',
          ].map(f => (
            <li key={f} className="flex items-start gap-2.5">
              <span className="text-gold mt-0.5 shrink-0">✦</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {successMsg ? (
          <p className="text-center text-gold font-serif text-base py-2">{successMsg}</p>
        ) : (
          <>
            {/* Plan selector */}
            {native && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPlan('annual')}
                  className={`relative rounded-xl border px-3 py-3 text-left transition-all ${
                    plan === 'annual'
                      ? 'border-gold/60 bg-gold/10'
                      : 'border-border bg-card/50'
                  }`}
                >
                  <span className="absolute -top-2 left-3 text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-gold text-cosmos leading-none">
                    BEST VALUE
                  </span>
                  <p className="font-sans font-medium text-text-p text-sm mt-1">Yearly</p>
                  <p className="font-sans text-gold text-base font-semibold">{annualPrice}</p>
                  <p className="font-sans text-text-m text-[11px]">per year</p>
                </button>
                <button
                  onClick={() => setPlan('monthly')}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    plan === 'monthly'
                      ? 'border-gold/60 bg-gold/10'
                      : 'border-border bg-card/50'
                  }`}
                >
                  <p className="font-sans font-medium text-text-p text-sm mt-1">Monthly</p>
                  <p className="font-sans text-gold text-base font-semibold">{monthlyPrice}</p>
                  <p className="font-sans text-text-m text-[11px]">per month</p>
                </button>
              </div>
            )}

            {/* Purchase button */}
            {native ? (
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="btn-gold w-full py-3 text-base disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Spinner /> Processing…
                  </span>
                ) : (
                  `Upgrade to Premium`
                )}
              </button>
            ) : (
              <p className="text-text-m text-xs font-sans text-center">
                Upgrade is available in the iOS app.
              </p>
            )}

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            {/* Restore */}
            {native && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="w-full text-xs font-sans text-text-m hover:text-text-s transition-colors py-1"
              >
                {restoring ? 'Restoring…' : 'Restore previous purchase'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
