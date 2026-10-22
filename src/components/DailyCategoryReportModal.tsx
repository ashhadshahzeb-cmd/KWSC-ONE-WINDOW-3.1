import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Calendar,
  Printer,
  Upload,
  RefreshCw,
  FolderOpen,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/mock-data';
import { toast } from 'sonner';

interface DailyCategoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynMainCats?: Array<{ config_key: string; config_label: string }>;
  dynSubCats?: Array<{ config_key: string; config_label: string; parent_key?: string | null }>;
}

export interface CategorySummary {
  categoryKey: string;
  categoryLabel: string;
  count: number;
  totalAmount: number;
  percentage: number;
  subCategories: Array<{
    key: string;
    label: string;
    count: number;
    amount: number;
  }>;
}

const getLocalDateString = (dateInput?: Date | string) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().substring(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DailyCategoryReportModal({
  isOpen,
  onClose,
  dynMainCats = [],
  dynSubCats = []
}: DailyCategoryReportModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Helper to format category readable name
  const getCatLabel = (catKey: string): string => {
    if (!catKey) return "Unassigned Category";
    const found = dynMainCats.find(c => c.config_key.toLowerCase() === catKey.toLowerCase());
    if (found) return found.config_label;
    if (catKey === 'pol_bills') return 'POL Bills';
    if (catKey === 'cp_fund') return 'CP Fund';
    return catKey.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSubCatLabel = (subKey: string): string => {
    if (!subKey) return "General / Other";
    const found = dynSubCats.find(s => s.config_key.toLowerCase() === subKey.toLowerCase());
    if (found) return found.config_label;
    return subKey.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Fetch all records for the selected day (IndexedDB + Supabase)
  const fetchDayData = async (targetDate: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch from local Dexie database
      let localMatches: any[] = [];
      try {
        localMatches = await db.records
          .filter(r => {
            if (r.deleted_locally) return false;
            const rDate = r.created_at ? getLocalDateString(r.created_at) : '';
            const inDate = r.inward_date ? getLocalDateString(r.inward_date) : '';
            const regDate = r.registration_date ? getLocalDateString(r.registration_date) : '';
            return rDate === targetDate || inDate === targetDate || regDate === targetDate;
          })
          .toArray();
      } catch (err) {
        console.error("Local records daily fetch error:", err);
      }

      // 2. Fetch from Supabase
      let supabaseMatches: any[] = [];
      try {
        const startOfDay = `${targetDate}T00:00:00.000Z`;
        const endOfDay = `${targetDate}T23:59:59.999Z`;

        const { data, error } = await supabase
          .from('file_tracking_records' as any)
          .select('*')
          .or(`created_at.gte.${startOfDay},inward_date.eq.${targetDate}`)
          .lte('created_at', endOfDay);

        if (!error && data) {
          supabaseMatches = data;
        }
      } catch (supErr) {
        console.error("Supabase daily records fetch error:", supErr);
      }

      // Merge records by receiving_number / id
      const recordMap = new Map<string, any>();
      localMatches.forEach(r => {
        const key = r.receiving_number || r.cfo_diary_number || r.id;
        if (key) recordMap.set(key, r);
      });
      supabaseMatches.forEach(r => {
        const key = r.receiving_number || r.cfo_diary_number || r.id;
        if (key && !recordMap.has(key)) {
          recordMap.set(key, r);
        }
      });

      const merged = Array.from(recordMap.values());
      setDailyRecords(merged);
    } catch (error: any) {
      console.error("Error fetching daily category report:", error);
      toast.error("Failed to load daily report data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDayData(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // Aggregate category metrics
  const { categorySummaries, grandTotalCount, grandTotalAmount } = useMemo(() => {
    const catMap = new Map<string, {
      count: number;
      totalAmount: number;
      subCatMap: Map<string, { count: number; amount: number }>;
    }>();

    let totalCount = 0;
    let totalAmt = 0;

    dailyRecords.forEach((r: any) => {
      const cat = (r.main_category || r.mainCategory || 'unassigned').toLowerCase();
      const subCat = (r.sub_category || r.subCategory || 'general').toLowerCase();
      const amt = Number(r.amount) || 0;

      totalCount += 1;
      totalAmt += amt;

      if (!catMap.has(cat)) {
        catMap.set(cat, { count: 0, totalAmount: 0, subCatMap: new Map() });
      }
      const entry = catMap.get(cat)!;
      entry.count += 1;
      entry.totalAmount += amt;

      if (!entry.subCatMap.has(subCat)) {
        entry.subCatMap.set(subCat, { count: 0, amount: 0 });
      }
      const subEntry = entry.subCatMap.get(subCat)!;
      subEntry.count += 1;
      subEntry.amount += amt;
    });

    const summaries: CategorySummary[] = Array.from(catMap.entries()).map(([key, data]) => {
      const percentage = totalAmt > 0 ? (data.totalAmount / totalAmt) * 100 : 0;
      const subCategories = Array.from(data.subCatMap.entries()).map(([subK, subV]) => ({
        key: subK,
        label: getSubCatLabel(subK),
        count: subV.count,
        amount: subV.amount
      })).sort((a, b) => b.amount - a.amount || b.count - a.count);

      return {
        categoryKey: key,
        categoryLabel: getCatLabel(key),
        count: data.count,
        totalAmount: data.totalAmount,
        percentage,
        subCategories
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount || b.count - a.count);

    return {
      categorySummaries: summaries,
      grandTotalCount: totalCount,
      grandTotalAmount: totalAmt
    };
  }, [dailyRecords, dynMainCats, dynSubCats]);

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  const handlePrevDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(getLocalDateString(cur));
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(getLocalDateString(cur));
  };

  const handleSetToday = () => {
    setSelectedDate(getLocalDateString());
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateString(d));
  };

  // Export Daily Report to CSV
  const handleExportCSV = () => {
    if (categorySummaries.length === 0) {
      toast.warning("No entries found for this date to export.");
      return;
    }

    const headers = ["Category", "Sub-Category", "Total Entries", "Total Amount (PKR)", "% of Day Amount"];
    const rows: string[][] = [];

    categorySummaries.forEach(cat => {
      rows.push([
        `"${cat.categoryLabel}"`,
        `"All Sub-Categories"`,
        cat.count.toString(),
        cat.totalAmount.toString(),
        `${cat.percentage.toFixed(1)}%`
      ]);

      cat.subCategories.forEach(sub => {
        rows.push([
          `"${cat.categoryLabel}"`,
          `"${sub.label}"`,
          sub.count.toString(),
          sub.amount.toString(),
          cat.totalAmount > 0 ? `${((sub.amount / grandTotalAmount) * 100).toFixed(1)}%` : '0%'
        ]);
      });
    });

    // Grand total row
    rows.push([
      `"GRAND TOTAL"`,
      `"-"`,
      grandTotalCount.toString(),
      grandTotalAmount.toString(),
      `"100.0%"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KWSC_Daily_Category_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily Category Report downloaded as CSV!");
  };

  // Official Printable Report
  const handlePrintReport = () => {
    if (categorySummaries.length === 0) {
      toast.warning("No entries found for this date to print.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print report.");
      return;
    }

    const rowsHtml = categorySummaries.map((cat, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="font-weight: bold; color: #1e3a8a;">
          ${cat.categoryLabel}
          ${cat.subCategories.length > 1 ? `
            <div style="font-size: 8.5px; color: #64748b; font-weight: normal; margin-top: 3px;">
              ${cat.subCategories.map(s => `${s.label} (${s.count} files - ${formatCurrency(s.amount)})`).join(' | ')}
            </div>
          ` : ''}
        </td>
        <td style="text-align: center; font-weight: bold; background-color: #f8fafc;">${cat.count}</td>
        <td style="text-align: right; font-weight: bold; font-family: monospace;">${formatCurrency(cat.totalAmount)}</td>
        <td style="text-align: right; color: #475569;">${cat.percentage.toFixed(1)}%</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>KW&SC Daily Category Report - ${selectedDate}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
              font-size: 11px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .org-title {
              font-size: 18px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              margin-top: 3px;
            }
            .meta-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .meta-val {
              font-weight: bold;
              color: #1e3a8a;
            }
            table.report-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            table.report-table th, table.report-table td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              font-size: 10.5px;
            }
            table.report-table th {
              background-color: #1e3a8a !important;
              color: #ffffff !important;
              text-transform: uppercase;
              font-size: 9.5px;
              letter-spacing: 0.5px;
            }
            tr:nth-child(even) { background-color: #f8fafc; }
            .grand-total-row {
              background-color: #e2e8f0 !important;
              font-size: 11.5px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .sig-line {
              width: 180px;
              border-top: 1.5px solid #1e3a8a;
              text-align: center;
              padding-top: 6px;
              font-weight: bold;
              font-size: 10px;
              color: #1e3a8a;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="header-table">
            <table style="width:100%">
              <tr>
                <td style="border:none; width: 60px;">
                  <img src="${window.location.origin}/kwsc-logo.png" style="width: 50px; height: 50px; object-fit: contain;" />
                </td>
                <td style="border:none; text-align: left; padding-left: 10px;">
                  <div class="org-title">Karachi Water &amp; Sewerage Corporation</div>
                  <div class="doc-title">Finance Department &mdash; Daily Category-Wise Entries &amp; Amount Report</div>
                </td>
                <td style="border:none; text-align: right; vertical-align: middle;">
                  <div style="font-size: 9px; color: #64748b;">REPORT DATE</div>
                  <div style="font-size: 13px; font-weight: bold; color: #1e3a8a;">${selectedDate}</div>
                </td>
              </tr>
            </table>
          </div>

          <div class="meta-box">
            <div>Total Registered Files: <span class="meta-val">${grandTotalCount}</span></div>
            <div>Total Registered Amount: <span class="meta-val">${formatCurrency(grandTotalAmount)}</span></div>
            <div>Active Categories: <span class="meta-val">${categorySummaries.length}</span></div>
            <div>Generated On: <span class="meta-val">${new Date().toLocaleTimeString()}</span></div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="text-align: left;">Category Breakdown</th>
                <th style="width: 90px; text-align: center;">Total Entries</th>
                <th style="width: 150px; text-align: right;">Total Amount (PKR)</th>
                <th style="width: 75px; text-align: right;">% Share</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="grand-total-row">
                <td colspan="2" style="text-align: right; padding-right: 15px; font-weight: 800;">GRAND TOTAL:</td>
                <td style="text-align: center; font-weight: 800;">${grandTotalCount} Files</td>
                <td style="text-align: right; font-weight: 800; font-family: monospace;">${formatCurrency(grandTotalAmount)}</td>
                <td style="text-align: right; font-weight: 800;">100%</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-line">Prepared By (Operator)</div>
            <div class="sig-line">Verified By (Incharge)</div>
            <div class="sig-line">Chief Financial Officer</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 border border-slate-200 shadow-2xl">
        <DialogHeader className="p-5 border-b border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold text-[#1e3a8a] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1e3a8a]" />
                Daily Category-Wise Entries &amp; Amount Report
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Rozana ki bunyad par tamam categories ki entries aur unka kul amount summary.
              </p>
            </div>

            {/* Quick Actions (Print / CSV) */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-9 text-xs border-slate-300 hover:bg-slate-100 text-slate-700 font-bold"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5 rotate-180 text-emerald-600" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={handlePrintReport}
                className="h-9 text-xs bg-[#1e3a8a] hover:bg-[#172554] text-white font-bold"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Report
              </Button>
            </div>
          </div>

          {/* Date Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevDay}
                className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-100"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </Button>
              
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                <Calendar className="w-4 h-4 text-[#1e3a8a]" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="h-7 text-xs font-bold bg-transparent border-none p-0 focus-visible:ring-0 text-slate-800 cursor-pointer"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-100"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Button>

              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm"
                  variant={selectedDate === getLocalDateString() ? "default" : "outline"}
                  onClick={handleSetToday}
                  className={`h-7 px-2.5 text-[11px] rounded-lg font-bold ${
                    selectedDate === getLocalDateString() ? "bg-[#1e3a8a] text-white" : "text-slate-600"
                  }`}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSetYesterday}
                  className="h-7 px-2.5 text-[11px] rounded-lg text-slate-600 font-bold hover:bg-slate-100"
                >
                  Yesterday
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDayData(selectedDate)}
              disabled={isLoading}
              className="h-8 text-xs text-slate-600 hover:text-[#1e3a8a] gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#1e3a8a]' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Entries Today</p>
                <p className="text-2xl font-black text-[#1e3a8a] mt-0.5">{grandTotalCount} <span className="text-xs font-semibold text-slate-500">Files</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#1e3a8a]" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Total Registered Amount</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCurrency(grandTotalAmount)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Active Categories</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{categorySummaries.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="w-[45px] text-center font-bold text-slate-700 text-xs uppercase">#</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Category</TableHead>
                  <TableHead className="w-[120px] text-center font-bold text-slate-700 text-xs uppercase">Entries</TableHead>
                  <TableHead className="w-[180px] text-right font-bold text-slate-700 text-xs uppercase">Total Amount</TableHead>
                  <TableHead className="w-[140px] text-right font-bold text-slate-700 text-xs uppercase">% Share</TableHead>
                  <TableHead className="w-[110px] text-center font-bold text-slate-700 text-xs uppercase">Sub-Cats</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#1e3a8a]" />
                        <span className="text-xs font-bold text-slate-600">Calculating daily category report...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : categorySummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <FolderOpen className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                        <span className="text-sm font-bold text-slate-700">Is Tareekh Par Koi Entry Maujood Nahi Hai</span>
                        <span className="text-xs text-slate-400">Date: {selectedDate}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categorySummaries.map((cat, idx) => {
                    const isExpanded = !!expandedCategories[cat.categoryKey];
                    return (
                      <React.Fragment key={cat.categoryKey}>
                        <TableRow className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <TableCell className="text-center font-bold text-slate-500 text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]" />
                              <span className="font-bold text-xs text-[#1e3a8a]">{cat.categoryLabel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-[#1e3a8a]/10 text-[#1e3a8a] font-bold text-xs px-2.5 py-0.5">
                              {cat.count} files
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-slate-900">
                            {formatCurrency(cat.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-14 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#1e3a8a] h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-600 min-w-[36px]">
                                {cat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {cat.subCategories.length > 1 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleCategoryExpand(cat.categoryKey)}
                                className="h-6 px-2 text-[10px] text-[#1e3a8a] hover:bg-[#1e3a8a]/10 font-bold"
                              >
                                {isExpanded ? "Hide" : `${cat.subCategories.length} Sub-Cats`}
                              </Button>
                            ) : (
                              <span className="text-[10px] text-slate-400">1 Sub-Cat</span>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Subcategories expansion */}
                        {isExpanded && cat.subCategories.map(sub => (
                          <TableRow key={sub.key} className="bg-slate-50/70 border-b border-slate-100/80 text-xs">
                            <TableCell />
                            <TableCell className="pl-8 text-slate-600 font-medium italic">
                              &bull; {sub.label}
                            </TableCell>
                            <TableCell className="text-center text-slate-600 font-medium">
                              {sub.count}
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-700 font-semibold">
                              {formatCurrency(sub.amount)}
                            </TableCell>
                            <TableCell className="text-right text-slate-500 text-[11px]">
                              {cat.totalAmount > 0 ? ((sub.amount / cat.totalAmount) * 100).toFixed(1) : 0}% of cat
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>

              {/* Grand Total Footer */}
              {categorySummaries.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs">
                    <td colSpan={2} className="p-3 text-right text-slate-800 tracking-wider uppercase font-bold">
                      Grand Total:
                    </td>
                    <td className="p-3 text-center text-[#1e3a8a] font-black">
                      {grandTotalCount} Files
                    </td>
                    <td className="p-3 text-right font-mono text-[#1e3a8a] font-black text-sm">
                      {formatCurrency(grandTotalAmount)}
                    </td>
                    <td className="p-3 text-right text-slate-700 font-bold">
                      100.0%
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
