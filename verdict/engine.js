/* Verdict annonce — moteur : formats, estimation, soleil, cartes, graphiques. */
window.VA = window.VA || {};
(function (VA) {
'use strict';
/* ---------- formats ---------- */
const fmt = n => (n == null || isNaN(n)) ? '–' : Math.round(n).toLocaleString('fr-FR');
const eur = n => (n == null || isNaN(n)) ? '–' : fmt(n) + ' €';
const kE = n => (n == null || isNaN(n)) ? '–' : (Math.abs(n) >= 1e6 ? (n / 1e6).toLocaleString('fr-FR', {maximumFractionDigits: 2}) + ' M€' : fmt(n / 1000) + ' k€');
const m2 = n => (n == null || isNaN(n)) ? '–' : fmt(n) + ' €/m²';
const pct = (n, d) => (n == null || isNaN(n)) ? '–' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n * 100).toLocaleString('fr-FR', {maximumFractionDigits: d == null ? 1 : d}) + ' %';
const fr1 = n => (n == null || isNaN(n)) ? '–' : (+n).toLocaleString('fr-FR', {maximumFractionDigits: 1});
const dateFr = d => { if (!d) return '–'; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'}); };
const monthFr = d => { if (!d) return '–'; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('fr-FR', {month: 'short', year: 'numeric'}); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const titleCase = s => String(s || '').toLowerCase().replace(/(^|[\s'’-])\S/g, c => c.toUpperCase());
const ABR = {av: 'av.', ave: 'av.', avenue: 'av.', bd: 'bd', boulevard: 'bd', che: 'ch.', chem: 'ch.', chemin: 'ch.', imp: 'imp.', impasse: 'imp.', all: 'all.', allee: 'all.', 'allée': 'all.', rte: 'rte', route: 'rte', pl: 'pl.', place: 'pl.', mte: 'montée', montee: 'montée', trav: 'traverse', crs: 'cours', sq: 'square', lot: 'lot.', res: 'rés.', ham: 'hameau', qua: 'quai', esp: 'esplanade', prom: 'prom.', sen: 'sentier', vla: 'villa', pas: 'passage', dom: 'domaine', cite: 'cité', art: 'anc. rte', vc: 'voie communale', rle: 'ruelle', cor: 'corniche', plt: 'plateau', car: 'carrefour', ptte: 'placette', vge: 'village', zac: 'ZAC', rpt: 'rond-point', qu: 'quartier', fg: 'faubourg', gr: 'grande rue'};
const niceAdr = s => { s = String(s || '').replace(/\s+/g, ' ').trim(); const parts = s.split(' '); return parts.map((w, i) => { const k = w.toLowerCase().replace(/\.$/, ''); if (k === 'art' && /^anc/i.test(parts[i + 1] || '')) return ''; if (ABR[k] && (i === 0 || /^\d/.test(parts[i - 1]) || i === 1)) return ABR[k]; if (i > 0 && /^(de|du|des|la|le|les|l'|d'|et|à|au|aux|sur|sous)$/i.test(w)) return w.toLowerCase(); return w; }).filter(Boolean).join(' '); };
const streetOnly = s => String(s || '').replace(/^\d+\s?(bis|ter|[a-z])?\s+/i, '');
const med = a => { a = (a || []).filter(v => v != null && !isNaN(v)).slice().sort((x, y) => x - y); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const pctl = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); if (!a.length) return null; const i = (a.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dpeClass = (l, big) => l ? `<span class="dpe ${esc(l)}"${big ? ' style="font-size:15px;height:28px;min-width:30px"' : ''}>${esc(l)}</span>` : '<span class="muted">–</span>';
const ENERGIE = {E: 'électricité', G: 'gaz', F: 'fioul', B: 'bois', R: 'réseau de chaleur', P: 'pompe à chaleur / autre', C: 'charbon', '?': 'inconnu'};
const energieLib = s => { if (!s) return '–'; const k = s[0] === 'É' ? 'E' : s[0]; return s.length > 2 ? s : (ENERGIE[k] || s); };
Object.assign(VA, {fmt, eur, kE, m2, pct, fr1, dateFr, monthFr, esc, titleCase, niceAdr, streetOnly, med, pctl, clamp, dpeClass, energieLib});

/* ---------- lecture des ventes ---------- */
VA.ventes = P => (P.marche && P.marche.ventes || []).map(v => ({x: v[0], y: v[1], t: v[2], pk: v[3], s: v[4], n: v[5], d: v[6], g: v[7], a: v[8], km: v[9], pc: v[10], nl: v[11] || 1, pm2: v[3] * 1000 / v[4]}));
VA.dpeList = P => (P.dpe && P.dpe.L || []).map(r => ({date: r[0], adr: r[1], t: r[2], s: r[3], l: r[4], an: r[5], et: r[6], res: r[7], comp: r[8], en: r[9], cout: r[10], id: r[11], x: r[12], y: r[13], copro: r[14], kwh: r[15], nxt: r[16] || null, orig: r[17] || null, q: !!r[18]}));
VA.ademe = id => id ? 'https://observatoire-dpe-audit.ademe.fr/afficher-dpe/' + encodeURIComponent(id) : null;
VA.monSecteur = adr => 'https://app.myacademia.ai/app/dossiers/nouveau?adresse=' + encodeURIComponent(adr || '');
VA.copros = P => (P.copros || []).map(c => ({im: c[0], nom: c[1], adr: c[2], lotsH: c[3], lots: c[4], per: c[5], typeSyndic: c[6], syndic: c[7], mandat: c[8], fin: c[9], x: c[10], y: c[11], sujet: c[12], immat: c[13], lat: c[14] || null, lon: c[15] || null}));
VA.typeBien = P => { const A = P.annonce; if (A.type === 'M' || A.type === 'A') return A.type; const d = P.adresse && P.adresse.dpe; if (d && d.type === 'maison') return 'M'; if (d && d.type === 'appartement') return 'A'; const M = P.marche; return (M && M.allMed && M.allMed.M && !M.allMed.A) ? 'M' : 'A'; };

/* ---------- estimation ---------- */

/* ---------- Les atouts annoncés : ce que les ventes DVF ne voient pas (vue, étage, terrasse, piscine, garage, état, standing) ----------
   Ordres de grandeur, pas une science : chaque ligne se coche, se décoche et se corrige. Ils s'ajoutent à la valeur « au m² standard ». */
VA.atouts = function (P) {
  const A = P.annonce || {}; const type = VA.typeBien(P); const t = ((A.titre || '') + ' ' + (A.desc || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const has = re => re.test(t); const out = []; const add = (k, l, p, plage, e) => out.push({k, l, p, plage, e: e || 0, auto: true});
  const mer = A.vueMer || has(/vue (?:mer|sur la mer|sur mer|panoramique)|donne sur la mer|face (?:a la )?mer|front de mer|pieds dans l'eau|vue imprenable|vue degagee sur la mer|vue baie/);
  if (mer) { const pano = has(/panoramique|pieds dans l'eau|front de mer|face (?:a la )?mer|vue imprenable|premiere ligne/); add('mer', pano ? 'Vue mer dégagée ou front de mer (annonce)' : 'Vue mer (annonce)', pano ? 20 : 10, pano ? '15 à 30 %' : '8 à 20 %'); }
  const MOTS = {un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10};
  const numOf = s => s == null ? null : (MOTS[s] != null ? MOTS[s] : (parseInt(s, 10) || null));
  if (type === 'A') {
    let et = A.etage, nv = A.niveaux; const asc = A.ascenseur != null ? A.ascenseur : (has(/avec ascenseur|ascenseur/) && !has(/sans ascenseur/) ? true : has(/sans ascenseur/) ? false : null);
    if (et == null) { const m = /(\d{1,2})\s?(?:e|er|eme|ème)\s+(?:et dernier )?etage/.exec(t) || /(premier|deuxieme|troisieme|quatrieme|cinquieme|sixieme|septieme|huitieme)\s+(?:et dernier )?etage/.exec(t); if (m) et = numOf(m[1]) || ({premier: 1, deuxieme: 2, troisieme: 3, quatrieme: 4, cinquieme: 5, sixieme: 6, septieme: 7, huitieme: 8})[m[1]] || null; else if (has(/rez[- ]de[- ]chaussee|\brdc\b/)) et = 0; }
    if (nv == null) { const m = /(?:immeuble|residence|batiment) (?:recent |neuf |de standing |d'architecte )?(?:des annees \d{2,4} )?de (\d{1,2}|deux|trois|quatre|cinq|six|sept|huit|neuf|dix) etages/.exec(t); if (m) nv = numOf(m[1]); }
    if (has(/dernier etage|attique|toit[- ]terrasse/) || (et != null && nv && et >= nv && et >= 2)) add('etage', 'Dernier étage', 6, '4 à 10 %');
    else if (et != null && et >= 3 && asc !== false) add('etage', `Étage élevé (${et}e)${asc ? ' avec ascenseur' : ''}`, 3, '2 à 6 %');
    else if (et != null && et >= 3 && asc === false) add('etage', `${et}e étage sans ascenseur`, -8, '−12 à −5 %');
    else if (et === 0 && !has(/rez[- ]de[- ]jardin/)) add('etage', 'Rez-de-chaussée', -6, '−10 à −3 %');
    if (has(/rez[- ]de[- ]jardin|jardin privatif/)) add('jardin', 'Jardin privatif ou rez-de-jardin', 4, '2 à 8 %');
  }
  if (A.terrasse >= 30 || has(/grande terrasse|vaste terrasse|terrasse de \d{2,} ?m/)) add('terrasse', 'Grande terrasse', 8, '5 à 12 %');
  else if (A.terrasse > 0 || has(/terrasse/)) add('terrasse', has(/deux terrasses|2 terrasses|terrasses/) ? 'Terrasses' : 'Terrasse', 5, '3 à 10 %');
  else if (has(/balcon/)) add('terrasse', 'Balcon', 2, '1 à 4 %');
  if (A.piscine || has(/piscine/)) add('piscine', type === 'A' ? 'Piscine dans la résidence' : 'Piscine', type === 'A' ? 3 : 5, type === 'A' ? '2 à 5 %' : '3 à 8 %');
  if (A.travaux || has(/travaux a prevoir|a rafraichir|a renover|a restaurer|a remettre au gout du jour|gros travaux/)) add('etat', 'Travaux à prévoir (annonce)', -10, '−15 à −5 %');
  else if (has(/refait a neuf|entierement renove|renove|excellent etat|tres bon etat|impeccable|aucun travaux|sans travaux|parfait etat/)) add('etat', 'Très bon état annoncé', 4, '3 à 8 %');
  if (has(/prestige|standing|haut de gamme|luxe|luxueu|residence securisee|gardien|concierge/)) add('standing', 'Résidence de standing (annonce)', 4, '3 à 8 %');
  if (has(/garage|box ferme|\bbox\b/) || A.garages) add('garage', 'Garage ou box', 0, '20 000 à 40 000 €', 25000);
  else if (has(/parking|stationnement|place de voiture/) || A.parkings) add('garage', 'Place de parking', 0, '8 000 à 20 000 €', 12000);
  if (has(/\bcave\b/)) add('cave', 'Cave', 0, '1 500 à 5 000 €', 2000);
  if (type === 'A' && has(/sans ascenseur/) && !out.some(a => a.k === 'etage')) add('etage', 'Sans ascenseur', -5, '−10 à −3 %');
  if (has(/expose nord|exposition nord|oriente nord|plein nord/)) add('expo', 'Exposition nord', -3, '−6 à −2 %');
  if (has(/bruyant|route passante|nuisances|voie rapide|voie ferree/)) add('bruit', 'Nuisances signalées', -5, '−10 à −3 %');
  return out;
};

VA.estimer = function (P, adj) {
  const A = P.annonce, M = P.marche; if (!M || !M.ventes || !M.ventes.length) return null;
  const type = VA.typeBien(P); const S = A.surface || (P.adresse && P.adresse.dpe && P.adresse.dpe.surface) || null; const T = A.terrain || 0;
  const rows = VA.ventes(P); const now = Date.now();
  const ageY = d => (now - new Date(d).getTime()) / (365.25 * 864e5);
  const yrs = M.years || []; const cnt = M.CNT[type] || {}, medT = M.MED[type] || {}; const other = type === 'M' ? 'A' : 'M';
  const okYears = yrs.filter(y => medT[y]); const lastYear = okYears.length ? Math.max(...okYears) : (yrs.length ? Math.max(...yrs) : new Date().getFullYear());
  const ref = medT[lastYear] || M.allMed[type] || null;
  // tendance lissée : droite des logarithmes des médianes annuelles, pondérée par le nombre de ventes (évite le bruit d'une année à 20 ventes)
  const slopeOf = tp => { const mm = M.MED[tp] || {}, cc = M.CNT[tp] || {}; const pts = yrs.filter(y => mm[y]).map(y => ({x: y, y: Math.log(mm[y]), w: cc[y] || 1})); if (pts.length < 3) return null;
    const W = pts.reduce((a, p) => a + p.w, 0), mx = pts.reduce((a, p) => a + p.w * p.x, 0) / W, my = pts.reduce((a, p) => a + p.w * p.y, 0) / W; const sxx = pts.reduce((a, p) => a + p.w * (p.x - mx) ** 2, 0); if (!sxx) return null; return pts.reduce((a, p) => a + p.w * (p.x - mx) * (p.y - my), 0) / sxx; };
  let slope = slopeOf(type); if (slope == null) slope = slopeOf(other); if (slope == null) slope = 0; slope = clamp(slope, -0.08, 0.10);
  const fac = y => Math.exp(slope * (lastYear - y));
  const all = rows.filter(r => r.t === type && ageY(r.d) <= 6.5).map(r => Object.assign({}, r, {f: fac(+r.d.slice(0, 4))}));
  all.forEach(r => r.pm2r = r.pm2 * r.f);
  if (!S) return {type, S: null, n: all.length, lastYear, ref};
  const pieces = A.pieces || null;
  const adjArr = adj || []; const excl = new Set(adjArr.filter(a => a.k && a.k.startsWith('x:') && a.on !== false).map(a => a.k.slice(2)));
  const keyOf = r => (r.pc || '') + '|' + r.d + '|' + r.pk; VA.saleKey = keyOf;
  // la parcelle et la résidence ne comptent que si l'on sait où est le bien (adresse retrouvée, résidence indiquée, Localisateur, dossier d'adresse)
  const situe = !!(P.adresse && P.adresse.trouvee) || !!A.residence || (P.centre && (P.centre.source === 'conseiller' || P.centre.source === 'localisateur' || P.centre.source === 'ban')) || A.mode === 'adresse';
  const mine = situe ? VA.copros(P).find(c => c.sujet) : null; const resPt = (A.residence || P.centre && P.centre.source === 'conseiller') ? [0, 0] : (mine && (mine.x || mine.y) ? [mine.x, mine.y] : null);
  // la résidence : même parcelle, ou à moins de 120 m du point de la copropriété, ou même voie à moins de 200 m (les grandes résidences s'étalent sur plusieurs parcelles)
  const normV = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^\d+\s*(bis|ter)?\s*/, '').replace(/\s+/g, ' ').trim();
  const voieRes = normV((A.residence && A.residence.adr) || (mine && mine.adr) || (P.adresse && P.adresse.trouvee && P.adresse.dpe && P.adresse.dpe.adr) || '');
  const voieOk = v => voieRes && v && normV(v) === voieRes;
  all.forEach(r => { const dRes = resPt ? Math.hypot(r.x - resPt[0], r.y - resPt[1]) : null; r.res = situe && !!((P.parcelle && r.pc === P.parcelle.id) || (dRes != null && dRes <= 120) || (dRes != null && dRes <= 200 && voieOk(r.a))); r.key = keyOf(r); });
  VA.situe = situe;
  const cands = all.filter(r => r.s / S >= 0.55 && r.s / S <= 1.8 && !excl.has(r.key)).map(r => {
    let score = Math.abs(Math.log(r.s / S)) * 3 + r.km / 300 + ageY(r.d) * 0.6;
    if (r.res) score -= 1.2; // les ventes de la résidence ou de la parcelle d'abord (même règle que Mon secteur)
    if (type === 'M') { if (T > 0 && r.g > 0) score += Math.abs(Math.log(r.g / T)) * 0.4; else if (r.g === 0) score += 0.3; }
    if (pieces && r.n) score += Math.min(1, Math.abs(r.n - pieces) * 0.15);
    if (r.nl > 2) score += 0.6;
    return Object.assign({}, r, {score}); }).sort((a, b) => a.score - b.score);
  // rejet des ventes aberrantes parmi les 12 plus ressemblantes (succession, vente de plusieurs lots, ruine…) : hors 60 %–150 % de leur médiane
  const pool = cands.slice(0, 12); const mPool = med(pool.map(c => c.pm2r));
  const kept = mPool ? cands.filter(c => c.pm2r >= mPool * 0.6 && c.pm2r <= mPool * 1.5) : cands;
  const ecartes = mPool ? pool.filter(c => !(c.pm2r >= mPool * 0.6 && c.pm2r <= mPool * 1.5)) : [];
  const top5 = kept.slice(0, 5), top8 = kept.slice(0, 8);
  const m5 = med(top5.map(c => c.pm2r)), m8 = med(top8.map(c => c.pm2r));
  const valeur = m5 ? Math.round(m5 * S / 1000) * 1000 : null;
  const allR = all.map(r => r.pm2r); const medAll = med(allR); let lo = 0.75, hi = 1.3;
  if (allR.length >= 15 && medAll) { const ratios = allR.map(v => v / medAll); lo = clamp(pctl(ratios, 0.1), 0.65, 0.95); hi = clamp(pctl(ratios, 0.9), 1.05, 1.4); }
  const mean = top5.length ? top5.reduce((a, c) => a + c.pm2r, 0) / top5.length : 0;
  const cv = top5.length > 1 ? Math.sqrt(top5.reduce((a, c) => a + (c.pm2r - mean) ** 2, 0) / top5.length) / mean : null;
  const fiab = (top5.length === 5 && cv != null && cv < 0.15 && top5[4].score < 2.4) ? 'bonne' : (top5.length >= 4 && cv != null && cv < 0.28) ? 'moyenne' : 'faible';
  // atouts annoncés (automatiques, corrigeables) + ajustements du conseiller ; exclusions à part
  const nRes = top5.filter(c => c.res).length;
  const autoA = VA.atouts(P); const byK = {}; adjArr.forEach(a => { if (a.k) byK[a.k] = a; });
  // quand les comparables viennent de la résidence elle-même, ses atouts collectifs (piscine, standing, vue) sont déjà dans leurs prix
  const dejaRes = nRes >= 3 ? ['piscine', 'standing', 'mer', 'terrasse', 'garage', 'cave'] : []; // dans une résidence, terrasses et garages se vendent avec : ils sont déjà dans les prix
  const items = autoA.map(a => { const o = byK[a.k]; const deja = dejaRes.includes(a.k); return Object.assign({}, a, {deja}, o ? {on: o.on !== false, p: o.p != null ? +o.p : a.p, e: o.e != null ? +o.e : a.e} : {on: !deja}); })
    .concat(adjArr.filter(a => !a.k).map(a => ({k: null, l: a.l, p: +a.p || 0, e: +a.e || 0, on: a.on !== false, auto: false})));
  const onItems = items.filter(a => a.on);
  // les atouts annoncés se cumulent jusqu'à +30 % (ils se recoupent : vue, standing, piscine vont ensemble) ; ce que le conseiller a vu s'ajoute, ±25 %
  // plafond des atouts : les meilleures ventes récentes du quartier (9e décile à 350 m, 3 ans) ; un bien ne vaut pas plus que ce que le quartier a déjà payé
  const near90 = (() => { const v = all.filter(r => r.km <= 350 && ageY(r.d) <= 3).map(r => r.pm2r).sort((a, b) => a - b); return v.length >= 20 ? pctl(v, 0.9) : null; })();
  const capAuto = near90 && m5 ? clamp(Math.round((near90 / m5 - 1) * 100), 0, 30) : 25;
  const totAuto = clamp(onItems.filter(a => a.auto).reduce((s, a) => s + (+a.p || 0), 0), -35, capAuto), totMan = clamp(onItems.filter(a => !a.auto).reduce((s, a) => s + (+a.p || 0), 0), -25, 25);
  const tot = clamp(totAuto + totMan, -35, 60); const totE = onItems.reduce((s, a) => s + (+a.e || 0), 0);
  const valeurAj = valeur ? Math.round((valeur * (1 + tot / 100) + totE) / 1000) * 1000 : null;
  // quartier à deux vitesses : à 350 m et 3 ans, le 9e décile des €/m² dépasse de 35 % la médiane (front de mer, résidences de standing)
  let deuxMarches = null; { const near = all.filter(r => r.km <= 350 && ageY(r.d) <= 3).map(r => r.pm2r).sort((a, b) => a - b); if (near.length >= 30) { const m = med(near), p90 = pctl(near, 0.9), p25 = pctl(near, 0.25); if (p90 / m >= 1.35) {
      const st = {}; all.filter(r => r.km <= 350 && ageY(r.d) <= 3 && r.a).forEach(r => { const k = r.a.replace(/^\d+\s*(bis|ter)?\s*/i, ''); (st[k] = st[k] || []).push(r.pm2r); });
      const hauts = Object.entries(st).map(([k, v]) => ({rue: k, n: v.length, med: med(v)})).filter(x => x.n >= 3 && x.med >= m * 1.25).sort((a, b) => b.med - a.med).slice(0, 5);
      const bas = Object.entries(st).map(([k, v]) => ({rue: k, n: v.length, med: med(v)})).filter(x => x.n >= 3 && x.med <= m * 0.95).sort((a, b) => a.med - b.med).slice(0, 4);
      deuxMarches = {n: near.length, med: m, p25, p90, hauts, bas}; } } }
  const ecart = (A.prix && valeur) ? A.prix / valeur - 1 : null;
  const ecartAj = (A.prix && valeurAj) ? A.prix / valeurAj - 1 : null;
  const ecart8 = (A.prix && m8) ? A.prix / (m8 * S) - 1 : null;
  const lib = e => e == null ? {t: 'Pas assez de ventes', c: 'muted'} : e <= -0.08 ? {t: 'Sous le marché', c: 'ok'} : e <= 0.05 ? {t: 'Dans le marché', c: 'acc'} : e <= 0.12 ? {t: 'Un peu au-dessus', c: 'warn'} : {t: 'Au-dessus du marché', c: 'bad'};
  return {type, S, T, lastYear, ref, fac, slope, all, cands, ecartes, top5, top8, m5, m8, valeur, valeurAj, lo, hi, fourchette: valeur ? [Math.round(valeur * lo / 1000) * 1000, Math.round(valeur * hi / 1000) * 1000] : null,
    cv, fiab, tot, totE, totAuto, totMan, capAuto, near90, items, atouts: items.filter(a => a.auto), nRes, situe, deuxMarches, ecart, ecartAj, ecart8, libelle: lib(ecart), libelleAj: lib(ecartAj), minmax5: top5.length ? [Math.min(...top5.map(c => c.pm2r)), Math.max(...top5.map(c => c.pm2r))] : null, medAll, n: all.length, excl: excl.size};
};

/* ---------- géométrie ---------- */
const closed = r => (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) ? r.slice(0, -1) : r;
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
const inPoly = ([x, y], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
VA.geo = {closed, area, inPoly};
VA.sujet = function (P) {
  if (P._sujet !== undefined) return P._sujet;
  const B = P.carte && P.carte.bati || []; if (!B.length) return (P._sujet = null);
  const A = P.annonce || {}; const S = A.surface || null; const pt = [0, 0];
  // candidats : bâtiments à moins de 45 m du point (ou le contenant) ; on écarte les abris (< 2,8 m) et on préfère les logements et la surface qui colle
  const distTo = b => { let dmin = Math.hypot(b.c[0], b.c[1]); b.g.forEach(r => { const rr = closed(r); if (inPoly(pt, rr)) dmin = 0; rr.forEach(p => { dmin = Math.min(dmin, Math.hypot(p[0], p[1])); }); }); return dmin; };
  const parcels = P.carte.parcels || [];
  const parcelOf = c => parcels.find(p => p.g.some(r => inPoly(c, closed(r))));
  const pPoint = parcelOf(pt);
  // bâtiments à moins de 45 m, plus tous ceux de la parcelle du point et de la parcelle du bâtiment résidentiel le plus proche (copropriétés horizontales : le point d'adresse est souvent sur l'accès)
  const withD = B.map(b => ({b, d: distTo(b)}));
  const near = withD.filter(x => x.d <= 45);
  const nearestRes = withD.filter(x => x.b.h >= 2.8 && (x.b.nl > 0 || /r[ée]sidentiel|indiff/i.test(x.b.u || ''))).sort((a, b) => a.d - b.d)[0];
  const pRes = nearestRes ? parcelOf(nearestRes.b.c) : null;
  const inParcel = p => p && p.m2 < 30000 ? withD.filter(x => p.g.some(r => inPoly(x.b.c, closed(r)))) : [];
  const cands = []; const seen = new Set(); near.concat(inParcel(pPoint), inParcel(pRes)).forEach(x => { if (!seen.has(x.b)) { seen.add(x.b); cands.push(x); } });
  if (!cands.length) return (P._sujet = null);
  const scored = cands.map(x => { const b = x.b; const emp = Math.abs(area(closed(b.g[0]))); const niv = b.et || (b.h ? Math.max(1, Math.round(b.h / 3)) : 1); const shab = emp * niv;
    let s = Math.min(1.2, x.d / 200); if (x.d <= 15) s -= 1.0; if (!b.h || b.h < 2.8) s += 2; if (emp < 25) s += 1.5; if (b.u && /r[ée]sidentiel/i.test(b.u)) s -= 0.4; if (b.nl > 0) s -= 0.3; if (b.u && /annexe|agricole|industriel|commercial/i.test(b.u)) s += 1; if (S && shab > 20) s += Math.min(2.5, Math.abs(Math.log(shab / S)) * 1.6);
    return {b, s, d: x.d}; }).sort((a, b) => a.s - b.s);
  return (P._sujet = scored[0].b);
};
VA.parcelleDe = function (P, b) { if (!b) return null; const c = b.c; return (P.carte.parcels || []).find(p => p.g.some(r => inPoly(c, closed(r)))) || null; };
VA.orientation = function (b) {
  if (!b) return null; const r = closed(b.g[0]); let best = null;
  for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (!best || L > best.L) best = {L, a, c}; }
  if (!best) return null;
  // normale au plus long côté, orientée vers l'extérieur (côté opposé au centroïde)
  const mx = (best.a[0] + best.c[0]) / 2, my = (best.a[1] + best.c[1]) / 2;
  let nx = -(best.c[1] - best.a[1]), ny = best.c[0] - best.a[0]; const Ln = Math.hypot(nx, ny); nx /= Ln; ny /= Ln;
  if ((b.c[0] - mx) * nx + (b.c[1] - my) * ny > 0) { nx = -nx; ny = -ny; }
  const az = (Math.atan2(nx, ny) * 180 / Math.PI + 360) % 360;
  const n = ['nord', 'nord-nord-est', 'nord-est', 'est-nord-est', 'est', 'est-sud-est', 'sud-est', 'sud-sud-est', 'sud', 'sud-sud-ouest', 'sud-ouest', 'ouest-sud-ouest', 'ouest', 'ouest-nord-ouest', 'nord-ouest', 'nord-nord-ouest'];
  const lib = n[Math.round(az / 22.5) % 16];
  return {az: Math.round(az), lib, art: (/^(est|ouest)/.test(lib) ? 'à l’' : 'au ') + lib, L: Math.round(best.L)};
};

/* ---------- soleil ---------- */
VA.sun = function (P) {
  const lat = P.centre.lat, lon = P.centre.lon, rad = Math.PI / 180;
  const SEASONS = {hiver: {doy: 355, tz: 1, lab: '21 décembre', court: 'Hiver'}, equinoxe: {doy: 80, tz: 1, lab: '21 mars', court: 'Printemps / automne'}, ete: {doy: 172, tz: 2, lab: '21 juin', court: 'Été'}};
  const solar = (doy, tz, h) => {
    const Bq = 360 / 365 * (doy - 81) * rad;
    const eot = 9.87 * Math.sin(2 * Bq) - 7.53 * Math.cos(Bq) - 1.5 * Math.sin(Bq);
    const decl = -23.44 * Math.cos(360 / 365 * (doy + 10) * rad) * rad;
    const tst = h * 60 - tz * 60 + 4 * lon + eot;
    const HA = (tst / 4 - 180) * rad, phi = lat * rad;
    const el = Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(HA));
    const az = ((Math.atan2(Math.sin(HA), Math.cos(HA) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / rad + 180) + 360) % 360;
    return {el: el / rad, az};
  };
  const B = P.carte.bati || []; const bS = VA.sujet(P);
  const ring = bS ? closed(bS.g[0]) : [];
  const minY = ring.length ? Math.min(...ring.map(p => p[1])) : 0;
  const edgeX = ring.filter(p => p[1] <= minY + 1.5).map(p => p[0]);
  const others = bS ? B.filter(b => b !== bS) : [];
  const ringDist = (r1, r2) => { let dm = 1e9; r1.forEach(p => r2.forEach(q => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < dm) dm = d; })); return dm; };
  const attached = bS ? others.filter(b => ringDist(ring, closed(b.g[0])) < 1.2) : [];
  const inAnyBuilding = pt => others.some(b => b.g.some(r => inPoly(pt, closed(r)))) || (bS && bS.g.some(r => inPoly(pt, closed(r))));
  let sud = [];
  if (edgeX.length) { for (const dy of [3, 6, 9]) { const pts = [0.15, 0.5, 0.85].map(t => [Math.min(...edgeX) + 1.5 + t * Math.max(0, Math.max(...edgeX) - Math.min(...edgeX) - 3), minY - dy]).filter(p => !inAnyBuilding(p)); if (pts.length >= 2) { sud = pts; break; } } }
  const vec = (el, az) => { const Lsh = Math.min(1 / Math.tan(el * rad), 80); const a = (az + 180) * rad; return [Lsh * Math.sin(a), Lsh * Math.cos(a)]; };
  const sub = (p, px) => { p = p.map(px); if (area(p) < 0) p = p.slice().reverse(); return 'M' + p.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z'; };
  const shadows = (el, az, px) => {
    if (el <= 0.5) return '';
    const [ux, uy] = vec(el, az); let d = '';
    B.forEach(b => { const h = b.h || 3; const vx = ux * h, vy = uy * h; b.g.forEach(r0 => { const r = closed(r0); d += sub(r.map(([x, y]) => [x + vx, y + vy]), px); for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; d += sub([a, c, [c[0] + vx, c[1] + vy], [a[0] + vx, a[1] + vy]], px); } }); });
    return d;
  };
  const shadedBy = (el, az) => {
    if (!sud.length || el <= 0.5 || !bS) return null;
    const [ux, uy] = vec(el, az); let hits = 0; const who = {};
    const floorH = (P.annonce && P.annonce.type === 'A' && P.annonce.etage > 0) ? Math.min(P.annonce.etage * 3, Math.max(0, (bS.h || 3) - 2)) : 0; // appartement : on regarde à la hauteur de l'étage
    sud.forEach(pt => { for (const b of B) { if (b === bS || attached.includes(b)) continue; const h = ((b.zs != null && bS.zs != null) ? b.zs - bS.zs : 0) + (b.h || 3) - floorH; if (h <= 0.3) continue; const vx = ux * h, vy = uy * h; let hit = false;
      for (const r0 of b.g) { const r = closed(r0); if (inPoly(pt, r.map(([x, y]) => [x + vx, y + vy]))) { hit = true; break; } for (let i = 0; i < r.length && !hit; i++) { const a = r[i], c = r[(i + 1) % r.length]; if (inPoly(pt, [a, c, [c[0] + vx, c[1] + vy], [a[0] + vx, a[1] + vy]])) hit = true; } }
      if (hit) { hits++; const d = Math.round(Math.hypot(b.c[0] - bS.c[0], b.c[1] - bS.c[1])); who[(b.nl > 2 ? 'd’un immeuble' : 'd’un bâtiment') + ' voisin à ' + d + ' m'] = 1; break; } } });
    return {part: hits / sud.length, who: Object.keys(who)};
  };
  const etat = (s, h) => { const {el, az} = solar(s.doy, s.tz, h); if (el <= 0) return {el, az, nuit: true}; let jd = 'ok', who = []; const sb = shadedBy(el, az); if (sb && sb.part >= 0.5) { jd = 'ombre'; who = sb.who; } else if (sb && sb.part > 0) { jd = 'partiel'; who = sb.who; } if (!bS || !sud.length) jd = 'na'; return {el, az, jd, who}; };
  const hhmm = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  const dur = h => { const m = Math.round(h * 60); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
  const plages = s => {
    const seg = []; let lever = null, coucher = null, prev = null;
    for (let h = 4; h <= 22; h += 1 / 6) { const x = etat(s, h); if (prev && prev.nuit && !x.nuit) lever = h; if (prev && !prev.nuit && x.nuit) coucher = h;
      const on = !x.nuit && x.jd === 'ok'; if (on) { if (seg.length && Math.abs(seg[seg.length - 1][1] - (h - 1 / 6)) < 1e-6) seg[seg.length - 1][1] = h; else seg.push([h, h]); } prev = x; }
    const tot = seg.reduce((a, p) => a + p[1] - p[0], 0);
    return {lever, coucher, seg: seg.filter(p => p[1] - p[0] >= 0.25), tot, txt: (!bS || !sud.length) ? 'terrasse non identifiable' : seg.length ? seg.filter(p => p[1] - p[0] >= 0.25).map(p => `${hhmm(p[0])} → ${hhmm(p[1])}`).join(', ') + ` (${dur(tot)})` : 'jamais (toujours à l’ombre d’un voisin)'};
  };
  return {SEASONS, solar, shadows, etat, plages, hhmm, dur, sujet: bS, sud, attached};
};

/* ---------- carte SVG ---------- */
VA.mapSvg = function (P, opts) {
  opts = opts || {};
  const W = 640, H = 560, R = 250; const sx = W / (2 * R), sy = H / (2 * 226);
  const px = ([x, y]) => [(x + R) * sx, (226 - y) * sy];
  const poly = r => r.map(p => px(p).map(v => v.toFixed(1)).join(',')).join(' ');
  const g = [];
  const parcels = P.carte.parcels || [], bati = P.carte.bati || [];
  const bS0 = VA.sujet(P); const pb = VA.parcelleDe(P, bS0); const pid = (pb && pb.id) || (P.parcelle && P.parcelle.id);
  g.push('<g id="gParc">' + parcels.map(p => p.g.map(r => `<polygon points="${poly(r)}" fill="${p.id === pid ? 'rgba(232,100,27,.10)' : 'none'}" stroke="${p.id === pid ? '#E8641B' : '#cfd1ca'}" stroke-width="${p.id === pid ? 1.8 : .8}"><title>Parcelle ${esc(p.sec)} ${esc(String(p.num).replace(/^0+/, ''))} · ${fmt(p.m2)} m²</title></polygon>`).join('')).join('') + '</g>');
  g.push('<g id="gSun"></g>');
  const bS = VA.sujet(P);
  g.push('<g id="gBati">' + bati.map(b => b.g.map(r => `<polygon points="${poly(r)}" fill="${b === bS ? '#E8641B' : b.nl > 2 ? '#aab0c0' : '#c9ccc4'}" stroke="${b === bS ? '#b84d12' : '#9aa0ad'}" stroke-width=".6"><title>${b.n ? esc(b.n) + ' · ' : ''}${b.h ? b.h + ' m' : 'hauteur inconnue'}${b.nl ? ' · ' + b.nl + ' logement' + (b.nl > 1 ? 's' : '') : ''}${b.zs != null ? ' · sol ' + b.zs + ' m' : ''}</title></polygon>`).join('')).join('') + '</g>');
  const V = VA.ventes(P); const now = Date.now();
  g.push('<g id="gVentes">' + V.filter(v => Math.abs(v.x) <= R && Math.abs(v.y) <= 226).map(v => { const [x, y] = px([v.x, v.y]); const age = (now - new Date(v.d).getTime()) / (365.25 * 864e5); const op = age < 1.5 ? .95 : age < 3.5 ? .7 : .45; const r = 3.2 + Math.min(3, v.s / 90);
    const t = `${v.t === 'M' ? 'Maison' : 'Appartement'} ${fmt(v.s)} m²${v.n ? ' · ' + v.n + ' p.' : ''} · ${kE(v.pk * 1000)} · ${m2(v.pm2)} · ${monthFr(v.d)}${v.a ? ' · ' + esc(niceAdr(v.a)) : ''}`;
    return v.t === 'M' ? `<rect x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" fill="#15171c" fill-opacity="${op}" stroke="#fff" stroke-width=".8"><title>${t}</title></rect>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#15171c" fill-opacity="${op}" stroke="#fff" stroke-width=".8"><title>${t}</title></circle>`; }).join('') + '</g>');
  const D = VA.dpeList(P); const col = {A: '#1b8a3a', B: '#4caf50', C: '#b5c92b', D: '#f3d32b', E: '#f0a022', F: '#e4651c', G: '#c62828'};
  g.push('<g id="gDpe">' + D.filter(d => Math.abs(d.x) <= R && Math.abs(d.y) <= 226).map(d => { const [x, y] = px([d.x, d.y]); const rec = d.date >= (P.dpe.since || ''); return `<rect x="${(x - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="8" height="8" rx="2" fill="${col[d.l] || '#999'}" stroke="${rec ? '#2F44CE' : '#fff'}" stroke-width="${rec ? 1.6 : .8}"><title>DPE ${esc(d.l)} · ${d.t === 'm' ? 'maison' : 'appartement'} ${d.s} m² · ${dateFr(d.date)} · ${esc(niceAdr(d.adr))}${d.en ? ' · ' + energieLib(d.en) : ''}</title></rect>`; }).join('') + '</g>');
  // comparables
  if (opts.est && opts.est.top5) g.push('<g id="gComp">' + opts.est.top5.map((c, i) => { if (Math.abs(c.x) > R || Math.abs(c.y) > 226) return ''; const [x, y] = px([c.x, c.y]); return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#2F44CE" stroke="#fff" stroke-width="1.5"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#fff">${i + 1}</text><title>Comparable ${i + 1} · ${m2(c.pm2r)} recalé</title></g>`; }).join('') + '</g>');
  // disque du portail
  const A = P.annonce;
  if (A.blur && P.centre.source !== 'blur') { const KX = 111320 * Math.cos(P.centre.lat * Math.PI / 180), KY = 111200; const ob = [(A.blur.lon - P.centre.lon) * KX, (A.blur.lat - P.centre.lat) * KY]; if (Math.hypot(ob[0], ob[1]) < 600) { const [x, y] = px(ob); g.push(`<g id="gBlur"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(A.blur.r * sx).toFixed(1)}" fill="rgba(47,68,206,.08)" stroke="#2F44CE" stroke-dasharray="5 4" stroke-width="1.2"/><text x="${x.toFixed(1)}" y="${(y - A.blur.r * sx - 4).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#2F44CE">position du portail</text></g>`); } }
  else if (A.blur) { const [x, y] = px([0, 0]); g.push(`<g id="gBlur"><circle cx="${x}" cy="${y}" r="${(A.blur.r * sx).toFixed(1)}" fill="rgba(47,68,206,.08)" stroke="#2F44CE" stroke-dasharray="5 4" stroke-width="1.2"/></g>`); }
  // sujet
  const [cx, cy] = px([0, 0]);
  g.push(`<g id="gSujet"><circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="#E8641B" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="4" fill="#E8641B"/></g>`);
  // vivre ici
  if (P.vivre) { const icons = {ecoles: '#6d28d9', commerces: '#0e7490', bus: '#2F44CE', gares: '#2F44CE', sante: '#c0392b', loisirs: '#2d8a4e', plage: '#0284c7', cafes: '#b7791f'}; g.push('<g id="gVivre" style="display:none">' + Object.entries(P.vivre).map(([k, v]) => (v.items || []).filter(it => Math.abs(it.o[0]) <= R && Math.abs(it.o[1]) <= 226).map(it => { const [x, y] = px(it.o); return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${icons[k] || '#555'}" stroke="#fff" stroke-width="1.2"/><title>${esc(k)} · ${esc(it.n || it.k)} · ${it.d} m</title></g>`; }).join('')).join('') + '</g>'); }
  // échelle, nord, labels
  const s100 = 100 * sx; g.push(`<g id="gLabels"><line x1="16" y1="${H - 16}" x2="${16 + s100}" y2="${H - 16}" stroke="#15171c" stroke-width="2"/><text x="16" y="${H - 22}" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#15171c">100 m</text><g transform="translate(${W - 26},26)"><polygon points="0,-12 5,6 0,2 -5,6" fill="#15171c"/><text y="20" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#15171c">N</text></g></g>`);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan du quartier autour du bien">${g.join('')}</svg>`;
};

/* ---------- graphiques ---------- */
VA.chartMedianes = function (P, est) {
  const M = P.marche; if (!M || !M.years.length) return '';
  const type = est ? est.type : 'A'; const other = type === 'M' ? 'A' : 'M';
  const yrs = M.years; const vals = yrs.map(y => M.MED[type][y]); const vals2 = yrs.map(y => M.MED[other][y]);
  const allv = vals.concat(vals2).filter(v => v); if (!allv.length) return '<p class="note">Pas assez de ventes pour tracer les médianes annuelles.</p>';
  const W = 620, H = 220, pl = 54, pr = 12, pt = 14, pb = 30; const mx = Math.max(...allv) * 1.12, mn = Math.min(...allv) * 0.85;
  const X = i => pl + (i + 0.5) * (W - pl - pr) / yrs.length; const Y = v => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn));
  const bw = Math.min(42, (W - pl - pr) / yrs.length * 0.6);
  let s = `<svg viewBox="0 0 ${W} ${H}">`;
  for (let k = 0; k <= 3; k++) { const v = mn + (mx - mn) * k / 3; s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#e1e2dd"/><text x="${pl - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10" fill="#8a8f9c">${fmt(v)}</text>`; }
  yrs.forEach((y, i) => { const v = vals[i]; if (v) s += `<rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw}" height="${(H - pb - Y(v)).toFixed(1)}" rx="4" fill="${y === (est && est.lastYear) ? '#2F44CE' : '#aab0c0'}"><title>${y} · ${type === 'M' ? 'maisons' : 'appartements'} : ${m2(v)} · ${M.CNT[type][y]} ventes</title></rect>`;
    s += `<text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#4c5160">${y}</text>`; if (v) s += `<text x="${X(i)}" y="${(Y(v) - 4).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#15171c">${fmt(v)}</text>`; });
  const pts = yrs.map((y, i) => vals2[i] ? [X(i), Y(vals2[i])] : null).filter(Boolean);
  if (pts.length > 1) s += `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#E8641B" stroke-width="2" stroke-dasharray="4 3"/>` + pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#E8641B"/>`).join('');
  s += '</svg>';
  return `<div class="chart">${s}</div><div class="legend"><span><i style="background:#aab0c0"></i>${type === 'M' ? 'Maisons' : 'Appartements'} : médiane €/m² à 800 m (≥ 5 ventes)</span><span><i style="background:#E8641B"></i>${other === 'M' ? 'Maisons' : 'Appartements'} (repère)</span></div>`;
};
VA.chartNuage = function (P, est) {
  if (!est || !est.all || !est.all.length) return '';
  const pts = est.all; const A = P.annonce;
  const xs = pts.map(p => p.s).concat(A.surface ? [A.surface] : []); const ys = pts.map(p => p.pm2r).concat(A.prix && A.surface ? [A.prix / A.surface] : []);
  const W = 620, H = 260, pl = 54, pr = 14, pt = 14, pb = 32;
  const xmn = Math.max(0, Math.min(...xs) * 0.9), xmx = Math.max(...xs) * 1.05, ymn = Math.min(...ys) * 0.9, ymx = Math.max(...ys) * 1.06;
  const X = v => pl + (W - pl - pr) * (v - xmn) / (xmx - xmn); const Y = v => pt + (H - pt - pb) * (1 - (v - ymn) / (ymx - ymn));
  let s = `<svg viewBox="0 0 ${W} ${H}">`;
  for (let k = 0; k <= 4; k++) { const v = ymn + (ymx - ymn) * k / 4; s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#e1e2dd"/><text x="${pl - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10" fill="#8a8f9c">${fmt(v)}</text>`; }
  for (let k = 0; k <= 5; k++) { const v = xmn + (xmx - xmn) * k / 5; s += `<text x="${X(v).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#8a8f9c">${fmt(v)} m²</text>`; }
  if (est.m5) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(est.m5).toFixed(1)}" y2="${Y(est.m5).toFixed(1)}" stroke="#2F44CE" stroke-dasharray="5 4"/>`;
  const topIds = new Set(est.top5.map(c => c.d + c.x + c.y + c.s));
  pts.forEach(p => { const top = topIds.has(p.d + p.x + p.y + p.s); s += `<circle cx="${X(p.s).toFixed(1)}" cy="${Y(p.pm2r).toFixed(1)}" r="${top ? 6 : 3.5}" fill="${top ? '#2F44CE' : '#9aa0ad'}" fill-opacity="${top ? 1 : .55}" stroke="#fff" stroke-width=".8"><title>${fmt(p.s)} m² · ${m2(p.pm2r)} recalé (${m2(p.pm2)} en ${p.d.slice(0, 4)}) · ${p.km} m${p.a ? ' · ' + esc(niceAdr(p.a)) : ''}</title></circle>`; });
  if (A.prix && A.surface) { const x = X(A.surface), y = Y(A.prix / A.surface); s += `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="#E8641B" stroke-width="3"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#E8641B"/><title>L’annonce : ${fmt(A.surface)} m² à ${m2(A.prix / A.surface)}</title></g>`; }
  s += '</svg>';
  return `<div class="chart">${s}</div><div class="legend"><span><i style="background:#9aa0ad"></i>Ventes du même type à 800 m, recalées à aujourd’hui</span><span><i style="background:#2F44CE"></i>Les 5 comparables retenus · trait : leur médiane</span><span><i style="background:#E8641B;border-radius:50%"></i>L’annonce</span></div>`;
};
VA.histDpe = function (P) {
  const DC = P.dpe && P.dpe.DC; if (!DC) return '';
  const mx = Math.max(1, ...Object.values(DC)); const col = {A: '#1b8a3a', B: '#4caf50', C: '#b5c92b', D: '#f3d32b', E: '#f0a022', F: '#e4651c', G: '#c62828'};
  return '<div class="hist">' + 'ABCDEFG'.split('').map(k => `<div><span>${DC[k]}</span><b style="height:${Math.max(2, DC[k] / mx * 90)}%;background:${col[k]}"></b><span>${k}</span></div>`).join('') + '</div>';
};
})(window.VA);
