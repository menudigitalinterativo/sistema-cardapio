// =====================
// VARIÁVEIS GLOBAIS
// =====================
let cart = [];
let companyWhatsApp = '';
let themeColor = "#388e3c";
let companyStatus = "Aberto";

// =====================
// TOAST
// =====================
function notify(msg) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 500);
  }, 2000);
}

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', async () => {
  const progressBar = document.getElementById('main-progress-bar');
  if (progressBar) progressBar.style.width = '15%';

  try {
    const response = await fetch('./dados/cardapio.json?v=' + Date.now());
    if (!response.ok) throw new Error('Arquivo não encontrado');

    const res = await response.json();

    if (!res.success) return notify("Erro nos dados do cardápio.");

    const info = res.info;
    const data = res.menu;

    // Dados da empresa
    themeColor = info.siteColor || "#388e3c";
    companyWhatsApp = info.whatsappNumber || '';
    companyStatus = info.status || 'Aberto';

    document.getElementById('company-name').textContent = info.companyName || '';

    if (info.logoUrl) {
      document.getElementById('company-logo').src = info.logoUrl;
      document.getElementById('company-logo').style.display = 'block';
      const loaderLogo = document.getElementById('loader-logo-img');
      if (loaderLogo) {
        loaderLogo.src = info.logoUrl;
        loaderLogo.style.display = 'block';
      }
    }

    // Tema
    const style = document.createElement('style');
    style.textContent = `
      .section-title { border-color: ${themeColor}; color: ${themeColor}; }
      .add-to-cart-btn, #cart-float, .quantity-controls button {
        background-color: ${themeColor} !important;
      }
      .item-name { color: ${themeColor}; }
    `;
    document.head.appendChild(style);

    if (progressBar) {
      progressBar.style.backgroundColor = themeColor;
      progressBar.style.width = '100%';
    }

    renderMenu(data);
    renderFooterHorarios(info);
    setupUI();

    setTimeout(() => {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);
      }
    }, 600);

  } catch (e) {
    console.error(e);
    notify("Erro ao carregar o cardápio.");
  }
});

// =====================
// MENU
// =====================
function renderMenu(data) {
  const content = document.getElementById('menu-content');
  content.innerHTML = '';

  const items = [
    ...(data.optionsItems || []).map(i => ({ ...i, type: 'complex' })),
    ...(data.menuItems || []).map(i => ({ ...i, type: 'simple' }))
  ];

  const cats = {};
  items.forEach(i => {
    const c = i.Categoria || 'Outros';
    if (!cats[c]) cats[c] = [];
    cats[c].push(i);
  });

  Object.keys(cats).sort().forEach(cat => {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = cat;
    content.appendChild(title);
    cats[cat].forEach(item => renderItem(item));
  });
}

function renderItem(item) {
  const content = document.getElementById('menu-content');
  const div = document.createElement('div');
  div.className = 'menu-item';

  const img = item.Imagem || item['URL da Imagem'] || '';

  div.innerHTML = `
    ${img ? `<img src="${img}" class="item-image" loading="lazy">` : ''}
    <div class="item-details">
      <div class="item-header-clickable" onclick="toggle(this, ${item.type === 'complex'})">
        <span class="item-name">${item.Nome}</span>
        ${item.type === 'complex' ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
      </div>
      <div class="item-description">${item.Descrição || ''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="item-price">R$ ${parseFloat(item.Valor).toFixed(2).replace('.', ',')}</span>
        ${item.type === 'simple'
          ? `<button class="add-to-cart-btn" onclick="add(this,'${item.Nome}',${item.Valor},false)">Adicionar</button>`
          : ''}
      </div>
      <div class="options-and-footer-container">
        ${item.type === 'complex' ? renderOptions(item) : ''}
        ${item.type === 'complex'
          ? `<div class="footer-action">
              <button class="add-to-cart-btn" onclick="add(this,'${item.Nome}',${item.Valor},true)">Adicionar</button>
            </div>` : ''}
      </div>
    </div>
  `;
  content.appendChild(div);
}

function renderOptions(item) {
  let h = '';
  for (let k in item) {
    if (item[k]?.items) {
      h += `
        <div class="option-group">
          <h4>${k} (Até ${item[k].limit})</h4>
          ${item[k].items.map(o => `
            <div class="option-list-item">
              <span>${o}</span>
              <div class="quantity-controls">
                <button onclick="qty(this,-1)">-</button>
                <input type="number" value="0" data-opt="${o}" data-limit="${item[k].limit}" readonly>
                <button onclick="qty(this,1)">+</button>
              </div>
            </div>
          `).join('')}
        </div>`;
    }
  }
  return h;
}

