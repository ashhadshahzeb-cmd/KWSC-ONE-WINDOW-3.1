import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Settings2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FolderTree,
  FolderOpen,
  Building2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  GripVertical,
  ShieldAlert,
  Eye,
  EyeOff,
  Fuel,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppConfigItem, useAppConfig } from '@/hooks/useAppConfig';
import PolBillsSettings from './book-section/PolBillsSettings';
import WhatsAppManagementPanel from '@/components/whatsapp/WhatsAppManagementPanel';
import { Smartphone } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConfigType = 'main_category' | 'sub_category' | 'section';

interface FormState {
  config_key: string;
  config_label: string;
  parent_key: string;
  sort_order: string;
}

const EMPTY_FORM: FormState = { config_key: '', config_label: '', parent_key: '', sort_order: '0' };

// ─────────────────────────────────────────────────────────────────────────────
// Admin Config Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminConfig() {
  const { userRole, isAdmin } = useAuth();
  const isAdminUser = userRole === 'admin' || isAdmin;

  // Auth gate
  const [authPassed, setAuthPassed] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPass, setShowAuthPass] = useState(false);

  const { mainCategories, subCategories, sections, isMaintenanceMode, isLoading, refetch } = useAppConfig();
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

  // Local state (mirrored from hook so we can do optimistic updates)
  const [localMain, setLocalMain] = useState<AppConfigItem[]>([]);
  const [localSub, setLocalSub]   = useState<AppConfigItem[]>([]);
  const [localSec, setLocalSec]   = useState<AppConfigItem[]>([]);

  useEffect(() => { setLocalMain(mainCategories); }, [mainCategories]);
  useEffect(() => { setLocalSub(subCategories);   }, [subCategories]);
  useEffect(() => { setLocalSec(sections);         }, [sections]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogType, setDialogType] = useState<ConfigType>('main_category');
  const [editingItem, setEditingItem] = useState<AppConfigItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AppConfigItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sub-category parent filter
  const [selectedParent, setSelectedParent] = useState<string>('all');

  // ── Auth gate ──────────────────────────────────────────────────────────────
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Admin panel access: master password OR admin role
    if (authPassword === 'gmqaBhK6@90' || authPassword === 'kwscAdmin@786' || isAdminUser) {
      setAuthPassed(true);
      toast.success('Admin Configuration Unlocked');
    } else {
      toast.error('Incorrect admin password');
    }
  };

  if (!authPassed) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-violet-500/20 bg-[#09090b]/70 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Settings2 className="w-8 h-8 text-violet-400" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-white">Admin Configuration</CardTitle>
            <p className="text-sm text-white/40 mt-1">System-level settings — authorized access only</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label className="text-white/60 text-xs uppercase tracking-widest">Admin Password</Label>
                <div className="relative">
                  <Input
                    type={showAuthPass ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showAuthPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold">
                <Settings2 className="w-4 h-4 mr-2" />
                Unlock Admin Config
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const openAddDialog = (type: ConfigType) => {
    setDialogType(type);
    setDialogMode('add');
    setEditingItem(null);
    setForm({
      ...EMPTY_FORM,
      parent_key: type === 'sub_category' && selectedParent !== 'all' ? selectedParent : '',
      sort_order: String(
        (type === 'main_category' ? localMain : type === 'sub_category' ? localSub : localSec).length + 1
      ),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: AppConfigItem) => {
    setDialogType(item.config_type);
    setDialogMode('edit');
    setEditingItem(item);
    setForm({
      config_key: item.config_key,
      config_label: item.config_label,
      parent_key: item.parent_key || '',
      sort_order: String(item.sort_order),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.config_key.trim() || !form.config_label.trim()) {
      toast.error('Key aur Label dono required hain');
      return;
    }
    if (dialogType === 'sub_category' && !form.parent_key) {
      toast.error('Sub-Category ke liye Parent Category select karein');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        config_type: dialogType,
        config_key: form.config_key.trim().toLowerCase().replace(/\s+/g, '-'),
        config_label: form.config_label.trim(),
        parent_key: dialogType === 'sub_category' ? form.parent_key : null,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: true,
      };

      if (dialogMode === 'edit' && editingItem) {
        const { error } = await supabase
          .from('app_config' as any)
          .update({ config_label: payload.config_label, sort_order: payload.sort_order })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Updated successfully!');
      } else {
        const { error } = await supabase
          .from('app_config' as any)
          .insert(payload);
        if (error) {
          if (error.code === '23505') {
            toast.error('Yeh key already exist karti hai! Alag key use karein.');
          } else {
            throw error;
          }
          return;
        }
        toast.success('Naya item add ho gaya!');
      }

      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: AppConfigItem) => {
    try {
      const { error } = await supabase
        .from('app_config' as any)
        .update({ is_active: !item.is_active })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(item.is_active ? 'Item disabled' : 'Item enabled');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Toggle failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // If deleting a main_category, also delete its sub-categories
      if (deleteTarget.config_type === 'main_category') {
        await supabase
          .from('app_config' as any)
          .delete()
          .eq('config_type', 'sub_category')
          .eq('parent_key', deleteTarget.config_key);
      }
      const { error } = await supabase
        .from('app_config' as any)
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Filtered sub-categories ────────────────────────────────────────────────
  const visibleSub = selectedParent === 'all'
    ? localSub
    : localSub.filter(s => s.parent_key === selectedParent);

  // ── Maintenance Mode Toggle ────────────────────────────────────────────────
  const handleToggleMaintenance = async (checked: boolean) => {
    setIsTogglingMaintenance(true);
    try {
      // Check if the record already exists
      const { data: existing } = await supabase
        .from('app_config' as any)
        .select('id')
        .eq('config_type', 'system_setting')
        .eq('config_key', 'maintenance_mode')
        .maybeSingle();

      const todayStr = new Date().toISOString().split('T')[0];
      
      // Update maintenance_mode
      if (existing) {
        await supabase.from('app_config' as any).update({ config_label: checked ? 'true' : 'false' }).eq('id', existing.id);
      } else {
        await supabase.from('app_config' as any).insert({ config_type: 'system_setting', config_key: 'maintenance_mode', config_label: checked ? 'true' : 'false', is_active: true, sort_order: 0 });
      }

      // Update maintenance_override_date
      const { data: existingOverride } = await supabase.from('app_config' as any).select('id').eq('config_type', 'system_setting').eq('config_key', 'maintenance_override_date').maybeSingle();
      const overrideVal = checked ? 'null' : todayStr;
      
      if (existingOverride) {
        await supabase.from('app_config' as any).update({ config_label: overrideVal }).eq('id', existingOverride.id);
      } else {
        await supabase.from('app_config' as any).insert({ config_type: 'system_setting', config_key: 'maintenance_override_date', config_label: overrideVal, is_active: true, sort_order: 0 });
      }
      toast.success(checked ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle maintenance mode');
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1115]/80 p-6 rounded-[28px] border border-white/5 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-black flex items-center gap-3 text-white tracking-tighter">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-violet-400" />
            </div>
            Admin Configuration Panel
          </h1>
          <p className="text-xs text-white/40 ml-14">
            Frontend se categories, sub-categories aur sections manage karein — bina kisi code change ke
          </p>
        </div>
        <Button
          variant="outline"
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 text-sm text-violet-300">
        <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-violet-400" />
        <div>
          <p className="font-bold text-violet-200 mb-1">Admin-Only Access</p>
          <p className="text-violet-300/70">
            Yahan se add/edit/disable kiya hua data <strong>foran</strong> File Tracking system mein reflect ho jaata hai.
            Main Category delete karne se uski tamam Sub-Categories bhi hata di jaati hain.
          </p>
        </div>
      </div>

      {/* System Status / Maintenance Mode */}
      <Card className="bg-[#0f1115]/50 border-orange-500/20 shadow-lg">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${isMaintenanceMode ? 'bg-orange-500/20 border-orange-500/40' : 'bg-green-500/10 border-green-500/20'}`}>
              <Settings2 className={`w-6 h-6 ${isMaintenanceMode ? 'text-orange-400 animate-[spin_3s_linear_infinite]' : 'text-green-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                System Status
                {isMaintenanceMode ? (
                  <Badge className="bg-orange-500 hover:bg-orange-600">Maintenance Mode</Badge>
                ) : (
                  <Badge className="bg-green-500 hover:bg-green-600">Online</Badge>
                )}
              </h3>
              <p className="text-sm text-white/50">
                Turn on maintenance mode to temporarily block all regular users from accessing the system.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${isMaintenanceMode ? 'text-orange-400' : 'text-white/40'}`}>
              {isMaintenanceMode ? 'System is Offline' : 'System is Active'}
            </span>
            <Switch 
              checked={isMaintenanceMode}
              onCheckedChange={handleToggleMaintenance}
              disabled={isTogglingMaintenance}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="main_category" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          <TabsTrigger value="main_category" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg font-semibold text-xs uppercase tracking-widest px-4">
            <FolderTree className="w-3.5 h-3.5 mr-1.5" />
            Main Categories
            <Badge className="ml-2 bg-white/10 text-white text-[10px] px-1.5 py-0">{localMain.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sub_category" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg font-semibold text-xs uppercase tracking-widest px-4">
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            Sub-Categories
            <Badge className="ml-2 bg-white/10 text-white text-[10px] px-1.5 py-0">{localSub.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="section" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg font-semibold text-xs uppercase tracking-widest px-4">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Sections / Mark-To
            <Badge className="ml-2 bg-white/10 text-white text-[10px] px-1.5 py-0">{localSec.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pol_bills" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-lg font-semibold text-xs uppercase tracking-widest px-4">
            <Fuel className="w-3.5 h-3.5 mr-1.5" />
            POL Bills Fields
          </TabsTrigger>
          <TabsTrigger value="whatsapp_bot" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg font-semibold text-xs uppercase tracking-widest px-4 text-emerald-400">
            <Smartphone className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
            WhatsApp Bot
            <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0 border-emerald-500/30">Live</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Main Categories Tab ─────────────────────────────────────────── */}
        <TabsContent value="main_category" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-white/50">
              File Tracking mein jo top-level categories hain — Employee, Contractor, etc.
            </p>
            <Button
              onClick={() => openAddDialog('main_category')}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
          <ConfigTable
            items={localMain}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={item => setDeleteTarget(item)}
            onToggle={handleToggleActive}
            showParent={false}
          />
        </TabsContent>

        {/* ── Sub-Categories Tab ──────────────────────────────────────────── */}
        <TabsContent value="sub_category" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-white/50">Filter by parent:</p>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue placeholder="Sab dikhao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sab Sub-Categories</SelectItem>
                  {localMain.map(mc => (
                    <SelectItem key={mc.config_key} value={mc.config_key}>
                      {mc.config_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => openAddDialog('sub_category')}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sub-Category
            </Button>
          </div>
          <ConfigTable
            items={visibleSub}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={item => setDeleteTarget(item)}
            onToggle={handleToggleActive}
            showParent={true}
            parentItems={localMain}
          />
        </TabsContent>

        {/* ── Sections Tab ────────────────────────────────────────────────── */}
        <TabsContent value="section" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-white/50">
              "Mark To" dropdown mein jo departments/sections hain — CFO, CIA, Budget, etc.
            </p>
            <Button
              onClick={() => openAddDialog('section')}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>
          <ConfigTable
            items={localSec}
            isLoading={isLoading}
            onEdit={openEditDialog}
            onDelete={item => setDeleteTarget(item)}
            onToggle={handleToggleActive}
            showParent={false}
          />
        </TabsContent>

        {/* ── POL Bills Custom Fields Tab ─────────────────────────────────── */}
        <TabsContent value="pol_bills" className="space-y-4">
          <div className="bg-[#0f1115]/50 border border-white/5 rounded-[24px] p-6">
             <PolBillsSettings />
          </div>
        </TabsContent>

        {/* ── WhatsApp Bot Management Tab ──────────────────────────────────── */}
        <TabsContent value="whatsapp_bot" className="space-y-4">
          <WhatsAppManagementPanel />
        </TabsContent>
      </Tabs>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0f1115] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              {dialogMode === 'add' ? <Plus className="w-5 h-5 text-violet-400" /> : <Edit2 className="w-5 h-5 text-violet-400" />}
              {dialogMode === 'add' ? 'Naya' : 'Edit'}{' '}
              {dialogType === 'main_category' ? 'Main Category' : dialogType === 'sub_category' ? 'Sub-Category' : 'Section'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Key field — only editable on add */}
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-widest">
                Unique Key <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g. cp-fund"
                value={form.config_key}
                onChange={e => setForm(p => ({ ...p, config_key: e.target.value }))}
                disabled={dialogMode === 'edit'}
                className="bg-white/5 border-white/10 text-white disabled:opacity-50"
              />
              <p className="text-[10px] text-white/30">Lowercase, hyphens allowed. Edit mein change nahi hoga.</p>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-widest">
                Display Label <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="e.g. CP Fund"
                value={form.config_label}
                onChange={e => setForm(p => ({ ...p, config_label: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                autoFocus={dialogMode === 'edit'}
              />
            </div>

            {/* Parent — only for sub_category */}
            {dialogType === 'sub_category' && (
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs uppercase tracking-widest">
                  Parent Category <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={form.parent_key}
                  onValueChange={v => setForm(p => ({ ...p, parent_key: v }))}
                  disabled={dialogMode === 'edit'}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    {localMain.map(mc => (
                      <SelectItem key={mc.config_key} value={mc.config_key}>
                        {mc.config_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort Order */}
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-widest">Sort Order</Label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {dialogMode === 'add' ? 'Add Karein' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-[#0f1115] border-red-500/20 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Confirm karein
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60 py-2">
            <strong className="text-white">"{deleteTarget?.config_label}"</strong> ko delete karna chahte hain?
            {deleteTarget?.config_type === 'main_category' && (
              <span className="block mt-2 text-red-400 font-semibold">
                ⚠️ Iske sath iske tamam Sub-Categories bhi delete ho jaayengi!
              </span>
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Haan, Delete Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Table Component
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigTableProps {
  items: AppConfigItem[];
  isLoading: boolean;
  onEdit: (item: AppConfigItem) => void;
  onDelete: (item: AppConfigItem) => void;
  onToggle: (item: AppConfigItem) => void;
  showParent: boolean;
  parentItems?: AppConfigItem[];
}

function ConfigTable({ items, isLoading, onEdit, onDelete, onToggle, showParent, parentItems }: ConfigTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-white/40">
        <Loader2 className="w-8 h-8 animate-spin mr-3 text-violet-400" />
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-white/30 border border-white/5 rounded-2xl bg-white/[0.02]">
        <FolderOpen className="w-10 h-10 mb-3 text-white/20" />
        <p className="font-semibold">Koi item nahi mila</p>
        <p className="text-xs mt-1">Upar "Add" button se naya item shuru karein</p>
      </div>
    );
  }

  return (
    <Card className="border-white/10 bg-[#09090b]/50 backdrop-blur-md overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
              <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest w-10">#</TableHead>
              <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest">Key</TableHead>
              <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest">Label</TableHead>
              {showParent && (
                <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest">Parent</TableHead>
              )}
              <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest w-20 text-center">Order</TableHead>
              <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest w-24 text-center">Status</TableHead>
              <TableHead className="text-white/50 font-bold uppercase text-[10px] tracking-widest text-right w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow
                key={item.id}
                className={`border-white/5 transition-colors hover:bg-white/[0.03] ${!item.is_active ? 'opacity-40' : ''}`}
              >
                <TableCell className="text-white/30 text-xs font-mono">{idx + 1}</TableCell>
                <TableCell>
                  <code className="text-[11px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded font-mono border border-violet-500/20">
                    {item.config_key}
                  </code>
                </TableCell>
                <TableCell className="text-white font-semibold text-sm">{item.config_label}</TableCell>
                {showParent && (
                  <TableCell>
                    {item.parent_key ? (
                      <Badge className="bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                        {parentItems?.find(p => p.config_key === item.parent_key)?.config_label || item.parent_key}
                      </Badge>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-center text-white/40 text-xs font-mono">{item.sort_order}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => onToggle(item)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(item)}
                      className="h-7 w-7 text-white/40 hover:text-violet-400 hover:bg-violet-500/10"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(item)}
                      className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
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
  );
}
