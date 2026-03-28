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

export default function Terms() {
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
          Conditions Générales d'Utilisation
        </h1>
        <p style={{ fontSize: '13px', color: T.muted, marginBottom: '48px' }}>
          Dernière mise à jour : 28 mars 2026
        </p>

        <Section title="1. Présentation du service">
          <p>
            VIZION est une plateforme SaaS de scouting football à destination des professionnels
            du football (clubs, agences, recruteurs). L'accès au service est réservé aux
            <strong style={{ color: T.text }}> personnes morales et professionnels</strong> (B2B).
            En créant un compte, vous déclarez agir dans un cadre professionnel.
          </p>
        </Section>

        <Section title="2. Accès et abonnement">
          <p>L'accès à VIZION est conditionné à la souscription d'un abonnement :</p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong style={{ color: T.text }}>Plan Free :</strong> accès limité aux fonctionnalités de base,
              quota de joueurs restreint, sans engagement.
            </li>
            <li>
              <strong style={{ color: T.text }}>Plan Pro :</strong> accès complet, scoring personnalisable,
              export PDF, rapports IA illimités, support prioritaire.
            </li>
            <li>
              <strong style={{ color: T.text }}>Plan Enterprise :</strong> multi-organisations, SSO, SLA garanti,
              intégrations sur mesure. Tarif sur devis.
            </li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Les tarifs sont affichés HT. La TVA applicable est celle en vigueur dans votre pays.
            L'abonnement est renouvelé automatiquement sauf résiliation avant la date d'échéance.
          </p>
        </Section>

        <Section title="3. Utilisation des données joueurs">
          <p>Les données de scouting accessibles via VIZION sont fournies à des fins :</p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>D'analyse interne et de prise de décision sportive.</li>
            <li>De génération de rapports à usage interne de votre organisation.</li>
            <li>De partage restreint via les fonctionnalités de partage sécurisé de VIZION.</li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Il est <strong style={{ color: T.text }}>strictement interdit</strong> de :
          </p>
          <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Revendre, redistribuer ou monétiser les données joueurs extraites de VIZION.</li>
            <li>Créer des bases de données dérivées à des fins commerciales concurrentes.</li>
            <li>Scraper ou accéder aux données par des moyens automatisés non autorisés.</li>
            <li>Partager vos identifiants avec des tiers extérieurs à votre organisation.</li>
          </ul>
        </Section>

        <Section title="4. Niveaux de service (SLA)">
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong style={{ color: T.text }}>Plan Free :</strong> service fourni "en l'état" (best effort),
              sans garantie de disponibilité. Maintenances sans préavis possibles.
            </li>
            <li>
              <strong style={{ color: T.text }}>Plan Pro :</strong> disponibilité cible de{' '}
              <strong style={{ color: T.text }}>99,5 %</strong> mesurée mensuellement (hors maintenances
              planifiées notifiées 48 h à l'avance). En cas de dépassement, crédit de service
              applicable sur demande.
            </li>
            <li>
              <strong style={{ color: T.text }}>Plan Enterprise :</strong> SLA personnalisé défini dans le
              contrat de service.
            </li>
          </ul>
          <p style={{ marginTop: '12px' }}>
            Les incidents sont trackés publiquement sur{' '}
            <a href="https://status.vizion.app" target="_blank" rel="noopener noreferrer" style={{ color: T.blue, textDecoration: 'none' }}>
              status.vizion.app
            </a>.
          </p>
        </Section>

        <Section title="5. Propriété intellectuelle">
          <p>
            VIZION et ses composants (algorithmes de scoring, interface, rapports générés par IA)
            sont la propriété exclusive de VIZION SAS. L'abonnement confère une{' '}
            <strong style={{ color: T.text }}>licence d'utilisation non exclusive</strong> du service,
            sans transfert de propriété.
          </p>
          <p style={{ marginTop: '12px' }}>
            Les données que vous importez ou créez (notes, shortlists, évaluations) vous
            appartiennent. Vous pouvez les exporter à tout moment et demander leur suppression.
          </p>
        </Section>

        <Section title="6. Responsabilité">
          <p>
            VIZION est un outil d'aide à la décision. Les scores et rapports générés ne
            constituent pas des certifications sportives ou médicales. L'utilisation des données
            pour des décisions de recrutement relève de la responsabilité exclusive de l'utilisateur.
          </p>
          <p style={{ marginTop: '12px' }}>
            La responsabilité de VIZION SAS est limitée au montant des abonnements versés
            au cours des 12 derniers mois, sauf faute lourde ou dol.
          </p>
        </Section>

        <Section title="7. Résiliation">
          <p>
            Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre
            compte. La résiliation prend effet à la fin de la période d'abonnement en cours.
            Vos données sont conservées 30 jours après résiliation pour permettre l'export,
            puis supprimées définitivement.
          </p>
          <p style={{ marginTop: '12px' }}>
            VIZION se réserve le droit de suspendre ou résilier un compte en cas de violation
            des présentes CGU, avec notification préalable sauf urgence sécuritaire.
          </p>
        </Section>

        <Section title="8. Droit applicable">
          <p>
            Les présentes CGU sont régies par le droit français. Tout litige sera soumis à la
            compétence exclusive des tribunaux de Paris, sauf disposition légale contraire.
          </p>
          <p style={{ marginTop: '12px' }}>
            Pour toute question :{' '}
            <a href="mailto:legal@vizion.app" style={{ color: T.blue, textDecoration: 'none' }}>
              legal@vizion.app
            </a>
          </p>
        </Section>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '24px 48px', display: 'flex', gap: '24px', justifyContent: 'center' }}>
        <Link to="/privacy" style={{ fontSize: '13px', color: T.muted, textDecoration: 'none' }}>Confidentialité</Link>
        <Link to="/terms"   style={{ fontSize: '13px', color: T.muted, textDecoration: 'none' }}>CGU</Link>
        <a href="mailto:legal@vizion.app" style={{ fontSize: '13px', color: T.muted, textDecoration: 'none' }}>Contact</a>
      </div>
    </div>
  )
}
