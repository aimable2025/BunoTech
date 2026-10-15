import React, { useRef, useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BookOpen,
  Bot,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  Italic,
  List,
  ListOrdered,
  Lock,
  Printer,
  Save,
  Send,
  Table,
  Trash2,
  Underline,
} from 'lucide-react';
import { db, generateId, handleFirestoreError, OperationType } from '../firebase';
import {
  createSystemNotification,
  IT_TRAINING_MODULES,
  TrainingModuleItem,
  writeAuditLog,
} from '../data/initialCatalog';
import {
  ClientDocument,
  ClientSubscription,
  DocumentTemplate,
  SubscriptionPlan,
  TrainingProgress,
  UserProfile,
} from '../types';

interface PremiumWorkspaceProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  plans: SubscriptionPlan[];
  userSubscriptions: ClientSubscription[];
  templates: DocumentTemplate[];
  savedDocuments: ClientDocument[];
  trainingProgress: TrainingProgress[];
  onRequireLogin: () => void;
}

export const PremiumWorkspace: React.FC<PremiumWorkspaceProps> = ({
  currentUser,
  isAdmin,
  plans,
  userSubscriptions,
  templates,
  savedDocuments,
  trainingProgress,
  onRequireLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'trainer' | 'ai' | 'plans'>('editor');

  // Verify real active subscription state from Firestore
  const nowIso = new Date().toISOString();
  const activeSubscription = userSubscriptions.find(
    (sub) => sub.status === 'active' && (!sub.endDateIso || sub.endDateIso > nowIso)
  );
  const pendingSubscription = userSubscriptions.find((sub) => sub.status === 'pending');
  const hasPremiumAccess = isAdmin || Boolean(activeSubscription);

  // Subscription checkout form state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [payCurrency, setPayCurrency] = useState<'USD' | 'CDF'>('USD');
  const [payMethod, setPayMethod] = useState('Mobile Money (M-Pesa / Airtel Money / Orange Money)');
  const [payReference, setPayReference] = useState('');
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subFeedback, setSubFeedback] = useState<string | null>(null);

  // Word Processor & Templates State
  const [docTitle, setDocTitle] = useState('Nouveau Document Professionnel');
  const [docCategory, setDocCategory] = useState('Documents');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>(
    `<h1>TITRE DU DOCUMENT</h1><p>Rédigez votre contenu ici ou chargez un modèle professionnel depuis la bibliothèque BUNO Tech Premium.</p>`
  );
  const [templateFilter, setTemplateFilter] = useState<'ALL' | 'CV' | 'Lettres' | 'Rapports' | 'Documents'>('ALL');
  const [savingDoc, setSavingDoc] = useState(false);
  const [docFeedback, setDocFeedback] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Interactive IT Trainer State
  const [selectedModule, setSelectedModule] = useState<TrainingModuleItem>(IT_TRAINING_MODULES[0]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  // AI Assistant State
  const [aiCategory, setAiCategory] = useState('Rédaction professionnelle');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; text: string; category?: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleRequestSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (!selectedPlan || !payReference.trim()) {
      setSubFeedback('Veuillez sélectionner une formule et indiquer la référence réelle de votre transaction.');
      return;
    }
    setSubmittingSub(true);
    setSubFeedback(null);

    const subId = generateId('sub');
    const payId = generateId('pay');
    const amount = payCurrency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceCDF;

    try {
      // 1. Create real verifiable payment record in pending_verification state
      await setDoc(doc(db, 'payments', payId), {
        id: payId,
        clientId: currentUser.uid,
        clientName: currentUser.fullName,
        amount,
        currency: payCurrency,
        method: payMethod.slice(0, 80),
        reference: payReference.trim().slice(0, 110),
        targetType: 'subscription',
        targetId: subId,
        status: 'pending_verification',
        verifiedBy: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create subscription record in pending state (only active after admin verifies payment)
      await setDoc(doc(db, 'subscriptions', subId), {
        id: subId,
        clientId: currentUser.uid,
        clientName: currentUser.fullName,
        clientEmail: currentUser.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        pricePaid: amount,
        currency: payCurrency,
        paymentReference: payReference.trim().slice(0, 110),
        status: 'pending',
        startDateIso: '',
        endDateIso: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createSystemNotification(
        'ADMIN',
        'new_subscription_request',
        `Nouvelle souscription Premium : ${selectedPlan.name}`,
        `${currentUser.fullName} a soumis une demande d'abonnement (${selectedPlan.name}) avec la référence de paiement ${payReference.trim()}.`,
        subId
      );

      await writeAuditLog(
        currentUser.uid,
        currentUser.email,
        'SUBSCRIPTION_REQUESTED',
        'subscription',
        subId,
        `Demande d'abonnement ${selectedPlan.name} (${amount} ${payCurrency}) — Réf paiement: ${payReference.trim()}`
      );

      setSelectedPlan(null);
      setPayReference('');
      setSubFeedback(
        'Votre demande d’abonnement et sa référence de paiement ont été enregistrées. Votre accès BUNO Tech Premium sera activé dès vérification par l’administrateur.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `subscriptions/${subId}`);
    } finally {
      setSubmittingSub(false);
    }
  };

  // Rich Text Editor Commands
  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorHtml(editorRef.current.innerHTML);
    }
  };

  const insertHtmlTable = () => {
    const tableMarkup = `<table style="width:100%; border-collapse:collapse; margin:12px 0;" border="1"><thead><tr style="background:#f1f5f9;"><th style="padding:8px; border:1px solid #cbd5e1;">Colonne 1</th><th style="padding:8px; border:1px solid #cbd5e1;">Colonne 2</th><th style="padding:8px; border:1px solid #cbd5e1;">Colonne 3</th></tr></thead><tbody><tr><td style="padding:8px; border:1px solid #cbd5e1;">Donnée 1</td><td style="padding:8px; border:1px solid #cbd5e1;">Donnée 2</td><td style="padding:8px; border:1px solid #cbd5e1;">Donnée 3</td></tr></tbody></table><p></p>`;
    execFormat('insertHTML', tableMarkup);
  };

  const loadTemplateIntoEditor = (tpl: DocumentTemplate) => {
    setDocTitle(tpl.title);
    setDocCategory(tpl.category);
    setEditingDocId(null);
    setEditorHtml(tpl.defaultContentHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = tpl.defaultContentHtml;
    }
    setActiveTab('editor');
    setDocFeedback(`Modèle « ${tpl.title} » chargé dans l’éditeur.`);
  };

  const loadSavedDocIntoEditor = (saved: ClientDocument) => {
    setDocTitle(saved.title);
    setDocCategory(saved.category);
    setEditingDocId(saved.id);
    setEditorHtml(saved.contentHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved.contentHtml;
    }
    setActiveTab('editor');
    setDocFeedback(`Document « ${saved.title} » ouvert.`);
  };

  const handleSaveDocument = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    const currentContent = editorRef.current ? editorRef.current.innerHTML : editorHtml;
    if (!docTitle.trim() || !currentContent.trim()) {
      setDocFeedback('Veuillez renseigner un titre et un contenu avant de sauvegarder.');
      return;
    }
    setSavingDoc(true);
    setDocFeedback(null);
    try {
      if (editingDocId) {
        await updateDoc(doc(db, 'documents', editingDocId), {
          title: docTitle.trim().slice(0, 150),
          category: docCategory.slice(0, 75),
          contentHtml: currentContent.slice(0, 49000),
          updatedAt: serverTimestamp(),
        });
        setDocFeedback('Modifications sauvegardées dans votre espace cloud BUNO Tech.');
      } else {
        const newDocId = generateId('doc');
        await setDoc(doc(db, 'documents', newDocId), {
          id: newDocId,
          ownerId: currentUser.uid,
          title: docTitle.trim().slice(0, 150),
          category: docCategory.slice(0, 75),
          contentHtml: currentContent.slice(0, 49000),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setEditingDocId(newDocId);
        setDocFeedback('Document sauvegardé avec succès dans votre espace personnel.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'documents');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteSavedDoc = async (docId: string) => {
    try {
      await deleteDoc(doc(db, 'documents', docId));
      if (editingDocId === docId) {
        setEditingDocId(null);
      }
      setDocFeedback('Document supprimé.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${docId}`);
    }
  };

  const handleExportWordDoc = () => {
    const content = editorRef.current ? editorRef.current.innerHTML : editorHtml;
    const fullDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle}</title><style>body{font-family:Calibri,Arial,sans-serif;line-height:1.6;padding:24px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #666;padding:6px;}</style></head><body>${content}</body></html>`;
    const blob = new Blob([fullDoc], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Document_BUNO_Tech'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Interactive Quiz evaluation & saving
  const handleQuizSubmit = async () => {
    setQuizSubmitted(true);
    if (!currentUser) return;

    let correctCount = 0;
    selectedModule.quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        correctCount += 1;
      }
    });
    const scorePercent = Math.round((correctCount / selectedModule.quiz.length) * 100);
    const existingRecord = trainingProgress.find((p) => p.moduleId === selectedModule.id);

    setSavingProgress(true);
    try {
      if (existingRecord) {
        await updateDoc(doc(db, 'trainingProgress', existingRecord.id), {
          score: scorePercent,
          status: scorePercent >= 60 ? 'completed' : 'in_progress',
          updatedAt: serverTimestamp(),
        });
      } else {
        const progId = generateId('prog');
        await setDoc(doc(db, 'trainingProgress', progId), {
          id: progId,
          userId: currentUser.uid,
          moduleId: selectedModule.id,
          moduleTitle: selectedModule.title,
          score: scorePercent,
          status: scorePercent >= 60 ? 'completed' : 'in_progress',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'trainingProgress');
    } finally {
      setSavingProgress(false);
    }
  };

  // AI Assistant Submit
  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    const userText = aiPrompt.trim();
    const updatedHistory = [...aiMessages, { role: 'user' as const, text: userText, category: aiCategory }];
    setAiMessages(updatedHistory);
    setAiPrompt('');
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          taskCategory: aiCategory,
          history: updatedHistory.slice(-6),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération IA.');
      }
      setAiMessages((prev) => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur de connexion à l’Assistant IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const sendAiResponseToEditor = (text: string) => {
    const htmlFormatted = text
      .split('\n\n')
      .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');
    setDocTitle(`Document IA — ${aiCategory}`);
    setEditorHtml(htmlFormatted);
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlFormatted;
    }
    setActiveTab('editor');
    setDocFeedback('Texte généré par l’Assistant IA transféré dans le Traitement de texte.');
  };

  const filteredTemplates =
    templateFilter === 'ALL' ? templates : templates.filter((t) => t.category === templateFilter);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header & Real Subscription Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 no-print">
        <div>
          <p className="text-xs font-semibold text-sky-700">BUNO Tech Premium · Productivité, Modèles, Formation & IA</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Espace BUNO Tech Premium
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Traitement de texte professionnel en ligne, bibliothèque de 19 modèles administratifs et métiers, parcours de formation informatique interactif et Assistant IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2 font-medium">
              Accès Administrateur Actif · Toutes les fonctionnalités déverrouillées
            </div>
          ) : activeSubscription ? (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2">
              <p className="font-semibold">Abonnement actif : {activeSubscription.planName}</p>
              <p className="font-mono text-[11px]">
                Expire le : {new Date(activeSubscription.endDateIso).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ) : pendingSubscription ? (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2">
              <p className="font-semibold">Abonnement en attente de validation : {pendingSubscription.planName}</p>
              <p className="font-mono text-[11px]">Réf : {pendingSubscription.paymentReference}</p>
            </div>
          ) : (
            <div className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2">
              Statut actuel : Aucun abonnement actif
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'editor' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Traitement de texte</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'templates' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Bibliothèque de Modèles ({templates.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trainer')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'trainer' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Formateur Informatique</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Assistant IA</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'plans' ? 'bg-sky-600 text-white' : 'text-sky-700 hover:bg-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Formules d’abonnement (1j à 3 ans)</span>
        </button>
      </div>

      {/* Subscription Gate if user is on a Premium Tool tab without an active subscription */}
      {!hasPremiumAccess && activeTab !== 'plans' && (
        <div className="rounded-xl bg-white border border-slate-200 p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-slate-900 text-sky-400 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">
                Accès réservé aux abonnés BUNO Tech Premium actifs
              </h2>
              <p className="text-sm text-slate-600 max-w-2xl">
                Conformément au principe d’état réel du système, l’accès au Traitement de texte en ligne, à la personnalisation complète des 19 modèles professionnels, au Formateur informatique interactif et à l’Assistant IA requiert un abonnement actif vérifié.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className="rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
                >
                  Choisir une formule d’abonnement (dès $2 / 1 jour)
                </button>
                {!currentUser && (
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    Me connecter à mon compte client
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview of included templates and modules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-slate-600">
            <div>
              <p className="font-bold text-slate-900 text-sm mb-1">19 Modèles Professionnels</p>
              <p>CV (Professionnel, Moderne, Étudiant, Simple), Lettres (Motivation, Administrative, Emploi, Stage), Rapports & Documents officiels (PV, Facture, Devis, Note de service).</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm mb-1">Formateur Informatique Interactif</p>
              <p>Cours structurés, exercices pratiques et quiz corrigés en temps réel sur Windows, Word, Excel, PowerPoint, Cybersécurité et Programmation.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm mb-1">Éditeur Riche & Assistant IA</p>
              <p>Rédaction assistée par IA (API serveur sécurisée), mise en page complète, sauvegarde cloud, export Word (.doc) et impression PDF.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: SUBSCRIPTION PLANS (Always accessible) */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl bg-white p-5 flex flex-col justify-between border transition-colors ${
                  selectedPlan?.id === plan.id ? 'border-sky-600 ring-2 ring-sky-600/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="text-xs font-medium text-slate-500">
                    Durée : <strong className="text-slate-900">{plan.durationLabel}</strong>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-2xl font-bold font-mono text-slate-900 tabular-nums">${plan.priceUSD}</p>
                    <p className="text-xs font-mono text-slate-500 tabular-nums">
                      ou {plan.priceCDF.toLocaleString('fr-FR')} CDF
                    </p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{plan.features}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Sélectionner ({plan.durationLabel})
                </button>
              </div>
            ))}
          </div>

          {subFeedback && (
            <div className="rounded-lg bg-sky-50 border border-sky-200 p-4 text-xs font-medium text-sky-900">
              {subFeedback}
            </div>
          )}

          {selectedPlan && (
            <form
              onSubmit={handleRequestSubscription}
              className="rounded-xl bg-white border border-slate-200 p-6 max-w-2xl space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">
                Souscrire à la formule : {selectedPlan.name} ({selectedPlan.durationLabel})
              </h3>
              <p className="text-xs text-slate-600">
                Aucun faux paiement n’est simulé. Effectuez votre règlement via Mobile Money ou virement auprès de BUNO Tech (+243 992 294 852), puis saisissez la référence réelle de transaction ci-dessous pour vérification et activation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Devise du règlement</label>
                  <select
                    value={payCurrency}
                    onChange={(e) => setPayCurrency(e.target.value as 'USD' | 'CDF')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="USD">USD (${selectedPlan.priceUSD})</option>
                    <option value="CDF">CDF ({selectedPlan.priceCDF.toLocaleString('fr-FR')} CDF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Méthode de paiement utilisée</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Mobile Money (M-Pesa / Airtel / Orange)">Mobile Money (M-Pesa / Airtel / Orange)</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Paiement espèces au bureau BUNO Tech">Paiement espèces avec reçu BUNO Tech</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Référence de transaction / ID de reçu vérifiable *
                </label>
                <input
                  type="text"
                  required
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Ex: MPESA-20261001-99482 ou Numéro de reçu"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingSub}
                  className="rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
                >
                  {submittingSub ? 'Enregistrement...' : 'Soumettre pour vérification et activation'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: RICH TEXT PROCESSOR (Unlocked when hasPremiumAccess) */}
      {hasPremiumAccess && activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Saved Documents & Quick Template Loader */}
          <div className="lg:col-span-1 space-y-6 no-print">
            <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Mes documents sauvegardés ({savedDocuments.length})</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDocId(null);
                    setDocTitle('Nouveau Document');
                    const blank = '<h1>NOUVEAU DOCUMENT</h1><p>Commencez votre rédaction ici...</p>';
                    setEditorHtml(blank);
                    if (editorRef.current) editorRef.current.innerHTML = blank;
                  }}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  + Nouveau
                </button>
              </div>
              {savedDocuments.length === 0 ? (
                <p className="text-xs text-slate-500">Aucun document sauvegardé pour le moment.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedDocuments.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => loadSavedDocIntoEditor(d)}
                        className="text-left truncate flex-1 cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-slate-900 truncate">{d.title}</p>
                        <p className="text-[11px] text-slate-500">{d.category}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedDoc(d.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Charger un modèle rapide</h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTemplateIntoEditor(t)}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate font-medium text-slate-800">{t.title}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">{t.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Rich Editor */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-4 no-print">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Titre du document</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Catégorie</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="CV">CV</option>
                    <option value="Lettres">Lettres</option>
                    <option value="Rapports">Rapports</option>
                    <option value="Documents">Documents Administratifs</option>
                  </select>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'H1')}
                    className="px-2.5 py-1.5 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'H2')}
                    className="px-2.5 py-1.5 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('formatBlock', 'P')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Paragraphe
                  </button>
                  <span className="text-slate-300 px-1">|</span>
                  <button
                    type="button"
                    onClick={() => execFormat('bold')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Gras"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('italic')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Italique"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('underline')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Souligné"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <span className="text-slate-300 px-1">|</span>
                  <button
                    type="button"
                    onClick={() => execFormat('justifyLeft')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Aligner à gauche"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('justifyCenter')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Centrer"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('justifyRight')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Aligner à droite"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                  <span className="text-slate-300 px-1">|</span>
                  <button
                    type="button"
                    onClick={() => execFormat('insertUnorderedList')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Liste à puces"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execFormat('insertOrderedList')}
                    className="p-1.5 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Liste numérotée"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={insertHtmlTable}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="Insérer un tableau"
                  >
                    <Table className="w-4 h-4" />
                    <span>Tableau</span>
                  </button>
                </div>

                {/* Action Buttons: Save, Export Word, Print/PDF */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingDoc}
                    onClick={handleSaveDocument}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingDoc ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportWordDoc}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-600" />
                    <span>Exporter .DOC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-700" />
                    <span>Imprimer / PDF</span>
                  </button>
                </div>
              </div>

              {docFeedback && (
                <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-900">
                  {docFeedback}
                </div>
              )}
            </div>

            {/* A4 Editable Document Sheet */}
            <div className="rounded-xl bg-white border border-slate-200 p-8 sm:p-12 min-h-[640px] shadow-xs">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setEditorHtml((e.target as HTMLDivElement).innerHTML)}
                dangerouslySetInnerHTML={{ __html: editorHtml }}
                className="prose prose-slate max-w-none focus:outline-none min-h-[560px] text-slate-900 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES LIBRARY */}
      {hasPremiumAccess && activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              {(['ALL', 'CV', 'Lettres', 'Rapports', 'Documents'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    templateFilter === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'ALL' ? 'Tous les modèles (19)' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">
                    <span>{tpl.category}</span>
                    <span className="mx-1.5">·</span>
                    <span>{tpl.subCategory}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{tpl.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{tpl.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => loadTemplateIntoEditor(tpl)}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Personnaliser dans l’éditeur
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE IT TRAINER */}
      {hasPremiumAccess && activeTab === 'trainer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Curriculum List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Parcours Formateur Informatique</h3>
            {IT_TRAINING_MODULES.map((mod) => {
              const prog = trainingProgress.find((p) => p.moduleId === mod.id);
              const isSelected = selectedModule.id === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setSelectedModule(mod);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                    <span>{mod.category}</span>
                    <span className="font-mono">{mod.duration}</span>
                  </div>
                  <p className="text-sm font-bold">{mod.title}</p>
                  {prog && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Score enregistré : {prog.score}%</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Module Lesson, Exercise & Quiz */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="text-xs text-slate-500">
                  <span>{selectedModule.category}</span>
                  <span className="mx-1.5">·</span>
                  <span>Niveau {selectedModule.level}</span>
                  <span className="mx-1.5">·</span>
                  <span>Durée estimée {selectedModule.duration}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedModule.title}</h2>
                <p className="text-sm text-slate-600 mt-1">{selectedModule.summary}</p>
              </div>

              {/* Lessons */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Notions essentielles du module</span>
                </h3>
                {selectedModule.lessons.map((lesson, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900">{lesson.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{lesson.content}</p>
                  </div>
                ))}
              </div>

              {/* Practical Exercise */}
              <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 space-y-1.5">
                <p className="text-xs font-bold text-sky-950 uppercase">Exercice pratique recommandé</p>
                <p className="text-xs sm:text-sm text-sky-900">{selectedModule.practicalExercise}</p>
              </div>

              {/* Interactive Quiz */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  Quiz de validation des acquis ({selectedModule.quiz.length} questions)
                </h3>
                {selectedModule.quiz.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-lg border border-slate-200 space-y-2.5">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const selected = quizAnswers[qIdx] === optIdx;
                        const isCorrect = q.correctIndex === optIdx;
                        return (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              quizSubmitted
                                ? isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                  : selected
                                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                                  : 'border-slate-200 text-slate-600'
                                : selected
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`quiz-${qIdx}`}
                              checked={selected}
                              disabled={quizSubmitted}
                              onChange={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                              className="sr-only"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                    {quizSubmitted && (
                      <p className="text-xs text-slate-600 pt-1">
                        <strong>Explication :</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  {quizSubmitted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      Recommencer le quiz
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingProgress || Object.keys(quizAnswers).length < selectedModule.quiz.length}
                      onClick={handleQuizSubmit}
                      className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      {savingProgress ? 'Enregistrement du score...' : 'Valider mes réponses et enregistrer ma progression'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI ASSISTANT (Server-Side Gemini API) */}
      {hasPremiumAccess && activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Cas d’utilisation Assistant IA</h3>
              <p className="text-xs text-slate-600">
                Connecté de manière sécurisée côté serveur, l’Assistant IA BUNO Tech vous accompagne dans vos tâches rédactionnelles et techniques.
              </p>
              <div className="space-y-1.5">
                {[
                  'Rédaction professionnelle',
                  'Correction & amélioration de texte',
                  'Résumé de document ou rapport',
                  'Explication & apprentissage informatique',
                  'Préparation de rapport d’activité',
                  'Rédaction de lettre administrative / motivation',
                  'Optimisation de CV',
                  'Idées de projets & transformation numérique',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAiCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      aiCategory === cat ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col rounded-xl bg-white border border-slate-200 overflow-hidden min-h-[540px]">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold">Assistant IA BUNO Tech — Mode : {aiCategory}</span>
              </div>
              {aiMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAiMessages([])}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Effacer la conversation
                </button>
              )}
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
              {aiMessages.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-500">
                  <p className="text-sm font-semibold text-slate-800">
                    Posez votre question ou décrivez le document à rédiger
                  </p>
                  <p className="text-xs max-w-md mx-auto">
                    Exemple : « Rédige une lettre administrative adressée au Directeur Général pour solliciter un partenariat de formation informatique » ou « Explique-moi comment utiliser la fonction RECHERCHEV dans Excel ».
                  </p>
                </div>
              ) : (
                aiMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl text-xs sm:text-sm space-y-2 ${
                      m.role === 'user'
                        ? 'bg-slate-100 text-slate-900 ml-8'
                        : 'bg-sky-50/70 border border-sky-200 text-slate-900 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>{m.role === 'user' ? 'Vous' : 'Assistant IA BUNO Tech'}</span>
                      {m.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => sendAiResponseToEditor(m.text)}
                          className="text-sky-700 hover:underline cursor-pointer"
                        >
                          Ouvrir dans le Traitement de texte →
                        </button>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-600 animate-pulse">
                  L’Assistant IA BUNO Tech rédige votre réponse...
                </div>
              )}
              {aiError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {aiError}
                </div>
              )}
            </div>

            <form onSubmit={handleSendAiPrompt} className="p-4 border-t border-slate-200 flex gap-2 bg-slate-50">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Votre demande (${aiCategory})...`}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
