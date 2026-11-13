import type { MailMessage } from '../../mail/types/mail.types';

interface ResetCopy {
  subject: string;
  greeting: (name: string) => string;
  intro: (minutes: number) => string;
  action: string;
  ignore: string;
}

const COPY: Record<string, ResetCopy> = {
  en: {
    subject: 'Reset your Global Inc password',
    greeting: (name) => `Hello ${name},`,
    intro: (minutes) =>
      `We received a request to reset your Global Inc password. Use the link below within ${minutes} minutes to choose a new password.`,
    action: 'Choose a new password',
    ignore:
      'If you did not ask for this, you can ignore this email. Your password will not change.',
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe Global Inc',
    greeting: (name) => `Bonjour ${name},`,
    intro: (minutes) =>
      `Nous avons reçu une demande de réinitialisation de votre mot de passe Global Inc. Utilisez le lien ci-dessous dans les ${minutes} minutes pour choisir un nouveau mot de passe.`,
    action: 'Choisir un nouveau mot de passe',
    ignore:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail. Votre mot de passe ne changera pas.",
  },
  rw: {
    subject: 'Hindura ijambobanga ryawe rya Global Inc',
    greeting: (name) => `Muraho ${name},`,
    intro: (minutes) =>
      `Twakiriye icyifuzo cyo guhindura ijambobanga ryawe rya Global Inc. Koresha iyi link iri hasi mu minota ${minutes} kugira ngo uhitemo ijambobanga rishya.`,
    action: 'Hitamo ijambobanga rishya',
    ignore: 'Niba atari wowe wabisabye, wirengagize iyi imeyili. Ijambobanga ryawe ntirizahinduka.',
  },
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

export function buildResetPasswordEmail(
  locale: string,
  name: string,
  link: string,
  minutes: number,
): Omit<MailMessage, 'to'> {
  const copy = COPY[locale] ?? COPY.en;
  const text = [copy.greeting(name), '', copy.intro(minutes), '', link, '', copy.ignore].join('\n');
  const html = `<p>${escapeHtml(copy.greeting(name))}</p>
<p>${escapeHtml(copy.intro(minutes))}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#00473a;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(copy.action)}</a></p>
<p style="color:#4b5563">${escapeHtml(copy.ignore)}</p>`;
  return { subject: copy.subject, text, html };
}
