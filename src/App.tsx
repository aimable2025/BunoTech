import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  Cloud,
  Code2,
  Compass,
  Database,
  Download,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Languages,
  Layers,
  Lightbulb,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  Rocket,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  generateId,
  googleProvider,
  handleFirestoreError,
  isVerifiedAdminUser,
  OperationType,
} from './firebase';
import {
  BUNO_TECH_MANIFEST,
  CAREER_TIMELINE,
  createSystemNotification,
  CV_COMPETENCIES,
  CV_LANGUAGES,
  DETAILED_SKILLS_CATEGORIES,
  HERO_STUDIO_IMAGE,
  INITIAL_PARTNERS,
  INITIAL_PORTFOLIO,
  INITIAL_PRICING_RULES,
  INITIAL_SERVICES,
  INITIAL_SITE_SETTINGS,
  INITIAL_SUBSCRIPTION_PLANS,
  INITIAL_TEMPLATES,
  REAL_EDUCATION_ITEMS,
  REAL_WORK_EXPERIENCES,
  seedInitialCatalogToFirestore,
  writeAuditLog,
} from './data/initialCatalog';
import { TRANSLATIONS } from './i18n';
import {
  AppNotification,
  AuditLog,
  ClientDocument,
  ClientSubscription,
  DirectMessage,
  DocumentTemplate,
  Language,
  PartnerItem,
  PaymentRecord,
  PortfolioProject,
  PricingRule,
  QuoteDocument,
  QuoteLineItemInput,
  ServiceItem,
  ServiceRequest,
  SiteSettings,
  SubscriptionPlan,
  TestimonialItem,
  TrainingProgress,
  UserProfile,
} from './types';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { QuoteModalAndPrinter } from './components/QuoteModalAndPrinter';
import { PremiumWorkspace } from './components/PremiumWorkspace';
import { ClientDashboard } from './components/ClientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { FAQAccordion } from './components/FAQSection';

