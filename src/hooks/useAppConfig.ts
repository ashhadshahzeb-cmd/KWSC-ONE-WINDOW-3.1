import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db';

export interface AppConfigItem {
  id: string;
  config_type: 'main_category' | 'sub_category' | 'section' | 'system_setting' | 'contractor_account';
  config_key: string;
  config_label: string;
  parent_key: string | null;
  sort_order: number;
  is_active: boolean;
}

interface AppConfigState {
  mainCategories: AppConfigItem[];
  subCategories: AppConfigItem[];
  sections: AppConfigItem[];
  contractorAccounts: AppConfigItem[];
  isMaintenanceMode: boolean;
  isGlobal2FAEnabled: boolean;
  isFileEditPasswordEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// In-memory cache so every component doesn't re-fetch
let cachedConfig: { mainCategories: AppConfigItem[]; subCategories: AppConfigItem[]; sections: AppConfigItem[]; contractorAccounts: AppConfigItem[]; isMaintenanceMode: boolean; isGlobal2FAEnabled: boolean; isFileEditPasswordEnabled: boolean } | null = null;
let cachePromise: Promise<void> | null = null;

export function useAppConfig(): AppConfigState {
  const [mainCategories, setMainCategories] = useState<AppConfigItem[]>([]);
  const [subCategories, setSubCategories]   = useState<AppConfigItem[]>([]);
  const [sections, setSections]             = useState<AppConfigItem[]>([]);
  const [contractorAccounts, setContractorAccounts] = useState<AppConfigItem[]>([]);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isGlobal2FAEnabled, setIsGlobal2FAEnabled] = useState(true);
  const [isFileEditPasswordEnabled, setIsFileEditPasswordEnabled] = useState(true);
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  const fetchConfig = useCallback(async (bustCache = false) => {
    if (bustCache) {
      cachedConfig = null;
      // Clear IndexedDB configs on force refresh
      await db.configs.clear();
    }

    // ── STEP 1: Load instantly from IndexedDB (works offline) ──
    const localConfigs = await db.configs.toArray();
    if (localConfigs.length > 0) {
      const mc = localConfigs.filter(r => r.config_type === 'main_category') as AppConfigItem[];
      const sc = localConfigs.filter(r => r.config_type === 'sub_category') as AppConfigItem[];
      const se = localConfigs.filter(r => r.config_type === 'section') as AppConfigItem[];
      const ca = localConfigs.filter(r => r.config_type === 'contractor_account') as AppConfigItem[];
      const sys = localConfigs.filter(r => r.config_type === 'system_setting') as AppConfigItem[];
      
      const isManualForce = sys.find(s => s.config_key === 'maintenance_mode')?.config_label === 'true';
      const overrideDateStr = sys.find(s => s.config_key === 'maintenance_override_date')?.config_label;
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      const isAuto = currentHour >= 17;
      const maint = isManualForce || (isAuto && overrideDateStr !== todayStr);
      
      const is2FA = sys.find(s => s.config_key === 'global_2fa_enabled')?.config_label !== 'false';
      const isFileEditPass = sys.find(s => s.config_key === 'file_edit_password_enabled')?.config_label !== 'false';

      setMainCategories(mc);
      setSubCategories(sc);
      setSections(se);
      setContractorAccounts(ca);
      setIsMaintenanceMode(maint);
      setIsGlobal2FAEnabled(is2FA);
      setIsFileEditPasswordEnabled(isFileEditPass);
      setIsLoading(false);
      setError(null);
      // Still try to refresh from Supabase in background (don't await)
      refreshFromSupabase();
      return;
    }

    // ── STEP 2: Nothing in local DB, try in-memory cache ──
    if (cachedConfig && !bustCache) {
      setMainCategories(cachedConfig.mainCategories);
      setSubCategories(cachedConfig.subCategories);
      setSections(cachedConfig.sections);
      setContractorAccounts(cachedConfig.contractorAccounts);
      setIsMaintenanceMode(cachedConfig.isMaintenanceMode);
      setIsGlobal2FAEnabled(cachedConfig.isGlobal2FAEnabled);
      setIsFileEditPasswordEnabled(cachedConfig.isFileEditPasswordEnabled);
      setIsLoading(false);
      return;
    }

    if (cachePromise && !bustCache) {
      await cachePromise;
      if (cachedConfig) {
        setMainCategories(cachedConfig.mainCategories);
        setSubCategories(cachedConfig.subCategories);
        setSections(cachedConfig.sections);
        setContractorAccounts(cachedConfig.contractorAccounts);
        setIsMaintenanceMode(cachedConfig.isMaintenanceMode);
        setIsLoading(false);
      }
      return;
    }

    // ── STEP 3: Fetch from Supabase (first time or bust cache) ──
    setIsLoading(true);
    cachePromise = (async () => {
      try {
        const { data, error: dbErr } = await supabase
          .from('app_config' as any)
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (dbErr) throw dbErr;

        const all = (data || []) as AppConfigItem[];
        await saveConfigsToIndexedDB(all);

        const mc = all.filter(r => r.config_type === 'main_category');
        const sc = all.filter(r => r.config_type === 'sub_category');
        const se = all.filter(r => r.config_type === 'section');
        const ca = all.filter(r => r.config_type === 'contractor_account');
        const sys = all.filter(r => r.config_type === 'system_setting');
        
      const isManualForce = sys.find(s => s.config_key === 'maintenance_mode')?.config_label === 'true';
      const overrideDateStr = sys.find(s => s.config_key === 'maintenance_override_date')?.config_label;
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      const isAuto = currentHour >= 17;
      const maint = isManualForce || (isAuto && overrideDateStr !== todayStr);

      const is2FA = sys.find(s => s.config_key === 'global_2fa_enabled')?.config_label !== 'false';
      const isFileEditPass = sys.find(s => s.config_key === 'file_edit_password_enabled')?.config_label !== 'false';

      cachedConfig = { mainCategories: mc, subCategories: sc, sections: se, contractorAccounts: ca, isMaintenanceMode: maint, isGlobal2FAEnabled: is2FA, isFileEditPasswordEnabled: isFileEditPass };
      setMainCategories(mc);
      setSubCategories(sc);
      setSections(se);
      setContractorAccounts(ca);
      setIsMaintenanceMode(maint);
      setIsGlobal2FAEnabled(is2FA);
      setIsFileEditPasswordEnabled(isFileEditPass);
        setError(null);
      } catch (err: any) {
        console.error('useAppConfig error:', err);
        setError(err.message || 'Failed to load config');
        // Fallback to hardcoded defaults so app doesn't break
        setMainCategories(FALLBACK_MAIN_CATEGORIES);
        setSubCategories(FALLBACK_SUB_CATEGORIES);
        setSections(FALLBACK_SECTIONS);
        setContractorAccounts([]);
        setIsMaintenanceMode(false);
        setIsGlobal2FAEnabled(true);
        setIsFileEditPasswordEnabled(true);
      } finally {
        setIsLoading(false);
        cachePromise = null;
      }
    })();

    await cachePromise;
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    const int = setInterval(() => {
      // Re-fetch quietly every minute to catch 5 PM transitions
      refreshFromSupabase().then(() => fetchConfig(false));
    }, 60000);
    return () => clearInterval(int);
  }, [fetchConfig]);

