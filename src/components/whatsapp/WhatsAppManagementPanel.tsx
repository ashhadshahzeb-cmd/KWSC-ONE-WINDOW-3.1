import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Send,
  Sliders,
  Users,
  MessageSquare,
  Radio,
  FileText,
  ShieldCheck,
  Zap,
  Building2,
  Layers,
  Search,
  Download,
  PhoneCall,
  Check,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TargetNumberItem {
  id: string;
  name: string;
  number: string; // e.g. "923372106557@c.us"
  display_number: string; // e.g. "0337-2106557"
  designation?: string;
  department?: string;
  role_label?: string;
  enabled: boolean;
}

export interface WhatsAppBotStatus {
  status: 'connected' | 'qr_ready' | 'disconnected' | 'reconnecting';
  qr_code?: string;
  phone_number?: string;
  phone_name?: string;
  last_seen?: string;
  uptime?: number;
}

export interface WhatsAppLogItem {
  id: string;
  type: 'OUTGOING' | 'INCOMING';
  phone_number: string;
  sender_name?: string;
  message: string;
  action_type?: string;
  status: string;
  created_at: string;
}

// Default Fallback Numbers if not seeded in DB
const DEFAULT_TARGET_NUMBERS: TargetNumberItem[] = [
  { id: '1', name: 'CFO Office', number: '923372106557@c.us', display_number: '0337-2106557', designation: 'Chief Finance Officer', department: 'Finance', role_label: 'Primary Notification', enabled: true },
  { id: '2', name: 'Director IT / Operations', number: '923322268783@c.us', display_number: '0332-22268783', designation: 'Director IT', department: 'IT & Operations', role_label: 'Operations & IT', enabled: true },
  { id: '3', name: 'Audit & Accounts Cell', number: '923358197902@c.us', display_number: '0335-8197902', designation: 'Audit Officer', department: 'Audit & Accounts', role_label: 'Audit Oversight', enabled: true },
];

const DEFAULT_SECTIONS = ['cia', 'budget', 'establishment'];
const DEFAULT_CATEGORIES = ['contractor', 'pol_bills', 'employee'];

const ALL_AVAILABLE_SECTIONS = [
  { key: 'cia', label: 'CIA (Internal Audit)' },
  { key: 'budget', label: 'Budget Section' },
  { key: 'establishment', label: 'Establishment' },
  { key: 'director_finance', label: 'Director Finance' },
  { key: 'director_account', label: 'Director Account' },
  { key: 'pension', label: 'Pension' },
  { key: 'fund', label: 'Fund' },
  { key: 'sub_cfo', label: 'Asst. CFO' },
  { key: 'books', label: 'Books Section' },
  { key: 'director_it', label: 'Director IT' },
  { key: 'chro', label: 'CHRO' },
  { key: 'md_office', label: 'MD Office' },
];

