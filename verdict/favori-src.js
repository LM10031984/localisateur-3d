/* Dossier du bien — favori universel. Lit l'annonce ouverte (Bien'ici, Leboncoin, SeLoger, Belles Demeures, Figaro Immobilier, ParuVendu,
   lesiteimmo, Green-Acres, autres sites : lecture du texte), puis ouvre le dossier complet. Lecteur repris du Localisateur Academia (content/reader.js).
   Rien n'est envoyé à un serveur : les champs lus voyagent dans l'adresse de la page du dossier (#f=…), qui tourne dans le navigateur. */
(async () => {
  const BASE = "https://lm10031984.github.io/localisateur-3d/verdict/";
  let win = null; try { win = window.open("", "_blank"); if (win) { win.document.write('<!doctype html><meta charset="utf-8"><title>Dossier du bien</title><body style="font:16px system-ui,sans-serif;padding:32px;color:#15161A">Lecture de l\'annonce…</body>'); } } catch (e) { win = null; }
  const ad = await (async () => {
  const W = window, D = document;
  const num = v => { if (v == null || v === "") return null; const x = parseFloat(String(v).replace(/[\s \xa0]/g, "").replace(",", ".")); return isFinite(x) ? x : null; };
  const dist = (la1, lo1, la2, lo2) => { const k = Math.PI / 180, x = (lo2 - lo1) * k * Math.cos((la1 + la2) / 2 * k), y = (la2 - la1) * k; return 6371e3 * Math.hypot(x, y); };
  const kind = s => /maison|villa|house|mas\b|bastide|propri[eé]t[eé]|chalet|ferme|long[eè]re/i.test(s || "") ? "M" : /appart|flat|studio|duplex|triplex|loft|t\d\b|f\d\b/i.test(s || "") ? "A" : null;
  const lab = s => (s = String(s || "").trim().toUpperCase(), /^[A-G]$/.test(s) ? s : null);
  const uniq = a => [...new Set(a.filter(Boolean))].slice(0, 24);
  let ad = null;
  try {
    ad = await (async () => {
      const host = location.hostname, url = location.href.split("#")[0], path = location.pathname;
      const S = W.ACADEMIA_SITES || null; // lib/sites.js, injecté juste avant ce lecteur (motifs des fiches, toutes variantes)
      if (/bienici\.com$/.test(host) && /\/annonce\//.test(path)) {
        const id = decodeURIComponent(path.split("/").filter(Boolean).pop());
        const t = await fetch("/realEstateAd.json?id=" + encodeURIComponent(id)).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
        const bl = t.blurInfo || {}, c = bl.position || bl.centroid || {};
        const prec = bl.type === "exact" ? 0 : bl.radius > 0 ? Math.round(bl.radius) : bl.bbox ? Math.round(dist(bl.bbox[1], bl.bbox[0], bl.bbox[3], bl.bbox[2]) / 2.83) : 800; // rayon du disque de floutage (médiane 500 m pour les maisons, 125 m pour les appartements)
        const pt = String(t.propertyType || "");
        return { site: "Bien'ici", url, type: /house|townhouse|castle|villa/.test(pt) ? "M" : /flat|loft|duplex|studio/.test(pt) ? "A" : kind(t.title), price: num(t.price), surface: num(t.surfaceArea), rooms: num(t.roomsQuantity), land: num(t.landSurfaceArea), dpe: lab(t.energyClassification), dpeDate: (t.energyPerformanceDiagnosticDate || "").slice(0, 10) || null, dpeKwh: num(t.energyValue), dpeGes: num(t.greenhouseGazValue), dpeGesClasse: lab(t.greenhouseGazClassification), coutMin: num(t.minEnergyConsumption), coutMax: num(t.maxEnergyConsumption), lots: num(t.condominiumPartsQuantity), charges: num(t.annualCondominiumFees), procedure: t.isCondominiumInProcedure === true ? 1 : null, etage: num(t.floor), etages: num(t.floorQuantity), ascenseur: t.hasElevator === true ? 1 : t.hasElevator === false ? 0 : null, poolChamp: t.hasPool === true ? 1 : null, chauffageTexte: t.heating || null, clim: t.hasAirConditioning === true ? 1 : null, duplex: t.isDuplex === true ? 1 : null, exposition: t.exposition || null, blurType: bl.type || null, year: num(t.yearOfConstruction), pro: t.adCreatedByPro !== false, city: t.city, cp: t.postalCode, lat: num(c.lat), lon: num(c.lon), precM: prec, photos: uniq((t.photos || []).map(p => p.url || p.url_photo)), title: t.title || "", publiee: /^20\d\d-/.test(String(t.publicationDate || "")) ? String(t.publicationDate).slice(0, 10) : null, desc: (t.title || "") + " " + (t.description || "") };
      }
      if (/leboncoin\.fr$/.test(host)) {
        const m = path.match(/(\d{6,})(?:\.htm)?\/?$/); if (!m) return null;
        let o = null;
        try { o = JSON.parse(D.getElementById("__NEXT_DATA__").textContent).props.pageProps.ad; } catch (e) {}
        if (!o || String(o.list_id) !== m[1]) { const h = (await fetch(url, { credentials: "include" }).then(r => r.text())).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); o = JSON.parse(h[1]).props.pageProps.ad; }
        const at = {}; (o.attributes || []).forEach(a => at[a.key] = a.value);
        const lo = o.location || {}, im = o.images || {};
        return { site: "Leboncoin", url, publiee: o.first_publication_date ? String(o.first_publication_date).slice(0, 10) : null, type: at.real_estate_type === "1" ? "M" : at.real_estate_type === "2" ? "A" : null, price: num((o.price || [])[0]), surface: num(at.square), rooms: num(at.rooms), land: num(at.land_plot_surface), dpe: lab(at.energy_rate), dpeGesClasse: lab(at.ges), dpeKwh: num(at.energy_consumption || at.energy_value), dpeGes: num(at.ges_value || at.ghg_emission), year: num(at.building_year), pro: !!o.owner && o.owner.type === "pro", city: lo.city, cp: lo.zipcode, lat: num(lo.lat), lon: num(lo.lng), precM: lo.type === "district" ? 600 : lo.type === "city" ? 1500 : 250, photos: uniq((im.urls_large || im.urls || [im.thumb_url])), title: o.subject || "", desc: (o.subject || "") + " " + (o.body || "") + " " + JSON.stringify(o.attributes || []) };
      }
      if (/seloger\.com$/.test(host) && (S ? S.ficheRe("seloger").test(url) : /\/annonces?\//.test(path))) {
        const pick = x => x && x.app_cldp && x.app_cldp.data && x.app_cldp.data.classified;
        let c = pick(W.__UFRN_LIFECYCLE_SERVERREQUEST__);
        const idOf = x => { try { return x.tracking.av_items[0].id; } catch (e) { return ""; } };
        if (!c || !path.includes(idOf(c))) { const h = (await fetch(url, { credentials: "include" }).then(r => r.text())).match(/__UFRN_LIFECYCLE_SERVERREQUEST__"\]=JSON\.parse\(("(?:[^"\\]|\\.)*")\)/); c = pick(JSON.parse(JSON.parse(h[1]))); }
        const s = c.sections || {}, hf = s.hardFacts || {}, f = {}; (hf.facts || []).forEach(x => f[x.type] = x.splitValue || x.value);
        const tr = c.tracking && c.tracking.av_items && c.tracking.av_items[0] || {}, en = {}; ((s.energy || {}).features || []).forEach(x => en[x.type] = x.value);
        const loc = s.location || {}, ad = loc.address || {};
        let g = {};
        if (loc.geometry && loc.geometry.coordinates) {
          if (loc.geometry.type === "Point" && typeof loc.geometry.coordinates[0] === "number") g = { lat: loc.geometry.coordinates[1], lon: loc.geometry.coordinates[0], precM: 500, blurType: "point" }; // 10/2026 : un point, déplacé au hasard (SPEC-secteur-100 §2.8) : jamais « exact »
          else { // polygone du quartier (MultiPolygon) : gardé tel quel (SPEC-seloger-antibes §8), position = centre du rectangle, rayon = demi-diagonale
            let a = 180, b = 90, cc = -180, d = -90; const rings = [];
            const walk = x => typeof x[0] === "number" ? (a = Math.min(a, x[0]), b = Math.min(b, x[1]), cc = Math.max(cc, x[0]), d = Math.max(d, x[1])) : (Array.isArray(x[0]) && typeof x[0][0] === "number" ? (rings.push(x), x.forEach(walk)) : x.forEach(walk));
            walk(loc.geometry.coordinates);
            const simp = r => r.length <= 120 ? r : r.filter((p, i) => i % Math.ceil(r.length / 120) === 0).concat([r[0]]);
            g = { lat: (b + d) / 2, lon: (a + cc) / 2, precM: Math.round(dist(b, a, d, cc) / 2), blurType: "polygon", polygone: rings.slice(0, 6).map(simp) };
          }
        }
        /* 10/2026 : DPE chiffré (échelles kWh et GES), fourchette de coût annuel, copropriété (lots, charges, procédure) */
        const cert = ((s.energy || {}).certificates || [])[0] || {}, sc = {};
        (cert.scales || []).forEach(x => { const ges = /GHG|GES/i.test(String(x.type || "") + " " + String(x.name || "")), cl = x.efficiencyClass && x.efficiencyClass.rating; if (cl) sc[ges ? "gesClasse" : "classe"] = cl; for (const v of x.values || []) { const n = num((String(v.value || "").match(/\d+(?:[.,]\d+)?/) || [])[0]); if (n == null) continue; if (!ges && /primaire|consommation/i.test(v.label || "") && !/finale/i.test(v.label || "")) sc.kwh = n; if (/mission/i.test(v.label || "")) sc.ges = n; } });
        const est = (cert.features || []).find(x => x && x.type === "minMaxEstimation"), mm = est && String(est.value || "").replace(/[\s\xa0]/g, "").match(/(\d+)et(\d+)/);
        const co = {}; (((s.coOwnership || {}).items) || []).forEach(x => { if (x && x.type) co[x.type] = String(x.value || ""); });
        // date du diagnostic si la fiche l'écrit (libellés du certificat : « réalisé le 12/03/2024 », « DPE du … ») ; sinon null (la lecture de secours cherche aussi dans le texte)
        const dm = ((cert.features || []).map(x => (x && (x.label || "") + " " + (x.value || ""))).concat(((s.energy || {}).features || []).map(x => x && /date|diagnostic|dpe/i.test(x.type || x.label || "") ? (x.label || "") + " " + (x.value || "") : "")).join(" ")).match(/(?:r[ée]alis[ée]e?|[ée]tabli|effectu[ée]|du|le|date)\s*(?::|le)?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})/i);
        const dpeDate = dm ? dm[3] + "-" + dm[2].padStart(2, "0") + "-" + dm[1].padStart(2, "0") : null;
        const lk = Object.keys(f).find(k => /plot|land|terrain/i.test(k));
        let ph = []; const type0 = kind(hf.title) || kind(D.title);
        try { ph = (JSON.stringify(s.gallery || {}).match(/https:[^"]+?\.(?:jpe?g|webp)[^"]*/gi) || []); } catch (e) {}
        /* SPEC-empreinte §2 : chauffage (« Type de chauffage », « Sources d'énergie ») et étage (« 3ème étage/4 étages », « Rez-de-chaussée/3 étages ») de la fiche */
        const chT = [en.heatingSystem, en.energySource].filter(Boolean).join(" ; ") || null, fv = [];
        try { JSON.stringify(s.features || {}, (k, v) => { if (k === "value" && typeof v === "string") fv.push(v); return v; }); } catch (e) {}
        const etT = type0 === "A" ? fv.find(v => /[ée]tage|rez-de-chauss/i.test(v)) || null : null; let etg = null, etgs = null, em;
        if (etT) { if (/rez/i.test(etT)) etg = 0; else if ((em = etT.match(/(\d{1,2})\s*(?:er|ère|ème|e|è)?\s*[ée]tage/i)) && !/^\s*\d{1,2}\s*[ée]tages\s*$/i.test(etT)) etg = +em[1]; if ((em = etT.match(/\/\s*(\d{1,2})\s*(?:[ée]tages?)?/))) etgs = +em[1]; }
        return { site: "SeLoger", url, chauffageTexte: chT, etageTexte: etT, etage: etg, etages: etgs, type: type0, price: num(tr.price) || num((s.mortgage || {}).price), surface: num(f.livingSpace), rooms: num(f.numberOfRooms), land: lk ? num(f[lk]) : null, dpe: lab(c.tracking && c.tracking.av_energy_certificate) || lab(sc.classe), dpeDate, dpeKwh: sc.kwh ?? null, dpeGes: sc.ges ?? null, dpeGesClasse: lab(sc.gesClasse), coutMin: mm ? num(mm[1]) : null, coutMax: mm ? num(mm[2]) : null, lots: num(co.numberOfUnits) || null, charges: co.operatingCosts ? num((co.operatingCosts.match(/\d[\d\s\xa0]*/) || [""])[0]) : null, procedure: co.syndicProcedures && /proc[ée]dure/i.test(co.syndicProcedures) && !/pas de|aucune|sans/i.test(co.syndicProcedures) ? 1 : null, year: num(en.yearOfConstruction), pro: ((c.contactSections || {}).provider || {}).publisherType !== "PRIVATE", city: ad.city, cp: ad.zipCode, lat: g.lat, lon: g.lon, precM: g.precM > 3000 ? 1500 : g.precM, blurType: g.blurType || null, polygone: g.polygone || null, photos: uniq(ph), title: hf.title || "", desc: (hf.title || "") + " " + JSON.stringify(Object.keys(s).filter(k => !/similar|recommend|agency|contact|advert|mortgage/i.test(k)).map(k => s[k])) };
      }
      if (/bellesdemeures\.com$/.test(host)) {
        const p = ((W.dataLayer || []).flatMap(x => x && x.products || []).filter(x => x.list_name === "classified_detail").pop()) || null; // la DERNIÈRE fiche poussée : après une navigation interne, la première est celle de l'annonce précédente
        if (!p) return null;
        const h = D.documentElement.outerHTML, seen = new Set(), ph = [];
        for (const m of h.matchAll(/https:\/\/v\.seloger\.com\/s\/[^"'\s)]*?\/(visuels\/[^"'\s)?]+?\.(?:jpe?g|webp))/gi)) { if (!seen.has(m[1])) { seen.add(m[1]); ph.push("https://v.seloger.com/s/width/1200/" + m[1]); } }
        return { site: "Belles Demeures", url, type: kind(D.title) || (p.estate_sub_type === "2" ? "M" : null), price: num(p.price), surface: num(p.space), rooms: num(p.nb_rooms), land: num(p.land_surface), dpe: lab(p.energy_certificate), pro: p.client_type === "pro", city: p.city, cp: p.estate_postalcode, lat: null, lon: null, precM: null, photos: uniq(ph.slice(0, p.photos_nb || 20)), title: D.title.split("|")[0].trim(), desc: D.title + " " + [...D.querySelectorAll('[class*="escription"],[class*="riteria"],[class*="eature"]')].map(x => x.innerText).join(" ") };
      }
      if (/lefigaro\.fr$/.test(host) && /annonce-\d+/.test(path)) {
        const c = W.__NUXT__ && W.__NUXT__.data && W.__NUXT__.data.classifiedDetailResponse && W.__NUXT__.data.classifiedDetailResponse.classified;
        if (!c || !path.includes(String(c.id))) return null;
        const lo = c.location || {}, dp = c.dpe || {}, im = (c.images && c.images.photos) || [];
        return { site: "Figaro Immobilier", url, type: /maison|villa|propri/i.test(c.type || "") ? "M" : /appart/i.test(c.type || "") ? "A" : kind(D.title), price: num(c.price), surface: num(c.area), rooms: num([].concat(c.roomCount || [])[0]), land: num(c.areaGround), dpe: lab(dp.energyCategory), dpeKwh: num(dp.energyValue || dp.energyConsumption), dpeGes: num(dp.gesValue || dp.greenhouseGasValue), dpeGesClasse: lab(dp.gesCategory), pro: c.origin !== "particulier", city: String(lo.city || "").replace(/\s*\(\d+\)$/, ""), cp: lo.postalCode, lat: lo.geocoded ? num(lo.latitude) : null, lon: lo.geocoded ? num(lo.longitude) : null, precM: lo.geocoded ? 250 : null, photos: uniq(im.map(x => x.url && (x.url["extra-large"] || x.url.large || x.url.medium))), title: D.title.split(":")[0].trim(), desc: D.title + " " + (c.descriptionFull || c.description || "") + " " + JSON.stringify(c.options || c.linkedOptions || "") };
      }
      if (/paruvendu\.fr$/.test(host) && /\/immobilier\//.test(path)) {
        const g = Object.assign({}, ...(W.dataLayer || []).filter(x => x && x.gtm_var_prix != null));
        const T = D.body.innerText.replace(/[ \xa0]/g, " ");
        const m1 = T.match(/SURFACE\s*\n\s*([\d .,]+)\s*m/i), m2 = T.match(/Surface terrain\s*:?\s*([\d .,]+)\s*m/i), m3 = T.match(/\b([A-G])\s*\n\s*Classe [ÉE]nergie/);
        const dep = String(g.gtm_lib_dept || ""), cp = (T.match(new RegExp("\\b(" + (dep || "\\d{2}") + "\\d{3})\\b")) || [])[1];
        const ph = [(D.querySelector('meta[property="og:image"]') || {}).content].concat([...D.images].filter(i => i.naturalWidth >= 400 && /paruvendu/.test(i.currentSrc || i.src)).map(i => i.currentSrc || i.src));
        return { site: "ParuVendu", url, type: /maison|villa/i.test(g.gtm_lib_rub || "") ? "M" : /appart/i.test(g.gtm_lib_rub || "") ? "A" : kind(D.title), price: num(g.gtm_var_prix), surface: m1 ? num(m1[1]) : null, land: m2 ? num(m2[1]) : null, dpe: m3 ? lab(m3[1]) : null, pro: g.gtm_var_ispro !== "non", city: g.gtm_lib_ville, cp, lat: null, lon: null, precM: null, photos: uniq(ph), title: D.title.split(" - ParuVendu")[0], desc: D.title + " " + ([...D.querySelectorAll('[class*="escri"],[id*="escri"]')].map(x => x.innerText).join(" ") || T.slice(0, 4000)) };
      }
      if (/green-acres\.[a-z.]+$/.test(host) && /\/properties\//.test(path)) {
        const it = ((W.dataLayer || []).filter(x => x && x.event === "view_item").map(x => x.ecommerce && x.ecommerce.items && x.ecommerce.items[0]).filter(Boolean)).pop() || {}; // la dernière vue (navigation interne)
        const T = D.body.innerText.replace(/[ \xa0]/g, " ");
        const m1 = T.match(/\bSurface\s*\n\s*([\d .,]+)\s*m/), m2 = T.match(/\bTerrain\s*\n\s*([\d .,]+)\s*m/), dl = D.querySelector(".dpe-row.diagnostic .dpe-line, .dpe-row .dpe-line");
        const seg = path.split("/"), citySlug = seg[seg.length - 2] || "";
        const cityT = (D.title.match(/à vendre à ([^,|]+)/i) || [])[1];
        const ph = [...new Set([...D.images].filter(i => i.naturalWidth >= 400).map(i => i.currentSrc || i.src))];
        return { site: "Green-Acres", url, type: /\/maison\/|villa|maison/i.test(path + " " + D.title) ? "M" : /appartement/i.test(path) ? "A" : kind(D.title), price: num(it.price), surface: m1 ? num(m1[1]) : null, land: m2 ? num(m2[1]) : null, dpe: dl ? lab(dl.innerText) : null, pro: true, city: cityT ? cityT.trim() : citySlug.replace(/-/g, " "), cp: it.item_zip || null, lat: null, lon: null, precM: null, photos: uniq(ph), title: D.title, desc: D.title + " " + ([...D.querySelectorAll('[class*="escri"],[class*="about"],[class*="eature"]')].map(x => x.innerText).join(" ") || T.slice(0, 4000)) };
      }
      /* lesiteimmo (14/10/2026) : site Nuxt, l'annonce est dans __NUXT_DATA__ (format « devalue » : un tableau dont les valeurs renvoient à
         d'autres cases par leur numéro), clé getPropertyById-<identifiant de l'adresse>. Après une navigation interne la balise garde l'annonce
         précédente : on relit alors la page. Le point GPS de la fiche n'est PAS utilisé : mesuré sur 70 annonces du 06 à DPE certain, il est à
         1,3 km du bien en médiane (ni la maison, ni le centre de la commune) ; la recherche part de la commune.
         adresseAgence : l'adresse que l'agence a écrite (address.line1), présente dans les données mais pas affichée par le site. Mesure
         du 14/10/2026 contre le DPE (70 annonces du 06) : avec numéro et rue, le bon logement 27 fois sur 29. Montrée « à vérifier »,
         sauf si le DPE retrouvé par le moteur donne la même (lib/sector/verdict.js → agenceDe). */
      if (/(^|\.)lesiteimmo\.com$/.test(host) && /\/acheter\/[^/]+\/[^/]+\/\d{6,}\/?$/.test(path)) {
        const id = path.match(/(\d{6,})\/?$/)[1];
        const lire = html => { const m = String(html).match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); if (!m) return null; const A = JSON.parse(m[1]), memo = new Map();
          const R = i => { if (typeof i !== "number") return i; if (i < 0) return undefined; if (memo.has(i)) return memo.get(i); const v = A[i];
            if (Array.isArray(v)) { if (typeof v[0] === "string" && /^(?:Reactive|ShallowReactive|Ref|ShallowRef|EmptyRef|Set|Map|Date)$/.test(v[0])) { const r = R(v[1]); memo.set(i, r); return r; } const o = []; memo.set(i, o); v.forEach(x => o.push(R(x))); return o; }
            if (v && typeof v === "object") { const o = {}; memo.set(i, o); for (const k in v) o[k] = R(v[k]); return o; } return v; };
          const data = (R(0) || {}).data || {}, k = "getPropertyById-" + id; return data[k] && data[k].data || null; };
        let d = null; try { d = lire(D.documentElement.outerHTML); } catch (e) {}
        if (!d || String(d.gedeon_id) !== id) d = lire(await fetch(url, { credentials: "include" }).then(r => r.text()));
        if (!d) return null;
        const x = d.extras || {}, a = d.address || {}, ci = a.city || {}, cps = [].concat(ci.postcode || []), cpUrl = (path.match(/-(\d{5})\/\d{6,}/) || [])[1];
        const fr = v => v && typeof v === "object" ? v.fr || "" : String(v || ""), tk = Object.keys(x).find(k => /terrain/i.test(k) && num(x[k]) > 0);
        const date = /^20\d\d-\d\d-\d\d/.test(String(x.dpe_date || "")) ? String(x.dpe_date).slice(0, 10) : null;
        const l1 = String(a.line1 || "").replace(/\s+/g, " ").replace(/^(\d+\s*(?:bis|ter)?)\s*,\s*/i, "$1 ").trim(), adresseAgence = /[a-zà-ÿ]{3}/i.test(l1) && l1.length <= 150 ? l1 : null;
        return { site: "lesiteimmo", url, type: d.type === "house" ? "M" : d.type === "apartment" ? "A" : kind(fr(d.title)), price: num(d.price), surface: num(d.surface) || num(x.surface_hab), rooms: num(d.rooms) || num(x.nb_pieces), land: tk ? num(x[tk]) : null, dpe: lab(x.dpe_conso_en_lettre), dpeDate: date, dpeKwh: num(x.dpe_conso_en), dpeGes: num(x.dpe_ges), dpeGesClasse: lab(x.dpe_ges_lettre), coutMin: num(x.dpe_conso_min), coutMax: num(x.dpe_conso_max), lots: num(x.copropriete_nb_lots), etage: num(x.etage), etages: num(x.nb_etages), ascenseur: x.ascenseur === true ? 1 : null, poolChamp: x.piscine === true ? 1 : null, chauffageTexte: x.chauffage || null, clim: x.climatisation === true ? 1 : null, year: num(x.annee_construction), pro: !!d.agency, city: ci.name || null, cp: cps.length === 1 ? cps[0] : cps.includes(cpUrl) ? cpUrl : cps[0] || cpUrl || null, lat: null, lon: null, precM: null, adresseAgence, photos: uniq((d.photos || []).map(p => p && p.url)), title: fr(d.title), publiee: /^20\d\d-/.test(String(d.created_at || "")) ? String(d.created_at).slice(0, 10) : null, desc: fr(d.title) + " " + fr(d.description) };
      }
      return null;
    })();
  } catch (e) { ad = null; }
  /* lecture de secours : n'importe quel site d'annonce */
  try {
    // + la description lue dans les données de la fiche (ad.desc) : après une navigation interne, le texte affiché n'est pas encore celui de la nouvelle annonce (§2.3)
    const txt = (D.title + "\n" + (D.querySelector("h1") || {}).innerText + "\n" + D.body.innerText + (ad && ad.desc ? "\n" + ad.desc : "")).replace(/[ \xa0]/g, " ");
    const g = {};
    /* fiche reconnue par son CONTENU (SPEC robustesse §2) : JSON-LD (annonce, produit, offre), og:type, dataLayer ou __NEXT_DATA__ avec un identifiant d'annonce.
       Avec le prix, la surface et le DPE, la page est lue même si son adresse ne correspond à aucun motif connu. */
    const ld = (() => { try {
      const L = [...D.querySelectorAll('script[type="application/ld+json"]')].map(x => { try { return JSON.parse(x.textContent); } catch (e) { return null; } }).flatMap(x => Array.isArray(x) ? x : x && x["@graph"] ? x["@graph"] : [x]).filter(x => x && typeof x === "object");
      const a = L.find(x => /RealEstateListing|Product|Offer|House|Apartment|Residence|Accommodation/i.test(String(x["@type"] || ""))); if (!a) return null;
      const it = a.itemOffered || a, of = (Array.isArray(a.offers) ? a.offers[0] : a.offers) || {}, adr = it.address || a.address || {};
      return { id: a.sku || a.productID || a.identifier || null, price: num(of.price || a.price), surface: num(it.floorSize && (it.floorSize.value || it.floorSize)), cp: /^\d{5}$/.test(String(adr.postalCode || "")) ? String(adr.postalCode) : null, rooms: num(it.numberOfRooms) };
    } catch (e) { return null; } })();
    const fiche = (() => { try {
      if (ld) return "JSON-LD";
      const og = (D.querySelector('meta[property="og:type"]') || {}).content || ""; if (/product|realestate|listing|annonce/i.test(og)) return "og:type " + og;
      if ((W.dataLayer || []).some(x => x && (x.classified_id || x.ad_id || x.annonce_id || x.list_id || x.listing_id || (x.products && x.products[0] && x.products[0].id) || (x.ecommerce && x.ecommerce.items && x.ecommerce.items[0] && x.ecommerce.items[0].item_id)))) return "dataLayer";
      const nd = D.getElementById("__NEXT_DATA__"); if (nd && /"(?:list_id|adId|classifiedId|annonceId|listingId|ad_id)"\s*:/.test(nd.textContent)) return "__NEXT_DATA__";
      return null; } catch (e) { return null; } })();
    let m = txt.match(/terrain[^0-9\n]{0,40}?(\d[\d .]{1,8}(?:,\d+)?)\s?m(?:²|2)/i) || txt.match(/(\d[\d .]{1,8}(?:,\d+)?)\s?m(?:²|2)\s+(?:de\s+)?(?:terrain|jardin|parcelle)/i);
    if (m) g.land = num(m[1]);
    m = txt.match(/(?<![\w\/])(\d[\d .]{0,6}(?:,\d+)?)\s?m(?:²|2)\s+habitables?/i) || txt.match(/surface\s+habitable[^0-9\n]{0,30}(\d[\d .]{0,6}(?:,\d+)?)\s?m/i) || D.title.match(/(?<![\w\/])(\d[\d .]{0,5}(?:,\d+)?)\s?m(?:²|2)/i); // (?<![\w\/]) : « T5/F5 122 m² » donne 122, pas 5 122
    if (m) g.surface = num(m[1]);
    m = txt.match(/\b([A-G])\s*\n\s*Classe [ÉEée]nergie/) || txt.match(/classe [ée]nergie\s*:?\s*([A-G])\b/i) || txt.match(/\bDPE\s*:?\s*([A-G])\b(?!\s*\n?\s*B\b)/);
    if (m) g.dpe = lab(m[1]);
    /* prix = le plus grand montant en € de la page qui n'est ni au m² ni par mois (la mensualité « 2 769 € » et « 4 467 €/m² » précèdent souvent le prix) */
    { let best = null; for (const x of txt.matchAll(/(\d{1,3}(?:[ .]\d{3}){1,3})\s?€(?!\s*(?:\/|par\s)\s*(?:m|mois))/g)) { const v = num(x[1]); if (v > 10000 && (best == null || v > best)) best = v; } if (best != null) g.price = best; }
    if (ld) { if (ld.price > 0) g.price = ld.price; if (ld.surface > 0) g.surface = ld.surface; } // les données structurées (JSON-LD) priment sur le texte
    /* DPE chiffré (SPEC-secteur-100 §3.10) : kWh/m²/an, kg CO₂/m²/an, date du diagnostic */
    m = txt.match(/(\d{1,4})\s?kWh\s?(?:EP|ep)?\s?\/?\s?m[²2]\s?(?:\/|\.|par)?\s?an/i) || txt.match(/consommation[^0-9\n]{0,30}(\d{1,4})\s?kWh/i);
    if (m) g.dpeKwh = num(m[1]);
    m = txt.match(/(\d{1,3})\s?kg\s?(?:eq\.?\s?)?CO2?\s?\/?\s?m[²2]/i) || txt.match(/[ée]missions?[^0-9\n]{0,30}(\d{1,3})\s?kg/i) || txt.match(/GES[^0-9\n]{0,20}(\d{1,3})\s?kg/i);
    if (m) g.dpeGes = num(m[1]);
    m = txt.match(/(?:DPE|diagnostic|[ée]tabli|r[ée]alis[ée])[^0-9\n]{0,40}?(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})/i);
    if (m) g.dpeDate = m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    /* SPEC-plus-fort §2.1 : fourchette « dépenses annuelles d'énergie estimées entre X € et Y € » (le milieu = coût annuel exact du DPE) */
    m = txt.match(/entre\s+(\d[\d .]{1,8}\d)\s*(?:€|euros?)?\s*(?:\/\s*an|par an)?\s*et\s+(\d[\d .]{1,8}\d)\s*(?:€|euros?)/i);
    if (m) { const a = num(m[1].replace(/[ .]/g, "")), b = num(m[2].replace(/[ .]/g, "")); if (a > 0 && b > a) { g.coutMin = a; g.coutMax = b; } }
    /* SPEC-appartements §3 : nombre de lots (loi ALUR), charges annuelles, procédure, étage, nombre d'étages */
    m = txt.match(/copropri[ée]t[ée][^0-9\n]{0,80}?(\d{1,4})\s+lots?/i) || txt.match(/(\d{1,4})\s+lots?(?:\s+(?:principaux|de copropri[ée]t[ée]|au total))?\b/i);
    if (m) g.lots = num(m[1]);
    m = txt.match(/charges[^0-9\n]{0,40}?(\d[\d .]{1,7})\s*(?:€|euros?)\s*(?:\/\s*an|par an|annuelles?)/i) || txt.match(/charges\s+annuelles[^0-9\n]{0,30}(\d[\d .]{1,7})\s*(?:€|euros?)/i);
    if (m) g.charges = num(m[1].replace(/[ .]/g, ""));
    // « Pas de procédure en cours », « aucune procédure » : une négation n'est jamais une procédure
    if ([...txt.matchAll(/proc[ée]dure\s+(?:en cours|judiciaire|de sauvegarde)|copropri[ée]t[ée][^.\n]{0,40}en difficult/gi)].some(m => !/(?:\bpas\s+de|\baucune?|\bsans|\bni)\s*$/i.test(txt.slice(Math.max(0, m.index - 14), m.index)))) g.procedure = 1;
    m = txt.match(/(?:au|du)\s+(\d{1,2})\s*(?:e|è|eme|ème|er|ere|ère)\s*[ée]tage/i) || txt.match(/\b(\d{1,2})\s*(?:e|è|eme|ème|er|ere|ère)\s*[ée]tage\b/i);
    if (m) g.etage = num(m[1]); else if (/rez[- ]de[- ]chauss[ée]e|\bRDC\b/i.test(txt)) g.etage = 0;
    m = txt.match(/(?:sur|immeuble de|r[ée]sidence de)\s+(\d{1,2})\s*[ée]tages/i) || txt.match(/\d{1,2}\s*(?:e|è|eme|ème|er|ere|ère)\s*(?:[ée]tage)?\s*(?:sur|\/)\s*(\d{1,2})\b/i);
    if (m) g.etages = num(m[1]);
    /* commune : le code postal vient du texte ; le NOM ne vient JAMAIS du texte qui suit le code postal (un lien caché « Navigation überspringen »
       y a été pris pour une commune). background.js le valide avec geo.api.gouv.fr (engine/commune.js) ; villeTexte n'est qu'un indice pour ce choix. */
    m = D.title.match(/([A-ZÀ-Ý][\wÀ-ÿ'’ -]{2,40}?)\s*\((\d{5})\)/) || txt.match(/\b(\d{5})\s+([A-ZÀ-Ý][\wÀ-ÿ'’-]+(?:[ -][A-Za-zÀ-ÿ'’-]+){0,4})/);
    if (m) { if (/^\d/.test(m[1])) { g.cp = m[1]; g.villeTexte = m[2]; } else { g.villeTexte = m[1].replace(/.*\bà\s+/i, "").trim(); g.cp = m[2]; } }
    if (!g.cp && ld && ld.cp) g.cp = ld.cp;
    const og = (D.querySelector('meta[property="og:image"]') || {}).content;
    const imgs = [og].concat([...D.images].filter(i => i.naturalWidth >= 400 && i.naturalHeight >= 250).map(i => i.currentSrc || i.src));
    const lisible = (g.land || g.surface) && g.cp, parContenu = fiche && g.price && g.surface && g.dpe;
    if (!ad && (lisible || parContenu)) ad = { site: location.hostname.replace(/^www\./, ""), url: location.href.split("#")[0], type: kind(D.title) || kind(txt.slice(0, 3000)), price: g.price || null, surface: g.surface || null, land: g.land || null, dpe: g.dpe || null, dpeKwh: g.dpeKwh || null, dpeGes: g.dpeGes || null, dpeDate: g.dpeDate || null, coutMin: g.coutMin || null, coutMax: g.coutMax || null, lots: g.lots || null, charges: g.charges || null, procedure: g.procedure || null, etage: g.etage ?? null, etages: g.etages || null, city: null, villeTexte: g.villeTexte || null, cp: g.cp || null, lat: null, lon: null, precM: null, photos: uniq(imgs), title: D.title, generic: 1, ficheContenu: fiche || null };
    if (ad && ad.generic) ad.desc = D.title + " " + ((D.querySelector('meta[name="description"]') || {}).content || "") + " " + ((D.querySelector("h1") || {}).innerText || "") + " " + [...D.querySelectorAll('[class*="escription"]')].slice(0, 3).map(x => x.innerText).join(" ");
    else if (ad) { ["land", "surface", "dpe", "price", "dpeKwh", "dpeGes", "dpeDate", "coutMin", "coutMax", "lots", "charges", "procedure", "etage", "etages", "cp"].forEach(k => { if (ad[k] == null && g[k] != null) ad[k] = g[k]; }); if (!ad.photos || !ad.photos.length) ad.photos = uniq(imgs); if (fiche) ad.ficheContenu = fiche; }
  } catch (e) {}
  try { if (ad) { const t = String(ad.desc || ""); { /* piscine : même règle que lib/sector/clues.js (piscineTexte). « piscinable », « possibilité de piscine », « terrain pour piscine », « emplacement piscine », « projet de piscine » = pas de piscine */
      const V = "(?:faire|cr[ée]er|construire|installer|implanter|r[ée]aliser|accueillir|recevoir|envisager)", POSS = new RegExp("piscin+ables?|(?:possibilit[ée]s?|projet|potentiel|autorisation|permis)\\s+(?:de\\s+|d['’]\\s*|pour\\s+)?(?:" + V + "\\s+)?(?:une?\\s+|la\\s+)?piscine|possible\\s+(?:de\\s+|d['’]\\s*)?" + V + "\\s+une\\s+piscine|(?:terrain|place|espace|emplacement|id[ée]al|suffisant)\\s+pour\\s+(?:" + V + "\\s+)?(?:une?\\s+|la\\s+)?(?:future\\s+)?piscine|emplacement\\s+(?:de\\s+|pr[ée]vu\\s+pour\\s+)?(?:une\\s+|la\\s+)?(?:future\\s+)?piscine|(?:pouvant|peut|pourra|pourrait)\\s+(?:accueillir|recevoir)\\s+une\\s+piscine|piscine\\s+(?:possible|envisageable|r[ée]alisable|[àa]\\s+(?:cr[ée]er|pr[ée]voir|faire|construire|envisager)|en\\s+projet)", "gi"), SANS = /(?:sans|pas\s+de|aucune)\s+piscine/gi;
      const t1 = t.replace(/[\u00a0\s]+/g, " ").replace(/piscine\s+(?:municipale|publique|intercommunale)|centre\s+aquatique|(?:proche|pr[èe]s)\s+(?:de\s+(?:la\s+)?)?piscine/gi, " "), vraie = /piscine/i.test(t1.replace(POSS, " ").replace(SANS, " ")); POSS.lastIndex = 0; SANS.lastIndex = 0;
      ad.pool = ad.poolChamp === 1 || vraie ? 1 : POSS.test(t1) || SANS.test(t1) ? 0 : null; }
    /* niveaux (RDC compris) : plain-pied = 1, R+1 / un étage / deux niveaux = 2, R+2 / trois niveaux = 3 */
    ad.levels = /\bR\s?\+\s?2\b|trois niveaux|3 niveaux|deux [ée]tages|2 [ée]tages/i.test(t) ? 3 : /\bR\s?\+\s?1\b|un [ée]tage|[àa] [ée]tage|1 [ée]tage|deux niveaux|2 niveaux|sur (?:un|1) [ée]tage/i.test(t) ? 2 : /plain[- ]pied|de plein[- ]pied|un seul niveau|sans [ée]tage/i.test(t) ? 1 : null;
    if (ad.year == null) { const m = t.match(/(?:construit[e]?|b[âa]ti[e]?|[ée]difi[ée]e?|datant|dat[ée]e?)\s+(?:en|de)\s+((?:19|20)\d{2})\b/i) || t.match(/\b(?:maison|villa|construction)\s+(?:de|des ann[ée]es)\s+((?:19|20)\d{2})\b/i); ad.year = m ? +m[1] : null; }
    /* texte de l'annonce gardé (8 000 caractères) pour les indices (J7) : dimensions de la piscine, copropriété, matériaux… Pas de nom ni de téléphone extraits. */
    ad.texte = t.replace(/(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g, " ").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " ").slice(0, 8000);
    delete ad.desc; } } catch (e) {}
  return ad;
})();
  const pick = (o, ks) => { const s = {}; ks.forEach(k => { if (o[k] != null && o[k] !== "") s[k] = o[k]; }); return s; };
  const fin = msg => { if (win) { try { win.document.body.textContent = msg; } catch (e) {} } else alert(msg); };
  if (!ad) return fin("Dossier du bien : cette page ne ressemble pas à une annonce (ouvrez la fiche d'un bien, pas la liste des résultats).");
  const s = pick(ad, ["site", "url", "type", "price", "surface", "rooms", "land", "dpe", "dpeDate", "dpeKwh", "dpeGes", "dpeGesClasse", "coutMin", "coutMax", "lots", "charges", "procedure", "etage", "etages", "levels", "year", "pool", "poolChamp", "chauffageTexte", "exposition", "pro", "city", "cp", "lat", "lon", "precM", "blurType", "publiee", "title"]);
  s.photos = (ad.photos || []).slice(0, 4); s.texte = String(ad.texte || ad.desc || "").slice(0, 1500);
  const b = btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const url = BASE + "#f=" + b;
  if (win) win.location.href = url; else { const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Ouvrir le dossier du bien"; a.setAttribute("style", "position:fixed;top:16px;right:16px;z-index:2147483647;background:#2F44CE;color:#fff;font:700 15px system-ui;padding:12px 16px;border-radius:10px;text-decoration:none"); document.body.appendChild(a); }
})();
