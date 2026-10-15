import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Bell,
  Calculator,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  MessageSquare,
  PlusCircle,
  Send,
  Settings,
  Sparkles,
  Star,
} from 'lucide-react';
import { db, generateId, handleFirestoreError, OperationType } from '../firebase';
import { createSystemNotification, writeAuditLog } from '../data/initialCatalog';
import {
  AppNotification,
  ClientDocument,
  ClientSubscription,
  DirectMessage,
  PaymentRecord,
  QuoteDocument,
  ServiceItem,
  ServiceRequest,
  SiteSettings,
  SubscriptionPlan,
  UserProfile,
} from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { QuoteModalAndPrinter } from './QuoteModalAndPrinter';

interface ClientDashboardProps {
  userProfile: UserProfile;
  settings: SiteSettings;
  services: ServiceItem[];
  serviceRequests: ServiceRequest[];
  quotes: QuoteDocument[];
  subscriptions: ClientSubscription[];
  subscriptionPlans?: SubscriptionPlan[];
  payments?: PaymentRecord[];
  messages: DirectMessage[];
  notifications: AppNotification[];
  savedDocuments: ClientDocument[];
  preselectedServiceId?: string;
  onNavigateToQuoteCalculator: () => void;
  onNavigateToPremium: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  userProfile,
  settings,
  services,
  serviceRequests,
  quotes,
  subscriptions,
  subscriptionPlans = [],
  payments = [],
  messages,
  notifications,
  savedDocuments,
  preselectedServiceId,
  onNavigateToQuoteCalculator,
  onNavigateToPremium,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'new_request'
    | 'requests'
    | 'quotes'
    | 'subscriptions'
    | 'messages'
    | 'notifications'
    | 'testimonial'
    | 'profile'
  >(preselectedServiceId ? 'new_request' : 'overview');

  const [selectedQuoteModal, setSelectedQuoteModal] = useState<QuoteDocument | null>(null);

  // Real calculated metrics from Firestore
  const activeRequestsCount = serviceRequests.filter(
    (r) => r.status !== 'completed' && r.status !== 'cancelled'
  ).length;
  const completedRequestsCount = serviceRequests.filter((r) => r.status === 'completed').length;
  const quotesToValidateCount = quotes.filter(
    (q) => q.status === 'sent' || q.status === 'discount_approved' || q.status === 'discount_rejected'
  ).length;
  const acceptedQuotesCount = quotes.filter((q) => q.status === 'accepted').length;
  const unreadMessagesCount = messages.filter((m) => m.senderRole === 'admin' && !m.isRead).length;
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  const nowIso = new Date().toISOString();
  const activeSubscription = subscriptions.find(
    (s) => s.status === 'active' && (!s.endDateIso || s.endDateIso > nowIso)
  );

