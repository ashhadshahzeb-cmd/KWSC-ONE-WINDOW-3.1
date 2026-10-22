import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, PlayCircle, MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function DemoVideoPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add('landing-dark');
    return () => {
      document.documentElement.classList.remove('landing-dark');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30 flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/kwsc-logo.png" alt="KWSC Logo" className="w-12 h-12 object-contain" />
          <div className="flex flex-col">
            <span className="text-xl font-black text-white leading-tight tracking-tight">KW&SC</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">One-Window</span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="border-white/10 hover:bg-white/5 text-slate-300"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px] -z-10"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
            <PlayCircle className="w-4 h-4" /> System Overview
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            See the Dashboard in Action
          </h2>
          <p className="text-slate-400 text-lg">
            Watch the complete demonstration of the Karachi Water & Sewerage Corporation's One Window Facility Enterprise Dashboard.
          </p>
        </motion.div>

        {/* Video Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-5xl aspect-video bg-slate-900 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden relative group flex items-center justify-center"
        >
          <video 
            className="w-full h-full object-contain bg-black"
            controls
            autoPlay
            src="/dashboard-video.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </motion.div>
      </main>
    </div>
  );
}
