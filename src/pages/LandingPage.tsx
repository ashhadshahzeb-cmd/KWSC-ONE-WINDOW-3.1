import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ThreeDScene from '@/components/landing/ThreeDScene';
import { ChevronRight, Shield, FileText, CheckCircle, Clock, BarChart, Search, Globe, Smartphone, Landmark, Building2, Bell, Wallet, Users, Calendar, Calculator, FileCheck, ArrowRight, Activity, Database, Network, PlayCircle } from 'lucide-react';
import FileTrackingMockup from '@/components/mockups/FileTrackingMockup';
import HRMSMockup from '@/components/mockups/HRMSMockup';
import FinanceMockup from '@/components/mockups/FinanceMockup';
import WelfareMockup from '@/components/mockups/WelfareMockup';
import PublicTrackingMockup from '@/components/mockups/PublicTrackingMockup';
import MobileAppMockup from '@/components/mockups/MobileAppMockup';
import { MapPin, QrCode } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add('landing-dark');
    return () => {
      document.documentElement.classList.remove('landing-dark');
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const fadeRight = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const fadeLeft = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden selection:bg-blue-500/30">
      
      {/* NAVBAR */}
      <nav className={`fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10 transition-transform duration-300 ${navVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 cursor-pointer">
              <img src="/kwsc-logo.png" alt="KWSC Logo" className="w-12 h-12 object-contain" />
              <div className="flex flex-col">
                <span className="text-xl font-black text-white leading-tight tracking-tight">KW&SC</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">One-Window</span>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center space-x-8 text-sm font-bold text-slate-300">
              <a href="#file-tracking" onClick={(e) => { e.preventDefault(); document.getElementById('file-tracking')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors">File Tracking</a>
              <a href="#finance" onClick={(e) => { e.preventDefault(); document.getElementById('finance')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors">Finance</a>
              <a href="#hrms" onClick={(e) => { e.preventDefault(); document.getElementById('hrms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors">HRMS</a>
              <a href="#modules" onClick={(e) => { e.preventDefault(); document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition-colors">More Modules</a>
              <button onClick={() => navigate('/demo')} className="hover:text-white text-blue-400 transition-colors flex items-center"><PlayCircle className="w-4 h-4 mr-1.5" /> Watch Demo</button>
            </div>

            <div>
              <Button onClick={() => navigate('/login')} className="bg-white hover:bg-slate-200 text-slate-900 px-4 sm:px-6 rounded-full font-bold shadow-lg transition-all duration-300 text-sm sm:text-base">
                <span className="hidden sm:inline">Login to Portal</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO (BLACK THEME) */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/20 to-transparent opacity-50" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.2 } } }} className="space-y-8">
              <motion.div variants={fadeUp} className="inline-flex items-center space-x-2 bg-blue-900/30 rounded-full px-4 py-2 border border-blue-800 text-blue-300 font-semibold text-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span>One Window Facilitation Live</span>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
                Digital <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                  Transformation
                </span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="text-lg lg:text-xl text-slate-400 max-w-xl leading-relaxed">
                Experience the all-new unified portal for Karachi Water & Sewerage Corporation. An enterprise-grade architecture that comprehensively manages finances, human resources, and rigorous public tracking from a single, powerful, and secure interface.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button onClick={() => navigate('/login')} className="h-14 px-8 w-full sm:w-auto text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl shadow-blue-900/20 hover:scale-105 transition-transform duration-300">
                  Access Portal <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button onClick={() => navigate('/demo')} variant="outline" className="h-14 px-8 w-full sm:w-auto text-lg font-bold border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white text-slate-200 rounded-xl hover:scale-105 transition-transform duration-300 backdrop-blur-sm">
                  <PlayCircle className="mr-2 w-5 h-5" /> Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.3 }} className="relative h-[400px] lg:h-[600px] w-full">
              <ThreeDScene />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FILE TRACKING (WHITE THEME) */}
      <section id="file-tracking" className="py-24 bg-white text-slate-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeRight} className="order-2 lg:order-1 w-full">
              <FileTrackingMockup />
            </motion.div>
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeLeft} className="order-1 lg:order-2">
              <h2 className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-3">One Window Facilitation</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">Digital File Transparency</h3>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Say goodbye to lost physical files and miscommunication. Our advanced file tracking module digitizes the entire lifecycle of a document. 
                With unique Diary Numbers and QR codes, every document's location and status is known in real-time.
              </p>
              <div className="grid grid-cols-2 gap-6 mt-8 border-t border-slate-200 pt-8">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Secure Attachments</h4>
                  <p className="text-slate-500 text-sm">Scan and upload documents directly to digital files using mobile devices.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Automated Alerts</h4>
                  <p className="text-slate-500 text-sm">Notify departments when new files arrive in their queue.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3: FINANCIAL HUB (BLACK THEME) */}
      <section id="finance" className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeRight}>
              <h2 className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-3">Finance & Accounts</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-tight">Complete Financial Hub</h3>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                A robust, enterprise-grade accounting ecosystem built on double-entry principles. Manage ledgers, enforce strict budget controls, and reconcile bank entries seamlessly across the entire organization.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Landmark className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg mb-1 text-slate-200">General Ledger</h4>
                    <p className="text-sm text-slate-400">Maintain an accurate Chart of Accounts with hierarchical classifications. Automatically generate Trial Balances.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <BarChart className="w-6 h-6 text-emerald-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-lg mb-1 text-slate-200">Budget Control</h4>
                    <p className="text-sm text-slate-400">Set granular budget limits per department and account code. System automatically restricts over-budget transactions.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeLeft} className="w-full">
              <FinanceMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4: EMPLOYEE FUNDS (WHITE THEME) */}
      <section className="py-24 bg-slate-50 text-slate-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeRight}>
              <h2 className="text-emerald-600 font-bold uppercase tracking-widest text-sm mb-3">Welfare & Financial Support</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 tracking-tight leading-tight">Dedicated Employee Funds Management</h3>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Extensive tracking of financial support requests for both regular staff and retired personnel. 
                The system streamlines the complicated disbursement of essential funds, calculating eligibility and tracking historical payments.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {[
                  'CP Fund', 'House Building', 'Medical Case', 
                  'Pension & Gratuity', 'LPR', 'Group Insurance', 
                  'Marriage/Bike', 'Funeral Charges', 'TADA & Over Time'
                ].map((fund, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-xs text-slate-700">{fund}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeLeft} className="w-full">
              <WelfareMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HRMS (BLACK THEME) */}
      <section id="hrms" className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeRight} className="order-2 lg:order-1 w-full">
              <HRMSMockup />
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeLeft} className="order-1 lg:order-2">
              <h2 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-3">Human Resources</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-6 tracking-tight leading-tight">Advanced HRMS</h3>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                A complete Human Resource Management module seamlessly intertwined with the financial hub. Manage the entire lifecycle of an employee from hiring to retirement without redundant data entry.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <Users className="w-8 h-8 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xl mb-2 text-slate-200">Comprehensive Profiles</h4>
                    <p className="text-sm text-slate-400">Store personal details, employment history, qualifications, and dependents in a secure centralized vault.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Calendar className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xl mb-2 text-slate-200">Leaves & Attendance</h4>
                    <p className="text-sm text-slate-400">Track daily attendance, manage leave quotas (Casual, Medical, Earned), and process digital leave applications.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Calculator className="w-8 h-8 text-purple-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xl mb-2 text-slate-200">Automated Payroll</h4>
                    <p className="text-sm text-slate-400">Generate salary slips with complex formulas including basic pay, specific departmental allowances, tax deductions, and provident fund cuts.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 6: PUBLIC TRACKING (WHITE THEME) */}
      <section className="py-24 bg-white text-slate-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeRight} className="order-1 lg:order-1">
              <h2 className="text-purple-600 font-bold uppercase tracking-widest text-sm mb-3">Public Tracking & Mobile Sync</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-6">Bridging the Gap</h3>
              <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                Empower citizens and staff with modern, highly accessible tools. From tracking applications online to receiving instant official announcements, communication has never been easier.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                    <Globe className="text-purple-600 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Public Tracking Portal</h4>
                    <p className="text-slate-600 text-sm">Citizens and contractors can track their file status using unique Diary Numbers without logging in.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Smartphone className="text-orange-600 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Mobile Document Uploads</h4>
                    <p className="text-slate-600 text-sm">Staff can instantly scan QR codes to securely upload physical document photos via smartphone.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Bell className="text-blue-600 w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Digital Notice Board</h4>
                    <p className="text-slate-600 text-sm">Real-time internal communication for official circulars and urgent announcements.</p>
                  </div>
                </div>
              </div>
              
              <Button variant="secondary" onClick={() => navigate('/track')} className="mt-10 h-14 px-8 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xl shadow-purple-900/20 w-full sm:w-auto hover:scale-105 transition-transform duration-300">
                Open Public Portal <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeLeft} className="order-2 lg:order-2 w-full">
              <PublicTrackingMockup />
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 6.5: ENTERPRISE MODULES (BLACK THEME) */}
      <section id="modules" className="py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-cyan-400 font-bold uppercase tracking-widest text-sm mb-3">Enterprise Core</motion.h2>
          <motion.h3 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-6">Additional Modules</motion.h3>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-slate-400 text-lg max-w-3xl mx-auto mb-16">
            The One-Window system goes beyond basic tracking. It's a complete ERP solution tailored for government utilities, covering everything from revenue collection to administrative security.
          </motion.p>
          
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 border border-white/5 p-6 rounded-2xl shadow-xl shadow-black/50">
              <Database className="w-10 h-10 text-cyan-400 mb-4" />
              <h4 className="text-xl font-bold mb-2">Book Section & Bills</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dedicated ledgers for Contractor payments, POL bills, Medical contingencies, and inter-departmental Transfer Advices.
              </p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 border border-white/5 p-6 rounded-2xl shadow-xl shadow-black/50">
              <Activity className="w-10 h-10 text-amber-400 mb-4" />
              <h4 className="text-xl font-bold mb-2">Analytics & Reports</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate real-time statistical reports on file flow, financial health, and employee productivity with one click.
              </p>
            </motion.div>
            
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 border border-white/5 p-6 rounded-2xl shadow-xl shadow-black/50">
              <Network className="w-10 h-10 text-purple-400 mb-4" />
              <h4 className="text-xl font-bold mb-2">Role-Based Security</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Strict administrative controls, multi-level authorization workflows, and immutable activity logs for complete security.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 7: MOBILE APP */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeRight}>
              <h2 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-3">Anywhere, Anytime</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-tight">KW&SC Citizen App</h3>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Experience the power of the One Window Facilitation Portal in the palm of your hand. Our dedicated mobile application brings all services directly to your smartphone.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-6 mb-10">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5">
                  <QrCode className="w-8 h-8 text-blue-400 mb-3" />
                  <h4 className="font-bold text-lg mb-1">Instant QR Verify</h4>
                  <p className="text-sm text-slate-400">Scan any official document to instantly verify its authenticity.</p>
                </div>
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5">
                  <Bell className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-lg mb-1">Push Notifications</h4>
                  <p className="text-sm text-slate-400">Get real-time alerts whenever your file moves to a new department.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-white text-slate-900 w-full sm:w-auto hover:bg-slate-100 font-bold h-14 px-8 rounded-xl flex items-center justify-center gap-3">
                  <span className="text-xl">🍏</span> Download for iOS
                </Button>
                <Button onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/kwsc-mobile-app.apk';
                  link.download = 'KWSC-One-Window-App.apk';
                  link.click();
                }} variant="outline" className="border-white/20 w-full sm:w-auto text-white hover:text-white hover:bg-white/10 font-bold h-14 px-8 rounded-xl flex items-center justify-center gap-3">
                  <span className="text-xl">🤖</span> Download for Android
                </Button>
              </div>
            </motion.div>
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeLeft} className="relative mt-12 lg:mt-0">
              <MobileAppMockup />
            </motion.div>

          </div>
        </div>
      </section>

      {/* MEGA FOOTER */}
      <footer className="bg-slate-950 text-white pt-24 pb-12 relative overflow-hidden border-t border-white/10">
        {/* Background Accents */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
            
            {/* Brand Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg">
                  <img src="/kwsc-logo.png" alt="KW&SC Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-xl font-black tracking-tight leading-none mb-1">KW&SC</h4>
                  <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">One Window Facility</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed pr-4">
                Revolutionizing public service delivery in Karachi through digital transformation, transparency, and a unified citizen-first approach.
              </p>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2 lg:col-start-6">
              <h4 className="text-white font-bold mb-6">Services</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Track a File</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Verify Record</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Online Billing</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Complaints</a></li>
              </ul>
            </div>

            {/* Departments */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold mb-6">Departments</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Human Resources</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Finance & Audit</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Operations (E&M)</a></li>
                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors flex items-center gap-2"><ChevronRight className="w-3 h-3" /> Employee Welfare</a></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-3">
              <h4 className="text-white font-bold mb-6">Contact Us</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">KW&SC Head Office, 9th Mile, Karsaz, Shahrah-e-Faisal, Karachi.</p>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-slate-400 text-sm">Mon - Fri, 9:00 AM - 5:00 PM</p>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Karachi Water & Sewerage Corporation. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500 font-bold uppercase tracking-widest">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
