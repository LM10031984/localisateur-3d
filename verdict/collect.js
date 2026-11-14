/* Verdict annonce — collecte des données publiques, dans le navigateur de l'agent.
   Sources : Bien'ici (JSON public de l'annonce), BAN, ADEME (DPE), API Carto IGN (cadastre, GPU), Cerema DVF+ (ventes),
   registre des copropriétés (tabular-api data.gouv), Géorisques, BD TOPO IGN (bâtiments), OpenStreetMap (Overpass). */
window.VA = window.VA || {};
(function () {
'use strict';
const VERSION = '1.0';
const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[\s  ]/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
const bool = v => v === true || v === 'true' || v === 1;
const txt = (v, n) => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, n || 200);
const rad = Math.PI / 180;
const dist = (a, b, c, d) => { const x = (d - b) * rad * Math.cos((a + c) / 2 * rad), y = (c - a) * rad; return Math.hypot(x, y) * 6371000; };
const med = a => { a = a.filter(v => v != null && !isNaN(v)).sort((x, y) => x - y); return a.length ? Math.round(a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
const j1 = async (u, opt, ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms || 25000); try { const r = await fetch(u, Object.assign({signal: c.signal}, opt || {})); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); } };
const j = async (u, opt, ms, retry) => { try { return await j1(u, opt, ms); } catch (e) { if (retry === false) throw e; await new Promise(r => setTimeout(r, 700)); return j1(u, opt, ms); } };

/* ---------- 1. Lecture de l'annonce ---------- */
async function lireAnnonce(url) {
  const A = {v: VERSION, src: url, capture: new Date().toISOString()};
  let u; try { u = new URL(url); } catch (e) { throw new Error('Ce lien n’est pas une adresse web valide.'); }
  if (/bienici\.com$/.test(u.hostname)) {
    const id = u.pathname.split('/').filter(Boolean).pop();
    const d = await j('https://www.bienici.com/realEstateAd.json?id=' + encodeURIComponent(id)).catch(() => null);
    if (!d || !d.price) throw new Error('Bien’ici n’a pas rendu cette annonce (lien incomplet ou annonce retirée).');
    Object.assign(A, {
      portail: 'Bien’ici', id: d.id || id, titre: txt(d.title || d.generatedTitle, 140),
      type: d.propertyType === 'house' ? 'M' : d.propertyType === 'flat' ? 'A' : '?', typeLib: txt(d.propertyType, 30),
      prix: num(d.price), surface: num(d.surfaceArea), pieces: num(d.roomsQuantity), chambres: num(d.bedroomsQuantity),
      terrain: num(d.landSurfaceArea) || num(d.gardenSurfaceArea), terrasse: num(d.terraceSurfaceArea), piscine: bool(d.hasPool),
      niveaux: num(d.floorQuantity), etage: num(d.floor), annee: num(d.yearOfConstruction), expo: d.exposition ? txt(d.exposition, 30) : null,
      chauffage: d.heating ? txt(d.heating, 60) : null, travaux: bool(d.workToDo), neuf: bool(d.newProperty),
      dpe: {l: d.energyClassification || null, kwh: num(d.energyValue), gl: d.greenhouseGazClassification || null, ges: num(d.greenhouseGazValue),
            date: d.energyPerformanceDiagnosticDate ? String(d.energyPerformanceDiagnosticDate).slice(0, 10) : null, cmin: num(d.minEnergyConsumption), cmax: num(d.maxEnergyConsumption)},
      copro: {is: bool(d.isInCondominium), lots: num(d.condominiumPartsQuantity), charges: num(d.annualCondominiumFees)},
      cp: d.postalCode || null, ville: d.city || null, insee: (d.district && (d.district.insee_code || d.district.code_insee)) || null,
      quartier: (d.district && d.district.libelle) || null,
      agence: (d.contactRelativeData && d.contactRelativeData.agencyNameToDisplay) || null, exclusif: bool(d.isExclusiveSaleMandate),
      baisse: bool(d.priceHasDecreased), modif: d.modificationDate || null, pub: (d.publicationDate && !/^1970/.test(d.publicationDate)) ? d.publicationDate : null,
      photos: (d.photos || []).length, photo: (d.photos && d.photos[0] && d.photos[0].url_photo) || null, desc: txt(d.description, 900),
      blur: (d.blurInfo && d.blurInfo.centroid) ? {lat: +d.blurInfo.centroid.lat, lon: +d.blurInfo.centroid.lon, r: num(d.blurInfo.radius) || 50} : null,
      adresseConnue: bool(d.addressKnown), honoraires: d.agencyFeeUrl || null
    });
    if (!A.surface) throw new Error('L’annonce n’indique pas de surface.');
    return A;
  }
  throw new Error('Pour l’instant, seuls les liens Bien’ici sont lus automatiquement. Pour un autre portail, utilisez « Saisir l’annonce à la main » (prix, surface, commune, DPE) : la recherche d’adresse fonctionne pareil.');
}

/* ---------- 2. Collecte autour du bien ---------- */
async function collect(input, onStep) {
  const t0 = performance.now();
  const step = async (name, fn) => { const t = performance.now(); onStep && onStep(name, 'run'); try { const r = await fn(); P.etapes[name] = {ok: true, ms: Math.round(performance.now() - t)}; onStep && onStep(name, 'ok', Math.round((performance.now() - t) / 100) / 10 + ' s'); return r; }
    catch (e) { P.etapes[name] = {ok: false, err: String(e.message || e).slice(0, 120), ms: Math.round(performance.now() - t)}; onStep && onStep(name, 'ko', String(e.message || e).slice(0, 70)); console.warn('Verdict', name, e); return null; } };
  const P = {v: 1, outil: 'verdict', genere: new Date().toISOString(), etapes: {}};
  let A;
  if (input.url) { A = await lireAnnonce(input.url); }
  else if (input.manuel) { A = Object.assign({v: VERSION, capture: new Date().toISOString(), portail: input.manuel.portail || 'saisie', id: 'man-' + Date.now().toString(36), photos: 0}, input.manuel); }
  else if (input.adresse) { A = {v: VERSION, mode: 'adresse', q: input.adresse, capture: new Date().toISOString(), type: '?', id: 'adr-' + Date.now().toString(36)}; }
  else throw new Error('Rien à analyser.');
  P.annonce = A;

  let lat0, lon0, insee, centre = {};
  await step('Position', async () => {
    if (A.mode === 'adresse') {
      const ban = await j('https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(A.q));
      const f = ban.features[0]; if (!f) throw new Error('adresse inconnue de la Base Adresse Nationale');
      [lon0, lat0] = f.geometry.coordinates; insee = f.properties.citycode;
      centre = {source: 'ban', adr: f.properties.name, cp: f.properties.postcode, ville: f.properties.city, score: +f.properties.score.toFixed(2), label: f.properties.label};
      A.cp = f.properties.postcode; A.ville = f.properties.city; A.titre = f.properties.label;
    } else if (A.blur && A.blur.lat) {
      lat0 = A.blur.lat; lon0 = A.blur.lon;
      const rv = await j(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon0}&lat=${lat0}`).catch(() => null);
      const f = rv && rv.features[0];
      insee = A.insee || (f && f.properties.citycode) || null;
      centre = {source: 'blur', r: A.blur.r, adr: f ? f.properties.name : null, cp: A.cp || (f && f.properties.postcode), ville: A.ville || (f && f.properties.city)};
    } else {
      const q = [A.adresse, A.quartier, A.cp, A.ville].filter(Boolean).join(' ');
      const ban = await j('https://api-adresse.data.gouv.fr/search/?limit=1&q=' + encodeURIComponent(q));
      const f = ban.features[0]; if (!f) throw new Error('commune inconnue : ' + q);
      [lon0, lat0] = f.geometry.coordinates; insee = f.properties.citycode;
      centre = {source: f.properties.type === 'municipality' ? 'commune' : 'ban', adr: f.properties.label, cp: f.properties.postcode, ville: f.properties.city, score: +f.properties.score.toFixed(2)};
      if (!A.cp) A.cp = f.properties.postcode; if (!A.ville) A.ville = f.properties.city;
    }
    if (!insee) { const rv = await j(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon0}&lat=${lat0}`); insee = rv.features[0].properties.citycode; }
    centre.lat = lat0; centre.lon = lon0; centre.insee = insee;
  });
  if (!lat0) throw new Error('Impossible de situer le bien : ' + ((P.etapes.Position || {}).err || ''));

  /* Adresse retrouvée par le DPE */
  const SEL = 'numero_dpe,date_etablissement_dpe,adresse_ban,identifiant_ban,_geopoint,conso_5_usages_par_m2_ep,emission_ges_5_usages_par_m2,cout_total_5_usages,surface_habitable_logement,type_batiment,etiquette_dpe,etiquette_ges,type_energie_principale_chauffage,numero_immatriculation_copropriete,annee_construction,nombre_niveau_logement,numero_etage_appartement,nom_residence,complement_adresse_logement,code_insee_ban';
  const ADEME = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines?size=600&select=' + SEL;
  const adresse = {trouvee: false, certitude: 'aucune', candidats: []};
  if (A.mode !== 'adresse' && A.dpe && (A.dpe.date || A.dpe.kwh)) await step('Adresse par le DPE', async () => {
    const got = {}; const add = rs => (rs || []).forEach(r => { if (r.numero_dpe && !got[r.numero_dpe]) got[r.numero_dpe] = r; });
    const d = A.dpe;
    if (d.date && insee) add((await j(ADEME + '&qs=' + encodeURIComponent(`date_etablissement_dpe:"${d.date}" AND code_insee_ban:"${insee}"`))).results);
    if (d.kwh != null && insee) add((await j(ADEME + '&qs=' + encodeURIComponent(`code_insee_ban:"${insee}" AND conso_5_usages_par_m2_ep:[${(d.kwh - 0.6).toFixed(1)} TO ${(d.kwh + 0.6).toFixed(1)}]`)).catch(() => ({results: []}))).results);
    if (A.blur) add((await j(ADEME + `&geo_distance=${lon0},${lat0},${(A.blur.r || 50) + 200}`).catch(() => ({results: []}))).results);
    const cands = Object.values(got).map(r => {
      const g = (r._geopoint || '').split(','); const la = +g[0], lo = +g[1];
      let s = 0; const why = [];
      if (d.date && r.date_etablissement_dpe === d.date) { s += 4; why.push('même date'); }
      if (d.kwh != null && r.conso_5_usages_par_m2_ep != null) { const dk = Math.abs(r.conso_5_usages_par_m2_ep - d.kwh); if (dk <= 0.6) { s += 2; why.push('mêmes kWh'); } else if (dk <= 2) { s += 1; why.push('kWh proches'); } else if (dk > 15) s -= 1; }
      if (d.ges != null && r.emission_ges_5_usages_par_m2 != null && Math.abs(r.emission_ges_5_usages_par_m2 - d.ges) <= 0.6) { s += 2; why.push('même GES'); }
      if (d.cmin && d.cmax && r.cout_total_5_usages >= d.cmin - 1 && r.cout_total_5_usages <= d.cmax + 1) { s += 1; why.push('coût dans la fourchette'); }
      const ratio = (A.surface && r.surface_habitable_logement) ? r.surface_habitable_logement / A.surface : null;
      if (ratio != null && ratio >= 0.7 && ratio <= 1.05) { s += 1; why.push('surface cohérente'); } else if (ratio != null && (ratio < 0.5 || ratio > 1.3)) { s -= 2; why.push('surface éloignée'); }
      if ((A.type === 'M' && r.type_batiment === 'maison') || (A.type === 'A' && r.type_batiment === 'appartement')) { s += 1; why.push('même type'); } else if (A.type !== '?' && r.type_batiment && r.type_batiment !== 'immeuble') { s -= 2; }
      if (d.l && r.etiquette_dpe && r.etiquette_dpe !== d.l) s -= 1;
      const dd = la ? Math.round(dist(lat0, lon0, la, lo)) : null;
      if (dd != null && A.blur && dd <= (A.blur.r || 50) + 30) { s += 2; why.push('dans le disque du portail'); } else if (dd != null && dd <= 400) { s += 1; }
      if (dd != null && dd > 2500) s -= 3;
      return {id: r.numero_dpe, date: r.date_etablissement_dpe, adr: txt(r.adresse_ban, 80), ban: r.identifiant_ban || null, lat: la || null, lon: lo || null, d: dd, kwh: r.conso_5_usages_par_m2_ep, ges: r.emission_ges_5_usages_par_m2,
        cout: r.cout_total_5_usages, surface: r.surface_habitable_logement, type: r.type_batiment, l: r.etiquette_dpe, gl: r.etiquette_ges, energie: r.type_energie_principale_chauffage,
        copro: r.numero_immatriculation_copropriete || null, annee: r.annee_construction || null, niveaux: r.nombre_niveau_logement || null, etage: r.numero_etage_appartement, residence: txt(r.nom_residence, 40),
        complement: txt(r.complement_adresse_logement, 60), insee: r.code_insee_ban, score: s, pourquoi: why};
    }).filter(c => c.lat).sort((a, b) => b.score - a.score || (a.d || 1e9) - (b.d || 1e9));
    adresse.candidats = cands.slice(0, 8);
    const top = cands[0], second = cands[1];
    if (top && top.score >= 5) {
      adresse.trouvee = true; adresse.dpe = top;
      adresse.certitude = (top.score >= 8 && (!second || second.score <= top.score - 3)) ? 'élevée' : (top.score >= 6 && (!second || second.score <= top.score - 2)) ? 'moyenne' : 'faible';
      adresse.distBlur = top.d; lat0 = top.lat; lon0 = top.lon; if (top.insee) insee = top.insee;
    }
  });
  P.centre = centre; P.adresse = adresse; P.centre.lat = lat0; P.centre.lon = lon0; P.centre.insee = insee;
  const KX = 111320 * Math.cos(lat0 * rad), KY = 111200;
  const off = (la, lo) => [Math.round((lo - lon0) * KX), Math.round((la - lat0) * KY)];
  const ring2off = r => { const out = []; r.forEach(([lo, la]) => { const p = off(la, lo); if (!out.length || out[out.length - 1][0] !== p[0] || out[out.length - 1][1] !== p[1]) out.push(p); }); if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop(); return out; };
  const geomRings = g => !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const boxGeom = m => { const dLa = m / KY, dLo = m / KX; return {type: 'Polygon', coordinates: [[[lon0 - dLo, lat0 - dLa], [lon0 + dLo, lat0 - dLa], [lon0 + dLo, lat0 + dLa], [lon0 - dLo, lat0 + dLa], [lon0 - dLo, lat0 - dLa]]]}; };
  P.carte = {parcels: [], bati: []};

  const R800 = 800, R300 = 300;
  const tasks = [];

  /* Parcelles */
  tasks.push(step('Parcelles', async () => {
    const pt = await j('https://apicarto.ign.fr/api/cadastre/parcelle?geom=' + encodeURIComponent(JSON.stringify({type: 'Point', coordinates: [lon0, lat0]})));
    const f0 = pt.features[0];
    if (f0) P.parcelle = {id: f0.properties.idu, sec: f0.properties.section, num: f0.properties.numero, m2: f0.properties.contenance, insee: f0.properties.code_insee, g: geomRings(f0.geometry).map(poly => ring2off(poly[0]))};
    const box = await j('https://apicarto.ign.fr/api/cadastre/parcelle?_limit=1000&geom=' + encodeURIComponent(JSON.stringify(boxGeom(260))));
    P.carte.parcels = box.features.slice(0, 800).map(f => ({id: f.properties.idu, sec: f.properties.section, num: f.properties.numero, m2: f.properties.contenance, g: geomRings(f.geometry).map(poly => ring2off(poly[0]))}));
  }));

  /* Ventes : DVF Etalab (adresses, pièces, coordonnées), repli Cerema DVF+ */
  const finirVentes = (sales, source) => {
    const years = [...new Set(sales.map(x => +x.d.slice(0, 4)))].sort();
    const MED = {A: {}, M: {}}, CNT = {A: {}, M: {}};
    for (const t of ['A', 'M']) for (const y of years) { const f = sales.filter(x => x.t == t && +x.d.slice(0, 4) == y); CNT[t][y] = f.length; MED[t][y] = f.length >= 5 ? med(f.map(x => x.p / x.s)) : null; }
    const byDate = (a, b) => a.d < b.d ? 1 : -1;
    const near = sales.filter(x => x.km <= R300).sort(byDate).slice(0, 250);
    const far = sales.filter(x => x.km > R300).sort(byDate).slice(0, 400);
    if (A.mode === 'adresse' && centre.adr) { const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); const a0 = norm(centre.adr); const num = (a0.match(/^(\d+)/) || [])[1]; const w = a0.replace(/^\d+\s*(bis|ter)?\s*/, '').split(' ').filter(x => x.length > 3)[0];
      P.self = P.self || {}; P.self.ventes = sales.filter(x => x.km <= 60 && x.a && (!num || norm(x.a).startsWith(num + ' ')) && (!w || norm(x.a).includes(w))).sort((x, y) => x.d < y.d ? 1 : -1).slice(0, 6).map(x => ({d: x.d, p: x.p, t: x.t, s: x.s, n: x.n, g: x.g})); }
    P.marche = {source, years, MED, CNT, n800: sales.length, n300: near.length, dvfLast: sales.map(x => x.d).sort().pop() || null,
      ventes: near.concat(far).map(x => [x.o[0], x.o[1], x.t, Math.round(x.p / 1000), Math.round(x.s), x.n || 0, x.d, x.t == 'M' ? x.g : 0, (x.a || '').replace(/[;,]/g, ' '), x.km, x.pc || '', x.nl || 1]),
      allMed: {A: med(sales.filter(x => x.t == 'A').map(x => x.p / x.s)), M: med(sales.filter(x => x.t == 'M').map(x => x.p / x.s))}};
  };
  const ventesEtalab = async () => {
    const sec = await j(`https://cadastre.data.gouv.fr/bundler/cadastre-etalab/communes/${insee}/geojson/sections`, null, 20000);
    const near = [];
    for (const s of sec.features) { const pts = []; const flat = a => typeof a[0] == 'number' ? pts.push(a) : a.forEach(flat); flat(s.geometry.coordinates);
      if (pts.some(p => dist(lat0, lon0, p[1], p[0]) < R800)) near.push(s.properties.prefixe + s.properties.code); }
    if (!near.length) throw new Error('aucune section à 800 m');
    let rows = [], fails = 0;
    await Promise.all(near.map(async s => { try { const r = await j(`https://app.dvf.etalab.gouv.fr/api/mutations3/${insee}/${s}`, null, 25000); rows = rows.concat(r.mutations || []); } catch (e) { fails++; } }));
    if (fails && fails >= near.length / 2) throw new Error('API DVF Etalab indisponible');
    const M = {}; rows.forEach(r => (M[r.id_mutation] = M[r.id_mutation] || []).push(r));
    const sales = [];
    for (const g of Object.values(M)) { const r0 = g[0]; if (r0.nature_mutation != 'Vente') continue;
      const L = {}; g.forEach(r => { if (r.type_local == 'Appartement' || r.type_local == 'Maison') L[r.type_local + r.id_parcelle + (r.lot1_numero || '') + r.surface_reelle_bati] = r; });
      const ls = Object.values(L); if (ls.length != 1) continue; const l = ls[0]; const la = +l.latitude, lo = +l.longitude; if (!la) continue;
      const d = dist(lat0, lon0, la, lo); if (d > R800) continue; const s = +l.surface_reelle_bati, p = +r0.valeur_fonciere; if (s < 15 || p < 30000) continue;
      const pm = p / s; if (pm < 1000 || pm > 25000) continue;
      const tg = Object.values(g.reduce((o, r) => { if (+r.surface_terrain > 0) o[r.id_parcelle + '|' + (r.code_nature_culture || '')] = +r.surface_terrain; return o; }, {})).reduce((a, b) => a + b, 0);
      const n = (l.adresse_numero || '').replace('.0', ''); const voie = (l.adresse_nom_voie || '').toLowerCase().replace(/(^|\s|-|')\S/g, c => c.toUpperCase());
      const nl = new Set(g.map(r => r.id_parcelle + '|' + (r.lot1_numero || '') + '|' + r.type_local)).size;
      sales.push({d: r0.date_mutation, p, t: l.type_local[0], s, n: +l.nombre_pieces_principales || 0, a: ((/^9\d{3}$/.test(n) ? '' : n) + ' ' + voie).trim(), o: off(la, lo), km: Math.round(d), g: Math.round(tg), pc: l.id_parcelle, nl}); }
    if (!sales.length) throw new Error('aucune vente exploitable');
    finirVentes(sales, 'DVF Etalab (app.dvf.etalab.gouv.fr)');
  };
  const ventesCerema = async () => {
    const dLa = R800 / KY, dLo = R800 / KX;
    const y0 = new Date().getFullYear() - 6;
    let u = `https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/?in_bbox=${(lon0 - dLo).toFixed(6)},${(lat0 - dLa).toFixed(6)},${(lon0 + dLo).toFixed(6)},${(lat0 + dLa).toFixed(6)}&anneemut_min=${y0}&codtypbien=111,121&page_size=500`;
    let feats = [], pages = 0;
    while (u && pages < 8) { const r = await j(u, null, 30000); feats = feats.concat(r.features || []); u = r.next ? r.next.replace(/^http:/, 'https:') : null; pages++; }
    const seen = {}; const sales = [];
    feats.forEach(f => {
      const p = f.properties; if (!p || seen[p.idmutinvar]) return; seen[p.idmutinvar] = 1;
      if (p.libnatmut !== 'Vente' || p.vefa) return;
      const t = String(p.codtypbien).startsWith('11') ? 'M' : String(p.codtypbien).startsWith('12') ? 'A' : null; if (!t) return;
      const price = num(p.valeurfonc), s = num(p.sbati); if (!price || !s || s < 15 || price < 30000) return;
      const pm = price / s; if (pm < 1000 || pm > 25000) return;
      const rings = geomRings(f.geometry); if (!rings.length) return;
      const pts = []; rings.forEach(poly => poly[0].forEach(q => pts.push(q)));
      const lo = pts.reduce((a, q) => a + q[0], 0) / pts.length, la = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      const d = dist(lat0, lon0, la, lo); if (d > R800) return;
      sales.push({d: p.datemut, p: price, t, s, g: Math.round(num(p.sterr) || 0), o: off(la, lo), km: Math.round(d), pc: (p.l_idpar || [])[0] || '', nl: p.nblocmut || 1, n: 0, a: ''});
    });
    if (!sales.length) throw new Error('aucune vente exploitable');
    finirVentes(sales, 'Cerema DVF+ (open data)');
  };
  tasks.push(step('Ventes DVF', async () => { try { await ventesEtalab(); } catch (e) { console.warn('Etalab KO, repli Cerema', e); await ventesCerema(); P.marche.repli = String(e.message || e); } }));

  /* DPE du quartier */
  tasks.push(step('DPE du quartier', async () => {
    let dpe = [], u = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines?size=1000&geo_distance=${lon0},${lat0},${R300}&select=${SEL}`;
    while (u && dpe.length < 3000) { const r = await j(u); dpe = dpe.concat(r.results); u = r.next; }
    const DC = {A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0}; dpe.forEach(r => { if (DC[r.etiquette_dpe] != null) DC[r.etiquette_dpe]++; });
    const lastDpe = dpe.map(r => r.date_etablissement_dpe).sort().pop() || '';
    const since = new Date(new Date(lastDpe || Date.now()).getTime() - 182 * 864e5).toISOString().slice(0, 10);
    const sev = r => (r.date_etablissement_dpe >= since ? 100 : 0) + ({G: 3, F: 2, E: 1}[r.etiquette_dpe] || 0);
    const city = ' ' + (centre.cp || '') + ' ' + (centre.ville || '');
    const L = dpe.filter(r => r.date_etablissement_dpe >= since || 'EFG'.includes(r.etiquette_dpe) || r.numero_dpe === (adresse.dpe && adresse.dpe.id))
      .sort((a, b) => sev(b) - sev(a) || (a.date_etablissement_dpe < b.date_etablissement_dpe ? 1 : -1)).slice(0, 140)
      .map(r => { const g = (r._geopoint || '0,0').split(','); const o = off(+g[0], +g[1]);
        return [r.date_etablissement_dpe, txt((r.adresse_ban || '').replace(city, ''), 60), (r.type_batiment || 'a')[0], Math.round(r.surface_habitable_logement) || 0, r.etiquette_dpe, r.annee_construction || 0,
          r.numero_etage_appartement == null ? -1 : r.numero_etage_appartement, txt(r.nom_residence, 40), txt(r.complement_adresse_logement, 60), ({'É': 'E', 'E': 'E', 'G': 'G', 'F': 'F', 'B': 'B', 'R': 'R', 'P': 'P', 'C': 'C'})[(r.type_energie_principale_chauffage || '?')[0]] || '?',
          Math.round(r.cout_total_5_usages) || 0, r.numero_dpe || '', o[0], o[1], r.numero_immatriculation_copropriete || '', Math.round(r.conso_5_usages_par_m2_ep) || 0]; });
    const parcelDpe = dpe.filter(r => adresse.dpe && r._geo_distance != null && r._geo_distance < 60).length;
    P.dpe = {DC, nDpe: dpe.length, last: lastDpe, since, L, pres: parcelDpe};
    // dossier d'adresse : les DPE de l'adresse elle-même
    if (A.mode === 'adresse' && centre.adr) { const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); const a0 = norm(centre.adr); const num = (a0.match(/^(\d+)/) || [])[1]; const w = a0.replace(/^\d+\s*(bis|ter)?\s*/, '').split(' ').filter(x => x.length > 3)[0];
      const selfD = dpe.filter(r => { const ab = norm(r.adresse_ban); return (r._geo_distance == null || r._geo_distance < 40) && (!num || ab.startsWith(num + ' ')) && (!w || ab.includes(w)); }).sort((x, y) => x.date_etablissement_dpe < y.date_etablissement_dpe ? 1 : -1);
      P.self = P.self || {}; P.self.dpe = selfD.slice(0, 8).map(r => ({date: r.date_etablissement_dpe, l: r.etiquette_dpe, kwh: r.conso_5_usages_par_m2_ep, ges: r.emission_ges_5_usages_par_m2, surface: r.surface_habitable_logement, type: r.type_batiment, energie: r.type_energie_principale_chauffage, etage: r.numero_etage_appartement, annee: r.annee_construction, cout: r.cout_total_5_usages, copro: r.numero_immatriculation_copropriete || null}));
      const maisons = P.self.dpe.filter(x => x.type === 'maison' && x.surface > 20);
      if (P.self.dpe.length && P.self.dpe.every(x => x.type !== 'appartement') && maisons.length) { A.type = 'M'; A.surface = maisons[0].surface; A.indicatif = true; A.pieces = null; }
      else if (P.self.dpe.length === 1 && P.self.dpe[0].type === 'appartement') { A.type = 'A'; A.surface = P.self.dpe[0].surface; A.etage = P.self.dpe[0].etage; A.indicatif = true; } }
  }));

  /* Copropriétés */
  tasks.push(step('Copropriétés', async () => {
    const dLa = R300 / KY, dLo = R300 / KX;
    const base = 'https://tabular-api.data.gouv.fr/api/resources/3ea8e2c3-0038-464a-b17e-cd5c91f65ce2/data/?';
    const rc = await j(base + `latitude__greater=${(lat0 - dLa).toFixed(6)}&latitude__less=${(lat0 + dLa).toFixed(6)}&longitude__greater=${(lon0 - dLo).toFixed(6)}&longitude__less=${(lon0 + dLo).toFixed(6)}&page_size=100`);
    let data = rc.data;
    const im = adresse.dpe && adresse.dpe.copro;
    if (im && !data.some(c => c.numero_immatriculation === im)) { const r2 = await j(base + 'numero_immatriculation__exact=' + encodeURIComponent(im)).catch(() => null); if (r2 && r2.data.length) data = data.concat(r2.data); }
    const per = v => (v || '').replace(/_/g, ' ').replace(/^DE /i, '').replace(/ (A|à) /i, '-').replace(/[AÀ] COMPTER DE (\d+)/i, 'depuis $1').replace(/AVANT (\d+)/i, 'avant $1').replace(/APRES (\d+)/i, 'après $1').toLowerCase();
    const adr = v => txt((v || '').split(',')[0].replace(/\s+\d{4,5}\s.*$/, '').toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()), 40);
    // sans immatriculation dans le DPE : rapprochement par l'adresse (numéro + premier mot significatif de la voie) à moins de 80 m
    let imAdr = null;
    if (!im && adresse.trouvee && adresse.dpe && adresse.dpe.adr) { const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); const a = norm(adresse.dpe.adr); const mnum = a.match(/^(\d+)/); const words = a.replace(/^\d+\s*(bis|ter)?\s*/, '').split(/[^a-z]+/).filter(w => w.length > 3 && !['avenue', 'boulevard', 'chemin', 'route', 'impasse', 'allee', 'place', 'rue', 'montee', 'quartier', 'residence'].includes(w));
      const cand = data.filter(c => c.latitude && dist(lat0, lon0, +c.latitude, +c.longitude) < 80).map(c => { const ca = norm(c.numero_voie_adresse || c.adresse_reference || ''); let sc = 0; if (mnum && new RegExp('(^|\\D)' + mnum[1] + '(\\D|$)').test(ca)) sc += 2; words.forEach(w => { if (ca.includes(w)) sc += 1; }); return {c, sc, d: dist(lat0, lon0, +c.latitude, +c.longitude)}; }).filter(x => x.sc >= 2).sort((x, y) => y.sc - x.sc || x.d - y.d);
      if (cand.length && (A.copro && A.copro.is !== false)) { imAdr = cand[0].c.numero_immatriculation; adresse.coproParAdresse = true; } }
    const imS = im || imAdr;
    P.copros = data.filter(c => c.latitude || c.numero_immatriculation === imS).map(c => { const o = c.latitude ? off(+c.latitude, +c.longitude) : [0, 0];
      return [c.numero_immatriculation, txt(c.nom_usage_copropriete, 40), adr(c.numero_voie_adresse || c.adresse_reference), +c.nombre_lots_habitation || 0, +c.nombre_total_lots || 0, txt(per(c.periode_construction), 16), c.type_syndic || '', txt(c.raison_sociale_representant_legal, 36), c.mandat_en_cours === 'Mandat en cours' ? 1 : 0, c.date_fin_dernier_mandat || '', o[0], o[1], c.numero_immatriculation === imS ? 1 : 0, c.date_immatriculation || '']; })
      .sort((a, b) => (b[12] - a[12]) || (Math.hypot(a[10], a[11]) - Math.hypot(b[10], b[11]))).slice(0, 60);
  }));

  /* Risques et urbanisme */
  tasks.push(step('Risques et urbanisme', async () => {
    const R = {}; const G = 'https://www.georisques.gouv.fr/api/v1/';
    const pt = encodeURIComponent(JSON.stringify({type: 'Point', coordinates: [lon0, lat0]}));
    await Promise.all([
      j(G + `rga?latlon=${lon0},${lat0}`, null, 12000).then(r => R.argile = r.exposition).catch(() => {}),
      j(G + `zonage_sismique?code_insee=${insee}`, null, 12000).then(r => R.seisme = (r.data[0] || {}).zone_sismicite).catch(() => {}),
      j(G + `radon?code_insee=${insee}`, null, 12000).then(r => R.radon = (r.data[0] || {}).classe_potentiel).catch(() => {}),
      j(G + `gaspar/tri?latlon=${lon0},${lat0}&rayon=50`, null, 12000).then(r => R.tri = (r.data[0] || {}).libelle_tri).catch(() => {}),
      j(G + `gaspar/catnat?code_insee=${insee}&page_size=200`, null, 12000).then(r => { const c = {}; let last = ''; r.data.forEach(x => { c[x.libelle_risque_jo] = (c[x.libelle_risque_jo] || 0) + 1; const d = (x.date_debut_evt || '').split('/').reverse().join('-'); if (d > last) last = d; }); R.catnat = {n: r.data.length, types: c, last}; }).catch(() => {}),
      j(G + `resultats_rapport_risque?latlon=${lon0},${lat0}`, null, 15000).then(r => { const nat = [], tech = []; const walk = (o, into) => { if (!o) return; if (Array.isArray(o)) return o.forEach(x => walk(x, into)); if (o.libelle_risque_long) into.push(txt(o.libelle_risque_long, 60)); Object.values(o).forEach(v => { if (v && typeof v === 'object') walk(v, into); }); };
        walk(r.risquesNaturels, nat); walk(r.risquesTechnologiques, tech); R.rapport = {url: r.url || null, nat: [...new Set(nat)].slice(0, 12), tech: [...new Set(tech)].slice(0, 8)}; }).catch(() => {}),
      j(`https://apicarto.ign.fr/api/gpu/zone-urba?geom=${pt}`, null, 12000).then(r => { const p = (r.features[0] || {}).properties; if (p) R.plu = {z: p.libelle, l: txt(p.libelong, 120), t: p.typezone, u: p.urlfic}; }).catch(() => {}),
      j(`https://apicarto.ign.fr/api/gpu/prescription-surf?geom=${pt}`, null, 12000).then(r => { R.presc = [...new Set(r.features.map(f => txt(f.properties.libelle, 80)))].slice(0, 10); }).catch(() => {})
    ]);
    R.georisques = `https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi/rapport2?typeForm=adresse&lon=${lon0}&lat=${lat0}`;
    P.risques = R;
  }));

  /* Bâtiments BD TOPO */
  tasks.push(step('Bâtiments', async () => {
    const dLa = 300 / KY, dLo = 300 / KX;
    const u = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=BDTOPO_V3:batiment&OUTPUTFORMAT=application/json&SRSNAME=CRS:84&COUNT=2000&BBOX=${lon0 - dLo},${lat0 - dLa},${lon0 + dLo},${lat0 + dLa},CRS:84`;
    const r = await j(u, null, 30000);
    P.carte.bati = r.features.slice(0, 1500).map(f => { const p = f.properties; const rings = geomRings(f.geometry).map(poly => ring2off(poly[0])).filter(x => x.length >= 3);
      if (!rings.length) return null; const r0 = rings[0]; const c = [Math.round(r0.reduce((s, q) => s + q[0], 0) / r0.length), Math.round(r0.reduce((s, q) => s + q[1], 0) / r0.length)];
      return {h: p.hauteur != null ? +(+p.hauteur).toFixed(1) : null, zs: p.altitude_minimale_sol != null ? +(+p.altitude_minimale_sol).toFixed(1) : null, zt: p.altitude_maximale_toit != null ? +(+p.altitude_maximale_toit).toFixed(1) : null,
        nl: +p.nombre_de_logements || 0, u: txt(p.usage_1, 20), n: txt(p.nature, 24), c, g: rings, id: p.cleabs || null, et: p.nombre_d_etages != null ? +p.nombre_d_etages : null, an: p.date_d_apparition ? String(p.date_d_apparition).slice(0, 4) : null}; }).filter(Boolean);
  }));

  /* Vivre ici : IGN (écoles, santé, sport, culture, transports, mer) + OpenStreetMap en bonus (commerces, bus) */
  const centroid = geom => { const rings = geomRings(geom); if (!rings.length) { if (geom && geom.type === 'Point') return geom.coordinates; return null; } const pts = rings[0][0]; return [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length]; };
  const wfs = (layer, m, count) => { const dLa = m / KY, dLo = m / KX; return j(`https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=${layer}&OUTPUTFORMAT=application/json&SRSNAME=CRS:84&COUNT=${count || 300}&BBOX=${lon0 - dLo},${lat0 - dLa},${lon0 + dLo},${lat0 + dLa},CRS:84`, null, 15000); };
  const vivre = {};
  const addV = (k, n, d, o, kind) => { (vivre[k] = vivre[k] || []).push({n: txt(n, 44), d, o, k: kind}); };
  tasks.push(step('Vivre ici (IGN)', async () => {
    const [zai, tr, mer] = await Promise.all([wfs('BDTOPO_V3:zone_d_activite_ou_d_interet', 800, 300).catch(() => null), wfs('BDTOPO_V3:equipement_de_transport', 2000, 300).catch(() => null), wfs('BDTOPO_V3:limite_terre_mer', 3000, 60).catch(() => null)]);
    (zai && zai.features || []).forEach(f => { const p = f.properties; const c = centroid(f.geometry); if (!c) return; const d = Math.round(dist(lat0, lon0, c[1], c[0])); if (d > 800) return; const cat = p.categorie || '', nat = p.nature || '';
      const k = /enseignement/i.test(cat) ? 'ecoles' : /sant/i.test(cat) ? 'sante' : /sport/i.test(cat) ? 'sport' : /culture/i.test(cat) ? (/espace public/i.test(nat) ? 'parcs' : 'culture') : /administratif/i.test(cat) ? 'services' : /religieux/i.test(cat) ? 'culte' : null;
      if (k) addV(k, p.toponyme || nat, d, off(c[1], c[0]), nat); });
    (tr && tr.features || []).forEach(f => { const p = f.properties; const nat = p.nature || ''; if (!/gare|port|aéro|téléph|station/i.test(nat)) return; const c = centroid(f.geometry); if (!c) return; const d = Math.round(dist(lat0, lon0, c[1], c[0])); addV('gares', p.toponyme || nat, d, off(c[1], c[0]), nat); });
    if (mer && mer.features && mer.features.length) { let dm = 1e9; mer.features.forEach(f => { const g = f.geometry; const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []; lines.forEach(l => l.forEach(q => { const d = dist(lat0, lon0, q[1], q[0]); if (d < dm) dm = d; })); }); if (dm < 1e9) vivre.mer = Math.round(dm); }
    P.vivre = vivre;
  }));
  tasks.push(step('Vivre ici (OSM)', async () => {
    const q = `[out:json][timeout:6];(node(around:600,${lat0},${lon0})[shop~"^(supermarket|bakery|convenience|butcher|greengrocer|mall)$"];node(around:600,${lat0},${lon0})[amenity~"^(pharmacy|doctors|restaurant|cafe|bar|post_office|bank)$"];node(around:600,${lat0},${lon0})[highway=bus_stop];);out 120;`;
    let r = null, lastErr = null;
    for (const ep of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) { try { r = await j(ep, {method: 'POST', body: 'data=' + encodeURIComponent(q)}, 6500, false); if (r && r.elements) break; } catch (e) { lastErr = e; r = null; } }
    if (!r) throw lastErr || new Error('OpenStreetMap indisponible');
    r.elements.forEach(e => { if (!e.lat) return; const tg = e.tags || {}; const k = tg.shop ? 'commerces' : tg.highway === 'bus_stop' ? 'bus' : (tg.amenity === 'pharmacy' || tg.amenity === 'doctors') ? 'sante' : 'cafes'; addV(k, tg.name || tg.shop || tg.amenity || 'arrêt de bus', Math.round(dist(lat0, lon0, e.lat, e.lon)), off(e.lat, e.lon), tg.shop || tg.amenity || tg.highway); });
    P.vivre = vivre;
  }));

  await Promise.all(tasks);
  if (P.vivre) { const out = {}; Object.keys(P.vivre).forEach(k => { if (k === 'mer') { out.mer = P.vivre.mer; return; } const seen = {}; const arr = P.vivre[k].filter(it => { const key = (it.n || '') + '|' + Math.round(it.d / 20); if (seen[key]) return false; seen[key] = 1; return true; }).sort((a, b) => a.d - b.d); out[k] = {n: arr.length, items: arr.slice(0, 6)}; }); P.vivre = out; }
  P.duree = Math.round((performance.now() - t0) / 1000);
  return P;
}

window.VA.collect = collect;
window.VA.lireAnnonce = lireAnnonce;
window.VA.reverse = async (lat, lon) => { try { const r = await j(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`, null, 8000); const f = r.features[0]; return f ? f.properties : null; } catch (e) { return null; } };
})();
