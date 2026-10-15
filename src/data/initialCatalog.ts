import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, generateId, handleFirestoreError, OperationType } from '../firebase';
import {
  DocumentTemplate,
  PartnerItem,
  PortfolioProject,
  PricingRule,
  ServiceItem,
  SiteSettings,
  SubscriptionPlan,
} from '../types';

export const HERO_STUDIO_IMAGE = '/src/assets/images/hero_buno_tech_studio_1790870861568.jpg';
export const PORTFOLIO_ERP_IMAGE = '/src/assets/images/portfolio_enterprise_erp_1790870874764.jpg';
export const PORTFOLIO_MOBILE_IMAGE = '/src/assets/images/portfolio_mobile_app_1790870887019.jpg';
export const PORTFOLIO_TRAINING_IMAGE = '/src/assets/images/portfolio_it_training_1790870897885.jpg';

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  id: 'main',
  ownerName: 'Aimable Maombi Bunoti',
  brandName: 'BUNO Tech',
  tagline: 'Building New Opportunities through Technology',
  positioning:
    'Entreprise de prestations de services informatiques, de développement logiciel et de solutions numériques · Goma, République démocratique du Congo',
  bioNarrative:
    "Informaticien polyvalent et autodidacte basé à Goma (RDC), je développe progressivement mon expertise par la curiosité, la lecture, l'apprentissage, la formation et surtout la pratique.\n\nMon parcours combine informatique, développement logiciel, support technique, bureautique, collecte et traitement de données, formation et gestion opérationnelle.\n\nJ'interviens notamment dans la conception et l'amélioration de solutions numériques destinées à répondre à des besoins réels : applications web et mobiles, outils de gestion, automatisation de tâches, traitement de données, outils bureautiques, collecte numérique et accompagnement informatique.\n\nMon approche consiste à comprendre le problème avant de choisir la technologie, puis à construire des solutions simples, utiles, maintenables et adaptées au contexte réel des utilisateurs.",
  email: 'aimablebunotech@gmail.com',
  whatsapp: '+243 992 294 852',
  github: 'https://github.com/Aimable2025',
  youtube: 'https://www.youtube.com/@AimableBunoTech',
  facebook: 'Buno Tech',
  linkedin: 'https://www.linkedin.com/in/aimable-maombi-b34a22277',
  twitter: 'https://x.com/BunoTech',
  cvSummary:
    'Informaticien polyvalent | Développeur & Concepteur de solutions numériques | Formateur informatique | Support & Systèmes d’information — Goma, RDC',
  cvObjectives:
    'Transformer les besoins réels des personnes, entreprises et organisations en solutions numériques accessibles, utiles et évolutives selon une démarche structurée : Comprendre → Analyser → Concevoir → Construire → Tester → Améliorer.',
  isPublic: true,
};

export interface WorkExperienceItem {
  id: string;
  period: string;
  title: string;
  organization: string;
  location: string;
  statusText?: string;
  responsibilities: string[];
  isFlagship?: boolean;
}

export const REAL_WORK_EXPERIENCES: WorkExperienceItem[] = [
  {
    id: 'exp_dev_freelance',
    period: 'En cours',
    title: 'Informaticien polyvalent & Développeur',
    organization: 'Activités professionnelles et projets personnels',
    location: 'Goma, RDC',
    statusText: 'En activité',
    responsibilities: [
      'Conception et développement de solutions numériques répondant à des besoins professionnels réels.',
      'Développement d’applications web et mobiles avec des technologies modernes.',
      'Conception d’interfaces utilisateur et de systèmes de gestion.',
      'Exploration et intégration de solutions d’automatisation et d’intelligence artificielle.',
      'Gestion de bases de données et de données applicatives.',
      'Utilisation de Git/GitHub pour la gestion collaborative des projets.',
      'Maintenance, amélioration et résolution de problèmes techniques.',
      'Conception d’outils destinés à simplifier et numériser les processus de travail.',
    ],
  },
  {
    id: 'exp_amani_platform',
    period: 'En cours',
    title: 'Concepteur & Développeur — Projet Technologique Principal',
    organization: 'Ets AMANI',
    location: 'Goma / Beni, RDC',
    statusText: 'Projet Phare',
    isFlagship: true,
    responsibilities: [
      'Conception de la plateforme de supervision, gestion opérationnelle et contrôle interne.',
      'Architecture orientée production : gestion des utilisateurs et des rôles (RBAC).',
      'Suivi des transactions opérationnelles et génération de rapports.',
      'Fonctionnement offline-first avec base de données locale (Dexie / IndexedDB) et synchronisation cloud (Firestore).',
      'Déploiement en Progressive Web App (PWA) et préparation Android hybride avec Capacitor.',
      'Système de notifications et traçabilité rigoureuse des opérations.',
    ],
  },
  {
    id: 'exp_apv_it',
    period: 'Depuis 2025',
    title: 'Informaticien & Formateur informatique',
    organization: 'APV asbl',
    location: 'Goma, RDC',
    responsibilities: [
      'Support informatique aux utilisateurs et dépannage matériel/logiciel.',
      'Maintenance préventive des équipements informatiques.',
      'Assistance approfondie sur les logiciels bureautiques.',
      'Accompagnement des utilisateurs dans l’appropriation des outils numériques.',
      'Contribution active à la numérisation et à l’organisation des données.',
      'Animation de formations pratiques en informatique et bureautique.',
      'Optimisation des processus de travail grâce aux outils numériques.',
    ],
  },
  {
    id: 'exp_amani_liquidity',
    period: 'Depuis 2026',
    title: 'Agent d’approvisionnement en liquidités',
    organization: 'Ets AMANI',
    location: 'Beni / Goma, RDC',
    responsibilities: [
      'Gestion opérationnelle des approvisionnements en liquidités.',
      'Suivi rigoureux des flux et opérations entre différentes villes.',
      'Production et transmission de rapports d’activité réguliers.',
      'Utilisation d’outils numériques pour le suivi et la traçabilité des opérations.',
      'Participation au contrôle interne et à la sécurisation des transactions.',
    ],
  },
  {
    id: 'exp_sabi_compta',
    period: '2023 – 2025',
    title: 'Comptable',
    organization: 'Ets SABI Faustin',
    location: 'Goma, RDC',
    responsibilities: [
      'Tenue et organisation rigoureuse des documents comptables.',
      'Suivi quotidien des opérations financières et de trésorerie.',
      'Classement et archivage des pièces justificatives.',
      'Préparation des rapports financiers et documents de synthèse.',
    ],
  },
  {
    id: 'exp_aedvs_secretaire',
    period: '2022 – 2023',
    title: 'Secrétaire Exécutif',
    organization: 'AEDVS asbl',
    location: 'Goma, RDC',
    responsibilities: [
      'Gestion administrative et archivage documentaire.',
      'Rédaction professionnelle de correspondances officielles et procès-verbaux.',
      'Appui direct à la coordination des activités opérationnelles de l’association.',
    ],
  },
  {
    id: 'exp_forese_formateur',
    period: '2022 – 2023',
    title: 'Formateur en informatique',
    organization: 'Fondation REMY SEGIHOBE (FORESE)',
    location: 'Goma, RDC',
    responsibilities: [
      'Animation de sessions de formation pratique en informatique générale et bureautique.',
      'Préparation des supports de cours et des exercices d’application.',
      'Accompagnement personnalisé et évaluation continue des acquis des apprenants.',
    ],
  },
  {
    id: 'exp_acmi_it',
    period: '2021 – 2022',
    title: 'Informaticien',
    organization: 'ACMI asbl',
    location: 'Goma, RDC',
    responsibilities: [
      'Support technique et maintenance du parc informatique.',
      'Configuration des postes de travail et assistance aux agents.',
      'Appui à la gestion numérique des documents et des données institutionnelles.',
    ],
  },
  {
    id: 'exp_sergio_printing',
    period: '2019 – 2022',
    title: 'Opérateur de saisie & Gestionnaire de documents',
    organization: 'Sergio’s Printing',
    location: 'Goma, RDC',
    responsibilities: [
      'Saisie rapide et traitement de documents administratifs et techniques.',
      'Mise en page professionnelle et préparation avant impression.',
      'Numérisation, organisation et archivage numérique des dossiers clients.',
      'Utilisation avancée des outils bureautiques et infographiques.',
    ],
  },
  {
    id: 'exp_alexis_ops',
    period: '2017 – 2018',
    title: 'Responsable des opérations',
    organization: 'ALEXIS RWAMANYWA',
    location: 'Goma, RDC',
    responsibilities: [
      'Coordination des opérations et activités de terrain.',
      'Supervision logistique et suivi des plannings d’exécution.',
    ],
  },
];

export interface EducationItem {
  period: string;
  title: string;
  institution: string;
  location: string;
  category: 'Academique' | 'Professionnelle';
  description?: string;
}

export const REAL_EDUCATION_ITEMS: EducationItem[] = [
  {
    period: '2013',
    title: 'Diplôme d’État — Option Sociale',
    institution: 'Groupe Scolaire La Réponse',
    location: 'Goma, RDC',
    category: 'Academique',
    description: 'Formation secondaire avec obtention du Diplôme d’État.',
  },
  {
    period: '2023',
    title: 'Formation en Gestion Financière',
    institution: 'Ets AMANI',
    location: 'Goma, RDC',
    category: 'Professionnelle',
    description: 'Gestion budgétaire, trésorerie et traçabilité des opérations de change et liquidités.',
  },
  {
    period: '2023',
    title: 'Traitement et analyse de données statistiques avec SPSS',
    institution: 'RCHA / RDC',
    location: 'Goma, RDC',
    category: 'Professionnelle',
    description: 'Analyse descriptive, encodage d’enquêtes et traitement de données statistiques.',
  },
  {
    period: '2023',
    title: 'Déploiement d’outils de collecte mobile : KoboCollect, ODK & Google Forms',
    institution: 'RCHA / RDC',
    location: 'Goma, RDC',
    category: 'Professionnelle',
    description: 'Conception de formulaires XLSForm, paramétrage serveurs et collecte mobile sur le terrain.',
  },
  {
    period: '2018',
    title: 'Perfectionnement en langue anglaise',
    institution: 'Teach Africa',
    location: 'Goma, RDC',
    category: 'Professionnelle',
    description: 'Communication professionnelle en anglais et terminologie technique.',
  },
];