  const refetch = useCallback(() => {
    fetchConfig(true);
  }, [fetchConfig]);

  return { mainCategories, subCategories, sections, contractorAccounts, isMaintenanceMode, isGlobal2FAEnabled, isFileEditPasswordEnabled, isLoading, error, refetch };
}

// Background refresh from Supabase without blocking the UI
async function refreshFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('app_config' as any)
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) return;
    await saveConfigsToIndexedDB(data as AppConfigItem[]);
    const mc = (data as AppConfigItem[]).filter(r => r.config_type === 'main_category');
    const sc = (data as AppConfigItem[]).filter(r => r.config_type === 'sub_category');
    const se = (data as AppConfigItem[]).filter(r => r.config_type === 'section');
    const ca = (data as AppConfigItem[]).filter(r => r.config_type === 'contractor_account');
    const sys = (data as AppConfigItem[]).filter(r => r.config_type === 'system_setting');
    
      const isManualForce = sys.find(s => s.config_key === 'maintenance_mode')?.config_label === 'true';
      const overrideDateStr = sys.find(s => s.config_key === 'maintenance_override_date')?.config_label;
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      const isAuto = currentHour >= 17;
      const maint = isManualForce || (isAuto && overrideDateStr !== todayStr);

      const is2FA = sys.find(s => s.config_key === 'global_2fa_enabled')?.config_label !== 'false';
      const isFileEditPass = sys.find(s => s.config_key === 'file_edit_password_enabled')?.config_label !== 'false';
    
    cachedConfig = { mainCategories: mc, subCategories: sc, sections: se, contractorAccounts: ca, isMaintenanceMode: maint, isGlobal2FAEnabled: is2FA, isFileEditPasswordEnabled: isFileEditPass };
  } catch (_) {
    // Silent: offline refresh failed, that's okay
  }
}

