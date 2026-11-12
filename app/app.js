// CafeTrip prototype: list, filters, map, detail sheet and a simple trip planner.
(function () {
  const cafes = window.CAFES || [];
  const $ = (id) => document.getElementById(id);

  // Cover colour + emoji per main style (placeholder until real photos exist).
  const STYLE_LOOK = {
    'สวน/ธรรมชาติ': ['#7fa37a', '#c9dcb3', '🌿'],
    'วิวภูเขา': ['#6e86a3', '#c7d3df', '⛰️'],
    'ทะเลหมอก': ['#8d9bb0', '#e3e7ee', '🌫️'],
    'วิวทะเล': ['#3f8fb5', '#bfe3ef', '🌊'],
    'มินิมอล': ['#b9ada0', '#ece7df', '🤍'],
    'วินเทจ': ['#c08a5b', '#f0d9bf', '🕰️'],
    'ทุ่งนา': ['#9fae4f', '#e6e8b8', '🌾'],
  };
  const lookFor = (c) => STYLE_LOOK[c.styles[0]] || ['#9a8f84', '#e7e2dc', '☕'];
  const coverStyle = (c) => { const [a, b] = lookFor(c); return `background: linear-gradient(135deg, ${a}, ${b});`; };

  // ---- State ----
  const state = { q: '', province: 'ทั้งหมด', style: 'ทั้งหมด', view: 'list' };
  let trip = [];
  try { trip = JSON.parse(localStorage.getItem('cafetrip.trip') || '[]').filter((id) => cafes.some((c) => c.id === id)); } catch (e) { trip = []; }
  const saveTrip = () => { try { localStorage.setItem('cafetrip.trip', JSON.stringify(trip)); } catch (e) { /* ignore */ } };
  const inTrip = (id) => trip.includes(id);

  // ---- Filters ----
  const uniq = (arr) => Array.from(new Set(arr));
  const provinces = ['ทั้งหมด', ...uniq(cafes.map((c) => c.province))];
  const styles = ['ทั้งหมด', ...uniq(cafes.flatMap((c) => c.styles))];

  function renderChips(el, values, key) {
    el.replaceChildren(...values.map((v) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = v;
      b.setAttribute('aria-pressed', String(state[key] === v));
      b.addEventListener('click', () => { state[key] = v; renderChips(el, values, key); render(); });
      return b;
    }));
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return cafes.filter((c) =>
      (state.province === 'ทั้งหมด' || c.province === state.province) &&
      (state.style === 'ทั้งหมด' || c.styles.includes(state.style)) &&
      (!q || [c.name, c.province, c.area, c.signature, ...c.photoSpots, ...c.styles].join(' ').toLowerCase().includes(q))
    );
  }

  // ---- List ----
  function card(c) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card';
    b.addEventListener('click', () => openDetail(c.id));

    const cover = document.createElement('div');
    cover.className = 'cover'; cover.setAttribute('style', coverStyle(c));
    const emo = document.createElement('span'); emo.className = 'emoji'; emo.textContent = lookFor(c)[2];
    const gold = document.createElement('span'); gold.className = 'gold-badge'; gold.textContent = `☀️ แสงสวย ${c.goldenHour}`;
    cover.append(emo, gold);

    const body = document.createElement('div'); body.className = 'card-body';
    const h = document.createElement('h2'); h.textContent = c.name;
    const w = document.createElement('p'); w.className = 'where'; w.textContent = `${c.area}, ${c.province}`;
    const pills = document.createElement('div'); pills.className = 'pills';
    c.styles.forEach((s) => { const p = document.createElement('span'); p.className = 'pill'; p.textContent = s; pills.append(p); });
    const foot = document.createElement('div'); foot.className = 'card-foot';
    const budget = document.createElement('span'); budget.textContent = `~${c.budget} บาท/คน · ${c.photoSpots.length} มุมถ่ายรูป`;
    foot.append(budget);
    if (inTrip(c.id)) { const t = document.createElement('span'); t.className = 'in-trip'; t.textContent = '✓ ในทริป'; foot.append(t); }
    body.append(h, w, pills, foot);
    b.append(cover, body);
    return b;
  }

  // ---- Map ----
  let map = null, markerLayer = null;
  function renderMap(list) {
    if (!window.L) { $('map').textContent = 'โหลดแผนที่ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ต'; return; }
    if (!map) {
      map = L.map('map', { scrollWheelZoom: false }).setView([13.7, 100.5], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
    }
    markerLayer.clearLayers();
    list.forEach((c) => {
      const div = document.createElement('div');
      const t = document.createElement('strong'); t.textContent = c.name;
      const s = document.createElement('div'); s.textContent = `${c.area}, ${c.province}`;
      const btn = document.createElement('button'); btn.className = 'pop-btn'; btn.type = 'button'; btn.textContent = 'ดูรายละเอียด';
      btn.addEventListener('click', () => openDetail(c.id));
      div.append(t, s, btn);
      L.marker([c.lat, c.lng]).bindPopup(div).addTo(markerLayer);
    });
    setTimeout(() => {
      map.invalidateSize();
      if (list.length) map.fitBounds(L.latLngBounds(list.map((c) => [c.lat, c.lng])).pad(0.2), { maxZoom: 13 });
    }, 0);
  }

  // ---- Render ----
  function render() {
    const list = filtered();
    $('resultCount').textContent = `พบ ${list.length} ร้าน`;
    const lv = $('listView');
    if (list.length) lv.replaceChildren(...list.map(card));
    else { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'ไม่พบร้านที่ตรงกับตัวกรอง ลองเลือก “ทั้งหมด” หรือค้นคำอื่น'; lv.replaceChildren(p); }
    $('listView').hidden = state.view !== 'list';
    $('mapView').hidden = state.view !== 'map';
    if (state.view === 'map') renderMap(list);
    $('tripCount').textContent = trip.length;
  }

  // ---- Sheets ----
  let openSheet = null, lastFocus = null;
  function show(sheet) {
    lastFocus = document.activeElement;
    if (openSheet) openSheet.hidden = true;
    openSheet = sheet; sheet.hidden = false; $('scrim').hidden = false;
    sheet.querySelector('[data-close]').focus();
    $('tripBtn').setAttribute('aria-expanded', String(sheet.id === 'tripPanel'));
  }
  function hide() {
    if (!openSheet) return;
    openSheet.hidden = true; $('scrim').hidden = true; openSheet = null;
    $('tripBtn').setAttribute('aria-expanded', 'false');
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', hide));
  $('scrim').addEventListener('click', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

  const mapsUrl = (c) => `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;

  let currentId = null;
  function openDetail(id) {
    const c = cafes.find((x) => x.id === id); if (!c) return;
    currentId = id;
    $('dCover').setAttribute('style', coverStyle(c));
    $('dCover').replaceChildren(Object.assign(document.createElement('span'), { className: 'emoji', textContent: lookFor(c)[2] }));
    $('dWhere').textContent = `${c.area} · ${c.province}`;
    $('dName').textContent = c.name;
    $('dStyles').replaceChildren(...c.styles.map((s) => Object.assign(document.createElement('span'), { className: 'pill', textContent: s })));
    $('dHours').textContent = `${c.open}–${c.close} น.`;
    $('dClosed').textContent = c.closedDay === 'ไม่มี' ? 'เปิดทุกวัน' : `ทุกวัน${c.closedDay}`;
    $('dBudget').textContent = `~${c.budget} บาท`;
    $('dSig').textContent = c.signature;
    $('dGold').textContent = c.goldenHour;
    $('dQuiet').textContent = c.quietTime;
    $('dSpots').replaceChildren(...c.photoSpots.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
    $('dMaps').href = mapsUrl(c);
    syncAddBtn();
    show($('detail'));
  }
  function syncAddBtn() {
    const b = $('dAdd'); const on = inTrip(currentId);
    b.textContent = on ? '✓ อยู่ในทริปแล้ว (กดเพื่อเอาออก)' : '+ เพิ่มในทริป';
    b.classList.toggle('added', on);
  }
  $('dAdd').addEventListener('click', () => {
    trip = inTrip(currentId) ? trip.filter((x) => x !== currentId) : [...trip, currentId];
    saveTrip(); syncAddBtn(); render();
  });

  // ---- Trip ----
  const startMin = (range) => { const m = /(\d{1,2}):(\d{2})/.exec(range); return m ? +m[1] * 60 + +m[2] : 0; };
  function renderTrip() {
    const items = trip.map((id) => cafes.find((c) => c.id === id)).filter(Boolean)
      .sort((a, b) => startMin(a.goldenHour) - startMin(b.goldenHour));
    const provincesInTrip = uniq(items.map((c) => c.province));
    $('tripList').replaceChildren(...items.map((c) => {
      const li = document.createElement('li');
      const time = document.createElement('span'); time.className = 'time'; time.textContent = c.goldenHour.split('–')[0];
      const info = document.createElement('div');
      const n = document.createElement('div'); n.className = 't-name'; n.textContent = c.name;
      const s = document.createElement('div'); s.className = 't-sub'; s.textContent = `${c.area}, ${c.province} · แสงสวย ${c.goldenHour}`;
      info.append(n, s);
      if (c.closedDay !== 'ไม่มี') { const w = document.createElement('div'); w.className = 'warn'; w.textContent = `ปิดวัน${c.closedDay}`; info.append(w); }
      const rm = document.createElement('button'); rm.className = 'remove'; rm.type = 'button'; rm.setAttribute('aria-label', `เอา ${c.name} ออก`); rm.textContent = '×';
      rm.addEventListener('click', () => { trip = trip.filter((x) => x !== c.id); saveTrip(); renderTrip(); render(); });
      li.append(time, info, rm);
      return li;
    }));
    $('tripEmpty').hidden = items.length > 0;
    $('tripHint').textContent = provincesInTrip.length > 1
      ? `เรียงตามเวลาแสงสวย · ร้านอยู่ ${provincesInTrip.length} จังหวัด (${provincesInTrip.join(', ')}) อาจต้องแบ่งเป็นหลายวัน`
      : 'เรียงตามเวลาแสงสวยของแต่ละร้าน';
    const route = $('tripRoute');
    route.hidden = items.length < 1;
    if (items.length) {
      const pts = items.map((c) => `${c.lat},${c.lng}`);
      const dest = pts[pts.length - 1];
      const way = pts.slice(0, -1).join('|');
      route.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}` + (way ? `&waypoints=${encodeURIComponent(way)}` : '');
    }
    $('tripClear').hidden = items.length < 1;
  }
  $('tripBtn').addEventListener('click', () => { renderTrip(); show($('tripPanel')); });
  $('tripClear').addEventListener('click', () => { trip = []; saveTrip(); renderTrip(); render(); });

  // ---- Controls ----
  $('q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
  function setView(v) {
    state.view = v;
    $('tabList').setAttribute('aria-selected', String(v === 'list'));
    $('tabMap').setAttribute('aria-selected', String(v === 'map'));
    render();
  }
  $('tabList').addEventListener('click', () => setView('list'));
  $('tabMap').addEventListener('click', () => setView('map'));

  renderChips($('provinceChips'), provinces, 'province');
  renderChips($('styleChips'), styles, 'style');
  render();
})();