export const CV_LANGUAGES = [
  { language: 'Français', level: 'Courant / Professionnel' },
  { language: 'Swahili', level: 'Courant' },
  { language: 'Kinyarwanda', level: 'Courant' },
  { language: 'Anglais', level: 'Professionnel' },
  { language: 'Lingala', level: 'Notions' },
];

export interface DetailedSkillCategory {
  category: string;
  icon: string;
  skills: string[];
}

export const DETAILED_SKILLS_CATEGORIES: DetailedSkillCategory[] = [
  {
    category: 'Développement logiciel',
    icon: 'Code2',
    skills: [
      'HTML5 · CSS3 · JavaScript · TypeScript',
      'React · Vite · Tailwind CSS',
      'Python · Algorithmique & Scripts',
      'Git · GitHub (Aimable2025)',
      'Progressive Web Apps (PWA) · Capacitor',
      'Applications web & mobiles · Architecture applicative',
    ],
  },
  {
    category: 'Applications mobiles',
    icon: 'Smartphone',
    skills: [
      'Conception d’applications Android',
      'Applications hybrides avec Capacitor',
      'Approche Offline-First & résilience réseau',
      'Stockage local & synchronisation des données',
      'Interfaces mobiles ergonomiques et réactives',
    ],
  },
  {
    category: 'Données & systèmes',
    icon: 'Database',
    skills: [
      'Firebase (Firestore, Authentication, Security Rules)',
      'IndexedDB & Dexie pour le stockage local',
      'Gestion des données applicatives & schémas',
      'Synchronisation locale / cloud temps réel',
      'Gestion des utilisateurs & contrôle d’accès par rôles (RBAC)',
    ],
  },
  {
    category: 'Collecte et traitement des données',
    icon: 'BarChart3',
    skills: [
      'KoboCollect · ODK Collect · XLSForm',
      'Google Forms & formulaires dynamiques',
      'SPSS (analyses statistiques et encodage)',
      'Microsoft Excel avancé (tableaux croisés, formules)',
      'Organisation, nettoyage et traitement des données',
    ],
  },
  {
    category: 'Informatique & support',
    icon: 'Wrench',
    skills: [
      'Maintenance informatique préventive et curative',
      'Diagnostic matériel et dépannage pannes',
      'Installation et configuration logicielle',
      'Assistance et accompagnement des utilisateurs',
      'Réseaux informatiques & partage de ressources',
      'Gestion et sécurisation des postes de travail',
    ],
  },
  {
    category: 'Bureautique & infographie',
    icon: 'FileText',
    skills: [
      'Microsoft Word (saisie, styles, mise en page officielle)',
      'Microsoft Excel (automatisation, calculs complexes)',
      'Microsoft PowerPoint (présentations professionnelles)',
      'Adobe Photoshop (retouches, visuels, bannières)',
      'Création et traitement de documents administratifs',
    ],
  },
  {
    category: 'IA & automatisation',
    icon: 'Bot',
    skills: [
      'Utilisation avancée des outils d’IA générative',
      'Intégration d’API IA dans les applications web/PWA',
      'Automatisation des tâches répétitives',
      'Conception d’outils numériques assistés par IA',
    ],
  },
];

export const BUNO_TECH_MANIFEST = {
  name: 'BUNO Tech',
  subtitle: 'Building New Opportunities through Technology',
  tagline: 'Entreprise de prestations de services informatiques, de développement logiciel et de solutions numériques',
  location: 'Goma, République démocratique du Congo',
  whatsapp: '+243 992 294 852',
  email: 'aimablebunotech@gmail.com',
  personalEmail: 'aimablebunoti@gmail.com',
  youtube: 'https://www.youtube.com/@AimableBunoTech',
  linkedin: 'https://www.linkedin.com/in/aimable-maombi-b34a22277',
  github: 'https://github.com/Aimable2025',
  
  mission:
    'Accompagner les particuliers, les entreprises et les organisations dans leur évolution numérique grâce à des services informatiques accessibles, des solutions personnalisées et un accompagnement adapté.',
  vision:
    'Devenir un partenaire technologique de référence pour les particuliers, les entreprises et les organisations qui souhaitent améliorer leur fonctionnement, développer leurs activités et saisir de nouvelles opportunités grâce au numérique.',
  
  values: [
    {
      title: 'Utilité',
      description: 'Concevoir des solutions qui répondent à des problèmes concrets du quotidien.',
    },
    {
      title: 'Qualité',
      description: 'Privilégier un travail rigoureux, testé et adapté aux besoins du client.',
    },
    {
      title: 'Accessibilité',
      description: 'Rendre les outils informatiques compréhensibles et utilisables par différents profils d’utilisateurs.',
    },
    {
      title: 'Innovation',
      description: 'Explorer de nouvelles méthodes et technologies modernes pour améliorer les services proposés.',
    },
    {
      title: 'Transparence',
      description: 'Clarifier les prestations, les coûts, les délais et les limites de chaque solution.',
    },
    {
      title: 'Accompagnement',
      description: 'Ne pas se limiter à la livraison d’un produit, mais aider le client à comprendre et à utiliser la solution.',
    },
  ],

  workApproach: [
    {
      stepNumber: '1',
      title: 'Écoute et analyse',
      description: 'Comprendre le problème, les objectifs et les contraintes réelles du client.',
    },
    {
      stepNumber: '2',
      title: 'Proposition',
      description: 'Définir la solution, le périmètre, le coût indicatif et le délai estimé.',
    },
    {
      stepNumber: '3',
      title: 'Conception et réalisation',
      description: 'Développer ou configurer la solution retenue selon les standards modernes.',
    },
    {
      stepNumber: '4',
      title: 'Tests et vérification',
      description: 'Vérifier le fonctionnement sur le terrain et corriger les problèmes identifiés.',
    },
    {
      stepNumber: '5',
      title: 'Livraison',
      description: 'Mettre la solution à disposition du client selon les conditions convenues.',
    },
    {
      stepNumber: '6',
      title: 'Accompagnement',
      description: 'Fournir, selon la prestation, une formation, une assistance ou une maintenance continue.',
    },
  ],

  targetClients: [
    'Particuliers',
    'Entrepreneurs et petites entreprises',
    'PME et commerces',
    'ONG et associations',
    'Institutions publiques et privées',
    'Établissements de formation',
    'Professionnels et prestataires indépendants',
  ],

  professionalApproachMethod: 'Comprendre → Analyser → Concevoir → Construire → Tester → Améliorer',
};

export interface TimelineStep {
  stepNumber: string;
  stage: string;
  title: string;
  description: string;
  keyMilestone: string;
}

export const CAREER_TIMELINE: TimelineStep[] = [
  {
    stepNumber: '01',
    stage: 'Découverte',
    title: 'Curiosité technologique & exploration des systèmes',
    description:
      "Fascination initiale pour le fonctionnement interne des ordinateurs, des systèmes d'exploitation et des logiciels bureautiques.",
    keyMilestone: 'Premiers diagnostics matériels et logiciels',
  },
  {
    stepNumber: '02',
    stage: 'Apprentissage',
    title: 'Lecture intensive & auto-formation structurée',
    description:
      'Étude approfondie de la documentation technique, algorithmique, architecture web, bases de données et réseaux.',
    keyMilestone: 'Maîtrise autodidacte des fondamentaux informatiques',
  },
  {
    stepNumber: '03',
    stage: 'Pratique',
    title: 'Laboratoire personnel & résolution de cas réels',
    description:
      'Pratique quotidienne intensive : automatisation de feuilles de calcul complexes, maintenance informatique et premiers scripts.',
    keyMilestone: 'Déploiement des premiers outils utilitaires locaux',
  },
  {
    stepNumber: '04',
    stage: 'Expérience',
    title: 'Prestations terrain auprès des particuliers, ONG et PME',
    description:
      'Interventions techniques, structuration de données, conception de systèmes de suivi et accompagnement opérationnel.',
    keyMilestone: 'Consolidation de la méthodologie client',
  },
  {
    stepNumber: '05',
    stage: 'Développement',
    title: 'Ingénierie logicielle, Web, Mobile & Cloud',
    description:
      'Création de plateformes web modernes, Progressive Web Apps (PWA), applications mobiles et bases de données sécurisées.',
    keyMilestone: 'Fondation de l’identité professionnelle BUNO Tech',
  },
  {
    stepNumber: '06',
    stage: 'Transmission',
    title: 'Formation informatique & renforcement des capacités',
    description:
      'Conception de programmes pédagogiques pratiques en bureautique avancée, outils collaboratifs, sécurité et programmation.',
    keyMilestone: 'Ateliers entreprises et chaîne éducative AimableBunoTech',
  },
  {
    stepNumber: '07',
    stage: 'Innovation',
    title: 'Intégration IA, SaaS & automatisation intelligente',
    description:
      'Développement de produits numériques intégrant l’intelligence artificielle générative et l’automatisation des processus métiers.',
    keyMilestone: 'Plateforme intégrée BUNO Tech & Services Premium',
  },
];

