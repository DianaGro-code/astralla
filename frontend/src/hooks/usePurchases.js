/**
 * usePurchases — RevenueCat integration for Astralla Pro subscriptions.
 *
 * Only active on native (iOS/Android via Capacitor).
 * On web it returns a no-op stub so the rest of the app compiles without changes.
 *
 * Usage:
 *   const { offerings, isPro, purchase, restore, loading, error } = usePurchases();
 *
 * Setup required (one-time, before shipping):
 *   1. Create a RevenueCat account at app.revenuecat.com
 *   2. Add your iOS app (bundle ID: com.astralla.app)
 *   3. Create a product in App Store Connect (e.g. com.astralla.pro.monthly)
 *   4. Create an Entitlement in RevenueCat called "pro"
 *   5. Copy your iOS Public API Key → set VITE_REVENUECAT_KEY in frontend/.env.capacitor
 */

import { useState, useEffect, useCallback } from 'react';
import { useNative } from './useNative.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../lib/api.js';

const RC_KEY = import.meta.env.VITE_REVENUECAT_KEY || '';
const PRO_ENTITLEMENT = 'Astralla Pro';

// Lazily import the native plugin only when on a real device.
let Purchases = null;
async function getPlugin() {
  if (Purchases) return Purchases;
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    Purchases = mod.Purchases;
  } catch {
    Purchases = null;
  }
  return Purchases;
}

export function usePurchases() {
  const native = useNative();
  const { user, refreshUser } = useAuth();

  const [offerings, setOfferings]   = useState(null);
  const [isPro, setIsPro]           = useState(user?.tier === 'pro');
  const [initializing, setInit]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // ── Initialise RevenueCat and sync entitlement on app start ──────────────────
  useEffect(() => {
    if (!native || !RC_KEY || !user) return;

    (async () => {
      setInit(true);
      try {
        const plugin = await getPlugin();
        if (!plugin) return;

        await plugin.configure({
          apiKey: RC_KEY,
          appUserID: String(user.id), // tie RC identity to our user ID
        });

        // Fetch available packages (shown in the paywall)
        const { current } = await plugin.getOfferings();
        setOfferings(current);

        // Check whether this user already has an active entitlement
        const { customerInfo } = await plugin.getCustomerInfo();
        const active = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
        setIsPro(active);

        // If RC says pro but our backend still says free, sync it up
        if (active && user.tier !== 'pro') {
          await api.subscription.upgrade({ rcCustomerId: customerInfo.originalAppUserId });
          await refreshUser();
        }
      } catch (e) {
        console.warn('RevenueCat init error:', e);
      } finally {
        setInit(false);
      }
    })();
  }, [native, RC_KEY, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Purchase a package ────────────────────────────────────────────────────────
  const purchase = useCallback(async (pkg) => {
    setError(null);
    setLoading(true);
    try {
      const plugin = await getPlugin();
      if (!plugin) throw new Error('Purchases plugin not available');

      const { customerInfo } = await plugin.purchasePackage({ aPackage: pkg });
      const active = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];

      if (active) {
        setIsPro(true);
        await api.subscription.upgrade({ rcCustomerId: customerInfo.originalAppUserId });
        await refreshUser();
        return { success: true };
      } else {
        throw new Error('Purchase completed but entitlement not found.');
      }
    } catch (e) {
      // User cancelled — don't surface as an error
      if (e?.code === '1' || e?.message?.includes('cancel')) {
        return { cancelled: true };
      }
      setError(e.message || 'Purchase failed');
      return { error: e.message };
    } finally {
      setLoading(false);
    }
  }, [refreshUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore purchases ─────────────────────────────────────────────────────────
  const restore = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const plugin = await getPlugin();
      if (!plugin) throw new Error('Purchases plugin not available');

      const { customerInfo } = await plugin.restorePurchases();
      const active = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];

      setIsPro(active);
      await api.subscription.restore({ entitlementActive: active });
      await refreshUser();
      return { restored: active };
    } catch (e) {
      setError(e.message || 'Restore failed');
      return { error: e.message };
    } finally {
      setLoading(false);
    }
  }, [refreshUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // On web or if native isn't set up, return safe stubs
  if (!native || !RC_KEY) {
    return {
      offerings: null,
      isPro: user?.tier === 'pro',
      purchase: async () => ({ error: 'Not available on web' }),
      restore:  async () => ({ error: 'Not available on web' }),
      loading: false,
      error: null,
    };
  }

  return { offerings, isPro, purchase, restore, loading, error };
}