  // New Service Request Form State
  const [reqServiceId, setReqServiceId] = useState(preselectedServiceId || (services[0]?.id ?? 'srv_software_dev'));
  const [reqDescription, setReqDescription] = useState('');
  const [reqPriority, setReqPriority] = useState<'Normale' | 'Haute' | 'Urgente'>('Normale');
  const [reqDeadline, setReqDeadline] = useState('Sous 2 semaines');
  const [reqBudget, setReqBudget] = useState('');
  const [reqAttachment, setReqAttachment] = useState('');
  const [reqComments, setReqComments] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqFeedback, setReqFeedback] = useState<string | null>(null);

  // Direct Message Form State
  const [msgText, setMsgText] = useState('');
  const [msgAttachment, setMsgAttachment] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Testimonial Form State
  const [testiRole, setTestiRole] = useState('Client / Professionnel');
  const [testiOrg, setTestiOrg] = useState(userProfile.organization || '');
  const [testiService, setTestiService] = useState(services[0]?.title || 'Développement de logiciels');
  const [testiContent, setTestiContent] = useState('');
  const [submittingTesti, setSubmittingTesti] = useState(false);
  const [testiFeedback, setTestiFeedback] = useState<string | null>(null);

  // Profile Update Form State
  const [profName, setProfName] = useState(userProfile.fullName);
  const [profPhone, setProfPhone] = useState(userProfile.phone);
  const [profOrg, setProfOrg] = useState(userProfile.organization);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profFeedback, setProfFeedback] = useState<string | null>(null);

  // Subscription Form State
  const [selectedSubPlan, setSelectedSubPlan] = useState<SubscriptionPlan | null>(null);
  const [subCurrency, setSubCurrency] = useState<'USD' | 'CDF'>('USD');
  const [subMethod, setSubMethod] = useState('Mobile Money (M-Pesa / Airtel Money / Orange Money)');
  const [subReference, setSubReference] = useState('');
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subActionFeedback, setSubActionFeedback] = useState<string | null>(null);

  const handleSubscribePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubPlan || !subReference.trim()) {
      setSubActionFeedback('Veuillez sélectionner une formule et indiquer la référence de votre paiement.');
      return;
    }
    setSubmittingSub(true);
    setSubActionFeedback(null);
    const subId = generateId('sub');
    const payId = generateId('pay');
    const price = subCurrency === 'USD' ? selectedSubPlan.priceUSD : selectedSubPlan.priceCDF;

    try {
      await setDoc(doc(db, 'subscriptions', subId), {
        id: subId,
        clientId: userProfile.uid,
        clientName: userProfile.fullName,
        clientEmail: userProfile.email,
        planId: selectedSubPlan.id,
        planName: selectedSubPlan.name,
        pricePaid: price,
        currency: subCurrency,
        paymentReference: subReference.trim(),
        status: 'pending',
        startDateIso: new Date().toISOString(),
        endDateIso: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'payments', payId), {
        id: payId,
        clientId: userProfile.uid,
        clientName: userProfile.fullName,
        amount: price,
        currency: subCurrency,
        method: subMethod,
        reference: subReference.trim(),
        targetType: 'subscription',
        targetId: subId,
        status: 'pending_verification',
        verifiedBy: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_subscription_payment',
        `Nouvelle souscription (${selectedSubPlan.name})`,
        `${userProfile.fullName} a souscrit à « ${selectedSubPlan.name} » (${price} ${subCurrency}). Réf: ${subReference.trim()}`,
        subId
      );

      await writeAuditLog(
        userProfile.uid,
        userProfile.email,
        'SUBSCRIPTION_REQUESTED',
        'subscription',
        subId,
        `Souscription à la formule ${selectedSubPlan.name} soumise (${price} ${subCurrency}).`
      );

      setSubReference('');
      setSelectedSubPlan(null);
      setSubActionFeedback('Votre demande d’abonnement a été transmise. L’administrateur validera l’accès dès confirmation du paiement.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `subscriptions/${subId}`);
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDescription.trim()) return;
    setSubmittingReq(true);
    setReqFeedback(null);

    const reqId = generateId('req');
    const refCode = `SRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const chosenService = services.find((s) => s.id === reqServiceId);
    const serviceTitle = chosenService ? chosenService.title : 'Service Numérique BUNO Tech';

    try {
      await setDoc(doc(db, 'serviceRequests', reqId), {
        id: reqId,
        referenceCode: refCode,
        clientId: userProfile.uid,
        clientName: userProfile.fullName,
        clientEmail: userProfile.email,
        serviceId: reqServiceId,
        serviceTitle,
        description: reqDescription.trim().slice(0, 2900),
        priority: reqPriority,
        desiredDeadline: reqDeadline.trim().slice(0, 95) || 'À convenir',
        indicativeBudget: reqBudget.trim().slice(0, 95),
        attachmentName: reqAttachment.trim().slice(0, 190),
        comments: reqComments.trim().slice(0, 950),
        status: 'submitted',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_service_request',
        `Nouvelle demande ${refCode} : ${serviceTitle}`,
        `${userProfile.fullName} a soumis une demande de service (${serviceTitle}) — Priorité ${reqPriority}.`,
        reqId
      );

      await writeAuditLog(
        userProfile.uid,
        userProfile.email,
        'SERVICE_REQUEST_CREATED',
        'serviceRequest',
        reqId,
        `Demande ${refCode} créée pour le service "${serviceTitle}".`
      );

      setReqDescription('');
      setReqBudget('');
      setReqAttachment('');
      setReqComments('');
      setReqFeedback(`Votre demande ${refCode} a été enregistrée avec le statut « Nouvelle demande ».`);
      setActiveTab('requests');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `serviceRequests/${reqId}`);
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || sendingMsg) return;
    setSendingMsg(true);
    const msgId = generateId('msg');
    try {
      await setDoc(doc(db, 'messages', msgId), {
        id: msgId,
        threadClientId: userProfile.uid,
        threadClientName: userProfile.fullName,
        senderId: userProfile.uid,
        senderName: userProfile.fullName,
        senderRole: 'client',
        content: msgText.trim().slice(0, 2900),
        attachmentName: msgAttachment.trim().slice(0, 190),
        isRead: false,
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_message',
        `Nouveau message de ${userProfile.fullName}`,
        msgText.trim().slice(0, 140),
        msgId
      );

      setMsgText('');
      setMsgAttachment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `messages/${msgId}`);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
    }
  };

  const handleSubmitTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testiContent.trim().length < 10) return;
    setSubmittingTesti(true);
    setTestiFeedback(null);
    const testiId = generateId('testi');
    try {
      await setDoc(doc(db, 'testimonials', testiId), {
        id: testiId,
        authorId: userProfile.uid,
        authorName: userProfile.fullName,
        authorRole: testiRole.trim().slice(0, 95) || 'Client',
        organization: testiOrg.trim().slice(0, 115),
        content: testiContent.trim().slice(0, 1450),
        serviceConcerned: testiService.slice(0, 130),
        status: 'pending',
        isPublic: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_testimonial',
        `Nouveau témoignage soumis par ${userProfile.fullName}`,
        `En attente de validation administrative avant publication.`,
        testiId
      );

      setTestiContent('');
      setTestiFeedback(
        'Merci ! Votre témoignage a été enregistré et sera publié après validation par l’administrateur.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `testimonials/${testiId}`);
    } finally {
      setSubmittingTesti(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profName.trim().length < 2) return;
    setSavingProfile(true);
    setProfFeedback(null);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        fullName: profName.trim().slice(0, 115),
        phone: profPhone.trim().slice(0, 38),
        organization: profOrg.trim().slice(0, 115),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(
        userProfile.uid,
        userProfile.email,
        'USER_PROFILE_UPDATED',
        'user',
        userProfile.uid,
        `Mise à jour des coordonnées du profil client.`
      );
      setProfFeedback('Votre profil a été mis à jour avec succès.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const requestStatusLabels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Nouvelle demande',
    reviewing: 'En analyse',
    info_needed: 'Informations complémentaires demandées',
    quoted: 'Devis préparé',
    waiting_client: 'En attente du client',
    accepted: 'Acceptée',
    in_progress: 'En cours de réalisation',
    completed: 'Terminée',
    cancelled: 'Annulée',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Client Header & Shortcuts */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-sky-700">Espace Personnel Client Vérifié</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Bonjour, {userProfile.fullName}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {userProfile.email} {userProfile.organization ? `· ${userProfile.organization}` : ''}
          </p>
        </div>

        {/* Raccourcis rapides */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('new_request')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Demander un service</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToQuoteCalculator}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>Créer un devis</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToPremium}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Services premium</span>
          </button>
          <PWAInstallButton variant="compact" />
        </div>
      </div>

      {/* Real-time System Metrics Grid (Tabular Numerals) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Demandes en cours</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{activeRequestsCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Devis reçus</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{quotes.length}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Devis à valider</p>
          <p className="text-xl font-bold font-mono text-amber-700 mt-1 tabular-nums">{quotesToValidateCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Devis acceptés</p>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">{acceptedQuotesCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Services terminés</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{completedRequestsCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Messages non lus</p>
          <p className="text-xl font-bold font-mono text-sky-700 mt-1 tabular-nums">{unreadMessagesCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
          <p className="text-[11px] text-slate-500">Documents cloud</p>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{savedDocuments.length}</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className="rounded-xl bg-white border border-slate-200 p-3.5 text-left hover:border-slate-300 transition-colors cursor-pointer"
        >
          <p className="text-[11px] text-slate-500">Abonnement</p>
          <p className="text-xs font-bold text-slate-900 mt-1.5 truncate">
            {activeSubscription ? activeSubscription.planName : 'Souscrire →'}
          </p>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        {[
          { id: 'overview', label: 'Tableau de bord', icon: ClipboardList },
          { id: 'new_request', label: 'Nouvelle demande', icon: PlusCircle },
          { id: 'requests', label: `Mes demandes (${serviceRequests.length})`, icon: FileCheck2 },
          { id: 'quotes', label: `Mes devis (${quotes.length})`, icon: FileText },
          { id: 'subscriptions', label: `Abonnements (${subscriptions.length})`, icon: CreditCard },
          { id: 'messages', label: `Messages (${messages.length})`, icon: MessageSquare },
          { id: 'notifications', label: `Notifications (${unreadNotificationsCount})`, icon: Bell },
          { id: 'testimonial', label: 'Témoignage', icon: Star },
          { id: 'profile', label: 'Profil & Paramètres', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {reqFeedback && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900">
          {reqFeedback}
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Service Requests */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Dernières demandes de service</h3>
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
              >
                Tout voir →
              </button>
            </div>
            {serviceRequests.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-xs text-slate-500">
                <p>Aucune demande de service enregistrée pour le moment.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_request')}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Soumettre ma première demande
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {serviceRequests.slice(0, 4).map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {req.referenceCode} · Priorité {req.priority}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">{req.serviceTitle}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {requestStatusLabels[req.status] || req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Quotes */}
          <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Derniers devis calculés</h3>
              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
              >
                Gérer mes devis →
              </button>
            </div>
            {quotes.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-xs text-slate-500">
                <p>Aucun devis généré pour le moment.</p>
                <button
                  type="button"
                  onClick={onNavigateToQuoteCalculator}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
                >
                  Ouvrir le calculateur de devis
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {quotes.slice(0, 4).map((q) => (
                  <div key={q.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-900">{q.quoteNumber}</p>
                      <p className="text-xs text-slate-500">
                        {q.itemsCount} ligne(s) · Statut : {q.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        {q.currency === 'USD' ? `$${q.finalTotal.toFixed(2)}` : `${q.finalTotal.toLocaleString('fr-FR')} CDF`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedQuoteModal(q)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        Ouvrir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NEW SERVICE REQUEST */}
      {activeTab === 'new_request' && (
        <form
          onSubmit={handleCreateServiceRequest}
          className="rounded-xl bg-white border border-slate-200 p-6 max-w-3xl space-y-5"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">Soumettre une demande de service</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Décrivez votre besoin. Votre demande sera enregistrée avec un code de suivi unique et transmise à Aimable Maombi Bunoti.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Service souhaité *</label>
              <select
                value={reqServiceId}
                onChange={(e) => setReqServiceId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.indicativePrice})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Niveau de priorité *</label>
              <select
                value={reqPriority}
                onChange={(e) => setReqPriority(e.target.value as 'Normale' | 'Haute' | 'Urgente')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="Normale">Normale</option>
                <option value="Haute">Haute</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description détaillée du besoin *
            </label>
            <textarea
              required
              rows={4}
              value={reqDescription}
              onChange={(e) => setReqDescription(e.target.value)}
              placeholder="Expliquez les objectifs, les fonctionnalités attendues ou le problème à résoudre..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Délai souhaité *</label>
              <input
                type="text"
                required
                value={reqDeadline}
                onChange={(e) => setReqDeadline(e.target.value)}
                placeholder="Ex: 2 semaines, fin du mois..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Budget indicatif (facultatif)</label>
              <input
                type="text"
                value={reqBudget}
                onChange={(e) => setReqBudget(e.target.value)}
                placeholder="Ex: $300 - $500"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom / Lien du fichier annexe (facultatif)
              </label>
              <input
                type="text"
                value={reqAttachment}
                onChange={(e) => setReqAttachment(e.target.value)}
                placeholder="Ex: Cahier_des_charges.pdf"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Commentaires complémentaires</label>
            <input
              type="text"
              value={reqComments}
              onChange={(e) => setReqComments(e.target.value)}
              placeholder="Précisions sur les horaires de contact, contraintes techniques..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submittingReq}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {submittingReq ? 'Enregistrement en cours...' : 'Envoyer la demande de service'}
            </button>
          </div>
        </form>
      )}

      {/* TAB: SERVICE REQUESTS LIST */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {serviceRequests.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center space-y-3">
              <p className="text-sm text-slate-600">Vous n’avez pas encore soumis de demande de service.</p>
              <button
                type="button"
                onClick={() => setActiveTab('new_request')}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Demander un service maintenant
              </button>
            </div>
          ) : (
            serviceRequests.map((req) => (
              <div key={req.id} className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-900">{req.referenceCode}</span>
                    <span className="mx-1.5">·</span>
                    <span>Priorité : {req.priority}</span>
                    <span className="mx-1.5">·</span>
                    <span>Délai souhaité : {req.desiredDeadline}</span>
                  </div>
                  <div className="text-xs font-semibold text-sky-800">
                    Statut : {requestStatusLabels[req.status] || req.status}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900">{req.serviceTitle}</h3>
                <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">{req.description}</p>
                {req.adminNotes && (
                  <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-950">
                    <strong>Note de l’administrateur BUNO Tech :</strong> {req.adminNotes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: QUOTES LIST */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Mes devis enregistrés ({quotes.length})</h2>
            <button
              type="button"
              onClick={onNavigateToQuoteCalculator}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
            >
              + Nouveau calcul de devis
            </button>
          </div>

          {quotes.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
              Aucun devis enregistré. Utilisez le Calculateur de devis pour générer une estimation officielle.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                    <th className="py-3 px-4">N° Devis</th>
                    <th className="py-3 px-4">Lignes</th>
                    <th className="py-3 px-4 text-right">Sous-total initial</th>
                    <th className="py-3 px-4 text-right">Réduction accordée</th>
                    <th className="py-3 px-4 text-right">Total final</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {quotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{q.quoteNumber}</td>
                      <td className="py-3 px-4 font-mono tabular-nums">{q.itemsCount}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {q.currency === 'USD' ? `$${q.initialSubtotal.toFixed(2)}` : `${q.initialSubtotal.toLocaleString('fr-FR')} CDF`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums">
                        {q.discountGrantedAmount > 0
                          ? q.currency === 'USD'
                            ? `- $${q.discountGrantedAmount.toFixed(2)}`
                            : `- ${q.discountGrantedAmount.toLocaleString('fr-FR')} CDF`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {q.currency === 'USD' ? `$${q.finalTotal.toFixed(2)}` : `${q.finalTotal.toLocaleString('fr-FR')} CDF`}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">{q.status}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedQuoteModal(q)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          Afficher / Négocier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: SUBSCRIPTIONS & PLANS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {subActionFeedback && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-900">
              {subActionFeedback}
            </div>
          )}

          {/* Current Active Subscription Banner */}
          <div className="rounded-xl bg-white border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Statut de votre abonnement actuel</h3>
            {activeSubscription ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Abonnement actif : {activeSubscription.planName}
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-900">
                    Montant : {activeSubscription.pricePaid} {activeSubscription.currency} (Réf : {activeSubscription.paymentReference})
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Valide jusqu’au : {activeSubscription.endDateIso ? new Date(activeSubscription.endDateIso).toLocaleDateString('fr-FR') : 'Durée contractuelle en cours'}.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onNavigateToPremium}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Accéder aux outils BUNO Tech Premium</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">Aucun abonnement actif</p>
                  <p className="text-xs text-slate-600">
                    Souscrivez à une formule pour débloquer le traitement de texte professionnel, les modèles administratifs, les modules de formation certifiants et l'assistant IA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToPremium}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap cursor-pointer shrink-0"
                >
                  Découvrir les outils Premium
                </button>
              </div>
            )}
          </div>

          {/* Formules Disponibles & Souscription */}
          <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Formules d’abonnement BUNO Tech</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tarification transparente en Dollar américain (USD) ou Franc congolais (CDF).
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSubCurrency('USD')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    subCurrency === 'USD' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setSubCurrency('CDF')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    subCurrency === 'CDF' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  CDF (FC)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionPlans.map((plan) => {
                const isSelected = selectedSubPlan?.id === plan.id;
                const price = subCurrency === 'USD' ? `$${plan.priceUSD}` : `${plan.priceCDF.toLocaleString('fr-FR')} CDF`;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/40 ring-2 ring-sky-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-sky-700">{plan.durationLabel}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {plan.durationDays} jours
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                      <p className="text-2xl font-black font-display text-slate-950 tabular-nums">{price}</p>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{plan.features}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubPlan(plan)}
                      className={`mt-5 w-full rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ Formule sélectionnée' : 'Choisir cette formule'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Payment Reference Form */}
            {selectedSubPlan && (
              <form
                onSubmit={handleSubscribePlan}
                className="rounded-xl border-2 border-sky-500/40 bg-sky-50/20 p-5 space-y-4"
              >
                <h4 className="text-sm font-bold text-slate-900">
                  Confirmer la souscription : {selectedSubPlan.name} ({subCurrency === 'USD' ? `$${selectedSubPlan.priceUSD}` : `${selectedSubPlan.priceCDF.toLocaleString('fr-FR')} CDF`})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Moyen de paiement utilisé *</label>
                    <select
                      value={subMethod}
                      onChange={(e) => setSubMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="Mobile Money (M-Pesa / Airtel Money / Orange Money)">
                        Mobile Money (M-Pesa / Airtel Money / Orange Money)
                      </option>
                      <option value="Virement bancaire (Rawbank / Equity BCDC)">
                        Virement bancaire (Rawbank / Equity BCDC)
                      </option>
                      <option value="Paiement direct à Goma (Cash avec reçu)">
                        Paiement direct à Goma (Cash avec reçu)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Numéro de référence de transaction / ID Mobile Money *
                    </label>
                    <input
                      type="text"
                      required
                      value={subReference}
                      onChange={(e) => setSubReference(e.target.value)}
                      placeholder="Ex: MP241015.0019 ou ID transaction"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-slate-500">
                    Paiement vérifié manuellement par Aimable Maombi Bunoti avant activation de l'accès.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingSub}
                    className="rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingSub ? 'Transmission...' : 'Soumettre le paiement'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Subscriptions History Table */}
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Historique de vos abonnements et règlements</h3>
            </div>
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aucun historique d’abonnement disponible pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Formule</th>
                      <th className="py-3 px-4">Montant réglé</th>
                      <th className="py-3 px-4">Référence</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Date de début</th>
                      <th className="py-3 px-4">Date d'échéance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{sub.planName}</td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          {sub.pricePaid} {sub.currency}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{sub.paymentReference || '—'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sub.status === 'active'
                              ? 'Actif'
                              : sub.status === 'pending'
                              ? 'En attente de validation'
                              : sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sub.startDateIso ? new Date(sub.startDateIso).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sub.endDateIso ? new Date(sub.endDateIso).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: DIRECT MESSAGES */}
      {activeTab === 'messages' && (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden flex flex-col min-h-[480px]">
          <div className="bg-slate-900 px-5 py-3.5 text-white">
            <h3 className="text-xs font-semibold">
              Messagerie directe — Conversation avec {settings.ownerName} ({settings.brandName})
            </h3>
          </div>
          <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-96">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">
                Envoyez un message direct à l’administrateur pour toute question sur vos projets ou devis.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl text-xs sm:text-sm max-w-xl ${
                    m.senderRole === 'client'
                      ? 'bg-slate-900 text-white ml-auto'
                      : 'bg-sky-50 border border-sky-200 text-slate-900 mr-auto'
                  }`}
                >
                  <p className="text-[11px] opacity-75 font-semibold mb-1">{m.senderName}</p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.attachmentName && (
                    <p className="mt-1.5 text-[11px] font-mono underline">Pièce jointe : {m.attachmentName}</p>
                  )}
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendDirectMessage} className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Écrivez votre message à l’administrateur..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm"
              />
              <input
                type="text"
                value={msgAttachment}
                onChange={(e) => setMsgAttachment(e.target.value)}
                placeholder="Lien/Nom fichier (facultatif)"
                className="sm:w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={sendingMsg || !msgText.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">Aucune notification pour le moment.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600">{n.message}</p>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkNotificationRead(n.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marquer lu</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: LEAVE A TESTIMONIAL */}
      {activeTab === 'testimonial' && (
        <form
          onSubmit={handleSubmitTestimonial}
          className="rounded-xl bg-white border border-slate-200 p-6 max-w-2xl space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">Laisser un témoignage vérifié</h2>
          <p className="text-xs text-slate-600">
            Partagez votre expérience réelle avec BUNO Tech. Votre témoignage sera publié après validation administrative.
          </p>
          {testiFeedback && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
              {testiFeedback}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Votre fonction / titre *</label>
              <input
                type="text"
                required
                value={testiRole}
                onChange={(e) => setTestiRole(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Organisation / Entreprise</label>
              <input
                type="text"
                value={testiOrg}
                onChange={(e) => setTestiOrg(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Service concerné *</label>
            <select
              value={testiService}
              onChange={(e) => setTestiService(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {services.map((s) => (
                <option key={s.id} value={s.title}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Votre témoignage (min. 10 caractères) *</label>
            <textarea
              required
              rows={4}
              value={testiContent}
              onChange={(e) => setTestiContent(e.target.value)}
              placeholder="Décrivez la prestation réalisée et les résultats obtenus..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submittingTesti}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            {submittingTesti ? 'Envoi...' : 'Soumettre mon témoignage pour validation'}
          </button>
        </form>
      )}

      {/* TAB: PROFILE & SETTINGS */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleUpdateProfile}
          className="rounded-xl bg-white border border-slate-200 p-6 max-w-xl space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">Mon profil & coordonnées</h2>
          {profFeedback && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
              {profFeedback}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={profName}
              onChange={(e) => setProfName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone / WhatsApp</label>
            <input
              type="text"
              value={profPhone}
              onChange={(e) => setProfPhone(e.target.value)}
              placeholder="+243 ..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Organisation / Entreprise / ONG</label>
            <input
              type="text"
              value={profOrg}
              onChange={(e) => setProfOrg(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            {savingProfile ? 'Enregistrement...' : 'Enregistrer mes modifications'}
          </button>
        </form>
      )}

      {/* Quote Modal */}
      {selectedQuoteModal && (
        <QuoteModalAndPrinter
          quote={selectedQuoteModal}
          settings={settings}
          currentUserUid={userProfile.uid}
          currentUserEmail={userProfile.email}
          isAdminView={false}
          onClose={() => setSelectedQuoteModal(null)}
        />
      )}
    </div>
  );
};
