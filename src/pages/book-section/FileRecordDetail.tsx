import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileSearch,
  User,
  FileText,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  MapPin,
  MessageSquare,
  Loader2,
  Hash,
  Banknote,
  Tag,
  Layers,
  Car,
  Receipt,
  BadgeCheck,
  History,
  Printer,
  Download,
} from "lucide-react";

const sections: Record<string, string> = {
  cfo: "CFO",
  cia: "CIA",
  budget: "BUDGET",
  pension: "PENSION",
  fund: "FUND",
  internal_audit_1: "INTERNAL AUDIT-1",
  director_account: "DIRECTOR ACCOUNT",
  director_finance: "DIRECTOR FINANCE",
  director_it: "DIRECTOR IT",
  sub_cfo: "ASST. CFO",
  books: "BOOKS",
  establishment: "ESTABLISHMENT",
  director_audit: "DIRECTOR AUDIT",
  internal_audit_2: "INTERNAL AUDIT-2",
  law_department: "LAW DEPARTMENT",
  chro: "CHRO",
  md_office: "MD OFFICE",
};

const subCatReadable = (val: string | null | undefined) => {
  if (!val) return "---";
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const DetailRow = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
}) => (
  <div className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        accent || "bg-[#14b8a6]/10 text-[#14b8a6]"
      }`}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-0.5 print:text-gray-500">
        {label}
      </p>
      <div className="text-sm font-semibold text-white/90 break-words print:text-black">
        {value || <span className="text-white/20 italic text-xs print:text-gray-400">Not provided</span>}
      </div>
    </div>
  </div>
);

export default function FileRecordDetail() {
  const { receivingNo } = useParams<{ receivingNo: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("file_tracking_records" as any)
          .select("*")
          .eq("receiving_number", receivingNo)
          .maybeSingle();

        if (!error && data) {
          setRecord({
            ...(data as any),
            mainCategory: (data as any).main_category,
            subCategory: (data as any).sub_category,
          });
        }
      } catch (err) {
        console.error("Error fetching record:", err);
      } finally {
        setLoading(false);
      }
    };
    if (receivingNo) fetchRecord();
  }, [receivingNo]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-white/40">
        <Loader2 className="w-10 h-10 animate-spin text-[#14b8a6]" />
        <p className="text-xs font-black uppercase tracking-widest">
          Loading Record...
        </p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-white/40">
        <FileSearch className="w-14 h-14 opacity-20" />
        <h2 className="text-lg font-black uppercase tracking-wider">
          Record Not Found
        </h2>
        <p className="text-xs">
          No file found with Ref No:{" "}
          <span className="font-mono text-[#14b8a6]">{receivingNo}</span>
        </p>
        <Button
          variant="outline"
          className="mt-4 gap-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const history: any[] = record.history || [];

  return (
    <div className="space-y-6 animate-fade-in pb-16 print:pb-0 print-only print:bg-white print:text-black">
      {/* ── Back Bar ── */}
      <div className="flex items-center justify-between no-print">
        <Button
          variant="ghost"
          className="gap-2 text-white/50 hover:text-white hover:bg-white/5 font-bold text-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tracking
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 px-4 gap-2 border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-black"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="bg-[#0f1115]/80 p-6 rounded-[28px] border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-transparent print:border-black/20 print:shadow-none print:text-black">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#14b8a6]/10 border border-[#14b8a6]/20 flex items-center justify-center print:border-black/20">
            <FileSearch className="w-6 h-6 text-[#14b8a6]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1 print:text-gray-500">
              File Record Detail
            </p>
            <h1 className="text-xl font-black text-white tracking-tight leading-tight print:text-black">
              {record.subject || "—"}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge className="bg-[#14b8a6]/15 text-[#14b8a6] border border-[#14b8a6]/20 font-mono text-xs px-3 py-1.5 rounded-xl print:border-black/20 print:text-black">
            {record.cfo_diary_number || "—"}
          </Badge>
          <Badge className="bg-white/5 text-white/50 border border-white/10 font-mono text-xs px-3 py-1.5 rounded-xl print:border-black/20 print:text-black">
            {record.receiving_number || "—"}
          </Badge>
          <Badge
            className={`text-xs px-3 py-1.5 rounded-xl font-black uppercase tracking-wide ${
              record.mark_to
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {record.mark_to ? sections[record.mark_to] || record.mark_to : "Registered"}
          </Badge>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Info Card */}
          <div className="bg-[#0f1115]/80 rounded-[24px] border border-white/5 shadow-xl overflow-hidden print:bg-transparent print:border-black/20 print:shadow-none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 print:border-black/20">
              <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#14b8a6]" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white/60 print:text-black">
                File Information
              </h2>
            </div>
            <div className="px-6 divide-y divide-white/5 print:divide-black/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <DetailRow
                  icon={<Hash className="w-4 h-4" />}
                  label="CFO Diary Number"
                  value={
                    <span className="font-mono text-[#14b8a6] font-black">
                      {record.cfo_diary_number}
                    </span>
                  }
                />
                <DetailRow
                  icon={<Hash className="w-4 h-4" />}
                  label="Receiving / Ref Number"
                  value={
                    <span className="font-mono text-white/70">
                      {record.receiving_number}
                    </span>
                  }
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Inward Date"
                  value={
                    record.inward_date
                      ? new Date(record.inward_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : null
                  }
                />
                <DetailRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Outward Date"
                  value={
                    record.outward_date
                      ? new Date(record.outward_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : null
                  }
                />
                <DetailRow
                  icon={<Clock className="w-4 h-4" />}
                  label="Registered At"
                  value={
                    record.created_at
                      ? new Date(record.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null
                  }
                />
                <DetailRow
                  icon={<Banknote className="w-4 h-4" />}
                  label="Amount"
                  value={
                    <span className="text-[#14b8a6] font-black text-base">
                      {formatCurrency(record.amount || 0)}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* Party & Category Card */}
          <div className="bg-[#0f1115]/80 rounded-[24px] border border-white/5 shadow-xl overflow-hidden print:bg-transparent print:border-black/20 print:shadow-none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 print:border-black/20">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center print:border-black/20">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white/60 print:text-black">
                Party & Category
              </h2>
            </div>
            <div className="px-6 divide-y divide-white/5 print:divide-black/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <DetailRow
                  icon={<User className="w-4 h-4" />}
                  label="Received From"
                  accent="bg-blue-500/10 text-blue-400"
                  value={record.received_from}
                />
                <DetailRow
                  icon={<Building2 className="w-4 h-4" />}
                  label="Forwarded / Marked To"
                  accent="bg-blue-500/10 text-blue-400"
                  value={
                    record.mark_to ? (
                      <span className="uppercase font-black text-blue-400">
                        {sections[record.mark_to] || record.mark_to}
                      </span>
                    ) : null
                  }
                />
                <DetailRow
                  icon={<Tag className="w-4 h-4" />}
                  label="Main Category"
                  accent="bg-purple-500/10 text-purple-400"
                  value={
                    record.mainCategory ? (
                      <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/20 uppercase text-[10px] font-black px-2 py-0.5 rounded-lg">
                        {subCatReadable(record.mainCategory)}
                      </Badge>
                    ) : null
                  }
                />
                <DetailRow
                  icon={<Layers className="w-4 h-4" />}
                  label="Sub Category"
                  accent="bg-purple-500/10 text-purple-400"
                  value={
                    record.subCategory ? (
                      <Badge className="bg-purple-500/10 text-purple-300/70 border border-purple-500/10 uppercase text-[10px] font-black px-2 py-0.5 rounded-lg">
                        {subCatReadable(record.subCategory)}
                      </Badge>
                    ) : null
                  }
                />
              </div>
            </div>
          </div>

          {/* Extra Fields Card */}
          {(record.employee_number || record.voucher_code || record.vehicle_no || record.remarks) && (
            <div className="bg-[#0f1115]/80 rounded-[24px] border border-white/5 shadow-xl overflow-hidden print:bg-transparent print:border-black/20 print:shadow-none">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 print:border-black/20">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white/60 print:text-black">
                  Additional Details
                </h2>
              </div>
              <div className="px-6 divide-y divide-white/5 print:divide-black/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {record.employee_number && (
                    <DetailRow
                      icon={<BadgeCheck className="w-4 h-4" />}
                      label="Employee Number"
                      accent="bg-amber-500/10 text-amber-400"
                      value={
                        <span className="font-mono text-amber-400">
                          {record.employee_number}
                        </span>
                      }
                    />
                  )}
                  {record.voucher_code && (
                    <DetailRow
                      icon={<Receipt className="w-4 h-4" />}
                      label="Voucher Code"
                      accent="bg-amber-500/10 text-amber-400"
                      value={
                        <span className="font-mono text-amber-400">
                          {record.voucher_code}
                        </span>
                      }
                    />
                  )}
                  {record.vehicle_no && (
                    <DetailRow
                      icon={<Car className="w-4 h-4" />}
                      label="Vehicle Number"
                      accent="bg-amber-500/10 text-amber-400"
                      value={record.vehicle_no}
                    />
                  )}
                  {record.remarks && (
                    <div className="col-span-2">
                      <DetailRow
                        icon={<MessageSquare className="w-4 h-4" />}
                        label="Remarks"
                        accent="bg-amber-500/10 text-amber-400"
                        value={
                          <span className="italic text-white/50">{record.remarks}</span>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Timeline + QR */}
        <div className="space-y-6">
          {/* QR Code */}
          <div className="bg-[#0f1115]/80 rounded-[24px] border border-white/5 shadow-xl p-6 flex flex-col items-center gap-4 print:bg-transparent print:border-black/20 print:shadow-none">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 print:text-black">
              Scan to Track
            </p>
            <div className="bg-white p-3 rounded-2xl shadow-lg shadow-[#14b8a6]/10">
              <div className="relative inline-flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    `${window.location.origin}/public-track/${record.cfo_diary_number}/${record.receiving_number}`
                  )}&color=0f1115`}
                  alt="QR"
                  className="w-28 h-28 rounded-lg"
                />
                {/* Central KWSC Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img
                    src="/kwsc-watermark-logo.png"
                    alt="KWSC Watermark"
                    className="w-8 h-8 object-contain bg-white rounded-full p-0.5 shadow-md border-2 border-blue-900/40"
                  />
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-white/60 print:text-black">
                {record.cfo_diary_number}
              </p>
              <p className="text-[10px] text-white/30 print:text-black">{record.receiving_number}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#0f1115]/80 rounded-[24px] border border-white/5 shadow-xl overflow-hidden print:bg-transparent print:border-black/20 print:shadow-none">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 print:border-black/20">
              <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
                <History className="w-4 h-4 text-[#14b8a6]" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white/60 print:text-black">
                Movement History
              </h2>
              <Badge className="ml-auto bg-[#14b8a6]/10 text-[#14b8a6] border border-[#14b8a6]/20 text-[10px] font-black px-2 py-0.5 print:border-black/20 print:text-black">
                {history.length} steps
              </Badge>
            </div>

            <div className="p-5">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-white/20">
                  <History className="w-10 h-10 opacity-20 mb-2" />
                  <p className="text-xs font-bold">No movement history yet</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Vertical line */}
                  <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#14b8a6]/50 via-[#14b8a6]/20 to-transparent rounded-full" />

                  {history.map((step: any, index: number) => {
                    const isLast = index === history.length - 1;
                    return (
                      <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Dot */}
                        <div
                          className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                            isLast
                              ? "bg-[#14b8a6] border-[#14b8a6] text-[#0f1115] shadow-lg shadow-[#14b8a6]/30"
                              : "bg-[#0f1115] border-[#14b8a6]/30 text-[#14b8a6]/60"
                          }`}
                        >
                          {isLast ? (
                            <MapPin className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div
                          className={`flex-1 p-3.5 rounded-2xl border transition-all ${
                            isLast
                              ? "bg-[#14b8a6]/10 border-[#14b8a6]/20"
                              : "bg-white/3 border-white/5"
                          } print:bg-transparent print:border-black/20`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p
                              className={`text-xs font-black uppercase tracking-tight ${
                                isLast ? "text-[#14b8a6]" : "text-white/70"
                              } print:text-black`}
                            >
                              {step.processed_by || step.action || `Step ${index + 1}`}
                            </p>
                            {isLast && (
                              <Badge className="bg-[#14b8a6]/20 text-[#14b8a6] border-none text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                Current
                              </Badge>
                            )}
                          </div>

                          {step.mark_to && (
                            <p className="text-[10px] text-white/40 font-bold uppercase mb-1 print:text-gray-600">
                              → {sections[step.mark_to] || step.mark_to}
                            </p>
                          )}

                          {step.action && (
                            <Badge className="mb-1.5 bg-white/5 text-white/40 border-white/10 text-[9px] font-black px-1.5 py-0.5 rounded-md print:border-black/20 print:text-black">
                              {step.action}
                            </Badge>
                          )}

                          {step.remarks && (
                            <p className="text-[10px] text-white/40 italic leading-relaxed mt-1 bg-white/3 px-2 py-1.5 rounded-lg border border-white/5 print:bg-transparent print:border-black/10 print:text-gray-800">
                              "{step.remarks}"
                            </p>
                          )}

                          {step.date && (
                            <p className="text-[9px] text-white/20 font-mono mt-1.5">
                              {new Date(step.date).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
