export type Language = 'fr' | 'en' | 'sw';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: 'client' | 'admin';
  status: 'active' | 'suspended';
  acceptedTerms: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SiteSettings {
  id: string;
  ownerName: string;
  brandName: string;
  tagline: string;
  positioning: string;
  bioNarrative: string;
  email: string;
  whatsapp: string;
  github: string;
  youtube: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  cvSummary: string;
  cvObjectives: string;
  isPublic: boolean;
  updatedAt?: unknown;
}

export interface ServiceItem {
  id: string;
  title: string;
  iconName: string;
  category: string;
  shortDescription: string;
  includedFeatures: string;
  indicativePrice: string;
  estimatedDelay: string;
  availability: 'available' | 'busy' | 'suspended';
  orderIndex: number;
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PricingRule {
  id: string;
  serviceName: string;
  itemType: string;
  unit: string;
  format: string;
  unitPriceUSD: number;
  unitPriceCDF: number;
  validityPeriod: string;
  conditions: string;
  available: boolean;
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  completionDate: string;
  clientName: string;
  imageUrl: string;
  demoUrl: string;
  attachmentName: string;
  allowDownload: boolean;
  technologies: string;
  status: 'published' | 'draft' | 'archived';
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PartnerItem {
  id: string;
  name: string;
  logoText: string;
  description: string;
  category: 'ONG' | 'Entreprises' | 'Particuliers' | 'Institutions' | 'Associations' | 'Autres';
  websiteUrl: string;
  contactInfo: string;
  projectCompleted: string;
  status: 'active' | 'inactive';
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TestimonialItem {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  organization: string;
  content: string;
  serviceConcerned: string;
  status: 'pending' | 'published' | 'rejected';
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ServiceRequestStatus =
  | 'draft'
  | 'submitted'
  | 'reviewing'
  | 'info_needed'
  | 'quoted'
  | 'waiting_client'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceRequest {
  id: string;
  referenceCode: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceId: string;
  serviceTitle: string;
  description: string;
  priority: 'Normale' | 'Haute' | 'Urgente';
  desiredDeadline: string;
  indicativeBudget: string;
  attachmentName: string;
  comments: string;
  status: ServiceRequestStatus;
  adminNotes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuoteLineItemInput {
  lineNumber: number;
  description: string;
  itemType: string;
  quantity: number;
  format: string;
  unitPrice: number;
  totalPrice: number;
}

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'discount_requested'
  | 'discount_approved'
  | 'discount_rejected'
  | 'accepted'
  | 'rejected'
  | 'expired';

export interface QuoteDocument {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  currency: 'USD' | 'CDF';
  itemsSummary: string; // JSON or structured lines summary
  itemsCount: number;
  initialSubtotal: number;
  discountRequestedAmount: number;
  discountJustification: string;
  discountGrantedAmount: number;
  finalTotal: number;
  decisionAuthor: string;
  validityDays: number;
  conditions: string;
  status: QuoteStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  durationLabel: string;
  durationDays: number;
  priceUSD: number;
  priceCDF: number;
  features: string;
  status: 'active' | 'suspended';
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended';

export interface ClientSubscription {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  planId: string;
  planName: string;
  pricePaid: number;
  currency: 'USD' | 'CDF';
  paymentReference: string;
  status: SubscriptionStatus;
  startDateIso: string;
  endDateIso: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: 'USD' | 'CDF';
  method: string;
  reference: string;
  targetType: 'subscription' | 'quote' | 'service';
  targetId: string;
  status: 'pending_verification' | 'confirmed' | 'rejected';
  verifiedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  category: 'CV' | 'Lettres' | 'Rapports' | 'Documents';
  subCategory: string;
  description: string;
  defaultContentHtml: string;
  isPublic: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClientDocument {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  contentHtml: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TrainingProgress {
  id: string;
  userId: string;
  moduleId: string;
  moduleTitle: string;
  score: number;
  status: 'in_progress' | 'completed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DirectMessage {
  id: string;
  threadClientId: string;
  threadClientName: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'admin';
  content: string;
  attachmentName: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedId: string;
  isRead: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt?: unknown;
}