// Save configs to IndexedDB (upsert all)
async function saveConfigsToIndexedDB(items: AppConfigItem[]) {
  await db.configs.clear();
  await db.configs.bulkAdd(items as any);
}


/**
 * Helper: given a main_category key, returns the sub-categories for it
 */
export function getSubCategoriesFor(subCategories: AppConfigItem[], mainKey: string): AppConfigItem[] {
  return subCategories.filter(s => s.parent_key === mainKey);
}

/**
 * Helper: convert sections array to the { id, name } format used in FileTracking
 */
export function sectionsToLegacy(sections: AppConfigItem[]): { id: string; name: string }[] {
  return sections.map(s => ({ id: s.config_key, name: s.config_label.toUpperCase() }));
}

/**
 * Helper: convert main categories to the categoryOptions Record used in FileTracking
 */
export function toCategoryOptions(
  mainCategories: AppConfigItem[],
  subCategories: AppConfigItem[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const mc of mainCategories) {
    result[mc.config_key] = getSubCategoriesFor(subCategories, mc.config_key).map(sc => sc.config_label);
  }
  return result;
}

// =============================================
// FALLBACK DATA (used if Supabase is unreachable)
// =============================================
const FALLBACK_MAIN_CATEGORIES: AppConfigItem[] = [
  { id: '1', config_type: 'main_category', config_key: 'employee',   config_label: 'Employee',   parent_key: null, sort_order: 1, is_active: true },
  { id: '2', config_type: 'main_category', config_key: 'contractor', config_label: 'Contractor', parent_key: null, sort_order: 2, is_active: true },
  { id: '3', config_type: 'main_category', config_key: 'others',     config_label: 'Others',     parent_key: null, sort_order: 3, is_active: true },
  { id: '4', config_type: 'main_category', config_key: 'pol_bills',  config_label: 'POL Bills',  parent_key: null, sort_order: 4, is_active: true },
  { id: '5', config_type: 'main_category', config_key: 'impress',    config_label: 'Impress',    parent_key: null, sort_order: 5, is_active: true },
];

