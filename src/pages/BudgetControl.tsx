import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, TrendingDown, ArrowRight, Loader2, Pencil, PiggyBank, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function BudgetControl() {
  const { sections, isLoading: isConfigLoading } = useAppConfig();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [utilizations, setUtilizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form State
  const [selectedSection, setSelectedSection] = useState("");
  const [periodType, setPeriodType] = useState("Yearly");
  const [periodValue, setPeriodValue] = useState(new Date().getFullYear().toString());
  const [allocatedAmount, setAllocatedAmount] = useState("");

  const openNewDialog = () => {
    setEditingBudgetId(null);
    setSelectedSection("");
    setPeriodType("Yearly");
    setPeriodValue(new Date().getFullYear().toString());
    setAllocatedAmount("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (budget: any) => {
    setEditingBudgetId(budget.id);
    setSelectedSection(budget.section_key);
    setPeriodType(budget.period_type);
    setPeriodValue(budget.period_value);
    setAllocatedAmount(String(budget.allocated_amount));
    setIsDialogOpen(true);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from('department_budgets' as any)
        .select('*');
      
      if (budgetError) {
        if (budgetError.code === '42P01') {
          console.warn("Table department_budgets does not exist yet. Please run the SQL schema.");
        } else {
          throw budgetError;
        }
      } else {
        setBudgets(budgetData || []);
      }

      // Fetch Utilizations (Aggregated)
      const { data: utilData, error: utilError } = await supabase
        .from('budget_utilizations' as any)
        .select('section_key, deducted_amount, status');

      if (!utilError) {
        setUtilizations(utilData || []);
      }

    } catch (error: any) {
      console.error("Error fetching budgets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !allocatedAmount) return;

    setIsAssigning(true);
    try {
      const amount = parseFloat(allocatedAmount);

      if (editingBudgetId) {
        // UPDATE existing budget
        const { error } = await supabase
          .from('department_budgets' as any)
          .update({ allocated_amount: amount, period_type: periodType, period_value: periodValue, updated_at: new Date().toISOString() })
          .eq('id', editingBudgetId);
        if (error) throw error;
        toast.success("Budget updated successfully!");
      } else {
        // INSERT new budget
        const { error } = await supabase
          .from('department_budgets' as any)
          .upsert({
            section_key: selectedSection,
            period_type: periodType,
            period_value: periodValue,
            allocated_amount: amount
          }, { onConflict: 'section_key, period_type, period_value' });
        if (error) throw error;
        toast.success("Budget assigned successfully!");
      }

      setIsDialogOpen(false);
      setAllocatedAmount("");
      setEditingBudgetId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save budget");
    } finally {
      setIsAssigning(false);
    }
  };

  const calculateSectionStats = (sectionKey: string) => {
    const budget = budgets.find(b => b.section_key === sectionKey);
    const allocated = budget ? Number(budget.allocated_amount) : 0;
    
    // Sum all active deductions
    const sectionUtils = utilizations.filter(u => u.section_key === sectionKey && u.status !== 'Reverted');
    const utilized = sectionUtils.reduce((sum, u) => sum + Number(u.deducted_amount), 0);
    
    const remaining = allocated - utilized;
    const percentage = allocated > 0 ? (utilized / allocated) * 100 : 0;

    return { allocated, utilized, remaining, percentage, hasBudget: !!budget };
  };

  if (isConfigLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter out system sections
  const validSections = sections.filter(s => s.config_key !== 'admin' && s.config_key !== 'file_viewer');

  const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocated_amount), 0);
  const totalUtilized = utilizations.filter(u => u.status !== 'Reverted').reduce((sum, u) => sum + Number(u.deducted_amount), 0);
  const globalPercentage = totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0;

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      
      {/* ═══ HEADER TOOLBAR ═══ */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-[#1e3a8a] dark:text-blue-400 tracking-tight">
                  Budget Control Center
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#1e3a8a] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <BarChart3 className="w-3 h-3" /> Financial Control
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                Manage and track departmental budget allocations in real-time
              </p>
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-sm px-5 py-2.5 rounded-xl" 
              onClick={openNewDialog}
            >
              <Plus className="w-5 h-5 mr-2" /> Assign Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-600 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#1e3a8a] dark:text-blue-300 font-black">{editingBudgetId ? 'Edit Budget' : 'Assign Department Budget'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssignBudget} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Department / Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!!editingBudgetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {validSections.map(s => (
                      <SelectItem key={s.config_key} value={s.config_key}>{s.config_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Period</Label>
                  <Select value={periodType} onValueChange={setPeriodType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yearly">Yearly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 dark:text-slate-300">Year/Month</Label>
                  <Input value={periodValue} onChange={e => setPeriodValue(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 dark:text-slate-300">Allocated Amount (PKR)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  required 
                  value={allocatedAmount} 
                  onChange={e => setAllocatedAmount(e.target.value)} 
                  placeholder="e.g. 5000000"
                />
              </div>

              <Button type="submit" className="w-full font-bold bg-[#1e3a8a] hover:bg-blue-900 text-white" disabled={isAssigning}>
                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingBudgetId ? 'Update Budget' : 'Save Budget'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ═══ GLOBAL KPI OVERVIEW ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Total Allocated */}
        <Card className="bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Total Allocated Budget
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-[#1e3a8a] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight font-mono break-all leading-tight px-3 py-1 rounded-lg inline-block"
                style={{ color: '#92400e', background: '#fef08a', border: '1.5px solid #fbbf24' }}
              >
                Rs. {totalAllocated.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              Combined budget across all departments
            </p>
          </CardContent>
        </Card>
        
        {/* Total Utilized */}
        <Card className="bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Total Utilized
              </span>
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center justify-center font-bold">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl xl:text-4xl font-black text-red-600 dark:text-red-400 tracking-tight">
                Rs. {totalUtilized.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-xs font-black text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-300 dark:border-red-700 whitespace-nowrap">
                {globalPercentage.toFixed(1)}% Used
              </span>
            </div>
            <Progress value={globalPercentage} className="h-1.5 mt-3" indicatorClassName="bg-red-500" />
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              Total deductions against allocated budgets
            </p>
          </CardContent>
        </Card>

        {/* Total Remaining */}
        <Card className="border-2 border-emerald-400 dark:border-emerald-600 rounded-2xl bg-emerald-50 dark:bg-emerald-900/15">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Remaining
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-400 dark:bg-emerald-600 flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight font-mono break-all leading-tight px-3 py-1 rounded-lg inline-block"
                style={{ color: '#065f46', background: '#d1fae5', border: '1.5px solid #34d399' }}
              >
                Rs. {(totalAllocated - totalUtilized).toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              Available balance across all departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ DEPARTMENT BREAKDOWNS ═══ */}
      <div className="space-y-4">
        <h2 className="text-xl font-black tracking-tight text-[#1e3a8a] dark:text-blue-400 mt-4 mb-2 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Department Breakdowns
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {validSections.map(section => {
            const stats = calculateSectionStats(section.config_key);
            if (!stats.hasBudget && stats.utilized === 0) return null;

            const isOverBudget = stats.percentage > 90;
            const isWarning = stats.percentage > 75;
            const progressColor = isOverBudget ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-[#1e3a8a]';
            const accentBorderColor = isOverBudget ? 'border-l-red-500' : isWarning ? 'border-l-orange-500' : 'border-l-[#1e3a8a]';

            return (
              <Card 
                key={section.config_key} 
                className={`bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden border-l-4 ${accentBorderColor} hover:border-slate-300 dark:hover:border-slate-600 transition-all group`}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-black text-slate-800 dark:text-slate-100">{section.config_label}</CardTitle>
                      <CardDescription className="text-[10px] uppercase tracking-wider mt-0.5 font-bold text-slate-500 dark:text-slate-400">{section.config_key}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-[#1e3a8a] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => {
                          const existingBudget = budgets.find(b => b.section_key === section.config_key);
                          if (existingBudget) openEditDialog(existingBudget);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Badge 
                        className={
                          isOverBudget 
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold text-[10px]" 
                            : isWarning
                            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 font-bold text-[10px]"
                            : "bg-blue-50 dark:bg-blue-900/30 text-[#1e3a8a] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[10px]"
                        }
                      >
                        {stats.percentage.toFixed(1)}% Used
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-extrabold tracking-wider mb-1">Allocated</p>
                      <p
                        className="font-mono font-bold text-sm px-2 py-0.5 rounded inline-block"
                        style={{ color: '#92400e', background: '#fef08a', border: '1px solid #fbbf24' }}
                      >
                        Rs. {stats.allocated.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-extrabold tracking-wider mb-1">Remaining</p>
                      <p
                        className="font-mono font-bold text-sm px-2 py-0.5 rounded inline-block"
                        style={
                          stats.remaining < 0
                            ? { color: '#991b1b', background: '#fecaca', border: '1px solid #f87171' }
                            : { color: '#065f46', background: '#d1fae5', border: '1px solid #34d399' }
                        }
                      >
                        Rs. {stats.remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span>Utilized</span>
                      <span className="font-mono">Rs. {stats.utilized.toLocaleString()}</span>
                    </div>
                    <Progress value={stats.percentage} className="h-2" indicatorClassName={progressColor} />
                  </div>

                  <Button 
                    variant="ghost" 
                    className="w-full mt-1 text-xs text-slate-600 dark:text-slate-400 hover:text-[#1e3a8a] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold group-hover:bg-slate-50 dark:group-hover:bg-slate-800"
                    onClick={() => navigate(`/budget-details/${section.config_key}`)}
                  >
                    View File Deductions <ArrowRight className="w-3 h-3 ml-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {validSections.filter(s => !calculateSectionStats(s.config_key).hasBudget && calculateSectionStats(s.config_key).utilized === 0).length > 0 && (
            <Card className="bg-slate-50 dark:bg-[#111827] border-dashed border-2 border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-center p-6 min-h-[200px] rounded-2xl">
              <Wallet className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">Other departments have no budget allocated yet.</p>
              <Button variant="link" className="text-[#1e3a8a] dark:text-blue-400 mt-1 font-bold" onClick={openNewDialog}>Assign Budget</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
