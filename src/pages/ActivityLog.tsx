import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  User,
  FileEdit,
  FilePlus,
  Forward,
  Trash2,
  LogIn,
  LogOut,
  Download,
  AlertCircle,
  Eye,
  BarChart3,
  Wifi,
  Printer
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/hooks/useAppConfig';
import {
  ActivityLogEntry,
  UserStats,
  HourlyActivityStat,
  fetchActivityLogs,
  fetchUserStats,
  fetchOnlineUsers,
  fetchHourlyActivityStats
} from '@/hooks/useActivityLog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const DiffViewer = ({ before, after }: { before: any, after: any }) => {
  if (!before || !after) return null;

  const changes: { key: string; oldVal: string; newVal: string }[] = [];
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  allKeys.forEach(key => {
    // Skip noisy fields or internal states
    if (['history', 'file_image', 'is_dirty', 'updated_at', 'created_at'].includes(key)) return;

    const oldV = before[key];
    const newV = after[key];

    const oldStr = typeof oldV === 'object' ? JSON.stringify(oldV) : String(oldV ?? '');
    const newStr = typeof newV === 'object' ? JSON.stringify(newV) : String(newV ?? '');

    if (oldStr !== newStr) {
      changes.push({
        key: key.replace(/_/g, ' ').toUpperCase(),
        oldVal: oldStr === '' ? '(Empty)' : oldStr,
        newVal: newStr === '' ? '(Empty)' : newStr
      });
    }
  });

  if (changes.length === 0) {
    return <div className="text-white/50 text-xs italic bg-white/5 p-4 rounded-lg text-center border border-white/10">No visible changes recorded in tracked fields.</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Before Column */}
      <div className="space-y-2">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-t-lg flex items-center justify-between">
          <span>Before Change (Old Value)</span>
        </div>
        <ScrollArea className="h-64 bg-black/60 rounded-b-lg border border-white/5 border-t-0 p-4">
          <div className="space-y-4">
            {changes.map((c, i) => (
              <div key={`old-${i}`} className="space-y-1">
                <div className="text-[9px] text-rose-400/70 font-bold uppercase tracking-wider">{c.key}</div>
                <div className="text-xs font-mono text-rose-200 bg-rose-500/10 p-2 rounded border border-rose-500/20 break-words whitespace-pre-wrap">
                  {c.oldVal}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* After Column */}
      <div className="space-y-2">
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-t-lg flex items-center justify-between">
          <span>After Change (New Value)</span>
        </div>
        <ScrollArea className="h-64 bg-black/60 rounded-b-lg border border-white/5 border-t-0 p-4">
          <div className="space-y-4">
            {changes.map((c, i) => (
              <div key={`new-${i}`} className="space-y-1">
                <div className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-wider">{c.key}</div>
                <div className="text-xs font-mono text-emerald-200 bg-emerald-500/10 p-2 rounded border border-emerald-500/20 break-words whitespace-pre-wrap">
                  {c.newVal}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const PayloadViewer = ({ data }: { data: any }) => {
  if (!data) return null;
  const keys = Object.keys(data).filter(k => !['history', 'file_image', 'signature_data'].includes(k));
  
  if (keys.length === 0) {
    return <div className="text-white/50 text-xs italic bg-white/5 p-4 rounded-lg text-center border border-white/10">No structured data found.</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/[0.05] max-h-96 overflow-y-auto">
      {keys.map(k => (
        <div key={k} className="bg-black/20 p-2 rounded-lg border border-white/5">
          <Label className="text-[9px] text-white/40 uppercase tracking-widest block mb-1 font-bold">{k.replace(/_/g, ' ')}</Label>
          <div className="text-xs text-white/90 font-medium break-words">
            {typeof data[k] === 'object' ? JSON.stringify(data[k]) : String(data[k] || '---')}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function ActivityLog() {
  const { userRole, isAdmin } = useAuth();
  const isAdminUser = userRole === 'admin' || isAdmin;
  
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<UserStats[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyActivityStat[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // New Features State
  const [isLive, setIsLive] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
const [isPrinting, setIsPrinting] = useState(false);
const [isDuplicatePrint, setIsDuplicatePrint] = useState(false);
const printRef = useRef<HTMLDivElement>(null);

  // Filters
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, statsRes, onlineRes, hourlyRes] = await Promise.all([
        fetchActivityLogs({
          page,
          search,
          userRole: filterUser,
          action: filterAction,
          dateFrom: filterDateFrom,
          dateTo: filterDateTo,
          pageSize: 50
        }),
        fetchUserStats(),
        fetchOnlineUsers(),
        fetchHourlyActivityStats()
      ]);

      setLogs(logsRes.data);
      setTotalRecords(logsRes.total);
      setStats(statsRes);
      setOnlineUsers(onlineRes);
      setHourlyStats(hourlyRes);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load activity data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUser) {
      loadData();
    }
  }, [page, search, filterUser, filterAction, filterDateFrom, filterDateTo, isAdminUser]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!isAdminUser || !isLive) return;

    const channel = supabase.channel('public:activity_log')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        const newLog = payload.new as ActivityLogEntry;
        
        // Respect current filters for live appends
        if (filterUser !== 'all' && newLog.user_role !== filterUser) return;
        if (filterAction !== 'all' && newLog.action !== filterAction) return;
        
        setLogs(prev => [newLog, ...prev]);
        setTotalRecords(prev => prev + 1);
        
        toast.info(`New activity: ${newLog.action} by ${newLog.user_name}`, {
          description: newLog.subject || 'Action performed',
          duration: 3000,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, isAdminUser, filterUser, filterAction]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetchActivityLogs({
        search,
        userRole: filterUser,
        action: filterAction,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        pageSize: 10000 
      });

      if (res.data.length === 0) {
        toast.error("No records to export");
        return;
      }

      const headers = ['Date', 'Time', 'User Role', 'User Name', 'Action', 'Diary No', 'Receiving No', 'Subject', 'Details'];
      const csvContent = [
        headers.join(','),
        ...res.data.map(log => {
          const date = new Date(log.created_at);
          const detailsStr = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
          return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            `"${log.user_role}"`,
            `"${log.user_name}"`,
            log.action,
            `"${log.diary_number || ''}"`,
            `"${log.receiving_number || ''}"`,
            `"${(log.subject || '').replace(/"/g, '""')}"`,
            `"${detailsStr}"`
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `kwsc_activity_log_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Export successful');
    } catch (err) {
      console.error(err);
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleForceLogout = (targetName: string) => {
    if (!isAdminUser) return;
    
    supabase.channel('public:admin_commands').send({
      type: 'broadcast',
      event: 'force_logout',
      payload: { targetName }
    });
    
    toast.success(`Force logout command sent to ${targetName}`);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'REGISTER': return <FilePlus className="w-4 h-4" />;
      case 'EDIT': return <FileEdit className="w-4 h-4" />;
      case 'FORWARD': return <Forward className="w-4 h-4" />;
      case 'DELETE': return <Trash2 className="w-4 h-4" />;
      case 'LOGIN': return <LogIn className="w-4 h-4" />;
      case 'LOGOUT': return <LogOut className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActionSeverity = (action: string) => {
    switch (action) {
      case 'DELETE': return 'critical';
      case 'EDIT':
      case 'FORWARD': return 'warning';
      default: return 'info';
    }
  };

  const getActionBadgeColor = (action: string) => {
    const severity = getActionSeverity(action);
    switch (severity) {
      case 'critical': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
  };

    // Print handling function – swaps body content with printable container
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      // Reset state after printing
      setIsPrinting(false);
      setSelectedLog(null);
      setIsDuplicatePrint(false);
      // Force re-render to clear residual refs
      window.location.reload();
    }
  };

  if (!isAdminUser) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-black text-white">Access Denied</h2>
          <p className="text-white/60">You do not have permission to view the Activity Log.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1115]/80 p-6 rounded-[28px] border border-white/5 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-black flex items-center gap-3 text-white tracking-tighter">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            System Activity Log
          </h1>
          <p className="text-xs text-white/40 ml-14">
            Advanced monitoring, security tracking, and real-time activity streaming.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 px-3 py-1">
            <Wifi className={cn("w-4 h-4", isLive ? "text-emerald-400 animate-pulse" : "text-white/40")} />
            <Label htmlFor="live-mode" className="text-xs font-bold text-white uppercase tracking-wider cursor-pointer">
              Live Tail
            </Label>
            <Switch id="live-mode" checked={isLive} onCheckedChange={setIsLive} />
          </div>
          <div className="w-px h-6 bg-white/10"></div>
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10 text-xs h-8"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs h-8"
            onClick={handleExport}
            disabled={isExporting || logs.length === 0}
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2" />}
            Export
          </Button>
        </div>
      </div>

      {/* 24-Hour Activity Chart */}
      <Card className="border-white/10 bg-[#09090b]/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Activity Last 24 Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="hour" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                itemStyle={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold' }}
                labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                formatter={(v: number) => [v, 'Actions']} 
              />
              <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Stats & Online Users */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Online Users */}
          <Card className="border-white/10 bg-[#09090b]/50 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {onlineUsers.length > 0 ? (
                <div className="space-y-3">
                  {onlineUsers.map((ou, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-white/[0.02] p-2 rounded-lg border border-white/[0.05]">
                      <div className="flex items-center gap-2 truncate">
                        <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-white/80 font-medium truncate text-xs" title={ou.user_name}>{ou.user_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/40 whitespace-nowrap font-mono bg-black/40 px-1.5 py-0.5 rounded">
                          {new Date(ou.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0 text-rose-400/70 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                          onClick={() => handleForceLogout(ou.user_name)}
                          title="Force Logout User"
                        >
                          <LogOut className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40 text-center py-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">No active sessions right now.</p>
              )}
            </CardContent>
          </Card>

          {/* User Stats Leaderboard */}
          <Card className="border-white/10 bg-[#09090b]/50 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
                <Activity className="w-4 h-4 text-sky-400" />
                Top Active Users
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  {stats.slice(0, 10).map((s, idx) => (
                    <div key={idx} className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate pr-2">{s.user_name}</span>
                        <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[9px] font-mono">
                          {s.total} total
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1 flex flex-col items-center" title="Registered">
                          <span className="text-[9px] text-emerald-400 font-bold">{s.registers}</span>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-1 flex flex-col items-center" title="Forwarded">
                          <span className="text-[9px] text-blue-400 font-bold">{s.forwards}</span>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1 flex flex-col items-center" title="Edited">
                          <span className="text-[9px] text-amber-400 font-bold">{s.edits}</span>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded p-1 flex flex-col items-center" title="Deleted">
                          <span className="text-[9px] text-rose-400 font-bold">{s.deletes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.length === 0 && !isLoading && (
                    <p className="text-xs text-white/40 text-center py-4 bg-white/[0.02] rounded-lg border border-white/[0.05] m-4">No user stats available.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity Table */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-[#09090b]/50 border border-white/5 p-3 rounded-2xl backdrop-blur-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                placeholder="Search diary, subject, or user..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 bg-black/40 border-white/10 text-white h-9 text-xs rounded-xl focus:border-sky-500/50"
              />
            </div>
            
            <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-black/40 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1115] border-white/10 text-white">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="REGISTER">Register</SelectItem>
                <SelectItem value="FORWARD">Forward</SelectItem>
                <SelectItem value="EDIT">Edit</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="LOGOUT">Logout</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={v => { setFilterUser(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] h-9 text-xs bg-black/40 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1115] border-white/10 text-white">
                <SelectItem value="all">All Users</SelectItem>
                {stats.map(s => (
                  <SelectItem key={s.user_role} value={s.user_role}>{s.user_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filterDateFrom}
                onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }}
                className="w-32 h-9 text-xs bg-black/40 border-white/10 text-white rounded-xl"
                title="From Date"
              />
              <span className="text-white/40 text-xs">-</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={e => { setFilterDateTo(e.target.value); setPage(0); }}
                className="w-32 h-9 text-xs bg-black/40 border-white/10 text-white rounded-xl"
                title="To Date"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="border-white/10 bg-[#09090b]/50 backdrop-blur-md overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {isLoading && logs.length === 0 ? (
                <div className="flex items-center justify-center py-32 text-white/40">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-white/30">
                  <Activity className="w-12 h-12 mb-4 text-white/10" />
                  <p>No activity logs found matching criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-[10px] text-white/40 font-bold uppercase tracking-wider w-[120px]">Time</TableHead>
                        <TableHead className="text-[10px] text-white/40 font-bold uppercase tracking-wider w-[160px]">User</TableHead>
                        <TableHead className="text-[10px] text-white/40 font-bold uppercase tracking-wider w-[120px]">Action</TableHead>
                        <TableHead className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Context</TableHead>
                        <TableHead className="text-[10px] text-white/40 font-bold uppercase tracking-wider w-[100px] text-right">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => {
                        const d = new Date(log.created_at);
                        const severity = getActionSeverity(log.action);
                        return (
                          <TableRow 
                            key={log.id} 
                            className={cn(
                              "border-white/5 group transition-colors",
                              severity === 'critical' ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-white/[0.02]"
                            )}
                          >
                            <TableCell className="align-top py-4">
                              <div className="flex flex-col">
                                <span className="text-xs text-white/80 font-mono">
                                  {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-white/40 font-mono mt-0.5">
                                  {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white truncate max-w-[140px]" title={log.user_name}>
                                  {log.user_name}
                                </span>
                                <span className="text-[9px] text-white/40 font-mono mt-0.5">
                                  {log.user_role}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-4">
                              <Badge className={`text-[9px] uppercase font-bold tracking-widest flex items-center gap-1.5 w-max border ${getActionBadgeColor(log.action)}`}>
                                {getActionIcon(log.action)}
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top py-4">
                              <div className="space-y-1">
                                {(log.diary_number || log.receiving_number) && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {log.diary_number && (
                                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                                        D.No: {log.diary_number}
                                      </span>
                                    )}
                                    {log.receiving_number && (
                                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        R.No: {log.receiving_number}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {log.subject ? (
                                  <p className="text-xs text-white/70 font-medium truncate max-w-md" title={log.subject}>
                                    {log.subject}
                                  </p>
                                ) : (
                                  <p className="text-xs text-white/40 italic">No subject</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                                onClick={() => setSelectedLog(log)}
                                title="View Diff Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setIsPrinting(true);
                                  setTimeout(() => {
                                    handlePrint();
                                  }, 0);
                                }}
                                title="Print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            
            {/* Pagination footer */}
            {totalRecords > 0 && (
              <div className="border-t border-white/5 p-3 bg-black/20 flex items-center justify-between">
                <div className="text-[10px] text-white/40 font-mono">
                  Showing {page * 50 + 1} - {Math.min((page + 1) * 50, totalRecords)} of {totalRecords} records
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white/5 border-white/10 text-white rounded-lg hover:bg-white/10"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-white/5 border-white/10 text-white rounded-lg hover:bg-white/10"
                    disabled={(page + 1) * 50 >= totalRecords}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* DETAILED DIFF MODAL */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl bg-[#09090b] border-white/10 text-white">
          <DialogHeader className="border-b border-white/5 pb-4">
            <DialogTitle className="text-lg font-black flex items-center gap-3">
              <Badge className={getActionBadgeColor(selectedLog?.action || '')}>
                {getActionIcon(selectedLog?.action || '')}
                <span className="ml-1">{selectedLog?.action}</span>
              </Badge>
              Activity Details
            </DialogTitle>
            <CardDescription className="text-white/40 mt-1">
              By {selectedLog?.user_name} on {selectedLog ? new Date(selectedLog.created_at).toLocaleString() : ''}
            </CardDescription>
          </DialogHeader>

          <div className="pt-4 space-y-6">
            
            {/* Context Info */}
            <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/[0.05]">
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Diary No</Label>
                <div className="text-sm font-mono font-bold text-sky-400">{selectedLog?.diary_number || 'N/A'}</div>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Receiving No</Label>
                <div className="text-sm font-mono font-bold text-emerald-400">{selectedLog?.receiving_number || 'N/A'}</div>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1">Subject</Label>
                <div className="text-sm text-white/90">{selectedLog?.subject || 'N/A'}</div>
              </div>
            </div>

            {/* Diff Viewer */}
            <div>
              <Label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2">Payload Data (JSON)</Label>
              
              {selectedLog?.details && (selectedLog.details.before !== undefined || selectedLog.details.after !== undefined) ? (
                // Human Readable Diff View
                <DiffViewer before={selectedLog.details.before} after={selectedLog.details.after || selectedLog.details} />
              ) : (
                // Nicely formatted Payload View
                <PayloadViewer data={selectedLog?.details} />
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>
{/* Printable container – hidden on screen, visible only during print */}
<div className={`print-only hidden ${isPrinting ? '' : 'no-print'}`}>
  <div ref={printRef} className="p-6 font-sans text-black bg-white min-h-[210mm] w-[148mm] mx-auto relative overflow-hidden">
    {isDuplicatePrint && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <div className="text-[100px] font-black uppercase text-gray-500/40 -rotate-45 select-none">
          DUPLICATE
        </div>
      </div>
    )}
    {/* Printable content – reuse details from selectedLog */}
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{selectedLog?.action} Details</h2>
      <p className="text-sm">User: {selectedLog?.user_name} ({selectedLog?.user_role})</p>
      <p className="text-sm">Date: {selectedLog ? new Date(selectedLog.created_at).toLocaleString() : ''}</p>
      <p className="text-sm">Diary No: {selectedLog?.diary_number || 'N/A'}</p>
      <p className="text-sm">Receiving No: {selectedLog?.receiving_number || 'N/A'}</p>
      <p className="text-sm">Subject: {selectedLog?.subject || 'N/A'}</p>
      {selectedLog?.details && (selectedLog.details.before !== undefined || selectedLog.details.after !== undefined) ? (
        <DiffViewer before={selectedLog.details.before} after={selectedLog.details.after || selectedLog.details} />
      ) : (
        <PayloadViewer data={selectedLog?.details} />
      )}
    </div>
  </div>
</div>
    </div>
  );
}
