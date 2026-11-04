// "Order this design" button, added to a modeler's page by the gate when the
// phone is in craft-show mode (functions/_middleware.js). Plain script, no
// build step, lives in a shadow root so the modeler's CSS cannot touch it.
(function () {
  if (window.__vmShowOverlay) return;
  window.__vmShowOverlay = true;
  var script = document.currentScript;
  var modelerId = (script && script.dataset.modeler) || (location.pathname.match(/^\/m\/([^/]+)/) || [])[1];
  if (!modelerId) return;

  fetch('/api/show', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (show) {
      if (!show || !show.enabled) return;
      var tile = (show.tiles || []).filter(function (t) { return t.id === modelerId; })[0];
      if (tile) mount(show, tile);
    })
    .catch(function () {});

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:Inter,"Segoe UI",system-ui,-apple-system,sans-serif}',
    '.bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 16px)}',
    '.fab{display:flex;align-items:center;gap:8px;padding:13px 18px;border-radius:999px;border:0;background:#e5392f;color:#fff;font-weight:700;font-size:16px;box-shadow:0 8px 24px rgba(0,0,0,.45);cursor:pointer;white-space:nowrap}',
    '.fab small{font-weight:600;opacity:.9}',
    '.back{display:flex;align-items:center;padding:13px 14px;border-radius:999px;background:rgba(21,23,27,.92);color:#e8eaee;border:1px solid #2b2f37;font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.45)}',
    '.dim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483001}',
    '.sheet{position:fixed;left:0;right:0;bottom:0;z-index:2147483002;max-height:92vh;overflow:auto;background:#1d2026;color:#e8eaee;border-radius:18px 18px 0 0;padding:18px 18px 28px;border-top:1px solid #2b2f37;font-size:15px;line-height:1.45}',
    '@media(min-width:720px){.sheet{left:auto;right:16px;bottom:16px;width:420px;border-radius:18px;border:1px solid #2b2f37}}',
    'h2{margin:0 0 4px;font-size:20px;font-family:Sora,"Segoe UI",system-ui,sans-serif}',
    '.muted{color:#9aa0ab;font-size:13.5px;margin:0 0 12px}',
    'label{display:block;margin:12px 0 0;font-weight:600;font-size:14px}',
    'input[type=text],input[type=tel],textarea,select{width:100%;margin-top:5px;padding:11px 12px;border-radius:10px;border:1px solid #2b2f37;background:#15171b;color:#e8eaee;font-size:16px}',
    'textarea{min-height:76px;resize:vertical}',
    '.opts{display:grid;gap:8px;margin-top:6px}',
    '.opt{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid #2b2f37;border-radius:10px;background:#15171b;cursor:pointer;margin:0;font-weight:500}',
    '.opt input{accent-color:#e5392f;width:18px;height:18px;margin:0}',
    '.opt.on{border-color:#e5392f}',
    '.opt b{margin-left:auto;font-variant-numeric:tabular-nums}',
    '.qty{display:flex;align-items:center;gap:0;margin-top:5px}.qty button{width:44px;height:44px;border:1px solid #2b2f37;background:#15171b;color:#e8eaee;font-size:20px;border-radius:10px;cursor:pointer}.qty span{min-width:40px;text-align:center;font-weight:700;font-size:17px}',
    '.total{display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px;font-size:17px;font-weight:700}',
    '.btn{display:block;width:100%;padding:14px;border-radius:12px;border:0;background:#e5392f;color:#fff;font-weight:700;font-size:17px;cursor:pointer;text-align:center;text-decoration:none}',
    '.btn[disabled]{opacity:.6}',
    '.ghost{width:100%;margin-top:8px;padding:12px;border-radius:12px;border:1px solid #2b2f37;background:transparent;color:#e8eaee;font-weight:600;font-size:15px;cursor:pointer}',
    '.err{color:#f3b43a;font-size:14px;margin-top:8px}',
    '.done{text-align:center;padding:10px 0}',
    '.num{font-family:Sora,"Segoe UI",system-ui,sans-serif;font-size:44px;font-weight:700;letter-spacing:.02em;margin:8px 0;color:#4fc07a}',
    '.shot{display:block;width:100%;max-height:180px;object-fit:contain;border-radius:10px;background:#15171b;margin:10px 0;border:1px solid #2b2f37}',
    '.x{position:absolute;right:12px;top:10px;background:none;border:0;color:#9aa0ab;font-size:26px;cursor:pointer;line-height:1}',
  ].join('');

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  var money = function (n, cur) { return '$' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0) + ' ' + cur; };

  // The 3D preview, as a small JPEG. Works when the canvas still holds the
  // last frame; if we only get a blank picture, the order goes without one.
  function snapshot() {
    var best = null, area = 0;
    document.querySelectorAll('canvas').forEach(function (c) {
      var a = c.clientWidth * c.clientHeight;
      if (a > area && c.clientWidth > 50) { area = a; best = c; }
    });
    if (!best) return '';
    try {
      var scale = Math.min(1, 640 / Math.max(1, best.width));
      var out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(best.width * scale));
      out.height = Math.max(1, Math.round(best.height * scale));
      var ctx = out.getContext('2d');
      ctx.fillStyle = '#1b1d22';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(best, 0, 0, out.width, out.height);
      var px = ctx.getImageData(0, 0, out.width, out.height).data;
      var first = [px[0], px[1], px[2]], varied = false;
      for (var i = 0; i < px.length; i += 4 * 97) {
        if (Math.abs(px[i] - first[0]) + Math.abs(px[i + 1] - first[1]) + Math.abs(px[i + 2] - first[2]) > 24) { varied = true; break; }
      }
      if (!varied) return '';
      return out.toDataURL('image/jpeg', 0.8);
    } catch (e) { return ''; }
  }
  function snapshotAsync(cb) {
    // Ask the app to redraw, read the canvas right away (same task, buffer
    // still there) and, if that was blank, once more right after its next frame.
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    var shot = snapshot();
    if (shot) return cb(shot);
    requestAnimationFrame(function () { cb(snapshot()); });
  }
  function settingsSnapshot() {
    var out = {}, size = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), v = localStorage.getItem(k) || '';
        if (v.length > 60000 || size + v.length > 180000) continue;
        out[k] = v; size += v.length;
      }
    } catch (e) {}
    try { if (typeof window.__valenciaState === 'function') out.__state = window.__valenciaState(); } catch (e) {}
    return out;
  }

  function mount(show, tile) {
    var host = el('div');
    host.setAttribute('data-vm-show', '');
    var root = host.attachShadow({ mode: 'open' });
    root.appendChild(el('style', { text: CSS }));
    var cur = show.currency || 'CAD';
    var lowest = Math.min.apply(null, tile.prices.map(function (p) { return p.cad; }));
    var fab = el('button', { class: 'fab', type: 'button', onclick: open, html: 'Order this design <small>· from ' + money(lowest, cur) + '</small>' });
    var back = el('a', { class: 'back', href: '/show/', text: '‹ All', title: 'All designs' });
    var bar = el('div', { class: 'bar' }, [back, fab]);
    root.appendChild(bar);
    document.body.appendChild(host);

    var state = { priceIndex: 0, qty: 1 };
    var dim, sheet;
    function close() { if (dim) dim.remove(); if (sheet) sheet.remove(); dim = sheet = null; bar.style.display = ''; }
    function open() {
      bar.style.display = 'none';
      dim = el('div', { class: 'dim', onclick: close });
      sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Order this design' });
      root.appendChild(dim); root.appendChild(sheet);
      renderForm();
    }
    function renderForm(err) {
      sheet.innerHTML = '';
      var opts = el('div', { class: 'opts' });
      tile.prices.forEach(function (p, i) {
        var radio = el('input', { type: 'radio', name: 'price' });
        radio.checked = i === state.priceIndex;
        var o = el('label', { class: 'opt' + (i === state.priceIndex ? ' on' : '') }, [radio, el('span', { text: p.label }), el('b', { text: money(p.cad, cur) })]);
        o.addEventListener('click', function () { if (state.priceIndex !== i) { state.priceIndex = i; renderForm(); } });
        opts.appendChild(o);
      });
      var total = function () { return money(tile.prices[state.priceIndex].cad * state.qty, cur); };
      var qtyLabel = el('span', { text: String(state.qty) });
      var totalEl = el('b', { text: total() });
      var qty = el('div', { class: 'qty' }, [
        el('button', { type: 'button', 'aria-label': 'fewer', text: '−', onclick: function () { state.qty = Math.max(1, state.qty - 1); qtyLabel.textContent = state.qty; totalEl.textContent = total(); } }),
        qtyLabel,
        el('button', { type: 'button', 'aria-label': 'more', text: '+', onclick: function () { state.qty = Math.min(20, state.qty + 1); qtyLabel.textContent = state.qty; totalEl.textContent = total(); } }),
      ]);
      var name = el('input', { type: 'text', autocomplete: 'name', placeholder: 'Your name', maxlength: '80' });
      var contact = el('input', { type: 'tel', autocomplete: 'tel', placeholder: 'Phone or email', maxlength: '120' });
      var fulfil = el('select', {}, [el('option', { value: 'pickup', text: 'Pick up at the booth / local pickup' }), el('option', { value: 'ship', text: 'Ship it to me (shipping extra)' })]);
      var notes = el('textarea', { placeholder: tile.hint || 'Names, colours, font…', maxlength: '1000' });
      name.value = state.customer || ''; contact.value = state.contact || ''; notes.value = state.notes || ''; fulfil.value = state.fulfil || 'pickup';
      var keep = function () { state.customer = name.value; state.contact = contact.value; state.notes = notes.value; state.fulfil = fulfil.value; };
      [name, contact, notes, fulfil].forEach(function (f) { f.addEventListener('input', keep); f.addEventListener('change', keep); });
      var submit = el('button', { class: 'btn', type: 'button', text: 'Place order' });
      submit.addEventListener('click', function () {
        keep();
        if (!name.value.trim()) return renderForm('Please type your name.');
        if (contact.value.trim().length < 5) return renderForm('Please leave a phone number or email.');
        submit.disabled = true; submit.textContent = 'Saving…';
        snapshotAsync(function (shot) {
          fetch('/api/orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modeler: tile.id, priceIndex: state.priceIndex, qty: state.qty,
              customer: name.value, contact: contact.value, fulfil: fulfil.value, notes: notes.value,
              pageUrl: location.pathname + location.search + location.hash,
              settings: settingsSnapshot(), screenshot: shot,
            }),
          }).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
            .then(function (res) {
              if (!res.body || !res.body.ok) return renderForm((res.body && res.body.error) || 'Could not save the order. Please show your screen at the booth.');
              renderDone(res.body, shot);
            })
            .catch(function () { renderForm('No connection. Please show your screen at the booth and we will write it down.'); });
        });
      });
      [
        el('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '×', onclick: close }),
        el('h2', { text: 'Order: ' + tile.name }),
        el('p', { class: 'muted', text: 'Set the design the way you like it first. What you see in the preview is what we print.' }),
        el('label', { text: 'Option' }), opts,
        el('label', { text: 'How many' }, [qty]),
        el('label', { text: 'Your name' }, [name]),
        el('label', { text: 'Phone or email' }, [contact]),
        el('label', { text: 'Pickup or shipping' }, [fulfil]),
        el('label', { text: 'Notes (the names, colours, font you chose)' }, [notes]),
        err ? el('div', { class: 'err', text: err }) : null,
        el('div', { class: 'total' }, [el('span', { text: 'Total' }), totalEl]),
        submit,
        el('p', { class: 'muted', text: show.turnaround || '' }),
      ].forEach(function (c) { if (c) sheet.appendChild(c); });
      sheet.scrollTop = 0;
    }
    function renderDone(res, shot) {
      sheet.innerHTML = '';
      [
        el('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '×', onclick: close }),
        el('div', { class: 'done' }, [
          el('h2', { text: 'Order saved!' }),
          el('div', { class: 'num', text: res.number }),
          el('p', { text: tile.name + ' · ' + tile.prices[state.priceIndex].label + ' × ' + state.qty + ' · ' + money(res.total_cad, res.currency || cur) }),
          shot ? el('img', { class: 'shot', src: shot, alt: 'Your design' }) : null,
          el('p', { class: 'muted', text: res.payNote || 'Show this number at the booth to pay.' }),
          el('p', { class: 'muted', text: res.turnaround || '' }),
        ]),
        el('a', { class: 'btn', href: '/show/', text: 'Design another one' }),
        el('button', { class: 'ghost', type: 'button', text: 'Back to this design', onclick: close }),
      ].forEach(function (c) { if (c) sheet.appendChild(c); });
    }
  }
})();
