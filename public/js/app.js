const state = {
  world: null,
  user: null,
  catalog: null,
  events: [],
  proposals: [],
  posts: [],
};

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3200);
}

function meterHtml(label, value, max = 100) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `<div class="meter"><label><span>${label}</span><span>${value}</span></label><div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

function renderWorld() {
  const w = state.world;
  if (!w) return;
  const s = w.state;
  document.getElementById('turn-tag').textContent = `Turno ${s.turn || 1}`;
  document.getElementById('top-stats').innerHTML = [
    `Energía ${s.resources.energia}`,
    `Alimentos ${s.resources.alimentos}`,
    `Confianza ${s.indicators.confianza_social}`,
  ]
    .map((t) => `<span class="pill">${t}</span>`)
    .join('');

  document.getElementById('resources').innerHTML = Object.entries(s.resources)
    .map(([k, v]) => meterHtml(k, v, 200))
    .join('');
  document.getElementById('indicators').innerHTML = Object.entries(s.indicators)
    .map(([k, v]) => meterHtml(k.replace(/_/g, ' '), v))
    .join('');
  document.getElementById('mystery').innerHTML = `
    <p><strong>Interpretación:</strong> ${s.mystery.interpretation}</p>
    <p>Evidencia acumulada: ${s.mystery.evidence}/100</p>
    <p>${(s.mystery.notes || []).slice(-2).join(' · ')}</p>`;
  IsoMap.setState(s);
}

function renderEvents() {
  const el = document.getElementById('tab-events');
  el.innerHTML = state.events
    .map(
      (e) => `
    <article class="item">
      <div class="kind">${e.kind}</div>
      <h4>${e.title}</h4>
      <p>${e.body}</p>
      <div class="row">
        ${(e.payload?.suggestedActions || [])
          .map(
            (a) =>
              `<button class="btn small" data-propose="${a}" ${state.user ? '' : 'disabled'}>Proponer: ${a}</button>`
          )
          .join('')}
      </div>
    </article>`
    )
    .join('');
  el.querySelectorAll('[data-propose]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await API.createProposal({
          actionKey: btn.getAttribute('data-propose'),
          eventId: null,
          body: 'Propuesta desde acontecimiento',
        });
        toast('Propuesta creada (−2 CBN)');
        await refresh();
        document.querySelector('[data-tab="proposals"]').click();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

function renderProposals() {
  const el = document.getElementById('tab-proposals');
  el.innerHTML =
    state.proposals
      .map(
        (p) => `
    <article class="item">
      <div class="kind">${p.status} · ${p.actionKey}</div>
      <h4>${p.title}</h4>
      <p>${p.body || ''}</p>
      <p>A favor: ${p.votesFor} · En contra: ${p.votesAgainst}</p>
      <div class="row">
        <button class="btn small" data-vote="${p.id}" data-v="1" ${state.user && p.status === 'open' ? '' : 'disabled'}>A favor</button>
        <button class="btn small" data-vote="${p.id}" data-v="-1" ${state.user && p.status === 'open' ? '' : 'disabled'}>En contra</button>
        <button class="btn small primary" data-resolve="${p.id}" ${state.user && p.status === 'open' ? '' : 'disabled'}>Resolver</button>
      </div>
    </article>`
      )
      .join('') || '<p class="fine">No hay propuestas aún.</p>';

  el.querySelectorAll('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await API.vote(btn.getAttribute('data-vote'), Number(btn.getAttribute('data-v')));
        toast('Voto registrado (+1 CBN)');
        await refresh();
      } catch (err) {
        toast(err.message);
      }
    });
  });
  el.querySelectorAll('[data-resolve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const r = await API.resolve(btn.getAttribute('data-resolve'));
        toast(r.approved ? (r.riskHit ? 'Aprobada con riesgo' : 'Aprobada') : 'Rechazada');
        await refresh();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

function renderSocial() {
  const el = document.getElementById('tab-social');
  el.innerHTML =
    state.posts
      .map(
        (p) => `
    <article class="item">
      <h4>${p.title}</h4>
      <p>${p.body}</p>
      <div class="row">
        <input placeholder="Comentar…" data-cinput="${p.id}" ${state.user ? '' : 'disabled'} />
        <button class="btn small" data-comment="${p.id}" ${state.user ? '' : 'disabled'}>Enviar</button>
      </div>
    </article>`
      )
      .join('') || '<p class="fine">Sin publicaciones.</p>';
  el.querySelectorAll('[data-comment]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-comment');
      const input = el.querySelector(`[data-cinput="${id}"]`);
      try {
        await API.comment(id, input.value);
        input.value = '';
        toast('Comentario publicado');
        await refresh();
      } catch (err) {
        toast(err.message);
      }
    });
  });
}

async function renderCbn() {
  const el = document.getElementById('tab-cbn');
  if (!state.user) {
    el.innerHTML = '<p class="fine">Entra para ver tu saldo CBN (unidad interna del juego, no dinero real).</p>';
    return;
  }
  try {
    const data = await API.cbn();
    el.innerHTML = `
      <p><strong>Saldo:</strong> ${data.balance} CBN</p>
      <ul>${data.ledger
        .map((l) => `<li>${l.created_at?.slice(0, 19) || ''} · ${l.delta > 0 ? '+' : ''}${l.delta} · ${l.reason}</li>`)
        .join('')}</ul>`;
  } catch (e) {
    el.innerHTML = `<p class="fine">${e.message}</p>`;
  }
}

function renderUser() {
  const box = document.getElementById('user-box');
  if (!state.user) {
    box.innerHTML = `<button type="button" class="btn small" id="btn-auth-open">Entrar / Registro</button>`;
    document.getElementById('btn-auth-open')?.addEventListener('click', () => {
      document.getElementById('modal-auth').classList.remove('hidden');
    });
    return;
  }
  box.innerHTML = `<span class="pill">${state.user.displayName} · ${state.user.community} · ${state.user.cbn} CBN</span>
    <button type="button" class="btn small" id="btn-logout">Salir</button>`;
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    API.setToken('');
    state.user = null;
    renderUser();
  });
}

async function refresh() {
  const [world, events, proposals, posts] = await Promise.all([
    API.world(),
    API.events(),
    API.proposals(),
    API.posts(),
  ]);
  state.world = world;
  state.events = events.events || [];
  state.proposals = proposals.proposals || [];
  state.posts = posts.posts || [];
  if (API.token) {
    try {
      state.user = (await API.me()).user;
    } catch {
      API.setToken('');
      state.user = null;
    }
  }
  renderWorld();
  renderEvents();
  renderProposals();
  renderSocial();
  renderCbn();
  renderUser();
}

function enterApp() {
  window.MutatioIntro?.skip();
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  IsoMap.init();
  refresh().catch((e) => toast(e.message));
}

document.getElementById('btn-enter')?.addEventListener('click', enterApp);
document.getElementById('btn-skip')?.addEventListener('click', enterApp);

document.querySelectorAll('.feed .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.feed .tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'cbn') renderCbn();
  });
});

document.getElementById('auth-close')?.addEventListener('click', () => {
  document.getElementById('modal-auth').classList.add('hidden');
});
document.querySelectorAll('[data-auth]').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('[data-auth]').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    const reg = t.dataset.auth === 'register';
    document.getElementById('form-login').classList.toggle('hidden', reg);
    document.getElementById('form-register').classList.toggle('hidden', !reg);
  });
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await API.login({ username: fd.get('username'), password: fd.get('password') });
    API.setToken(data.token);
    state.user = data.user;
    document.getElementById('modal-auth').classList.add('hidden');
    toast('Sesión iniciada');
    await refresh();
  } catch (err) {
    toast(err.message);
  }
});

document.getElementById('form-register')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await API.register({
      username: fd.get('username'),
      password: fd.get('password'),
      displayName: fd.get('displayName'),
      community: fd.get('community'),
    });
    API.setToken(data.token);
    state.user = data.user;
    document.getElementById('modal-auth').classList.add('hidden');
    toast('Identidad creada · 100 CBN iniciales');
    await refresh();
  } catch (err) {
    toast(err.message);
  }
});

// deep link ?event=
if (location.search.includes('skip=1')) enterApp();
