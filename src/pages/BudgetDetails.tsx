import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BudgetDetails() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { sections, isLoading: isConfigLoading } = useAppConfig();
  
  const [budget, setBudget] = useState<any>(null);
  const [utilizations, setUtilizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!sectionId) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        // Fetch budget config
        const { data: budgetData } = await supabase
          .from('department_budgets' as any)
          .select('*')
          .eq('section_key', sectionId)
          .maybeSingle();
        
        if (budgetData) setBudget(budgetData);

        // Fetch utilizations with joined file data
        const { data: utilData, error: utilError } = await supabase
          .from('budget_utilizations' as any)
          .select(`
            *,
            file_tracking_records (
              cfo_diary_number,
              receiving_number,
              subject,
              received_from,
              created_at
            )
          `)
          .eq('section_key', sectionId)
          .order('created_at', { ascending: false });

        if (utilError) {
          console.warn("Could not fetch utilizations. Did you run the SQL script?", utilError);
        } else {
          setUtilizations(utilData || []);
        }

      } catch (err) {
        console.error("Error fetching budget details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [sectionId]);

  if (isConfigLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectionName = sections.find(s => s.config_key === sectionId)?.config_label || sectionId;
  const allocated = budget ? Number(budget.allocated_amount) : 0;
  const activeUtils = utilizations.filter(u => u.status !== 'Reverted');
  const utilizedAmount = activeUtils.reduce((sum, u) => sum + Number(u.deducted_amount), 0);
  const remaining = allocated - utilizedAmount;

  const filteredUtils = utilizations.filter(u => {
    const file = u.file_tracking_records || {};
    const q = search.toLowerCase();
    return (
      (file.cfo_diary_number || '').toLowerCase().includes(q) ||
      (file.receiving_number || '').toLowerCase().includes(q) ||
      (file.subject || '').toLowerCase().includes(q) ||
      (file.received_from || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6 pb-10 font-sans">
      <Button 
        variant="ghost" 
        className="mb-2 text-slate-600 dark:text-slate-400 hover:text-[#1e3a8a] dark:hover:text-blue-400 font-bold" 
        onClick={() => navigate('/budget-control')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
      </Button>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#1e3a8a] dark:text-blue-400 flex items-center gap-3">
          {sectionName} Budget Details
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">
          Detailed view of all files impacting this department's budget.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 rounded-2xl">
          <CardContent className="p-5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Allocated</span>
            <div className="mt-2">
              <span
                className="text-lg font-black font-mono px-3 py-1 rounded-lg inline-block"
                style={{ color: '#92400e', background: '#fef08a', border: '1.5px solid #fbbf24' }}
              >
                Rs. {allocated.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 rounded-2xl">
          <CardContent className="p-5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Utilized</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-red-600 dark:text-red-400">Rs. {utilizedAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 rounded-2xl">
          <CardContent className="p-5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Remaining</span>
            <div className="mt-2">
              <span
                className="text-lg font-black font-mono px-3 py-1 rounded-lg inline-block"
                style={
                  remaining < 0
                    ? { color: '#991b1b', background: '#fecaca', border: '1.5px solid #f87171' }
                    : { color: '#065f46', background: '#d1fae5', border: '1.5px solid #34d399' }
                }
              >
                Rs. {remaining.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Tracking Deductions Table */}
      <Card className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-2 text-[#1e3a8a] dark:text-blue-400">
              <FileText className="w-5 h-5" />
              File Deductions Ledger
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-semibold">A chronological list of all files that deducted from this budget.</CardDescription>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <Input
              placeholder="Search diary no, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-[#1e293b]">
                  <TableHead className="w-[120px] font-extrabold text-slate-700 dark:text-slate-300">Date</TableHead>
                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-300">Diary / Receiving</TableHead>
                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-300">Subject / Payee</TableHead>
                  <TableHead className="font-extrabold text-slate-700 dark:text-slate-300">Status</TableHead>
                  <TableHead className="text-right font-extrabold text-slate-700 dark:text-slate-300">Deducted Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUtils.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500 dark:text-slate-400 font-semibold">
                      No files have impacted this department's budget yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUtils.map((util) => {
                    const file = util.file_tracking_records || {};
                    const isReverted = util.status === 'Reverted';
                    const isAdjustment = util.status === 'Adjustment';
                    
                    return (
                      <TableRow key={util.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b]">
                        <TableCell className="font-mono text-xs whitespace-nowrap text-slate-700 dark:text-slate-300">
                          {new Date(util.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{file.cfo_diary_number || 'N/A'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{file.receiving_number || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold max-w-md truncate text-slate-800 dark:text-slate-200">{file.subject || 'Unknown Subject'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{file.received_from || 'Unknown Payee'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              isReverted 
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600' 
                                : isAdjustment 
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700'
                            }
                          >
                            {util.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-mono font-bold ${isReverted ? 'text-slate-400 dark:text-slate-500 line-through' : ''}`}
                            style={
                              !isReverted
                                ? { color: '#92400e', background: '#fef08a', border: '1px solid #fbbf24', padding: '2px 8px', borderRadius: '6px', display: 'inline-block' }
                                : {}
                            }
                          >
                            {Number(util.deducted_amount) > 0 ? '-' : '+'} Rs. {Math.abs(Number(util.deducted_amount)).toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
