import React, { useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  Calculator,
  MessageCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface FAQItem {
  id: string;
  category: 'tarifs' | 'delais' | 'support' | 'general';
  categoryLabel: string;
  question: string;
  answer: string;
  points?: string[];
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'tarifs-calculation',
    category: 'tarifs',
    categoryLabel: 'Tarifs & Devis',
    question: 'Comment sont fixés les tarifs de BUNO Tech et comment obtenir une estimation ?',
    answer:
      'Nos tarifs sont transparents, compétitifs et adaptés au contexte économique de la RDC. Chaque devis est établi sur mesure en fonction de l’ampleur du travail, des technologies requises et du niveau d’urgence.',
    points: [
      'Calculateur de devis instantané en ligne avec conversion automatique USD / Francs Congolais (CDF).',
      'Devis estimatif immédiat et sans engagement directement téléchargeable en PDF officiel.',
      'Acomptes modulables avec facilités de règlement pour les entreprises et ONG partenaires.',
      'Possibilité de négocier et d’adapter le périmètre technique directement avec l’administrateur.',
    ],
  },
  {
    id: 'delais-livraison',
    category: 'delais',
    categoryLabel: 'Délais de Livraison',
    question: 'Quels sont les délais habituels de réalisation et de livraison des projets ?',
    answer:
      'Nous appliquons une méthodologie rigoureuse en 6 étapes permettant de respecter scrupuleusement les plannings convenus avec nos clients. Les délais types sont les suivants :',
    points: [
      'Documents bureautiques & saisies techniques : 24 à 72 heures ouvrées.',
      'Outils de collecte mobile (ODK / KoboToolbox) & formulaires : 2 à 5 jours ouvrés.',
      'Applications web, PWA & bases de données légères : 1 à 3 semaines.',
      'Plateformes complètes d’entreprise (comme Ets AMANI) : 3 à 8 semaines avec livraisons intermédiaires par jalons validés.',
      'Option de traitement express disponible pour les besoins urgents.',
    ],
  },
  {
    id: 'support-maintenance',
    category: 'support',
    categoryLabel: 'Processus de Support',
    question: 'Comment fonctionne l’assistance technique et le support après la livraison ?',
    answer:
      'Chez BUNO Tech, la livraison n’est pas la fin de notre mission : nous accompagnons l’adoption réelle et assurons la pérennité de chaque solution.',
    points: [
      'Garantie de bon fonctionnement avec correction gratuite des anomalies éventuelles.',
      'Assistance réactive en direct par WhatsApp officiel (+243 992 294 852) et email.',
      'Fil de discussion interactif et suivi des requêtes intégré dans votre Espace Client.',
      'Contrats de maintenance préventive et corrective pour les parcs informatiques et logiciels d’entreprise.',
      'Sauvegardes régulières et assistance au déploiement sur serveurs locaux ou cloud.',
    ],
  },
  {
    id: 'modalites-paiement',
    category: 'tarifs',
    categoryLabel: 'Tarifs & Devis',
    question: 'Quels modes de paiement sont acceptés pour régler les prestations ?',
    answer:
      'Pour simplifier vos transactions que vous soyez à Goma, en province ou à l’international, nous acceptons les moyens de paiement les plus fiables :',
    points: [
      'Mobile Money en RDC : M-Pesa (Vodacom), Airtel Money, Orange Money.',
      'Virements bancaires et dépôts directs (comptes en USD ou CDF).',
      'Règlement en espèces contre reçu physique et facture électronique certifiée.',
      'Abonnements BUNO Tech Premium payables en 1 jour, 1 mois, 6 mois, 1 an ou 3 ans.',
    ],
  },
  {
    id: 'formation-transfert',
    category: 'support',
    categoryLabel: 'Processus de Support',
    question: 'Fournissez-vous une formation et un guide pour la prise en main des outils ?',
    answer:
      'Oui, le transfert de compétences fait partie intégrante de nos valeurs d’accessibilité et de responsabilité.',
    points: [
      'Remise d’un manuel d’utilisation clair ou d’une documentation technique structurée.',
      'Séances de formation pratique pour vos équipes, en présentiel à Goma ou en visioconférence.',
      'Vidéos démonstratives personnalisées et tutoriels dédiés aux fonctionnalités clés.',
      'Accès aux modules du Formateur Informatique BUNO Tech pour l’apprentissage continu.',
    ],
  },
  {
    id: 'suivi-commande',
    category: 'delais',
    categoryLabel: 'Délais de Livraison',
    question: 'Comment puis-je suivre en temps réel l’évolution de ma commande ?',
    answer:
      'Notre plateforme intègre une traçabilité totale respectant l’état réel du système :',
    points: [
      'Tableau de bord personnalisé dans votre Espace Client dès la création de votre compte.',
      'Statuts transparents et vérifiables : « Demande soumise », « Analyse en cours », « Devis validé », « Réalisation en cours », « Livré ».',
      'Notifications et alertes d’étape avec possibilité d’échanger des pièces jointes et messages.',
    ],
  },
];

