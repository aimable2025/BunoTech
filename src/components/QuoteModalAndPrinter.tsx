import React, { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, FileText, Percent, Printer, Share2, X, XCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { createSystemNotification, writeAuditLog } from '../data/initialCatalog';
import { QuoteDocument, QuoteLineItemInput, SiteSettings } from '../types';

interface QuoteModalProps {
  quote: QuoteDocument;
  settings: SiteSettings;
  currentUserUid?: string;
  currentUserEmail?: string;
  isAdminView?: boolean;
  onClose: () => void;
}

export const QuoteModalAndPrinter: React.FC<QuoteModalProps> = ({
  quote,
  settings,
  currentUserUid,
  currentUserEmail,
  isAdminView = false,
  onClose,
}) => {
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountInput, setDiscountInput] = useState<string>(
    quote.discountRequestedAmount > 0 ? String(quote.discountRequestedAmount) : ''
  );
  const [justification, setJustification] = useState(quote.discountJustification || '');
  const [adminGrantInput, setAdminGrantInput] = useState<string>(
    quote.discountRequestedAmount > 0 ? String(quote.discountRequestedAmount) : String(quote.discountGrantedAmount || 0)
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  let parsedItems: QuoteLineItemInput[] = [];
  try {
    const raw = JSON.parse(quote.itemsSummary);
    if (Array.isArray(raw)) {
      parsedItems = raw;
    }
  } catch {
    parsedItems = [];
  }

  const formatAmount = (val: number) => {
    if (quote.currency === 'USD') {
      return `$${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${val.toLocaleString('fr-FR')} CDF`;
  };

  const canClientNegotiate =
    !isAdminView &&
    currentUserUid === quote.clientId &&
    quote.status !== 'accepted' &&
    quote.status !== 'rejected' &&
    quote.status !== 'expired';

  const handleClientAccept = async () => {
    if (!currentUserUid || !currentUserEmail) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'quotes', quote.id), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });
      await createSystemNotification(
        'ADMIN',
        'quote_accepted',
        `Devis ${quote.quoteNumber} accepté`,
        `Le client ${quote.clientName} a validé et accepté le devis ${quote.quoteNumber} (${formatAmount(quote.finalTotal)}).`,
        quote.id
      );
      await writeAuditLog(
        currentUserUid,
        currentUserEmail,
        'QUOTE_ACCEPTED_BY_CLIENT',
        'quote',
        quote.id,
        `Devis ${quote.quoteNumber} accepté par le client pour un total final de ${formatAmount(quote.finalTotal)}.`
      );
      setFeedback('Devis accepté et validé avec succès. L’administrateur a été notifié.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${quote.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientReject = async () => {
    if (!currentUserUid || !currentUserEmail) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'quotes', quote.id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      await createSystemNotification(
        'ADMIN',
        'quote_rejected',
        `Devis ${quote.quoteNumber} décliné`,
        `Le client ${quote.clientName} a décliné le devis ${quote.quoteNumber}.`,
        quote.id
      );
      await writeAuditLog(
        currentUserUid,
        currentUserEmail,
        'QUOTE_REJECTED_BY_CLIENT',
        'quote',
        quote.id,
        `Devis ${quote.quoteNumber} refusé par le client.`
      );
      setFeedback('Le statut du devis a été mis à jour (Refusé).');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${quote.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientRequestDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserUid || !currentUserEmail) return;
    const requestedAmount = Number(discountInput);
    if (isNaN(requestedAmount) || requestedAmount <= 0 || requestedAmount >= quote.initialSubtotal) {
      setFeedback('Veuillez saisir un montant de réduction valide inférieur au sous-total initial.');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'quotes', quote.id), {
        discountRequestedAmount: requestedAmount,
        discountJustification: justification.trim().slice(0, 950),
        status: 'discount_requested',
        updatedAt: serverTimestamp(),
      });
      await createSystemNotification(
        'ADMIN',
        'discount_requested',
        `Demande de réduction sur ${quote.quoteNumber}`,
        `${quote.clientName} sollicite une remise de ${formatAmount(requestedAmount)} sur le devis ${quote.quoteNumber}.`,
        quote.id
      );
      await writeAuditLog(
        currentUserUid,
        currentUserEmail,
        'QUOTE_DISCOUNT_REQUESTED',
        'quote',
        quote.id,
        `Réduction demandée : ${formatAmount(requestedAmount)} sur montant initial ${formatAmount(quote.initialSubtotal)}. Justification : ${justification.trim() || 'Non spécifiée'}`
      );
      setShowDiscountForm(false);
      setFeedback('Votre demande de réduction a été enregistrée et transmise à l’administrateur.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${quote.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminGrantDiscount = async () => {
    if (!currentUserUid || !currentUserEmail) return;
    const granted = Number(adminGrantInput);
    if (isNaN(granted) || granted < 0 || granted > quote.initialSubtotal) {
      setFeedback('Montant de réduction accordé invalide.');
      return;
    }
    const newTotal = Math.max(0, Number((quote.initialSubtotal - granted).toFixed(2)));
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'quotes', quote.id), {
        discountGrantedAmount: granted,
        finalTotal: newTotal,
        decisionAuthor: `${settings.ownerName} (${currentUserEmail})`.slice(0, 140),
        status: 'discount_approved',
        validityDays: quote.validityDays,
        conditions: quote.conditions,
        updatedAt: serverTimestamp(),
      });
      await createSystemNotification(
        quote.clientId,
        'discount_approved',
        `Réduction accordée sur votre devis ${quote.quoteNumber}`,
        `BUNO Tech a accordé une réduction de ${formatAmount(granted)}. Nouveau total : ${formatAmount(newTotal)}.`,
        quote.id
      );
      await writeAuditLog(
        currentUserUid,
        currentUserEmail,
        'QUOTE_DISCOUNT_APPROVED',
        'quote',
        quote.id,
        `Montant initial: ${formatAmount(quote.initialSubtotal)} | Réduction demandée: ${formatAmount(quote.discountRequestedAmount)} | Réduction accordée: ${formatAmount(granted)} | Nouveau total: ${formatAmount(newTotal)}`
      );
      setFeedback(`Réduction de ${formatAmount(granted)} accordée. Nouveau total enregistré : ${formatAmount(newTotal)}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${quote.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminRefuseDiscount = async () => {
    if (!currentUserUid || !currentUserEmail) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'quotes', quote.id), {
        discountGrantedAmount: 0,
        finalTotal: quote.initialSubtotal,
        decisionAuthor: `${settings.ownerName} (${currentUserEmail})`.slice(0, 140),
        status: 'discount_rejected',
        validityDays: quote.validityDays,
        conditions: quote.conditions,
        updatedAt: serverTimestamp(),
      });
      await createSystemNotification(
        quote.clientId,
        'discount_rejected',
        `Décision sur votre devis ${quote.quoteNumber}`,
        `La demande de réduction sur le devis ${quote.quoteNumber} n'a pas pu être retenue. Le montant initial de ${formatAmount(quote.initialSubtotal)} est maintenu.`,
        quote.id
      );
      await writeAuditLog(
        currentUserUid,
        currentUserEmail,
        'QUOTE_DISCOUNT_REJECTED',
        'quote',
        quote.id,
        `Réduction refusée sur le devis ${quote.quoteNumber}. Montant initial conservé : ${formatAmount(quote.initialSubtotal)}.`
      );
      setFeedback('Demande de réduction refusée. Le montant initial est conservé et le client est notifié.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `quotes/${quote.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareText = `Devis BUNO Tech ${quote.quoteNumber} — Client: ${quote.clientName} — Total: ${formatAmount(quote.finalTotal)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Devis ${quote.quoteNumber} — BUNO Tech`,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} | ${window.location.href}`);
      setFeedback('Référence du devis copiée dans le presse-papiers.');
    }
  };

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyé / Calculé',
    viewed: 'Consulté',
    discount_requested: 'Réduction demandée',
    discount_approved: 'Réduction accordée',
    discount_rejected: 'Réduction refusée (Montant initial maintenu)',
    accepted: 'Accepté et validé par le client',
    rejected: 'Refusé par le client',
    expired: 'Expiré',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-xl bg-white border border-slate-200 my-8 overflow-hidden">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-6 py-4 text-white no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-sky-400" />
            <span className="font-mono text-sm font-semibold">{quote.quoteNumber}</span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-300">{statusLabels[quote.status] || quote.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Partager</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Quote Document */}
        <div className="p-6 sm:p-10 space-y-8 bg-white text-slate-900">
          {/* Header Identity */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs font-semibold tracking-wider text-sky-700 uppercase">
                {settings.brandName} — Solutions Numériques
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{settings.ownerName}</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-md">{settings.tagline}</p>
              <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                <p>Email : {settings.email}</p>
                <p>WhatsApp / Tél : {settings.whatsapp}</p>
                <p>GitHub : {settings.github}</p>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase">DOCUMENT DE DEVIS OFFICIEL</p>
              <p className="text-xl font-bold font-mono text-slate-900">{quote.quoteNumber}</p>
              <p className="text-xs text-slate-600">
                Statut : <strong className="text-slate-900">{statusLabels[quote.status] || quote.status}</strong>
              </p>
              <p className="text-xs text-slate-600">Validité : {quote.validityDays} jours</p>
              <div className="pt-2 mt-2 border-t border-slate-100 text-xs">
                <p className="font-semibold text-slate-900">Client : {quote.clientName}</p>
                <p className="text-slate-600">{quote.clientEmail}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-xs font-semibold text-slate-700">
                  <th className="py-3 px-2 w-12">N°</th>
                  <th className="py-3 px-3">Description / Service</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3 text-right">Quantité</th>
                  <th className="py-3 px-3 text-right">Prix unitaire</th>
                  <th className="py-3 px-3 text-right">Prix total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {parsedItems.map((line, index) => (
                  <tr key={index} className="hover:bg-slate-50/80">
                    <td className="py-3 px-2 font-mono text-xs text-slate-500 tabular-nums">{line.lineNumber || index + 1}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{line.description}</td>
                    <td className="py-3 px-3 text-slate-600">{line.itemType}</td>
                    <td className="py-3 px-3 text-slate-600">{line.format}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{line.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatAmount(line.unitPrice)}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatAmount(line.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary & Audit Trail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-900">Conditions et modalités :</p>
              <p>{quote.conditions}</p>
              {quote.discountRequestedAmount > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-semibold text-slate-800">Historique de négociation :</p>
                  <p>Réduction demandée par le client : <span className="font-mono">{formatAmount(quote.discountRequestedAmount)}</span></p>
                  {quote.discountJustification && <p>Motif client : {quote.discountJustification}</p>}
                  {quote.decisionAuthor && (
                    <p>Décision enregistrée par : <strong>{quote.decisionAuthor}</strong></p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm md:pl-8">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Sous-total initial :</span>
                <span className="font-mono tabular-nums">{formatAmount(quote.initialSubtotal)}</span>
              </div>
              {quote.discountRequestedAmount > 0 && (
                <div className="flex justify-between py-1 text-amber-700 text-xs">
                  <span>Réduction sollicitée :</span>
                  <span className="font-mono tabular-nums">- {formatAmount(quote.discountRequestedAmount)}</span>
                </div>
              )}
              {quote.discountGrantedAmount > 0 && (
                <div className="flex justify-between py-1 text-emerald-700 font-medium">
                  <span>Réduction accordée :</span>
                  <span className="font-mono tabular-nums">- {formatAmount(quote.discountGrantedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-slate-900 text-base font-bold text-slate-900">
                <span>TOTAL FINAL DU DEVIS :</span>
                <span className="font-mono tabular-nums">{formatAmount(quote.finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 text-xs font-medium text-sky-900 no-print">
              {feedback}
            </div>
          )}

          {/* Client Interactive Negotiation / Validation Controls */}
          {canClientNegotiate && (
            <div className="pt-6 border-t border-slate-200 space-y-4 no-print">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700">
                  Décision du client sur ce devis :
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleClientAccept}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Accepter ce devis ({formatAmount(quote.finalTotal)})</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowDiscountForm(!showDiscountForm)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Percent className="w-4 h-4 text-sky-600" />
                    <span>Demander une réduction</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleClientReject}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Décliner</span>
                  </button>
                </div>
              </div>

              {showDiscountForm && (
                <form onSubmit={handleClientRequestDiscount} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Formuler une demande de réduction</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Montant de réduction souhaité ({quote.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max={quote.initialSubtotal}
                        required
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        placeholder={`Ex: ${Math.round(quote.initialSubtotal * 0.1)}`}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Justification (facultative)
                      </label>
                      <input
                        type="text"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Ex: Volume de commande, budget ONG..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDiscountForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      Envoyer la demande à l’administrateur
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Admin Negotiation Decision Panel */}
          {isAdminView && (
            <div className="pt-6 border-t border-slate-200 bg-slate-50 p-4 rounded-lg space-y-3 no-print">
              <h4 className="text-xs font-bold text-slate-900">
                Décision Administrateur — Gestion de la réduction et validation
              </h4>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Montant de la réduction à accorder ({quote.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={quote.initialSubtotal}
                    value={adminGrantInput}
                    onChange={(e) => setAdminGrantInput(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono w-44"
                  />
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAdminGrantDiscount}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Accorder la réduction
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAdminRefuseDiscount}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 cursor-pointer"
                >
                  Refuser la réduction (Conserver {formatAmount(quote.initialSubtotal)})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
