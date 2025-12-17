/**
 * Translations for the app
 * Spanish (es) and English (en)
 */

export const translations = {
  es: {
    // Auth
    authLoginTitle: 'Iniciar sesión',
    authRegisterTitle: 'Crear cuenta',
    authLoginHelper: 'Usa tu usuario y contraseña.',
    authRegisterHelper: 'Usuario y contraseña para guardar tus puntos.',
    authSubmitLogin: 'Entrar',
    authSubmitRegister: 'Crear cuenta',
    authSwitchToLogin: '¿Ya tienes cuenta? Inicia sesión',
    authSwitchToRegister: '¿Eres nuevo? Crea tu cuenta',
    authCancel: 'Cancelar',
    email: 'Email',
    confirmPassword: 'Repite contraseña',
    authMinChars: 'Mínimo 6 caracteres (faltan {n})',
    authNeedUpper: 'Falta 1 mayúscula',
    authNeedSymbol: 'Falta 1 símbolo',
    authPasswordsMustMatch: 'Las contraseñas deben coincidir',
    authFillAllFields: 'Completa todos los campos.',
    authInvalidEmail: 'Formato de email inválido.',
    authPasswordLength: 'La contraseña necesita al menos 6 caracteres.',
    authPasswordRequirement: 'La contraseña debe incluir al menos 1 mayúscula y 1 símbolo.',
    authPasswordMismatch: 'Las contraseñas no coinciden.',
    authRegisterFailed: 'Registro fallido. ¿Usuario ya registrado? ¿Backend activo?',
    authLoginFailed: 'Login fallido. Revisa usuario/contraseña y que el backend está activo.',

    // Header
    forParents: 'Para Padres',
    login: 'Iniciar sesión',
    logout: 'Salir',
    greeting: 'Hola,',
    students: '⚙️ Alumnos',
    
    // Hero
    heroTitle: '¡Hola, amigo!',
    heroSubtitle: '¡Vamos a aprender y jugar en español!',
    startLearning: 'Empezar a Jugar!',
    
    // Menu
    chooseAdventure: 'Elige tu aventura',
    videos: 'Videos',
    videosDesc: 'Aprende con videos educativos',
    games: 'Juegos',
    gamesDesc: 'Practica con juegos divertidos',
    vocabulary: 'Vocabulario',
    vocabularyDesc: 'Aprende nuevas palabras',
    grammar: 'Gramática',
    grammarDesc: 'Reglas y ejemplos',
    purchaseLicense: 'Comprar Licencia',
    purchaseLicenseDesc: 'Acceso completo y gestión de alumnos',
    
    // Videos section
    back: 'Volver',
    videoPanel: 'Panel de Videos',
    videoPanelDesc: 'Mira y aprende con nuestros divertidos videos educativos.',
    searchPlaceholder: '¿Qué quieres aprender hoy?',
    searchTopicPlaceholder: 'Buscar tema...',
    allBlocks: 'Todos los bloques',
    
    // Vocabulario section
    vocabularyTitle: 'Selección de Temas de Vocabulario',
    vocabularyDesc: 'Aprende nuevas palabras por temas y practica con ejemplos.',
    
    // Gramática section
    grammarTitle: 'Gramática',
    grammarDesc: 'Reglas y ejemplos para hablar y escribir mejor.',
    
    // Games section
    gamesTitle: '🎮 Juegos',
    gamesDesc: 'Aprende jugando con nuestros juegos interactivos.',
    comingSoon: '¡Próximamente!',
    gamesComingSoonDesc: 'Estamos preparando juegos increíbles para ti.',
    backToMenu: '← Volver al Menú',
    score: 'Puntos: 0',
    
    // Parents page
    parentsTitle: 'Para Padres y Educadores',
    parentsSubtitle: 'Descubre cómo ayudamos a tus hijos a aprender español de forma divertida y efectiva',
    missionTitle: 'Nuestra Misión',
    missionText: 'El Rincón Español es una plataforma educativa diseñada especialmente para niños de 5 a 12 años que están aprendiendo español. Nuestro objetivo es hacer que el aprendizaje del idioma sea una experiencia divertida, interactiva y memorable.',
    methodTitle: 'Metodología',
    methodText: 'Utilizamos un enfoque basado en el juego y la gamificación para enseñar vocabulario, gramática y comprensión. Los niños aprenden mejor cuando se divierten, y nuestros juegos están diseñados para mantener su interés mientras refuerzan conceptos clave del idioma.',
    featuresTitle: 'Características',
    feature1: '🎮 Juegos interactivos adaptados a diferentes niveles',
    feature2: '🎬 Videos educativos con contenido apropiado para niños',
    feature3: '📖 Lecciones de vocabulario organizadas por temas',
    feature4: '📝 Ejercicios de gramática explicados de forma sencilla',
    feature5: '🏆 Sistema de puntos y recompensas para motivar',
    feature6: '👨‍👩‍👧‍👦 Entorno seguro y sin publicidad',
    professorTitle: 'Sobre el Profesor',
    professorRole: 'Creador y Educador',
    professorBio1: 'Soy un profesor apasionado por la enseñanza del español a niños. Con años de experiencia en educación infantil, he desarrollado esta plataforma para hacer que el aprendizaje del español sea accesible y divertido para todos los niños.',
    professorBio2: 'Mi enfoque se basa en la inmersión lúdica, donde los niños aprenden jugando y descubriendo el idioma de forma natural, sin presión y a su propio ritmo.',
    credential1: 'Licenciatura en Educación',
    credential2: 'Especialización en Enseñanza de Idiomas',
    credential3: '+10 años de experiencia con niños',
    contactTitle: '¿Tienes preguntas?',
    contactText: 'Estamos aquí para ayudarte. Si tienes alguna pregunta sobre la plataforma o cómo puede beneficiar a tu hijo, no dudes en contactarnos.',
    contactBtn: 'Contactar',
    
    // Footer
    terms: 'Términos de Servicio',
    privacy: 'Política de Privacidad',
    contact: 'Contacto',
    
    // Purchase/Billing
    purchaseLicenseTitle: 'Licencia App Boys Games',
    purchaseFeature1: 'Acceso completo a todas las funciones',
    purchaseFeature2: 'Crea hasta 30 cuentas para tus alumnos',
    purchaseFeature3: 'Panel de administración completo',
    purchaseFeature4: 'Seguimiento del progreso de los alumnos',
    purchaseButton: 'Comprar licencia',
    purchaseDisclaimer: 'Pago seguro procesado por Stripe',
    processing: 'Procesando...',
    purchaseError: 'Error al crear la sesión de pago',
    purchaseSuccess: '¡Pago completado!',
    purchaseSuccessDesc: 'Tu licencia se está activando. Tu cuenta será actualizada a admin en breve.',
    purchaseSuccessNote: 'Por favor, cierra sesión y vuelve a iniciar sesión para ver los cambios.',
    purchaseCanceled: 'Pago cancelado',
    purchaseCanceledDesc: 'No se ha realizado ningún cargo. Puedes volver a intentarlo cuando quieras.',
    tryAgain: 'Volver a intentar',
    goToHome: 'Ir al inicio',

    // Students Management
    studentsManagement: 'Gestión de Alumnos',
    backToHome: 'Volver al inicio',
    createNewStudent: 'Crear nuevo alumno',
    fullName: 'Nombre completo',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    createStudent: 'Crear alumno',
    studentsList: 'Lista de alumnos',
    loadingStudents: 'Cargando alumnos...',
    noStudentsYet: 'No has creado ningún alumno todavía.',
    delete: 'Eliminar',
    loadingStudentsError: 'Error al cargar los alumnos',
    creating: 'Creando...',
    studentCreatedSuccess: 'Alumno creado correctamente',
    createStudentError: 'Error al crear el alumno',
    confirmDeleteStudent: '¿Estás seguro de que quieres eliminar este alumno?',
    deleteStudentError: 'Error al eliminar el alumno',
    accessDenied: 'Acceso denegado',
    accessDeniedDesc: 'Solo los administradores pueden acceder a esta sección.',
    authError: 'Error de autenticación',
    authErrorDesc: 'Por favor, inicia sesión para continuar.',

    // Common
    loading: 'Cargando...',
    error: 'Error al cargar contenido.',
    noContent: 'No hay contenido disponible para este filtro.',
    readMore: 'Leer más',
  },
  
  en: {
    // Auth
    authLoginTitle: 'Sign in',
    authRegisterTitle: 'Create account',
    authLoginHelper: 'Use your username and password.',
    authRegisterHelper: 'Username and password to save your points.',
    authSubmitLogin: 'Sign in',
    authSubmitRegister: 'Create account',
    authSwitchToLogin: 'Already have an account? Sign in',
    authSwitchToRegister: 'New here? Create your account',
    authCancel: 'Cancel',
    email: 'Email',
    confirmPassword: 'Repeat password',
    authMinChars: 'Minimum 6 characters (missing {n})',
    authNeedUpper: 'Missing 1 uppercase letter',
    authNeedSymbol: 'Missing 1 symbol',
    authPasswordsMustMatch: 'Passwords must match',
    authFillAllFields: 'Fill in all fields.',
    authInvalidEmail: 'Invalid email format.',
    authPasswordLength: 'Password needs at least 6 characters.',
    authPasswordRequirement: 'Password must include at least 1 uppercase and 1 symbol.',
    authPasswordMismatch: 'Passwords do not match.',
    authRegisterFailed: 'Signup failed. Already registered? Backend up?',
    authLoginFailed: 'Login failed. Check username/password and that the backend is up.',

    // Header
    forParents: 'For Parents',
    login: 'Sign in',
    logout: 'Sign out',
    greeting: 'Hello,',
    students: '⚙️ Students',
    
    // Hero
    heroTitle: 'Hello, friend!',
    heroSubtitle: "Let's learn and play in Spanish!",
    startLearning: 'Learn by Playing!',
    
    // Menu
    chooseAdventure: 'Choose your adventure',
    videos: 'Videos',
    videosDesc: 'Learn with educational videos',
    games: 'Games',
    gamesDesc: 'Practice with fun games',
    vocabulary: 'Vocabulary',
    vocabularyDesc: 'Learn new words',
    grammar: 'Grammar',
    grammarDesc: 'Rules and examples',
    purchaseLicense: 'Purchase License',
    purchaseLicenseDesc: 'Full access and student management',
    
    // Videos section
    back: 'Back',
    videoPanel: 'Video Panel',
    videoPanelDesc: 'Watch and learn with our fun educational videos.',
    searchPlaceholder: 'What do you want to learn today?',
    searchTopicPlaceholder: 'Search topic...',
    allBlocks: 'All blocks',
    
    // Vocabulario section
    vocabularyTitle: 'Vocabulary Topic Selection',
    vocabularyDesc: 'Learn new words by topic and practice with examples.',
    
    // Gramática section
    grammarTitle: 'Grammar',
    grammarDesc: 'Rules and examples for better speaking and writing.',
    
    // Games section
    gamesTitle: '🎮 Games',
    gamesDesc: 'Learn while playing with our interactive games.',
    comingSoon: 'Coming Soon!',
    gamesComingSoonDesc: 'We are preparing amazing games for you.',
    backToMenu: '← Back to Menu',
    score: 'Score: 0',
    
    // Parents page
    parentsTitle: 'For Parents and Educators',
    parentsSubtitle: 'Discover how we help your children learn Spanish in a fun and effective way',
    missionTitle: 'Our Mission',
    missionText: 'El Rincón Español is an educational platform specially designed for children ages 5-12 who are learning Spanish. Our goal is to make language learning a fun, interactive, and memorable experience.',
    methodTitle: 'Methodology',
    methodText: 'We use a game-based and gamification approach to teach vocabulary, grammar, and comprehension. Children learn best when they have fun, and our games are designed to keep them engaged while reinforcing key language concepts.',
    featuresTitle: 'Features',
    feature1: '🎮 Interactive games adapted to different levels',
    feature2: '🎬 Educational videos with child-appropriate content',
    feature3: '📖 Vocabulary lessons organized by topics',
    feature4: '📝 Grammar exercises explained simply',
    feature5: '🏆 Points and rewards system for motivation',
    feature6: '👨‍👩‍👧‍👦 Safe and ad-free environment',
    professorTitle: 'About the Teacher',
    professorRole: 'Creator and Educator',
    professorBio1: "I'm a teacher passionate about teaching Spanish to children. With years of experience in early childhood education, I developed this platform to make learning Spanish accessible and fun for all children.",
    professorBio2: 'My approach is based on playful immersion, where children learn by playing and discovering the language naturally, without pressure and at their own pace.',
    credential1: 'Degree in Education',
    credential2: 'Specialization in Language Teaching',
    credential3: '+10 years of experience with children',
    contactTitle: 'Have questions?',
    contactText: "We're here to help. If you have any questions about the platform or how it can benefit your child, don't hesitate to contact us.",
    contactBtn: 'Contact',
    
    // Footer
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    contact: 'Contact',
    
    // Purchase/Billing
    purchaseLicenseTitle: 'App Boys Games License',
    purchaseFeature1: 'Full access to all features',
    purchaseFeature2: 'Create up to 30 student accounts',
    purchaseFeature3: 'Complete admin panel',
    purchaseFeature4: 'Track student progress',
    purchaseButton: 'Purchase license',
    purchaseDisclaimer: 'Secure payment processed by Stripe',
    processing: 'Processing...',
    purchaseError: 'Error creating payment session',
    purchaseSuccess: 'Payment completed!',
    purchaseSuccessDesc: 'Your license is being activated. Your account will be upgraded to admin shortly.',
    purchaseSuccessNote: 'Please log out and log back in to see the changes.',
    purchaseCanceled: 'Payment canceled',
    purchaseCanceledDesc: 'No charge was made. You can try again whenever you want.',
    tryAgain: 'Try again',
    goToHome: 'Go to home',

    // Students Management
    studentsManagement: 'Student Management',
    backToHome: 'Back to home',
    createNewStudent: 'Create new student',
    fullName: 'Full name',
    username: 'Username',
    password: 'Password',
    createStudent: 'Create student',
    studentsList: 'Students list',
    loadingStudents: 'Loading students...',
    noStudentsYet: 'You haven\'t created any students yet.',
    delete: 'Delete',
    loadingStudentsError: 'Error loading students',
    creating: 'Creating...',
    studentCreatedSuccess: 'Student created successfully',
    createStudentError: 'Error creating student',
    confirmDeleteStudent: 'Are you sure you want to delete this student?',
    deleteStudentError: 'Error deleting student',
    accessDenied: 'Access denied',
    accessDeniedDesc: 'Only administrators can access this section.',
    authError: 'Authentication error',
    authErrorDesc: 'Please log in to continue.',

    // Common
    loading: 'Loading...',
    error: 'Error loading content.',
    noContent: 'No content available for this filter.',
    readMore: 'Read more',
  }
};