const ALL_AVAILABLE_CATEGORIES = [
  { key: 'contractor', label: 'Contractor Bills' },
  { key: 'pol_bills', label: 'POL Bills' },
  { key: 'employee', label: 'Employee Cases' },
  { key: 'impress', label: 'Impress / Contingency' },
  { key: 'others', label: 'Others / General' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WhatsAppManagementPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'status' | 'numbers' | 'filters' | 'logs'>('status');

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Bot Status State
  const [botStatus, setBotStatus] = useState<WhatsAppBotStatus>({
    status: 'connected',
    phone_number: '923372106557',
    phone_name: 'KWSC Bot Service',
    last_seen: new Date().toISOString(),
  });

  // Target Numbers
  const [targetNumbers, setTargetNumbers] = useState<TargetNumberItem[]>(DEFAULT_TARGET_NUMBERS);
  const [numberDialogOpen, setNumberDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<TargetNumberItem | null>(null);
  const [numberForm, setNumberForm] = useState({ name: '', rawNumber: '', designation: '', department: '', role_label: '' });

  // Filter Configuration
  const [allowedSections, setAllowedSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [allowedCategories, setAllowedCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [delayedDays, setDelayedDays] = useState<number>(3);
  const [digestTime, setDigestTime] = useState<string>('17:00');

  // Activity Logs
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [logFilter, setLogFilter] = useState<'ALL' | 'OUTGOING' | 'INCOMING'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Test Message Dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testForm, setTestForm] = useState({ targetNumber: '', message: '🔔 Test notification from KWSC One Window Facility System.' });

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch Config and Setup Realtime
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchWhatsAppConfig();
    fetchLogs();

    // Subscribe to app_config changes
    const configChannel = supabase
      .channel('whatsapp-admin-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, (payload: any) => {
        const row = payload.new;
        if (row && row.config_type === 'whatsapp_setting') {
          handleRealtimeConfigUpdate(row);
        }
      })
      .subscribe();

    // Subscribe to activity_log for live messages
    const logChannel = supabase
      .channel('whatsapp-admin-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload: any) => {
        const a = payload.new;
        if (a.action === 'WHATSAPP_BROADCAST' || a.action === 'WHATSAPP_QUERY' || a.user_role === 'whatsapp_bot') {
          fetchLogs();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(logChannel);
    };
  }, []);

  const handleRealtimeConfigUpdate = (row: any) => {
    try {
      if (row.config_key === 'bot_status') {
        const parsed = typeof row.config_label === 'string' ? JSON.parse(row.config_label) : row.config_label;
        setBotStatus(parsed);
      } else if (row.config_key === 'target_numbers') {
        const parsed = typeof row.config_label === 'string' ? JSON.parse(row.config_label) : row.config_label;
        if (Array.isArray(parsed)) setTargetNumbers(parsed);
      } else if (row.config_key === 'allowed_sections') {
        const parsed = typeof row.config_label === 'string' ? JSON.parse(row.config_label) : row.config_label;
        if (Array.isArray(parsed)) setAllowedSections(parsed);
      } else if (row.config_key === 'allowed_categories') {
        const parsed = typeof row.config_label === 'string' ? JSON.parse(row.config_label) : row.config_label;
        if (Array.isArray(parsed)) setAllowedCategories(parsed);
      }
    } catch (e) {
      console.error('Error parsing realtime config update:', e);
    }
  };

  const fetchWhatsAppConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_config' as any)
        .select('*')
        .eq('config_type', 'whatsapp_setting');

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach((item: any) => {
          try {
            if (item.config_key === 'target_numbers' && item.config_label) {
              setTargetNumbers(JSON.parse(item.config_label));
            } else if (item.config_key === 'allowed_sections' && item.config_label) {
              setAllowedSections(JSON.parse(item.config_label));
            } else if (item.config_key === 'allowed_categories' && item.config_label) {
              setAllowedCategories(JSON.parse(item.config_label));
            } else if (item.config_key === 'delayed_threshold_days' && item.config_label) {
              setDelayedDays(parseInt(item.config_label, 10) || 3);
            } else if (item.config_key === 'bot_status' && item.config_label) {
              setBotStatus(JSON.parse(item.config_label));
            }
          } catch (e) {
            console.error('JSON parse error for key:', item.config_key, e);
          }
        });
      } else {
        // Seed default config into app_config if empty
        seedInitialConfig();
      }
    } catch (err: any) {
      console.warn('Could not fetch whatsapp configs, using defaults:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const seedInitialConfig = async () => {
    try {
      const initialItems = [
        { config_type: 'whatsapp_setting', config_key: 'target_numbers', config_label: JSON.stringify(DEFAULT_TARGET_NUMBERS), is_active: true, sort_order: 1 },
        { config_type: 'whatsapp_setting', config_key: 'allowed_sections', config_label: JSON.stringify(DEFAULT_SECTIONS), is_active: true, sort_order: 2 },
        { config_type: 'whatsapp_setting', config_key: 'allowed_categories', config_label: JSON.stringify(DEFAULT_CATEGORIES), is_active: true, sort_order: 3 },
        { config_type: 'whatsapp_setting', config_key: 'delayed_threshold_days', config_label: '3', is_active: true, sort_order: 4 },
        {
          config_type: 'whatsapp_setting',
          config_key: 'bot_status',
          config_label: JSON.stringify({
            status: 'connected',
            phone_number: '923372106557',
            phone_name: 'KWSC Bot Service',
            last_seen: new Date().toISOString()
          }),
          is_active: true,
          sort_order: 5
        }
      ];

      for (const item of initialItems) {
        await supabase.from('app_config' as any).upsert(item, { onConflict: 'config_type,config_key' });
      }
    } catch (e) {
      console.warn('Seeding default whatsapp config:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log' as any)
        .select('*')
        .or('action.eq.WHATSAPP_BROADCAST,action.eq.WHATSAPP_QUERY,user_role.eq.whatsapp_bot,user_role.eq.whatsapp_user')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const mappedLogs: WhatsAppLogItem[] = data.map((a: any) => ({
          id: a.id,
          type: a.action === 'WHATSAPP_QUERY' || a.user_role === 'whatsapp_user' ? 'INCOMING' : 'OUTGOING',
          phone_number: a.details?.recipient || a.user_name || 'Configured Target',
          sender_name: a.user_name || 'KWSC System',
          message: a.details?.message || a.details?.incoming_text || a.subject || 'Automated Alert',
          action_type: a.action || 'NOTIFICATION',
          status: a.details?.status || 'DELIVERED',
          created_at: a.created_at,
        }));
        setLogs(mappedLogs);
      }
    } catch (err: any) {
      console.warn('Fetch logs warning:', err.message);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: Format Phone Numbers
  // ───────────────────────────────────────────────────────────────────────────
  const formatPhoneNumber = (raw: string): { jid: string; display: string } => {
    let clean = raw.replace(/\D/g, ''); // strip non-digits
    if (clean.startsWith('03')) {
      clean = '92' + clean.substring(1);
    } else if (clean.startsWith('3') && clean.length === 10) {
      clean = '92' + clean;
    }
    const jid = `${clean}@c.us`;
    const display = clean.startsWith('92') 
      ? `0${clean.substring(2, 5)}-${clean.substring(5)}`
      : clean;
    return { jid, display };
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Number Management Handlers
  // ───────────────────────────────────────────────────────────────────────────
  const handleOpenAddNumber = () => {
    setEditingNumber(null);
    setNumberForm({ name: '', rawNumber: '', designation: '', department: '', role_label: '' });
    setNumberDialogOpen(true);
  };

  const handleOpenEditNumber = (item: TargetNumberItem) => {
    setEditingNumber(item);
    setNumberForm({ name: item.name, rawNumber: item.display_number, designation: item.designation || '', department: item.department || '', role_label: item.role_label || '' });
    setNumberDialogOpen(true);
  };

  const handleSaveNumber = async () => {
    if (!numberForm.name.trim() || !numberForm.rawNumber.trim()) {
      toast.error('Name aur Phone Number likhna zaroori hai!');
      return;
    }

    const { jid, display } = formatPhoneNumber(numberForm.rawNumber);
    if (!jid.startsWith('92') || jid.length < 15) {
      toast.error('Valid Pakistani WhatsApp Number darj karein (e.g. 03001234567)');
      return;
    }

    setIsSaving(true);
    try {
      let updated: TargetNumberItem[] = [];
      if (editingNumber) {
        updated = targetNumbers.map(n => 
          n.id === editingNumber.id 
            ? { ...n, name: numberForm.name.trim(), number: jid, display_number: display, designation: numberForm.designation.trim(), department: numberForm.department.trim(), role_label: numberForm.role_label.trim() }
            : n
        );
      } else {
        const newItem: TargetNumberItem = {
          id: Date.now().toString(),
          name: numberForm.name.trim(),
          number: jid,
          display_number: display,
          designation: numberForm.designation.trim(),
          department: numberForm.department.trim(),
          role_label: numberForm.role_label.trim() || 'Officer',
          enabled: true,
        };
        updated = [...targetNumbers, newItem];
      }

      await saveConfigToSupabase('target_numbers', JSON.stringify(updated));
      setTargetNumbers(updated);
      setNumberDialogOpen(false);
      toast.success(editingNumber ? 'Number update ho gaya!' : 'Naya WhatsApp number add ho gaya!');
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNumber = async (id: string, currentStatus: boolean) => {
    const updated = targetNumbers.map(n => n.id === id ? { ...n, enabled: !currentStatus } : n);
    setTargetNumbers(updated);
    await saveConfigToSupabase('target_numbers', JSON.stringify(updated));
    toast.success(!currentStatus ? 'Notification number enabled' : 'Notification number disabled');
  };

  const handleDeleteNumber = async (id: string) => {
    const updated = targetNumbers.filter(n => n.id !== id);
    setTargetNumbers(updated);
    await saveConfigToSupabase('target_numbers', JSON.stringify(updated));
    toast.success('Number deleted successfully');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Filter Management Handlers
  // ───────────────────────────────────────────────────────────────────────────
  const toggleSection = (secKey: string) => {
    setAllowedSections(prev => 
      prev.includes(secKey) ? prev.filter(k => k !== secKey) : [...prev, secKey]
    );
  };

  const toggleCategory = (catKey: string) => {
    setAllowedCategories(prev => 
      prev.includes(catKey) ? prev.filter(k => k !== catKey) : [...prev, catKey]
    );
  };

  const handleSaveFilters = async () => {
    if (allowedSections.length === 0) {
      toast.error('Kam az kam 1 Section select karein!');
      return;
    }
    if (allowedCategories.length === 0) {
      toast.error('Kam az kam 1 Category select karein!');
      return;
    }

    setIsSaving(true);
    try {
      await saveConfigToSupabase('allowed_sections', JSON.stringify(allowedSections));
      await saveConfigToSupabase('allowed_categories', JSON.stringify(allowedCategories));
      await saveConfigToSupabase('delayed_threshold_days', delayedDays.toString());
      toast.success('WhatsApp alert filters successfully save aur sync ho gaye! 🎯');
    } catch (err: any) {
      toast.error('Filters save failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Generic DB Config Saver
  // ───────────────────────────────────────────────────────────────────────────
  const saveConfigToSupabase = async (key: string, valueStr: string) => {
    const { data: existing } = await supabase
      .from('app_config' as any)
      .select('id')
      .eq('config_type', 'whatsapp_setting')
      .eq('config_key', key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('app_config' as any)
        .update({ config_label: valueStr })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('app_config' as any)
        .insert({
          config_type: 'whatsapp_setting',
          config_key: key,
          config_label: valueStr,
          is_active: true,
          sort_order: 0,
        });
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Send Test Notification Trigger
  // ───────────────────────────────────────────────────────────────────────────
  const handleSendTestMessage = async () => {
    if (!testForm.targetNumber && targetNumbers.filter(n => n.enabled).length === 0) {
      toast.error('Target WhatsApp number select karein!');
      return;
    }

    setIsSendingTest(true);
    try {
      const commandPayload = {
        type: 'SEND_TEST',
        targetNumber: testForm.targetNumber || targetNumbers.find(n => n.enabled)?.number,
        message: testForm.message,
        requested_by: user?.email || 'Admin',
        timestamp: new Date().toISOString(),
      };

      await saveConfigToSupabase('bot_command', JSON.stringify(commandPayload));
      toast.success('Test message command dispatch ho gaya! Bot foran deliver karega.');
      setTestDialogOpen(false);
    } catch (err: any) {
      toast.error('Test message failed: ' + err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Filtered Logs
  // ───────────────────────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(l => {
    const matchesFilter = logFilter === 'ALL' || l.type === logFilter;
    const matchesSearch = !logSearch || 
      l.message.toLowerCase().includes(logSearch.toLowerCase()) || 
      l.phone_number.toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.sender_name && l.sender_name.toLowerCase().includes(logSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const exportLogsCsv = () => {
    if (logs.length === 0) {
      toast.error('Koi logs export karne ke liye nahi hain');
      return;
    }
    const headers = 'Type,Phone Number,Sender Name,Message,Created At\n';
    const rows = logs.map(l => 
      `"${l.type}","${l.phone_number}","${l.sender_name || ''}","${l.message.replace(/"/g, '""')}","${l.created_at}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Logs CSV downloaded successfully');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ── */}
      <Card className="bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-950 border-emerald-500/20 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-inner relative">
                <Smartphone className="w-7 h-7 text-emerald-400" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${botStatus.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${botStatus.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white tracking-tight">KWSC WhatsApp Bot Control Panel</h2>
                  {botStatus.status === 'connected' ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active & Connected
                    </Badge>
                  ) : botStatus.status === 'qr_ready' ? (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Scan QR Code Required
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      Bot Offline
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-white/50 mt-1">
                  Automated notifications, interactive tracking assistant, target broadcasts & live audit logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end lg:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { fetchWhatsAppConfig(); fetchLogs(); toast.success('Status refreshed'); }}
                className="bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setTestDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Send Test Alert
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sub Navigation Tabs ── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-white/10 rounded-xl p-1 gap-1.5 backdrop-blur-md">
          <TabsTrigger
            value="status"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg font-semibold text-xs tracking-wider px-4 py-2 transition-all"
          >
            <Radio className="w-3.5 h-3.5 mr-2 text-emerald-300" />
            Live Status & QR
          </TabsTrigger>
          <TabsTrigger
            value="numbers"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg font-semibold text-xs tracking-wider px-4 py-2 transition-all"
          >
            <Users className="w-3.5 h-3.5 mr-2 text-emerald-300" />
            Target Numbers ({targetNumbers.filter(n => n.enabled).length})
          </TabsTrigger>
          <TabsTrigger
            value="filters"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg font-semibold text-xs tracking-wider px-4 py-2 transition-all"
          >
            <Sliders className="w-3.5 h-3.5 mr-2 text-emerald-300" />
            Alert Filters (CIA/Budget/Est.)
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg font-semibold text-xs tracking-wider px-4 py-2 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-2 text-emerald-300" />
            Message & Query Logs
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: LIVE STATUS & QR SCANNER                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Connection Card */}
            <Card className="md:col-span-2 bg-slate-900/60 border-white/10 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Bot Authentication & Connection Details
                </CardTitle>
                <CardDescription className="text-xs text-white/50">
                  Headless WhatsApp session status running via Puppeteer LocalAuth.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Connected Account</span>
                    <p className="text-base font-bold text-white flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      {botStatus.phone_number ? `+${botStatus.phone_number}` : '+92 337 2106557'}
                    </p>
                    <p className="text-xs text-emerald-400/80 font-medium">{botStatus.phone_name || 'KWSC One Window Bot'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Target Broadcast List</span>
                    <p className="text-base font-bold text-white">
                      {targetNumbers.filter(n => n.enabled).length} Active Numbers
                    </p>
                    <p className="text-xs text-white/40">
                      Total configured: {targetNumbers.length}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Scheduled Daily Digest</span>
                    <p className="text-base font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      5:00 PM (PKT) Every Day
                    </p>
                    <p className="text-xs text-white/40">Auto metrics & section backlog broadcast</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Realtime Event Listeners</span>
                    <p className="text-base font-bold text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Active (Subscribed)
                    </p>
                    <p className="text-xs text-white/40">file_tracking_records & activity_log</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-white/80 space-y-1">
                    <p className="font-semibold text-emerald-300">WhatsApp Bot is operational.</p>
                    <p className="text-white/60">
                      Session data is safely cached in <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200">.wwebjs_auth/</code>. 
                      Incoming commands like <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200">STATUS</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200">EMP</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200">SEARCH</code>, aur <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-200">SUMMARY</code> live respond kar rahe hain.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live QR Code Box */}
            <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md rounded-2xl flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Device Link QR Code</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-300">
                    {botStatus.status === 'qr_ready' ? 'Scan Needed' : 'Session Saved'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-white/50">
                  Scan with WhatsApp &gt; Linked Devices
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                {botStatus.status === 'qr_ready' && botStatus.qr_code ? (
                  <div className="p-3 bg-white rounded-2xl shadow-xl border border-white/20 mb-3">
                    <QRCodeSVG value={botStatus.qr_code} size={180} level="M" />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-2xl bg-emerald-500/5 border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center p-4 mb-3 text-emerald-400">
                    <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Device Linked</span>
                    <span className="text-[10px] text-white/40 mt-1">No QR scan required</span>
                  </div>
                )}
                <p className="text-[11px] text-white/40">
                  Session permanent hai. Dobara link karne ke liye service restart karein.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: TARGET NUMBERS MANAGEMENT                                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <TabsContent value="numbers" className="space-y-4">
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Broadcast Target WhatsApp Numbers
                </CardTitle>
                <CardDescription className="text-xs text-white/50">
                  In numbers ko automated new file alerts, daily evening digest aur forward notifications bhejti hain.
                </CardDescription>
              </div>
              <Button
                onClick={handleOpenAddNumber}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Number
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs text-white/50 font-bold uppercase">Name / Office</TableHead>
                    <TableHead className="text-xs text-white/50 font-bold uppercase">WhatsApp Number</TableHead>
                    <TableHead className="text-xs text-white/50 font-bold uppercase">Designation</TableHead>
                    <TableHead className="text-xs text-white/50 font-bold uppercase">Department</TableHead>
                    <TableHead className="text-xs text-white/50 font-bold uppercase text-center">Broadcast Status</TableHead>
                    <TableHead className="text-xs text-white/50 font-bold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targetNumbers.map((item, idx) => (
                    <TableRow key={item.id || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-bold text-white text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                            {idx + 1}
                          </div>
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-emerald-300">
                        {item.display_number || item.number.replace('@c.us', '')}
                      </TableCell>
                      <TableCell className="text-xs text-white/70">
                        {item.designation || <span className="text-white/30 italic">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-white/60">
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-white/70 text-[11px]">
                          {item.department || item.role_label || 'Officer'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={item.enabled}
                            onCheckedChange={() => handleToggleNumber(item.id, item.enabled)}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={`text-[11px] font-medium ${item.enabled ? 'text-emerald-400' : 'text-white/30'}`}>
                            {item.enabled ? 'Enabled' : 'Muted'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditNumber(item)}
                            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNumber(item.id)}
                            className="h-8 w-8 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: SMART ALERT FILTERS (CIA, BUDGET, ESTABLISHMENT)              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <TabsContent value="filters" className="space-y-4">
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    Automated Alert Trigger Filters
                  </CardTitle>
                  <CardDescription className="text-xs text-white/50">
                    Sirf wahi files WhatsApp par alert trigger karengi jo in selected sections aur categories dono se match hongi.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveFilters}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Save & Apply Filters
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Section Filter Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    1. Allowed Sections (mark_to)
                  </Label>
                  <span className="text-[11px] text-emerald-400 font-semibold">{allowedSections.length} selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ALL_AVAILABLE_SECTIONS.map(sec => {
                    const isSelected = allowedSections.includes(sec.key);
                    return (
                      <div
                        key={sec.key}
                        onClick={() => toggleSection(sec.key)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                        }`}
                      >
                        <span className="text-xs font-semibold">{sec.label}</span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-white' : 'border border-white/20'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    2. Allowed Main Categories
                  </Label>
                  <span className="text-[11px] text-emerald-400 font-semibold">{allowedCategories.length} selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALL_AVAILABLE_CATEGORIES.map(cat => {
                    const isSelected = allowedCategories.includes(cat.key);
                    return (
                      <div
                        key={cat.key}
                        onClick={() => toggleCategory(cat.key)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                        }`}
                      >
                        <span className="text-xs font-semibold">{cat.label}</span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-emerald-500 text-white' : 'border border-white/20'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Threshold Setting */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Delayed Files Threshold (Days)</h4>
                  <p className="text-xs text-white/50">Kitne din baad file ko WhatsApp summary & PENDING query mein delayed alert consider karein.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={delayedDays}
                    onChange={(e) => setDelayedDays(parseInt(e.target.value, 10) || 3)}
                    className="w-20 bg-black/40 border-white/20 text-white font-bold text-center text-sm"
                  />
                  <span className="text-xs text-white/60 font-medium">Days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TAB 4: MESSAGE & QUERY ACTIVITY LOGS                                */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-slate-900/60 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                    Live WhatsApp Event & Query History
                  </CardTitle>
                  <CardDescription className="text-xs text-white/50">
                    Realtime record of sent broadcasts, daily digests, and officer incoming queries.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative flex-1 md:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <Input
                      placeholder="Search logs..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 text-white text-xs h-9"
                    />
                  </div>

                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogFilter('ALL')}
                      className={`h-8 px-2.5 text-xs rounded-md ${logFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'text-white/60'}`}
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogFilter('OUTGOING')}
                      className={`h-8 px-2.5 text-xs rounded-md ${logFilter === 'OUTGOING' ? 'bg-emerald-600 text-white' : 'text-white/60'}`}
                    >
                      Broadcasts
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogFilter('INCOMING')}
                      className={`h-8 px-2.5 text-xs rounded-md ${logFilter === 'INCOMING' ? 'bg-emerald-600 text-white' : 'text-white/60'}`}
                    >
                      Queries
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogsCsv}
                    className="bg-white/5 border-white/10 text-white/80 hover:text-white h-8 text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs text-white/50 font-bold uppercase w-32">Type</TableHead>
                      <TableHead className="text-xs text-white/50 font-bold uppercase">Recipient / User</TableHead>
                      <TableHead className="text-xs text-white/50 font-bold uppercase">Message Preview</TableHead>
                      <TableHead className="text-xs text-white/50 font-bold uppercase w-36">Time</TableHead>
                      <TableHead className="text-xs text-white/50 font-bold uppercase text-right w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-white/40 text-xs">
                          Koi activity log nahi mila.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(l => (
                        <TableRow key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell>
                            {l.type === 'OUTGOING' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                                📤 Broadcast
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-[10px] font-semibold">
                                📥 Query
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-white text-xs">
                            <div>{l.sender_name || 'KWSC System'}</div>
                            <div className="font-mono text-[10px] text-white/40">{l.phone_number}</div>
                          </TableCell>
                          <TableCell className="text-xs text-white/80 font-mono max-w-md truncate">
                            {l.message}
                          </TableCell>
                          <TableCell className="text-[11px] text-white/50">
                            {new Date(l.created_at).toLocaleString('en-PK', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                              Delivered
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Add / Edit Number ── */}
      <Dialog open={numberDialogOpen} onOpenChange={setNumberDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingNumber ? 'Edit WhatsApp Target Number' : 'Add New Target Number'}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Pakistani phone number e.g. 03001234567 format mein likhein.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/70">Officer / Office Name <span className="text-rose-400">*</span></Label>
              <Input
                placeholder="e.g. CFO Office ya Director IT"
                value={numberForm.name}
                onChange={(e) => setNumberForm({ ...numberForm, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/70">WhatsApp Number <span className="text-rose-400">*</span></Label>
              <Input
                placeholder="03001234567 ya 923001234567"
                value={numberForm.rawNumber}
                onChange={(e) => setNumberForm({ ...numberForm, rawNumber: e.target.value })}
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white/70">Designation</Label>
                <Input
                  placeholder="e.g. Director IT, CFO"
                  value={numberForm.designation}
                  onChange={(e) => setNumberForm({ ...numberForm, designation: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-white/70">Department</Label>
                <Input
                  placeholder="e.g. Finance, IT, Audit"
                  value={numberForm.department}
                  onChange={(e) => setNumberForm({ ...numberForm, department: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/70">Role / Tag (Optional)</Label>
              <Input
                placeholder="e.g. Finance Incharge, Audit Cell"
                value={numberForm.role_label}
                onChange={(e) => setNumberForm({ ...numberForm, role_label: e.target.value })}
                className="bg-white/5 border-white/10 text-white text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setNumberDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white/70 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNumber}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Send Test Message ── */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Send Live Test Message
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Bot se live WhatsApp alert bhej kar connection verify karein.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/70">Select Target Number</Label>
              <select
                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                value={testForm.targetNumber}
                onChange={(e) => setTestForm({ ...testForm, targetNumber: e.target.value })}
              >
                <option value="">Sab Active Target Numbers ko bhejo</option>
                {targetNumbers.map(n => (
                  <option key={n.id} value={n.number}>{n.name} ({n.display_number})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/70">Test Message Content</Label>
              <textarea
                rows={3}
                value={testForm.message}
                onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white/70 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTestMessage}
              disabled={isSendingTest}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSendingTest ? 'Sending...' : 'Send Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
