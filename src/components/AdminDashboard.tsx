import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Activity,
  Briefcase,
  Check,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Handshake,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  BUNO_TECH_CUSTOM_FIREBASE_CONFIG,
  db,
  generateId,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  createSystemNotification,
  seedInitialCatalogToFirestore,
  writeAuditLog,
} from '../data/initialCatalog';
import {
  AuditLog,
  ClientSubscription,
  DirectMessage,
  PartnerItem,
  PaymentRecord,
  PortfolioProject,
  PricingRule,
  QuoteDocument,
  ServiceItem,
  ServiceRequest,
  ServiceRequestStatus,
  SiteSettings,
  SubscriptionPlan,
  TestimonialItem,
  UserProfile,
} from '../types';
import { QuoteModalAndPrinter } from './QuoteModalAndPrinter';

interface AdminDashboardProps {
  adminUser: UserProfile;
  settings: SiteSettings;
  clients: UserProfile[];
  services: ServiceItem[];
  pricingRules: PricingRule[];
  portfolio: PortfolioProject[];
  partners: PartnerItem[];
  testimonials: TestimonialItem[];
  serviceRequests: ServiceRequest[];
  quotes: QuoteDocument[];
  subscriptions: ClientSubscription[];
  subscriptionPlans: SubscriptionPlan[];
  payments: PaymentRecord[];
  messages: DirectMessage[];
  auditLogs: AuditLog[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  settings,
  clients,
  services,
  pricingRules,
  portfolio,
  partners,
  testimonials,
  serviceRequests,
  quotes,
  subscriptions,
  subscriptionPlans,
  payments,
  messages,
  auditLogs,
}) => {
  const [activeSection, setActiveSection] = useState<
    | 'overview'
    | 'requests'
    | 'quotes'
    | 'pricing'
    | 'services'
    | 'portfolio'
    | 'partners'
    | 'testimonials'
    | 'clients'
    | 'subscriptions'
    | 'messages'
    | 'settings'
    | 'audit'
  >('overview');

  const [selectedQuoteModal, setSelectedQuoteModal] = useState<QuoteDocument | null>(null);
  const [adminBanner, setAdminBanner] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Real system statistics calculated strictly from Firestore data
  const confirmedRevenueUSD = payments
    .filter((p) => p.status === 'confirmed' && p.currency === 'USD')
    .reduce((sum, p) => sum + p.amount, 0);
  const confirmedRevenueCDF = payments
    .filter((p) => p.status === 'confirmed' && p.currency === 'CDF')
    .reduce((sum, p) => sum + p.amount, 0);
  const activeSubscriptionsCount = subscriptions.filter((s) => s.status === 'active').length;
  const pendingDiscountQuotesCount = quotes.filter((q) => q.status === 'discount_requested').length;

  // Pricing Form State
  const [prcName, setPrcName] = useState('');
  const [prcType, setPrcType] = useState('Standard');
  const [prcUnit, setPrcUnit] = useState('Unité');
  const [prcFormat, setPrcFormat] = useState('A4');
  const [prcUSD, setPrcUSD] = useState('10');
  const [prcCDF, setPrcCDF] = useState('28000');
  const [prcConditions, setPrcConditions] = useState('Tarif BUNO Tech applicable.');

  // Service Form State
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategory, setSrvCategory] = useState('Solutions Numériques');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvFeatures, setSrvFeatures] = useState('');
  const [srvPrice, setSrvPrice] = useState('Sur devis');
  const [srvDelay, setSrvDelay] = useState('1 à 3 semaines');

  // Portfolio Form State
  const [portTitle, setPortTitle] = useState('');
  const [portCategory, setPortCategory] = useState('Applications mobiles');
  const [portDesc, setPortDesc] = useState('');
  const [portClient, setPortClient] = useState('');
  const [portTech, setPortTech] = useState('React · TypeScript · Firebase');
  const [portDemoUrl, setPortDemoUrl] = useState('');
  const [portAllowDownload, setPortAllowDownload] = useState(true);

  // Partner Form State
  const [partName, setPartName] = useState('');
  const [partLogo, setPartLogo] = useState('PART');
  const [partCat, setPartCat] = useState<PartnerItem['category']>('Entreprises');
  const [partDesc, setPartDesc] = useState('');
  const [partProject, setPartProject] = useState('');

  // Admin Reply Message State
  const [selectedThreadClientId, setSelectedThreadClientId] = useState<string>('');
  const [replyText, setReplyText] = useState('');

  // Settings / CV State
  const [cfgOwner, setCfgOwner] = useState(settings.ownerName);
  const [cfgBrand, setCfgBrand] = useState(settings.brandName);
  const [cfgTagline, setCfgTagline] = useState(settings.tagline);
  const [cfgPos, setCfgPos] = useState(settings.positioning);
  const [cfgBio, setCfgBio] = useState(settings.bioNarrative);
  const [cfgEmail, setCfgEmail] = useState(settings.email);
  const [cfgWhatsapp, setCfgWhatsapp] = useState(settings.whatsapp);
  const [cfgGithub, setCfgGithub] = useState(settings.github);
  const [cfgYoutube, setCfgYoutube] = useState(settings.youtube);
  const [cfgFacebook, setCfgFacebook] = useState(settings.facebook);
  const [cfgLinkedin, setCfgLinkedin] = useState(settings.linkedin);
  const [cfgTwitter, setCfgTwitter] = useState(settings.twitter);
  const [cfgCvSummary, setCfgCvSummary] = useState(settings.cvSummary);
  const [cfgCvObjectives, setCfgCvObjectives] = useState(settings.cvObjectives);

  const handleSeedCatalog = async () => {
    setSeeding(true);
    setAdminBanner(null);
    try {
      await seedInitialCatalogToFirestore(adminUser.uid, adminUser.email);
      setAdminBanner('Catalogue initial BUNO Tech synchronisé avec succès dans Firestore.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedCatalog');
    } finally {
      setSeeding(false);
    }
  };

  // Update Service Request Status
  const handleUpdateRequestStatus = async (req: ServiceRequest, newStatus: ServiceRequestStatus, adminNotes: string) => {
    try {
      await updateDoc(doc(db, 'serviceRequests', req.id), {
        status: newStatus,
        adminNotes: adminNotes.slice(0, 1950),
        updatedAt: serverTimestamp(),
      });
      await createSystemNotification(
        req.clientId,
        'request_status_changed',
        `Évolution de votre demande ${req.referenceCode}`,
        `Le statut de votre demande « ${req.serviceTitle} » est passé à : ${newStatus}.`,
        req.id
      );
      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        'SERVICE_REQUEST_STATUS_UPDATED',
        'serviceRequest',
        req.id,
        `Demande ${req.referenceCode} passée de ${req.status} à ${newStatus}.`
      );
      setAdminBanner(`Demande ${req.referenceCode} mise à jour (${newStatus}). Client notifié.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `serviceRequests/${req.id}`);
    }
  };

  // Add Pricing Rule
  const handleAddPricingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prcName.trim()) return;
    const prcId = generateId('prc');
    const usdVal = Math.max(0, Number(prcUSD) || 0);
    const cdfVal = Math.max(0, Number(prcCDF) || 0);
    try {
      await setDoc(doc(db, 'pricing', prcId), {
        id: prcId,
        serviceName: prcName.trim().slice(0, 135),
        itemType: prcType.trim().slice(0, 95) || 'Standard',
        unit: prcUnit.trim().slice(0, 55) || 'Unité',
        format: prcFormat.trim().slice(0, 55) || 'Standard',
        unitPriceUSD: usdVal,
        unitPriceCDF: cdfVal,
        validityPeriod: '30 jours',
        conditions: prcConditions.trim().slice(0, 490),
        available: true,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        'PRICING_RULE_CREATED',
        'pricing',
        prcId,
        `Nouveau tarif ajouté : ${prcName.trim()} ($${usdVal} / ${cdfVal} CDF)`
      );
      setPrcName('');
      setAdminBanner('Nouveau tarif interne enregistré dans Firestore.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `pricing/${prcId}`);
    }
  };

  const handleDeletePricingRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pricing', id));
      await writeAuditLog(adminUser.uid, adminUser.email, 'PRICING_RULE_DELETED', 'pricing', id, `Tarif ${id} supprimé.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `pricing/${id}`);
    }
  };

  // Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvTitle.trim() || !srvDesc.trim()) return;
    const srvId = generateId('srv');
    try {
      await setDoc(doc(db, 'services', srvId), {
        id: srvId,
        title: srvTitle.trim().slice(0, 135),
        iconName: 'Code2',
        category: srvCategory.trim().slice(0, 75),
        shortDescription: srvDesc.trim().slice(0, 390),
        includedFeatures: srvFeatures.trim().slice(0, 1900) || 'Analyse · Réalisation · Support BUNO Tech',
        indicativePrice: srvPrice.trim().slice(0, 75) || 'Sur devis',
        estimatedDelay: srvDelay.trim().slice(0, 75) || 'Sur mesure',
        availability: 'available',
        orderIndex: services.length + 1,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(adminUser.uid, adminUser.email, 'SERVICE_CREATED', 'service', srvId, `Service "${srvTitle.trim()}" créé.`);
      setSrvTitle('');
      setSrvDesc('');
      setSrvFeatures('');
      setAdminBanner('Nouveau service publié.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `services/${srvId}`);
    }
  };

  const handleToggleServiceAvailability = async (srv: ServiceItem) => {
    const nextAvail = srv.availability === 'available' ? 'suspended' : 'available';
    try {
      await updateDoc(doc(db, 'services', srv.id), {
        availability: nextAvail,
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        'SERVICE_AVAILABILITY_CHANGED',
        'service',
        srv.id,
        `Disponibilité du service "${srv.title}" passée à ${nextAvail}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `services/${srv.id}`);
    }
  };

  // Add Portfolio Item
  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portTitle.trim() || !portDesc.trim()) return;
    const portId = generateId('port');
    try {
      await setDoc(doc(db, 'portfolio', portId), {
        id: portId,
        title: portTitle.trim().slice(0, 145),
        description: portDesc.trim().slice(0, 1950),
        category: portCategory.trim().slice(0, 75),
        completionDate: String(new Date().getFullYear()),
        clientName: portClient.trim().slice(0, 115),
        imageUrl: '/src/assets/images/portfolio_enterprise_erp_1790870874764.jpg',
        demoUrl: portDemoUrl.trim().slice(0, 490),
        attachmentName: 'Documentation-Projet-BUNO.pdf',
        allowDownload: portAllowDownload,
        technologies: portTech.trim().slice(0, 390),
        status: 'published',
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(adminUser.uid, adminUser.email, 'PORTFOLIO_CREATED', 'portfolio', portId, `Réalisation "${portTitle.trim()}" ajoutée.`);
      setPortTitle('');
      setPortDesc('');
      setAdminBanner('Réalisation ajoutée au portfolio.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `portfolio/${portId}`);
    }
  };

  // Add Partner
  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName.trim() || !partDesc.trim()) return;
    const partId = generateId('part');
    try {
      await setDoc(doc(db, 'partners', partId), {
        id: partId,
        name: partName.trim().slice(0, 135),
        logoText: partLogo.trim().slice(0, 18) || 'PART',
        description: partDesc.trim().slice(0, 790),
        category: partCat,
        websiteUrl: '',
        contactInfo: '',
        projectCompleted: partProject.trim().slice(0, 290) || 'Partenariat numérique BUNO Tech',
        status: 'active',
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(adminUser.uid, adminUser.email, 'PARTNER_CREATED', 'partner', partId, `Partenaire "${partName.trim()}" ajouté.`);
      setPartName('');
      setPartDesc('');
      setPartProject('');
      setAdminBanner('Partenaire enregistré.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `partners/${partId}`);
    }
  };

  // Validate / Reject Testimonial
  const handleModerateTestimonial = async (t: TestimonialItem, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'testimonials', t.id), {
        status: approve ? 'published' : 'rejected',
        isPublic: approve,
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        approve ? 'TESTIMONIAL_PUBLISHED' : 'TESTIMONIAL_REJECTED',
        'testimonial',
        t.id,
        `Témoignage de ${t.authorName} ${approve ? 'validé et publié' : 'rejeté'}.`
      );
      setAdminBanner(`Témoignage de ${t.authorName} ${approve ? 'publié' : 'rejeté'}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `testimonials/${t.id}`);
    }
  };

  // Activate or Suspend Client Subscription & Confirm Payment
  const handleVerifyAndActivateSubscription = async (sub: ClientSubscription) => {
    const plan = subscriptionPlans.find((p) => p.id === sub.planId);
    const days = plan ? plan.durationDays : 30;
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: 'active',
        startDateIso: start.toISOString(),
        endDateIso: end.toISOString(),
        updatedAt: serverTimestamp(),
      });

      const relatedPayment = payments.find((p) => p.targetId === sub.id);
      if (relatedPayment) {
        await updateDoc(doc(db, 'payments', relatedPayment.id), {
          status: 'confirmed',
          verifiedBy: adminUser.email,
          updatedAt: serverTimestamp(),
        });
      }

      await createSystemNotification(
        sub.clientId,
        'subscription_activated',
        `Votre abonnement ${sub.planName} est actif !`,
        `Votre paiement (Réf: ${sub.paymentReference}) a été vérifié. Votre accès BUNO Tech Premium est actif jusqu'au ${end.toLocaleDateString('fr-FR')}.`,
        sub.id
      );

      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        'SUBSCRIPTION_ACTIVATED',
        'subscription',
        sub.id,
        `Abonnement ${sub.planName} activé pour ${sub.clientName} jusqu'au ${end.toISOString()}.`
      );
      setAdminBanner(`Abonnement de ${sub.clientName} activé avec succès.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptions/${sub.id}`);
    }
  };

  // Toggle Client Account Status
  const handleToggleClientStatus = async (client: UserProfile) => {
    const nextStatus = client.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', client.uid), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        'CLIENT_STATUS_CHANGED',
        'user',
        client.uid,
        `Statut du compte client ${client.email} changé à ${nextStatus}.`
      );
      setAdminBanner(`Statut du client ${client.fullName} mis à jour (${nextStatus}).`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${client.uid}`);
    }
  };

  // Send Admin Reply in Direct Messaging
  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreadClientId || !replyText.trim()) return;
    const targetClient = clients.find((c) => c.uid === selectedThreadClientId);
    const clientName = targetClient ? targetClient.fullName : 'Client BUNO Tech';
    const msgId = generateId('msg');

    try {
      await setDoc(doc(db, 'messages', msgId), {
        id: msgId,
        threadClientId: selectedThreadClientId,
        threadClientName: clientName,
        senderId: adminUser.uid,
        senderName: `${settings.ownerName} (Admin)`,
        senderRole: 'admin',
        content: replyText.trim().slice(0, 2900),
        attachmentName: '',
        isRead: false,
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        selectedThreadClientId,
        'admin_reply',
        `Nouvelle réponse de ${settings.ownerName}`,
        replyText.trim().slice(0, 140),
        msgId
      );

      setReplyText('');
      setAdminBanner(`Réponse envoyée à ${clientName}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `messages/${msgId}`);
    }
  };

  // Save General Settings & CV Content
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        id: 'main',
        ownerName: cfgOwner.trim().slice(0, 115),
        brandName: cfgBrand.trim().slice(0, 75),
        tagline: cfgTagline.trim().slice(0, 290),
        positioning: cfgPos.trim().slice(0, 490),
        bioNarrative: cfgBio.trim().slice(0, 4900),
        email: cfgEmail.trim().slice(0, 145),
        whatsapp: cfgWhatsapp.trim().slice(0, 45),
        github: cfgGithub.trim().slice(0, 195),
        youtube: cfgYoutube.trim().slice(0, 290),
        facebook: cfgFacebook.trim().slice(0, 195),
        linkedin: cfgLinkedin.trim().slice(0, 290),
        twitter: cfgTwitter.trim().slice(0, 290),
        cvSummary: cfgCvSummary.trim().slice(0, 2900),
        cvObjectives: cfgCvObjectives.trim().slice(0, 1900),
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(
        adminUser.uid,
        adminUser.email,
        'SITE_SETTINGS_UPDATED',
        'settings',
        'main',
        'Mise à jour de la configuration générale, des coordonnées et du CV.'
      );
      setAdminBanner('Configuration générale et contenu du CV sauvegardés dans Firestore.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-sky-700">Console d’Administration Sécurisée — BUNO Tech</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Administration de la Plateforme
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connecté en tant que : <strong>{adminUser.fullName}</strong> ({adminUser.email})
          </p>
        </div>

        <button
          type="button"
          disabled={seeding}
          onClick={handleSeedCatalog}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Synchronisation...' : 'Synchroniser le catalogue initial Firestore'}</span>
        </button>
      </div>

      {adminBanner && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-950 flex items-center justify-between">
          <span>{adminBanner}</span>
          <button type="button" onClick={() => setAdminBanner(null)} className="text-emerald-800 hover:underline">
            Fermer
          </button>
        </div>
      )}

      {/* Real-time Admin Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Demandes réelles</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{serviceRequests.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Devis & Négociations</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {quotes.length}{' '}
            {pendingDiscountQuotesCount > 0 && (
              <span className="text-xs text-amber-600 font-normal">({pendingDiscountQuotesCount} remise)</span>
            )}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Clients inscrits</p>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{clients.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Abonnements actifs</p>
          <p className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">{activeSubscriptionsCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Revenus confirmés (USD)</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            ${confirmedRevenueUSD.toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Revenus confirmés (CDF)</p>
          <p className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {confirmedRevenueCDF.toLocaleString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Admin Module Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        {[
          { id: 'overview', label: 'Vue générale', icon: Activity },
          { id: 'requests', label: `Demandes (${serviceRequests.length})`, icon: Briefcase },
          { id: 'quotes', label: `Devis (${quotes.length})`, icon: FileText },
          { id: 'pricing', label: `Tarification (${pricingRules.length})`, icon: DollarSign },
          { id: 'services', label: `Services (${services.length})`, icon: FileSpreadsheet },
          { id: 'portfolio', label: `Portfolio (${portfolio.length})`, icon: FolderKanban },
          { id: 'partners', label: `Partenaires (${partners.length})`, icon: Handshake },
          { id: 'testimonials', label: `Témoignages (${testimonials.length})`, icon: Star },
          { id: 'subscriptions', label: `Abonnements & Paiements`, icon: CreditCard },
          { id: 'clients', label: `Clients (${clients.length})`, icon: Users },
          { id: 'messages', label: `Messagerie (${messages.length})`, icon: MessageSquare },
          { id: 'settings', label: 'Contenu & CV', icon: Settings },
          { id: 'audit', label: `Audit (${auditLogs.length})`, icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeSection === tab.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Devis en attente de décision ou négociation</h3>
            {quotes.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun devis enregistré dans la base de données.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {quotes.slice(0, 6).map((q) => (
                  <div key={q.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-900">
                        {q.quoteNumber} · {q.clientName}
                      </p>
                      <p className="text-xs text-slate-600">
                        Statut : <strong>{q.status}</strong> · Total :{' '}
                        <span className="font-mono">
                          {q.currency === 'USD' ? `$${q.finalTotal}` : `${q.finalTotal.toLocaleString('fr-FR')} CDF`}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedQuoteModal(q)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Examiner
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Dernières actions du journal d’audit</h3>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">Aucune entrée d’audit enregistrée.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="py-2.5 text-xs space-y-0.5">
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span>{log.action}</span>
                      <span>{log.actorEmail}</span>
                    </div>
                    <p className="text-slate-800">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: SERVICE REQUESTS */}
      {activeSection === 'requests' && (
        <div className="space-y-4">
          {serviceRequests.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
              Aucune demande de service enregistrée pour le moment.
            </div>
          ) : (
            serviceRequests.map((req) => (
              <div key={req.id} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900">{req.referenceCode}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-800">{req.clientName}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{req.clientEmail}</span>
                  </div>
                  <span className="text-xs font-semibold text-sky-700">Priorité : {req.priority}</span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{req.serviceTitle}</h4>
                  <p className="text-xs sm:text-sm text-slate-700 mt-1 whitespace-pre-wrap">{req.description}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Délai souhaité : {req.desiredDeadline} {req.indicativeBudget ? `· Budget : ${req.indicativeBudget}` : ''}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Changer le statut :</label>
                  <select
                    value={req.status}
                    onChange={(e) =>
                      handleUpdateRequestStatus(req, e.target.value as ServiceRequestStatus, req.adminNotes)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                  >
                    <option value="submitted">Nouvelle demande (submitted)</option>
                    <option value="reviewing">En analyse (reviewing)</option>
                    <option value="info_needed">Infos complémentaires demandées (info_needed)</option>
                    <option value="quoted">Devis préparé (quoted)</option>
                    <option value="waiting_client">En attente du client (waiting_client)</option>
                    <option value="accepted">Acceptée (accepted)</option>
                    <option value="in_progress">En cours (in_progress)</option>
                    <option value="completed">Terminée (completed)</option>
                    <option value="cancelled">Annulée (cancelled)</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION: QUOTES & NEGOTIATIONS */}
      {activeSection === 'quotes' && (
        <div className="overflow-x-auto rounded-xl bg-white border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">N° Devis</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Sous-total initial</th>
                <th className="py-3 px-4 text-right">Remise demandée</th>
                <th className="py-3 px-4 text-right">Remise accordée</th>
                <th className="py-3 px-4 text-right">Total final</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.quoteNumber}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{q.clientName}</p>
                    <p className="text-xs text-slate-500">{q.clientEmail}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {q.currency === 'USD' ? `$${q.initialSubtotal}` : `${q.initialSubtotal.toLocaleString('fr-FR')} CDF`}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-amber-700 tabular-nums">
                    {q.discountRequestedAmount > 0 ? q.discountRequestedAmount : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                    {q.discountGrantedAmount > 0 ? q.discountGrantedAmount : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {q.currency === 'USD' ? `$${q.finalTotal}` : `${q.finalTotal.toLocaleString('fr-FR')} CDF`}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">{q.status}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedQuoteModal(q)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Ouvrir / Décider
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION: INTERNAL PRICING RULES */}
      {activeSection === 'pricing' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddPricingRule}
            className="rounded-xl bg-white border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Service / Prestation *</label>
              <input
                type="text"
                required
                value={prcName}
                onChange={(e) => setPrcName(e.target.value)}
                placeholder="Ex: Saisie, Impression, Audit..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <input
                type="text"
                value={prcType}
                onChange={(e) => setPrcType(e.target.value)}
                placeholder="Ex: Page, En couleur..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Format</label>
              <input
                type="text"
                value={prcFormat}
                onChange={(e) => setPrcFormat(e.target.value)}
                placeholder="Ex: A4, Standard..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Prix USD ($)</label>
              <input
                type="number"
                step="0.01"
                value={prcUSD}
                onChange={(e) => setPrcUSD(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Prix CDF (FC)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={prcCDF}
                  onChange={(e) => setPrcCDF(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl bg-white border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Unité</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4 text-right">Prix USD</th>
                  <th className="py-3 px-4 text-right">Prix CDF</th>
                  <th className="py-3 px-4 text-right">Supprimer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {pricingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{rule.serviceName}</td>
                    <td className="py-3 px-4 text-slate-600">{rule.itemType}</td>
                    <td className="py-3 px-4 text-slate-600">{rule.unit}</td>
                    <td className="py-3 px-4 text-slate-600">{rule.format}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">${rule.unitPriceUSD.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {rule.unitPriceCDF.toLocaleString('fr-FR')} CDF
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePricingRule(rule.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION: SERVICES CRUD */}
      {activeSection === 'services' && (
        <div className="space-y-6">
          <form onSubmit={handleAddService} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ajouter un nouveau service au catalogue</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={srvTitle}
                onChange={(e) => setSrvTitle(e.target.value)}
                placeholder="Nom du service *"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={srvCategory}
                onChange={(e) => setSrvCategory(e.target.value)}
                placeholder="Catégorie"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={srvPrice}
                onChange={(e) => setSrvPrice(e.target.value)}
                placeholder="Prix indicatif (ex: Dès $200)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={srvDelay}
                onChange={(e) => setSrvDelay(e.target.value)}
                placeholder="Délai estimatif (ex: 1-2 semaines)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                placeholder="Description courte du service *"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={srvFeatures}
                onChange={(e) => setSrvFeatures(e.target.value)}
                placeholder="Ce que comprend le service (séparé par ·)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Publier le service
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s) => (
              <div key={s.id} className="rounded-xl bg-white border border-slate-200 p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">
                    {s.category} · {s.indicativePrice} · Délai : {s.estimatedDelay}
                  </p>
                  <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                  <p className="text-xs text-slate-600">{s.shortDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleServiceAvailability(s)}
                  className={`px-3 py-1 rounded text-xs font-semibold shrink-0 cursor-pointer ${
                    s.availability === 'available'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {s.availability === 'available' ? 'Actif' : 'Suspendu'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: PORTFOLIO CRUD */}
      {activeSection === 'portfolio' && (
        <div className="space-y-6">
          <form onSubmit={handleAddPortfolio} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ajouter une réalisation au Portfolio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={portTitle}
                onChange={(e) => setPortTitle(e.target.value)}
                placeholder="Titre de la réalisation *"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <select
                value={portCategory}
                onChange={(e) => setPortCategory(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="Applications mobiles">Applications mobiles</option>
                <option value="Documents">Documents</option>
                <option value="Formations">Formations</option>
                <option value="Plateformes web">Plateformes web</option>
              </select>
              <input
                type="text"
                value={portClient}
                onChange={(e) => setPortClient(e.target.value)}
                placeholder="Client / Projet"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <textarea
              required
              rows={2}
              value={portDesc}
              onChange={(e) => setPortDesc(e.target.value)}
              placeholder="Description de la réalisation *"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="text"
                value={portTech}
                onChange={(e) => setPortTech(e.target.value)}
                placeholder="Technologies utilisées"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={portDemoUrl}
                onChange={(e) => setPortDemoUrl(e.target.value)}
                placeholder="Lien de démonstration (URL)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={portAllowDownload}
                  onChange={(e) => setPortAllowDownload(e.target.checked)}
                />
                <span>Autoriser téléchargement fichier</span>
              </label>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Ajouter au portfolio
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolio.map((item) => (
              <div key={item.id} className="rounded-xl bg-white border border-slate-200 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.category} · {item.completionDate}</span>
                  <span>Téléchargement : {item.allowDownload ? 'Autorisé' : 'Restreint'}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: PARTNERS CRUD */}
      {activeSection === 'partners' && (
        <div className="space-y-6">
          <form onSubmit={handleAddPartner} className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Ajouter un partenaire</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Nom du partenaire *"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={partLogo}
                onChange={(e) => setPartLogo(e.target.value)}
                placeholder="Sigle / Logo (ex: ONG)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
              <select
                value={partCat}
                onChange={(e) => setPartCat(e.target.value as PartnerItem['category'])}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="ONG">ONG</option>
                <option value="Entreprises">Entreprises</option>
                <option value="Particuliers">Particuliers</option>
                <option value="Institutions">Institutions</option>
                <option value="Associations">Associations</option>
                <option value="Autres">Autres</option>
              </select>
              <input
                type="text"
                value={partProject}
                onChange={(e) => setPartProject(e.target.value)}
                placeholder="Projet réalisé"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <input
              type="text"
              required
              value={partDesc}
              onChange={(e) => setPartDesc(e.target.value)}
              placeholder="Description du partenariat *"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Enregistrer le partenaire
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {partners.map((p) => (
              <div key={p.id} className="rounded-xl bg-white border border-slate-200 p-4 space-y-1.5">
                <p className="text-xs text-slate-500">{p.category}</p>
                <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                <p className="text-xs text-slate-600">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: TESTIMONIALS MODERATION */}
      {activeSection === 'testimonials' && (
        <div className="space-y-4">
          {testimonials.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
              Aucun témoignage soumis pour le moment. Conformément à la charte BUNO Tech, aucun faux témoignage n’est généré.
            </div>
          ) : (
            testimonials.map((t) => (
              <div key={t.id} className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">
                    <strong>{t.authorName}</strong> ({t.authorRole} {t.organization ? `— ${t.organization}` : ''}) · Service : {t.serviceConcerned}
                  </p>
                  <p className="text-sm text-slate-800">« {t.content} »</p>
                  <p className="text-xs font-mono text-slate-500">Statut actuel : {t.status}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleModerateTestimonial(t, true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Publier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerateTestimonial(t, false)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Masquer</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION: SUBSCRIPTIONS & PAYMENTS */}
      {activeSection === 'subscriptions' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Abonnements clients & activation après vérification de paiement</h3>
            {subscriptions.length === 0 ? (
              <p className="text-xs text-slate-500">Aucune demande d’abonnement enregistrée.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900">
                        {sub.clientName} ({sub.clientEmail}) — {sub.planName}
                      </p>
                      <p className="text-xs font-mono text-slate-600">
                        Montant : {sub.pricePaid} {sub.currency} · Réf Paiement : {sub.paymentReference} · Statut : <strong>{sub.status}</strong>
                      </p>
                    </div>
                    {sub.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => handleVerifyAndActivateSubscription(sub)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        Confirmer le paiement & Activer l’abonnement
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: CLIENTS MANAGEMENT */}
      {activeSection === 'clients' && (
        <div className="overflow-x-auto rounded-xl bg-white border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Nom complet</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Téléphone</th>
                <th className="py-3 px-4">Organisation</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {clients.map((c) => (
                <tr key={c.uid} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{c.fullName}</td>
                  <td className="py-3 px-4 text-slate-600">{c.email}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{c.phone || '—'}</td>
                  <td className="py-3 px-4 text-slate-600">{c.organization || '—'}</td>
                  <td className="py-3 px-4 text-xs font-mono">{c.role}</td>
                  <td className="py-3 px-4 text-xs font-semibold">{c.status}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleClientStatus(c)}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                    >
                      {c.status === 'active' ? 'Suspendre' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION: DIRECT MESSAGING */}
      {activeSection === 'messages' && (
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Conversations Clients ↔ Administrateur</h3>
          {messages.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun message reçu.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {m.senderName} ({m.senderRole}) — Fil client : {m.threadClientName}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700 mt-1">{m.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedThreadClientId(m.threadClientId)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shrink-0 cursor-pointer"
                  >
                    Répondre
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedThreadClientId && (
            <form onSubmit={handleAdminSendReply} className="pt-4 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Votre réponse au client..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
              >
                Envoyer la réponse
              </button>
            </form>
          )}
        </div>
      )}

      {/* SECTION: SITE SETTINGS & CV CONTENT */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveSettings} className="rounded-xl bg-white border border-slate-200 p-6 space-y-4 max-w-4xl">
          <h3 className="text-base font-bold text-slate-900">
            Administration du contenu : Identité, Coordonnées, Réseaux sociaux & CV
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nom principal</label>
              <input
                type="text"
                value={cfgOwner}
                onChange={(e) => setCfgOwner(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Marque professionnelle</label>
              <input
                type="text"
                value={cfgBrand}
                onChange={(e) => setCfgBrand(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email professionnel</label>
              <input
                type="email"
                value={cfgEmail}
                onChange={(e) => setCfgEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contact WhatsApp</label>
              <input
                type="text"
                value={cfgWhatsapp}
                onChange={(e) => setCfgWhatsapp(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GitHub</label>
              <input
                type="text"
                value={cfgGithub}
                onChange={(e) => setCfgGithub(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">YouTube</label>
              <input
                type="text"
                value={cfgYoutube}
                onChange={(e) => setCfgYoutube(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Twitter / X (Configurable)</label>
              <input
                type="text"
                value={cfgTwitter}
                onChange={(e) => setCfgTwitter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Page Facebook officielle</label>
              <input
                type="text"
                value={cfgFacebook}
                onChange={(e) => setCfgFacebook(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">LinkedIn</label>
              <input
                type="text"
                value={cfgLinkedin}
                onChange={(e) => setCfgLinkedin(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Slogan / Positionnement</label>
            <input
              type="text"
              value={cfgTagline}
              onChange={(e) => setCfgTagline(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Proposition de valeur</label>
            <input
              type="text"
              value={cfgPos}
              onChange={(e) => setCfgPos(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Biographie narrative (« Mon parcours »)</label>
            <textarea
              rows={4}
              value={cfgBio}
              onChange={(e) => setCfgBio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Synthèse CV</label>
              <textarea
                rows={3}
                value={cfgCvSummary}
                onChange={(e) => setCfgCvSummary(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Objectifs professionnels</label>
              <textarea
                rows={3}
                value={cfgCvObjectives}
                onChange={(e) => setCfgCvObjectives(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            Enregistrer les modifications
          </button>

          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              Configuration Firebase Hosting & Analytics (Projet : {BUNO_TECH_CUSTOM_FIREBASE_CONFIG.projectId})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-500">Site Firebase Hosting</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {BUNO_TECH_CUSTOM_FIREBASE_CONFIG.hostingSite}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-500">Domaine Auth / Projet</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {BUNO_TECH_CUSTOM_FIREBASE_CONFIG.authDomain}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-500">Firebase Analytics Measurement ID</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {BUNO_TECH_CUSTOM_FIREBASE_CONFIG.measurementId}
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SECTION: AUDIT LOGS */}
      {activeSection === 'audit' && (
        <div className="overflow-x-auto rounded-xl bg-white border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Acteur</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Objet</th>
                <th className="py-3 px-4">Détails vérifiables</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono">{log.actorEmail}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.action}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {log.targetType} ({log.targetId})
                  </td>
                  <td className="py-3 px-4 text-slate-700">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedQuoteModal && (
        <QuoteModalAndPrinter
          quote={selectedQuoteModal}
          settings={settings}
          currentUserUid={adminUser.uid}
          currentUserEmail={adminUser.email}
          isAdminView={true}
          onClose={() => setSelectedQuoteModal(null)}
        />
      )}
    </div>
  );
};
