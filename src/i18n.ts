import { Language } from './types';

export const TRANSLATIONS: Record<
  Language,
  {
    navHome: string;
    navServices: string;
    navAbout: string;
    navPortfolio: string;
    navPartners: string;
    navTestimonials: string;
    navContact: string;
    navQuoteCalc: string;
    navPremium: string;
    navClientSpace: string;
    navAdminSpace: string;
    ctaRequestService: string;
    ctaRequestQuote: string;
    ctaCreateAccount: string;
    ctaSignIn: string;
    ctaSignOut: string;
    heroSubtitle: string;
    heroValueProp: string;
  }
> = {
  fr: {
    navHome: 'Accueil',
    navServices: 'Services',
    navAbout: 'À propos',
    navPartners: 'Partenaires',
    navPortfolio: 'Réalisations',
    navTestimonials: 'Témoignages',
    navContact: 'Contact',
    navQuoteCalc: 'Devis',
    navPremium: 'Premium',
    navClientSpace: 'Espace client',
    navAdminSpace: 'Administration',
    ctaRequestService: 'Demander un service',
    ctaRequestQuote: 'Demander un devis',
    ctaCreateAccount: 'Créer mon compte client',
    ctaSignIn: 'Connexion',
    ctaSignOut: 'Déconnexion',
    heroSubtitle: 'Building New Opportunities through Technology',
    heroValueProp:
      'Conception et développement de solutions informatiques adaptées aux particuliers, entreprises, ONG et institutions.',
  },
  en: {
    navHome: 'Home',
    navServices: 'Services',
    navAbout: 'About & CV',
    navPortfolio: 'Portfolio',
    navPartners: 'Partners',
    navTestimonials: 'Testimonials',
    navContact: 'Contact',
    navQuoteCalc: 'Quote Calculator',
    navPremium: 'Premium',
    navClientSpace: 'Client Portal',
    navAdminSpace: 'Admin Console',
    ctaRequestService: 'Request a Service',
    ctaRequestQuote: 'Get a Quote',
    ctaCreateAccount: 'Create Client Account',
    ctaSignIn: 'Sign In',
    ctaSignOut: 'Sign Out',
    heroSubtitle: 'Self-taught computer scientist, software developer, trainer, and digital solutions consultant.',
    heroValueProp:
      'Building practical, accessible technology solutions tailored to the real needs of individuals, professionals, NGOs, and enterprises.',
  },
  sw: {
    navHome: 'Mwanzo',
    navServices: 'Huduma',
    navAbout: 'Kuhusu & CV',
    navPortfolio: 'Kazi Zetu',
    navPartners: 'Washirika',
    navTestimonials: 'Ushuhuda',
    navContact: 'Mawasiliano',
    navQuoteCalc: 'Makadirio ya Bei',
    navPremium: 'Premium',
    navClientSpace: 'Akaunti ya Mteja',
    navAdminSpace: 'Utawala',
    ctaRequestService: 'Omba Huduma',
    ctaRequestQuote: 'Omba Makadirio',
    ctaCreateAccount: 'Fungua Akaunti ya Mteja',
    ctaSignIn: 'Ingia',
    ctaSignOut: 'Toka',
    heroSubtitle: 'Mtaalamu wa kompyuta, msanidi programu, mkufunzi na mshauri wa suluhisho za kidijitali.',
    heroValueProp:
      'Kuunda suluhisho za kiteknolojia zenye manufaa, zinazofikika na zinazoendana na mahitaji halisi ya watu binafsi, wataalamu, NGOs na makampuni.',
  },
};