export const CV_COMPETENCIES = {
  technicalSkills: [
    'Développement Web & Mobile (React, TypeScript, Vite, Tailwind CSS, Python, PWA, Capacitor)',
    'Applications Mobiles Android & Hybrides (Approche Offline-First, Dexie, IndexedDB, Synchronisation)',
    'Données & Cloud (Firebase Auth, Firestore, Architecture Serverless, Schémas relationnels)',
    'Collecte et traitement des données (KoboCollect, ODK Collect, Google Forms, SPSS, Excel avancé)',
    'Maintenance informatique, diagnostic pannes matérielles/logicielles, réseaux & assistance',
    'Bureautique & Traitement documentaire (Word, Excel avancé, PowerPoint, Publisher, Photoshop)',
    'Intelligence Artificielle & Automatisation (Intégration API IA, automatisation des processus métiers)',
  ],
  toolsMastered: [
    'VS Code, Git & GitHub (Aimable2025)',
    'Firebase Console, Google Cloud Platform, Capacitor CLI',
    'Suite Microsoft Office 365, Google Workspace, LibreOffice',
    'KoboCollect, ODK Collect, Google Forms, IBM SPSS Statistics',
    'Environnements Windows 10/11, distributions Linux & outils de dépannage',
  ],
  interventionDomains: [
    'Développement : Conception d’applications web, mobiles et outils logiciels adaptés aux besoins.',
    'Automatisation : Transformation des tâches répétitives en processus numériques rapides.',
    'Gestion : Solutions numériques pour le suivi des opérations, utilisateurs, données et activités.',
    'Formation : Formation pratique en informatique, bureautique et outils numériques.',
    'Support : Maintenance, dépannage, configuration et accompagnement des utilisateurs.',
    'Transformation numérique : Analyse des processus existants et réduction des tâches manuelles.',
  ],
};

// 11 Services Informatiques Officiels de BUNO Tech
export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv_software_dev',
    title: 'Développement de logiciels',
    iconName: 'Code2',
    category: 'Ingénierie Logicielle',
    shortDescription: 'Conception d’applications et d’outils logiciels adaptés aux processus et aux objectifs de chaque client.',
    includedFeatures: 'Analyse du besoin · Architecture modulaire · Base de données sécurisée · Tests complets · Déploiement & formation',
    indicativePrice: 'À partir de $450 ou Sur devis',
    estimatedDelay: '2 à 6 semaines',
    availability: 'available',
    orderIndex: 1,
    isPublic: true,
  },
  {
    id: 'srv_mobile_apps',
    title: 'Applications mobiles',
    iconName: 'Smartphone',
    category: 'Mobile & PWA',
    shortDescription: 'Développement de solutions mobiles (Android, PWA & Hybride) destinées à faciliter l’accès aux services et informations.',
    includedFeatures: 'Approche offline-first · Synchronisation automatique · Interface intuitive · Installation PWA & Android Capacitor',
    indicativePrice: 'À partir de $400 ou Sur devis',
    estimatedDelay: '2 à 5 semaines',
    availability: 'available',
    orderIndex: 2,
    isPublic: true,
  },
  {
    id: 'srv_web_platforms',
    title: 'Sites web et plateformes numériques',
    iconName: 'Globe',
    category: 'Web & Portails',
    shortDescription: 'Création de sites vitrines professionnels, portails web et applications interactives adaptées aux besoins professionnels.',
    includedFeatures: 'Design responsive multi-écrans · Optimisation SEO & PWA · Console d’administration dynamique · Sécurité renforcée',
    indicativePrice: 'À partir de $250 ou Sur devis',
    estimatedDelay: '1 à 3 semaines',
    availability: 'available',
    orderIndex: 3,
    isPublic: true,
  },
  {
    id: 'srv_ai_automation',
    title: 'Intelligence artificielle et automatisation',
    iconName: 'Bot',
    category: 'Innovation & IA',
    shortDescription: 'Intégration de solutions intelligentes et automatisation de tâches afin de simplifier le travail et améliorer la productivité.',
    includedFeatures: 'Automatisation des flux récurrents · Intégration d’assistants IA contextuels · Traitement automatisé de documents',
    indicativePrice: 'À partir de $200 ou Sur devis',
    estimatedDelay: '3 à 10 jours',
    availability: 'available',
    orderIndex: 4,
    isPublic: true,
  },
  {
    id: 'srv_enterprise_erp',
    title: 'Systèmes de gestion pour entreprises et organisations',
    iconName: 'Building2',
    category: 'Solutions Gestion',
    shortDescription: 'Conception d’outils de gestion pour le suivi des activités, des stocks, des données, des opérations et des processus internes.',
    includedFeatures: 'Gestion multi-utilisateurs et rôles (RBAC) · Suivi financier USD/CDF · Export de rapports · Journal d’audit traçable',
    indicativePrice: 'À partir de $500 ou Sur devis',
    estimatedDelay: '3 à 6 semaines',
    availability: 'available',
    orderIndex: 5,
    isPublic: true,
  },
  {
    id: 'srv_office_automation',
    title: 'Bureautique et automatisation documentaire',
    iconName: 'FileText',
    category: 'Bureautique & Documents',
    shortDescription: 'Traitement de documents, mise en page professionnelle, automatisation Excel et création de formulaires numériques.',
    includedFeatures: 'Conception de modèles normalisés (CV, contrats, PV) · Tableaux de bord Excel automatisés · Mise en page infographique',
    indicativePrice: 'À partir de $50 ou selon volume',
    estimatedDelay: '24h à 5 jours',
    availability: 'available',
    orderIndex: 6,
    isPublic: true,
  },
  {
    id: 'srv_data_collection',
    title: 'Collecte et traitement de données',
    iconName: 'BarChart3',
    category: 'Données & Enquêtes',
    shortDescription: 'Accompagnement dans la conception de formulaires, la collecte mobile terrain, l’organisation et l’analyse des données avec des outils adaptés.',
    includedFeatures: 'Formulaires KoboCollect / ODK / Google Forms · Traitement et nettoyage des données · Analyse statistique SPSS et Excel',
    indicativePrice: 'À partir de $150 ou Sur devis',
    estimatedDelay: '1 à 2 semaines',
    availability: 'available',
    orderIndex: 7,
    isPublic: true,
  },
  {
    id: 'srv_maintenance_support',
    title: 'Maintenance et support informatique',
    iconName: 'Wrench',
    category: 'Support Technique',
    shortDescription: 'Diagnostic, dépannage matériel et logiciel, installation, configuration logicielle et assistance aux utilisateurs.',
    includedFeatures: 'Maintenance préventive & curative · Diagnostic rapide · Sécurisation des postes · Assistance à distance et sur site',
    indicativePrice: 'Forfait mensuel dès $200 ou intervention ponctuelle',
    estimatedDelay: '24h à 48h',
    availability: 'available',
    orderIndex: 8,
    isPublic: true,
  },
  {
    id: 'srv_it_training',
    title: 'Formation informatique',
    iconName: 'GraduationCap',
    category: 'Formation & Coaching',
    shortDescription: 'Formation pratique en informatique générale, bureautique, outils numériques et logiciels adaptés aux besoins des apprenants.',
    includedFeatures: 'Parcours structurés personnalisés · Travaux pratiques réels · Supports pédagogiques complets · Évaluation des acquis',
    indicativePrice: 'À partir de $100 / session ou module',
    estimatedDelay: 'Selon calendrier convenu',
    availability: 'available',
    orderIndex: 9,
    isPublic: true,
  },
  {
    id: 'srv_digital_consulting',
    title: 'Conseil et transformation numérique',
    iconName: 'Lightbulb',
    category: 'Conseil Stratégique',
    shortDescription: 'Analyse des besoins, identification des possibilités d’amélioration et accompagnement dans le choix et l’utilisation des outils numériques.',
    includedFeatures: 'Audit des processus existants · Réduction des tâches manuelles · Recommandation technologique pragmatique · Accompagnement',
    indicativePrice: 'À partir de $150 ou Sur devis',
    estimatedDelay: '1 à 2 semaines',
    availability: 'available',
    orderIndex: 10,
    isPublic: true,
  },
  {
    id: 'srv_cloud_solutions',
    title: 'Solutions cloud et services numériques',
    iconName: 'Cloud',
    category: 'Cloud & Infrastructure',
    shortDescription: 'Conception et intégration de solutions connectées, avec une attention particulière à la sécurité, à la disponibilité et à la gestion des données.',
    includedFeatures: 'Architecture Firebase & Cloud sécurisée · Sauvegardes automatisées · Haute disponibilité · Synchronisation multi-appareils',
    indicativePrice: 'Sur devis personnalisé',
    estimatedDelay: '2 à 4 semaines',
    availability: 'available',
    orderIndex: 11,
    isPublic: true,
  },
];

