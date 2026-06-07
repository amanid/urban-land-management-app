import { useState } from "react";
import {
  BookOpen, MapPinned, Users as UsersIcon, Receipt, Banknote,
  Briefcase, LayoutDashboard, ShieldCheck, BarChart3, Award,
  Database, FileText, UserCog, Pencil, Trash2, Search, Filter,
  Download, Upload, Eye, KeyRound, Lock, Sun, Moon, ChevronRight,
  CircleCheck, Crown, AlertTriangle, MessageSquare, Tag as TagIcon,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

interface Section {
  id: string;
  title: string;
  icon: any;
  level?: 1 | 2 | 3;
}

const SECTIONS: Section[] = [
  { id: "intro", title: "Bienvenue", icon: Sparkles },
  { id: "roles", title: "Rôles et permissions", icon: UserCog },
  { id: "login", title: "Première connexion", icon: KeyRound },
  { id: "first-steps", title: "Premiers pas (30 minutes)", icon: Sparkles },
  { id: "dashboard", title: "Tableau de bord", icon: LayoutDashboard },
  { id: "lots", title: "Catalogue de lots", icon: MapPinned },
  { id: "clients", title: "Clients", icon: UsersIcon },
  { id: "sales", title: "Ventes", icon: Receipt },
  { id: "scenarios", title: "Scénarios complets pas-à-pas", icon: BookOpen },
  { id: "payments", title: "Versements", icon: Banknote },
  { id: "withdrawal", title: "Désistement & remboursement", icon: AlertTriangle },
  { id: "acquisitions", title: "Achats fonciers (Acquisitions)", icon: Briefcase },
  { id: "documents", title: "Gestion documentaire", icon: FileText },
  { id: "notes-tags", title: "Notes et étiquettes", icon: MessageSquare },
  { id: "analytics", title: "Analytics avancés", icon: BarChart3 },
  { id: "performance", title: "Performance des équipes", icon: Award },
  { id: "users", title: "Gestion des utilisateurs", icon: UsersIcon },
  { id: "audit", title: "Audit & intégrité", icon: ShieldCheck },
  { id: "maintenance", title: "Maintenance des données", icon: Database },
  { id: "search-export", title: "Recherche & exports", icon: Search },
  { id: "shortcuts", title: "Astuces & raccourcis", icon: Sparkles },
  { id: "troubleshooting", title: "Dépannage", icon: AlertTriangle },
  { id: "faq", title: "Questions fréquentes", icon: BookOpen },
];

export default function GuidePage() {
  const [active, setActive] = useState("intro");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white grid place-items-center shadow-glow">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Guide d'utilisation</h1>
          <p className="text-sm text-slate-500">
            Tout ce qu'il faut savoir pour utiliser <strong>Urban Land</strong> au quotidien.
            Cliquez sur une section dans le sommaire pour y accéder directement.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sommaire ---------------------------------------------------- */}
        <aside className="lg:sticky lg:top-20 self-start">
          <div className="card p-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={clsx(
                  "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition",
                  active === s.id ? "bg-brand-50 text-brand-700 font-semibold" : "hover:bg-slate-50",
                )}
              >
                <s.icon size={14} className="shrink-0 opacity-70" />
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Contenu ---------------------------------------------------- */}
        <main className="space-y-8 max-w-3xl">
          {/* INTRO */}
          <Section id="intro" title="Bienvenue dans Urban Land" icon={Sparkles}>
            <p>
              <strong>Urban Land</strong> est une plateforme de gestion foncière professionnelle
              spécialement conçue pour les opérateurs immobiliers en Côte d'Ivoire (et plus largement
              en Afrique francophone). Elle digitalise et sécurise l'ensemble du cycle de vie
              de vos lots, de l'achat jusqu'à la revente, en passant par la facturation et la traçabilité.
            </p>
            <h4 className="font-semibold mt-3">Ce que vous pouvez faire avec Urban Land</h4>
            <ul>
              <li>📋 <strong>Cataloguer</strong> tous vos lots urbains avec ilot, n° de lot, lotissement, ville/village/région, surface, viabilisation et prix</li>
              <li>🤝 <strong>Gérer vos clients</strong> (particuliers ET entreprises) avec leurs pièces justificatives obligatoires (CNI, RCCM)</li>
              <li>🛒 <strong>Enregistrer vos achats fonciers</strong> (auprès de propriétaires externes) pour calculer la marge</li>
              <li>💼 <strong>Enregistrer vos ventes</strong> au comptant ou par versements échelonnés (avec apport, fréquence et nombre d'échéances configurables)</li>
              <li>💰 <strong>Suivre les paiements</strong> par tout mode (espèces, chèque, traite, virement, mobile money, carte) et générer des reçus PDF certifiés</li>
              <li>⚠️ <strong>Gérer les désistements</strong> avec remboursement automatique + libération immédiate du lot</li>
              <li>📊 <strong>Piloter votre activité</strong> via des tableaux de bord et analyses temps réel (par ville, par mois, par commercial)</li>
              <li>🛡️ <strong>Sécuriser vos opérations</strong> grâce à un journal d'audit complet et un système anti-fraude par hash chain SHA-256</li>
              <li>📤 <strong>Exporter vos données</strong> en Excel ou CSV à tout moment pour votre comptabilité</li>
              <li>🌍 <strong>Travailler en équipe</strong> avec 5 rôles distincts et permissions granulaires</li>
            </ul>

            <h4 className="font-semibold mt-3">Workflow type au quotidien</h4>
            <div className="card p-3 my-2 bg-slate-50 text-xs">
              <strong>1.</strong> Acheter un terrain → <strong>2.</strong> L'ajouter au catalogue (avec son prix d'achat) →{" "}
              <strong>3.</strong> Recevoir un prospect → <strong>4.</strong> L'enregistrer comme client (avec sa pièce d'identité) →{" "}
              <strong>5.</strong> Créer la vente (comptant ou échelonnée) → <strong>6.</strong> Confirmer pour générer l'échéancier →{" "}
              <strong>7.</strong> Encaisser les versements et imprimer les reçus → <strong>8.</strong> Solder la vente →{" "}
              <strong>9.</strong> Suivre la performance au dashboard
            </div>

            <CalloutSuccess>
              <strong>Bonne pratique :</strong> commencez toujours par ajouter votre catalogue de lots,
              puis vos clients, et créez les ventes ensuite. Cette séquence garantit que vos identifiants
              (références) restent cohérents et exploitables.
            </CalloutSuccess>
            <CalloutInfo>
              <strong>Compatibilité :</strong> Urban Land fonctionne sur tous les navigateurs modernes
              (Chrome 90+, Firefox 90+, Edge 90+, Safari 14+) et s'adapte automatiquement aux écrans
              de bureau, tablettes et smartphones.
            </CalloutInfo>
          </Section>

          {/* ROLES */}
          <Section id="roles" title="Rôles et permissions" icon={UserCog}>
            <p>
              L'application gère <strong>5 profils</strong> avec une cascade hiérarchique :
              chaque rôle hérite des capacités des rôles inférieurs.
            </p>
            <div className="card p-3 my-3 bg-slate-50/60">
              <div className="text-xs font-mono text-center">
                Super Admin ⊇ Admin ⊇ {"{Agent commercial, Caissier}"} ⊇ Lecteur
              </div>
            </div>
            <RoleTable />
            <CalloutInfo>
              <strong>Cascade automatique :</strong> un Admin peut toujours faire ce qu'un Agent commercial
              ou un Caissier peut faire. Un Super Admin peut tout faire, y compris la maintenance des données.
            </CalloutInfo>
          </Section>

          {/* LOGIN */}
          <Section id="login" title="Première connexion" icon={KeyRound}>
            <ol>
              <li>Ouvrez l'application dans votre navigateur (Chrome, Firefox, Edge, Safari…)</li>
              <li>Sur la page de connexion, saisissez votre <strong>adresse e-mail professionnelle</strong> et votre <strong>mot de passe initial</strong> communiqué par l'administrateur</li>
              <li>Cliquez sur <Pill>Se connecter</Pill></li>
              <li>Au premier accès, allez immédiatement dans <Pill>Mon profil → Mot de passe</Pill> pour le personnaliser</li>
            </ol>
            <CalloutWarning>
              <strong>Sécurité :</strong> ne partagez jamais votre mot de passe. En cas d'oubli, demandez à
              un administrateur de le réinitialiser depuis la page <strong>Utilisateurs</strong>.
            </CalloutWarning>
            <p className="mt-3">Comptes de démonstration fournis par défaut :</p>
            <table className="table-clean text-xs">
              <thead><tr><th>Rôle</th><th>Email</th><th>Accès</th></tr></thead>
              <tbody>
                <tr><td><span className="pill-danger">Super Admin</span></td><td className="font-mono">superadmin@urban-land.local</td><td>Tout + maintenance</td></tr>
                <tr><td><span className="pill-info">Admin</span></td><td className="font-mono">admin@urban-land.local</td><td>Tout sauf maintenance</td></tr>
                <tr><td><span className="pill-success">Agent</span></td><td className="font-mono">agent@urban-land.local</td><td>Lots, clients, ventes</td></tr>
                <tr><td><span className="pill-warning">Caissier</span></td><td className="font-mono">caisse@urban-land.local</td><td>Versements</td></tr>
                <tr><td><span className="pill-muted">Lecteur</span></td><td className="font-mono">lecteur@urban-land.local</td><td>Lecture seule</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">Mot de passe initial commun : <code>UrbanLand!2026</code> (à changer dès la première connexion).</p>
          </Section>

          {/* FIRST STEPS */}
          <Section id="first-steps" title="Premiers pas (30 minutes)" icon={Sparkles}>
            <p>
              Pour démarrer rapidement, suivez ces 8 étapes. Comptez environ 30 minutes pour avoir
              une application opérationnelle avec vos vraies données.
            </p>

            <h4 className="font-semibold mt-3">⏱️ Étape 1 — Configurer votre identité d'entreprise (5 min)</h4>
            <ol>
              <li>Demandez à votre <strong>Super Administrateur</strong> de renseigner les variables d'environnement de l'API :
                <code>COMPANY_NAME</code>, <code>COMPANY_ADDRESS</code>, <code>COMPANY_PHONE</code>, <code>COMPANY_EMAIL</code>, <code>COMPANY_RCCM</code></li>
              <li>Ces informations apparaîtront en haut de tous vos <strong>reçus</strong> et <strong>contrats PDF</strong></li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 2 — Créer les comptes des collaborateurs (5 min)</h4>
            <ol>
              <li>Connectez-vous en <strong>Admin</strong> ou <strong>Super Admin</strong></li>
              <li>Sidebar → <Pill>Utilisateurs</Pill> → <Pill>Nouvel utilisateur</Pill></li>
              <li>Créez un compte pour chaque collaborateur avec le bon rôle :
                <ul>
                  <li>Vos commerciaux → rôle <Pill>Agent commercial</Pill></li>
                  <li>Votre/vos caissier(s) → rôle <Pill>Caissier</Pill></li>
                  <li>Vos contrôleurs / managers → rôle <Pill>Administrateur</Pill></li>
                </ul>
              </li>
              <li>Communiquez à chacun ses identifiants + le mot de passe initial</li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 3 — Ajouter vos premiers lots (10 min)</h4>
            <ol>
              <li>Sidebar → <Pill>Catalogue de lots</Pill> → <Pill>Nouveau lot</Pill></li>
              <li>Remplissez : titre, région, ville/village, lotissement, ilot, n° de lot, surface, prix d'achat (COGS) et prix de vente affiché</li>
              <li>Cochez la viabilisation</li>
              <li>📎 Joignez obligatoirement le titre foncier ou le plan cadastral</li>
              <li>Cliquez <Pill>Créer le lot</Pill></li>
              <li>Recommencez pour chaque lot disponible</li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 4 — Enregistrer vos clients (5 min/client)</h4>
            <ol>
              <li>Sidebar → <Pill>Clients</Pill> → <Pill>Nouveau client</Pill></li>
              <li>Particulier : prénom, nom, type de pièce + numéro, contact</li>
              <li>Entreprise : raison sociale, RCCM, personne à contacter</li>
              <li>📎 Joignez obligatoirement la copie de la pièce d'identité</li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 5 — Créer votre première vente (3 min)</h4>
            <ol>
              <li>Sidebar → <Pill>Ventes</Pill> → <Pill>Nouvelle vente</Pill></li>
              <li>Filtrez la localisation pour trouver le lot</li>
              <li>Sélectionnez le lot (le prix s'auto-remplit)</li>
              <li>Recherchez le client</li>
              <li>Choisissez Comptant ou Échelonné (+ apport, nombre d'échéances, fréquence)</li>
              <li>Cliquez <Pill>Créer la vente</Pill> puis <Pill>Confirmer</Pill> pour générer l'échéancier</li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 6 — Encaisser un versement (1 min)</h4>
            <ol>
              <li>Sur la fiche de la vente → <Pill>Versement</Pill></li>
              <li>Montant + mode (Espèces/Chèque/Traite/Virement/Mobile Money)</li>
              <li>Saisissez la référence</li>
              <li><Pill>Enregistrer</Pill> → le reçu PDF est disponible immédiatement</li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 7 — Imprimer un reçu (30 sec)</h4>
            <ol>
              <li>Sur la fiche de la vente, table des versements → <Pill>Reçu PDF</Pill></li>
              <li>Le PDF s'ouvre dans un nouvel onglet</li>
              <li>Utilisez <kbd className="text-[10px] bg-slate-100 border rounded px-1">Ctrl+P</kbd> pour imprimer ou <Pill>Télécharger</Pill> pour sauvegarder</li>
            </ol>

            <h4 className="font-semibold mt-3">⏱️ Étape 8 — Consulter votre tableau de bord (1 min)</h4>
            <ol>
              <li>Sidebar → <Pill>Tableau de bord</Pill></li>
              <li>Vérifiez vos KPIs, la performance par ville, l'analyse mensuelle</li>
              <li>Bravo — votre application est en production !</li>
            </ol>

            <CalloutSuccess>
              <strong>🎯 Objectif :</strong> en 30 minutes, vous avez configuré l'app, créé 1 lot,
              1 client, 1 vente, encaissé 1 versement et imprimé 1 reçu. C'est le cycle métier complet.
            </CalloutSuccess>
          </Section>

          {/* DASHBOARD */}
          <Section id="dashboard" title="Tableau de bord" icon={LayoutDashboard}>
            <p>
              Le tableau de bord s'adapte automatiquement à votre profil :
            </p>
            <h4 className="font-semibold mt-3">Pour les <span className="text-brand-700">Agents commerciaux</span> et <span className="text-amber-700">Caissiers</span></h4>
            <ul>
              <li><strong>Bandeau d'accueil personnel</strong> : nombre de vos ventes en cours + CA encaissé ce mois</li>
              <li><strong>4 indicateurs clés</strong> : vos dossiers, encaissements mensuels, solde à recouvrer, lots disponibles</li>
              <li><strong>Graphique des encaissements</strong> sur 14 jours</li>
              <li><strong>Classement du mois</strong> des commerciaux</li>
              <li><strong>Vos échéances à venir</strong> (table des paiements clients attendus)</li>
            </ul>
            <h4 className="font-semibold mt-4">Pour les <span className="text-rose-700">Administrateurs</span> et <span className="text-rose-700">Super Admin</span></h4>
            <ul>
              <li><strong>Bandeau Direction</strong> avec CA Année / Mois / Marge</li>
              <li><strong>2 lignes de 4 KPIs</strong> : chiffre d'affaires, marge brute, encours, inventaire, clients, signaux fraude</li>
              <li><strong>Alertes anti-fraude</strong> (niveaux critique/élevé/moyen/faible) avec recommandations</li>
              <li><strong>Évolution CA sur 12 mois</strong></li>
              <li><strong>Pipeline des ventes</strong> (camembert par statut)</li>
              <li><strong>📅 Analyse mensuelle</strong> : ventes, marge, nouveaux clients, désistements par mois</li>
              <li><strong>🗺️ Performance par ville/village</strong> : disponibilité + CA + marge par localité</li>
              <li><strong>📡 Fil d'activité temps réel</strong> : actions équipe (rafraîchi toutes les 30 sec)</li>
              <li><strong>Top commerciaux</strong> + classement annuel</li>
              <li><strong>Ancienneté des impayés</strong> par tranche</li>
            </ul>
            <CalloutInfo>
              <strong>Astuce :</strong> les administrateurs peuvent cliquer <Pill>Voir sa vue</Pill> à côté
              d'un collaborateur dans le panneau <em>"Performance par collaborateur"</em> pour observer son
              tableau de bord personnel — sans usurper son compte.
            </CalloutInfo>
          </Section>

          {/* LOTS */}
          <Section id="lots" title="Catalogue de lots" icon={MapPinned}>
            <p>Le catalogue regroupe tous les terrains que vous proposez à la vente.</p>
            <h4 className="font-semibold mt-3">Visualiser</h4>
            <ul>
              <li><strong>4 compteurs en-tête</strong> : Total / Disponibles / Réservés / Vendus</li>
              <li><strong>Bouton bascule</strong> en haut à droite : vue <Pill>Cartes</Pill> (visuelle avec photos) ou <Pill>Tableau</Pill> (synthétique)</li>
              <li><strong>Recherche</strong> par référence, ville, ilot, lotissement, etc.</li>
              <li><strong>Filtre par statut</strong> : Disponible / Réservé / Vendu / Litige / Retiré</li>
            </ul>
            <h4 className="font-semibold mt-4">Créer un nouveau lot <span className="pill-success ml-1">Agent +</span></h4>
            <ol>
              <li>Cliquez <Pill>Nouveau lot</Pill> en haut à droite</li>
              <li>Renseignez la <strong>désignation</strong> (titre du lot)</li>
              <li>Précisez la localisation : <strong>Région</strong>, <strong>Ville</strong> (saisie libre — la ville est créée automatiquement si elle n'existe pas), <strong>Village</strong>, <strong>Quartier</strong></li>
              <li>Saisissez le <strong>nom du lotissement</strong>, l'<strong>ilot</strong>, le <strong>numéro de lot</strong></li>
              <li>Sélectionnez le <strong>type</strong> (Résidentiel/Commercial/Industriel/Agricole/Mixte)</li>
              <li>Indiquez la <strong>surface en m²</strong> et le <strong>prix de vente affiché</strong></li>
              <li>Cochez la <strong>viabilisation</strong> disponible (Eau, Électricité, Voirie, Titre foncier)</li>
              <li>📎 <strong>Joindre un document justificatif obligatoire</strong> (Titre foncier, Plan cadastral…)</li>
              <li>Cliquez <Pill>Créer le lot</Pill> — la référence sémantique est générée automatiquement (ex: <code>LOT-ABI-2026-XXXXXXXX</code>)</li>
            </ol>
            <h4 className="font-semibold mt-4">Modifier un lot <span className="pill-success ml-1">Agent +</span></h4>
            <ol>
              <li>Ouvrez la fiche du lot</li>
              <li>Cliquez <Pill><Pencil size={11} /> Modifier</Pill> en haut à droite</li>
              <li>Ajustez les champs nécessaires</li>
              <li><strong>Indiquez obligatoirement un motif</strong> de modification dans la zone jaune (≥ 5 caractères)</li>
              <li>Cliquez <Pill>Enregistrer la modification</Pill></li>
            </ol>
            <h4 className="font-semibold mt-4">Supprimer un lot <span className="pill-info ml-1">Admin +</span></h4>
            <p>
              Bouton <Pill><Trash2 size={11} /> Supprimer</Pill> (rouge). Saisissez un motif puis confirmez.
              ⚠️ Impossible si le lot a déjà des ventes — annulez les ventes d'abord.
            </p>
          </Section>

          {/* CLIENTS */}
          <Section id="clients" title="Clients" icon={UsersIcon}>
            <p>Deux types de clients sont supportés : <strong>Particulier</strong> et <strong>Entreprise</strong>.</p>
            <h4 className="font-semibold mt-3">Particulier</h4>
            <ul>
              <li>Prénom, Nom, Date de naissance, Lieu de naissance, Nationalité, Profession</li>
              <li>Email (optionnel), Téléphone (optionnel), Téléphone secondaire (optionnel)</li>
              <li>Pièce d'identité obligatoire : <strong>CNI / Passeport / Permis / Carte de séjour</strong></li>
            </ul>
            <h4 className="font-semibold mt-3">Entreprise</h4>
            <ul>
              <li><strong>Raison sociale</strong> (obligatoire)</li>
              <li><strong>Registre de commerce (RCCM)</strong> (obligatoire) — format : <code>CI-ABJ-2024-B-12345</code></li>
              <li><strong>Personne à contacter</strong> au sein de l'entreprise</li>
            </ul>
            <h4 className="font-semibold mt-4">Créer un client <span className="pill-success ml-1">Agent +</span></h4>
            <ol>
              <li>Page <Pill>Clients</Pill> → <Pill>Nouveau client</Pill></li>
              <li>Choisissez <strong>Particulier</strong> ou <strong>Entreprise</strong></li>
              <li>Remplissez les champs (téléphone et email sont facultatifs)</li>
              <li>📎 <strong>Joignez obligatoirement la copie de la pièce d'identité</strong> (CNI / passeport / RCCM)</li>
              <li>Cliquez <Pill>Créer le client</Pill> — un code unique <code>CLT-2026-XXXXXXXX</code> est généré</li>
            </ol>
            <CalloutInfo>
              <strong>Un client = une fiche unique.</strong> Un même client peut acheter plusieurs biens sans
              être recréé. Lors d'une vente, utilisez la <strong>recherche client</strong> pour le retrouver.
            </CalloutInfo>
          </Section>

          {/* SALES */}
          <Section id="sales" title="Ventes" icon={Receipt}>
            <p>
              Le cycle d'une vente passe par 5 statuts : <strong>Brouillon</strong> → <strong>Réservé</strong> →
              <strong> En cours</strong> → <strong>Soldée</strong> (ou Annulée / Désistement).
            </p>
            <h4 className="font-semibold mt-3">Créer une vente <span className="pill-success ml-1">Agent +</span></h4>
            <ol>
              <li>Page <Pill>Ventes</Pill> → <Pill>Nouvelle vente</Pill></li>
              <li><strong>Filtrez la localisation du bien</strong> : Région, Ville, Village, Lotissement
                  → le badge bleu affiche en direct le <strong>nombre de lots disponibles</strong></li>
              <li>Sélectionnez le <strong>lot</strong> dans la liste (l'ilot, le numéro et la référence sont affichés)
                  → le prix de vente s'auto-remplit</li>
              <li><strong>Recherchez le client</strong> : 🔍 tapez un nom, email, téléphone ou code → sélectionnez-le</li>
              <li>Choisissez le <strong>mode de paiement</strong> :
                <ul>
                  <li><strong>Comptant</strong> : 1 seule échéance immédiate</li>
                  <li><strong>Échelonné</strong> : précisez l'<em>apport initial</em>, le <em>nombre d'échéances</em> et la <em>fréquence</em> (en jours)</li>
                </ul>
              </li>
              <li>Cliquez <Pill>Créer la vente</Pill> → la vente passe en statut <Pill>Brouillon</Pill></li>
            </ol>
            <h4 className="font-semibold mt-4">Confirmer la vente</h4>
            <p>
              Sur la fiche de la vente, cliquez <Pill><CircleCheck size={11} /> Confirmer</Pill>. Effets :
            </p>
            <ul>
              <li>La vente passe en statut <Pill>Réservé</Pill></li>
              <li>Le <strong>lot</strong> passe en <Pill>Réservé</Pill> (plus disponible pour d'autres ventes)</li>
              <li>L'<strong>échéancier</strong> est généré automatiquement (apport + N échéances espacées)</li>
            </ul>
            <h4 className="font-semibold mt-4">Joindre les pièces du dossier</h4>
            <ul>
              <li>Section <strong>"Pièces du dossier de vente"</strong> → bouton <Pill><Upload size={11} /> Joindre un document</Pill></li>
              <li>Types : Contrat signé · Pièce d'identité de l'acheteur · Justificatif de domicile · Procuration…</li>
              <li>Chaque pièce peut être <Pill><Eye size={11} /> Vue</Pill>, <Pill><Download size={11} /> Téléchargée</Pill> ou <Pill><Trash2 size={11} /> Supprimée</Pill> (admin)</li>
            </ul>
            <h4 className="font-semibold mt-4">Imprimer le contrat de vente</h4>
            <p>
              Bouton <Pill>Contrat PDF</Pill> sur la fiche de la vente → PDF élégant avec :
              désignation du lot, conditions financières, échéancier, articles de loi, zones de signature.
            </p>
          </Section>

          {/* SCENARIOS */}
          <Section id="scenarios" title="Scénarios complets pas-à-pas" icon={BookOpen}>
            <p>
              Quatre cas d'usage typiques détaillés étape par étape, avec les actions à
              effectuer et les écrans à consulter.
            </p>

            <h4 className="font-semibold mt-4 text-brand-700">📌 Scénario 1 : Vente comptant simple</h4>
            <p className="text-xs text-slate-500 mb-2">Profil : Agent commercial. Durée : ~3 min.</p>
            <ol>
              <li>Le client M. Konan vient acheter un lot au comptant à 8 000 000 FCFA</li>
              <li>Vous savez qu'il est déjà enregistré (CLT-2026-...). S'il n'est pas enregistré, allez d'abord dans <Pill>Clients</Pill> → <Pill>Nouveau client</Pill></li>
              <li>Sidebar → <Pill>Ventes</Pill> → <Pill>Nouvelle vente</Pill></li>
              <li>Filtrez Région = "Lagunes" → la liste se réduit aux lots de Lagunes</li>
              <li>Sélectionnez le lot souhaité — le prix se remplit automatiquement</li>
              <li>Tapez "Konan" dans la barre de recherche client → sélectionnez-le</li>
              <li>Mode = <strong>Comptant</strong></li>
              <li>Cliquez <Pill>Créer la vente</Pill> → statut <Pill>Brouillon</Pill></li>
              <li>Sur la fiche de la vente, cliquez <Pill>Confirmer</Pill> → statut <Pill>Réservé</Pill>, 1 échéance générée</li>
              <li>Le client paie 8 000 000 en espèces → cliquez <Pill>Versement</Pill></li>
              <li>Montant : 8 000 000, mode : Espèces, référence : "Liquide reçu en main"</li>
              <li><Pill>Enregistrer</Pill> → vente passe automatiquement en <Pill>Soldée</Pill>, le lot devient <Pill>Vendu</Pill></li>
              <li>Cliquez <Pill>Reçu PDF</Pill> → imprimez et remettez au client</li>
              <li>Joignez la pièce d'identité signée au dossier via la section <Pill>Pièces du dossier</Pill></li>
            </ol>

            <h4 className="font-semibold mt-4 text-brand-700">📌 Scénario 2 : Vente échelonnée sur 6 mois</h4>
            <p className="text-xs text-slate-500 mb-2">Profil : Agent commercial + Caissier. Durée totale : 6 mois.</p>
            <ol>
              <li>Mme Aya achète un lot à 12 000 000 FCFA</li>
              <li>Apport initial : 3 000 000 FCFA. Solde 9 000 000 en 6 mensualités de 1 500 000</li>
              <li><Pill>Ventes</Pill> → <Pill>Nouvelle vente</Pill> → sélectionnez lot + client</li>
              <li>Mode = <strong>Échelonné</strong>, Apport = 3 000 000, Nb échéances = 6, Fréquence = 30 jours</li>
              <li><Pill>Créer la vente</Pill> → <Pill>Confirmer</Pill> → l'échéancier de 7 lignes (apport + 6 mensualités) est généré</li>
              <li>Le caissier encaisse l'apport : <Pill>Versement</Pill> 3 000 000, Mode = "Mobile Money", Réf = "MM-TRX-XX"</li>
              <li>Tous les 30 jours, le caissier encaisse 1 500 000 :
                <ul>
                  <li>L'application met l'échéance correspondante à "Soldée"</li>
                  <li>Le solde restant se met à jour automatiquement</li>
                </ul>
              </li>
              <li>Après 6 mois, le dernier versement passe la vente en <Pill>Soldée</Pill> et le lot en <Pill>Vendu</Pill></li>
              <li>L'administrateur peut imprimer le <Pill>Relevé PDF</Pill> à tout moment pour montrer au client l'historique</li>
            </ol>

            <h4 className="font-semibold mt-4 text-brand-700">📌 Scénario 3 : Désistement après 2 versements</h4>
            <p className="text-xs text-slate-500 mb-2">Profil : Administrateur. Durée : 5 min.</p>
            <ol>
              <li>Mme Aya (scénario 2) a perdu son emploi après 2 mensualités. Elle souhaite se désister.</li>
              <li>Elle a versé : 3 000 000 (apport) + 2 × 1 500 000 = <strong>6 000 000 FCFA</strong></li>
              <li>Sur la fiche de la vente, cliquez <Pill>Désistement acheteur</Pill></li>
              <li>Dans la modale, tapez le motif : "Perte d'emploi en juin 2026 — attestation jointe"</li>
              <li>Cliquez <Pill>Enregistrer le désistement</Pill></li>
              <li>Effets automatiques :
                <ul>
                  <li>Pénalité de 10 % : <strong>600 000 FCFA</strong> retenus</li>
                  <li>Remboursement à effectuer : <strong>5 400 000 FCFA</strong></li>
                  <li>Un versement de remboursement est créé (apparaît en rose avec mention "Remboursement")</li>
                  <li>Le lot redevient <Pill>Disponible</Pill> immédiatement — utilisable pour une nouvelle vente</li>
                  <li>La vente passe en <Pill>Désistement acheteur</Pill></li>
                </ul>
              </li>
              <li>L'administrateur effectue le virement bancaire de 5 400 000 FCFA en banque</li>
              <li>Le bandeau jaune sur la fiche rappelle le motif et le statut "À effectuer" → "Effectué"</li>
              <li>Le lot peut maintenant être revendu à un autre client, même à un prix différent</li>
            </ol>

            <h4 className="font-semibold mt-4 text-brand-700">📌 Scénario 4 : Revente d'un lot après désistement</h4>
            <p className="text-xs text-slate-500 mb-2">Profil : Agent commercial. Durée : 3 min.</p>
            <ol>
              <li>Suite au scénario 3, le lot d'Aya est de nouveau disponible</li>
              <li>M. Yao s'intéresse à ce même lot et propose 13 000 000 FCFA (prix supérieur car le marché a évolué)</li>
              <li>Sidebar → <Pill>Catalogue de lots</Pill> → ouvrez la fiche → <Pill>Modifier</Pill></li>
              <li>Mettez à jour le prix de vente affiché : 13 000 000</li>
              <li>Indiquez le motif : "Revalorisation après désistement précédent" → <Pill>Enregistrer</Pill></li>
              <li>Sidebar → <Pill>Ventes</Pill> → <Pill>Nouvelle vente</Pill></li>
              <li>Sélectionnez le lot, recherchez M. Yao, créez la vente</li>
              <li>L'historique du lot (section <Pill>Historique</Pill> sur sa fiche) montre les deux ventes successives</li>
            </ol>

            <CalloutInfo>
              <strong>💡 Le saviez-vous ?</strong> Tous ces scénarios sont enregistrés dans le{" "}
              <strong>journal d'audit</strong> avec horodatage, utilisateur, IP et motif obligatoire.
              Vous pouvez retracer absolument toute l'histoire de chaque lot et de chaque client à tout moment.
            </CalloutInfo>
          </Section>

          {/* PAYMENTS */}
          <Section id="payments" title="Versements" icon={Banknote}>
            <p>
              Toutes les entrées de cash (apport, échéances, soldes anticipés) sont enregistrées
              comme <strong>versements</strong> attachés à une vente.
            </p>
            <h4 className="font-semibold mt-3">Enregistrer un versement <span className="pill-warning ml-1">Caissier +</span></h4>
            <ol>
              <li>Ouvrez la fiche de la vente concernée</li>
              <li>Cliquez <Pill>Versement</Pill> (en haut à droite)</li>
              <li>Saisissez le <strong>montant</strong> (prérempli avec le solde restant)</li>
              <li>Sélectionnez le <strong>mode</strong> :
                <ul>
                  <li><strong>Espèces</strong> — paiement en cash</li>
                  <li><strong>Chèque</strong> — saisir le numéro de chèque</li>
                  <li><strong>Traite</strong> — bordereau de paiement bancaire</li>
                  <li><strong>Virement bancaire</strong> — référence du virement</li>
                  <li><strong>Mobile Money</strong> — référence de la transaction</li>
                  <li><strong>Carte bancaire</strong></li>
                </ul>
              </li>
              <li>Saisissez la <strong>référence</strong> (N° chèque, ref Mobile Money…)</li>
              <li>Cliquez <Pill>Enregistrer</Pill></li>
            </ol>
            <p>
              → Un <strong>reçu</strong> unique est généré : <code>REC-AAAAMMJJ-XXXXXXXX</code><br />
              → Une <strong>empreinte SHA-256</strong> est calculée et chaînée au versement précédent (anti-fraude)
            </p>
            <h4 className="font-semibold mt-4">Solde intégral anticipé</h4>
            <p>
              Bouton <Pill>Solder intégralement</Pill> sur la fiche de la vente. Crée un versement
              du <strong>montant exact du solde restant</strong> en un clic. Idéal pour les clients qui paient en avance.
            </p>
            <h4 className="font-semibold mt-4">Renégocier l'échéancier</h4>
            <p>
              Bouton <Pill>Renégocier</Pill>. Modifiez nombre d'échéances + fréquence — l'échéancier
              <strong> futur</strong> est recalculé. Les versements déjà enregistrés sont conservés.
            </p>
            <h4 className="font-semibold mt-4">Imprimer un reçu</h4>
            <p>
              Sur la fiche de la vente (table des versements) ou sur la page <Pill>Versements</Pill>,
              cliquez <Pill>Reçu PDF</Pill>. Le PDF inclut : payeur, montant en lettres, mode, référence,
              cumul payé/solde, empreinte d'intégrité.
            </p>
          </Section>

          {/* WITHDRAWAL */}
          <Section id="withdrawal" title="Désistement & remboursement" icon={AlertTriangle}>
            <p>
              Un client (ou la société) peut <strong>se rétracter</strong> en cours de vente échelonnée.
              L'application gère le désistement + le remboursement automatique.
            </p>
            <h4 className="font-semibold mt-3">Procédure <span className="pill-info ml-1">Admin +</span></h4>
            <ol>
              <li>Sur la fiche de la vente, cliquez <Pill>Désistement acheteur</Pill> ou <Pill>Désistement vendeur</Pill></li>
              <li>Une modale s'ouvre — saisissez le <strong>motif obligatoire</strong> (perte d'emploi, litige…)</li>
              <li>Cliquez <Pill>Enregistrer le désistement</Pill></li>
            </ol>
            <h4 className="font-semibold mt-3">Effets automatiques</h4>
            <ul>
              <li>Statut de la vente → <Pill>Désistement acheteur</Pill> ou <Pill>Désistement vendeur</Pill></li>
              <li>Le lot est <strong>immédiatement libéré</strong> et redevient <Pill>Disponible</Pill> pour une nouvelle transaction</li>
              <li>Une <strong>pénalité de 10 %</strong> est retenue par défaut sur les versements déjà encaissés</li>
              <li>Un <strong>versement de remboursement</strong> est créé automatiquement pour le solde net à reverser au client</li>
              <li>Un <strong>bandeau jaune</strong> apparaît en haut de la fiche avec tous les détails</li>
            </ul>
            <CalloutInfo>
              <strong>Note :</strong> le lot peut être revendu immédiatement à un autre client, éventuellement
              à un prix différent. Le désistement est tracé dans le journal d'audit avec son motif.
            </CalloutInfo>
          </Section>

          {/* ACQUISITIONS */}
          <Section id="acquisitions" title="Achats fonciers (Acquisitions)" icon={Briefcase}>
            <p>
              Les <strong>Acquisitions</strong> sont l'<u>opposé des Ventes</u> : il s'agit
              de l'<strong>achat</strong> par votre société d'un terrain auprès d'un vendeur externe,
              pour alimenter votre stock à revendre.
            </p>
            <div className="card p-4 bg-amber-50/40 border border-amber-200 my-3">
              <strong>Différence clé</strong>
              <ul className="mt-2 text-sm">
                <li>🛒 <strong>Acquisition</strong> = sortie de cash (votre société paie un propriétaire)</li>
                <li>💼 <strong>Vente</strong> = entrée de cash (votre client vous paie)</li>
                <li>📈 Marge brute = Ventes − Acquisitions par lot</li>
              </ul>
            </div>
            <h4 className="font-semibold mt-3">Enregistrer un achat foncier <span className="pill-info ml-1">Admin +</span></h4>
            <ol>
              <li>Créez d'abord le lot dans le <Pill>Catalogue</Pill> (avec son prix d'achat = COGS)</li>
              <li>Allez sur <Pill>Acquisitions</Pill> → <Pill>Nouvelle acquisition</Pill></li>
              <li>Sélectionnez le lot concerné</li>
              <li>Saisissez le <strong>nom du vendeur</strong> (ou choisissez un client existant)</li>
              <li>Indiquez le <strong>montant payé</strong> et la <strong>date d'acquisition</strong></li>
              <li>Validez — un identifiant <code>ACQ-2026-XXXXXXXX</code> est généré</li>
            </ol>
            <CalloutSuccess>
              <strong>Conseil :</strong> renseignez systématiquement le prix d'achat d'un lot lors de
              sa création — cela permet à l'application de calculer la marge brute par lot, par ville
              et par lotissement dans le dashboard Direction.
            </CalloutSuccess>
          </Section>

          {/* DOCUMENTS */}
          <Section id="documents" title="Gestion documentaire" icon={FileText}>
            <p>
              Chaque entité (lot, client, vente) peut porter ses propres documents :
            </p>
            <table className="table-clean text-xs">
              <thead><tr><th>Entité</th><th>Types disponibles</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Lot</strong></td>
                  <td>Titre foncier · Plan cadastral · Levé topographique · Acte d'achat · Évaluation · Permis de construire · Photo aérienne · Attestation viabilisation</td>
                </tr>
                <tr>
                  <td><strong>Client</strong></td>
                  <td>CNI · Passeport · Permis · Carte séjour · Justificatif domicile · Relevé bancaire · Procuration · Contrats</td>
                </tr>
                <tr>
                  <td><strong>Vente</strong></td>
                  <td>Contrat signé · Pièce d'identité acheteur · Justificatif domicile · Procuration · Plan cadastral · Preuve paiement</td>
                </tr>
              </tbody>
            </table>
            <h4 className="font-semibold mt-3">Actions sur chaque document</h4>
            <ul>
              <li><Pill><Eye size={11} /> Voir</Pill> — ouvre le document dans un nouvel onglet</li>
              <li><Pill><Download size={11} /> Télécharger</Pill> — enregistre le fichier sur votre ordinateur</li>
              <li><Pill><Trash2 size={11} /> Supprimer</Pill> — réservé aux administrateurs, avec motif</li>
            </ul>
            <CalloutWarning>
              <strong>Confidentialité :</strong> les documents (CNI, contrats…) sont stockés de façon sécurisée.
              Toute consultation est tracée dans le journal d'audit avec l'identifiant de l'utilisateur et son IP.
            </CalloutWarning>
          </Section>

          {/* NOTES & TAGS */}
          <Section id="notes-tags" title="Notes et étiquettes" icon={MessageSquare}>
            <p>
              Annotez n'importe quelle fiche (lot, client, vente) avec des <strong>notes libres</strong>
              et des <strong>étiquettes</strong> de catégorisation.
            </p>
            <h4 className="font-semibold mt-3">Ajouter une note</h4>
            <ol>
              <li>En bas de la fiche, section <Pill><MessageSquare size={11} /> Notes</Pill></li>
              <li>Saisissez votre commentaire</li>
              <li>Choisissez la <strong>visibilité</strong> :
                <ul>
                  <li>🤝 <strong>Équipe</strong> — visible par tous les collaborateurs</li>
                  <li>🔒 <strong>Privée</strong> — visible par vous uniquement</li>
                </ul>
              </li>
              <li>Cliquez <Pill>Publier</Pill></li>
            </ol>
            <p className="mt-3">Vous pouvez <strong>épingler</strong> 📌 une note importante en haut de la liste.</p>
            <h4 className="font-semibold mt-3">Appliquer une étiquette</h4>
            <ul>
              <li>Section <Pill><TagIcon size={11} /> Étiquettes</Pill> sur la fiche</li>
              <li>Cliquez sur <Pill>+ Ajouter</Pill> et choisissez une étiquette existante (VIP, Litige, Prioritaire…)</li>
              <li>Les étiquettes sont <strong>réutilisables</strong> sur plusieurs entités</li>
            </ul>
          </Section>

          {/* ANALYTICS */}
          <Section id="analytics" title="Analytics avancés" icon={BarChart3}>
            <p>
              Page <Pill>Analytics avancés</Pill> dans Administration. <em>Admin + uniquement.</em>
            </p>
            <ul>
              <li><strong>Performance vs target</strong> — CA YTD, attendu à date, % de réalisation</li>
              <li><strong>Prévision de trésorerie (90 jours)</strong> — encaissements attendus + moyenne mobile + volatilité</li>
              <li><strong>Funnel de conversion</strong> — Catalogue → Disponibles → Réservés → En cours → Vendus</li>
              <li><strong>Cohortes clients</strong> — CA généré par mois d'acquisition</li>
              <li><strong>Scoring de risque client</strong> — détecte les clients en retard, top 25</li>
              <li><strong>Marge par ville</strong> — graphique en barres</li>
              <li><strong>Anomalies & outliers</strong> — versements anormaux statistiquement (mean + 2σ)</li>
              <li><strong>Vélocité des ventes</strong> — délai moyen pour solder un dossier</li>
            </ul>
          </Section>

          {/* PERFORMANCE */}
          <Section id="performance" title="Performance des équipes" icon={Award}>
            <p>
              Page <Pill>Performance équipe</Pill>. Tableau détaillé par collaborateur avec :
              dossiers, CA brut, encaissé, solde, encaissé du mois, dernière connexion.
            </p>
            <p className="mt-2">
              Bouton <Pill><Eye size={11} /> Voir sa vue</Pill> : consultez le tableau de bord d'un commercial
              pour comprendre ses chantiers en cours (mode observation, vous n'agissez pas en son nom).
            </p>
          </Section>

          {/* USERS */}
          <Section id="users" title="Gestion des utilisateurs" icon={UsersIcon}>
            <h4 className="font-semibold">Créer un utilisateur <span className="pill-info ml-1">Admin +</span></h4>
            <ol>
              <li>Page <Pill>Utilisateurs</Pill> → <Pill>Nouvel utilisateur</Pill></li>
              <li>Remplissez prénom, nom, email, identifiant de connexion</li>
              <li>Téléphone optionnel</li>
              <li>Choisissez le <strong>rôle</strong> qui définit ses permissions</li>
              <li>Saisissez un <strong>mot de passe initial</strong> (≥ 8 caractères)</li>
              <li>Cliquez <Pill>Créer</Pill></li>
            </ol>
            <h4 className="font-semibold mt-3">Bloquer / débloquer un compte</h4>
            <p>
              Bouton <Pill><Lock size={11} /> Bloquer</Pill> dans la liste. Pour réactiver, <Pill>Débloquer</Pill>.
              Utile en cas de départ d'un collaborateur ou de suspicion de fraude.
            </p>
            <CalloutWarning>
              <strong>Sécurité :</strong> seul un Super Admin peut créer ou promouvoir un autre Super Admin.
              Tout changement de rôle est tracé dans le journal d'audit.
            </CalloutWarning>
          </Section>

          {/* AUDIT */}
          <Section id="audit" title="Audit & intégrité" icon={ShieldCheck}>
            <h4 className="font-semibold">Vérification d'intégrité (hash chain)</h4>
            <p>
              Page <Pill>Audit & intégrité</Pill>. Carte en haut :
            </p>
            <ul>
              <li>✅ <strong>Chaîne d'intégrité intacte</strong> — tous les versements sont authentiques</li>
              <li>⚠️ <strong>ALERTE : altération détectée</strong> — un ou plusieurs versements ont été modifiés en base — investiguez immédiatement</li>
            </ul>
            <p>
              Bouton <Pill>Revérifier</Pill> pour relancer le contrôle.
            </p>
            <h4 className="font-semibold mt-3">Journal d'audit</h4>
            <p>
              Liste filtrable de toutes les actions : qui (utilisateur), quoi (action),
              quoi (entité), description (avec motif), IP.
            </p>
            <p className="mt-2">
              Filtres : <em>Entité</em> (Lots/Clients/Ventes/Versements…) · <em>Action</em>
              (Création/Modification/Suppression/Versement/Statut/Impression).
            </p>
          </Section>

          {/* MAINTENANCE */}
          <Section id="maintenance" title="Maintenance des données" icon={Database}>
            <p className="text-rose-700 font-semibold">⚠️ Réservé exclusivement au <strong>Super administrateur</strong>.</p>
            <p>
              Permet de <strong>réinitialiser</strong> tout ou partie des données après une phase de test
              ou de démonstration, sans toucher aux comptes utilisateurs.
            </p>
            <h4 className="font-semibold mt-3">Périmètres disponibles</h4>
            <ol>
              <li>⚠️ <strong>Transactions uniquement</strong> — supprime ventes, versements, désistements. Conserve lots, clients, utilisateurs.</li>
              <li>🟠 <strong>Toutes les données métier</strong> — supprime lots + clients + ventes + paiements + notes. Conserve seulement les utilisateurs.</li>
              <li>🔴 <strong>Tout sauf comptes utilisateurs</strong> — efface aussi le journal d'audit. Réinitialisation complète.</li>
            </ol>
            <h4 className="font-semibold mt-3">Procédure</h4>
            <ol>
              <li>Page <Pill>Maintenance</Pill></li>
              <li>Examinez la grille <Pill>État actuel</Pill> qui montre le compte par entité</li>
              <li>Sélectionnez le périmètre</li>
              <li>Cliquez <Pill>Purger les données sélectionnées</Pill></li>
              <li>Dans la modale, tapez exactement <code>SUPPRIMER</code> pour activer le bouton final</li>
              <li>Cliquez <Pill>Supprimer définitivement</Pill></li>
            </ol>
            <CalloutWarning>
              <strong>Irréversible :</strong> aucune restauration possible. Exportez vos données avant
              (voir section Exports).
            </CalloutWarning>
          </Section>

          {/* SEARCH & EXPORT */}
          <Section id="search-export" title="Recherche & exports" icon={Search}>
            <h4 className="font-semibold">Recherche globale</h4>
            <p>
              Dans la <strong>barre supérieure</strong>, tapez n'importe quoi (référence, nom, téléphone, reçu…) ou utilisez le raccourci <kbd className="text-[10px] bg-white border border-slate-300 rounded px-1.5 py-0.5">Ctrl + K</kbd>.
              Une fenêtre s'ouvre avec des résultats classés par catégorie : Lots, Clients, Ventes, Versements.
            </p>
            <h4 className="font-semibold mt-3">Exports CSV / Excel</h4>
            <p>
              Sur chaque page liste (Lots, Clients, Ventes, Versements), bouton <Pill><Download size={11} /> Exporter</Pill> :
            </p>
            <ul>
              <li><strong>Excel (.xlsx)</strong> — recommandé, en-têtes en couleur, prêt pour analyse</li>
              <li><strong>CSV (.csv)</strong> — universel, brut, compatible avec tout outil</li>
            </ul>
          </Section>

          {/* SHORTCUTS */}
          <Section id="shortcuts" title="Astuces & raccourcis" icon={Sparkles}>
            <ul>
              <li><kbd className="text-[10px] bg-slate-100 border rounded px-1.5">Ctrl + K</kbd> — ouvrir la recherche globale</li>
              <li><kbd className="text-[10px] bg-slate-100 border rounded px-1.5">Échap</kbd> — fermer une modale</li>
              <li>🌙 / ☀️ — basculer entre mode sombre et clair (icône en haut à droite)</li>
              <li>📥 — bouton <strong>Exporter</strong> en haut de chaque liste</li>
              <li>👁️ — bouton <strong>Voir sa vue</strong> pour observer un commercial (admin)</li>
              <li>🔎 — utilisez la <strong>recherche par localisation</strong> avant de créer une vente — gain de temps énorme</li>
              <li>📌 — épinglez les notes critiques en haut des fiches</li>
              <li>📋 — la <strong>vue Tableau</strong> du catalogue est idéale pour imprimer un inventaire</li>
            </ul>
          </Section>

          {/* TROUBLESHOOTING */}
          <Section id="troubleshooting" title="Dépannage" icon={AlertTriangle}>
            <p>Solutions aux problèmes les plus fréquents.</p>

            <h4 className="font-semibold mt-3">🔴 "Session expirée ou non authentifiée"</h4>
            <p>
              <strong>Cause :</strong> votre jeton de session a expiré (au-delà de 2 heures d'inactivité).<br />
              <strong>Solution :</strong> reconnectez-vous depuis la page de login. Vos données ne sont pas perdues.
            </p>

            <h4 className="font-semibold mt-3">🔴 "Accès restreint" sur une page</h4>
            <p>
              <strong>Cause :</strong> votre rôle ne permet pas d'accéder à cette fonctionnalité.<br />
              <strong>Solution :</strong> demandez à votre Administrateur d'élever votre rôle, ou
              utilisez le compte d'un collègue avec les droits requis.
            </p>

            <h4 className="font-semibold mt-3">🔴 "Veuillez justifier cette modification"</h4>
            <p>
              <strong>Cause :</strong> vous tentez de modifier ou supprimer une ressource sensible
              (lot, client, vente, versement) sans avoir saisi de motif.<br />
              <strong>Solution :</strong> dans la modale qui s'ouvre, tapez au moins 5 caractères
              expliquant la raison de la modification. Cette information est tracée dans le journal d'audit.
            </p>

            <h4 className="font-semibold mt-3">🔴 "Le versement dépasse le solde dû"</h4>
            <p>
              <strong>Cause :</strong> vous essayez de saisir un montant supérieur au solde restant.<br />
              <strong>Solution :</strong> vérifiez le solde restant affiché sur la fiche de la vente,
              et saisissez exactement ce montant. Pour solder en un clic, utilisez <Pill>Solder intégralement</Pill>.
            </p>

            <h4 className="font-semibold mt-3">🔴 "Cet enregistrement ne peut pas être supprimé car il est référencé par X opération(s)"</h4>
            <p>
              <strong>Cause :</strong> par exemple un client qui a déjà des ventes — la suppression
              est bloquée pour préserver l'historique.<br />
              <strong>Solution :</strong> annulez ou archivez d'abord les ventes/paiements liés, puis
              tentez à nouveau. Alternativement, désactivez le client (case "Actif" décochée) plutôt que de le supprimer.
            </p>

            <h4 className="font-semibold mt-3">🔴 Le PDF ne s'ouvre pas / page blanche</h4>
            <p>
              <strong>Cause :</strong> le navigateur peut bloquer les popups.<br />
              <strong>Solution :</strong> autorisez les popups depuis l'URL de l'application dans les
              paramètres du navigateur. Ou utilisez le bouton <Pill>Télécharger</Pill> à la place.
            </p>

            <h4 className="font-semibold mt-3">🔴 ALERTE rouge "Altération détectée" sur la page Audit</h4>
            <p>
              <strong>Cause :</strong> un ou plusieurs versements ont été modifiés directement en base
              de données, en dehors de l'application.<br />
              <strong>Solution :</strong>
            </p>
            <ol>
              <li>Notez immédiatement les références des versements signalés</li>
              <li>Contactez votre Super Administrateur</li>
              <li>Examinez le journal d'audit pour identifier l'auteur de la dernière modification</li>
              <li>Si nécessaire, restaurez la donnée depuis une sauvegarde</li>
              <li>Lancez la commande <code>python manage.py rehash_payments</code> pour re-générer les empreintes</li>
            </ol>

            <h4 className="font-semibold mt-3">🔴 "Document obligatoire" lors de la création d'un lot ou client</h4>
            <p>
              <strong>Cause :</strong> aucun fichier n'a été sélectionné dans la zone bleue de fin de formulaire.<br />
              <strong>Solution :</strong> faites défiler jusqu'en bas du formulaire, cliquez sur la
              zone "📎 Document justificatif" et sélectionnez un fichier (PDF, image…).
            </p>

            <h4 className="font-semibold mt-3">🔴 Une vente est bloquée en statut "Brouillon"</h4>
            <p>
              <strong>Cause :</strong> elle n'a pas encore été confirmée.<br />
              <strong>Solution :</strong> sur la fiche de la vente, cliquez <Pill>Confirmer</Pill>.
              Cela génère l'échéancier et passe la vente en "Réservé".
            </p>

            <h4 className="font-semibold mt-3">🔴 Impossible de voir une page après mise à jour</h4>
            <p>
              <strong>Cause :</strong> votre navigateur peut avoir un cache obsolète.<br />
              <strong>Solution :</strong> faites <kbd className="text-[10px] bg-slate-100 border rounded px-1">Ctrl+F5</kbd> (rechargement forcé)
              ou videz le cache du navigateur.
            </p>

            <h4 className="font-semibold mt-3">🔴 L'application est lente</h4>
            <p>
              <strong>Cause :</strong> en hébergement Render free, l'API se met en veille après 15 min d'inactivité.<br />
              <strong>Solution :</strong> patientez 30-60 secondes au premier accès (réveil du serveur).
              Pour un usage professionnel quotidien, passez en plan Starter ou Standard.
            </p>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="Questions fréquentes" icon={BookOpen}>
            <Faq q="Comment changer mon mot de passe ?">
              Cliquez sur votre avatar en haut à droite → <Pill>Changer le mot de passe</Pill>.
              Saisissez l'ancien et le nouveau mot de passe (≥ 8 caractères).
            </Faq>
            <Faq q="Pourquoi je vois 'Accès restreint' sur certaines pages ?">
              Votre rôle ne permet pas d'accéder à cette section. Demandez à un administrateur de
              vous accorder un rôle plus élevé si vous en avez besoin pour votre travail.
            </Faq>
            <Faq q="Comment imprimer un reçu pour un client ?">
              Sur la fiche de la vente, table des versements, cliquez <Pill>Reçu PDF</Pill>.
              Le PDF s'ouvre dans un nouvel onglet — utilisez <kbd className="text-[10px] bg-slate-100 border rounded px-1.5">Ctrl + P</kbd> pour imprimer.
            </Faq>
            <Faq q="Un client veut payer tout d'un coup, comment faire ?">
              Sur la fiche de la vente, cliquez <Pill>Solder intégralement</Pill>. Un versement
              du montant exact du solde restant est créé. La vente passe automatiquement en <Pill>Soldée</Pill>.
            </Faq>
            <Faq q="J'ai créé un lot avec une mauvaise ville, comment corriger ?">
              Ouvrez la fiche du lot → <Pill><Pencil size={11} /> Modifier</Pill> → tapez la bonne
              ville dans le champ texte libre → indiquez le motif → enregistrez.
            </Faq>
            <Faq q="Un client se désiste après avoir versé. Que se passe-t-il ?">
              Sur la vente, <Pill>Désistement acheteur</Pill> + motif. Le lot revient en <Pill>Disponible</Pill>.
              Une pénalité de 10 % est retenue. Un versement de remboursement est créé automatiquement.
              Le solde est à reverser au client.
            </Faq>
            <Faq q="Comment savoir si quelqu'un a modifié une donnée ?">
              Page <Pill>Audit & intégrité</Pill>. Filtrez par entité ou action. Chaque ligne
              indique qui, quand, quoi, depuis quelle IP, et le motif obligatoire de la modification.
            </Faq>
            <Faq q="Mes données disparaissent après chaque déploiement ?">
              Non. Les données sont stockées dans PostgreSQL avec persistance. Seule la commande
              de <Pill>Maintenance</Pill> (Super Admin) peut les effacer délibérément.
            </Faq>
            <Faq q="Comment exporter mes données pour la comptabilité ?">
              Pages <Pill>Versements</Pill> ou <Pill>Ventes</Pill> → bouton <Pill>Exporter</Pill> →
              choisissez <strong>Excel (.xlsx)</strong> pour un format prêt à analyser.
            </Faq>
            <Faq q="Puis-je modifier un versement par erreur ?">
              Oui, avec un motif obligatoire, mais c'est tracé dans l'audit. En cas de fraude,
              la chaîne d'empreintes SHA-256 détecte automatiquement l'altération.
            </Faq>
          </Section>

          <div className="card-glow p-6 bg-gradient-to-br from-brand-50 to-accent-50 text-center">
            <Sparkles size={28} className="text-brand-600 mx-auto mb-2" />
            <h3 className="font-display font-bold text-lg">Besoin d'aide supplémentaire ?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Contactez votre administrateur ou consultez le journal d'audit pour comprendre
              les actions récentes.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */
function Section({ id, title, icon: Icon, children }: any) {
  return (
    <section id={id} className="card-glow p-6 scroll-mt-20">
      <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-3 text-brand-800">
        <Icon size={20} /> {title}
      </h2>
      <div className="prose prose-sm max-w-none [&>p]:my-2 [&>ul]:my-2 [&>ol]:my-2 [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:ml-5 [&_ul]:list-disc [&_ul]:ml-5">
        {children}
      </div>
    </section>
  );
}

function Pill({ children }: { children: any }) {
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">{children}</span>;
}

function CalloutInfo({ children }: any) {
  return <div className="rounded-xl bg-brand-50/60 border border-brand-200 p-3 my-3 text-sm">{children}</div>;
}
function CalloutSuccess({ children }: any) {
  return <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3 my-3 text-sm">{children}</div>;
}
function CalloutWarning({ children }: any) {
  return <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-3 my-3 text-sm">{children}</div>;
}

function Faq({ q, children }: { q: string; children: any }) {
  return (
    <details className="rounded-xl border border-slate-200 p-3 my-2 hover:bg-slate-50 transition cursor-pointer group">
      <summary className="font-semibold text-sm cursor-pointer flex items-center gap-2">
        <ChevronRight size={14} className="text-brand-600 group-open:rotate-90 transition" />
        {q}
      </summary>
      <div className="mt-2 text-sm text-slate-700 pl-5">{children}</div>
    </details>
  );
}

function RoleTable() {
  const rows = [
    { role: "Super administrateur", cls: "pill-danger", desc: "Tout, y compris la maintenance des données et la création d'autres Super Admin", icon: Crown },
    { role: "Administrateur", cls: "pill-info", desc: "Gère le catalogue, les utilisateurs, les transactions et consulte l'audit", icon: UserCog },
    { role: "Agent commercial", cls: "pill-success", desc: "Crée lots et clients, ouvre les ventes, modifie ses dossiers", icon: Receipt },
    { role: "Caissier", cls: "pill-warning", desc: "Enregistre les versements, imprime les reçus, peut solder anticipativement", icon: Banknote },
    { role: "Lecteur", cls: "pill-muted", desc: "Consultation seule (lecture des lots, clients, ventes, reçus)", icon: Eye },
  ];
  return (
    <table className="table-clean text-sm">
      <thead><tr><th>Rôle</th><th>Description</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.role}>
            <td className="whitespace-nowrap"><span className={r.cls}><r.icon size={11} className="inline" /> {r.role}</span></td>
            <td>{r.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