// =====================
// INTERAÇÕES
// =====================
function toggle(el, isComplex) {
  if (!isComplex) return;
  const box = el.parentElement.querySelector('.options-and-footer-container');
  const icon = el.querySelector('.toggle-icon');
  const open = box.style.display === 'block';
  box.style.display = open ? 'none' : 'block';
  icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
}

function qty(btn, d) {
  const i = btn.parentElement.querySelector('input');
  const group = i.closest('.option-group').querySelectorAll('input');
  let total = 0;
  group.forEach(g => total += parseInt(g.value));
  if (d > 0 && total < i.dataset.limit) i.value++;
  if (d < 0 && i.value > 0) i.value--;
}

function add(btn, name, price, isComplex) {
  if (companyStatus !== 'Aberto') return notify("Loja Fechada!");

  let opts = [];
  if (isComplex) {
    btn.closest('.options-and-footer-container')
      .querySelectorAll('input')
      .forEach(i => {
        if (i.value > 0) opts.push({ name: i.dataset.opt, qty: i.value });
      });
    if (!opts.length) return notify("Escolha uma opção!");
  }

  const key = name + JSON.stringify(opts);
  const ex = cart.find(c => c.key === key);
  if (ex) ex.qty++;
  else cart.push({ key, name, price, opts, qty: 1 });

  updateUI();
  notify("Adicionado!");
}

// =====================
// CARRINHO
// =====================
function updateUI() {
  const list = document.getElementById('cart-items');
  let total = 0;
  let count = 0;
  list.innerHTML = '';

  cart.forEach((item, idx) => {
    total += item.price * item.qty;
    count += item.qty;
    list.innerHTML += `
      <div style="border-bottom:1px solid #eee;padding:8px 0">
        <b>${item.qty}x ${item.name}</b>
        <span style="float:right">R$ ${(item.price * item.qty).toFixed(2)}</span>
        <div style="font-size:0.85em;color:#777">
          ${item.opts.map(o => `${o.qty}x ${o.name}`).join(', ')}
        </div>
        <button onclick="remove(${idx})" style="color:red;border:none;background:none">Remover</button>
      </div>`;
  });

  document.getElementById('cart-count').textContent = count;
}

function remove(i) {
  if (cart[i].qty > 1) cart[i].qty--;
  else cart.splice(i, 1);
  updateUI();
}

// =====================
// FINALIZAR
// =====================
function finalizarPedido() {
  if (companyStatus !== 'Aberto') return notify("Loja Fechada!");
  if (!cart.length) return notify("Carrinho vazio!");

  const nome = document.getElementById('client-name').value.trim();
  if (!nome) return notify("Informe seu nome");

  let msg = `Olá! Pedido:%0ACliente: ${nome}%0A`;
  let total = 0;

  cart.forEach(i => {
    total += i.price * i.qty;
    msg += `%0A${i.qty}x ${i.name}`;
    i.opts.forEach(o => msg += `%0A• ${o.qty}x ${o.name}`);
  });

  msg += `%0A%0ATotal: R$ ${total.toFixed(2).replace('.', ',')}`;

  window.open(`https://wa.me/${companyWhatsApp}?text=${msg}`, '_blank');
}

// =====================
// UI
// =====================
function setupUI() {
  document.getElementById('cart-float').onclick = () =>
    document.getElementById('cart-modal').style.display = 'block';

  document.getElementById('close-cart').onclick = () =>
    document.getElementById('cart-modal').style.display = 'none';

  document.getElementById('search-input').oninput = e => {
    const v = e.target.value.toLowerCase();
    document.querySelectorAll('.menu-item').forEach(i =>
      i.style.display = i.innerText.toLowerCase().includes(v) ? 'flex' : 'none'
    );
  };
}

// =====================
// FOOTER HORÁRIOS
// =====================
function toggleHorarios() {
  const box = document.getElementById('footer-horarios-box');
  if (!box) return;
  box.classList.toggle('hidden');
}

function renderFooterHorarios(info) {
  if (!info) return;

  document.getElementById('footer-status-label').innerText =
    info.status === 'Aberto' ? '🟢 Aberto agora' : '🔴 Fechado';

  document.getElementById('footer-status-msg').innerText =
    info.statusMsg || '';

  document.getElementById('footer-horarios-box').innerHTML =
    (info.horarios || []).map(h =>
      `<div><strong>${h.dia}:</strong> ${h.intervalos}</div>`
    ).join('');
}

