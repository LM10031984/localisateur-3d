/* Verdict annonce — rendu du dossier */
window.VA = window.VA || {};
(function (VA) {
'use strict';
const {fmt, eur, kE, m2, pct, fr1, dateFr, monthFr, esc, niceAdr, dpeClass, energieLib, med} = VA;
const h = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (vals[i] == null ? '' : vals[i]), '');
const li = (arr) => arr.filter(Boolean).map(x => `<li>${x}</li>`).join('');
const typeLib = (P) => { const t = VA.typeBien(P); const A = P.annonce; return A.type === 'M' ? 'Maison' : A.type === 'A' ? 'Appartement' : t === 'M' ? 'Maison (déduit)' : 'Appartement (déduit)'; };
const joursDepuis = d => d ? Math.round((Date.now() - new Date(d).getTime()) / 864e5) : null;

VA.titreDossier = P => { const A = P.annonce; if (A.mode === 'adresse') return A.titre || A.q; return `${typeLib(P)}${A.pieces ? ' ' + A.pieces + ' p.' : ''}${A.surface ? ' · ' + fmt(A.surface) + ' m²' : ''} · ${A.ville || P.centre.ville || ''}`; };

VA.phraseVerdict = function (P, est) {
  const A = P.annonce; if (!est || !est.valeur) return A.mode === 'adresse' ? 'Dossier d’adresse : marché, énergie, risques et signaux autour de cette adresse.' : 'Pas assez de ventes comparables à 800 m pour juger le prix : le dossier reste utile pour l’adresse, les risques et le quartier.';
  const e = est.ecart; const l = est.libelle.t.toLowerCase();
  return `Affiché ${eur(A.prix)} pour ${fmt(A.surface)} m² (${m2(A.prix / A.surface)}). Cinq ventes comparables, recalées à aujourd’hui, placent la valeur autour de <b>${eur(est.valeur)}</b> : l’annonce est <b>${l}</b> (${pct(e)}). Huit cas sur dix se vendraient entre ${kE(est.fourchette[0])} et ${kE(est.fourchette[1])}.`;
};

/* ---------- sections ---------- */
function secHero(P, est, ctx) {
  const A = P.annonce; const adr = P.adresse; const S = ctx.suivi || [];
  const chips = [];
  if (A.portail) chips.push(`<span class="chip">${esc(A.portail)}</span>`);
  if (A.exclusif) chips.push('<span class="chip acc">Exclusivité</span>');
  if (A.baisse) chips.push('<span class="chip warn">Prix déjà baissé (portail)</span>');
  if (A.neuf) chips.push('<span class="chip">Neuf</span>');
  if (A.agence) chips.push(`<span class="chip">${esc(A.agence)}</span>`);
  if (S.length > 1) { const first = S[0], last = S[S.length - 1]; if (last.prix < first.prix) chips.push(`<span class="chip warn">−${fr1((1 - last.prix / first.prix) * 100)} % depuis le ${dateFr(first.date)}</span>`); }
  const adrLine = adr && adr.trouvee ? `<div class="row" style="gap:8px"><span class="chip ${adr.certitude === 'élevée' ? 'ok' : adr.certitude === 'moyenne' ? 'acc' : 'warn'}">Adresse retrouvée · certitude ${adr.certitude}</span><b class="num-adr" style="font-size:16px">${esc(niceAdr(adr.dpe.adr))}</b></div>`
    : A.mode === 'adresse' ? `<div class="row"><span class="chip acc">Dossier d’adresse</span><b style="font-size:16px">${esc(P.centre.label || A.q)}</b></div>`
    : `<div class="row"><span class="chip">Adresse non retrouvée</span><span class="muted">${A.quartier ? esc(A.quartier) + ' · ' : ''}${esc(A.cp || '')} ${esc(A.ville || '')} · dossier au niveau du quartier${P.adresse && P.adresse.candidats && P.adresse.candidats.length ? ' · ' + P.adresse.candidats.length + ' DPE candidats' : ''}</span></div>`;
  const tiles = est && est.valeur ? `
    <div class="tiles">
      <div class="tile"><span class="k">Prix affiché</span><span class="v">${eur(A.prix)}</span><span class="s mono">${m2(A.prix / A.surface)}${A.pieces ? ' · ' + A.pieces + ' pièces' : ''}</span></div>
      <div class="tile ${est.libelle.c}"><span class="k">Verdict</span><span class="v">${est.libelle.t}</span><span class="s mono">${pct(est.ecart)} vs les 5 comparables</span></div>
      <div class="tile"><span class="k">Valeur estimée</span><span class="v">${eur(est.valeur)}</span><span class="s mono">8 cas sur 10 : ${kE(est.fourchette[0])} – ${kE(est.fourchette[1])}</span></div>
      <div class="tile"><span class="k">Fiabilité</span><span class="v">${est.fiab}</span><span class="s">${est.top5.length} comparables · ${est.n} ventes du type à 800 m · dispersion ${fr1((est.cv || 0) * 100)} %</span></div>
    </div>` : A.mode === 'adresse' ? `
    <div class="tiles">
      <div class="tile"><span class="k">Ventes à 800 m</span><span class="v">${fmt(P.marche && P.marche.n800)}</span><span class="s">depuis ${P.marche && P.marche.years[0]} · dernière ${monthFr(P.marche && P.marche.dvfLast)}</span></div>
      <div class="tile"><span class="k">Médiane appartements</span><span class="v">${P.marche && P.marche.allMed.A ? m2(P.marche.allMed.A) : '–'}</span><span class="s">toutes années, à 800 m</span></div>
      <div class="tile"><span class="k">Médiane maisons</span><span class="v">${P.marche && P.marche.allMed.M ? m2(P.marche.allMed.M) : '–'}</span><span class="s">toutes années, à 800 m</span></div>
      <div class="tile"><span class="k">DPE à 300 m</span><span class="v">${fmt(P.dpe && P.dpe.nDpe)}</span><span class="s">${P.dpe ? (P.dpe.DC.E + P.dpe.DC.F + P.dpe.DC.G) + ' en E-F-G' : ''}</span></div>
    </div>` : `
    <div class="tiles">
      <div class="tile"><span class="k">Prix affiché</span><span class="v">${eur(A.prix)}</span><span class="s mono">${A.surface ? m2(A.prix / A.surface) : ''}</span></div>
      <div class="tile warn"><span class="k">Verdict</span><span class="v">Pas assez de ventes</span><span class="s">${est ? est.n : 0} vente(s) du type à 800 m</span></div>
      <div class="tile"><span class="k">Médiane du secteur</span><span class="v">${P.marche && P.marche.allMed && P.marche.allMed[VA.typeBien(P)] ? m2(P.marche.allMed[VA.typeBien(P)]) : '–'}</span><span class="s">toutes années</span></div>
      <div class="tile"><span class="k">DPE à 300 m</span><span class="v">${fmt(P.dpe && P.dpe.nDpe)}</span><span class="s"></span></div>
    </div>`;
  return `<section id="synthese" class="sec" style="margin-top:0">
    <div class="hero">
      <div class="card" style="display:flex;flex-direction:column;gap:10px">
        <div class="row" style="gap:8px">${chips.join('')}</div>
        <h1>${esc(VA.titreDossier(P))}</h1>
        ${adrLine}
        <p style="font-size:15.5px;margin:4px 0 0">${VA.phraseVerdict(P, est)}</p>
        ${est && est.valeur ? `<div style="margin-top:6px"><div class="vb-lab"><span>Sous le marché</span><span>Dans le marché</span><span>Un peu au-dessus</span><span>Au-dessus</span></div><div class="verdict-bar"><div class="${est.libelle.c === 'ok' ? 'on' : ''}" style="background:#2d8a4e"></div><div class="${est.libelle.c === 'acc' ? 'on' : ''}" style="background:#2F44CE"></div><div class="${est.libelle.c === 'warn' ? 'on' : ''}" style="background:#b7791f"></div><div class="${est.libelle.c === 'bad' ? 'on' : ''}" style="background:#c0392b"></div></div></div>` : ''}
        <div class="row noprint" style="margin-top:6px">
          <button class="btn-s" data-act="print">Imprimer / PDF</button>
          <button class="btn-s" data-act="export">Dossier à envoyer (fichier)</button>
          ${A.src ? `<a class="btn btn-s" href="${esc(A.src)}" target="_blank" rel="noopener">Voir l’annonce</a>` : ''}
          ${A.src && !ctx.standalone ? `<button class="btn-s pro" data-act="refresh">Mettre à jour le prix</button>` : ''}
          ${!ctx.standalone ? `<a class="btn btn-s pro" href="#rdv/${esc(ctx.id || '')}">Préparer le rendez-vous →</a>` : ''}
        </div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:8px">
        ${A.photo && !ctx.standalone ? `<img class="photo" src="${esc(A.photo)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <dl class="kv">
          ${A.mode !== 'adresse' ? `<dt>Type</dt><dd>${typeLib(P)}${A.niveaux ? ' · ' + A.niveaux + ' niveaux' : ''}${A.etage != null ? ' · étage ' + A.etage : ''}</dd>` : ''}
          ${A.pieces || A.chambres ? `<dt>Pièces</dt><dd>${A.pieces ? A.pieces + ' pièces' : ''}${A.chambres ? ' · ' + A.chambres + ' chambres' : ''}</dd>` : ''}
          ${A.terrain || A.terrasse || A.piscine ? `<dt>Extérieur</dt><dd>${A.terrain ? 'terrain ' + fmt(A.terrain) + ' m²' : ''}${A.terrasse ? ' · terrasse ' + fmt(A.terrasse) + ' m²' : ''}${A.piscine ? ' · piscine' : ''}</dd>` : ''}
          ${A.dpe && (A.dpe.l || A.dpe.kwh) ? `<dt>DPE annoncé</dt><dd>${dpeClass(A.dpe.l)} ${A.dpe.kwh != null ? '<span class="mono">' + fr1(A.dpe.kwh) + ' kWh/m²/an</span>' : ''} ${A.dpe.gl ? '· GES ' + dpeClass(A.dpe.gl) : ''}${A.dpe.date ? ' · du ' + dateFr(A.dpe.date) : ''}</dd>` : ''}
          ${A.chauffage ? `<dt>Chauffage</dt><dd>${esc(A.chauffage)}</dd>` : ''}
          ${A.expo ? `<dt>Exposition annoncée</dt><dd>${esc(A.expo)}</dd>` : ''}
          ${A.copro && A.copro.is ? `<dt>Copropriété</dt><dd>${A.copro.lots ? A.copro.lots + ' lots' : 'oui'}${A.copro.charges ? ' · ' + eur(A.copro.charges) + '/an de charges' : ''}</dd>` : ''}
          ${A.annee ? `<dt>Construction</dt><dd>${A.annee}</dd>` : ''}
          ${A.travaux ? `<dt>Travaux</dt><dd>à prévoir (selon l’annonce)</dd>` : ''}
          ${A.modif ? `<dt>Annonce modifiée</dt><dd>${dateFr(A.modif)}</dd>` : ''}
          <dt>Dossier généré</dt><dd>${dateFr(P.genere)} · ${P.duree || '?'} s</dd>
        </dl>
      </div>
    </div></section>`;
}

function secOu(P, est, ctx) {
  const adr = P.adresse || {}; const A = P.annonce; const d = adr.dpe;
  const bS = VA.sujet(P); const ori = VA.orientation(bS);
  const proof = d ? `<div class="card"><span class="kicker">Adresse retrouvée par le DPE</span>
      <h3 style="margin:6px 0 8px">${esc(niceAdr(d.adr))}</h3>
      <p class="note">Le portail floute la position. Le diagnostic de performance énergétique est public, géolocalisé et daté : quand ses valeurs collent à l’annonce, il porte l’adresse.</p>
      <dl class="kv">
        <dt>Certitude</dt><dd><b>${esc(adr.certitude)}</b> · score ${d.score} · ${(d.pourquoi || []).join(', ')}</dd>
        <dt>Date du DPE</dt><dd>${dateFr(d.date)}${A.dpe && A.dpe.date ? (A.dpe.date === d.date ? ' <span class="ok">· identique à l’annonce</span>' : ' <span class="warn">· annonce : ' + dateFr(A.dpe.date) + '</span>') : ''}</dd>
        <dt>Consommation</dt><dd><span class="mono">${fr1(d.kwh)} kWh/m²/an</span> ${dpeClass(d.l)}${A.dpe && A.dpe.kwh != null ? ' · annonce ' + fr1(A.dpe.kwh) : ''}</dd>
        <dt>Émissions</dt><dd><span class="mono">${fr1(d.ges)} kgCO₂/m²/an</span> ${dpeClass(d.gl)}${A.dpe && A.dpe.ges != null ? ' · annonce ' + fr1(A.dpe.ges) : ''}</dd>
        <dt>Coût annuel (ADEME)</dt><dd>${eur(d.cout)}${A.dpe && A.dpe.cmin ? ' · fourchette de l’annonce ' + eur(A.dpe.cmin) + ' – ' + eur(A.dpe.cmax) : ''}</dd>
        <dt>Surface au DPE</dt><dd>${fmt(d.surface)} m²${A.surface ? ' · annonce ' + fmt(A.surface) + ' m² (rapport ' + fr1(d.surface / A.surface) + ')' : ''}</dd>
        <dt>Chauffage</dt><dd>${esc(energieLib(d.energie))}</dd>
        ${d.annee ? `<dt>Construction</dt><dd>${esc(d.annee)}</dd>` : ''}
        ${d.residence || d.complement ? `<dt>Complément</dt><dd>${esc([d.residence, d.complement].filter(Boolean).join(' · '))}</dd>` : ''}
        ${d.copro ? `<dt>Copropriété</dt><dd class="mono">${esc(d.copro)}</dd>` : ''}
        ${adr.distBlur != null && P.centre.source !== 'blur' ? `<dt>Écart au portail</dt><dd>${fmt(adr.distBlur)} m du centre du disque flouté</dd>` : ''}
        ${P.parcelle ? `<dt>Parcelle</dt><dd>${esc(P.parcelle.sec)} ${esc(String(P.parcelle.num).replace(/^0+/, ''))} · ${fmt(P.parcelle.m2)} m²${(() => { const pb = VA.parcelleDe(P, bS); return pb && pb.id !== P.parcelle.id ? ` (point de l’adresse) · bâtiment sur ${esc(pb.sec)} ${esc(String(pb.num).replace(/^0+/, ''))} · ${fmt(pb.m2)} m²` : ''; })()}</dd>` : ''}
        ${bS ? `<dt>Bâtiment (IGN)</dt><dd>${bS.h ? bS.h + ' m de haut' : 'hauteur inconnue'}${bS.nl ? ' · ' + bS.nl + ' logement' + (bS.nl > 1 ? 's' : '') : ''}${bS.zs != null ? ' · sol à ' + bS.zs + ' m' : ''}${ori ? ' · façade principale au ' + ori.lib : ''}</dd>` : ''}
      </dl>
      ${adr.candidats && adr.candidats.length > 1 ? `<details class="pro" style="margin-top:8px"><summary>${adr.candidats.length - 1} autre${adr.candidats.length > 2 ? 's' : ''} DPE candidat${adr.candidats.length > 2 ? 's' : ''}</summary><div class="tbl"><table><thead><tr><th>Score</th><th>Adresse</th><th>Date</th><th>kWh</th><th>GES</th><th>m²</th><th>Dist.</th></tr></thead><tbody>${adr.candidats.slice(1).map(c => `<tr><td class="mono">${c.score}</td><td>${esc(niceAdr(c.adr))}</td><td class="mono">${dateFr(c.date)}</td><td class="mono">${fr1(c.kwh)}</td><td class="mono">${fr1(c.ges)}</td><td class="mono">${fmt(c.surface)}</td><td class="mono">${c.d != null ? fmt(c.d) + ' m' : '–'}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
    </div>` : `<div class="card"><span class="kicker">Position</span><h3 style="margin:6px 0 8px">${A.mode === 'adresse' ? esc(P.centre.label || A.q) : 'Adresse non retrouvée'}</h3>
      <p class="note">${A.mode === 'adresse' ? 'Dossier centré sur l’adresse saisie (Base Adresse Nationale, score ' + (P.centre.score || '–') + ').' : A.blur ? 'Le portail donne un disque de ' + A.blur.r + ' m. Aucun DPE de la commune ne colle assez aux valeurs de l’annonce (' + (A.dpe && A.dpe.kwh != null ? fr1(A.dpe.kwh) + ' kWh' : 'pas de kWh') + ') : le dossier est centré sur le disque du portail.' : 'Pas de position précise dans l’annonce : dossier centré sur ' + esc(P.centre.adr || A.ville || '') + '.'}</p>
      ${adr.candidats && adr.candidats.length ? `<div class="tbl pro"><table><thead><tr><th>Score</th><th>Adresse</th><th>Date</th><th>kWh</th><th>GES</th><th>m²</th><th>Dist.</th></tr></thead><tbody>${adr.candidats.map(c => `<tr><td class="mono">${c.score}</td><td>${esc(niceAdr(c.adr))}</td><td class="mono">${dateFr(c.date)}</td><td class="mono">${fr1(c.kwh)}</td><td class="mono">${fr1(c.ges)}</td><td class="mono">${fmt(c.surface)}</td><td class="mono">${c.d != null ? fmt(c.d) + ' m' : '–'}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${P.parcelle ? `<dl class="kv" style="margin-top:8px"><dt>Parcelle au centre</dt><dd>${esc(P.parcelle.sec)} ${esc(String(P.parcelle.num).replace(/^0+/, ''))} · ${fmt(P.parcelle.m2)} m²</dd></dl>` : ''}
    </div>`;
  // bâtiments de la parcelle
  const pBat = VA.parcelleDe(P, bS) || P.parcelle; const pid = pBat && pBat.id; let batiTbl = '';
  if (pid && pBat.g && pBat.g.length) { const ring = VA.geo.closed(pBat.g[0]); const insideAll = (P.carte.bati || []).filter(b => VA.geo.inPoly(b.c, ring)); const inside = insideAll.filter(b => b.h >= 2.8 && Math.abs(VA.geo.area(VA.geo.closed(b.g[0]))) >= 25); if (inside.length > 1) {
    const rows = inside.map(b => ({b, emp: Math.round(Math.abs(VA.geo.area(VA.geo.closed(b.g[0])))), niv: b.et || (b.h ? Math.max(1, Math.round(b.h / 3)) : 1)})).map(r => { r.shab = r.emp * r.niv; r.sc = A.surface ? Math.abs(Math.log((r.shab || 1) / A.surface)) : 0; return r; }).sort((a, b) => a.sc - b.sc);
    batiTbl = `<div class="card pro" style="margin-top:16px"><div class="sec-h"><h3>Bâtiments de la parcelle</h3><p>${inside.length} bâtiments habitables sur la parcelle ${esc(pBat.sec)} ${esc(String(pBat.num).replace(/^0+/, ''))}${insideAll.length > inside.length ? ' (+ ' + (insideAll.length - inside.length) + ' abris et annexes)' : ''} : copropriété horizontale ou dépendances. Classement par ressemblance avec la surface annoncée ; la ligne orange est le bâtiment retenu pour le plan et le soleil ; à confirmer sur place.</p></div>
      <div class="tbl"><table><thead><tr><th></th><th class="r">Emprise</th><th class="r">Niveaux</th><th class="r">≈ surface</th><th class="r">Logts</th><th class="r">Haut.</th><th class="r">Sol</th><th>Nature</th></tr></thead><tbody>${rows.slice(0, 12).map((r, i) => `<tr class="${r.b === bS ? 'bien' : ''}"><td><span class="badge ${i < 3 ? '' : 'g'}">${i + 1}</span></td><td class="r mono">${fmt(r.emp)} m²</td><td class="r mono">${r.niv}</td><td class="r mono">${fmt(r.shab)} m²</td><td class="r mono">${r.b.nl || '–'}</td><td class="r mono">${r.b.h ? r.b.h + ' m' : '–'}</td><td class="r mono">${r.b.zs != null ? r.b.zs + ' m' : '–'}</td><td>${esc(r.b.n || r.b.u || '')}${r.b === bS ? ' · <b>retenu</b>' : ''}</td></tr>`).join('')}</tbody></table></div></div>`; } }
  return `<section id="ou" class="sec"><div class="sec-h"><span class="n">01</span><h2>Où est le bien</h2><p>Le portail floute ; les données publiques retrouvent.</p></div>
    <div class="mapwrap">
      <div class="card map">${VA.mapSvg(P, {est})}
        <div class="layers noprint"><label><input type="checkbox" data-layer="gVentes" checked> Ventes</label><label><input type="checkbox" data-layer="gDpe" checked> DPE récents et E-F-G</label><label><input type="checkbox" data-layer="gBati" checked> Bâti IGN</label><label><input type="checkbox" data-layer="gComp" checked> Comparables</label><label><input type="checkbox" data-layer="gSun" checked> Ombres du soleil</label>${P.vivre ? '<label><input type="checkbox" data-layer="gVivre"> Vivre ici</label>' : ''}</div>
        <div class="legend"><span><i style="background:#E8641B"></i>Le bien (parcelle, bâtiment)</span><span><i style="background:#c9ccc4"></i>Bâti</span><span><i style="background:#aab0c0"></i>Immeuble (≥ 3 logements)</span><span><i style="background:#15171c;border-radius:50%"></i>Vente appartement</span><span><i style="background:#15171c"></i>Vente maison</span><span><i style="background:#2F44CE;border-radius:50%"></i>Comparable</span><span><i style="background:#e4651c;outline:2px solid #2F44CE"></i>DPE récent</span><span><i style="background:rgba(28,36,80,.34)"></i>Ombre portée</span></div>
      </div>
      <div>${proof}</div>
    </div>${batiTbl}</section>`;
}

function secPrix(P, est, ctx) {
  const A = P.annonce;
  if (!est) return `<section id="prix" class="sec"><div class="sec-h"><span class="n">02</span><h2>Le prix</h2><p>Aucune vente exploitable à 800 m.</p></div></section>`;
  const comp = (c, i, hl) => `<tr class="${hl ? 'hl' : ''}"><td>${hl ? `<span class="badge" style="background:#2F44CE">${i + 1}</span>` : '<span class="muted mono">' + (i + 1) + '</span>'}</td><td class="num-adr">${c.a ? esc(niceAdr(c.a)) : '<span class="muted">adresse non publiée</span>'}${c.pc && P.parcelle && c.pc === P.parcelle.id ? ' <span class="chip bien">même parcelle</span>' : ''}</td><td class="mono">${monthFr(c.d)}</td><td class="r mono">${fmt(c.s)} m²${c.n ? '<br><span class="muted">' + c.n + ' p.</span>' : ''}</td>${est.type === 'M' ? `<td class="r mono">${c.g ? fmt(c.g) + ' m²' : '–'}</td>` : ''}<td class="r mono">${kE(c.pk * 1000)}</td><td class="r mono">${m2(c.pm2)}</td><td class="r mono"><b>${m2(c.pm2r)}</b>${c.f !== 1 ? '<br><span class="muted">×' + fr1(c.f) + '</span>' : ''}</td><td class="r mono">${c.km} m</td></tr>`;
  const head = `<thead><tr><th></th><th>Vente</th><th>Date</th><th class="r">Surface</th>${est.type === 'M' ? '<th class="r">Terrain</th>' : ''}<th class="r">Prix</th><th class="r">€/m²</th><th class="r">€/m² recalé</th><th class="r">Dist.</th></tr></thead>`;
  const adj = ctx.adj || [];
  const adjHtml = ctx.standalone ? '' : `<div class="card pro" style="margin-top:16px" id="ajust"><div class="sec-h"><h3>Vos ajustements, à part de la statistique</h3><p>Ce que vous avez vu et que les chiffres ne voient pas : état, vue, nuisances, travaux. Entre −15 et +15 % au total ; au-delà de ±20 % sur une ligne, justifiez.</p></div>
      <ul class="adj" id="adjList" style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px">${adj.map((a, i) => `<li><input type="checkbox" data-adj-on="${i}" ${a.on === false ? '' : 'checked'}><input type="text" data-adj-l="${i}" value="${esc(a.l)}" placeholder="Motif"><input type="number" data-adj-p="${i}" value="${a.p}" step="0.5" min="-30" max="30"> %<button class="btn-s" data-adj-del="${i}" aria-label="Supprimer">✕</button></li>`).join('')}</ul>
      <div class="row" style="margin-top:8px"><button class="btn-s" data-act="adj-add">+ Ajouter un ajustement</button><span class="note">Exemples : vue mer dégagée +4 % · toiture à reprendre −3 % · rez-de-jardin bruyant −2 %.</span></div>
      <div class="row sp" style="margin-top:10px;border-top:1px dashed var(--line-2);padding-top:10px"><span>Statistique <b>${eur(est.valeur)}</b> · vos ajustements <b class="mono">${pct(est.tot / 100, 1)}</b>${Math.abs(est.tot) >= 15 ? ' <span class="warn">(plafond atteint)</span>' : ''}</span><span style="font-family:var(--display);font-size:22px;font-weight:800">${eur(est.valeurAj)}</span></div>
      ${est.ecartAj != null && Math.abs(est.tot) > 0 ? `<p class="note">Avec vos ajustements, l’annonce est <b>${est.libelleAj.t.toLowerCase()}</b> (${pct(est.ecartAj)}).</p>` : ''}
    </div>`;
  return `<section id="prix" class="sec"><div class="sec-h"><span class="n">02</span><h2>Le prix</h2><p>Cinq ventes qui ressemblent au bien, recalées sur l’évolution du secteur, puis la fourchette.</p></div>
    <div class="card"><div class="tbl"><table>${head}<tbody>${est.top5.map((c, i) => comp(c, i, true)).join('')}</tbody></table></div>
      <p class="note" style="margin-top:8px">Médiane des 5 : <b class="mono">${m2(est.m5)}</b> × ${fmt(est.S)} m² = <b>${eur(est.valeur)}</b>. Min–max des 5 : ${m2(est.minmax5[0])} – ${m2(est.minmax5[1])}. ${est.type === 'M' ? 'Les surfaces DVF sont celles des actes (souvent sans annexes) ; le terrain compte dans le choix des comparables.' : 'Les surfaces DVF sont celles des actes, souvent un peu inférieures à la surface habitable.'}</p>
      ${est.ecartes && est.ecartes.length ? `<p class="note">Écartées comme aberrantes (hors 60–150 % de la médiane des 12 plus proches) : ${est.ecartes.map(c => `${c.a ? esc(niceAdr(c.a)) : fmt(c.s) + ' m²'} à ${m2(c.pm2r)} (${c.d.slice(0, 4)})`).join(' · ')}.</p>` : ''}
      ${est.top8.length > 5 ? `<details><summary>Sensibilité : avec 8 comparables, ${pct(est.ecart8)} (médiane ${m2(est.m8)})${Math.abs((est.ecart8 || 0) - (est.ecart || 0)) > 0.06 ? ' — le verdict bouge, la règle du secteur reste 5 comparables' : ''}</summary><div class="tbl" style="margin-top:8px"><table>${head}<tbody>${est.top8.slice(5).map((c, i) => comp(c, i + 5, false)).join('')}</tbody></table></div></details>` : ''}
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="sec-h"><h3>Médianes annuelles à 800 m</h3><p>Le secteur, année par année. Recalage : tendance lissée de ${pct(est.slope, 1)} par an, chaque vente ramenée au niveau de ${est.lastYear}.</p></div>${VA.chartMedianes(P, est)}</div>
      <div class="card"><div class="sec-h"><h3>Toutes les ventes du type, recalées</h3><p>Prix au m² selon la surface. La fourchette « 8 cas sur 10 » vient de cette dispersion (${fr1(est.lo * 100)} % → ${fr1(est.hi * 100)} % de la médiane).</p></div>${VA.chartNuage(P, est)}</div>
    </div>${adjHtml}</section>`;
}

function secBien(P, est, ctx) {
  const A = P.annonce; const d = P.adresse && P.adresse.dpe; const DC = P.dpe && P.dpe.DC; const type = VA.typeBien(P);
  const l = (d && d.l) || (A.dpe && A.dpe.l); const en = d ? energieLib(d.energie) : (A.chauffage || '');
  const elec = /lectri/i.test(en || '') || /lectri/i.test(A.chauffage || '');
  const reforme = l && 'EFG'.includes(l) && elec && (!d || d.date < '2026-01-01') ? `<p><b>Réforme du 1<sup>er</sup> janvier 2026 :</b> le coefficient de l’électricité passe de 2,3 à 1,9. Un logement chauffé à l’électricité classé ${l} sur un DPE d’avant 2026 peut gagner une classe : une attestation de nouvelle étiquette est à demander (sans refaire le DPE). Argument de rendez-vous.</p>` : (l && 'FG'.includes(l) ? `<p><b>Passoire énergétique :</b> G interdit à la location depuis 2025, F en 2028, E en 2034. Pour un acheteur bailleur, c’est un sujet de prix ; pour un vendeur, un argument pour vendre maintenant.</p>` : '');
  return `<section id="bien" class="sec"><div class="sec-h"><span class="n">03</span><h2>Le bien et l’énergie</h2><p>Ce que dit le DPE, ce que dit le quartier.</p></div>
    <div class="grid g3">
      <div class="card"><span class="kicker">DPE du bien</span><div class="row" style="margin:8px 0;gap:14px">${dpeClass(l, true)}<div><b class="mono">${d ? fr1(d.kwh) : (A.dpe && A.dpe.kwh != null ? fr1(A.dpe.kwh) : '–')} kWh/m²/an</b><br><span class="small muted">GES ${d ? fr1(d.ges) : (A.dpe && A.dpe.ges != null ? fr1(A.dpe.ges) : '–')} kg · ${esc(en || '–')}</span></div></div>
        <dl class="kv">${d ? `<dt>Établi le</dt><dd>${dateFr(d.date)}</dd><dt>Coût annuel</dt><dd>${eur(d.cout)}</dd>` : ''}${d && d.annee ? `<dt>Construction</dt><dd>${esc(d.annee)}</dd>` : A.annee ? `<dt>Construction</dt><dd>${A.annee}</dd>` : ''}</dl>
        ${reforme}
      </div>
      <div class="card"><span class="kicker">Les ${fmt(P.dpe && P.dpe.nDpe)} DPE à 300 m</span><div style="margin:10px 0 4px">${VA.histDpe(P)}</div><p class="note">${DC ? `${DC.E + DC.F + DC.G} logements en E-F-G (${Math.round((DC.E + DC.F + DC.G) / Math.max(1, P.dpe.nDpe) * 100)} %). Dernier DPE du quartier : ${dateFr(P.dpe.last)}.` : ''}</p></div>
      <div class="card"><span class="kicker">Ce que ça change</span><ul style="margin:8px 0 0;padding-left:18px;font-size:14px;display:flex;flex-direction:column;gap:6px">
        ${li([
          l ? `Classe ${l}${DC ? ' : ' + (['A', 'B', 'C'].includes(l) ? 'mieux que ' + Math.round((DC.D + DC.E + DC.F + DC.G) / Math.max(1, P.dpe.nDpe) * 100) + ' % du quartier' : ['D'].includes(l) ? 'dans la moyenne du quartier' : 'moins bien que ' + Math.round((DC.A + DC.B + DC.C + DC.D) / Math.max(1, P.dpe.nDpe) * 100) + ' % du quartier') : ''}.` : 'DPE absent de l’annonce : à demander avant le rendez-vous.',
          d && d.cout ? `Facture énergie estimée par l’ADEME : ${eur(d.cout)} par an, soit ${eur(d.cout / 12)} par mois à intégrer au budget acheteur.` : null,
          A.copro && A.copro.charges ? `Charges de copropriété annoncées : ${eur(A.copro.charges)} par an.` : null,
          type === 'M' && A.terrain ? `Terrain de ${fmt(A.terrain)} m² : vérifier le PLU (section 05) pour la constructibilité résiduelle et la piscine.` : null,
          A.travaux ? 'Travaux annoncés : chiffrer avant de parler prix.' : null
        ])}</ul></div>
    </div></section>`;
}

function secSoleil(P, est, ctx) {
  const S = VA.sun(P); const bS = S.sujet; const ori = VA.orientation(bS); const A = P.annonce;
  const rowsTbl = Object.values(S.SEASONS).map(s => { const p = S.plages(s); return `<tr><td><b>${s.court}</b><br><small>${s.lab}</small></td><td class="mono">${p.lever ? S.hhmm(p.lever) : '–'} · ${p.coucher ? S.hhmm(p.coucher) : '–'}</td><td>${bS ? p.txt : '<span class="muted">bâtiment non identifié</span>'}</td></tr>`; }).join('');
  return `<section id="soleil" class="sec"><div class="sec-h"><span class="n">04</span><h2>Soleil et ombres, heure par heure</h2><p>Ce que le vendeur appelle « exposition », calculé : position du soleil, hauteur des bâtiments (IGN), relief entre voisins.</p></div>
    <div class="card">
      <div class="row" style="gap:8px;margin-bottom:6px">${ori ? `<span class="chip">Façade principale au <b>&nbsp;${ori.lib}</b> (${ori.az}°)</span>` : ''}${A.expo ? `<span class="chip ${ori && VA.expoOk(ori.az, A.expo) ? 'ok' : 'warn'}">Annonce : « ${esc(A.expo)} »${ori ? (VA.expoOk(ori.az, A.expo) ? ' · cohérent' : ' · à vérifier') : ''}</span>` : ''}${bS && bS.h ? `<span class="chip">Hauteur ${bS.h} m</span>` : ''}</div>
      <div class="sun-ctl noprint">
        <div class="seg" role="group" aria-label="Saison" id="sunSeason"><button type="button" aria-pressed="true" data-s="hiver">21 déc.</button><button type="button" aria-pressed="false" data-s="equinoxe">21 mars</button><button type="button" aria-pressed="false" data-s="ete">21 juin</button></div>
        <label class="sun-hour"><span class="mono" id="sunTime">14 h 00</span><input type="range" id="sunHour" min="6" max="20" step="0.25" value="14" aria-label="Heure"></label>
      </div>
      ${(() => { const pb = VA.parcelleDe(P, bS); if (!pb || !pb.g || !pb.g.length) return ''; const ring = VA.geo.closed(pb.g[0]); const n = (P.carte.bati || []).filter(b => b.h >= 2.8 && VA.geo.inPoly(b.c, ring)).length; return n > 1 ? `<p class="note">La parcelle porte ${n} bâtiments : le calcul vise le plus probable (voir « Bâtiments de la parcelle »), à confirmer sur place.</p>` : ''; })()}
      <p id="sunRead" style="margin:4px 0 2px"></p><p id="sunJ" style="margin:0 0 10px"></p>
      <div class="tbl"><table><thead><tr><th>Saison</th><th>Lever · coucher</th><th>Soleil direct sur la façade sud / terrasse (hors relief lointain et arbres)</th></tr></thead><tbody>${rowsTbl}</tbody></table></div>
      <p class="note" style="margin-top:8px">Ombres calculées sur les hauteurs de la BD TOPO, sol plat autour de chaque bâtiment ; la différence d’altitude entre le bien et ses voisins est prise en compte pour la terrasse. Le relief lointain et la végétation ne sont pas mesurés ici. Heures légales (Paris).</p>
    </div></section>`;
}
VA.expoOk = (az, expo) => { const e = (expo || '').toLowerCase(); const want = e.includes('sud') && e.includes('ouest') ? 225 : e.includes('sud') && e.includes('est') ? 135 : e.includes('sud') ? 180 : e.includes('nord') && e.includes('ouest') ? 315 : e.includes('nord') && e.includes('est') ? 45 : e.includes('ouest') ? 270 : e.includes('est') ? 90 : e.includes('nord') ? 0 : null; if (want == null) return true; const d = Math.abs(((az - want) % 360 + 540) % 360 - 180); return d <= 60; };

function secRisques(P) {
  const R = P.risques || {}; const cat = R.catnat || {};
  const topCat = Object.entries(cat.types || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k.toLowerCase()} (${v})`).join(', ');
  const argileNiv = (R.argile || '').toLowerCase();
  return `<section id="risques" class="sec"><div class="sec-h"><span class="n">05</span><h2>Urbanisme et risques</h2><p>Au point, pas à la commune. Ce n’est pas l’état des risques officiel : c’est ce qu’il faut savoir avant.</p></div>
    <div class="grid g3">
      <div class="card"><span class="kicker">Urbanisme (PLU)</span>${R.plu ? `<h3 style="margin:6px 0 4px">Zone ${esc(R.plu.z)}</h3><p class="note">${esc(R.plu.l || '')}${R.plu.t ? ' · type ' + esc(R.plu.t) : ''}</p>${R.plu.u ? `<a class="small" href="${esc(R.plu.u)}" target="_blank" rel="noopener">Règlement de la zone (PDF) →</a>` : ''}` : '<p class="note" style="margin-top:6px">Zone non trouvée sur le Géoportail de l’urbanisme (document non publié ou hors zonage).</p>'}
        ${R.presc && R.presc.length ? `<p class="small" style="margin-top:8px"><b>Prescriptions au point :</b> ${R.presc.map(esc).join(' · ')}</p>` : ''}</div>
      <div class="card"><span class="kicker">Sols et séisme</span><dl class="kv" style="margin-top:8px">
        <dt>Argile</dt><dd class="${argileNiv.includes('fort') ? 'bad' : argileNiv.includes('moy') ? 'warn' : ''}">${esc(R.argile || 'non renseigné')}${argileNiv.includes('fort') || argileNiv.includes('moy') ? ' · étude de sol à prévoir pour construire/agrandir' : ''}</dd>
        <dt>Séisme</dt><dd>zone ${esc(R.seisme || '–')}${R.seisme >= 4 ? ' (moyenne)' : R.seisme == 3 ? ' (modérée)' : ''}</dd>
        <dt>Radon</dt><dd>potentiel ${esc(R.radon || '–')}${R.radon == 3 ? ' · mesure recommandée' : ''}</dd>
        <dt>Inondation (TRI)</dt><dd>${R.tri ? esc(R.tri) : 'hors territoire à risque important'}</dd>
      </dl></div>
      <div class="card"><span class="kicker">Historique et rapport</span><dl class="kv" style="margin-top:8px">
        <dt>Arrêtés CatNat</dt><dd>${cat.n != null ? cat.n + ' sur la commune' + (cat.last ? ' · dernier ' + dateFr(cat.last) : '') : '–'}${topCat ? '<br><span class="small muted">' + esc(topCat) + '</span>' : ''}</dd>
        ${R.rapport && (R.rapport.nat.length || R.rapport.tech.length) ? `<dt>Au point</dt><dd class="small">${R.rapport.nat.map(esc).join(' · ')}${R.rapport.tech.length ? '<br>Technologiques : ' + R.rapport.tech.map(esc).join(' · ') : ''}</dd>` : ''}
      </dl><a class="small" href="${esc(R.georisques || '#')}" target="_blank" rel="noopener">Rapport Géorisques à cette position →</a></div>
    </div></section>`;
}

function secCopro(P, ctx) {
  const C = VA.copros(P); const mine = C.find(c => c.sujet); const A = P.annonce;
  const V = VA.ventes(P); const pid = P.parcelle && P.parcelle.id; const ventesParc = pid ? V.filter(v => v.pc === pid) : [];
  const finProche = f => f && (new Date(f).getTime() - Date.now()) < 365 * 864e5;
  const row = c => `<tr class="${c.sujet ? 'bien' : ''}"><td>${esc(c.nom || '—')}<br><span class="small muted num-adr">${esc(c.adr)}</span></td><td class="r mono">${c.lotsH}/${c.lots}</td><td class="mono">${esc(c.per)}</td><td>${esc(c.syndic || c.typeSyndic)}</td><td class="mono ${finProche(c.fin) ? 'warn' : ''}">${c.fin ? dateFr(c.fin) : '–'}</td><td class="r mono">${Math.round(Math.hypot(c.x, c.y))} m</td></tr>`;
  if (!C.length && !(A.copro && A.copro.is)) return '';
  return `<section id="copro" class="sec"><div class="sec-h"><span class="n">06</span><h2>Copropriété</h2><p>Registre national des copropriétés : lots, syndic, fin de mandat. ${mine ? 'La copropriété du bien est identifiée par son DPE.' : ''}</p></div>
    <div class="grid ${mine ? 'g2' : 'g1'}">
      ${mine ? `<div class="card"><span class="kicker">La copropriété du bien</span><h3 style="margin:6px 0 6px">${esc(mine.nom || 'Copropriété')} <span class="mono small muted">${esc(mine.im)}</span></h3><dl class="kv">
        <dt>Lots</dt><dd>${mine.lotsH} d’habitation sur ${mine.lots}${A.copro && A.copro.lots && A.copro.lots !== mine.lots ? ' (annonce : ' + A.copro.lots + ')' : ''}</dd>
        <dt>Construction</dt><dd>${esc(mine.per || '–')}</dd>
        <dt>Syndic</dt><dd>${esc(mine.syndic || mine.typeSyndic || '–')}${mine.mandat ? ' · mandat en cours' : ''}</dd>
        <dt>Fin de mandat</dt><dd class="${finProche(mine.fin) ? 'warn' : ''}">${mine.fin ? dateFr(mine.fin) + (finProche(mine.fin) ? ' · dans moins d’un an : assemblée à venir' : '') : '–'}</dd>
        ${A.copro && A.copro.charges ? `<dt>Charges annoncées</dt><dd>${eur(A.copro.charges)} / an</dd>` : ''}
        ${ventesParc.length ? `<dt>Ventes sur la parcelle</dt><dd>${ventesParc.slice(0, 5).map(v => `${monthFr(v.d)} · ${v.t === 'M' ? 'maison' : 'appt'} ${fmt(v.s)} m² · ${kE(v.pk * 1000)} (${m2(v.pm2)})`).join('<br>')}</dd>` : ''}
      </dl><p class="note" style="margin-top:8px">À demander au vendeur : les trois derniers PV d’AG, le carnet d’entretien, le fonds travaux, le DPE collectif s’il existe.</p></div>` : ''}
      <div class="card pro"><span class="kicker">Copropriétés à 300 m</span><div class="tbl" style="margin-top:8px"><table><thead><tr><th>Copropriété</th><th class="r">Lots hab./total</th><th>Construction</th><th>Syndic</th><th>Fin de mandat</th><th class="r">Dist.</th></tr></thead><tbody>${C.slice(0, 12).map(row).join('')}</tbody></table></div>${C.length > 12 ? `<p class="note">… et ${C.length - 12} autres.</p>` : ''}</div>
    </div></section>`;
}

function secVivre(P) {
  const V = P.vivre; if (!V || !Object.keys(V).length) return '';
  const lab = {ecoles: 'Écoles, collèges, lycées', sante: 'Santé', commerces: 'Commerces', cafes: 'Cafés, restaurants, services', bus: 'Arrêts de bus', gares: 'Gares, ports', sport: 'Sport', parcs: 'Parcs, espaces publics', culture: 'Culture', services: 'Mairie, administrations', culte: 'Lieux de culte'};
  const order = ['ecoles', 'commerces', 'bus', 'gares', 'sante', 'sport', 'parcs', 'culture', 'services', 'cafes', 'culte'];
  const mer = V.mer != null ? `<span class="chip acc">Mer à ${V.mer >= 1000 ? fr1(V.mer / 1000) + ' km' : V.mer + ' m'}</span>` : '';
  return `<section id="vivre" class="sec"><div class="sec-h"><span class="n">07</span><h2>Vivre ici</h2><p>Ce qu’il y a autour (IGN BD TOPO à 800 m, gares à 2 km ; commerces et bus OpenStreetMap à 600 m quand le service répond). ${mer}</p></div>
    <div class="grid g4">${order.filter(k => V[k] && V[k].n).map(k => `<div class="card" style="padding:14px 16px"><span class="kicker">${lab[k]}</span><div style="font-family:var(--display);font-size:24px;font-weight:800;margin:4px 0 2px">${V[k].n}</div><div class="small muted">${V[k].items.slice(0, 3).map(it => `${esc(it.n || it.k)} · ${it.d >= 1000 ? fr1(it.d / 1000) + ' km' : it.d + ' m'}`).join('<br>')}</div></div>`).join('')}</div></section>`;
}

function secAcheteur(P, est, ctx) {
  const A = P.annonce; if (A.mode === 'adresse' || !A.prix) return '';
  const R = ctx.reglages || {}; const taux = R.taux != null ? R.taux : 3.4, duree = R.duree || 25, apport = R.apport != null ? R.apport : 10;
  const frais = A.neuf ? 0.025 : 0.075;
  return `<section id="acheteur" class="sec"><div class="sec-h"><span class="n">08</span><h2>Pour l’acheteur</h2><p>Les trois chiffres qu’il va demander, et ce qu’il faut vérifier.</p></div>
    <div class="card"><div class="row noprint" style="gap:14px;margin-bottom:10px">
      <label class="f">Taux (%)<input type="number" id="bTaux" value="${taux}" step="0.1" min="0" max="10" style="width:90px"></label>
      <label class="f">Durée (ans)<input type="number" id="bDuree" value="${duree}" step="1" min="5" max="30" style="width:90px"></label>
      <label class="f">Apport (%)<input type="number" id="bApport" value="${apport}" step="1" min="0" max="100" style="width:90px"></label>
      <label class="f">Prix retenu (€)<input type="number" id="bPrix" value="${A.prix}" step="1000" style="width:150px"></label>
    </div><div class="tiles" id="bTiles"></div>
    <p class="note" style="margin-top:10px">Frais d’acquisition estimés à ${A.neuf ? '2,5 % (neuf)' : '7,5 % (ancien)'} ; hors assurance et garantie. Ordre de grandeur, pas une offre de prêt.</p></div></section>`;
}
VA.calcAcheteur = (prix, taux, duree, apport, neuf) => { const frais = prix * (neuf ? 0.025 : 0.075); const total = prix + frais; const emprunt = Math.max(0, total * (1 - apport / 100)); const r = taux / 100 / 12, n = duree * 12; const mens = r ? emprunt * r / (1 - Math.pow(1 + r, -n)) : emprunt / n; return {frais, total, emprunt, mens, cout: mens * n - emprunt, revenu: mens / 0.35}; };

function secProspecter(P, est, ctx) {
  const D = VA.dpeList(P); const V = VA.ventes(P); const since = P.dpe && P.dpe.since; const C = VA.copros(P);
  const recents = D.filter(d => d.date >= since);
  const apresVente = []; // DPE 1 à 12 mois après une vente à la même adresse
  V.forEach(v => { if (!v.a) return; const key = v.a.toLowerCase().replace(/\s+/g, ' '); D.forEach(d => { const k2 = d.adr.toLowerCase().replace(/\s+/g, ' '); if (k2.startsWith(key.split(' ')[0] + ' ') && k2.includes(key.split(' ').slice(1, 3).join(' ')) && d.date > v.d) { const m = (new Date(d.date) - new Date(v.d)) / (30.4 * 864e5); if (m >= 1 && m <= 12) apresVente.push({d, v, m: Math.round(m)}); } }); });
  const efg = D.filter(d => 'EFG'.includes(d.l) && d.date < since);
  const elec = efg.filter(d => d.en === 'E' && d.date < '2026-01-01');
  const coproFin = C.filter(c => c.fin && (new Date(c.fin).getTime() - Date.now()) < 365 * 864e5 && c.lotsH >= 5);
  const row = d => `<tr><td class="mono">${dateFr(d.date)}</td><td class="num-adr">${esc(niceAdr(d.adr))}${d.res || d.comp ? '<br><span class="small muted">' + esc([d.res, d.comp].filter(Boolean).join(' · ')) + '</span>' : ''}</td><td>${d.t === 'm' ? 'maison' : 'appt'}${d.et >= 0 ? ' · ét. ' + d.et : ''}</td><td class="r mono">${d.s} m²</td><td>${dpeClass(d.l)}</td><td>${esc(energieLib(d.en))}</td><td class="r mono">${d.cout ? eur(d.cout) : '–'}</td><td class="r mono">${Math.round(Math.hypot(d.x, d.y))} m</td></tr>`;
  const head = '<thead><tr><th>DPE</th><th>Adresse</th><th>Type</th><th class="r">Surface</th><th>Classe</th><th>Énergie</th><th class="r">Facture</th><th class="r">Dist.</th></tr></thead>';
  return `<section id="prospecter" class="sec pro"><div class="sec-h"><span class="n">09</span><h2>Prospecter autour</h2><p>Des adresses, jamais des noms : pour le courrier, le passage et le flyer. Un DPE récent est un signal de projet (vente ou location), pas une certitude.</p></div>
    <div class="grid g4" style="margin-bottom:14px">
      <div class="tile"><span class="k">DPE des 6 derniers mois</span><span class="v">${recents.length}</span><span class="s">à 300 m, depuis le ${dateFr(since)}</span></div>
      <div class="tile"><span class="k">DPE 1–12 mois après une vente</span><span class="v">${apresVente.length}</span><span class="s">mise en location probable</span></div>
      <div class="tile"><span class="k">Passoires E-F-G</span><span class="v">${efg.length}</span><span class="s">${elec.length} électriques d’avant 2026 : nouvelle étiquette à proposer</span></div>
      <div class="tile"><span class="k">Copros en fin de mandat</span><span class="v">${coproFin.length}</span><span class="s">assemblée dans l’année, ≥ 5 lots</span></div>
    </div>
    ${recents.length ? `<div class="card"><h3>DPE récents</h3><div class="tbl"><table>${head}<tbody>${recents.slice(0, 25).map(row).join('')}</tbody></table></div>${recents.length > 25 ? `<p class="note">… et ${recents.length - 25} autres.</p>` : ''}</div>` : ''}
    ${apresVente.length ? `<div class="card" style="margin-top:14px"><h3>DPE après une vente récente (achat pour louer ?)</h3><div class="tbl"><table><thead><tr><th>Vente</th><th>Adresse</th><th class="r">Prix</th><th>DPE</th><th>Classe</th><th>Délai</th></tr></thead><tbody>${apresVente.slice(0, 15).map(x => `<tr><td class="mono">${monthFr(x.v.d)}</td><td class="num-adr">${esc(niceAdr(x.d.adr))}</td><td class="r mono">${kE(x.v.pk * 1000)}</td><td class="mono">${dateFr(x.d.date)}</td><td>${dpeClass(x.d.l)}</td><td class="mono">${x.m} mois</td></tr>`).join('')}</tbody></table></div></div>` : ''}
    ${efg.length ? `<div class="card" style="margin-top:14px"><h3>Passoires énergétiques (E, F, G)</h3><div class="tbl"><table>${head}<tbody>${efg.slice(0, 25).map(row).join('')}</tbody></table></div>${efg.length > 25 ? `<p class="note">… et ${efg.length - 25} autres.</p>` : ''}</div>` : ''}
  </section>`;
}

function secRdv(P, est, ctx) {
  const A = P.annonce; const R = P.risques || {}; const d = P.adresse && P.adresse.dpe; const C = VA.copros(P); const mine = C.find(c => c.sujet);
  const items = [
    est && est.valeur ? `Prix : affiché ${eur(A.prix)}, valeur statistique ${eur(est.valeur)} (${est.libelle.t.toLowerCase()}). Préparer les 5 comparables imprimés.` : null,
    d ? `Adresse : ${niceAdr(d.adr)} (certitude ${P.adresse.certitude}). Vérifier le numéro et le bâtiment sur place.` : 'Adresse non retrouvée : demander l’adresse exacte avant de se déplacer.',
    R.argile && /fort|moy/i.test(R.argile) ? `Argile ${R.argile.toLowerCase()} : demander l’étude de sol si extension/piscine, regarder les fissures.` : null,
    R.plu ? `PLU zone ${R.plu.z} : vérifier les autorisations des annexes (piscine, extension, garage).` : 'PLU non trouvé : vérifier en mairie.',
    R.catnat && R.catnat.n > 20 ? `${R.catnat.n} arrêtés CatNat sur la commune : demander les sinistres déclarés.` : null,
    mine ? `Copropriété ${mine.nom || ''} : PV d’AG, fonds travaux, fin de mandat du syndic ${mine.fin ? dateFr(mine.fin) : ''}.` : (A.copro && A.copro.is ? 'Copropriété : demander les PV d’AG et le règlement.' : null),
    d && d.l && 'EFG'.includes(d.l) ? `DPE ${d.l} : parler location (interdictions) et réforme 2026 (nouvelle étiquette si électrique).` : null,
    A.expo ? `Exposition annoncée « ${A.expo} » : confronter au calcul de soleil (section 04) et à la visite.` : 'Exposition : regarder la section 04 avant de visiter.',
    A.terrain ? `Terrain ${fmt(A.terrain)} m² : limites, servitudes, débroussaillement si zone boisée.` : null,
    'Photos et mesures : surface habitable (loi Carrez si copro), hauteur sous plafond, état toiture/menuiseries.'
  ];
  return `<section id="rdv" class="sec pro"><div class="sec-h"><span class="n">10</span><h2>Préparer le rendez-vous</h2><p>Dix points, dans l’ordre où le vendeur va les entendre.</p></div>
    <div class="card"><ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14.5px">${li(items)}</ol>
    ${!ctx.standalone ? `<div class="row" style="margin-top:12px"><a class="btn btn-p" href="#rdv/${esc(ctx.id || '')}">Ouvrir le dossier de rendez-vous (3 scénarios de prix) →</a><button class="btn-s" data-act="copy-checklist">Copier la liste</button></div>` : ''}</div></section>`;
}

function secSuivi(P, est, ctx) {
  const A = P.annonce; const S = ctx.suivi || []; if (A.mode === 'adresse' || ctx.standalone) return '';
  const first = S[0]; const j = first ? joursDepuis(first.date) : null;
  return `<section id="suivi" class="sec pro"><div class="sec-h"><span class="n">11</span><h2>Suivi de l’annonce</h2><p>Chaque « mettre à jour » relit l’annonce sur le portail et note le prix. Les baisses et le retrait apparaissent ici et dans « Suivi ».</p></div>
    <div class="card"><div class="row sp"><div>${first ? `Vue la première fois le <b>${dateFr(first.date)}</b> (${j} jours) à ${eur(first.prix)}.` : 'Pas encore suivie.'} ${S.length > 1 ? ` Aujourd’hui ${eur(S[S.length - 1].prix)} : <b class="${S[S.length - 1].prix < first.prix ? 'warn' : ''}">${pct(S[S.length - 1].prix / first.prix - 1)}</b>.` : ''}${S.some(s => s.retiree) ? ' <span class="chip bad">Retirée du portail</span>' : ''}</div><button class="btn-s" data-act="refresh">Mettre à jour maintenant</button></div>
    ${S.length ? `<div class="tbl" style="margin-top:8px"><table><thead><tr><th>Date</th><th class="r">Prix</th><th>Note</th></tr></thead><tbody>${S.slice().reverse().slice(0, 12).map(s => `<tr><td class="mono">${dateFr(s.date)}</td><td class="r mono">${s.prix ? eur(s.prix) : '–'}</td><td>${s.retiree ? '<span class="bad">retirée</span>' : s.note || ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </div></section>`;
}

function secMethode(P) {
  const E = P.etapes || {};
  const srcs = [['Annonce', P.annonce.portail === 'Bien’ici' ? 'Bien’ici, fiche publique de l’annonce (position floutée par le portail)' : 'saisie du conseiller'], ['Adresse', 'Base Adresse Nationale (api-adresse.data.gouv.fr) ; DPE ADEME (data.ademe.fr, dpe03existant) pour retrouver l’adresse'],
    ['Ventes', (P.marche && P.marche.source) || 'DVF Etalab (app.dvf.etalab.gouv.fr)'], ['Cadastre et PLU', 'API Carto IGN (cadastre, Géoportail de l’urbanisme)'], ['Bâtiments', 'BD TOPO V3 IGN (hauteurs, logements, altitudes)'], ['Copropriétés', 'Registre national des copropriétés (data.gouv.fr)'], ['Risques', 'Géorisques (argile, séisme, radon, TRI, CatNat, rapport au point)'], ['Vivre ici', 'IGN BD TOPO (écoles, santé, sport, culture, transports, trait de côte) et OpenStreetMap (commerces, bus)']];
  return `<section id="methode" class="sec"><div class="sec-h"><span class="n">12</span><h2>Méthode, sources, limites</h2></div>
    <div class="grid g2"><div class="card"><h3>Comment c’est calculé</h3><ul style="padding-left:18px;font-size:14px;display:flex;flex-direction:column;gap:6px;margin:8px 0 0">
      <li><b>Adresse :</b> le DPE de la commune dont la date, la consommation, les émissions et le coût collent à l’annonce ; score et certitude affichés, candidats listés.</li>
      <li><b>Prix :</b> ventes du même type à 800 m depuis 6 ans ; chaque vente est recalée sur la médiane annuelle du secteur ; les 5 plus ressemblantes (surface, distance, date, terrain) donnent la médiane ; fourchette « 8 cas sur 10 » = dispersion des ventes recalées.</li>
      <li><b>Verdict :</b> sous le marché ≤ −8 % · dans le marché de −8 à +5 % · un peu au-dessus de +5 à +12 % · au-dessus > +12 %.</li>
      <li><b>Soleil :</b> position du soleil (formules NOAA simplifiées), ombres des bâtiments BD TOPO, altitude des voisins prise en compte pour la terrasse.</li>
      <li><b>Risques :</b> au point pour l’argile, le PLU et le rapport ; à la commune pour le séisme, le radon et les CatNat.</li></ul></div>
    <div class="card"><h3>Sources et fraîcheur</h3><dl class="kv" style="margin-top:8px">${srcs.map(([k, v]) => `<dt>${k}</dt><dd class="small">${esc(v)}</dd>`).join('')}</dl>
      <ul class="steps">${Object.entries(E).map(([k, v]) => `<li><span>${v.ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'} ${esc(k)}</span><span>${v.ok ? (v.ms / 1000).toFixed(1) + ' s' : esc(v.err || 'échec')}</span></li>`).join('')}</ul>
      <p class="note" style="margin-top:8px">DVF a 6 à 9 mois de retard et ignore l’étage, l’état et la vue. Les données DPE sont publiques mais sans nom : les listes servent au courrier et au passage, jamais à contacter nominativement. Rien n’est aspiré des portails : une annonce à la fois, celle que vous ouvrez.</p></div></div></section>`;
}

/* ---------- assemblage ---------- */
VA.renderDossier = function (P, ctx) {
  ctx = ctx || {}; const est = ctx.est || VA.estimer(P, ctx.adj);
  const toc = ['synthese:Synthèse', 'ou:Où', 'prix:Prix', 'bien:Bien', 'soleil:Soleil', 'risques:Risques', 'copro:Copro', 'vivre:Vivre ici', 'acheteur:Acheteur', 'prospecter:Prospecter', 'rdv:Rendez-vous', 'suivi:Suivi', 'methode:Méthode'];
  return `<nav class="toc noprint">${toc.map(t => { const [id, lab] = t.split(':'); const pro = ['prospecter', 'rdv', 'suivi'].includes(id) ? ' pro' : ''; return `<a class="${pro}" href="#${id}" data-anchor="${id}">${lab}</a>`; }).join('')}</nav>` +
    secHero(P, est, ctx) + secOu(P, est, ctx) + secPrix(P, est, ctx) + secBien(P, est, ctx) + secSoleil(P, est, ctx) + secRisques(P) + secCopro(P, ctx) + secVivre(P) + secAcheteur(P, est, ctx) + secProspecter(P, est, ctx) + secRdv(P, est, ctx) + secSuivi(P, est, ctx) + secMethode(P);
};

/* ---------- interactions après insertion ---------- */
VA.wireDossier = function (root, P, ctx) {
  ctx = ctx || {};
  // calques
  root.querySelectorAll('[data-layer]').forEach(cb => { const g = root.querySelector('#' + cb.dataset.layer); if (!g) return; const apply = () => g.style.display = cb.checked ? '' : 'none'; cb.addEventListener('change', apply); apply(); });
  // ancres internes (évite de changer la route)
  root.querySelectorAll('[data-anchor]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = root.querySelector('#' + a.dataset.anchor); if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'}); }));
  // soleil
  const S = VA.sun(P); const gSun = root.querySelector('#gSun'); const read = root.querySelector('#sunRead'), jEl = root.querySelector('#sunJ'), tEl = root.querySelector('#sunTime');
  const W = 640, H = 560, R = 250; const sx = W / (2 * R), sy = H / (2 * 226); const px = ([x, y]) => [(x + R) * sx, (226 - y) * sy];
  let season = 'hiver', hour = 14;
  const dirs = ['au nord', 'au nord-est', 'à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest'];
  const render = () => { const s = S.SEASONS[season]; const x = S.etat(s, hour); if (tEl) tEl.textContent = S.hhmm(hour);
    if (x.nuit) { if (gSun) gSun.innerHTML = ''; if (read) read.innerHTML = `<b>${S.hhmm(hour)}, ${s.lab}</b> : le soleil est couché.`; if (jEl) jEl.innerHTML = ''; return; }
    if (gSun) { const d = S.shadows(x.el, x.az, px); const sp = px([Math.max(-238, Math.min(238, 215 * Math.sin(x.az * Math.PI / 180))), Math.max(-214, Math.min(214, 215 * Math.cos(x.az * Math.PI / 180)))]); gSun.innerHTML = `<path d="${d}" fill="rgba(28,36,80,.34)" fill-rule="nonzero"/><g><circle cx="${sp[0].toFixed(1)}" cy="${sp[1].toFixed(1)}" r="8" fill="#f2b705" stroke="#fff" stroke-width="1.5"/><text x="${sp[0].toFixed(1)}" y="${(sp[1] + 20).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10.5" fill="#15171c">soleil ${Math.round(x.az)}°</text></g>`; }
    if (read) read.innerHTML = `<b>${S.hhmm(hour)}, ${s.lab}</b> : soleil ${dirs[Math.round(x.az / 45) % 8]} (azimut ${Math.round(x.az)}°), ${Math.round(x.el)}° au-dessus de l’horizon ; une maison de 7 m porte une ombre de ${Math.round(Math.min(7 / Math.tan(x.el * Math.PI / 180), 560))} m.`;
    if (jEl) jEl.innerHTML = S.sujet && !S.sud.length ? '<span class="sun-na">Terrasse non identifiable (bâtiments accolés) : les ombres sont dessinées, pas l’état de la terrasse.</span>' : S.sujet ? `Façade sud / terrasse du bien : ${x.jd === 'ok' ? '<span class="sun-ok">au soleil</span>' : x.jd === 'ombre' ? '<span class="sun-no">à l’ombre ' + x.who.join(' et ') + '</span>' : x.jd === 'partiel' ? '<span class="sun-no">en partie à l’ombre ' + x.who.join(' et ') + '</span>' : '<span class="sun-na">non calculable</span>'}.` : '<span class="sun-na">Bâtiment du bien non identifié : les ombres sont dessinées, pas l’état de la terrasse.</span>'; };
  root.querySelectorAll('#sunSeason button').forEach(b => b.addEventListener('click', () => { season = b.dataset.s; root.querySelectorAll('#sunSeason button').forEach(o => o.setAttribute('aria-pressed', o === b)); render(); }));
  const slider = root.querySelector('#sunHour'); if (slider) slider.addEventListener('input', () => { hour = +slider.value; render(); });
  render();
  // acheteur
  const bT = root.querySelector('#bTiles');
  if (bT) { const upd = () => { const prix = +root.querySelector('#bPrix').value || P.annonce.prix; const c = VA.calcAcheteur(prix, +root.querySelector('#bTaux').value, +root.querySelector('#bDuree').value, +root.querySelector('#bApport').value, P.annonce.neuf);
      bT.innerHTML = `<div class="tile"><span class="k">Mensualité</span><span class="v">${eur(c.mens)}</span><span class="s">sur ${root.querySelector('#bDuree').value} ans à ${root.querySelector('#bTaux').value} %</span></div><div class="tile"><span class="k">Coût total</span><span class="v">${kE(c.total)}</span><span class="s">dont frais ${eur(c.frais)}</span></div><div class="tile"><span class="k">À emprunter</span><span class="v">${kE(c.emprunt)}</span><span class="s">intérêts ${kE(c.cout)}</span></div><div class="tile"><span class="k">Revenus nécessaires</span><span class="v">${eur(c.revenu)}</span><span class="s">par mois, à 35 % d’endettement</span></div>`; };
    ['#bPrix', '#bTaux', '#bDuree', '#bApport'].forEach(s => root.querySelector(s).addEventListener('input', upd)); upd(); }
  // ajustements
  const adjList = root.querySelector('#adjList');
  if (adjList && ctx.onAdj) { const collect = () => { const out = []; adjList.querySelectorAll('li').forEach((li, i) => out.push({on: li.querySelector('[data-adj-on]').checked, l: li.querySelector('[data-adj-l]').value, p: +li.querySelector('[data-adj-p]').value || 0})); return out; };
    adjList.addEventListener('change', () => ctx.onAdj(collect())); adjList.addEventListener('click', e => { const b = e.target.closest('[data-adj-del]'); if (b) { const arr = collect(); arr.splice(+b.dataset.adjDel, 1); ctx.onAdj(arr); } });
    const add = root.querySelector('[data-act="adj-add"]'); if (add) add.addEventListener('click', () => { const arr = collect(); arr.push({on: true, l: '', p: 0}); ctx.onAdj(arr); }); }
  // boutons
  root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => { const act = b.dataset.act; if (ctx.onAct) ctx.onAct(act, b); }));
};
})(window.VA);
