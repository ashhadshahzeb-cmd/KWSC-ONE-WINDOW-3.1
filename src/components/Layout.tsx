import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Shield, 
  Lock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon,
  ListTree,
  Stethoscope,
  Briefcase,
  FileText,
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  Users,
  Search,
  Landmark,
  Settings2,
  Activity,
  MessageCircle,
  BarChart3,
  Wallet,
  Megaphone
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import NotificationListener from "@/components/NotificationListener";
import SpyListener from "@/components/SpyListener";
import OfflineIndicator from "@/components/OfflineIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { useAutoLogout } from "@/hooks/useAutoLogout";

import { NotificationDropdown } from "@/components/NotificationDropdown";

const Layout = ({ children }: { children: React.ReactNode }) => {
  // useAutoLogout();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>("book-section");
  const location = useLocation();
  const { signOut, userRole, isAdmin, userName, isTransferUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const mainRef = useRef<HTMLDivElement>(null);

  const isCFORole = userRole === 'cfo' || userRole === 'admin' || userRole === 'sub_cfo' || userRole?.startsWith('sub_cfo_') || isAdmin;
  const isRestrictedAsstCFO = userRole?.startsWith('sub_cfo_') && userRole !== 'sub_cfo';
  const isEmpOperator = userRole === 'emp_operator';
  const isHRMSEmployee = userRole === 'hrms_employee';

  const [showSplash, setShowSplash] = useState(() => {
    if (!isCFORole) return false;
    return true;
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const topNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", visible: !isRestrictedAsstCFO && !isEmpOperator && !isTransferUser && !isHRMSEmployee },
    { to: "/book-section/file-tracking", icon: Shield, label: "File Tracking", visible: !isEmpOperator && !isTransferUser && !isHRMSEmployee },
    { to: "/bank-entries", icon: Landmark, label: "Bank Entries", visible: !isEmpOperator && !isTransferUser && !isHRMSEmployee },
    { to: "/budget-control", icon: Wallet, label: "Budget Control", visible: (userRole === 'admin' || userRole === 'super_admin' || userRole === 'cfo') && !isTransferUser && !isHRMSEmployee },
    { to: "/notice-board", icon: Megaphone, label: "Notice Board", visible: !isTransferUser && !isHRMSEmployee },
    { to: "/messages", icon: MessageCircle, label: "Messages", visible: !isTransferUser && !isHRMSEmployee },
    { to: "/user-management", icon: Users, label: "User Management", visible: (userRole === 'admin' || userRole === 'super_admin') && !isTransferUser && !isHRMSEmployee },
    { to: "/admin-config", icon: Settings2, label: "Admin Config", visible: (userRole === 'admin' || userRole === 'super_admin') && !isTransferUser && !isHRMSEmployee },
    { to: "/activity-log", icon: Activity, label: "Activity Log", visible: !isTransferUser && !isHRMSEmployee },
    { to: "/file-analytics", icon: BarChart3, label: "File Analytics", visible: (userRole === 'admin' || userRole === 'super_admin' || userRole === 'cfo') && !isTransferUser && !isHRMSEmployee },
    { to: "/revenue-collection", icon: BarChart3, label: "Revenue Dashboard", visible: (userRole === 'admin' || userRole === 'super_admin' || userRole === 'cfo') && !isTransferUser && !isHRMSEmployee },
  ].filter(item => item.visible);

  const categories = [];

  if (!isRestrictedAsstCFO && !isEmpOperator && !isTransferUser && !isHRMSEmployee) {
    categories.push({
      id: "collection-operations",
      label: "Collection Operations",
      items: [
        { to: "/restricted", icon: Lock, label: "Restrict Dashboard", visible: true },
        { to: "/collection-entry", icon: Plus, label: "Collection Entry", visible: true },
      ].filter(item => item.visible)
    });
  }

  if ((userRole || isAdmin) && !isRestrictedAsstCFO && !isTransferUser && !isHRMSEmployee) {
    categories.push({
      id: "book-section",
      label: "Sections Management",
      items: [
        { to: "/book-section/emp-details", label: "Employee Details", icon: ListTree, visible: isCFORole || isEmpOperator },
        { to: "/book-section/all-employees", label: "Search All Employees", icon: Search, visible: isCFORole || isEmpOperator },
        { to: "/book-section/medical", label: "Medical Section", icon: Stethoscope, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/contractor", label: "Contractor Section", icon: Briefcase, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/vendor-creation", label: "Vendor Creation", icon: Users, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/security-deposit", label: "Security Deposit", icon: Lock, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/pol-bills", label: "POL Bills", icon: FileText, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/contingencies", label: "Contingencies", icon: AlertCircle, visible: isCFORole && !isEmpOperator },
        { to: "/book-section/bill-dispatch", label: "Bill Dispatch", icon: ArrowLeftRight, visible: false },
        { to: "/book-section/books", label: "Books", icon: BookOpen, visible: (isCFORole || userRole === 'books') && !isEmpOperator },
        { to: "/book-section/establishment", label: "Establishment", icon: Users, visible: (isCFORole || userRole === 'establishment') && !isEmpOperator },
      ].filter(item => item.visible)
    });
  }

  if ((isAdmin || isTransferUser) && !isHRMSEmployee) {
    categories.push({
      id: "transfer-operations",
      label: "Transfer Operations",
      items: [
        { to: "/book-section/transfer-advice", icon: ArrowLeftRight, label: "Transfer Advice", visible: true },
        { to: "/book-section/transfer-advice-records", icon: ListTree, label: "Transfer Records", visible: true },
      ].filter(item => item.visible)
    });
  }

  if (isCFORole || isAdmin || isHRMSEmployee) {
    categories.push({
      id: "hrms-system",
      label: "HRMS System",
      items: [
        { to: "/hrms/dashboard", icon: LayoutDashboard, label: "HR Dashboard", visible: true },
        { to: "/hrms/employees", icon: Users, label: "Employees", visible: isCFORole || isAdmin },
        { to: "/hrms/attendance", icon: Activity, label: "Attendance", visible: true },
        { to: "/hrms/leaves", icon: Shield, label: "Leave Management", visible: true },
        { to: "/hrms/payroll", icon: Wallet, label: "Payroll", visible: true },
      ].filter(item => item.visible)
    });
  }

  const sections = [
    { id: 'emp_details', name: 'Employee Details' },
    { id: 'medical', name: 'Medical Section' },
    { id: 'contractor', name: 'Contractor Section' },
    { id: 'security_deposit', name: 'Security Deposit' },
    { id: 'pol_bills', name: 'POL Bills' },
    { id: 'contingencies', name: 'Contingencies' },
    { id: 'bill_dispatch', name: 'Bill Dispatch' },
    { id: 'books', name: 'Books' },
    { id: 'establishment', name: 'Establishment' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden relative font-sans antialiased">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="hidden md:flex flex-col bg-black/90 backdrop-blur-3xl border-r border-white/10 relative z-30 transition-all duration-300"
      >
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img src="/kwsc-logo.png" alt="KWSC" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              <span className="font-bold text-lg tracking-tight text-white">KW&SC FINANCE</span>
            </div>
          )}
          {collapsed && (
            <img src="/kwsc-logo.png" alt="KWSC" className="w-8 h-8 object-contain mx-auto" />
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={() => setCollapsed(!collapsed)} className="mt-4 mx-auto p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <ScrollArea className="flex-1 px-4 py-6 custom-scrollbar">
          <div className="space-y-6">

            <div className="space-y-1">
              {topNavItems.map((item) => (
                <motion.div key={item.to} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                  <Link to={item.to} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                    location.pathname === item.to ? "bg-white/10 text-white shadow-md shadow-black/50" : "text-white/50 hover:text-white hover:bg-white/5"
                  )}>
                    {location.pathname === item.to && (
                      <motion.div layoutId="main-sidebar-active" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                    )}
                    <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", location.pathname === item.to ? "text-blue-400" : "group-hover:text-white")} />
                    {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </Link>
                </motion.div>
              ))}
            </div>

            {categories.map((category) => (
              <div key={category.id} className="pt-4 border-t border-white/10">
                {!collapsed && (
                  <button 
                    onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                    className="w-full flex items-center justify-between px-3 mb-2 text-xs font-bold text-blue-400 uppercase tracking-wider hover:text-blue-300 transition-colors"
                  >
                    {category.label}
                    <motion.div
                      animate={{ rotate: openCategory === category.id ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </motion.div>
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {(openCategory === category.id || collapsed) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-1 overflow-hidden mt-2"
                    >
                      {category.items.map((item) => (
                        <motion.div key={item.to} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                          <Link to={item.to} className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                            location.pathname === item.to ? "bg-white/10 text-white border border-white/5 shadow-md shadow-black/50" : "text-white/50 hover:text-white hover:bg-white/5"
                          )}>
                            {location.pathname === item.to && (
                              <motion.div layoutId="main-sidebar-active" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                            )}
                            <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", location.pathname === item.to ? "text-blue-400" : "group-hover:text-white")} />
                            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/10 space-y-2">
          <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
            <Link to="/profile" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all">
              <Settings2 className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">Profile Settings</span>}
            </Link>
          </motion.div>
          <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
            <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all">
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="font-medium">Logout</span>}
            </button>
          </motion.div>
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all hidden">
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {!collapsed && <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="flex h-16 items-center justify-between px-4 md:px-8 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 flex flex-col bg-[#111] border-r border-white/10">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="p-6 flex items-center gap-3 border-b border-white/10">
                    <img src="/kwsc-logo.png" alt="KWSC" className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className="font-bold text-lg tracking-tight text-white">KW&SC FINANCE</span>
                  </div>
                  
                  <ScrollArea className="flex-1 px-4 py-6">
                    <div className="space-y-6">
                      <div className="space-y-1">
                        {topNavItems.map((item) => (
                          <Link key={item.to} to={item.to} className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                            location.pathname === item.to ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}>
                            <item.icon className="w-5 h-5 shrink-0" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        ))}
                      </div>

                      {categories.map((category) => (
                        <div key={category.id} className="pt-4 border-t border-white/10">
                          <button 
                            onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                            className="w-full flex items-center justify-between px-3 mb-2 text-xs font-semibold text-blue-400 uppercase tracking-wider hover:text-blue-300 transition-colors"
                          >
                            {category.label}
                            <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", openCategory === category.id && "rotate-90")} />
                          </button>
                          <div className={cn(
                            "space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                            openCategory === category.id ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
                          )}>
                            {category.items.map((item) => (
                              <Link key={item.to} to={item.to} className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                                location.pathname === item.to ? "bg-white/10 text-white border border-white/5" : "text-white/50 hover:text-white hover:bg-white/5"
                              )}>
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className="font-medium text-sm">{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t border-white/10 space-y-2">
                    <Link to="/profile" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all">
                      <Settings2 className="w-5 h-5 shrink-0" />
                      <span className="font-medium">Profile Settings</span>
                    </Link>
                    <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all">
                      <LogOut className="w-5 h-5 shrink-0" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <div className="flex flex-col">
              <h2 className="text-xs md:text-sm font-medium text-white/50">Welcome back,</h2>
              <p className="text-sm md:text-lg font-black text-blue-400 italic uppercase tracking-wider">
                {userName || sections.find(s => s.id === userRole)?.name || userRole}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] md:text-xs font-bold uppercase tracking-tighter">
              {userRole === 'admin' ? 'System Administrator' : 'Active Department'}
            </div>
            <NotificationDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#111] relative custom-scrollbar">
          <OfflineIndicator />
          <NotificationListener />
          <SpyListener />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full min-h-full p-4 md:p-8 pb-28 md:pb-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 safe-area-pb">
        <nav className="flex justify-around items-center bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {!isEmpOperator ? (
            <>
              <Link to="/" className="flex-1 relative">
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center gap-1 py-3">
                  {location.pathname === "/" && (
                    <motion.div layoutId="mobile-main-active" className="absolute inset-0 bg-white/10 rounded-3xl -z-10" transition={{ type: "spring", bounce: 0, duration: 0.2 }} />
                  )}
                  <LayoutDashboard className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/" ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/40")} strokeWidth={location.pathname === "/" ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-bold transition-all duration-300", location.pathname === "/" ? "text-white" : "text-transparent")}>Home</span>
                </motion.div>
              </Link>

              <Link to="/book-section/file-tracking" className="flex-1 relative">
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center gap-1 py-3">
                  {location.pathname === "/book-section/file-tracking" && (
                    <motion.div layoutId="mobile-main-active" className="absolute inset-0 bg-white/10 rounded-3xl -z-10" transition={{ type: "spring", bounce: 0, duration: 0.2 }} />
                  )}
                  <Shield className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/book-section/file-tracking" ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/40")} strokeWidth={location.pathname === "/book-section/file-tracking" ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-bold transition-all duration-300", location.pathname === "/book-section/file-tracking" ? "text-white" : "text-transparent")}>Tracking</span>
                </motion.div>
              </Link>
              
              <Link to="/restricted" className="flex-1 relative">
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center gap-1 py-3">
                  {location.pathname === "/restricted" && (
                    <motion.div layoutId="mobile-main-active" className="absolute inset-0 bg-white/10 rounded-3xl -z-10" transition={{ type: "spring", bounce: 0, duration: 0.2 }} />
                  )}
                  <Lock className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/restricted" ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/40")} strokeWidth={location.pathname === "/restricted" ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-bold transition-all duration-300", location.pathname === "/restricted" ? "text-white" : "text-transparent")}>Admin</span>
                </motion.div>
              </Link>
            </>
          ) : (
            <>
              <Link to="/book-section/emp-details" className="flex-1 relative">
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center gap-1 py-3">
                  {location.pathname === "/book-section/emp-details" && (
                    <motion.div layoutId="mobile-main-active" className="absolute inset-0 bg-white/10 rounded-3xl -z-10" transition={{ type: "spring", bounce: 0, duration: 0.2 }} />
                  )}
                  <ListTree className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/book-section/emp-details" ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/40")} strokeWidth={location.pathname === "/book-section/emp-details" ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-bold transition-all duration-300", location.pathname === "/book-section/emp-details" ? "text-white" : "text-transparent")}>Details</span>
                </motion.div>
              </Link>

              <Link to="/book-section/all-employees" className="flex-1 relative">
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center justify-center gap-1 py-3">
                  {location.pathname === "/book-section/all-employees" && (
                    <motion.div layoutId="mobile-main-active" className="absolute inset-0 bg-white/10 rounded-3xl -z-10" transition={{ type: "spring", bounce: 0, duration: 0.2 }} />
                  )}
                  <Search className={cn("w-5 h-5 transition-all duration-300", location.pathname === "/book-section/all-employees" ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-white/40")} strokeWidth={location.pathname === "/book-section/all-employees" ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-bold transition-all duration-300", location.pathname === "/book-section/all-employees" ? "text-white" : "text-transparent")}>Search</span>
                </motion.div>
              </Link>
            </>
          )}
          <button onClick={() => signOut()} className="flex-1 flex flex-col items-center justify-center gap-1 text-rose-400">
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium text-transparent">Exit</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