export const INITIAL_PRICING_RULES: PricingRule[] = [
  {
    id: 'prc_saisie_page_a4',
    serviceName: 'Saisie',
    itemType: 'Page',
    unit: 'Page',
    format: 'A4',
    unitPriceUSD: 1.5,
    unitPriceCDF: 4200,
    validityPeriod: 'Standard 2026',
    conditions: 'Mise en forme professionnelle incluse, correction orthographique de base.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_impression_couleur_a4',
    serviceName: 'Impression',
    itemType: 'En couleur',
    unit: 'Page',
    format: 'A4',
    unitPriceUSD: 0.5,
    unitPriceCDF: 1400,
    validityPeriod: 'Standard 2026',
    conditions: 'Papier 80g haute qualité, impression laser ou jet d’encre professionnelle.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_impression_nb_a4',
    serviceName: 'Impression',
    itemType: 'Noir et blanc',
    unit: 'Page',
    format: 'A4',
    unitPriceUSD: 0.2,
    unitPriceCDF: 500,
    validityPeriod: 'Standard 2026',
    conditions: 'Impression nette haute vitesse sur papier A4 standard.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_redaction_cv_pro',
    serviceName: 'Conception CV / Lettre',
    itemType: 'Document complet',
    unit: 'Forfait',
    format: 'A4',
    unitPriceUSD: 15,
    unitPriceCDF: 42000,
    validityPeriod: '30 jours',
    conditions: 'Design moderne, optimisation du profil et export PDF prêt à l’envoi.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_systeme_gestion',
    serviceName: 'Système de gestion personnalisé',
    itemType: 'Logiciel / Web App',
    unit: 'Projet',
    format: 'Standard',
    unitPriceUSD: 500,
    unitPriceCDF: 1400000,
    validityPeriod: '30 jours',
    conditions: 'Développement sur mesure, base de données sécurisée et formation initiale.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_automatisation_excel_forms',
    serviceName: 'Automatisation Excel/Google Forms',
    itemType: 'Workflow automatisé',
    unit: 'Module',
    format: 'Standard',
    unitPriceUSD: 200,
    unitPriceCDF: 560000,
    validityPeriod: '30 jours',
    conditions: 'Formules avancées, tableaux de bord dynamiques et collecte automatisée.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_formation_entreprise',
    serviceName: 'Formation informatique entreprise',
    itemType: 'Session intensive',
    unit: 'Module',
    format: 'Présentiel / En ligne',
    unitPriceUSD: 100,
    unitPriceCDF: 280000,
    validityPeriod: '30 jours',
    conditions: 'Supports pédagogiques, exercices pratiques et évaluation des participants.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_maintenance_mensuelle',
    serviceName: 'Maintenance/support mensuel',
    itemType: 'Contrat mensuel',
    unit: 'Mois',
    format: 'Parc informatique',
    unitPriceUSD: 250,
    unitPriceCDF: 700000,
    validityPeriod: '30 jours',
    conditions: 'Assistance prioritaire, maintenance préventive et sécurité des postes.',
    available: true,
    isPublic: true,
  },
  {
    id: 'prc_plateforme_web_pwa',
    serviceName: 'Plateforme Web / PWA Professionnelle',
    itemType: 'Application Web',
    unit: 'Projet',
    format: 'Responsive',
    unitPriceUSD: 350,
    unitPriceCDF: 980000,
    validityPeriod: '30 jours',
    conditions: 'Site vitrine dynamique ou PWA installable avec panneau d’administration.',
    available: true,
    isPublic: true,
  },
];

export const INITIAL_PORTFOLIO: PortfolioProject[] = [
  {
    id: 'port_amani_platform',
    title: 'Ets AMANI — Plateforme de supervision, gestion opérationnelle et contrôle interne',
    description:
      'Projet technologique majeur orienté production : gestion des utilisateurs et des rôles (RBAC), suivi des transactions financières et opérationnelles, production de rapports automatiques, fonctionnement offline-first avec base locale Dexie / IndexedDB et synchronisation cloud Firestore, Progressive Web App (PWA) et préparation Android Capacitor.',
    category: 'Applications mobiles',
    completionDate: '2026',
    clientName: 'Ets AMANI — Goma / Beni, RDC',
    imageUrl: PORTFOLIO_ERP_IMAGE,
    demoUrl: 'https://github.com/Aimable2025',
    attachmentName: 'Fiche-Technique-Plateforme-AMANI.pdf',
    allowDownload: true,
    technologies: 'React · TypeScript · Vite · Firebase Firestore · Dexie / IndexedDB · PWA · Capacitor',
    status: 'published',
    isPublic: true,
  },
  {
    id: 'port_buno_tech_platform',
    title: 'BUNO Tech — Plateforme Professionnelle & Espace Client Intégré',
    description:
      'Progressive Web App (PWA) complète conçue et déployée pour présenter les services, réalisations et profils professionnels, avec calculateur de devis multi-devises (USD/CDF), espace personnel client, messagerie directe, suite bureautique et assistant IA.',
    category: 'Plateformes web',
    completionDate: '2026',
    clientName: 'BUNO Tech',
    imageUrl: HERO_STUDIO_IMAGE,
    demoUrl: 'https://github.com/Aimable2025',
    attachmentName: 'Presentation-BUNO-Tech.pdf',
    allowDownload: true,
    technologies: 'React · TypeScript · Vite · Tailwind CSS · Firebase Auth · Firestore · PWA',
    status: 'published',
    isPublic: true,
  },
  {
    id: 'port_mobile_collect',
    title: 'BUNO FieldCollect & Collecte Mobile Hors-Ligne',
    description:
      'Application mobile et PWA conçue pour la saisie de données terrain en environnement à faible connectivité, stockage local instantané et synchronisation dès le rétablissement du réseau.',
    category: 'Applications mobiles',
    completionDate: '2026',
    clientName: 'Organisations & Enquêtes terrain — RDC',
    imageUrl: PORTFOLIO_MOBILE_IMAGE,
    demoUrl: 'https://github.com/Aimable2025',
    attachmentName: 'Fiche-Technique-BUNO-FieldCollect.pdf',
    allowDownload: true,
    technologies: 'React · TypeScript · PWA Service Worker · IndexedDB · Kobo/ODK standards',
    status: 'published',
    isPublic: true,
  },
  {
    id: 'port_pack_documents_admin',
    title: 'Sergio’s Printing & Référentiel de Modèles Professionnels Normalisés',
    description:
      'Conception, mise en page professionnelle et structuration de modèles administratifs et techniques prêts à l’emploi : rapports d’activité ONG, procès-verbaux, notes de service, contrats et CV modernes.',
    category: 'Documents',
    completionDate: '2025',
    clientName: 'Sergio’s Printing / Partenaires BUNO Tech',
    imageUrl: HERO_STUDIO_IMAGE,
    demoUrl: '#premium',
    attachmentName: 'Catalogue-Modeles-BUNO-Tech.html',
    allowDownload: true,
    technologies: 'Bureautique avancée · Normes rédactionnelles · Mise en page infographique · Export PDF/DOC',
    status: 'published',
    isPublic: true,
  },
  {
    id: 'port_formation_bureautique_ia',
    title: 'Programmes de Formation Informatique Pratique & Outils Numériques',
    description:
      'Parcours de formation pratique dispensés aux équipes d’ONG, associations et particuliers : Windows, Word avancé, Excel, PowerPoint, cybersécurité opérationnelle et outils de productivité numérique.',
    category: 'Formations',
    completionDate: '2026',
    clientName: 'APV asbl & Fondation FORESE — Goma',
    imageUrl: PORTFOLIO_TRAINING_IMAGE,
    demoUrl: 'https://www.youtube.com/@AimableBunoTech',
    attachmentName: 'Syllabus-Formation-BUNO-Tech.txt',
    allowDownload: true,
    technologies: 'Pédagogie active · Word · Excel · PowerPoint · Sécurité informatique',
    status: 'published',
    isPublic: true,
  },
];

export const INITIAL_PARTNERS: PartnerItem[] = [
  {
    id: 'part_ets_amani',
    name: 'Ets AMANI',
    logoText: 'AMANI',
    description:
      'Entreprise commerciale et d’approvisionnement en liquidités (Beni / Goma). Conception et déploiement de la plateforme de supervision opérationnelle, gestion des flux et contrôle interne.',
    category: 'Entreprises',
    websiteUrl: '',
    contactInfo: 'Goma & Beni, RDC',
    projectCompleted: 'Plateforme de supervision opérationnelle, gestion des liquidités et contrôle interne',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_apv_asbl',
    name: 'APV asbl',
    logoText: 'APV',
    description:
      'Association sans but lucratif basée à Goma. Prestations régulières de support informatique, maintenance préventive du parc et formation bureautique du personnel.',
    category: 'Associations',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Support technique, digitalisation des données et formation bureautique',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_sabi_faustin',
    name: 'Ets SABI Faustin',
    logoText: 'SABI',
    description:
      'Structure commerciale basée à Goma. Tenue des documents comptables, suivi des opérations financières et gestion de trésorerie.',
    category: 'Entreprises',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Organisation comptable et suivi financier des opérations',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_aedvs_asbl',
    name: 'AEDVS asbl',
    logoText: 'AEDVS',
    description:
      'Organisation d’appui et développement communautaire. Gestion administrative et documentaire, rédaction professionnelle et procès-verbaux.',
    category: 'ONG',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Secrétariat exécutif, gestion documentaire et correspondances officielles',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_forese',
    name: 'Fondation REMY SEGIHOBE (FORESE)',
    logoText: 'FORESE',
    description:
      'Fondation dédiée à l’éducation et au renforcement des compétences à Goma. Animation de sessions de formation pratique en informatique générale et bureautique.',
    category: 'Institutions',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Formations pratiques en informatique et bureautique pour les apprenants',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_acmi_asbl',
    name: 'ACMI asbl',
    logoText: 'ACMI',
    description:
      'Association communautaire à Goma. Support technique, configuration des outils informatiques et appui à la gestion numérique de l’information.',
    category: 'Associations',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Support informatique et gestion numérique des documents',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_sergio_printing',
    name: 'Sergio’s Printing',
    logoText: 'SERGIO',
    description:
      'Établissement spécialisé dans l’imprimerie et le traitement documentaire à Goma. Saisie, mise en page professionnelle et archivage numérique.',
    category: 'Entreprises',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Traitement de documents, mise en page technique et numérisation',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'part_rcha_rdc',
    name: 'RCHA / RDC',
    logoText: 'RCHA',
    description:
      'Organisation d’expertise et de renforcement des capacités à Goma. Déploiement d’outils de collecte mobile (KoboCollect, ODK, Google Forms) et traitement statistique SPSS.',
    category: 'Institutions',
    websiteUrl: '',
    contactInfo: 'Goma, RDC',
    projectCompleted: 'Formations spécialisées en collecte mobile et analyse statistique SPSS',
    status: 'active',
    isPublic: true,
  },
];

