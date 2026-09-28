import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Building2, Phone, Mail, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AppConfigItem, useAppConfig } from '@/hooks/useAppConfig';

interface ContractorDetails {
  contractor_name: string;
  ntn_number: string;
  cnic_number: string;
  email: string;
}

const EMPTY_DETAILS: ContractorDetails = {
  contractor_name: '',
  ntn_number: '',
  cnic_number: '',
  email: '',
};

export default function ContractorAccountsPanel() {
  const { contractorAccounts, refetch, isLoading } = useAppConfig();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [details, setDetails] = useState<ContractorDetails>(EMPTY_DETAILS);

  const openAddDialog = () => {
    setEditingId(null);
    setCompanyName('');
    setPhoneNumber('');
    setDetails(EMPTY_DETAILS);
    setDialogOpen(true);
  };

  const openEditDialog = (item: AppConfigItem) => {
    setEditingId(item.id);
    setCompanyName(item.config_label);
    setPhoneNumber(item.config_key);
    
    try {
      if (item.parent_key) {
        setDetails(JSON.parse(item.parent_key));
      } else {
        setDetails(EMPTY_DETAILS);
      }
    } catch {
      setDetails(EMPTY_DETAILS);
    }
    
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyName.trim() || !phoneNumber.trim()) {
      toast.error('Company Name and Phone Number are required!');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Invalid Phone Number');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        config_type: 'contractor_account',
        config_key: cleanPhone,
        config_label: companyName.trim(),
        parent_key: JSON.stringify(details),
        is_active: true,
        sort_order: contractorAccounts.length + 1
      };

      if (editingId) {
        const { error } = await supabase
          .from('app_config' as any)
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Contractor updated successfully!');
      } else {
        const { error } = await supabase
          .from('app_config' as any)
          .insert(payload);
        if (error) {
          if (error.code === '23505') {
            toast.error('This phone number is already registered to a contractor!');
          } else {
            throw error;
          }
          return;
        }
        toast.success('Contractor added successfully!');
      }

      setDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save contractor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this contractor account?")) return;
    try {
      const { error } = await supabase.from('app_config' as any).delete().eq('id', id);
      if (error) throw error;
      toast.success('Contractor deleted');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#0f1115]/50 border border-white/5 rounded-[24px] p-6">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            Contractor Accounts
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Manage contractor profiles. File updates will be sent to their WhatsApp number.
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-amber-600 hover:bg-amber-500 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      <div className="bg-[#0f1115]/50 border border-white/5 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5 border-b border-white/5">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-white/60 font-semibold h-10">Company Name</TableHead>
              <TableHead className="text-white/60 font-semibold h-10">Phone (WhatsApp)</TableHead>
              <TableHead className="text-white/60 font-semibold h-10">Contractor Name</TableHead>
              <TableHead className="text-white/60 font-semibold h-10">NTN / CNIC</TableHead>
              <TableHead className="text-white/60 font-semibold h-10 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-white/40">Loading contractors...</TableCell>
              </TableRow>
            ) : contractorAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-white/40">No contractors found.</TableCell>
              </TableRow>
            ) : (
              contractorAccounts.map(item => {
                let det = EMPTY_DETAILS;
                try { if (item.parent_key) det = JSON.parse(item.parent_key); } catch {}
                
                return (
                  <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-bold text-white py-3">{item.config_label}</TableCell>
                    <TableCell className="font-mono text-sm text-amber-400 py-3">{item.config_key}</TableCell>
                    <TableCell className="text-white/80 text-sm py-3">{det.contractor_name || '---'}</TableCell>
                    <TableCell className="text-white/60 text-xs py-3">
                      <div>{det.ntn_number ? `NTN: ${det.ntn_number}` : ''}</div>
                      <div>{det.cnic_number ? `CNIC: ${det.cnic_number}` : ''}</div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10" onClick={() => openEditDialog(item)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/70 hover:text-red-400 hover:bg-red-400/10" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#09090b] border-white/10 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-white/5 border-b border-white/5">
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              {editingId ? 'Edit Contractor Account' : 'New Contractor Account'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-xs uppercase font-bold text-white/60 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Company Name *</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. ABC Construction" className="bg-white/5 border-white/10 text-white font-semibold" />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs uppercase font-bold text-amber-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Phone Number (WhatsApp) *</Label>
                <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="923001234567" className="bg-amber-500/5 border-amber-500/30 text-amber-400 font-mono focus-visible:ring-amber-500" />
                <p className="text-[10px] text-white/40">Include country code (e.g. 92). Automated alerts will be sent here.</p>
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs uppercase font-bold text-white/60 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Contractor Name</Label>
                <Input value={details.contractor_name} onChange={e => setDetails({...details, contractor_name: e.target.value})} placeholder="Owner / Representative Name" className="bg-white/5 border-white/10 text-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-white/60 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> NTN Number</Label>
                <Input value={details.ntn_number} onChange={e => setDetails({...details, ntn_number: e.target.value})} placeholder="e.g. 1234567-8" className="bg-white/5 border-white/10 text-white font-mono" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-white/60 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> CNIC Number</Label>
                <Input value={details.cnic_number} onChange={e => setDetails({...details, cnic_number: e.target.value})} placeholder="e.g. 42101-1234567-1" className="bg-white/5 border-white/10 text-white font-mono" />
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs uppercase font-bold text-white/60 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Email Address</Label>
                <Input type="email" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} placeholder="contractor@example.com" className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>

          </div>
          <DialogFooter className="p-6 pt-4 bg-black/40 border-t border-white/5 flex gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/70 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-amber-600 hover:bg-amber-500 text-white font-bold min-w-[100px]">
              {isSaving ? 'Saving...' : 'Save Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