const FALLBACK_SUB_CATEGORIES: AppConfigItem[] = [
  { id: '10', config_type: 'sub_category', config_key: 'medical',          config_label: 'Medical',                parent_key: 'employee', sort_order: 1, is_active: true },
  { id: '11', config_type: 'sub_category', config_key: 'pension',          config_label: 'Pension',                parent_key: 'employee', sort_order: 2, is_active: true },
  { id: '12', config_type: 'sub_category', config_key: 'salary-arrears',   config_label: 'Salary / Arrears',       parent_key: 'employee', sort_order: 3, is_active: true },
  { id: '13', config_type: 'sub_category', config_key: 'loans-advances',   config_label: 'Loans / Advances',       parent_key: 'employee', sort_order: 4, is_active: true },
  { id: '14', config_type: 'sub_category', config_key: 'daily-wages',      config_label: 'Daily Wages',            parent_key: 'employee', sort_order: 5, is_active: true },
  { id: '15', config_type: 'sub_category', config_key: 'funds',            config_label: 'Funds',                  parent_key: 'employee', sort_order: 6, is_active: true },
  { id: '16', config_type: 'sub_category', config_key: 'emp-others',       config_label: 'Others',                 parent_key: 'employee', sort_order: 7, is_active: true },
  { id: '20', config_type: 'sub_category', config_key: 'security-deposit', config_label: 'Security Deposit',       parent_key: 'contractor', sort_order: 1, is_active: true },
  { id: '21', config_type: 'sub_category', config_key: 'contingencies',    config_label: 'Contingencies',          parent_key: 'contractor', sort_order: 2, is_active: true },
  { id: '22', config_type: 'sub_category', config_key: 'contractor-bills', config_label: 'Contractor Bills',       parent_key: 'contractor', sort_order: 3, is_active: true },
  { id: '30', config_type: 'sub_category', config_key: 'legal',            config_label: 'Legal',                  parent_key: 'others',  sort_order: 1, is_active: true },
  { id: '31', config_type: 'sub_category', config_key: 'general-misc',     config_label: 'General / Miscellaneous',parent_key: 'others',  sort_order: 2, is_active: true },
];

const FALLBACK_SECTIONS: AppConfigItem[] = [
  { id: 's1',  config_type: 'section', config_key: 'cfo',              config_label: 'CFO',              parent_key: null, sort_order: 1,  is_active: true },
  { id: 's2',  config_type: 'section', config_key: 'cia',              config_label: 'CIA',              parent_key: null, sort_order: 2,  is_active: true },
  { id: 's3',  config_type: 'section', config_key: 'budget',           config_label: 'Budget',           parent_key: null, sort_order: 3,  is_active: true },
  { id: 's4',  config_type: 'section', config_key: 'pension',          config_label: 'Pension',          parent_key: null, sort_order: 4,  is_active: true },
  { id: 's5',  config_type: 'section', config_key: 'fund',             config_label: 'Fund',             parent_key: null, sort_order: 5,  is_active: true },
  { id: 's6',  config_type: 'section', config_key: 'internal_audit_1', config_label: 'Internal Audit-1', parent_key: null, sort_order: 6,  is_active: true },
  { id: 's7',  config_type: 'section', config_key: 'director_account', config_label: 'Director Account', parent_key: null, sort_order: 7,  is_active: true },
  { id: 's8',  config_type: 'section', config_key: 'director_finance', config_label: 'Director Finance', parent_key: null, sort_order: 8,  is_active: true },
  { id: 's9',  config_type: 'section', config_key: 'director_it',      config_label: 'Director IT',      parent_key: null, sort_order: 9,  is_active: true },
  { id: 's10', config_type: 'section', config_key: 'sub_cfo',          config_label: 'Asst. CFO',        parent_key: null, sort_order: 10, is_active: true },
  { id: 's11', config_type: 'section', config_key: 'books',            config_label: 'Books',            parent_key: null, sort_order: 11, is_active: true },
  { id: 's12', config_type: 'section', config_key: 'establishment',    config_label: 'Establishment',    parent_key: null, sort_order: 12, is_active: true },
  { id: 's13', config_type: 'section', config_key: 'director_audit',   config_label: 'Director Audit',   parent_key: null, sort_order: 13, is_active: true },
  { id: 's14', config_type: 'section', config_key: 'internal_audit_2', config_label: 'Internal Audit-2', parent_key: null, sort_order: 14, is_active: true },
  { id: 's15', config_type: 'section', config_key: 'law_department',   config_label: 'Law Department',   parent_key: null, sort_order: 15, is_active: true },
  { id: 's16', config_type: 'section', config_key: 'chro',             config_label: 'CHRO',             parent_key: null, sort_order: 16, is_active: true },
  { id: 's17', config_type: 'section', config_key: 'md_office',        config_label: 'MD Office',        parent_key: null, sort_order: 17, is_active: true },
];