export const INITIAL_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_1_day',
    code: 'PASS_1J',
    name: 'Pass Découverte 1 Jour',
    durationLabel: '1 jour',
    durationDays: 1,
    priceUSD: 2,
    priceCDF: 5600,
    features:
      'Accès complet 24h au Traitement de texte en ligne · Bibliothèque des 19 modèles professionnels · Formateur informatique interactif · Assistant IA BUNO Tech',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'plan_1_week',
    code: 'PASS_1S',
    name: 'Formule Hebdomadaire 1 Semaine',
    durationLabel: '1 semaine',
    durationDays: 7,
    priceUSD: 7,
    priceCDF: 19600,
    features:
      'Accès complet 7 jours · Sauvegarde cloud de vos documents · Tous les modèles CV, Lettres, Rapports & Factures · Parcours complet Formateur IT · Assistant IA',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'plan_1_month',
    code: 'PRO_1M',
    name: 'Abonnement Pro 1 Mois',
    durationLabel: '1 mois',
    durationDays: 30,
    priceUSD: 18,
    priceCDF: 50000,
    features:
      'Accès illimité 30 jours à BUNO Tech Premium · Éditeur riche & export PDF/DOC · Tous les modèles personnalisables · Formateur informatique + Quiz · Assistant IA prioritaire',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'plan_1_year',
    code: 'ANNUEL_1A',
    name: 'Licence Annuelle 1 An',
    durationLabel: '1 an',
    durationDays: 365,
    priceUSD: 120,
    priceCDF: 336000,
    features:
      'Accès complet 365 jours · Économie majeure · Tous les outils BUNO Tech Premium · Bibliothèque complète · Support prioritaire Aimable Maombi Bunoti',
    status: 'active',
    isPublic: true,
  },
  {
    id: 'plan_3_years',
    code: 'ENTREPRISE_3A',
    name: 'Licence Longue Durée 3 Ans',
    durationLabel: '3 ans',
    durationDays: 1095,
    priceUSD: 280,
    priceCDF: 784000,
    features:
      'Accès intégral 3 ans (1095 jours) · Idéal pour professionnels, ONG et entreprises · Mises à jour continues des modèles et cours · Assistance dédiée',
    status: 'active',
    isPublic: true,
  },
];

