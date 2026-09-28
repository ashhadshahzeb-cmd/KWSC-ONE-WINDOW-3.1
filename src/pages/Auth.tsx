import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ThreeDLoginBackground from '@/components/auth/ThreeDLoginBackground';
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
                  
                  // Get the first available TOTP factor (verified or unverified)
                  const totpFactors = factors?.all?.filter(f => f.factor_type === 'totp') || [];
                  if (totpFactors.length > 0) {
                     setFactorId(totpFactors[0].id);
                     
                     // If it is unverified, technically they should be enrolling, but since they have the code, we let them verify.
                     if (totpFactors[0].status === 'unverified') {
                        setMfaStep('enroll'); // Show Verify box but keeping step conceptually for UI
                        // But wait, if they refreshed, they don't have qrCodeData. The UI will just hide the QR and show the box.
                     } else {
                        setMfaStep('verify');
                     }
                  } else {
                     toast.error('No MFA factors found. Please contact support to reset your account.');
                     setLoading(false);
                     return;
                  }
                  
                  setMfaStep('verify'); // Always show verify box
                  setLoading(false);
                  return;
               } else {
                  // Already aal2
                  toast.success('Welcome! Login successful.');
                  navigate('/dashboard');
               }
            } else {
                 // Not enrolled or has unverified factor, let's enroll them
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
                 setQrCodeData(data.totp.uri); // MUST BE URI for QRCodeSVG
                 setLoading(false);
                 return;
            }
          } else {
            // HRMS Fallback
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

  return (
    <div className="min-h-screen w-full flex bg-slate-950 overflow-hidden">
      
      {/* Left Side: Form Container */}
      <div className="w-full lg:w-[45%] flex flex-col relative z-10 bg-slate-950/80 backdrop-blur-xl border-r border-white/5 shadow-2xl">
        
        {/* Back Button */}
        <div className="absolute top-6 left-6 md:top-10 md:left-10">
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-white hover:bg-white/5"
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
              <div className="flex items-center gap-3 mb-6">
                <img src="/kwsc-logo.png" alt="KWSC" className="w-12 h-12 object-contain" />
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white leading-tight tracking-tight">KW&SC</span>
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Portal</span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
                {mfaStep !== 'none' ? 'Two-Factor Auth' : isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-400 text-lg">
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
                  <motion.div variants={itemVariants} className="flex flex-col items-center justify-center p-6 bg-white rounded-xl mb-6 w-fit mx-auto">
                    <QRCodeSVG value={qrCodeData} size={200} />
                  </motion.div>
                )}
                
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <Input 
                      id="mfaCode" 
                      type="text" 
                      placeholder="6-digit Authenticator Code"
                      className="pl-12 h-14 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 rounded-xl transition-all text-base text-center tracking-widest text-2xl font-mono" 
                      required 
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button 
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
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
                     className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
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
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <Input 
                          id="name" 
                          placeholder="Full Name" 
                          className="pl-12 h-14 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 rounded-xl transition-all text-base" 
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
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Email Address" 
                      className="pl-12 h-14 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 rounded-xl transition-all text-base" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Password"
                      className="pl-12 h-14 bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 rounded-xl transition-all text-base" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {isLogin && (
                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button 
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : isLogin ? (
                      <LogIn className="w-5 h-5 mr-2" />
                    ) : (
                      <UserPlus className="w-5 h-5 mr-2" />
                    )}
                    {isLogin ? 'Access Portal' : 'Register Account'}
                  </Button>
                </motion.div>
              </form>
            )}

            {mfaStep === 'none' && (
              <motion.div variants={itemVariants} className="mt-8 text-center">
                <p className="text-base text-slate-400">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setFullName('');
                      setPassword('');
                    }}
                    className="font-bold text-blue-400 hover:text-blue-300 transition-colors hover:underline underline-offset-4"
                  >
                    {isLogin ? 'Register' : 'Sign In'}
                  </button>
                </p>
              </motion.div>
            )}

          </motion.div>
        </div>
        
        {/* Footer Text */}
        <div className="p-8 text-center text-sm text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Karachi Water & Sewerage Corporation
        </div>
      </div>

      {/* Right Side: 3D Canvas Visuals */}
      <div className="hidden lg:block lg:w-[55%] relative">
        {/* Elegant Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none opacity-50" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none z-10" />
        
        {/* The 3D Scene */}
        <ThreeDLoginBackground />
        
        {/* Feature Text Overlay */}
        <div className="absolute bottom-16 right-16 z-20 max-w-md text-right">
          <motion.h2 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-3xl font-black text-white mb-2"
          >
            Enterprise Intelligence
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-slate-300 text-lg"
          >
            Unifying File Tracking, Finance, and HRMS into a single robust portal.
          </motion.p>
        </div>
      </div>

    </div>
  );
}