type ViewMode =
  | 'home'
  | 'services'
  | 'about'
  | 'portfolio'
  | 'partners'
  | 'testimonials'
  | 'quote_calculator'
  | 'contact'
  | 'premium'
  | 'client_dashboard'
  | 'admin_dashboard'
  | 'auth';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const t = TRANSLATIONS[lang];

  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Profile State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined);

  // Registration Completion Form State (when creating client account)
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(true);

  // Dynamic Catalog State (loaded from Firestore, falling back to INITIAL baseline only if Firestore is not yet seeded)
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(INITIAL_PRICING_RULES);
  const [portfolio, setPortfolio] = useState<PortfolioProject[]>(INITIAL_PORTFOLIO);
  const [partners, setPartners] = useState<PartnerItem[]>(INITIAL_PARTNERS);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(INITIAL_SUBSCRIPTION_PLANS);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(INITIAL_TEMPLATES);

  // Real Operational Data State (Strictly from Firestore — never faked!)
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<QuoteDocument[]>([]);
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<ClientDocument[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [allClients, setAllClients] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Portfolio & Partners Filters
  const [portfolioFilter, setPortfolioFilter] = useState<string>('ALL');
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL');

  // Quote Calculator State (Section 16)
  const [calcCurrency, setCalcCurrency] = useState<'USD' | 'CDF'>('USD');
  const [calcLines, setCalcLines] = useState<
    { pricingId: string; description: string; itemType: string; quantity: number; format: string }[]
  >([
    {
      pricingId: 'prc_saisie_page_a4',
      description: 'Saisie',
      itemType: 'Page',
      quantity: 5,
      format: 'A4',
    },
    {
      pricingId: 'prc_impression_couleur_a4',
      description: 'Impression',
      itemType: 'En couleur',
      quantity: 8,
      format: 'A4',
    },
  ]);
  const [calculatingQuote, setCalculatingQuote] = useState(false);
  const [generatedQuoteModal, setGeneratedQuoteModal] = useState<QuoteDocument | null>(null);
  const [calcFeedback, setCalcFeedback] = useState<string | null>(null);

  // Contact Page Form State (Section 12)
  const [contactSubject, setContactSubject] = useState('');
  const [contactType, setContactType] = useState('Demande de service numérique');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactAttachment, setContactAttachment] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactConfirmation, setContactConfirmation] = useState<string | null>(null);

  const isAdmin = isVerifiedAdminUser(
    firebaseUser?.email,
    firebaseUser?.emailVerified,
    userProfile?.role
  );

  // 1. Auth Listener & Profile Bootstrap
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      setFirebaseUser(usr);
      if (!usr) {
        setUserProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', usr.uid);
        const snap = await getDoc(userRef);
        const isBootstrappedAdmin = isVerifiedAdminUser(usr.email, usr.emailVerified);

        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
        } else {
          const newProfile: UserProfile = {
            uid: usr.uid,
            fullName: (usr.displayName || regName || usr.email?.split('@')[0] || 'Client BUNO Tech').slice(0, 115),
            email: (usr.email || 'client@bunotech.com').slice(0, 145),
            phone: regPhone.slice(0, 38),
            organization: regOrg.slice(0, 115),
            role: isBootstrappedAdmin ? 'admin' : 'client',
            status: 'active',
            acceptedTerms: true,
          };
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setUserProfile(newProfile);
        }

        // If admin logs in and settings/main does not exist yet in Firestore, auto-seed catalog
        if (isBootstrappedAdmin) {
          const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
          if (!settingsSnap.exists()) {
            await seedInitialCatalogToFirestore(usr.uid, usr.email || 'aimablebunotech@gmail.com');
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [regName, regOrg, regPhone]);

  // 2. Public Catalog Firestore Listeners
  useEffect(() => {
    const unsubSettings = onSnapshot(
      query(collection(db, 'settings'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setSettings(snap.docs[0].data() as SiteSettings);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'settings')
    );

    const unsubServices = onSnapshot(
      query(collection(db, 'services'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => d.data() as ServiceItem);
          items.sort((a, b) => a.orderIndex - b.orderIndex);
          setServices(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'services')
    );

    const unsubPricing = onSnapshot(
      query(collection(db, 'pricing'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setPricingRules(snap.docs.map((d) => d.data() as PricingRule));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'pricing')
    );

    const unsubPortfolio = onSnapshot(
      query(collection(db, 'portfolio'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setPortfolio(snap.docs.map((d) => d.data() as PortfolioProject));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'portfolio')
    );

    const unsubPartners = onSnapshot(
      query(collection(db, 'partners'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setPartners(snap.docs.map((d) => d.data() as PartnerItem));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'partners')
    );

    const unsubTestimonials = onSnapshot(
      query(collection(db, 'testimonials'), where('isPublic', '==', true)),
      (snap) => {
        setTestimonials(snap.docs.map((d) => d.data() as TestimonialItem));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
    );

    const unsubPlans = onSnapshot(
      query(collection(db, 'subscriptionPlans'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => d.data() as SubscriptionPlan);
          items.sort((a, b) => a.durationDays - b.durationDays);
          setSubscriptionPlans(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptionPlans')
    );

    const unsubTemplates = onSnapshot(
      query(collection(db, 'templates'), where('isPublic', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setTemplates(snap.docs.map((d) => d.data() as DocumentTemplate));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'templates')
    );

    return () => {
      unsubSettings();
      unsubServices();
      unsubPricing();
      unsubPortfolio();
      unsubPartners();
      unsubTestimonials();
      unsubPlans();
      unsubTemplates();
    };
  }, []);

  // 3. Authenticated User / Admin Operational Listeners
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setServiceRequests([]);
      setQuotes([]);
      setSubscriptions([]);
      setPayments([]);
      setSavedDocuments([]);
      setTrainingProgress([]);
      setMessages([]);
      setNotifications([]);
      setAllClients([]);
      setAuditLogs([]);
      return;
    }

    const uid = firebaseUser.uid;
    const adminMode = isVerifiedAdminUser(firebaseUser.email, firebaseUser.emailVerified, userProfile?.role);

    const reqQuery = adminMode
      ? collection(db, 'serviceRequests')
      : query(collection(db, 'serviceRequests'), where('clientId', '==', uid));

    const quoteQuery = adminMode
      ? collection(db, 'quotes')
      : query(collection(db, 'quotes'), where('clientId', '==', uid));

    const subQuery = adminMode
      ? collection(db, 'subscriptions')
      : query(collection(db, 'subscriptions'), where('clientId', '==', uid));

    const payQuery = adminMode
      ? collection(db, 'payments')
      : query(collection(db, 'payments'), where('clientId', '==', uid));

    const docQuery = query(collection(db, 'documents'), where('ownerId', '==', uid));
    const progQuery = query(collection(db, 'trainingProgress'), where('userId', '==', uid));

    const msgQuery = adminMode
      ? collection(db, 'messages')
      : query(collection(db, 'messages'), where('threadClientId', '==', uid));

    const notifQuery = adminMode
      ? collection(db, 'notifications')
      : query(collection(db, 'notifications'), where('recipientId', '==', uid));

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        reqQuery,
        (snap) => setServiceRequests(snap.docs.map((d) => d.data() as ServiceRequest)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'serviceRequests')
      ),
      onSnapshot(
        quoteQuery,
        (snap) => setQuotes(snap.docs.map((d) => d.data() as QuoteDocument)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'quotes')
      ),
      onSnapshot(
        subQuery,
        (snap) => setSubscriptions(snap.docs.map((d) => d.data() as ClientSubscription)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'subscriptions')
      ),
      onSnapshot(
        payQuery,
        (snap) => setPayments(snap.docs.map((d) => d.data() as PaymentRecord)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
      ),
      onSnapshot(
        docQuery,
        (snap) => setSavedDocuments(snap.docs.map((d) => d.data() as ClientDocument)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'documents')
      ),
      onSnapshot(
        progQuery,
        (snap) => setTrainingProgress(snap.docs.map((d) => d.data() as TrainingProgress)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'trainingProgress')
      ),
      onSnapshot(
        msgQuery,
        (snap) => setMessages(snap.docs.map((d) => d.data() as DirectMessage)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'messages')
      ),
      onSnapshot(
        notifQuery,
        (snap) => setNotifications(snap.docs.map((d) => d.data() as AppNotification)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    if (adminMode) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => setAllClients(snap.docs.map((d) => d.data() as UserProfile)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        ),
        onSnapshot(
          collection(db, 'auditLogs'),
          (snap) => setAuditLogs(snap.docs.map((d) => d.data() as AuditLog)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
        ),
        onSnapshot(
          collection(db, 'testimonials'),
          (snap) => setTestimonials(snap.docs.map((d) => d.data() as TestimonialItem)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
        )
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [authReady, firebaseUser, userProfile?.role]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    if (!regAcceptedTerms) {
      setAuthError('Veuillez accepter les conditions générales d’utilisation de BUNO Tech.');
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await writeAuditLog(
        result.user.uid,
        result.user.email || 'user',
        'USER_LOGIN',
        'user',
        result.user.uid,
        'Connexion sécurisée au compte BUNO Tech.'
      );
      if (isVerifiedAdminUser(result.user.email, result.user.emailVerified)) {
        setCurrentView('admin_dashboard');
      } else {
        setCurrentView('client_dashboard');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erreur lors de la connexion.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentView('home');
  };

  // Quote Calculator Logic (Section 16)
  // Prix total ligne = Quantité × Prix unitaire ; Total devis = Somme des prix des lignes
  const computedQuoteLines: QuoteLineItemInput[] = calcLines.map((line, idx) => {
    const matchedRule =
      pricingRules.find((r) => r.id === line.pricingId) ||
      pricingRules.find(
        (r) =>
          r.serviceName.toLowerCase() === line.description.toLowerCase() &&
          r.itemType.toLowerCase() === line.itemType.toLowerCase()
      ) ||
      pricingRules[0];

    const unitPrice = matchedRule
      ? calcCurrency === 'USD'
        ? matchedRule.unitPriceUSD
        : matchedRule.unitPriceCDF
      : 0;
    const qty = Math.max(1, Number(line.quantity) || 1);
    const totalPrice = Number((qty * unitPrice).toFixed(2));

    return {
      lineNumber: idx + 1,
      description: matchedRule ? matchedRule.serviceName : line.description,
      itemType: matchedRule ? matchedRule.itemType : line.itemType,
      quantity: qty,
      format: matchedRule ? matchedRule.format : line.format,
      unitPrice,
      totalPrice,
    };
  });

  const computedSubtotal = Number(
    computedQuoteLines.reduce((acc, item) => acc + item.totalPrice, 0).toFixed(2)
  );

  const handleCalculateAndSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !firebaseUser) {
      setCalcFeedback('Veuillez vous connecter en un clic à votre compte client pour enregistrer et télécharger votre devis officiel.');
      setCurrentView('auth');
      return;
    }
    if (computedQuoteLines.length === 0) return;

    setCalculatingQuote(true);
    setCalcFeedback(null);

    const quoteId = generateId('quote');
    const quoteNumber = `DEV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const quoteDoc: QuoteDocument = {
      id: quoteId,
      quoteNumber,
      clientId: userProfile.uid,
      clientName: userProfile.fullName,
      clientEmail: userProfile.email,
      currency: calcCurrency,
      itemsSummary: JSON.stringify(computedQuoteLines).slice(0, 3950),
      itemsCount: computedQuoteLines.length,
      initialSubtotal: computedSubtotal,
      discountRequestedAmount: 0,
      discountJustification: '',
      discountGrantedAmount: 0,
      finalTotal: computedSubtotal,
      decisionAuthor: '',
      validityDays: 30,
      conditions: 'Devis calculé selon les tarifs officiels BUNO Tech. Valable 30 jours.',
      status: 'sent',
    };

    try {
      await setDoc(doc(db, 'quotes', quoteId), {
        ...quoteDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_quote_calculated',
        `Nouveau devis généré : ${quoteNumber}`,
        `${userProfile.fullName} a généré le devis ${quoteNumber} (${computedQuoteLines.length} lignes) pour un total de ${
          calcCurrency === 'USD' ? `$${computedSubtotal.toFixed(2)}` : `${computedSubtotal.toLocaleString('fr-FR')} CDF`
        }.`,
        quoteId
      );

      await writeAuditLog(
        userProfile.uid,
        userProfile.email,
        'QUOTE_GENERATED',
        'quote',
        quoteId,
        `Devis ${quoteNumber} calculé et enregistré (${computedSubtotal} ${calcCurrency}).`
      );

      setGeneratedQuoteModal(quoteDoc);
      setCalcFeedback(`Devis officiel ${quoteNumber} calculé et enregistré avec succès.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `quotes/${quoteId}`);
    } finally {
      setCalculatingQuote(false);
    }
  };

  // Contact Page Form Submit (Section 12)
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !firebaseUser) {
      setContactConfirmation('Veuillez vous connecter à votre compte client pour soumettre votre demande et suivre la réponse de l’administrateur.');
      setCurrentView('auth');
      return;
    }
    if (!contactSubject.trim() || !contactMessage.trim()) return;

    setContactSubmitting(true);
    setContactConfirmation(null);
    const reqId = generateId('req');
    const refCode = `CNT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await setDoc(doc(db, 'serviceRequests', reqId), {
        id: reqId,
        referenceCode: refCode,
        clientId: userProfile.uid,
        clientName: userProfile.fullName,
        clientEmail: userProfile.email,
        serviceId: 'contact_inquiry',
        serviceTitle: `${contactType} — ${contactSubject.trim()}`.slice(0, 145),
        description: contactMessage.trim().slice(0, 2900),
        priority: 'Normale',
        desiredDeadline: 'Contact direct',
        indicativeBudget: '',
        attachmentName: contactAttachment.trim().slice(0, 190),
        comments: contactPhone ? `Tél: ${contactPhone}` : '',
        status: 'submitted',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_contact_request',
        `Nouveau message de contact ${refCode}`,
        `${userProfile.fullName} : ${contactSubject.trim()}`,
        reqId
      );

      setContactSubject('');
      setContactMessage('');
      setContactAttachment('');
      setContactConfirmation(
        `Votre demande a été enregistrée sous la référence vérifiable ${refCode}. L’administrateur a été notifié et vous répondra dans votre Espace Client.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `serviceRequests/${reqId}`);
    } finally {
      setContactSubmitting(false);
    }
  };

  const renderServiceIcon = (iconName: string) => {
    const map: Record<string, React.ComponentType<{ className?: string }>> = {
      Code2,
      Smartphone,
      Globe,
      Bot,
      Building2,
      Cloud,
      Wrench,
      GraduationCap,
      Lightbulb,
      Rocket,
      BarChart3,
      FileText,
    };
    const IconComponent = map[iconName] || Code2;
    return <IconComponent className="w-5 h-5 text-sky-600 shrink-0" />;
  };

  const handleDownloadPortfolioAttachment = (project: PortfolioProject) => {
    if (!project.allowDownload) return;
    const content = `FICHE PROJET OFFICIELLE — ${settings.brandName}\n==================================================\nTitre : ${project.title}\nCatégorie : ${project.category}\nAnnée : ${project.completionDate}\nClient / Projet : ${project.clientName}\nTechnologies : ${project.technologies}\n\nDescription détaillée :\n${project.description}\n\nContact : ${settings.ownerName} (${settings.email} | WhatsApp ${settings.whatsapp})`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = project.attachmentName.replace(/\.pdf$/i, '.txt') || 'Fiche-Projet-BUNO-Tech.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const portfolioCategories = ['ALL', ...Array.from(new Set(portfolio.map((p) => p.category)))];
  const filteredPortfolio =
    portfolioFilter === 'ALL' ? portfolio : portfolio.filter((p) => p.category === portfolioFilter);

  const partnerCategories = ['ALL', 'ONG', 'Entreprises', 'Particuliers', 'Institutions', 'Associations', 'Autres'];
  const filteredPartners =
    partnerFilter === 'ALL' ? partners : partners.filter((p) => p.category === partnerFilter);

  const publishedTestimonials = testimonials.filter((t) => t.status === 'published' && t.isPublic);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <OfflineIndicator />

      {/* TOP NAVIGATION BAR — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="text-lg font-extrabold tracking-tight text-slate-950 font-display whitespace-nowrap cursor-pointer"
          >
            {settings.brandName}
          </button>

          {/* Zone 2: 5-6 Clean Single-Line Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'home' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navHome}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('services')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'services' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navServices}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('about')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'about' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navAbout}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('portfolio')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'portfolio' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navPortfolio}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('quote_calculator')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'quote_calculator' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navQuoteCalc}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('premium')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'premium' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navPremium}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('contact')}
              className={`hover:text-slate-950 transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'contact' ? 'text-slate-950 underline underline-offset-8 decoration-2 decoration-sky-600' : ''
              }`}
            >
              {t.navContact}
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Auth */}
          <div className="hidden md:flex items-center gap-2.5">
            <select
              aria-label="Langue"
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="sw">SW</option>
            </select>

            <PWAInstallButton variant="compact" />

            <button
              type="button"
              onClick={() => setCurrentView('quote_calculator')}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t.ctaRequestQuote}
            </button>

            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('client_dashboard')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.navClientSpace}</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('admin_dashboard')}
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 whitespace-nowrap cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 text-slate-500 hover:text-rose-600 cursor-pointer"
                  title={t.ctaSignOut}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentView('auth')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.ctaSignIn}</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {[
                { id: 'home', label: t.navHome },
                { id: 'services', label: t.navServices },
                { id: 'about', label: t.navAbout },
                { id: 'portfolio', label: t.navPortfolio },
                { id: 'partners', label: t.navPartners },
                { id: 'testimonials', label: t.navTestimonials },
                { id: 'quote_calculator', label: t.navQuoteCalc },
                { id: 'premium', label: t.navPremium },
                { id: 'contact', label: t.navContact },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCurrentView(item.id as ViewMode);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-800"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
              {firebaseUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('client_dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white"
                  >
                    {t.navClientSpace}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('admin_dashboard');
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 rounded-lg bg-sky-600 py-2.5 text-xs font-semibold text-white"
                    >
                      {t.navAdminSpace}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('auth');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white"
                >
                  {t.ctaCreateAccount} / {t.ctaSignIn}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1">
        {/* VIEW 1: HOME (ACCUEIL) */}
        {currentView === 'home' && (
          <div className="space-y-20 pb-20">
            {/* Hero Section */}
            <section className="relative bg-slate-950 text-white overflow-hidden border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="text-xs font-medium text-sky-400">
                    <span>{settings.ownerName}</span>
                    <span className="mx-2">·</span>
                    <span>{settings.brandName}</span>
                    <span className="mx-2">·</span>
                    <span>Solutions Numériques & Formation</span>
                  </div>

                  <h1
                    className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.12]"
                    style={{ textWrap: 'balance' }}
                  >
                    {settings.ownerName} — {settings.brandName}
                  </h1>

                  <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-2xl">
                    {settings.tagline}
                  </p>

                  <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                    {settings.positioning}
                  </p>

                  {/* Primary & Secondary CTAs */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (firebaseUser) {
                          setCurrentView('client_dashboard');
                        } else {
                          setCurrentView('auth');
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <span>{t.ctaRequestService}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentView('quote_calculator')}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Calculator className="w-4 h-4 text-sky-400" />
                      <span>{t.ctaRequestQuote}</span>
                    </button>

                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/50 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp ({settings.whatsapp})</span>
                    </a>
                  </div>

                  <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <PWAInstallButton variant="full" />
                    {!firebaseUser && (
                      <button
                        type="button"
                        onClick={() => setCurrentView('auth')}
                        className="text-sky-400 hover:underline font-medium cursor-pointer"
                      >
                        {t.ctaCreateAccount} →
                      </button>
                    )}
                  </div>
                </div>

                {/* Hero Studio Showcase Asset with Resilient Fallback */}
                <div className="lg:col-span-5">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video lg:aspect-4/3">
                    <img
                      src={HERO_STUDIO_IMAGE}
                      alt={`${settings.ownerName} — Studio ${settings.brandName}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent flex flex-col justify-end p-6">
                      <p className="text-xs font-mono text-sky-400">GitHub : Aimable2025</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        Ingénierie logicielle, Mobile, Cloud, Bureautique & Formation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: 10 Core Services Preview */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-sky-700">Catalogue des Prestations</p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Services Numériques & Solutions sur Mesure
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('services')}
                  className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                >
                  Explorer toutes les fiches détaillées ({services.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {services.map((srv, idx) => (
                  <div
                    key={srv.id}
                    className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col justify-between space-y-5 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono">0{idx + 1 < 10 ? idx + 1 : ''}{idx + 1 >= 10 ? idx + 1 : ''} · {srv.category}</span>
                        <span>{srv.estimatedDelay}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        {renderServiceIcon(srv.iconName)}
                        <h3 className="text-base font-bold text-slate-900">{srv.title}</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{srv.shortDescription}</p>
                      <p className="text-xs text-slate-500">{srv.includedFeatures}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-slate-900">{srv.indicativePrice}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPreselectedServiceId(srv.id);
                          if (firebaseUser) {
                            setCurrentView('client_dashboard');
                          } else {
                            setCurrentView('auth');
                          }
                        }}
                        className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        Demander ce service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Interactive Quote Calculator Callout + BUNO Tech Premium Callout */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-slate-900 text-white p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-mono text-sky-400">Calculateur Automatique Multi-Devises (USD / CDF)</p>
                  <h3 className="text-2xl font-bold">Obtenez votre devis chiffré instantanément</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Construisez votre devis ligne par ligne (Saisie, Impression, Système de gestion, Automatisation Excel, Formation, Maintenance), soumettez-le pour calcul automatique, téléchargez le PDF officiel ou négociez une remise directement avec l’administrateur.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('quote_calculator')}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Ouvrir le calculateur de devis</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-sky-700">BUNO Tech Premium · Abonnements 1 jour à 3 ans</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Traitement de texte, 19 Modèles, Formateur IT & Assistant IA
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Accédez à un environnement complet de productivité : éditeur de documents riche en ligne, modèles de CV, lettres administratives, rapports et factures prêts à remplir, cours interactifs avec quiz et assistant IA côté serveur.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentView('premium')}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Découvrir BUNO Tech Premium</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Section: Featured Portfolio & Partners */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-sky-700">Réalisations Vérifiables</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">Aperçu du Portfolio & Partenaires</h2>
                </div>
                <div className="flex gap-4 text-xs font-semibold text-sky-700">
                  <button type="button" onClick={() => setCurrentView('portfolio')} className="hover:underline cursor-pointer">
                    Portfolio complet →
                  </button>
                  <button type="button" onClick={() => setCurrentView('partners')} className="hover:underline cursor-pointer">
                    Partenaires →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {portfolio.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-4/3 bg-slate-900 relative overflow-hidden">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-slate-500">
                          {item.category} · {item.completionDate}
                        </p>
                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-3">{item.description}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        onClick={() => setCurrentView('portfolio')}
                        className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                      >
                        Voir les détails →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Foire Aux Questions (FAQ) */}
            <FAQAccordion
              onOpenQuoteCalculator={() => setCurrentView('quote_calculator')}
              onOpenContact={() => setCurrentView('contact')}
              whatsappNumber={settings.whatsapp}
            />
          </div>
        )}

        {/* VIEW 2: SERVICES */}
        {currentView === 'services' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-sky-700">Prestations Professionnelles BUNO Tech</p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Nos Services & Solutions Numériques</h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  Chaque service fait l’objet d’une analyse rigoureuse, d’un devis transparent et d’un suivi en temps réel dans votre espace client.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('quote_calculator')}
                className="rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 whitespace-nowrap cursor-pointer"
              >
                Simuler un devis maintenant
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((srv, idx) => (
                <div
                  key={srv.id}
                  className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        0{idx + 1 < 10 ? idx + 1 : ''}{idx + 1 >= 10 ? idx + 1 : ''} · {srv.category}
                      </span>
                      <span>
                        Disponibilité :{' '}
                        <strong className={srv.availability === 'available' ? 'text-emerald-700' : 'text-amber-700'}>
                          {srv.availability === 'available' ? 'Disponible' : 'Sur planification'}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {renderServiceIcon(srv.iconName)}
                      <h2 className="text-lg font-bold text-slate-900">{srv.title}</h2>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{srv.shortDescription}</p>
                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-900 mb-1">Ce que comprend ce service :</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{srv.includedFeatures}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs">
                      <p className="text-slate-500">
                        Délai estimatif : <strong className="text-slate-800">{srv.estimatedDelay}</strong>
                      </p>
                      <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{srv.indicativePrice}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPreselectedServiceId(srv.id);
                        if (firebaseUser) {
                          setCurrentView('client_dashboard');
                        } else {
                          setCurrentView('auth');
                        }
                      }}
                      className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      Demander ce service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VIEW 3: ABOUT / PROFIL & CV ("Mon parcours") */}
        {currentView === 'about' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
            {/* Executive Bio & Identity Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start border-b border-slate-200 pb-12">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-800">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Goma, République démocratique du Congo</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
                  {settings.ownerName}
                </h1>
                <p className="text-sm sm:text-base font-semibold text-slate-800">
                  Informaticien polyvalent | Développeur & Concepteur de solutions numériques | Formateur informatique | Support & Systèmes d’information
                </p>
                <div className="text-sm sm:text-base text-slate-700 leading-relaxed space-y-3 whitespace-pre-wrap">
                  {settings.bioNarrative}
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-sky-400">
                    Démarche Professionnelle Fondamentale
                  </p>
                  <p className="text-sm font-bold">
                    {BUNO_TECH_MANIFEST.professionalApproachMethod}
                  </p>
                  <p className="text-xs text-slate-300">
                    « Considérer l’informatique comme un moyen de résoudre des problèmes concrets et non comme une simple accumulation de technologies. Transformer les besoins réels en solutions accessibles, utiles et évolutives. »
                  </p>
                </div>
              </div>

              {/* Verified Contact & Profile Summary Card */}
              <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Coordonnées Vérifiées</h2>
                    <p className="text-xs text-slate-500">Contact direct & Profils publics</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    Disponible
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500">Localisation</p>
                      <p className="font-semibold text-slate-900">{BUNO_TECH_MANIFEST.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500">WhatsApp & Téléphone</p>
                      <a
                        href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold text-slate-900 hover:text-sky-700"
                      >
                        {settings.whatsapp}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-500">Email professionnel</p>
                      <a href={`mailto:${settings.email}`} className="font-mono font-semibold text-slate-900 hover:text-sky-700">
                        {settings.email}
                      </a>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                        Personnel : aimablebunoti@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="font-bold text-slate-900">Profils et Réseaux Officiels :</p>
                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                      <a
                        href={settings.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sky-700 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>LinkedIn : Aimable Maombi Bunoti</span>
                      </a>
                      <a
                        href={settings.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-rose-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>YouTube : Aimable Buno Tech</span>
                      </a>
                      <a
                        href={settings.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-slate-800 hover:underline font-mono"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>GitHub : Aimable2025</span>
                      </a>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cvContent = `CURRICULUM VITAE PROFESSIONNEL\n==================================================\n${settings.ownerName}\nInformaticien polyvalent | Développeur | Formateur | Support & SI\nLocalisation : Goma, République démocratique du Congo\nWhatsApp : ${settings.whatsapp}\nEmail : ${settings.email} / aimablebunoti@gmail.com\nLinkedIn : ${settings.linkedin}\nYouTube : ${settings.youtube}\nGitHub : ${settings.github}\n\nPROFIL :\n${settings.bioNarrative}\n\nEXPÉRIENCES PROFESSIONNELLES :\n${REAL_WORK_EXPERIENCES.map((e) => `\n* ${e.title} — ${e.organization} (${e.location}) [${e.period}]\n  ${e.responsibilities.join('\n  - ')}`).join('\n')}\n\nFORMATIONS & DIPLÔMES :\n${REAL_EDUCATION_ITEMS.map((ed) => `* ${ed.period} : ${ed.title} — ${ed.institution} (${ed.location})`).join('\n')}\n\nLANGUES :\n${CV_LANGUAGES.map((l) => `* ${l.language} : ${l.level}`).join('\n')}`;
                        const blob = new Blob([cvContent], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `CV_Aimable_Maombi_Bunoti.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 px-3 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Télécharger le CV officiel (.txt)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BUNO TECH Presentation: Mission, Vision, 6 Values & 6 Steps */}
            <div className="rounded-2xl bg-slate-900 text-white p-8 lg:p-10 space-y-8">
              <div className="max-w-3xl space-y-3">
                <div className="text-xs font-mono tracking-widest text-sky-400 uppercase">
                  Entreprise de Prestations & Solutions Numériques
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-display">
                  {BUNO_TECH_MANIFEST.name} — {BUNO_TECH_MANIFEST.subtitle}
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  BUNO Tech est une initiative technologique orientée vers la conception, le développement et l'amélioration de solutions informatiques adaptées aux besoins des particuliers, des entreprises, des ONG et des organisations à Goma et au-delà.
                </p>
                <p className="text-xs sm:text-sm text-slate-400 italic">
                  « La technologie prend toute sa valeur lorsqu’elle répond à un besoin réel. »
                </p>
              </div>

              {/* Mission & Vision */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div className="space-y-2 p-5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">Notre Mission</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {BUNO_TECH_MANIFEST.mission}
                  </p>
                </div>
                <div className="space-y-2 p-5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">Notre Vision</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {BUNO_TECH_MANIFEST.vision}
                  </p>
                </div>
              </div>

              {/* 6 Core Values */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-base font-bold text-white">Nos 6 Valeurs Fondamentales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BUNO_TECH_MANIFEST.values.map((v, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                      <p className="font-bold text-sm text-white">{v.title}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{v.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 Structured Steps */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-base font-bold text-white">Notre Démarche de Travail en 6 Étapes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BUNO_TECH_MANIFEST.workApproach.map((step) => (
                    <div key={step.stepNumber} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1">
                      <div className="text-xs font-mono font-bold text-sky-400">Étape {step.stepNumber}</div>
                      <p className="font-bold text-sm text-white">{step.title}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Clients */}
              <div className="pt-4 border-t border-slate-800 space-y-3 text-xs">
                <p className="font-bold text-white">Profils de Clients & Partenaires Accompagnés :</p>
                <div className="flex flex-wrap gap-2">
                  {BUNO_TECH_MANIFEST.targetClients.map((client, idx) => (
                    <span key={idx} className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300 font-medium">
                      {client}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Real Work Experiences */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold text-sky-700">Parcours & Expériences Réelles</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-0.5">Expériences Professionnelles</h2>
                </div>
                <p className="text-xs text-slate-500">10 postes & responsabilités vérifiables</p>
              </div>

              <div className="space-y-5">
                {REAL_WORK_EXPERIENCES.map((exp) => (
                  <div
                    key={exp.id}
                    className={`rounded-xl bg-white border p-6 space-y-3 transition-colors ${
                      exp.isFlagship ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-white">
                          {exp.period}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{exp.organization}</span>
                        <span className="text-xs text-slate-500">({exp.location})</span>
                      </div>
                      {exp.statusText && (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            exp.isFlagship ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {exp.statusText}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{exp.title}</h3>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-700 pt-1">
                      {exp.responsibilities.map((resp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-1" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorized Technical Skills */}
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <p className="text-xs font-semibold text-sky-700">Expertise Technique Approfondie</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-0.5">Compétences Techniques par Domaine</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {DETAILED_SKILLS_CATEGORIES.map((cat, idx) => (
                  <div key={idx} className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <Code2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <h3 className="text-sm font-bold text-slate-900">{cat.category}</h3>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {cat.skills.map((skill, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="text-sky-600 font-bold">•</span>
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Education & Complementary Training */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-5">
                <div className="border-b border-slate-200 pb-3">
                  <p className="text-xs font-semibold text-sky-700">Parcours Académique & Professionnel</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">Formation et Apprentissage</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    « Mon parcours informatique est principalement construit autour de l'autoformation et de la pratique, complétées par différentes formations ciblées. »
                  </p>
                </div>

                <div className="space-y-3">
                  {REAL_EDUCATION_ITEMS.map((item, idx) => (
                    <div key={idx} className="rounded-xl bg-white border border-slate-200 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-sky-700">{item.period}</span>
                        <span className="text-slate-500">{item.institution} ({item.location})</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages & Working Domains */}
              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Languages className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">Langues Pratiquées</h3>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {CV_LANGUAGES.map((langItem, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{langItem.language}</span>
                        <span className="text-slate-600">{langItem.level}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Target className="w-4 h-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">Domaines d'Intervention</h3>
                  </div>
                  <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {CV_COMPETENCIES.interventionDomains.map((domain, idx) => (
                      <p key={idx}>
                        <strong className="text-slate-900">{domain.split(' : ')[0]} :</strong>{' '}
                        {domain.split(' : ')[1]}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive 7-Stage Career Timeline */}
            <div className="space-y-6 pt-4 border-t border-slate-200">
              <div>
                <p className="text-xs font-semibold text-sky-700">
                  Découverte → Apprentissage → Pratique → Expérience → Développement → Transmission → Innovation
                </p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Timeline Professionnelle & Évolution
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {CAREER_TIMELINE.map((item) => (
                  <div
                    key={item.stepNumber}
                    className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-sky-700">Étape {item.stepNumber}</span>
                        <span className="font-semibold text-slate-900">{item.stage}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                      Jalon : {item.keyMilestone}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* VIEW 4: PORTFOLIO */}
        {currentView === 'portfolio' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <p className="text-xs font-semibold text-sky-700">Réalisations & Projets BUNO Tech</p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Portfolio Numérique</h1>
              </div>

              {/* Interactive Filter Controls */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                {portfolioCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPortfolioFilter(cat)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      portfolioFilter === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'Toutes les catégories' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPortfolio.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-16/9 bg-slate-900 relative overflow-hidden">
                      {project.imageUrl && (
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="text-xs text-slate-500">
                        <span>{project.category}</span>
                        <span className="mx-1.5">·</span>
                        <span>{project.completionDate}</span>
                        {project.clientName && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span>{project.clientName}</span>
                          </>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">{project.title}</h2>
                      <p className="text-sm text-slate-600 leading-relaxed">{project.description}</p>
                      <p className="text-xs font-mono text-slate-500">Technologies : {project.technologies}</p>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    {project.demoUrl ? (
                      <a
                        href={project.demoUrl}
                        target={project.demoUrl.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Consulter la démonstration</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Réalisation interne</span>
                    )}

                    {project.allowDownload && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPortfolioAttachment(project)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-600" />
                        <span>Télécharger la fiche</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VIEW 5: PARTNERS */}
        {currentView === 'partners' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <p className="text-xs font-semibold text-sky-700">Écosystème & Collaborations</p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Nos Partenaires & Références</h1>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                {partnerCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPartnerFilter(cat)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      partnerFilter === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'Tous' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredPartners.map((part) => (
                <div key={part.id} className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-14 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                      {part.logoText}
                    </div>
                    <span className="text-xs text-slate-500">{part.category}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{part.name}</h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{part.description}</p>
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <strong className="text-slate-800">Projet réalisé :</strong> {part.projectCompleted}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VIEW 6: TESTIMONIALS */}
        {currentView === 'testimonials' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <p className="text-xs font-semibold text-sky-700">Retours Clients Authentiques</p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Témoignages Vérifiés</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Seuls les témoignages réellement soumis par des clients et validés par l’administration sont affichés ici.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (firebaseUser) {
                    setCurrentView('client_dashboard');
                  } else {
                    setCurrentView('auth');
                  }
                }}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Laisser un témoignage
              </button>
            </div>

            {publishedTestimonials.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-800">
                  Aucun témoignage public validé pour l’instant
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Conformément à notre engagement d’état réel du système, aucun faux avis n’est généré automatiquement. Connectez-vous à votre espace client pour soumettre votre témoignage.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedTestimonials.map((item) => (
                  <div key={item.id} className="rounded-xl bg-white border border-slate-200 p-6 flex flex-col justify-between space-y-4">
                    <p className="text-sm text-slate-700 leading-relaxed">« {item.content} »</p>
                    <div className="pt-4 border-t border-slate-100 text-xs">
                      <p className="font-bold text-slate-900">{item.authorName}</p>
                      <p className="text-slate-500">
                        {item.authorRole} {item.organization ? `· ${item.organization}` : ''}
                      </p>
                      <p className="text-sky-700 mt-1">Service : {item.serviceConcerned}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* VIEW 7: QUOTE CALCULATOR (CALCULATEUR DE DEVIS — SECTION 16) */}
        {currentView === 'quote_calculator' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <p className="text-xs font-semibold text-sky-700">Calcul Automatique & Tarification BUNO Tech</p>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">Calculateur de Devis Officiel</h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  Sélectionnez vos prestations et quantités. Le système détermine automatiquement le prix unitaire selon la base tarifaire interne, calcule le total et génère votre document de devis officiel.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Devise :</span>
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCalcCurrency('USD')}
                    className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                      calcCurrency === 'USD' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcCurrency('CDF')}
                    className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                      calcCurrency === 'CDF' ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    CDF (FC)
                  </button>
                </div>
              </div>
            </div>

            {calcFeedback && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-950">
                {calcFeedback}
              </div>
            )}

            <form onSubmit={handleCalculateAndSubmitQuote} className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-900 text-white text-xs font-semibold">
                      <th className="py-3.5 px-4 w-12">N°</th>
                      <th className="py-3.5 px-4">Description / Prestation</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4 w-28">Quantité</th>
                      <th className="py-3.5 px-4">Format</th>
                      <th className="py-3.5 px-4 text-right">Prix unitaire</th>
                      <th className="py-3.5 px-4 text-right">Prix total</th>
                      <th className="py-3.5 px-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {calcLines.map((line, index) => {
                      const computed = computedQuoteLines[index];
                      return (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">{index + 1}</td>
                          <td className="py-3 px-4">
                            <select
                              value={line.pricingId}
                              onChange={(e) => {
                                const rule = pricingRules.find((r) => r.id === e.target.value);
                                if (rule) {
                                  const next = [...calcLines];
                                  next[index] = {
                                    ...next[index],
                                    pricingId: rule.id,
                                    description: rule.serviceName,
                                    itemType: rule.itemType,
                                    format: rule.format,
                                  };
                                  setCalcLines(next);
                                }
                              }}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            >
                              {pricingRules.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.serviceName} — {r.itemType}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{computed?.itemType}</td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="1"
                              max="10000"
                              required
                              value={line.quantity}
                              onChange={(e) => {
                                const next = [...calcLines];
                                next[index].quantity = Math.max(1, Number(e.target.value) || 1);
                                setCalcLines(next);
                              }}
                              className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono text-right tabular-nums"
                            />
                          </td>
                          <td className="py-3 px-4 text-slate-700">{computed?.format}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                            {calcCurrency === 'USD'
                              ? `$${computed?.unitPrice.toFixed(2)}`
                              : `${computed?.unitPrice.toLocaleString('fr-FR')} CDF`}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {calcCurrency === 'USD'
                              ? `$${computed?.totalPrice.toFixed(2)}`
                              : `${computed?.totalPrice.toLocaleString('fr-FR')} CDF`}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {calcLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCalcLines(calcLines.filter((_, i) => i !== index))}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Supprimer la ligne"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Bar of Calculator */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const firstRule = pricingRules[0];
                    setCalcLines([
                      ...calcLines,
                      {
                        pricingId: firstRule?.id || 'prc_saisie_page_a4',
                        description: firstRule?.serviceName || 'Saisie',
                        itemType: firstRule?.itemType || 'Page',
                        quantity: 1,
                        format: firstRule?.format || 'A4',
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-sky-600" />
                  <span>Ajouter une ligne au devis</span>
                </button>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total estimé (Somme des lignes) :</p>
                    <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                      {calcCurrency === 'USD'
                        ? `$${computedSubtotal.toFixed(2)}`
                        : `${computedSubtotal.toLocaleString('fr-FR')} CDF`}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={calculatingQuote}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>{calculatingQuote ? 'Génération...' : 'Soumettre pour calcul & générer le devis'}</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* VIEW 8: CONTACT */}
        {currentView === 'contact' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
            <div className="border-b border-slate-200 pb-6">
              <p className="text-xs font-semibold text-sky-700">Communication Directe</p>
              <h1 className="text-3xl font-bold text-slate-900 mt-1">Contactez {settings.ownerName} — {settings.brandName}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Direct Coordinates & Social Channels */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
                  <h2 className="text-base font-bold text-slate-900">Coordonnées directes</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">WhatsApp & Téléphone</p>
                        <a
                          href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-bold text-slate-900 hover:text-sky-700"
                        >
                          {settings.whatsapp}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">Email professionnel</p>
                        <a href={`mailto:${settings.email}`} className="font-mono font-bold text-slate-900 hover:text-sky-700">
                          {settings.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <p className="font-bold text-slate-900">Réseaux sociaux officiels :</p>
                    <ul className="space-y-1.5 text-slate-600">
                      <li>
                        <strong>YouTube :</strong>{' '}
                        <a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                          AimableBunoTech
                        </a>
                      </li>
                      <li>
                        <strong>LinkedIn :</strong>{' '}
                        <a href={settings.linkedin} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                          Aimable Maombi
                        </a>
                      </li>
                      <li>
                        <strong>GitHub :</strong>{' '}
                        <a href={settings.github} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                          Aimable2025
                        </a>
                      </li>
                      <li>
                        <strong>Facebook (Page officielle) :</strong> {settings.facebook}
                      </li>
                      {settings.twitter && (
                        <li>
                          <strong>Twitter / X :</strong>{' '}
                          <a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                            {settings.twitter}
                          </a>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-7">
                <form
                  onSubmit={handleContactSubmit}
                  className="rounded-xl bg-white border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900">Envoyer une demande ou un message</h2>
                  {contactConfirmation && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900">
                      {contactConfirmation}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Type de demande *</label>
                      <select
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="Demande de service numérique">Demande de service numérique</option>
                        <option value="Demande de devis sur mesure">Demande de devis sur mesure</option>
                        <option value="Formation informatique">Formation informatique</option>
                        <option value="Partenariat ONG / Entreprise">Partenariat ONG / Entreprise</option>
                        <option value="Support technique">Support technique</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone / WhatsApp</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+243 ..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Objet de la demande *</label>
                    <input
                      type="text"
                      required
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="Ex: Conception d'une application de gestion / Formation Excel..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Message détaillé *</label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Expliquez votre besoin..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pièce jointe / Lien de document (facultatif)
                    </label>
                    <input
                      type="text"
                      value={contactAttachment}
                      onChange={(e) => setContactAttachment(e.target.value)}
                      placeholder="Nom ou lien du fichier annexe"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{contactSubmitting ? 'Enregistrement...' : 'Envoyer la demande'}</span>
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* VIEW 9: PREMIUM WORKSPACE */}
        {currentView === 'premium' && (
          <PremiumWorkspace
            currentUser={userProfile}
            isAdmin={isAdmin}
            plans={subscriptionPlans}
            userSubscriptions={subscriptions}
            templates={templates}
            savedDocuments={savedDocuments}
            trainingProgress={trainingProgress}
            onRequireLogin={() => setCurrentView('auth')}
          />
        )}

        {/* VIEW 10: CLIENT DASHBOARD */}
        {currentView === 'client_dashboard' && userProfile && (
          <ClientDashboard
            userProfile={userProfile}
            settings={settings}
            services={services}
            serviceRequests={serviceRequests}
            quotes={quotes}
            subscriptions={subscriptions}
            messages={messages}
            notifications={notifications}
            savedDocuments={savedDocuments}
            preselectedServiceId={preselectedServiceId}
            onNavigateToQuoteCalculator={() => setCurrentView('quote_calculator')}
            onNavigateToPremium={() => setCurrentView('premium')}
          />
        )}

        {/* VIEW 11: ADMIN DASHBOARD */}
        {currentView === 'admin_dashboard' && userProfile && isAdmin && (
          <AdminDashboard
            adminUser={userProfile}
            settings={settings}
            clients={allClients}
            services={services}
            pricingRules={pricingRules}
            portfolio={portfolio}
            partners={partners}
            testimonials={testimonials}
            serviceRequests={serviceRequests}
            quotes={quotes}
            subscriptions={subscriptions}
            subscriptionPlans={subscriptionPlans}
            payments={payments}
            messages={messages}
            auditLogs={auditLogs}
          />
        )}

        {/* VIEW 12: AUTHENTICATION / CLIENT ACCOUNT CREATION */}
        {currentView === 'auth' && (
          <section className="max-w-md mx-auto px-4 py-16">
            <div className="rounded-2xl bg-white border border-slate-200 p-8 space-y-6">
              <div className="space-y-1.5 text-center">
                <p className="text-xs font-semibold text-sky-700">{settings.brandName} · Espace Client Sécurisé</p>
                <h1 className="text-2xl font-bold text-slate-900">Créer mon compte client / Connexion</h1>
                <p className="text-xs text-slate-600">
                  Accédez à votre tableau de bord pour demander un service, calculer et négocier vos devis, échanger avec l’administrateur et utiliser BUNO Tech Premium.
                </p>
              </div>

              {authError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                  {authError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom complet (pour vos devis et factures)
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: Jean-Luc Mukendi"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Téléphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Ex: +243 ..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Organisation / Entreprise / ONG (facultatif)
                  </label>
                  <input
                    type="text"
                    value={regOrg}
                    onChange={(e) => setRegOrg(e.target.value)}
                    placeholder="Nom de votre structure"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex items-start gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regAcceptedTerms}
                    onChange={(e) => setRegAcceptedTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    J’accepte les conditions générales de prestation et la politique de confidentialité de BUNO Tech.
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-slate-900 py-3 px-4 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>Continuer avec Google (Authentification vérifiée)</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Generated Quote Modal */}
      {generatedQuoteModal && (
        <QuoteModalAndPrinter
          quote={generatedQuoteModal}
          settings={settings}
          currentUserUid={userProfile?.uid}
          currentUserEmail={userProfile?.email}
          isAdminView={false}
          onClose={() => setGeneratedQuoteModal(null)}
        />
      )}

      {/* QUIET FOOTER (No ornamental telemetry tickers) */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 py-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-2">
            <p className="text-base font-bold text-white font-display">{settings.brandName}</p>
            <p className="text-slate-300 font-semibold">{settings.ownerName}</p>
            <p className="leading-relaxed">{settings.tagline}</p>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white">Navigation</p>
            <ul className="space-y-1.5">
              <li>
                <button type="button" onClick={() => setCurrentView('services')} className="hover:text-white cursor-pointer">
                  Services Numériques
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentView('about')} className="hover:text-white cursor-pointer">
                  Mon Parcours & CV
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentView('portfolio')} className="hover:text-white cursor-pointer">
                  Portfolio
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentView('partners')} className="hover:text-white cursor-pointer">
                  Partenaires
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentView('testimonials')} className="hover:text-white cursor-pointer">
                  Témoignages
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('home');
                    setTimeout(() => {
                      document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                  }}
                  className="hover:text-white cursor-pointer text-sky-400 font-medium"
                >
                  Foire Aux Questions (FAQ)
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white">Outils & Espace Client</p>
            <ul className="space-y-1.5">
              <li>
                <button type="button" onClick={() => setCurrentView('quote_calculator')} className="hover:text-white cursor-pointer">
                  Calculateur de Devis (USD/CDF)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentView('premium')} className="hover:text-white cursor-pointer">
                  BUNO Tech Premium (Éditeur, Modèles, Formation, IA)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentView(firebaseUser ? 'client_dashboard' : 'auth')}
                  className="hover:text-white cursor-pointer"
                >
                  Tableau de bord Client
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="font-bold text-white">Contact & Réseaux</p>
            <p>WhatsApp : {settings.whatsapp}</p>
            <p>Email : {settings.email}</p>
            <p>GitHub : Aimable2025</p>
            <div className="pt-2">
              <PWAInstallButton variant="compact" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.ownerName} — {settings.brandName}. Tous droits réservés.</p>
          <p>Application Web Progressive (PWA) sécurisée</p>
        </div>
      </footer>
    </div>
  );
}