export const INITIAL_TEMPLATES: DocumentTemplate[] = [
  // CV (4)
  {
    id: 'tpl_cv_pro',
    title: 'CV Professionnel Exécutif',
    category: 'CV',
    subCategory: 'CV professionnel',
    description: 'Structure sobre et percutante mettant en valeur l’expérience, les réalisations chiffrées et les compétences clés.',
    defaultContentHtml: `<h1>NOM PRÉNOM</h1><p><strong>Titre professionnel / Poste visé</strong> · Ville, Pays · Téléphone : +243 ... · Email : ...</p><hr/><h2>1. Profil Professionnel</h2><p>Professionnel expérimenté en [Domaine] avec [X] années d'expérience dans la gestion de projets, l'optimisation des processus et l'accompagnement d'équipes.</p><h2>2. Expériences Professionnelles</h2><p><strong>Intitulé du poste — Nom de l'organisation</strong> (Année début – Année fin)</p><ul><li>Réalisation principale et résultats mesurables obtenus.</li><li>Coordination des activités et rédaction des rapports périodiques.</li></ul><h2>3. Formation & Diplômes</h2><p><strong>Diplôme / Licence</strong> — Établissement (Année)</p><h2>4. Compétences Techniques & Langues</h2><p>Bureautique avancée, Gestion de projet, Français (Courant), Anglais (Professionnel).</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_cv_moderne',
    title: 'CV Moderne & Numérique',
    category: 'CV',
    subCategory: 'CV moderne',
    description: 'Adapté aux métiers du numérique, de l’ingénierie, de la communication et du conseil.',
    defaultContentHtml: `<h1>NOM PRÉNOM — SPÉCIALISTE NUMÉRIQUE</h1><p>Email : contact@exemple.com · WhatsApp : +243 ... · LinkedIn / GitHub</p><hr/><h2>Synthèse des Compétences</h2><p>Développement, Analyse de données, Gestion de systèmes d'information, Conception de solutions.</p><h2>Projets & Réalisations Clés</h2><ul><li><strong>Projet 1 :</strong> Description de la solution déployée et de son impact.</li><li><strong>Projet 2 :</strong> Automatisation et amélioration de la productivité.</li></ul><h2>Parcours Professionnel</h2><p><strong>Consultant / Développeur — Structure</strong> (2024 – Présent)</p><h2>Formation Continue & Certifications</h2><p>Certifications professionnelles et parcours académique.</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_cv_etudiant',
    title: 'CV Étudiant & Jeune Diplômé',
    category: 'CV',
    subCategory: 'CV étudiant',
    description: 'Valorise la formation académique, les travaux pratiques, les stages et l’engagement associatif.',
    defaultContentHtml: `<h1>NOM PRÉNOM</h1><p>Étudiant(e) en [Filière / Faculté] · Recherche de stage ou premier emploi · Tél : +243 ...</p><hr/><h2>Objectif</h2><p>Intégrer une équipe dynamique afin de mettre en pratique mes connaissances académiques en [Domaine] et contribuer activement aux activités de votre structure.</p><h2>Formation Académique</h2><p><strong>Université / Institut Supérieur</strong> — Promotion [Année]</p><p>Cours pertinents : Informatique, Gestion, Méthodologie de recherche.</p><h2>Stages & Projets Académiques</h2><ul><li>Stage académique au sein de [Organisation] : rédaction du rapport et participation aux opérations.</li></ul><h2>Compétences & Atouts</h2><p>Word, Excel, PowerPoint, Internet, Esprit d'équipe, Rigueur.</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_cv_simple',
    title: 'CV Simple & Chronologique',
    category: 'CV',
    subCategory: 'CV simple',
    description: 'Présentation directe, lisible sur une seule page, idéale pour toute candidature rapide.',
    defaultContentHtml: `<h1>CURRICULUM VITAE</h1><p><strong>Nom complet :</strong> [Votre Nom]</p><p><strong>Téléphone :</strong> +243 ... | <strong>Email :</strong> ...</p><hr/><h2>État Civil & Coordonnées</h2><p>Lieu de résidence : ... | Nationalité : ...</p><h2>Études Faites</h2><ul><li>[Année] : Diplôme obtenu — Établissement</li></ul><h2>Expériences Acquises</h2><ul><li>[Année] : Fonction exercée — Employeur</li></ul><h2>Connaissances Linguistiques & Informatiques</h2><p>Français, Swahili, Anglais · Maîtrise de l'outil informatique (Word, Excel).</p><p>Je certifie sur l'honneur que les renseignements fournis ci-dessus sont sincères et exacts.</p>`,
    isPublic: true,
  },
  // Lettres (4)
  {
    id: 'tpl_lettre_motivation',
    title: 'Lettre de Motivation Professionnelle',
    category: 'Lettres',
    subCategory: 'Lettre de motivation',
    description: 'Modèle structuré (Accroche, Vous, Moi, Nous) pour accompagner efficacement votre CV.',
    defaultContentHtml: `<p><strong>[Votre Nom et Prénom]</strong><br/>Téléphone : +243 ...<br/>Email : ...</p><p style="text-align:right">À <strong>[Nom du Destinataire / Responsable RH]</strong><br/>[Nom de l'Entreprise ou ONG]<br/>Fait à [Ville], le [Date]</p><p><strong>Objet : Candidature au poste de [Intitulé du poste]</strong></p><p>Madame, Monsieur,</p><p>Votre organisation se distingue par la qualité de ses interventions dans le domaine de [Secteur]. Souhaitant mettre mes compétences en [Vos compétences clés] au service de vos objectifs, je vous soumets avec enthousiasme mon dossier de candidature.</p><p>Au cours de mon parcours, j'ai développé une solide maîtrise de [Expérience / Outils], me permettant d'obtenir des résultats concrets avec rigueur et autonomie.</p><p>Je reste à votre entière disposition pour un entretien au cours duquel je pourrai vous exposer plus en détail mes motivations.</p><p>Veuillez agréer, Madame, Monsieur, l'expression de ma considération distinguée.</p><p><strong>[Signature]</strong></p>`,
    isPublic: true,
  },
  {
    id: 'tpl_lettre_administrative',
    title: 'Lettre Administrative Officielle',
    category: 'Lettres',
    subCategory: 'Lettre administrative',
    description: 'Respecte les normes de correspondance officielle auprès des autorités et institutions.',
    defaultContentHtml: `<p><strong>[Expéditeur / Organisation]</strong><br/>Réf : N° 001/2026</p><p style="text-align:right">À l'attention de <strong>[Titre de l'Autorité ou Responsable]</strong><br/>[Institution]<br/>À [Ville], le [Date]</p><p><strong>Objet : [Objet précis de la correspondance]</strong></p><p>Monsieur le Directeur / Madame la Directrice,</p><p>Par la présente, nous avons l'honneur de solliciter auprès de votre haute bienveillance [Exposer clairement l'objet de la démarche administrative].</p><p>En effet, dans le cadre de nos activités relatives à [Contexte], cette démarche s'avère essentielle pour garantir la bonne exécution de nos engagements.</p><p>Dans l'attente d'une suite favorable, nous vous prions d'agréer, [Titre], l'expression de notre très haute considération.</p><p><strong>[Nom, Fonction et Signature]</strong></p>`,
    isPublic: true,
  },
  {
    id: 'tpl_demande_emploi',
    title: 'Lettre de Demande d’Emploi',
    category: 'Lettres',
    subCategory: "Demande d'emploi",
    description: 'Formulation claire pour répondre à une offre d’emploi ou soumettre une candidature spontanée.',
    defaultContentHtml: `<p><strong>[Nom Complet du Candidat]</strong><br/>Tél : +243 ... | Email : ...</p><p style="text-align:right">À Monsieur/Madame le Directeur Général de [Organisation]<br/>Le [Date]</p><p><strong>Objet : Demande d'emploi au poste de [Poste]</strong></p><p>Madame, Monsieur,</p><p>J'ai l'honneur de venir très respectueusement auprès de votre responsabilité solliciter un emploi au sein de votre structure en qualité de [Poste visé].</p><p>Titulaire d'un diplôme en [Domaine] et doté(e) d'une expérience pratique en [Compétences], je suis immédiatement disponible et prêt(e) à m'investir pleinement pour contribuer à l'atteinte de vos résultats.</p><p>Vous trouverez ci-joint mon Curriculum Vitae ainsi que les copies de mes pièces académiques.</p><p>Je vous prie d'agréer, Madame, Monsieur, l'expression de mon profond respect.</p><p><strong>[Nom et Signature]</strong></p>`,
    isPublic: true,
  },
  {
    id: 'tpl_demande_stage',
    title: 'Lettre de Demande de Stage Académique ou Professionnel',
    category: 'Lettres',
    subCategory: 'Demande de stage',
    description: 'Modèle dédié aux étudiants et jeunes professionnels sollicitant un stage pratique.',
    defaultContentHtml: `<p><strong>[Nom et Prénom]</strong><br/>Étudiant(e) / Candidat(e) en [Domaine]<br/>Tél : +243 ...</p><p style="text-align:right">À la Direction des Ressources Humaines de [Structure]<br/>Fait à [Ville], le [Date]</p><p><strong>Objet : Demande de stage [académique / professionnel]</strong></p><p>Madame, Monsieur,</p><p>Dans le cadre de la finalisation de mon cursus en [Filière], je sollicite auprès de votre établissement l'opportunité d'effectuer un stage pratique d'une durée de [Durée, ex: 1 à 3 mois] à compter du [Date souhaitée].</p><p>Intégrer votre équipe représenterait pour moi un cadre idéal d'apprentissage et de mise en pratique de mes compétences en [Compétences].</p><p>Dans l'espoir d'une suite favorable, veuillez recevoir, Madame, Monsieur, mes salutations respectueuses.</p><p><strong>[Signature]</strong></p>`,
    isPublic: true,
  },
  // Rapports (4)
  {
    id: 'tpl_rapport_activite',
    title: 'Rapport d’Activité Opérationnel',
    category: 'Rapports',
    subCategory: "Rapport d'activité",
    description: 'Pour documenter les objectifs prévus, les activités réalisées, les indicateurs et les recommandations.',
    defaultContentHtml: `<h1>RAPPORT D'ACTIVITÉ</h1><p><strong>Période :</strong> [Dates] · <strong>Auteur :</strong> [Nom & Fonction] · <strong>Service / Projet :</strong> [Nom]</p><hr/><h2>1. Contexte et Objectifs</h2><p>Rappel des objectifs assignés pour la période concernée.</p><h2>2. Activités Réalisées</h2><table><thead><tr><th>Activité</th><th>Indicateur / Cible</th><th>Résultat atteint</th><th>Statut</th></tr></thead><tbody><tr><td>Activité 1</td><td>100%</td><td>Réalisé</td><td>Terminé</td></tr><tr><td>Activité 2</td><td>En cours</td><td>80%</td><td>En suivi</td></tr></tbody></table><h2>3. Difficultés Rencontrées & Solutions Apportées</h2><p>Analyse factuelle des contraintes techniques ou logistiques.</p><h2>4. Perspectives & Prochaines Étapes</h2><ul><li>Action prioritaire 1</li><li>Action prioritaire 2</li></ul>`,
    isPublic: true,
  },
  {
    id: 'tpl_rapport_mensuel',
    title: 'Rapport Mensuel de Suivi',
    category: 'Rapports',
    subCategory: 'Rapport mensuel',
    description: 'Synthèse mensuelle structurée pour entreprises, ONG et coordinations de projets.',
    defaultContentHtml: `<h1>RAPPORT MENSUEL — MOIS DE [MOIS / ANNÉE]</h1><p><strong>Département :</strong> [Nom] · <strong>Responsable :</strong> [Nom]</p><hr/><h2>1. Synthèse Exécutive</h2><p>Points saillants du mois écoulé.</p><h2>2. Bilan Quantitatif et Qualitatif</h2><ul><li>Nombre de dossiers traités : ...</li><li>Taux d'exécution du planning : ...%</li></ul><h2>3. Planification du Mois Suivant</h2><p>Objectifs prioritaires et besoins en ressources.</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_rapport_formation',
    title: 'Rapport d’Atelier / Formation Informatique',
    category: 'Rapports',
    subCategory: 'Rapport de formation',
    description: 'Bilan pédagogique complet : participants, modules dispensés, évaluation et recommandations.',
    defaultContentHtml: `<h1>RAPPORT DE FORMATION</h1><p><strong>Thème :</strong> [Intitulé de la formation] · <strong>Formateur :</strong> Aimable Maombi Bunoti — BUNO Tech</p><p><strong>Dates :</strong> [Dates] · <strong>Nombre de participants :</strong> [N]</p><hr/><h2>1. Objectifs Pédagogiques</h2><p>Renforcer les capacités pratiques des participants sur [Sujet].</p><h2>2. Déroulement et Modules Couverts</h2><ul><li>Module 1 : Fondamentaux et prise en main</li><li>Module 2 : Exercices pratiques sur cas réels</li><li>Module 3 : Évaluation finale et restitution</li></ul><h2>3. Résultats des Évaluations & Recommandations</h2><p>Progression constatée et pistes de suivi post-formation.</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_rapport_pro',
    title: 'Rapport d’Expertise Technique & Conseil',
    category: 'Rapports',
    subCategory: 'Rapport professionnel',
    description: 'Rapport d’audit informatique, de diagnostic système ou de recommandation stratégique.',
    defaultContentHtml: `<h1>RAPPORT D'EXPERTISE TECHNIQUE</h1><p><strong>Client / Organisation :</strong> [Nom] · <strong>Consultant :</strong> BUNO Tech</p><hr/><h2>1. État des Lieux & Diagnostic</h2><p>Analyse de l'infrastructure matérielle, logicielle et des flux de données existants.</p><h2>2. Risques Identifiés</h2><ul><li>Sécurité et sauvegarde des données</li><li>Performance et continuité de service</li></ul><h2>3. Plan d'Action Recommandé</h2><p>Solutions chiffrées à court et moyen terme.</p>`,
    isPublic: true,
  },
  // Documents (7)
  {
    id: 'tpl_doc_liste',
    title: 'Liste de Présence / Émargement',
    category: 'Documents',
    subCategory: 'Liste',
    description: 'Tableau structuré pour réunions, formations, ateliers ou inventaires.',
    defaultContentHtml: `<h1>LISTE DE PRÉSENCE</h1><p><strong>Activité / Réunion :</strong> [Intitulé] · <strong>Date :</strong> [Date] · <strong>Lieu :</strong> [Lieu]</p><hr/><table><thead><tr><th>N°</th><th>Nom et Post-nom</th><th>Organisation / Fonction</th><th>Téléphone / Email</th><th>Signature</th></tr></thead><tbody><tr><td>01</td><td></td><td></td><td></td><td></td></tr><tr><td>02</td><td></td><td></td><td></td><td></td></tr><tr><td>03</td><td></td><td></td><td></td><td></td></tr></tbody></table>`,
    isPublic: true,
  },
  {
    id: 'tpl_doc_invitation',
    title: 'Lettre d’Invitation Officielle',
    category: 'Documents',
    subCategory: 'Invitation',
    description: 'Invitation formelle à une réunion de travail, un atelier de formation ou un lancement de projet.',
    defaultContentHtml: `<h1>INVITATION OFFICIELLE</h1><p><strong>Organisation :</strong> [Nom de la structure]</p><hr/><p>À l'attention de : <strong>[Nom / Fonction de l'invité]</strong></p><p>Madame, Monsieur,</p><p>Nous avons l'honneur de vous convier à prendre part à <strong>[Intitulé de l'événement / atelier]</strong> qui se tiendra le <strong>[Date]</strong> de <strong>[Heure début]</strong> à <strong>[Heure fin]</strong> à <strong>[Lieu exact]</strong>.</p><p><strong>Ordre du jour :</strong></p><ul><li>Point 1 : Présentation et cadrage</li><li>Point 2 : Échanges techniques et validation</li></ul><p>Votre présence est vivement souhaitée. Contact de confirmation : +243 ...</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_doc_pv',
    title: 'Procès-Verbal de Réunion (PV)',
    category: 'Documents',
    subCategory: 'Procès-verbal',
    description: 'Compte-rendu formel avec liste des participants, délibérations et résolutions adoptées.',
    defaultContentHtml: `<h1>PROCÈS-VERBAL DE RÉUNION</h1><p><strong>Date :</strong> [Date] · <strong>Heure :</strong> [Heure] · <strong>Lieu :</strong> [Lieu]</p><p><strong>Président de séance :</strong> [Nom] · <strong>Rapporteur :</strong> [Nom]</p><hr/><h2>1. Ordre du Jour</h2><ol><li>Adoption de l'ordre du jour</li><li>Analyse des dossiers en cours</li><li>Divers</li></ol><h2>2. Synthèse des Débats et Décisions Prises</h2><p><strong>Décision 1 :</strong> Description de la résolution adoptée et responsable désigné.</p><p>L'ordre du jour étant épuisé, la séance est levée à [Heure].</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_doc_attestation',
    title: 'Attestation de Participation / Service Rendu',
    category: 'Documents',
    subCategory: 'Attestation',
    description: 'Modèle officiel d’attestation de formation, de stage ou de prestation.',
    defaultContentHtml: `<h1>ATTESTATION OFFICIELLE</h1><hr/><p>Je soussigné(e), <strong>[Nom et Qualité du Responsable]</strong>, atteste par la présente que :</p><p>Monsieur / Madame <strong>[Nom Complet du Bénéficiaire]</strong></p><p>a participé avec assiduité et succès à <strong>[Intitulé de la formation / mission / stage]</strong> organisé(e) du <strong>[Date début]</strong> au <strong>[Date fin]</strong>.</p><p>En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</p><p>Fait à [Ville], le [Date].</p><p><strong>Direction / Signature & Sceau</strong></p>`,
    isPublic: true,
  },
  {
    id: 'tpl_doc_note_service',
    title: 'Note de Service Interne',
    category: 'Documents',
    subCategory: 'Note de service',
    description: 'Communication interne officielle destinée à l’ensemble du personnel ou à un département.',
    defaultContentHtml: `<h1>NOTE DE SERVICE N° [001/2026]</h1><p><strong>De :</strong> La Direction · <strong>À :</strong> L'ensemble du personnel · <strong>Date :</strong> [Date]</p><p><strong>Objet : [Objet de la note de service]</strong></p><hr/><p>Il est porté à la connaissance de l'ensemble des collaborateurs que, à compter du [Date d'effet], les dispositions suivantes entrent en vigueur :</p><ul><li>Disposition 1 : ...</li><li>Disposition 2 : ...</li></ul><p>La stricte observance de la présente note est exigée de tous.</p><p><strong>La Direction</strong></p>`,
    isPublic: true,
  },
  {
    id: 'tpl_doc_facture',
    title: 'Facture Commerciale / Prestation',
    category: 'Documents',
    subCategory: 'Facture',
    description: 'Modèle de facture claire avec détail des prestations, quantités, prix unitaires et total net à payer.',
    defaultContentHtml: `<h1>FACTURE N° FAC-2026-001</h1><p><strong>Prestataire :</strong> [Votre Structure / BUNO Tech] · Contact : +243 992 294 852</p><p><strong>Client :</strong> [Nom du Client] · <strong>Date :</strong> [Date]</p><hr/><table><thead><tr><th>N°</th><th>Désignation</th><th>Qté</th><th>Prix Unitaire</th><th>Prix Total</th></tr></thead><tbody><tr><td>1</td><td>Prestation / Service 1</td><td>1</td><td>$100.00</td><td>$100.00</td></tr></tbody></table><p style="text-align:right"><strong>TOTAL NET À PAYER : $100.00</strong></p><p>Conditions de règlement : Paiement à réception. Merci de votre confiance.</p>`,
    isPublic: true,
  },
  {
    id: 'tpl_doc_devis',
    title: 'Devis Estimatif Personnalisé',
    category: 'Documents',
    subCategory: 'Devis',
    description: 'Proposition financière structurée avec durée de validité et conditions d’exécution.',
    defaultContentHtml: `<h1>DEVIS PROFESSIONNEL N° DEV-2026-001</h1><p><strong>Émis par :</strong> Aimable Maombi Bunoti — BUNO Tech · Email : aimablebunotech@gmail.com</p><p><strong>Client :</strong> [Nom du Client] · <strong>Validité :</strong> 30 jours</p><hr/><table><thead><tr><th>N°</th><th>Description</th><th>Type / Format</th><th>Quantité</th><th>Prix Unitaire</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>Développement / Saisie / Formation</td><td>Standard</td><td>1</td><td>$200.00</td><td>$200.00</td></tr></tbody></table><p style="text-align:right"><strong>TOTAL DEVIS : $200.00</strong></p><p>Bon pour accord (Date et signature du client) :</p>`,
    isPublic: true,
  },
];