// Current language state
let currentLang = localStorage.getItem('app-language') || 'es';

/**
 * Get translation for a key
 */
export function t(key) {
  return translations[currentLang][key] || translations['es'][key] || key;
}

/**
 * Get current language
 */
export function getCurrentLang() {
  return currentLang;
}

/**
 * Set language and save to localStorage
 */
export function setLanguage(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('app-language', lang);
  document.documentElement.lang = lang;
  updatePageTranslations();
}

/**
 * Toggle between languages
 */
export function toggleLanguage() {
  const newLang = currentLang === 'es' ? 'en' : 'es';
  setLanguage(newLang);
  return newLang;
}

/**
 * Update all translatable elements on the page
 */
export function updatePageTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translation;
    } else {
      el.textContent = translation;
    }
  });
  
  // Update elements with data-i18n-html (for innerHTML)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });
  
  // Update language toggle button
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.textContent = currentLang === 'es' ? '🇬🇧 EN' : '🇪🇸 ES';
    langBtn.setAttribute('aria-label', currentLang === 'es' ? 'Switch to English' : 'Cambiar a Español');
  }
}

/**
 * Initialize i18n system
 */
export function initI18n() {
  // Set initial language from localStorage or default to Spanish
  const savedLang = localStorage.getItem('app-language') || 'es';
  currentLang = savedLang;
  document.documentElement.lang = savedLang;
  
  // Wire language toggle button
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn && !langBtn.__wired) {
    langBtn.__wired = true;
    langBtn.addEventListener('click', () => {
      toggleLanguage();
    });
  }
  
  // Initial update
  updatePageTranslations();
}
