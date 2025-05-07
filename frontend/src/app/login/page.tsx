'use client';
import React, { useState, useEffect } from 'react';
import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';

interface AuthPanelProps {
  title?: string;
  subtitle?: string;
  bgClass?: string;
  textClass?: string;
  children?: React.ReactNode;
}

// Variantes de animación para los paneles principales (AuthPanel y TextPanel)
const sharedPanelVariants = {
  initial: (isReversed: boolean) => ({ opacity: 0, x: isReversed ? -30 : 30, scale: 0.98 }),
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }, // EaseInOutQuint
  exit: (isReversed: boolean) => ({ opacity: 0, x: isReversed ? 30 : -30, scale: 0.98, transition: { duration: 0.3, ease: [0.8, 0, 0.6, 1] } }), // EaseInQuint
};

function AuthPanel({
  title,
  subtitle,
  bgClass = 'bg-white',
  textClass = 'text-gray-800',
  children,
  isSignUp // Para determinar la dirección de la animación inicial
}: AuthPanelProps & { isSignUp: boolean }) {
  return (
    <motion.div
      layout // Habilita la animación de layout para la inversión de paneles
      transition={{ layout: { duration: 0.5, type: "spring", bounce: 0.1 } }}
      custom={!isSignUp} // `isReversed` para variants: AuthPanel está a la derecha en SignIn (no SignUp)
      variants={sharedPanelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`${bgClass} ${textClass} w-full md:w-1/2 flex flex-col justify-center p-6 sm:p-8 md:p-10 order-1 md:order-none`} // justify-center para contenido vertical
    >
      <div className="text-center w-full mb-6 sm:mb-8">
        {title && <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${textClass}`}>{title}</h2>}
        {subtitle && <p className={`text-sm sm:text-base ${textClass === 'text-gray-800' ? 'text-gray-600' : 'text-gray-300'}`}>{subtitle}</p>}
      </div>
      <div className="w-full max-w-xs sm:max-w-sm mx-auto"> {/* mx-auto para centrar este bloque si es más estrecho que el padre */}
        {children}
      </div>
    </motion.div>
  );
}

interface TextPanelPlaceholderProps {
  isSignUp: boolean;
  onToggleMode: () => void;
}

function TextPanelPlaceholder({ isSignUp, onToggleMode }: TextPanelPlaceholderProps) {
  const buttonCommonClasses = "w-full max-w-xs mx-auto rounded-lg py-3 px-5 text-sm font-semibold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 ease-in-out transform hover:scale-105";
  const buttonSignUpModeClasses = "bg-emerald-500 hover:bg-emerald-600"; // Para "Iniciar Sesión" (cuando estamos en SignUp)
  const buttonSignInModeClasses = "bg-indigo-500 hover:bg-indigo-600";   // Para "Crear Cuenta" (cuando estamos en SignIn)

  return (
    <motion.div
      layout // Habilita la animación de layout para la inversión de paneles
      transition={{ layout: { duration: 0.5, type: "spring", bounce: 0.1 } }}
      key={`text-panel-wrapper-${isSignUp ? 'signup' : 'signin'}`} // Key para el wrapper si es necesario
      custom={isSignUp} // `isReversed` para variants: TextPanel está a la izquierda en SignIn (no SignUp)
      variants={sharedPanelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center items-center text-white text-center order-2 md:order-none"
    >
      <AnimatePresence mode="wait">
        <motion.div
            key={isSignUp ? 'text-content-signup' : 'text-content-signin'} // Key para animar el cambio de contenido
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.4, ease: "circOut" } }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2, ease: "circIn" } }}
            className="w-full"
        >
        {isSignUp ? (
            <>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">¿Ya tienes una cuenta?</h2>
                <p className="text-base sm:text-lg mb-8">Inicia sesión para acceder a tu perfil y continuar tu experiencia.</p>
                <button
                  onClick={onToggleMode}
                  className={`${buttonCommonClasses} ${buttonSignUpModeClasses}`}
                  aria-label="Iniciar Sesión"
                >
                  Iniciar Sesión
                </button>
            </>
        ) : (
            <>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">¡Bienvenido/a!</h2>
                <p className="text-base sm:text-lg mb-8">Crea una cuenta para unirte a nuestra comunidad. ¡Es rápido y sencillo!</p>
                <button
                  onClick={onToggleMode}
                  className={`${buttonCommonClasses} ${buttonSignInModeClasses}`}
                  aria-label="Crear Cuenta"
                >
                  Crear Cuenta
                </button>
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

  // Sincroniza el estado `isSignUp` con el hash de la URL al cargar y en cambios de hash
  useEffect(() => {
    const handleHashChange = () => {
      const currentHashIsSignUp = window.location.hash === '#signup';
      if (isSignUp !== currentHashIsSignUp) { // Solo actualiza si hay una discrepancia real
        setIsSignUp(currentHashIsSignUp);
      }
    };
    // Establecer estado inicial basado en el hash al montar
    const initialHashIsSignUp = window.location.hash === '#signup';
    setIsSignUp(initialHashIsSignUp); // Asegura que el estado inicial sea correcto

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // pathname es estable para esta página. isSignUp se omite intencionalmente aquí.

  // Función para cambiar entre modo SignIn y SignUp
  const toggleMode = () => {
    const newIsSignUp = !isSignUp;
    setIsSignUp(newIsSignUp); // Actualiza el estado de la UI inmediatamente

    // Actualiza la URL para reflejar el estado y permitir enlaces profundos/recarga
    const newPath = newIsSignUp ? `${pathname}#signup` : pathname;
    // Usamos replace para no llenar tanto el historial con cada toggle, push también es válido.
    router.replace(newPath, { scroll: false });
  };

  useEffect(() => {
    if (isLoaded && sessionId) {
      const redirectUrl = new URLSearchParams(window.location.search).get('redirect_url');
      const dest = redirectUrl || '/';
      router.push(dest);
    }
  }, [isLoaded, sessionId, router]);

  if (!isLoaded || sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">
        Cargando…
      </div>
    );
  }

  const afterUrl = new URLSearchParams(window.location.search).get('redirect_url') || '/';
  
  const clerkPrimaryColor = isSignUp ? '#059669' : '#5b21b6';
  const clerkButtonClasses = `w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white shadow-md hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all duration-200 ease-in-out transform hover:scale-[1.02] ${
    isSignUp
    ? 'bg-green-600 hover:bg-green-700 focus-visible:outline-green-600'
    : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600'
  }`;
  const clerkFocusRingClass = isSignUp ? 'focus:ring-green-500' : 'focus:ring-indigo-500';

  const clerkAppearance = {
    variables: { colorPrimary: clerkPrimaryColor, fontWeight: { normal: '400', medium: '500', bold: '600'} , borderRadius: '0.5rem'},
    elements: {
      rootBox: 'w-full',
      card: 'shadow-none bg-transparent p-0 m-0',
      formFieldInput: `w-full rounded-lg border-gray-300 shadow-sm ${clerkFocusRingClass} sm:text-sm placeholder:text-gray-400 py-2.5`, // Aumentado padding vertical
      formButtonPrimary: clerkButtonClasses,
      dividerLine: 'my-6 bg-gray-300', // Más margen vertical para el divisor
      alternativeMethodsBlockButton: `w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-150 ease-in-out transform hover:scale-[1.02]`,
      socialButtonsBlockButton: `w-full rounded-lg border border-gray-300 bg-white py-2.5 px-4 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-150 ease-in-out transform hover:scale-[1.02]`,
      formFieldLabel: 'text-sm font-medium text-gray-700 mb-1.5',
      footer: { display: 'none' }, // Oculta el footer por defecto de Clerk
    },
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4 overflow-hidden"> {/* Fondo oscuro general */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} // Animación de entrada del contenedor general
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
        className={`flex flex-col md:flex-row rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full h-auto md:min-h-[600px] bg-opacity-20 backdrop-filter backdrop-blur-lg`} // Un poco de efecto vidrio
        // El backgroundImage del degradado se aplica directamente aquí o se podría quitar si el fondo general de la página es suficiente
        style={{
          backgroundImage: isSignUp
            ? 'linear-gradient(to right, rgba(16, 185, 129, 0.9), rgba(20, 184, 166, 0.9))' // Verde con transparencia
            : 'linear-gradient(to left, rgba(99, 102, 241, 0.9), rgba(139, 92, 246, 0.9))', // Índigo con transparencia
        }}
      >
        {/* El orden en el DOM es TextPanel primero, luego AuthPanel. 
            En móvil (flex-col), AuthPanel (order-1) se muestra primero.
            En desktop (md:flex-row / md:flex-row-reverse), el orden del DOM y flex-direction determinan la posición.
        */}
        <TextPanelPlaceholder isSignUp={isSignUp} onToggleMode={toggleMode} />
        
        <AuthPanel
          key={`auth-panel-${isSignUp ? 'signup' : 'signin'}`} // Key para forzar re-montaje/animación si es necesario por cambio de 'isSignUp' prop en variants
          isSignUp={isSignUp}
          title={isSignUp ? "Crea tu Perfil" : "Bienvenido de Nuevo"}
          subtitle={isSignUp ? "Únete para una experiencia completa." : "Accede a tu cuenta."}
        >
          {/* AnimatePresence para la transición interna del formulario de Clerk */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? 'clerk-signup-form' : 'clerk-signin-form'}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0, transition:{ delay:0.1, duration: 0.35, ease:"circOut" } }}
              exit={{ opacity: 0, x: -15, transition:{ duration:0.2, ease:"circIn" } }}
              className="w-full"
            >
              {isSignUp ? (
                <SignUp
                  routing="path"
                  path={pathname}
                  afterSignUpUrl={afterUrl}
                  appearance={clerkAppearance}
                />
              ) : (
                <SignIn
                  routing="path"
                  path={pathname}
                  afterSignInUrl={afterUrl}
                  appearance={clerkAppearance}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </AuthPanel>
      </motion.div>
    </div>
  );
}