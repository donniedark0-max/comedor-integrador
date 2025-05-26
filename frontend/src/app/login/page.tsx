'use client';
import React, { useState, useEffect } from 'react';
import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';

// Hook para detectar móvil
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// Variantes horizontales para escritorio
const horizontalVariants = {
  initial: (isReversed: boolean) => ({ x: isReversed ? '100%' : '-100%', opacity: 0 }),
  animate: {
    x: '0%',
    opacity: 1,
    transition: { x: { type: 'tween', duration: 0.6, ease: 'easeInOut' }, opacity: { duration: 0.5 } },
  },
  exit: (isReversed: boolean) => ({
    x: isReversed ? '-100%' : '100%',
    opacity: 0,
    transition: { x: { type: 'tween', duration: 0.5, ease: 'easeInOut' }, opacity: { duration: 0.3 } },
  }),
};

// Variantes verticales para móvil
const verticalVariants = {
  initial: (isReversed: boolean) => ({ y: isReversed ? '-100%' : '100%', opacity: 0 }),
  animate: {
    y: '0%',
    opacity: 1,
    transition: { y: { type: 'tween', duration: 0.6, ease: 'easeInOut' }, opacity: { duration: 0.5 } },
  },
  exit: (isReversed: boolean) => ({
    y: isReversed ? '100%' : '-100%',
    opacity: 0,
    transition: { y: { type: 'tween', duration: 0.5, ease: 'easeInOut' }, opacity: { duration: 0.3 } },
  }),
};

interface AuthPanelProps {
  title?: string;
  subtitle?: string;
  bgClass?: string;
  textClass?: string;
  children?: React.ReactNode;
  isSignUp: boolean;
}