interface FAQSectionProps {
  onOpenQuoteCalculator?: () => void;
  onOpenContact?: () => void;
  whatsappNumber?: string;
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  onOpenQuoteCalculator,
  onOpenContact,
  whatsappNumber = '+243992294852',
}) => {
  const [openId, setOpenId] = useState<string | null>('tarifs-calculation');
  const [activeCategory, setActiveCategory] = useState<'all' | 'tarifs' | 'delais' | 'support'>('all');

  const filteredFaqs =
    activeCategory === 'all'
      ? FAQ_DATA
      : FAQ_DATA.filter((item) => item.category === activeCategory);

  const toggleAccordion = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8" id="faq-section">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Foire Aux Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
            Questions Fréquentes sur nos Services
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Toutes les réponses claires sur nos tarifs, nos délais de livraison respectés et notre accompagnement support technique.
          </p>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Toutes ({FAQ_DATA.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('tarifs')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeCategory === 'tarifs'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-3 h-3" />
            <span>Tarifs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('delais')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeCategory === 'delais'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Délais</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('support')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeCategory === 'support'
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Support</span>
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-white border-sky-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Accordion Trigger Button */}
              <button
                type="button"
                onClick={() => toggleAccordion(faq.id)}
                aria-expanded={isOpen}
                className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer focus:outline-none"
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        faq.category === 'tarifs'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : faq.category === 'delais'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {faq.categoryLabel}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {faq.question}
                  </h3>
                </div>

                <div
                  className={`p-1.5 rounded-lg transition-transform duration-200 shrink-0 ${
                    isOpen ? 'bg-sky-100 text-sky-700 rotate-180' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {/* Accordion Content */}
              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-1 text-slate-700 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 font-medium">
                    {faq.answer}
                  </p>

                  {faq.points && faq.points.length > 0 && (
                    <ul className="space-y-2 pt-1 text-xs sm:text-sm text-slate-600">
                      {faq.points.map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helpful Interactive CTAs below FAQ */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900">Vous avez un projet particulier ou une question non listée ?</p>
          <p className="text-xs text-slate-600">
            Nous répondons généralement sous quelques minutes via WhatsApp ou via notre formulaire de contact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenQuoteCalculator && (
            <button
              type="button"
              onClick={onOpenQuoteCalculator}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Simuler un devis</span>
            </button>
          )}

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              'Bonjour BUNO Tech, j’aimerais me renseigner sur vos tarifs et services informatiques.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Discuter sur WhatsApp</span>
          </a>

          {onOpenContact && (
            <button
              type="button"
              onClick={onOpenContact}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              <span>Écrire à BUNO Tech</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export const FAQAccordion = FAQSection;
export default FAQAccordion;
