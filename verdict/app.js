/* Verdict annonce — application : stockage local, écrans, navigation. */
(function (VA) {
'use strict';
const {fmt, eur, kE, m2, pct, fr1, dateFr, monthFr, esc, niceAdr} = VA;
const $ = s => document.querySelector(s);
const BASE = location.origin + location.pathname.replace(/[^/]*$/, '');
const toast = (msg, ms) => { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), ms || 2600); };

/* ---------- stockage ---------- */
const LS = { get: (k, d) => { try { const v = localStorage.getItem('va.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('va.' + k, JSON.stringify(v)); } catch (e) { toast('Mémoire du navigateur pleine : exportez puis supprimez des dossiers.'); } } };
const DB = (() => { let p; const open = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('verdict-annonce', 1); r.onupgradeneeded = () => r.result.createObjectStore('dossiers'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('dossiers', mode); const st = t.objectStore('dossiers'); const rq = fn(st); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); };
  return {get: k => tx('readonly', st => st.get(k)), set: (k, v) => tx('readwrite', st => st.put(v, k)), del: k => tx('readwrite', st => st.delete(k)), keys: () => tx('readonly', st => st.getAllKeys())}; })();
const meta = () => LS.get('meta', []);
const saveMeta = m => LS.set('meta', m);
const suivi = () => LS.get('suivi', {});
const adjOf = id => (LS.get('adj', {})[id]) || [];
const setAdj = (id, arr) => { const a = LS.get('adj', {}); a[id] = arr; LS.set('adj', a); };
const reglages = () => LS.get('reglages', {taux: 3.4, duree: 25, apport: 10});
const notesOf = id => (LS.get('notes', {})[id]) || {};
const setNotes = (id, n) => { const a = LS.get('notes', {}); a[id] = Object.assign({}, a[id] || {}, n); LS.set('notes', a); };

async function saveDossier(P) {
  const A = P.annonce; const id = A.id || ('d-' + Date.now().toString(36));
  A.id = id;
  const est = VA.estimer(P, adjOf(id));
  await DB.set(id, P);
  const m = meta().filter(x => x.id !== id);
  m.unshift({id, titre: VA.titreDossier(P), ville: A.ville || P.centre.ville, cp: A.cp || P.centre.cp, prix: A.prix, surface: A.surface, type: VA.typeBien(P), src: A.src || null, portail: A.portail || null, date: P.genere, adr: P.adresse && P.adresse.trouvee ? P.adresse.dpe.adr : null, certitude: P.adresse && P.adresse.certitude, valeur: est && est.valeur, ecart: est && est.ecart, verdict: est && est.libelle && est.libelle.t, mode: A.mode || 'annonce'});
  saveMeta(m.slice(0, 200));
  if (A.src && A.prix) { const s = suivi(); const arr = s[id] || []; const today = new Date().toISOString().slice(0, 10); if (!arr.length || arr[arr.length - 1].prix !== A.prix || arr[arr.length - 1].date !== today) arr.push({date: today, prix: A.prix, note: arr.length ? '' : 'première lecture'}); s[id] = arr; LS.set('suivi', s); }
  return id;
}

/* ---------- navigation ---------- */
const routes = {};
function go(h) { location.hash = h; }
window.addEventListener('hashchange', route);
function route() {
  const hsh = decodeURIComponent(location.hash.slice(1));
  const m = hsh.match(/^u=(.+)$/); if (m) { history.replaceState(null, '', location.pathname); screenHome(m[1]); return; }
  const [name, arg] = hsh.split('/');
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + (name || 'nouveau')));
  (routes[name] || routes.nouveau)(arg);
}
const view = html => { const v = $('#view'); v.innerHTML = html; window.scrollTo(0, 0); return v; };

/* ---------- écran : nouveau / accueil ---------- */
routes.nouveau = (prefill) => screenHome(prefill);
routes[''] = routes.nouveau;
function screenHome(prefill) {
  const m = meta().slice(0, 6);
  const bm = `javascript:void(window.open('${BASE}#u='+encodeURIComponent(location.href),'_blank'))`;
  view(`
  <div class="hero" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <span class="kicker">Verdict annonce</span>
      <h1>Une annonce, 40 secondes : l’adresse, le vrai prix, le plan, le soleil, les risques, le quartier.</h1>
      <p class="note">Collez un lien Bien’ici. Le dossier se construit avec les données publiques (DVF, DPE, cadastre, IGN, Géorisques), dans votre navigateur, sans rien aspirer des portails. Pour un autre portail, saisissez l’annonce à la main : la recherche d’adresse par le DPE marche pareil.</p>
      <form id="fUrl" class="row" style="gap:8px"><input type="url" id="iUrl" placeholder="https://www.bienici.com/annonce/vente/…" value="${esc(prefill || '')}" style="flex:1 1 360px" required><button class="btn-p" type="submit">Verdict</button></form>
      <form id="fAdr" class="row" style="gap:8px"><input type="text" id="iAdr" placeholder="… ou une adresse : 12 avenue des Camélias, Cagnes-sur-Mer" style="flex:1 1 360px"><button type="submit">Dossier d’adresse</button></form>
      <details><summary>Saisir une annonce à la main (autre portail, flyer, bouche-à-oreille)</summary>
        <form id="fMan" class="grid g3" style="margin-top:10px">
          <label class="f">Type<select name="type"><option value="A">Appartement</option><option value="M">Maison</option></select></label>
          <label class="f">Prix affiché (€)<input type="number" name="prix" required min="10000" step="1000"></label>
          <label class="f">Surface (m²)<input type="number" name="surface" required min="9" step="1"></label>
          <label class="f">Pièces<input type="number" name="pieces" min="1" step="1"></label>
          <label class="f">Terrain (m², maisons)<input type="number" name="terrain" min="0" step="10"></label>
          <label class="f">Code postal et ville<input type="text" name="lieu" required placeholder="06800 Cagnes-sur-Mer"></label>
          <label class="f">Adresse ou quartier (si connu)<input type="text" name="adresse" placeholder="avenue Jean Mermoz"></label>
          <label class="f">DPE : classe<select name="dpel"><option value="">?</option>${'ABCDEFG'.split('').map(l => `<option>${l}</option>`).join('')}</select></label>
          <label class="f">DPE : kWh/m²/an<input type="number" name="kwh" step="0.1" min="0"></label>
          <label class="f">DPE : GES kg/m²/an<input type="number" name="ges" step="0.1" min="0"></label>
          <label class="f">DPE : date (si affichée)<input type="date" name="dpedate"></label>
          <label class="f">Lien de l’annonce (facultatif)<input type="url" name="src" placeholder="https://…"></label>
          <div style="display:flex;align-items:flex-end"><button class="btn-p" type="submit">Verdict</button></div>
        </form></details>
      <div id="progress" class="hidden"><div class="row sp"><b id="pTitle">Collecte…</b><span class="mono muted" id="pTime"></span></div><ul class="steps" id="pSteps"></ul><p class="note" id="pErr" style="color:var(--bad)"></p></div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <span class="kicker">Favori 1 clic</span>
      <p class="small">Glissez ce bouton dans votre barre de favoris. Sur une annonce Bien’ici, cliquez-le : le verdict s’ouvre ici.</p>
      <a class="btn btn-d" href="${bm}" onclick="return false" draggable="true" title="Glissez-moi dans la barre de favoris">★ Verdict annonce</a>
      <p class="note">Rien n’est envoyé à un serveur : les dossiers restent dans ce navigateur (exportez-les depuis Réglages pour les garder ailleurs).</p>
      <span class="kicker" style="margin-top:6px">Ce que vous obtenez</span>
      <ul class="small" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px">
        <li>L’adresse retrouvée par le DPE, avec le niveau de certitude</li><li>Le verdict de prix sur 5 ventes comparables recalées</li><li>Le plan : parcelle, bâtiments, ventes, DPE, comparables</li><li>Les ombres du soleil heure par heure, par saison</li><li>PLU, argile, séisme, inondation, CatNat au point</li><li>La copropriété (registre) et le quartier (écoles, commerces, bus)</li><li>Les signaux de prospection autour, le rendez-vous préparé</li><li>Le suivi de l’annonce : baisses, retrait</li></ul>
    </div>
  </div>
  ${m.length ? `<div class="sec"><div class="sec-h"><h2>Derniers dossiers</h2><p><a href="#dossiers">tous les dossiers →</a></p></div><div class="grid g3">${m.map(cardDossier).join('')}</div></div>` : ''}`);
  $('#fUrl').addEventListener('submit', e => { e.preventDefault(); lancer({url: $('#iUrl').value.trim()}); });
  $('#fAdr').addEventListener('submit', e => { e.preventDefault(); const q = $('#iAdr').value.trim(); if (q) lancer({adresse: q}); });
  $('#fMan').addEventListener('submit', e => { e.preventDefault(); const f = new FormData(e.target); const g = k => f.get(k); const lieu = (g('lieu') || '').match(/(\d{5})\s*(.*)/);
    lancer({manuel: {type: g('type'), prix: +g('prix'), surface: +g('surface'), pieces: +g('pieces') || null, terrain: +g('terrain') || null, cp: lieu ? lieu[1] : null, ville: lieu ? lieu[2] : g('lieu'), adresse: g('adresse') || null, src: g('src') || null, portail: g('src') ? new URL(g('src')).hostname.replace(/^www\./, '') : 'saisie',
      dpe: {l: g('dpel') || null, kwh: +g('kwh') || null, ges: +g('ges') || null, date: g('dpedate') || null}, copro: {is: g('type') === 'A'}, titre: `${g('type') === 'M' ? 'Maison' : 'Appartement'} ${g('surface')} m² · ${lieu ? lieu[2] : g('lieu')}`}}); });
  if (prefill) lancer({url: prefill});
}
function cardDossier(x) {
  const c = x.verdict === 'Sous le marché' ? 'ok' : x.verdict === 'Dans le marché' ? 'acc' : x.verdict === 'Un peu au-dessus' ? 'warn' : x.verdict ? 'bad' : '';
  return `<a class="card dcard" href="#d/${esc(x.id)}"><div class="row sp"><span class="chip ${c}">${esc(x.verdict || (x.mode === 'adresse' ? 'Dossier d’adresse' : 'sans verdict'))}</span><span class="tag">${dateFr(x.date)}</span></div><span class="t">${esc(x.titre)}</span><span class="small muted num-adr">${x.adr ? esc(niceAdr(x.adr)) + ' · ' + esc(x.certitude) : esc(x.ville || '')}</span>${x.prix ? `<span class="small mono">${eur(x.prix)}${x.valeur ? ' · valeur ' + kE(x.valeur) + ' · ' + pct(x.ecart) : ''}</span>` : ''}</a>`;
}

async function lancer(input) {
  const prog = $('#progress'); if (prog) { prog.classList.remove('hidden'); $('#pSteps').innerHTML = ''; $('#pErr').textContent = ''; $('#pTitle').textContent = 'Collecte en cours…'; }
  const rows = {}; const t0 = performance.now();
  const onStep = (name, st, info) => { if (!prog) return; let li = rows[name]; if (!li) { li = document.createElement('li'); $('#pSteps').appendChild(li); rows[name] = li; } li.innerHTML = `<span>${st === 'ok' ? '<span class="ok">✓</span>' : st === 'ko' ? '<span class="bad">✗</span>' : '<span class="muted">…</span>'} ${esc(name)}</span><span>${esc(info || '')}</span>`; $('#pTime').textContent = Math.round((performance.now() - t0) / 1000) + ' s'; };
  try {
    const P = await VA.collect(input, onStep);
    if (prog) $('#pTitle').textContent = 'Dossier prêt';
    const id = await saveDossier(P);
    go('d/' + id);
  } catch (e) { console.error(e); if (prog) { $('#pTitle').textContent = 'Arrêt'; $('#pErr').textContent = e.message || String(e); } else toast(e.message || String(e), 5000); }
}

/* ---------- écran : dossier ---------- */
routes.d = async (id) => {
  const P = await DB.get(id); if (!P) { view('<div class="card">Dossier introuvable dans ce navigateur. <a href="#nouveau">Nouveau verdict</a></div>'); return; }
  const client = document.body.classList.contains('client');
  const ctx = {id, adj: adjOf(id), suivi: suivi()[id] || [], reglages: reglages(), standalone: false};
  ctx.onAdj = arr => { setAdj(id, arr); routes.d(id); };
  ctx.onAct = async (act, b) => {
    if (act === 'print') window.print();
    else if (act === 'export') exportHtml(P, ctx);
    else if (act === 'copy-checklist') { const txt = [...document.querySelectorAll('#rdv ol li')].map((l, i) => (i + 1) + '. ' + l.textContent).join('\n'); navigator.clipboard.writeText(txt).then(() => toast('Liste copiée.')); }
    else if (act === 'refresh') { b.disabled = true; b.textContent = 'Lecture…'; await refreshListing(id); routes.d(id); }
  };
  const v = view(`<div id="dossier">${VA.renderDossier(P, ctx)}</div><div class="foot"><span>Verdict annonce · données publiques · ${esc(reglages().conseiller || '')} ${esc(reglages().agence || '')}</span><span><a href="#nouveau">Nouveau verdict</a> · <a href="#dossiers">Mes dossiers</a> · <button class="btn-s" id="delD">Supprimer ce dossier</button></span></div>`);
  VA.wireDossier(v.querySelector('#dossier'), P, ctx);
  $('#delD').addEventListener('click', async () => { if (!confirm('Supprimer ce dossier de ce navigateur ?')) return; await DB.del(id); saveMeta(meta().filter(x => x.id !== id)); toast('Dossier supprimé'); go('dossiers'); });
  document.title = VA.titreDossier(P) + ' · Verdict annonce';
};

async function refreshListing(id) {
  const P = await DB.get(id); const A = P.annonce; if (!A.src) return;
  const s = suivi(); const arr = s[id] || []; const today = new Date().toISOString().slice(0, 10);
  try { const n = await VA.lireAnnonce(A.src); const last = arr[arr.length - 1];
    if (!last || last.prix !== n.prix) { arr.push({date: today, prix: n.prix, note: last ? (n.prix < last.prix ? 'baisse de ' + fr1((1 - n.prix / last.prix) * 100) + ' %' : 'hausse') : 'première lecture'}); toast(last && n.prix < last.prix ? `Baisse : ${eur(last.prix)} → ${eur(n.prix)}` : 'Prix inchangé : ' + eur(n.prix)); } else { arr.push({date: today, prix: n.prix, note: 'inchangé'}); toast('Prix inchangé : ' + eur(n.prix)); }
    if (n.prix !== A.prix) { A.prixInitial = A.prixInitial || A.prix; A.prix = n.prix; } A.modif = n.modif || A.modif; A.baisse = n.baisse; await DB.set(id, P);
    const m = meta(); const x = m.find(y => y.id === id); if (x) { const est = VA.estimer(P, adjOf(id)); x.prix = A.prix; x.ecart = est && est.ecart; x.verdict = est && est.libelle && est.libelle.t; x.valeur = est && est.valeur; saveMeta(m); }
  } catch (e) { arr.push({date: today, prix: null, retiree: true, note: 'annonce introuvable : ' + (e.message || '')}); toast('Annonce introuvable sur le portail : retirée ou vendue ?', 4000); }
  s[id] = arr; LS.set('suivi', s);
}

/* ---------- export HTML autonome (dossier à envoyer) ---------- */
async function exportHtml(P, ctx) {
  toast('Préparation du fichier…');
  const [css, eng, ren] = await Promise.all(['app.css', 'engine.js', 'render.js'].map(f => fetch(f).then(r => r.text())));
  const R = reglages(); const client = true;
  const P2 = JSON.parse(JSON.stringify(P)); delete P2.annonce.photo;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(VA.titreDossier(P))} · dossier</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>${css}</style></head>
<body class="client"><header class="top"><div class="in"><span class="brand"><b>${esc(R.agence || 'Dossier du bien')}</b><span>${esc(R.conseiller || '')}${R.tel ? ' · ' + esc(R.tel) : ''}${R.email ? ' · ' + esc(R.email) : ''}</span></span><span class="mono small muted" style="margin-left:auto">établi le ${dateFr(P.genere)} · données publiques</span></div></header>
<main class="wrap"><div id="dossier"></div><div class="foot"><span>Ce dossier est un éclairage à partir de données publiques (DVF, DPE, cadastre, IGN, Géorisques), pas un avis de valeur ni un état des risques officiel.</span></div></main>
<script>${eng}<\/script><script>${ren}<\/script><script id="data" type="application/json">${JSON.stringify(P2).replace(/</g, '\\u003c')}<\/script>
<script>(function(){const P=JSON.parse(document.getElementById('data').textContent);const ctx={standalone:true,adj:${JSON.stringify(ctx.adj || [])},reglages:${JSON.stringify({taux: R.taux, duree: R.duree, apport: R.apport})}};const root=document.getElementById('dossier');root.innerHTML=VA.renderDossier(P,ctx);VA.wireDossier(root,P,Object.assign({},ctx,{onAct:a=>{if(a==='print')window.print();}}));})();<\/script></body></html>`;
  const blob = new Blob([html], {type: 'text/html'}); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = (VA.titreDossier(P).replace(/[^\wÀ-ÿ]+/g, '-').slice(0, 60) || 'dossier') + '.html'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000);
  toast('Fichier prêt : envoyez-le par e-mail, il s’ouvre dans tout navigateur (vue client).', 4500);
}

/* ---------- écran : mes dossiers ---------- */
routes.dossiers = () => {
  const m = meta();
  view(`<div class="sec-h"><h1>Mes dossiers</h1><p>${m.length} dossier${m.length > 1 ? 's' : ''} dans ce navigateur.</p></div>${m.length ? `<div class="grid g3">${m.map(cardDossier).join('')}</div>` : '<div class="card">Aucun dossier. <a href="#nouveau">Faire un premier verdict</a>.</div>'}`);
};

/* ---------- écran : suivi ---------- */
routes.suivi = () => {
  const m = meta().filter(x => x.src); const S = suivi();
  const rows = m.map(x => { const arr = S[x.id] || []; const first = arr[0], last = arr[arr.length - 1]; const days = first ? Math.round((Date.now() - new Date(first.date)) / 864e5) : 0; const delta = first && last && last.prix && first.prix ? last.prix / first.prix - 1 : 0; const retiree = last && last.retiree;
    const souffre = retiree || delta <= -0.03 || days >= 60 || (x.ecart != null && x.ecart > 0.12); return Object.assign({}, x, {first, last, days, delta, retiree, souffre}); });
  const souff = rows.filter(r => r.souffre);
  view(`<div class="sec-h"><h1>Suivi des annonces</h1><p>Les annonces que vous avez analysées, relues sur le portail à la demande. Une annonce qui souffre : baisse ≥ 3 %, plus de 60 jours, retrait, ou plus de 12 % au-dessus du marché.</p></div>
    <div class="row" style="margin-bottom:12px"><button class="btn-p" id="majAll" ${m.length ? '' : 'disabled'}>Tout mettre à jour (${m.length})</button><span class="note" id="majInfo"></span></div>
    <div class="tiles" style="margin-bottom:16px"><div class="tile"><span class="k">Suivies</span><span class="v">${m.length}</span></div><div class="tile ${souff.length ? 'warn' : ''}"><span class="k">Qui souffrent</span><span class="v">${souff.length}</span><span class="s">le moment du « second avis »</span></div><div class="tile"><span class="k">Baisses constatées</span><span class="v">${rows.filter(r => r.delta < 0).length}</span></div><div class="tile"><span class="k">Retirées</span><span class="v">${rows.filter(r => r.retiree).length}</span></div></div>
    <div class="card"><div class="tbl"><table><thead><tr><th>Annonce</th><th>Verdict</th><th class="r">Premier prix</th><th class="r">Aujourd’hui</th><th class="r">Évolution</th><th class="r">Jours</th><th>État</th><th></th></tr></thead><tbody>
    ${rows.map(r => `<tr class="${r.souffre ? 'hl' : ''}"><td><a href="#d/${esc(r.id)}">${esc(r.titre)}</a><br><span class="small muted num-adr">${r.adr ? esc(niceAdr(r.adr)) : esc(r.ville || '')}</span></td><td>${r.verdict ? `<span class="chip ${r.verdict === 'Sous le marché' ? 'ok' : r.verdict === 'Dans le marché' ? 'acc' : r.verdict === 'Un peu au-dessus' ? 'warn' : 'bad'}">${esc(r.verdict)} ${pct(r.ecart)}</span>` : ''}</td><td class="r mono">${r.first ? eur(r.first.prix) : '–'}</td><td class="r mono">${r.last && r.last.prix ? eur(r.last.prix) : '–'}</td><td class="r mono ${r.delta < 0 ? 'warn' : ''}">${r.delta ? pct(r.delta) : '='}</td><td class="r mono">${r.days}</td><td>${r.retiree ? '<span class="chip bad">retirée</span>' : r.souffre ? '<span class="chip warn">souffre</span>' : '<span class="chip">en ligne</span>'}</td><td><button class="btn-s" data-maj="${esc(r.id)}">Mettre à jour</button> <button class="btn-s" data-lettre="${esc(r.id)}">Lettre « second avis »</button></td></tr>`).join('')}
    </tbody></table></div>${m.length ? '' : '<p class="note">Aucune annonce suivie : faites un verdict depuis un lien Bien’ici.</p>'}</div>
    <div class="card" style="margin-top:16px" id="lettre" hidden></div>`);
  document.querySelectorAll('[data-maj]').forEach(b => b.addEventListener('click', async () => { b.disabled = true; await refreshListing(b.dataset.maj); routes.suivi(); }));
  document.querySelectorAll('[data-lettre]').forEach(b => b.addEventListener('click', async () => { const P = await DB.get(b.dataset.lettre); const est = VA.estimer(P, adjOf(P.annonce.id)); const R = reglages(); const A = P.annonce; const adr = P.adresse && P.adresse.trouvee ? niceAdr(P.adresse.dpe.adr) : (A.ville || '');
    const txt = `${R.agence || '[Votre agence]'} — ${R.conseiller || '[Votre nom]'}\n\nObjet : un second avis, gratuit et sans engagement, sur la vente de votre bien\n\nMadame, Monsieur,\n\nVotre ${A.type === 'M' ? 'maison' : 'appartement'} ${adr ? 'situé(e) ' + adr : ''} est en vente depuis plusieurs semaines${est && est.valeur ? ' à ' + eur(A.prix) : ''}. J’ai étudié les ventes réelles du quartier (données notariales DVF) : ${est && est.valeur ? `cinq ventes comparables, recalées à aujourd’hui, placent la valeur autour de ${eur(est.valeur)} (huit cas sur dix entre ${kE(est.fourchette[0])} et ${kE(est.fourchette[1])}).` : 'je peux vous les présenter avec le détail de chaque vente.'}\n\nCe n’est ni un reproche ni un jugement sur votre agence : c’est une lecture indépendante, que je vous remets volontiers, chiffres à l’appui, en vingt minutes à votre domicile ou par téléphone si vous préférez m’appeler.\n\n${R.tel ? 'Mon téléphone : ' + R.tel + '\n' : ''}${R.email ? 'Mon e-mail : ' + R.email + '\n' : ''}\nBien cordialement,\n${R.conseiller || ''}\n\nCe courrier est adressé au bien, sans aucun fichier nominatif ; si vous ne souhaitez plus recevoir d’information de notre part, un mot suffit.`;
    const el = $('#lettre'); el.hidden = false; el.innerHTML = `<div class="sec-h"><h3>Lettre « second avis » — ${esc(adr)}</h3><p>Courrier au bien (pas de nom), à poster ou à déposer. Modifiable avant copie.</p></div><textarea rows="14" style="font-family:var(--font)">${esc(txt)}</textarea><div class="row" style="margin-top:8px"><button class="btn-p" id="copyLettre">Copier la lettre</button></div>`; el.scrollIntoView({behavior: 'smooth'});
    $('#copyLettre').addEventListener('click', () => navigator.clipboard.writeText(el.querySelector('textarea').value).then(() => toast('Lettre copiée.'))); }));
  const all = $('#majAll'); if (all) all.addEventListener('click', async () => { all.disabled = true; let i = 0; for (const x of m) { $('#majInfo').textContent = `${++i}/${m.length} · ${x.titre}`; await refreshListing(x.id); await new Promise(r => setTimeout(r, 350)); } routes.suivi(); toast('Mise à jour terminée.'); });
};

/* ---------- écran : rendez-vous ---------- */
routes.rdv = async (id) => {
  const P = id && await DB.get(id); if (!P) { view('<div class="card">Choisissez d’abord un dossier. <a href="#dossiers">Mes dossiers</a></div>'); return; }
  const A = P.annonce; const adj = adjOf(id); const est = VA.estimer(P, adj); const R = reglages(); const N = notesOf(id);
  if (!est || !est.valeur) { view(`<div class="card">Pas assez de ventes comparables pour construire les scénarios de prix. <a href="#d/${esc(id)}">Retour au dossier</a></div>`); return; }
  const base = est.valeurAj || est.valeur; const S = est.S;
  const pctile = v => { const arr = est.all.map(r => r.pm2r); if (!arr.length) return null; return Math.round(arr.filter(x => x >= v).length / arr.length * 100); };
  const scen = [{k: 'vite', lab: 'Vendre vite', c: 'ok', p: Math.round(base * 0.93 / 1000) * 1000, txt: 'Pour un vendeur pressé : plusieurs visites la première semaine, peu de négociation.'}, {k: 'juste', lab: 'Au juste prix · conseillé', c: 'acc', p: base, txt: 'Le prix où les comparables placent le bien. Marge de négociation à annoncer : 3 %.'}, {k: 'haut', lab: 'Ambitieux', c: 'warn', p: Math.round(base * 1.08 / 1000) * 1000, txt: 'Possible si l’acheteur « coup de cœur » arrive vite. Sinon, c’est le scénario qui finit par coûter le plus cher.'}];
  const sm = suivi(); const tracked = meta().filter(x => x.src).map(x => { const arr = sm[x.id] || []; const f = arr[0], l = arr[arr.length - 1]; return f && l && l.prix ? {days: Math.round((Date.now() - new Date(f.date)) / 864e5), delta: l.prix / f.prix - 1, ecart: x.ecart} : null; }).filter(Boolean);
  const over = tracked.filter(t => t.ecart > 0.05), inm = tracked.filter(t => t.ecart <= 0.05);
  const surEval = tracked.length >= 5 ? `Sur les ${tracked.length} annonces que vous suivez, celles affichées plus de 5 % au-dessus du marché ont baissé en moyenne de ${fr1(Math.abs(over.reduce((a, t) => a + t.delta, 0) / Math.max(1, over.length)) * 100)} % (${over.length} annonces) ; celles dans le marché de ${fr1(Math.abs(inm.reduce((a, t) => a + t.delta, 0) / Math.max(1, inm.length)) * 100)} % (${inm.length}).` : `Ce chiffre se construit avec votre suivi d’annonces : dès 5 annonces suivies plus de 30 jours, vous aurez ici la baisse moyenne des biens affichés trop cher sur votre secteur (aujourd’hui ${tracked.length}).`;
  view(`<div class="sec-h"><span class="n">Rendez-vous</span><h1>${esc(VA.titreDossier(P))}</h1><p><a href="#d/${esc(id)}">← dossier complet</a></p></div>
    <div class="card" style="margin-bottom:16px"><div class="row sp"><div><span class="kicker">Ce que disent les chiffres</span><h3 style="margin:4px 0">Valeur statistique ${eur(est.valeur)}${Math.abs(est.tot) > 0 ? ` · avec vos ajustements (${pct(est.tot / 100, 1)}) <b>${eur(est.valeurAj)}</b>` : ''}</h3><p class="note">8 cas sur 10 : ${kE(est.fourchette[0])} – ${kE(est.fourchette[1])} · ${est.n} ventes du type à 800 m · fiabilité ${est.fiab}${A.prix ? ' · affiché aujourd’hui ' + eur(A.prix) + ' (' + est.libelleAj.t.toLowerCase() + ', ' + pct(est.ecartAj) + ')' : ''}</p></div><div class="row"><button class="btn-s" id="rPrint">Imprimer / PDF</button><button class="btn-s" id="rExport">Dossier vendeur (fichier)</button></div></div></div>
    <div class="scen">${scen.map(s => `<div class="card" style="${s.k === 'juste' ? 'border:2px solid var(--accent)' : ''}"><span class="chip ${s.c}">${s.lab}</span><span class="v" style="margin-top:6px;${s.k === 'juste' ? 'color:var(--accent)' : ''}">${eur(s.p)}</span><span class="small mono muted">${m2(s.p / S)} · ${pctile(s.p / S) != null ? pctile(s.p / S) + ' % des ventes du secteur se sont faites à ce niveau ou plus cher' : ''}</span><p class="note" style="margin:6px 0 0">${s.txt}</p>${A.prix ? `<span class="small">${A.prix > s.p ? 'Le prix affiché est ' + pct(A.prix / s.p - 1) + ' au-dessus.' : A.prix < s.p ? 'Le prix affiché est ' + pct(1 - A.prix / s.p).replace('+', '−') + ' en dessous.' : 'C’est le prix affiché.'}</span>` : ''}</div>`).join('')}</div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="sec-h"><h3>Ce que coûte de surévaluer</h3></div><p>${surEval}</p><p class="note">Argument universel : un bien qui démarre trop haut rate ses acheteurs de la première quinzaine, ceux qui ont déjà tout visité et décident vite ; ensuite il faut baisser plus qu’il n’aurait fallu, et l’acheteur négocie encore.</p></div>
      <div class="card"><div class="sec-h"><h3>Vos ajustements</h3><p>Ils restent séparés de la statistique, et visibles du vendeur.</p></div><ul class="adj" id="adjList" style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px">${adj.map((a, i) => `<li><input type="checkbox" data-adj-on="${i}" ${a.on === false ? '' : 'checked'}><input type="text" data-adj-l="${i}" value="${esc(a.l)}" placeholder="Motif"><input type="number" data-adj-p="${i}" value="${a.p}" step="0.5" min="-30" max="30"> %<button class="btn-s" data-adj-del="${i}">✕</button></li>`).join('')}</ul><div class="row" style="margin-top:8px"><button class="btn-s" id="adjAdd">+ Ajouter</button><span class="note">Total plafonné à ±15 %.</span></div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="sec-h"><h3>Arguments, dans l’ordre</h3></div><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14.5px">
        <li>« J’ai regardé les ${est.n} ventes de ${est.type === 'M' ? 'maisons' : 'appartements'} à moins de 800 m depuis ${new Date().getFullYear() - 6} : voici les cinq qui ressemblent le plus à chez vous. » (tableau de la section Prix)</li>
        <li>« Recalées à aujourd’hui, elles donnent ${m2(est.m5)}, soit ${eur(est.valeur)} pour vos ${fmt(S)} m². »</li>
        <li>« Huit ventes sur dix dans le quartier se font entre ${kE(est.fourchette[0])} et ${kE(est.fourchette[1])} : au-dessus, on attend l’exception. »</li>
        ${Math.abs(est.tot) > 0 ? `<li>« Ce que j’ai vu chez vous vaut ${pct(est.tot / 100, 1)} : ${adj.filter(a => a.on !== false && a.l).map(a => a.l + ' (' + (a.p > 0 ? '+' : '') + a.p + ' %)').join(', ')}. »</li>` : ''}
        <li>« Trois façons de partir : ${eur(scen[0].p)} pour vendre vite, ${eur(scen[1].p)} au juste prix, ${eur(scen[2].p)} si on veut tenter — avec le risque de baisser plus tard. »</li>
        ${P.risques && P.risques.plu ? `<li>Pour rassurer : zone ${esc(P.risques.plu.z)} du PLU, risques au point connus (argile ${esc((P.risques.argile || '').toLowerCase())}), copropriété et DPE vérifiés : l’acheteur n’aura pas de mauvaise surprise, donc pas de prétexte pour renégocier.</li>` : ''}
      </ol></div>
      <div class="card"><div class="sec-h"><h3>Notes du rendez-vous</h3><p>Restent dans ce navigateur.</p></div>
        <label class="f">Date du rendez-vous<input type="date" id="nDate" value="${esc(N.date || '')}"></label>
        <label class="f" style="margin-top:8px">Notes (état, attentes du vendeur, délai)<textarea id="nTxt" rows="6">${esc(N.txt || '')}</textarea></label>
        <div class="row" style="margin-top:8px"><label class="row small"><input type="checkbox" id="nMandat" ${N.mandat ? 'checked' : ''}> Mandat signé</label><button class="btn-s" id="nSave">Enregistrer</button></div>
        <div style="margin-top:14px"><span class="kicker">Pour votre IA</span><p class="note">Prompt prêt à coller (ChatGPT, Claude) pour préparer les objections et le mail de compte rendu.</p><div class="prompt" id="prompt">${esc(`Tu es un conseiller immobilier expérimenté. Je prépare un rendez-vous vendeur pour ${A.type === 'M' ? 'une maison' : 'un appartement'} de ${fmt(S)} m² à ${A.ville || P.centre.ville}${A.prix ? ', affiché ' + eur(A.prix) : ''}. Valeur statistique : ${eur(est.valeur)} (5 comparables DVF recalés, médiane ${m2(est.m5)}, fourchette 8/10 ${kE(est.fourchette[0])}–${kE(est.fourchette[1])}). Scénarios : vite ${eur(scen[0].p)}, juste ${eur(scen[1].p)}, ambitieux ${eur(scen[2].p)}. Contexte : DPE ${(P.adresse && P.adresse.dpe && P.adresse.dpe.l) || (A.dpe && A.dpe.l) || '?'}, PLU ${P.risques && P.risques.plu ? P.risques.plu.z : '?'}, argile ${P.risques && P.risques.argile || '?'}. Donne-moi : 1) les 5 objections les plus probables du vendeur et une réponse courte et factuelle à chacune ; 2) une phrase d'ouverture ; 3) un mail de compte rendu à envoyer le soir même, en 120 mots, qui reprend les chiffres sans jargon. Ton simple, direct, respectueux.`)}</div><button class="btn-s" id="copyPrompt" style="margin-top:6px">Copier le prompt</button></div>
      </div>
    </div>`);
  $('#rPrint').addEventListener('click', () => window.print());
  $('#rExport').addEventListener('click', () => exportHtml(P, {adj}));
  $('#copyPrompt').addEventListener('click', () => navigator.clipboard.writeText($('#prompt').textContent).then(() => toast('Prompt copié.')));
  $('#nSave').addEventListener('click', () => { setNotes(id, {date: $('#nDate').value, txt: $('#nTxt').value, mandat: $('#nMandat').checked}); toast('Notes enregistrées.'); });
  const adjList = $('#adjList'); const collect = () => { const out = []; adjList.querySelectorAll('li').forEach(li => out.push({on: li.querySelector('[data-adj-on]').checked, l: li.querySelector('[data-adj-l]').value, p: +li.querySelector('[data-adj-p]').value || 0})); return out; };
  adjList.addEventListener('change', () => { setAdj(id, collect()); routes.rdv(id); }); adjList.addEventListener('click', e => { const b = e.target.closest('[data-adj-del]'); if (b) { const arr = collect(); arr.splice(+b.dataset.adjDel, 1); setAdj(id, arr); routes.rdv(id); } });
  $('#adjAdd').addEventListener('click', () => { const arr = collect(); arr.push({on: true, l: '', p: 0}); setAdj(id, arr); routes.rdv(id); });
};

/* ---------- écran : réglages ---------- */
routes.reglages = () => {
  const R = reglages();
  view(`<div class="sec-h"><h1>Réglages</h1><p>Votre signature sur les dossiers envoyés, vos hypothèses de financement, vos sauvegardes.</p></div>
    <div class="grid g2"><div class="card"><h3>Vous</h3><form id="fReg" class="grid g2" style="margin-top:10px">
      <label class="f">Agence<input type="text" name="agence" value="${esc(R.agence || '')}"></label><label class="f">Conseiller<input type="text" name="conseiller" value="${esc(R.conseiller || '')}"></label>
      <label class="f">Téléphone<input type="text" name="tel" value="${esc(R.tel || '')}"></label><label class="f">E-mail<input type="text" name="email" value="${esc(R.email || '')}"></label>
      <label class="f">Taux (%)<input type="number" name="taux" step="0.1" value="${R.taux}"></label><label class="f">Durée (ans)<input type="number" name="duree" value="${R.duree}"></label><label class="f">Apport (%)<input type="number" name="apport" value="${R.apport}"></label>
      <div style="display:flex;align-items:flex-end"><button class="btn-p" type="submit">Enregistrer</button></div></form></div>
    <div class="card"><h3>Sauvegarde</h3><p class="note">Les dossiers vivent dans ce navigateur. Exportez-les pour les retrouver sur un autre poste ou les garder.</p><div class="row" style="margin-top:8px"><button id="expAll">Exporter tout (.json)</button><label class="btn">Importer<input type="file" id="impAll" accept="application/json" hidden></label><button id="wipe" class="btn-s" style="margin-left:auto;color:var(--bad)">Tout effacer</button></div></div></div>`);
  $('#fReg').addEventListener('submit', e => { e.preventDefault(); const f = new FormData(e.target); const o = {}; for (const [k, v] of f.entries()) o[k] = ['taux', 'duree', 'apport'].includes(k) ? +v : v; LS.set('reglages', o); toast('Réglages enregistrés.'); });
  $('#expAll').addEventListener('click', async () => { const keys = await DB.keys(); const dossiers = {}; for (const k of keys) dossiers[k] = await DB.get(k); const blob = new Blob([JSON.stringify({v: 1, meta: meta(), suivi: suivi(), adj: LS.get('adj', {}), notes: LS.get('notes', {}), reglages: reglages(), dossiers})], {type: 'application/json'}); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'verdict-annonce-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); });
  $('#impAll').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); for (const [k, v] of Object.entries(d.dossiers || {})) await DB.set(k, v); const m = meta(); (d.meta || []).forEach(x => { if (!m.some(y => y.id === x.id)) m.push(x); }); saveMeta(m); LS.set('suivi', Object.assign(suivi(), d.suivi || {})); LS.set('adj', Object.assign(LS.get('adj', {}), d.adj || {})); LS.set('notes', Object.assign(LS.get('notes', {}), d.notes || {})); if (d.reglages) LS.set('reglages', d.reglages); toast('Import terminé.'); go('dossiers'); } catch (err) { toast('Fichier illisible.'); } });
  $('#wipe').addEventListener('click', async () => { if (!confirm('Effacer tous les dossiers de ce navigateur ?')) return; const keys = await DB.keys(); for (const k of keys) await DB.del(k); ['meta', 'suivi', 'adj', 'notes'].forEach(k => localStorage.removeItem('va.' + k)); toast('Tout est effacé.'); go('nouveau'); });
};

/* ---------- vue conseiller / client ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#vue button').forEach(b => b.addEventListener('click', () => { document.body.classList.toggle('client', b.dataset.v === 'client'); document.querySelectorAll('#vue button').forEach(o => o.setAttribute('aria-pressed', o === b)); }));
  document.addEventListener('paste', async e => { const t = (e.clipboardData || {}).getData && e.clipboardData.getData('text'); if (t && /^\s*\{/.test(t)) { try { const P = JSON.parse(t); if (P.outil === 'verdict' && P.annonce) { e.preventDefault(); const id = await saveDossier(P); toast('Dossier collé.'); go('d/' + id); } } catch (err) {} } });
  route();
});
})(window.VA);
