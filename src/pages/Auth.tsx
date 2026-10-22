import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2, ArrowLeft, Shield, FileText, BarChart3, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useAppConfig } from '@/hooks/useAppConfig';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // MFA States
  const [mfaStep, setMfaStep] = useState<'none' | 'enroll' | 'verify'>('none');
  const [factorId, setFactorId] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  
  const navigate = useNavigate();
  const { localSignIn } = useAuth();
  const { isGlobal2FAEnabled } = useAppConfig();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const localResult = await localSignIn(email, password);
        if (localResult.success) {
          
          if (localResult.method === 'supabase') {
            if (!isGlobal2FAEnabled) {
              toast.success('Welcome! Login successful.');
              navigate('/dashboard');
              setLoading(false);
              return;
            }

            // Check MFA Status
            const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            
            if (mfaError) {
              toast.error('Failed to check security level.');
              setLoading(false);
              return;
            }

            if (mfaData.nextLevel === 'aal2') {
               if (mfaData.currentLevel === 'aal1') {
                  const { data: factors } = await supabase.auth.mfa.listFactors();
                  
                  const totpFactors = factors?.all?.filter(f => f.factor_type === 'totp') || [];
                  if (totpFactors.length > 0) {
                     setFactorId(totpFactors[0].id);
                     
                     if (totpFactors[0].status === 'unverified') {
                        setMfaStep('enroll');
                     } else {
                        setMfaStep('verify');
                     }
                  } else {
                     toast.error('No MFA factors found. Please contact support to reset your account.');
                     setLoading(false);
                     return;
                  }
                  
                  setMfaStep('verify');
                  setLoading(false);
                  return;
               } else {
                  toast.success('Welcome! Login successful.');
                  navigate('/dashboard');
               }
            } else {
                 const { data: existingFactors } = await supabase.auth.mfa.listFactors();
                 const unverifiedFactors = existingFactors?.all?.filter(f => f.status === 'unverified') || [];
                 if (unverifiedFactors.length > 0) {
                    await supabase.auth.mfa.unenroll({ factorId: unverifiedFactors[0].id });
                 }

                 setMfaStep('enroll');
                 const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
                 if (error) {
                    console.error("MFA Enroll Error:", error);
                    toast.error(error.message || 'Failed to start 2FA enrollment');
                    setMfaStep('none');
                    setLoading(false);
                    return;
                 }
                 setFactorId(data.id);
                 setQrCodeData(data.totp.uri);
                 setLoading(false);
                 return;
            }
          } else {
            toast.success('Welcome! Login successful.');
            navigate('/dashboard');
          }

        } else {
          toast.error(localResult.error || 'Invalid login credentials.');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: fullName } }
        });
        
        if (error) throw error;

        if (data.user) {
          const { error: dbError } = await supabase.from('users').insert({
            id: data.user.id,
            name: fullName,
            email: email,
            role: 'admin'
          });
          
          if (dbError) console.error('Error creating user profile:', dbError);
        }

        toast.success('Registration successful! Please check your email for verification.');
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      if (mfaStep === 'none') {
        setLoading(false);
      }
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: mfaCode
      });
      if (verify.error) throw verify.error;

      toast.success('Authentication successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Invalid 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first to reset your password.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) throw error;
      
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const features = [
    { icon: FileText, title: 'File Tracking', desc: 'Track inward & outward files across all departments' },
    { icon: BarChart3, title: 'Financial Analytics', desc: 'Real-time budget monitoring and expenditure reports' },
    { icon: Users, title: 'HRMS Integration', desc: 'Employee management, attendance & payroll system' },
    { icon: Shield, title: 'Secure Access', desc: 'Role-based access control with 2FA authentication' },
  ];

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden">
      
      {/* Left Side: Form Container */}
      <div className="w-full lg:w-[48%] flex flex-col relative z-10 bg-white">
        
        {/* Back Button */}
        <div className="absolute top-6 left-6 md:top-8 md:left-8">
          <Button 
            variant="ghost" 
            className="text-slate-500 hover:text-[#1e3a8a] hover:bg-blue-50"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 max-w-2xl mx-auto w-full pt-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="w-full"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-10">
              <div className="flex items-center gap-3 mb-8">
                <img src="/kwsc-logo.png" alt="KWSC" className="w-12 h-12 object-contain" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-[#1e3a8a] leading-tight tracking-tight">KW&SC</span>
                  <span className="text-xs font-bold text-[#1e3a8a]/60 uppercase tracking-widest">One Window Portal</span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-[#1e3a8a] tracking-tight mb-3">
                {mfaStep !== 'none' ? 'Two-Factor Auth' : isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-500 text-lg">
                {mfaStep === 'enroll' 
                  ? 'Scan the QR code with your Authenticator app' 
                  : mfaStep === 'verify'
                  ? 'Enter the 6-digit code from your Authenticator app'
                  : isLogin 
                  ? 'Sign in to your One Window Facility dashboard' 
                  : 'Join the enterprise management system'}
              </p>
            </motion.div>

            {/* Form */}
            {mfaStep !== 'none' ? (
              <form onSubmit={handleMfaVerify} className="space-y-5">
                {mfaStep === 'enroll' && qrCodeData && (
                  <motion.div variants={itemVariants} className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl mb-6 w-fit mx-auto">
                    <QRCodeSVG value={qrCodeData} size={200} />
                  </motion.div>
                )}
                
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1e3a8a] transition-colors" />
                    <Input 
                      id="mfaCode" 
                      type="text" 
                      placeholder="6-digit Authenticator Code"
                      className="pl-12 h-14 bg-slate-50 border-slate-200 text-[#1e3a8a] placeholder:text-slate-400 focus-visible:ring-[#1e3a8a]/30 focus-visible:border-[#1e3a8a]/50 rounded-xl transition-all text-base text-center tracking-widest text-2xl font-mono" 
                      required 
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button 
                    className="w-full h-14 bg-[#1e3a8a] hover:bg-[#172554] text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                    disabled={loading || mfaCode.length < 6}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Lock className="w-5 h-5 mr-2" />
                    )}
                    Verify & Access
                  </Button>
                </motion.div>
                
                <div className="text-center mt-4">
                   <button 
                     type="button"
                     onClick={() => setMfaStep('none')}
                     className="text-sm font-medium text-slate-400 hover:text-[#1e3a8a] transition-colors"
                   >
                     Cancel & Return to Login
                   </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="space-y-5">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div 
                      key="name"
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.3 }}
                      className="space-y-1.5"
                    >
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1e3a8a] transition-colors" />
                        <Input 
                          id="name" 
                          placeholder="Full Name" 
                          className="pl-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1e3a8a]/30 focus-visible:border-[#1e3a8a]/50 rounded-xl transition-all text-base" 
                          required={!isLogin}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1e3a8a] transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Email Address" 
                      className="pl-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1e3a8a]/30 focus-visible:border-[#1e3a8a]/50 rounded-xl transition-all text-base" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1e3a8a] transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Password"
                      className="pl-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#1e3a8a]/30 focus-visible:border-[#1e3a8a]/50 rounded-xl transition-all text-base" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {isLogin && (
                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-slate-400 hover:text-[#1e3a8a] transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button 
                    className="w-full h-14 bg-[#1e3a8a] hover:bg-[#172554] text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                    disabled={loading}
                    style={{ color: '#ffffff' }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" style={{ color: '#ffffff' }} />
                    ) : isLogin ? (
                      <LogIn className="w-5 h-5 mr-2" style={{ color: '#ffffff' }} />
                    ) : (
                      <UserPlus className="w-5 h-5 mr-2" style={{ color: '#ffffff' }} />
                    )}
                    <span style={{ color: '#ffffff' }}>{isLogin ? 'Access Portal' : 'Register Account'}</span>
                  </Button>
                </motion.div>
              </form>
            )}

            {mfaStep === 'none' && (
              <motion.div variants={itemVariants} className="mt-8 text-center">
                <p className="text-base text-slate-500">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setFullName('');
                      setPassword('');
                    }}
                    className="font-bold text-[#1e3a8a] hover:text-[#172554] transition-colors hover:underline underline-offset-4"
                  >
                    {isLogin ? 'Register' : 'Sign In'}
                  </button>
                </p>
              </motion.div>
            )}

          </motion.div>
        </div>
        
        {/* Footer Text */}
        <div className="p-8 text-center text-sm text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} Karachi Water & Sewerage Corporation
        </div>
      </div>

      {/* Right Side: Brand Visual Panel */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#1e3a8a] flex-col justify-between items-center overflow-hidden py-10 px-8">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/[0.03] rounded-full pointer-events-none" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg my-auto flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
              <img src="/kwsc-logo.png" alt="KWSC" className="w-11 h-11 object-contain" />
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tight" style={{ color: '#ffffff' }}>
              One Window Facility
            </h2>
            <p className="text-sm md:text-base leading-relaxed max-w-md mx-auto" style={{ color: '#dbeafe' }}>
              Unified enterprise portal for File Tracking, Finance & HRMS management
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.08, duration: 0.4 }}
                className="rounded-xl p-3.5 border border-white/20 transition-all duration-200"
                style={{ backgroundColor: 'rgba(23, 37, 84, 0.65)' }}
              >
                <feature.icon className="w-6 h-6 mb-2" strokeWidth={2} style={{ color: '#ffffff' }} />
                <h3 className="font-bold text-sm mb-1" style={{ color: '#ffffff' }}>{feature.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#bfdbfe' }}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom stats bar */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="relative z-10 w-full max-w-lg flex justify-around items-center pt-6 border-t border-white/20"
        >
          {[
            { value: '12,000+', label: 'Files Tracked' },
            { value: '50+', label: 'Departments' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl md:text-2xl font-black tracking-tight" style={{ color: '#ffffff' }}>{stat.value}</div>
              <div className="text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#93c5fd' }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

    </div>
  );
}