function AuthPanel({ title, subtitle, bgClass = 'bg-white', textClass = 'text-gray-800', children, isSignUp }: AuthPanelProps) {
  const isMobile = useIsMobile();
  const variants = isMobile ? verticalVariants : horizontalVariants;

  return (
    <motion.div
      custom={!isSignUp}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`${bgClass} ${textClass} flex flex-col items-center justify-center flex-1 p-8 h-full rounded-3xl shadow-xl`}
    >
      <div className="text-center mb-6">
        {title && <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${textClass}`}>{title}</h2>}
        {subtitle && <p className={`text-sm sm:text-base ${textClass === 'text-gray-800' ? 'text-gray-600' : 'text-gray-300'}`}>{subtitle}</p>}
      </div>
      <div className="w-full">
        {children}
      </div>
    </motion.div>
  );
}

interface TextPanelProps {
  isSignUp: boolean;
  onToggleMode: () => void;
}

function TextPanel({ isSignUp, onToggleMode }: TextPanelProps) {
  const isMobile = useIsMobile();
  const btnBase = 'w-full rounded-lg py-3 px-5 text-sm font-semibold text-white shadow-lg focus:outline-none transition-transform duration-200';

  return (
    <motion.div
      custom={isSignUp}
      variants={isMobile ? verticalVariants : horizontalVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center justify-center flex-1 p-8 h-full text-center text-white rounded-3xl"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isSignUp ? 'signInText' : 'signUpText'}
          initial={{ opacity: 0, x: isMobile ? 0 : 20, y: isMobile ? 20 : 0 }}
          animate={{ opacity: 1, x: 0, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
          exit={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? -20 : 0, transition: { duration: 0.2, ease: 'easeIn' } }}
        >
          {isSignUp ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">¡Hola de nuevo!</h2>
              <p className="mb-8">Introduce tus datos para iniciar sesión de forma segura.</p>
              <button onClick={onToggleMode} className={`${btnBase} bg-emerald-500 hover:scale-105`}>Iniciar Sesión</button>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">¡Bienvenido!</h2>
              <p className="mb-8">Crea tu cuenta para comenzar tu aventura con nosotros.</p>
              <button onClick={onToggleMode} className={`${btnBase} bg-indigo-500 hover:scale-105`}>Crear Cuenta</button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { isLoaded, sessionId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isLocked, setIsLocked] = useState(true)
  const [passwordInput, setPasswordInput] = useState("")

  const unlockLogin = () => {
    if (passwordInput === "claveSuperSecreta") {
      setIsLocked(false)
    } else {
      router.push("/")
    }
  }

  // Detectar si estamos en hash #signup
  useEffect(() => {
    const toggle = () => setIsSignUp(window.location.hash === '#signup');
    toggle();
    window.addEventListener('hashchange', toggle);
    return () => window.removeEventListener('hashchange', toggle);
  }, [pathname]);

  const toggleMode = () => {
    const next = !isSignUp;
    setIsSignUp(next);
    router.replace(next ? `${pathname}#signup` : pathname, { scroll: false });
  };

  // Si ya hay sesión, redirigir
  useEffect(() => {
    if (isLoaded && sessionId) {
      const dest = new URLSearchParams(window.location.search).get('redirect_url') || '/admin';
      router.push(dest);
    }
  }, [isLoaded, sessionId, router]);

  if (!isLoaded || sessionId) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">Cargando…</div>;
  }

  const afterUrl = '/admin'
  const primary = isSignUp ? '#059669' : '#5b21b6';
  const buttonCls = 'w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white shadow-md transition-transform transform hover:scale-102';
  const focusCls = isSignUp ? 'focus:ring-green-500' : 'focus:ring-indigo-500';
  
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="bg-gray-800 p-6 rounded-[30px] shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl text-red-200 mb-4">Acceso solo para Administradores</h2>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="mb-4 p-2 bg-gray-700  text-center rounded-[30px] w-full"
            placeholder="Introduce la contraseña"
          />
          <button onClick={unlockLogin} className="bg-blue-600 px-4 py-2 rounded-[30px] text-white hover:bg-blue-700 transition-colors">
            Desbloquear
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-6">
      <div
        className={`flex flex-col ${isSignUp ? 'md:flex-row-reverse' : 'md:flex-row'} items-center justify-center rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full md:min-h-[600px] h-full bg-gradient-to-br bg-opacity-20 backdrop-blur-lg p-6`}
        style={{
          backgroundImage: isSignUp
            ? 'linear-gradient(to right, rgba(16,185,129,0.8), rgba(20,184,166,0.8))'
            : 'linear-gradient(to left, rgba(99,102,241,0.8), rgba(139,92,246,0.8))',
        }}
      >
        <AnimatePresence mode="sync">
          <TextPanel isSignUp={isSignUp} onToggleMode={toggleMode} key={isSignUp ? 'textSignUp' : 'textSignIn'} />
          <AuthPanel
            isSignUp={isSignUp}
            title={isSignUp ? 'Únete a la familia' : 'Bienvenido de Nuevo'}
            subtitle={isSignUp ? 'Únete ahora para disfrutar de todos nuestros servicios.' : 'Accede a tu cuenta y retoma donde lo dejaste.'}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignUp ? 'clerkSignUp' : 'clerkSignIn'}
                initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
                exit={{ opacity: 0, x: isSignUp ? -20 : 20, transition: { duration: 0.25, ease: 'easeIn' } }}
                className="w-full h-full"
              >
                {isSignUp ? (
                  <SignUp
                    routing="path"
                    path={pathname}
                    afterSignUpUrl={afterUrl} 
                    signInUrl={pathname}
                    appearance={{
                      variables: { colorPrimary: primary, fontWeight: { normal: '400', medium: '500', bold: '600' }, borderRadius: '0.75rem' },
                      elements: {
                        rootBox: 'w-full h-full',
                        card: 'bg-transparent p-0 m-0 rounded-3xl overflow-hidden',
                        formFieldInput: `w-full rounded-md border-gray-600 bg-slate-800 text-white shadow-sm ${focusCls} py-2.5`,
                        formButtonPrimary: `${buttonCls} bg-green-600 hover:bg-green-700`,
                        dividerLine: 'my-6 bg-gray-600',
                        alternativeMethodsBlockButton: 'w-full rounded-md border border-gray-600 py-2.5',
                        socialButtonsBlockButton: 'w-full rounded-md border border-gray-600 py-2.5',
                        formFieldLabel: 'text-sm font-medium text-gray-300 mb-1.5',
                        footer: { display: 'none' },
                      },
                    }}
                  />
                ) : (
                  <SignIn
                    routing="path"
                    path={pathname}
                    afterSignInUrl={afterUrl}
                    signUpUrl={`${pathname}#signup`}
                    appearance={{
                      variables: { colorPrimary: primary, fontWeight: { normal: '400', medium: '500', bold: '600' }, borderRadius: '0.75rem' },
                      elements: {
                        rootBox: 'w-full h-full',
                        card: 'bg-transparent p-0 m-0 rounded-3xl overflow-hidden',
                        formFieldInput: `w-full rounded-md border-gray-600 bg-slate-800 text-white shadow-sm ${focusCls} py-2.5`,
                        formButtonPrimary: `${buttonCls} bg-indigo-600 hover:bg-indigo-700`,
                        dividerLine: 'my-6 bg-gray-600',
                        alternativeMethodsBlockButton: 'w-full rounded-md border border-gray-600 py-2.5',
                        socialButtonsBlockButton: 'w-full rounded-md border border-gray-600 py-2.5',
                        formFieldLabel: 'text-sm font-medium text-gray-300 mb-1.5',
                        footer: { display: 'none' },
                      },
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </AuthPanel>
        </AnimatePresence>
      </div>
    </div>
  );
}
