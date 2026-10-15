import React from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Menu, LayoutDashboard, Shield, Landmark, Wallet, Megaphone, MessageCircle, Users, Settings2, Activity, BarChart3, LogOut, ChevronRight, Lock, Plus, ListTree, Search, Stethoscope, Briefcase, FileText, AlertCircle, ArrowLeftRight, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function MobileMenu({ children }: { children?: React.ReactNode }) {
  const { userRole, isAdmin, userName, isTransferUser, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openCategory, setOpenCategory] = React.useState<string | null>(null);

  const isCFORole = userRole === 'cfo' || userRole === 'admin' || userRole === 'sub_cfo' || userRole?.startsWith('sub_cfo_') || isAdmin;
  const isRestrictedAsstCFO = userRole?.startsWith('sub_cfo_') && userRole !== 'sub_cfo';
  const isEmpOperator = userRole === 'emp_operator';
  const isHRMSEmployee = userRole === 'hrms_employee';

  const topNavItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", visible: !isRestrictedAsstCFO && !isEmpOperator && !isTransferUser && !isHRMSEmployee },
    { to: "/book-section/file-tracking", icon: Shield, label: "File Tracking", visible: !isEmpOperator && !isTransferUser && !isHRMSEmployee },
    { to: "/bank-entries", icon: Landmark, label: "Bank Entries", visible: !isEmpOperator && !isTransferUser && !isHRMSEmployee },
    { to: "/budget-control", icon: Wallet, label: "Budget Control", visible: (userRole === 'admin' || userRole === 'super_admin' || userRole === 'cfo') && !isTransferUser && !isHRMSEmployee },
    { to: "/notice-board", icon: Megaphone, label: "Notice Board", visible: !isTransferUser && !isHRMSEmployee },
    { to: "/messages", icon: MessageCircle, label: "Messages", visible: !isTransferUser && !isHRMSEmployee },
    { to: "/user-management", icon: Users, label: "User Management", visible: (userRole === 'admin' || userRole === 'super_admin') && !isTransferUser && !isHRMSEmployee },
    { to: "/admin-config", icon: Settings2, label: "Admin Config", visible: (userRole === 'admin' || userRole === 'super_admin') && !isTransferUser && !isHRMSEmployee },
    { to: "/activity-log", icon: Activity, label: "Activity Log", visible: !isTransferUser && !isHRMSEmployee },
    { to: "/file-analytics", icon: BarChart3, label: "File Analytics", visible: (userRole === 'admin' || userRole === 'super_admin' || userRole === 'cfo') && !isTransferUser && !isHRMSEmployee },
  ].filter(item => item.visible);

  const categories = [];

  if (!isRestrictedAsstCFO && !isEmpOperator && !isTransferUser && !isHRMSEmployee) {
    categories.push({
      id: "collection", label: "Collection Operations",
      items: [
        { to: "/restricted", icon: Lock, label: "Restrict Dashboard" },
        { to: "/collection-entry", icon: Plus, label: "Collection Entry" }
      ]
    });
  }

  if ((userRole || isAdmin) && !isRestrictedAsstCFO && !isTransferUser && !isHRMSEmployee) {
    categories.push({
      id: "sections", label: "Sections Management",
      items: [
        { to: "/book-section/emp-details", label: "Employee Details", icon: ListTree, visible: isCFORole || isEmpOperator },
        { to: "/book-section/all-employees", label: "Search All Employees", icon: Search, visible: isCFORole || isEmpOperator },
        { to: "/book-section/medical", label: "Medical Section", icon: Stethoscope, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/contractor", label: "Contractor Section", icon: Briefcase, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/security-deposit", label: "Security Deposit", icon: Lock, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/pol-bills", label: "POL Bills", icon: FileText, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/contingencies", label: "Contingencies", icon: AlertCircle, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/books", label: "Books", icon: BookOpen, visible: (isCFORole || userRole === 'books') && !isEmpOperator },
        { to: "/book-section/establishment", label: "Establishment", icon: Users, visible: (isCFORole || userRole === 'establishment') && !isEmpOperator },
      ].filter(item => item.visible)
    });
  }

  if (isCFORole || isAdmin || isHRMSEmployee) {
    categories.push({
      id: "hrms", label: "HRMS System",
      items: [
        { to: "/hrms/dashboard", icon: LayoutDashboard, label: "HR Dashboard" },
        { to: "/hrms/employees", icon: Users, label: "Employees" },
        { to: "/hrms/attendance", icon: Activity, label: "Attendance" },
        { to: "/hrms/leaves", icon: Shield, label: "Leave Management" },
        { to: "/hrms/payroll", icon: Wallet, label: "Payroll" },
      ]
    });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <div className="w-10 h-10 bg-white border border-slate-100 rounded-[1.25rem] flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
            <Menu className="w-5 h-5 text-slate-700" />
          </div>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px] bg-white border-r border-slate-100 flex flex-col">
        <SheetHeader className="p-5 border-b border-slate-100 flex-row items-center gap-3 space-y-0 text-left">
          <img src="/kwsc-logo.png" alt="KWSC" className="w-10 h-10 object-contain" />
          <div>
            <SheetTitle className="text-[13px] font-black text-slate-800 leading-tight">KW&SC MENU</SheetTitle>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{userName || 'Citizen / Employee'}</p>
          </div>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <div className="space-y-1">
              {topNavItems.map((item) => (
                <Link key={item.to} to={item.to} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                  location.pathname === item.to ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                )}>
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm">{item.label}</span>
                </Link>
              ))}
            </div>

            {categories.map((category) => (
              category.items.length > 0 && (
                <div key={category.id} className="pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                    className="w-full flex items-center justify-between px-3 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                  >
                    {category.label}
                    <ChevronRight className={cn("w-4 h-4 transition-transform", openCategory === category.id && "rotate-90")} />
                  </button>
                  <AnimatePresence>
                    {openCategory === category.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="space-y-1 overflow-hidden">
                        {category.items.map((item) => (
                          <Link key={item.to} to={item.to} className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                            location.pathname === item.to ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                          )}>
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="font-bold text-sm">{item.label}</span>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t border-slate-100 space-y-2 shrink-0 bg-slate-50/50">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-all font-bold text-sm">
            <Settings2 className="w-5 h-5 shrink-0" />
            Profile Settings
          </Link>
          {userRole && (
            <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-bold text-sm">
              <LogOut className="w-5 h-5 shrink-0" />
              Logout
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
