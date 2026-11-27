/**
 * OmniPay Zero-Trust - Génération d'identifiants UUID v4.
 *
 * `crypto.randomUUID()` n'existe que dans un « contexte sécurisé » (HTTPS ou http://localhost). Servi en HTTP simple
 * depuis un autre nom d'hôte (IP du poste, nom DNS de la salle de soutenance), il est `undefined` et faisait planter
 * l'application au démarrage (écran vide). `crypto.getRandomValues()` reste disponible dans tous les contextes :
 * on l'utilise en repli, avec la même qualité cryptographique.
 */
export function uuid(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    // Dernier recours (environnement sans WebCrypto) : identifiant non secret, jamais utilisé pour de la sécurité.
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