export interface TrainingModuleItem {
  id: string;
  title: string;
  category: string;
  level: string;
  duration: string;
  summary: string;
  lessons: { title: string; content: string }[];
  practicalExercise: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export const IT_TRAINING_MODULES: TrainingModuleItem[] = [
  {
    id: 'mod_general_it',
    title: '01. Informatique générale & Architecture',
    category: 'Fondamentaux',
    level: 'Débutant',
    duration: '45 min',
    summary: 'Comprendre les composants matériels (Hardware), les logiciels (Software), les unités de mesure et le traitement de l’information.',
    lessons: [
      {
        title: 'Matériel (Hardware) vs Logiciel (Software)',
        content:
          "Un système informatique repose sur l'alliance entre le matériel physique (processeur CPU, mémoire vive RAM, stockage SSD, périphériques d'entrée/sortie) et le logiciel (système d'exploitation et applications).",
      },
      {
        title: 'Mémoire vive (RAM) et Stockage permanent (SSD/HDD)',
        content:
          "La RAM stocke temporairement les données des programmes en cours d'exécution (elle s'efface à l'extinction), tandis que le SSD conserve durablement vos fichiers et votre système.",
      },
    ],
    practicalExercise:
      "Ouvrez le Gestionnaire des tâches sur votre ordinateur (Ctrl + Maj + Échap) et identifiez la capacité totale de votre mémoire RAM ainsi que le modèle de votre processeur.",
    quiz: [
      {
        question: 'Quel composant conserve vos documents même lorsque l’ordinateur est totalement éteint ?',
        options: ['La mémoire vive (RAM)', 'Le disque SSD ou disque dur', 'Le cache du processeur', 'L’écran moniteur'],
        correctIndex: 1,
        explanation: 'Le SSD (ou disque dur) est une mémoire non volatile qui conserve les fichiers hors tension.',
      },
      {
        question: 'Que signifie l’acronyme CPU ?',
        options: ['Central Processing Unit (Unité centrale de traitement)', 'Computer Personal Utility', 'Control Panel User', 'Core Power Unit'],
        correctIndex: 0,
        explanation: 'Le CPU est le processeur central qui exécute les instructions des programmes.',
      },
      {
        question: 'Parmi ces éléments, lequel est un périphérique d’entrée ?',
        options: ['Une imprimante', 'Un clavier', 'Un haut-parleur', 'Un vidéoprojecteur'],
        correctIndex: 1,
        explanation: 'Le clavier permet d’envoyer des informations (saisie) vers l’ordinateur.',
      },
    ],
  },
  {
    id: 'mod_windows',
    title: '02. Maîtrise de Windows & Gestion des fichiers',
    category: 'Système d’exploitation',
    level: 'Débutant / Intermédiaire',
    duration: '50 min',
    summary: 'Organisation professionnelle des dossiers, raccourcis clavier essentiels, sauvegarde et maintenance de poste.',
    lessons: [
      {
        title: 'Arborescence de dossiers et nomenclature professionnelle',
        content:
          'Adoptez une nomenclature claire (ex: 2026-10_Rapport_Activite_BunoTech.docx) sans caractères spéciaux bloquants pour retrouver instantanément vos documents.',
      },
      {
        title: 'Raccourcis clavier indispensables sous Windows',
        content:
          'Win + E (Explorateur de fichiers), Win + D (Afficher le bureau), Win + L (Verrouiller la session immédiatement), Ctrl + Z (Annuler), Alt + Tab (Basculer entre les fenêtres).',
      },
    ],
    practicalExercise:
      'Créez un dossier principal nommé "2026_Projets_Pro" contenant trois sous-dossiers : "01_Administratif", "02_Finances", et "03_Archives".',
    quiz: [
      {
        question: 'Quel raccourci clavier permet de verrouiller instantanément votre session Windows lorsque vous quittez votre bureau ?',
        options: ['Ctrl + Alt + Suppr uniquement', 'Touche Windows + L', 'Alt + F4', 'Ctrl + V'],
        correctIndex: 1,
        explanation: 'Windows + L (Lock) verrouille immédiatement l’écran pour protéger vos données.',
      },
      {
        question: 'Quel raccourci ouvre directement l’Explorateur de fichiers Windows ?',
        options: ['Windows + E', 'Windows + R', 'Ctrl + P', 'Alt + Entrée'],
        correctIndex: 0,
        explanation: 'Windows + E ouvre instantanément l’Explorateur de fichiers.',
      },
      {
        question: 'Que se passe-t-il lorsqu’on supprime un fichier avec Maj + Suppr (Shift + Delete) ?',
        options: ['Il va dans la Corbeille', 'Il est supprimé définitivement sans passer par la Corbeille', 'Il est copié sur le Bureau', 'Il est compressé en ZIP'],
        correctIndex: 1,
        explanation: 'Maj + Suppr contourne la Corbeille et supprime définitivement le fichier.',
      },
    ],
  },
  {
    id: 'mod_word',
    title: '03. Microsoft Word & Traitement de texte professionnel',
    category: 'Bureautique',
    level: 'Intermédiaire',
    duration: '60 min',
    summary: 'Mise en page structurée, feuilles de style (Titre 1, Titre 2), tables des matières automatiques, en-têtes et export PDF.',
    lessons: [
      {
        title: 'Utiliser les Styles (Titre 1, Titre 2) au lieu du formatage manuel',
        content:
          'Appliquer les styles natifs permet de modifier l’apparence de tout un rapport en un clic et de générer automatiquement un sommaire paginé.',
      },
      {
        title: 'Sauts de page, sauts de section et tableaux propres',
        content:
          'N’utilisez jamais une succession de touches Entrée pour passer à la page suivante : insérez un Saut de page (Ctrl + Entrée) pour garantir une mise en page stable.',
      },
    ],
    practicalExercise:
      'Rédigez une note de service de 2 pages dans l’éditeur BUNO Tech Premium en utilisant Titre 1, Titre 2, une liste à puces et un tableau récapitulatif.',
    quiz: [
      {
        question: 'Pourquoi faut-il utiliser les styles "Titre 1" et "Titre 2" dans un rapport professionnel ?',
        options: [
          'Uniquement pour changer la couleur du texte',
          'Pour structurer le document et générer automatiquement une table des matières',
          'Pour réduire la taille du fichier de 90%',
          'Pour empêcher l’impression du document',
        ],
        correctIndex: 1,
        explanation: 'Les styles hiérarchisent le document et permettent la création automatique du sommaire.',
      },
      {
        question: 'Quelle combinaison permet d’insérer proprement un saut de page ?',
        options: ['Appuyer 20 fois sur Entrée', 'Ctrl + Entrée', 'Alt + Espace', 'Maj + Tab'],
        correctIndex: 1,
        explanation: 'Ctrl + Entrée insère un saut de page net qui ne se décale pas lors des modifications.',
      },
      {
        question: 'Quel format est recommandé pour envoyer un devis ou un CV finalisé afin que la mise en page ne bouge pas ?',
        options: ['.txt', '.pdf', '.csv', '.tmp'],
        correctIndex: 1,
        explanation: 'Le format PDF fige la mise en page et les polices sur tous les appareils.',
      },
    ],
  },
  {
    id: 'mod_excel',
    title: '04. Microsoft Excel & Analyse de données',
    category: 'Bureautique & Données',
    level: 'Intermédiaire / Avancé',
    duration: '75 min',
    summary: 'Formules essentielles (SOMME, SI, SOMME.SI, RECHERCHEV/X), références absolues ($) et tableaux de suivi financier.',
    lessons: [
      {
        title: 'Références relatives (A1) vs Références absolues ($A$1)',
        content:
          'Lorsqu’une formule multiplie une colonne de prix en USD par un taux de change fixe situé en cellule C1, écrivez $C$1 pour bloquer la cellule lors de la recopie.',
      },
      {
        title: 'Formules de gestion : SOMME, MOYENNE, SI et SOMME.SI',
        content:
          'Toute formule commence par le signe =. Exemple : =SI(B2>=50; "Validé"; "À revoir") permet d’automatiser les décisions dans vos tableaux.',
      },
    ],
    practicalExercise:
      'Construisez un tableau de devis comportant 4 colonnes : Désignation, Quantité, Prix Unitaire, et Prix Total (=Quantité*Prix Unitaire), puis calculez le total général avec =SOMME().',
    quiz: [
      {
        question: 'Par quel caractère commence obligatoirement toute formule de calcul dans Excel ?',
        options: ['#', '=', '@', '&'],
        correctIndex: 1,
        explanation: 'Le signe = indique à Excel que la cellule contient une formule à calculer.',
      },
      {
        question: 'Quelle écriture permet de figer la cellule B1 lors de la recopie d’une formule vers le bas ?',
        options: ['B1!', '$B$1', '#B#1', '[B1]'],
        correctIndex: 1,
        explanation: 'Les symboles dollar ($B$1) créent une référence absolue qui ne change pas lors de la recopie.',
      },
      {
        question: 'Quelle fonction additionne uniquement les cellules qui respectent un critère donné (ex: uniquement la catégorie "ONG") ?',
        options: ['=SOMME()', '=SOMME.SI() (ou SUMIF)', '=NBVAL()', '=MAX()'],
        correctIndex: 1,
        explanation: 'SOMME.SI additionne une plage selon une condition précise.',
      },
    ],
  },
  {
    id: 'mod_powerpoint_internet_sec',
    title: '05. PowerPoint, Internet & Cybersécurité professionnelle',
    category: 'Communication & Sécurité',
    level: 'Tous niveaux',
    duration: '60 min',
    summary: 'Présentations impactantes, recherche professionnelle, protection contre le phishing, mots de passe forts et sauvegarde 3-2-1.',
    lessons: [
      {
        title: 'Règles d’or d’une présentation PowerPoint réussie',
        content:
          'Une idée clé par diapositive, contraste élevé, polices lisibles à distance et schémas synthétiques plutôt que des murs de texte.',
      },
      {
        title: 'Hygiène numérique : Phishing, 2FA et règle de sauvegarde 3-2-1',
        content:
          'Activez toujours la double authentification (2FA) sur votre compte email professionnel, vérifiez l’adresse réelle de l’expéditeur et conservez 3 copies de vos données importantes (dont 1 dans le cloud).',
      },
    ],
    practicalExercise:
      'Vérifiez que la validation en deux étapes (2FA) est activée sur votre compte Google professionnel et planifiez une sauvegarde hebdomadaire de vos dossiers.',
    quiz: [
      {
        question: 'Qu’est-ce que l’hameçonnage (Phishing) en sécurité informatique ?',
        options: [
          'Un outil d’accélération de la connexion Internet',
          'Une tentative frauduleuse par email ou message imitant un organisme officiel pour voler vos identifiants',
          'Une mise à jour officielle de Windows',
          'Un format de compression d’image',
        ],
        correctIndex: 1,
        explanation: 'Le phishing usurpe l’identité d’un service de confiance pour dérober des mots de passe ou informations sensibles.',
      },
      {
        question: 'En quoi consiste la règle de sauvegarde 3-2-1 ?',
        options: [
          'Faire 3 copies des données, sur 2 supports différents, dont 1 hors site (cloud)',
          'Sauvegarder 3 fichiers toutes les 2 heures pendant 1 jour',
          'Utiliser 3 mots de passe de 2 lettres et 1 chiffre',
          'Éteindre son ordinateur à 3h, 2h ou 1h',
        ],
        correctIndex: 0,
        explanation: 'La règle 3-2-1 garantit qu’aucune panne matérielle ou vol d’appareil n’entraîne la perte totale de vos données.',
      },
      {
        question: 'Sur une diapositive PowerPoint professionnelle, quelle pratique est recommandée ?',
        options: [
          'Copier-coller 40 lignes de texte en taille 8',
          'Aller à l’essentiel avec des points clés courts, un bon contraste et un visuel pertinent',
          'Utiliser 9 polices différentes sur la même page',
          'Mettre du texte jaune clair sur fond blanc',
        ],
        correctIndex: 1,
        explanation: 'Une diapositive sert de support visuel clair à votre discours oral.',
      },
    ],
  },
  {
    id: 'mod_programming_basics',
    title: '06. Outils numériques & Notions de programmation moderne',
    category: 'Développement & Cloud',
    level: 'Intermédiaire',
    duration: '65 min',
    summary: 'Comprendre le Web (HTML, CSS, JavaScript/TypeScript), les bases de données, les API et l’automatisation.',
    lessons: [
      {
        title: 'Les 3 piliers d’une application Web moderne',
        content:
          'HTML structure le contenu, CSS (et Tailwind) assure la mise en page responsive, et JavaScript / TypeScript (avec React) gère la logique interactive et les états.',
      },
      {
        title: 'Frontend, Backend et Base de données persistante',
        content:
          'Le Frontend s’exécute dans le navigateur ou le téléphone du client, tandis que le Backend et la Base de données (ex: Firestore) garantissent la sécurité des règles et la persistance réelle des informations.',
      },
    ],
    practicalExercise:
      'Analysez le flux d’un calculateur de devis : quelles informations sont saisies par l’utilisateur (Entrées), quelle formule est appliquée (Traitement), et quel document est enregistré (Sortie) ?',
    quiz: [
      {
        question: 'Dans une application web, quel langage assure le typage statique et la logique interactive côté composant ?',
        options: ['HTML uniquement', 'TypeScript / JavaScript', 'JPEG', 'PDF'],
        correctIndex: 1,
        explanation: 'TypeScript ajoute un typage rigoureux à JavaScript pour fiabiliser la logique applicative.',
      },
      {
        question: 'Pourquoi ne faut-il jamais stocker une clé API secrète directement dans le code Frontend envoyé au navigateur ?',
        options: [
          'Parce qu’elle serait visible et récupérable par n’importe quel visiteur inspectant le réseau',
          'Parce que le navigateur refuse les chaînes de plus de 10 caractères',
          'Parce que cela change la couleur du site',
          'Cela n’a aucune importance',
        ],
        correctIndex: 0,
        explanation: 'Toute donnée présente dans le code client peut être inspectée ; les clés secrètes doivent rester côté serveur.',
      },
      {
        question: 'Qu’est-ce qu’une Progressive Web App (PWA) ?',
        options: [
          'Une application web moderne installable sur téléphone et ordinateur, rapide et capable de fonctionner avec un cache hors-ligne',
          'Un câble réseau spécifique',
          'Un tableur uniquement utilisable sans écran',
          'Un ancien format d’archive',
        ],
        correctIndex: 0,
        explanation: 'Une PWA combine l’accessibilité immédiate du web et l’installation native sur mobile et ordinateur.',
      },
    ],
  },
];

export async function writeAuditLog(
  actorId: string,
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string
): Promise<void> {
  const logId = generateId('audit');
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      id: logId,
      actorId,
      actorEmail: actorEmail.slice(0, 150),
      action: action.slice(0, 100),
      targetType: targetType.slice(0, 80),
      targetId: targetId.slice(0, 128),
      details: details.slice(0, 1500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logId}`);
  }
}

export async function createSystemNotification(
  recipientId: string,
  type: string,
  title: string,
  message: string,
  relatedId = ''
): Promise<void> {
  const notifId = generateId('notif');
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientId: recipientId.slice(0, 128),
      type: type.slice(0, 60),
      title: title.slice(0, 150),
      message: message.slice(0, 600),
      relatedId: relatedId.slice(0, 128),
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${notifId}`);
  }
}

