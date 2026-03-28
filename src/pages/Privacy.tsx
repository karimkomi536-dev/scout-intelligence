import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import VizionLogo from '../components/VizionLogo'

const T = {
  bg:      '#0A0E1B',
  surface: '#111A2E',
  border:  'rgba(255,255,255,0.07)',
  blue:    '#4D7FFF',
  text:    '#E2EAF4',
  muted:   '#5A7090',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: T.text, marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
        {title}
      </h2>
      <div style={{ fontSize: '14px', color: T.muted, lineHeight: 1.8 }}>
        {children}
      </div>
    </section>
  )
}

export default function Privacy() {
  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '16px 48px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
          <VizionLogo size="sm" />
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: T.muted, textDecoration: 'none', fontSize: '13px', marginBottom: '32px' }}>
          <ArrowLeft size={14} />
          Retour
        </Link>

        <h1 style={{ fontSize: '28px', fontWeight: 800, color: T.text, marginBottom: '8px' }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: '13px', color: T.muted, marginBottom: '48px' }}>
          Dernière mise à jour : 28 mars 2026
        </p>

        <Section title="1. Qui sommes-nous ?">
          <p>
            VIZION est un service de football scouting intelligence édité par VIZION SAS.
            En tant que responsable du traitement, nous nous engageons à protéger vos données
            personnelles conformément au Règlement Général sur la Protection des Données (RGPD —
            Règlement UE 2016/679).
          </p>
          <p style={{ marginTop: '12px' }}>
            <strong style={{ color: T.text }}>Contact DPO :</strong>{' '}
            <a href="mailto:privacy@vizion.app" style={{ color: T.blue, textDecoration: 'none' }}>
              privacy@vizion.app
            </a>
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons les catégories de données suivantes :</p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong style={{ color: T.text }}>Données de compte :</strong> adresse e-mail, mot de passe (haché), nom d'organisation.</li>
            <li><strong style={{ color: T.text }}>Données de scouting :</strong> évaluations de joueurs, notes, shortlists, rapports générés, scores personnalisés.</li>
            <li><strong style={{ color: T.text }}>Données d'utilisation :</strong> logs de connexion, actions dans l'application (via Sentry, pour la stabilité du service).</li>
            <li><strong style={{ color: T.text }}>Données de session :</strong> token d'authentification stocké en local storage, durée de vie limitée.</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Nous ne collectons <strong style={{ color: T.text }}>aucune donnée de paiement</strong> directement —
            les transactions sont gérées par notre prestataire de paiement certifié PCI-DSS.
          </p>
        </Section>

        <Section title="3. Finalités du traitement">
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong style={{ color: T.text }}>Fourniture du service :</strong> authentification, accès aux données de scouting, génération de rapports IA.</li>
            <li><strong style={{ color: T.text }}>Collaboration d'équipe :</strong> invitations, gestion des rôles au sein d'une organisation.</li>
            <li><strong style={{ color: T.text }}>Amélioration du service :</strong> détection d'erreurs via Sentry (données anonymisées).</li>
            <li><strong style={{ color: T.text }}>Communications :</strong> e-mails transactionnels (invitations, confirmation de compte) uniquement.</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Base légale : <strong style={{ color: T.text }}>exécution du contrat</strong> (Art. 6.1.b RGPD) pour la fourniture du service ;
            <strong style={{ color: T.text }}> intérêt légitime</strong> (Art. 6.1.f) pour la sécurité et la stabilité.
          </p>
        </Section>

        <Section title="4. Hébergement et transferts de données">
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong style={{ color: T.text }}>Vercel (USA) :</strong> hébergement de l'application et des fonctions Edge.
              Transfert encadré par les Clauses Contractuelles Types (CCT) de la Commission européenne.
            </li>
            <li>
              <strong style={{ color: T.text }}>Supabase (Union européenne — Frankfurt) :</strong> base de données PostgreSQL.
              Données stockées dans l'UE, conformité RGPD native.
            </li>
            <li>
              <strong style={{ color: T.text }}>Anthropic (USA) :</strong> génération de rapports IA. Seules les statistiques
              anonymisées du joueur sont transmises — aucune donnée personnelle identifiable.
            </li>
            <li>
              <strong style={{ color: T.text }}>Resend (USA) :</strong> envoi d'e-mails transactionnels. Transfert encadré par CCT.
            </li>
            <li>
              <strong style={{ color: T.text }}>Sentry (USA) :</strong> monitoring d'erreurs. Données techniques anonymisées uniquement.
            </li>
          </ul>
        </Section>

        <Section title="5. Durée de conservation">
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong style={{ color: T.text }}>Données de compte :</strong> pendant toute la durée du compte, puis supprimées dans les 30 jours suivant la clôture.</li>
            <li><strong style={{ color: T.text }}>Données de scouting :</strong> conservées pendant la durée d'abonnement + 30 jours pour permettre l'export.</li>
            <li><strong style={{ color: T.text }}>Logs Sentry :</strong> 90 jours glissants.</li>
            <li><strong style={{ color: T.text }}>Tokens de session :</strong> expiration automatique après inactivité.</li>
          </ul>
        </Section>

        <Section title="6. Cookies et traceurs">
          <p>
            VIZION utilise <strong style={{ color: T.text }}>uniquement les cookies strictement nécessaires</strong> au
            fonctionnement du service :
          </p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong style={{ color: T.text }}>vizion-auth</strong> (local storage) : token de session Supabase. Requis pour maintenir la connexion.</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            <strong style={{ color: T.text }}>Aucun cookie publicitaire, aucun traceur tiers, aucun pixel de suivi.</strong>
          </p>
        </Section>

        <Section title="7. Vos droits RGPD">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong style={{ color: T.text }}>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
            <li><strong style={{ color: T.text }}>Droit de rectification :</strong> corriger des données inexactes.</li>
            <li><strong style={{ color: T.text }}>Droit à l'effacement :</strong> demander la suppression de votre compte et de vos données.</li>
            <li><strong style={{ color: T.text }}>Droit à la portabilité :</strong> recevoir vos données dans un format structuré (JSON/CSV).</li>
            <li><strong style={{ color: T.text }}>Droit d'opposition :</strong> vous opposer à certains traitements fondés sur l'intérêt légitime.</li>
            <li><strong style={{ color: T.text }}>Droit à la limitation :</strong> demander la restriction temporaire du traitement.</li>
          </ul>
          <p style={{ marginTop: '16px' }}>
            Pour exercer vos droits :{' '}
            <a href="mailto:privacy@vizion.app" style={{ color: T.blue, textDecoration: 'none' }}>
              privacy@vizion.app
            </a>
            {' '}— réponse sous 30 jours. En cas de litige, vous pouvez saisir la{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: T.blue, textDecoration: 'none' }}>
              CNIL
            </a>.
          </p>
        </Section>

        <Section title="8. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles adaptées :
            chiffrement TLS en transit, chiffrement au repos dans Supabase, Row Level Security
            (RLS) sur toutes les tables, rate limiting sur les APIs, headers de sécurité HTTP
            (HSTS, CSP, X-Frame-Options).
          </p>
        </Section>

        <Section title="9. Modifications">
          <p>
            Toute modification substantielle de cette politique sera notifiée par e-mail aux
            utilisateurs actifs au moins 14 jours avant son entrée en vigueur. La version en
            vigueur est toujours accessible à l'adresse{' '}
            <a href="/privacy" style={{ color: T.blue, textDecoration: 'none' }}>vizion.app/privacy</a>.
          </p>
        </Section>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '24px 48px', display: 'flex', gap: '24px', justifyContent: 'center' }}>
        <Link to="/privacy" style={{ fontSize: '13px', color: T.muted, textDecoration: 'none' }}>Confidentialité</Link>
        <Link to="/terms"   style={{ fontSize: '13px', color: T.muted, textDecoration: 'none' }}>CGU</Link>
        <a href="mailto:privacy@vizion.app" style={{ fontSize: '13px', color: T.muted, textDecoration: 'none' }}>Contact</a>
      </div>
    </div>
  )
}
