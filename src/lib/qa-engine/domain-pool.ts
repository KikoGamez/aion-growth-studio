import type { DomainSelection } from './types';

export const DOMAIN_POOL: Record<string, string[]> = {
  banca_privada: [
    'andbank.com', 'tressis.com', 'a-g.es', 'abancaprivada.com', 'bancmarch.es',
  ],
  saas_b2b: [
    'holded.com', 'quipu.com', 'billage.com', 'factorial.co', 'signaturit.com',
    'typeform.com', 'pipedrive.com', 'teamleader.eu',
  ],
  ecommerce: [
    'mr-wonderful.com', 'singularu.com', 'promofarma.com', 'druni.es',
    'tiendanimal.es', 'pccomponentes.com', 'venca.es', 'wuolah.com',
  ],
  servicios_profesionales: [
    'garrido-abogados.com', 'auren.com', 'mazars.es', 'cuatrecasas.com',
    'bdo.es', 'garrigues.com',
  ],
  hosteleria: [
    'hotelurban.com', 'casacamper.com', 'hotelomm.es', 'vincci-hotels.com',
    'nh-hotels.com',
  ],
  industria: [
    'gonvarri.com', 'cosentino.com', 'gestamp.com', 'caf.net', 'talgo.com',
  ],
  salud: [
    'clinicabaviera.com', 'vitaldent.com', 'quironsalud.com', 'sanitas.es',
    'adeslas.es', 'asisa.es',
  ],
  educacion: [
    'isdidigital.com', 'ironhack.com', 'esade.edu', 'iese.edu', 'ie.edu',
    'eae.es',
  ],
  inmobiliaria: [
    'lucas-fox.com', 'fotocasa.es', 'engel-voelkers.com', 'barnes-ibiza.com',
  ],
  alimentacion: [
    'navidul.com', 'laespanola.com', 'pascual.com', 'campofrio.es',
    'garcia-carrion.com', 'dhul.es',
  ],
};

/** Pick N domains, cycling through sectors to maximize coverage */
export function selectDomains(count: number, recentlyTested: string[] = []): DomainSelection[] {
  const allSectors = Object.keys(DOMAIN_POOL);
  const selected: DomainSelection[] = [];
  const used = new Set(recentlyTested);
  let i = 0;

  while (selected.length < count && i < count * allSectors.length) {
    const sector = allSectors[i % allSectors.length];
    const pool = DOMAIN_POOL[sector];
    const available = pool.filter(d => !used.has(d) && !selected.some(s => s.domain === d));

    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      selected.push({ domain: pick, sector });
      used.add(pick);
    } else {
      // Sector exhausted — reuse oldest (random)
      const fallback = pool[Math.floor(Math.random() * pool.length)];
      if (!selected.some(s => s.domain === fallback)) {
        selected.push({ domain: fallback, sector });
      }
    }
    i++;
  }

  return selected;
}