export async function seedInitialCatalogToFirestore(actorId: string, actorEmail: string): Promise<void> {
  // 1. Settings
  await setDoc(doc(db, 'settings', 'main'), {
    ...INITIAL_SITE_SETTINGS,
    updatedAt: serverTimestamp(),
  });

  // 2. Services
  for (const srv of INITIAL_SERVICES) {
    await setDoc(doc(db, 'services', srv.id), {
      ...srv,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 3. Pricing Rules
  for (const prc of INITIAL_PRICING_RULES) {
    await setDoc(doc(db, 'pricing', prc.id), {
      ...prc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 4. Portfolio
  for (const item of INITIAL_PORTFOLIO) {
    await setDoc(doc(db, 'portfolio', item.id), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 5. Partners
  for (const part of INITIAL_PARTNERS) {
    await setDoc(doc(db, 'partners', part.id), {
      ...part,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 6. Subscription Plans
  for (const plan of INITIAL_SUBSCRIPTION_PLANS) {
    await setDoc(doc(db, 'subscriptionPlans', plan.id), {
      ...plan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 7. Document Templates
  for (const tpl of INITIAL_TEMPLATES) {
    await setDoc(doc(db, 'templates', tpl.id), {
      ...tpl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await writeAuditLog(
    actorId,
    actorEmail,
    'INITIALIZE_CATALOG',
    'system',
    'main',
    'Initialisation complète du référentiel BUNO Tech (Services, Tarifs, Portfolio, Partenaires, Formules Premium, Modèles).'
  );
}
