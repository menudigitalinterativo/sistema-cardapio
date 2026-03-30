let cart = [];
let companyWhatsApp = '';
let themeColor = "#388e3c";
let companyStatus = "Aberto";
let companyName = "";

function notify(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { 
    t.style.opacity = '0'; 
    setTimeout(() => t.remove(), 500); 
  }, 2000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const progressBar = document.getElementById('main-progress-bar');
  if (progressBar) progressBar.style.width = '15%';

  try {
    // Busca o JSON gerado pelo seu Google Script no GitHub
    const response = await fetch('./dados/cardapio.json?v=' + Date.now());
    if (!response.ok) throw new Error('Arquivo não encontrado');

    const res = await response.json();

    if (res.success || res.info) {
      const info = res.info;
      const data = res.menu;
      const fretes = res.fretes || [];

      // Configurações globais
      themeColor = info.siteColor || "#388e3c";
      companyWhatsApp = info.whatsappNumber || '';
      companyStatus = info.status || 'Aberto';
      companyName = info.companyName || 'Menu Digital';

      document.getElementById('company-name').textContent = companyName;

      if (info.logoUrl) {
        const logoImg = document.getElementById('company-logo');
        logoImg.src = info.logoUrl;
        logoImg.style.display = 'block';
      }

      // Aplica a cor do tema dinamicamente
      const style = document.createElement('style');
      style.textContent = `
        .section-title { border-color: ${themeColor}; color: ${themeColor}; }
        .add-to-cart-btn, #cart-float, .quantity-controls button { background-color: ${themeColor} !important; }
        .item-name { color: ${themeColor}; }
      `;
      document.head.appendChild(style);

      if (progressBar) {
        progressBar.style.backgroundColor = themeColor;
        progressBar.style.width = '100%';
        setTimeout(() => document.getElementById('loading-overlay').style.display = 'none', 500);
      }

      // Renderiza o Menu e os Bairros
      renderMenu(data);
      if (fretes.length > 0) carregarBairros(fretes);

    } else {
      notify("Erro ao processar dados do cardápio");
    }
  } catch (err) {
    console.error(err);
    notify("Erro ao carregar cardápio");
  }

  setupUI();
});

function renderMenu(data) {
  const content = document.getElementById('menu-content');
  content.innerHTML = '';

  let items = [
    ...(data.optionsItems || []).map(i => ({...i, type:'complex'})),
    ...(data.menuItems || []).map(i => ({...i, type:'simple'}))
  ];

  let cats = {};
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

  const img = item['Imagem'] || item['URL da Imagem'];
  const preco = parseFloat(item.Valor || 0);

  div.innerHTML = `
    ${img ? `<img src="${img}" class="item-image">` : ''}
    <div class="item-details">
      <div class="item-header-clickable">
        <span class="item-name">${item.Nome}</span>
      </div>
      <div class="item-description">${item.Descrição || ''}</div>
      <span class="item-price">R$ ${preco.toFixed(2).replace('.', ',')}</span>
      <button class="add-to-cart-btn" onclick="add(this, '${item.Nome}', ${preco}, ${item.type === 'complex'})">
        Adicionar
      </button>
      <div class="options-and-footer-container">
        ${item.type === 'complex' ? renderOptions(item) : ''}
      </div>
    </div>
  `;
  content.appendChild(div);
}

function carregarBairros(listaFretes) {
  const select = document.getElementById('select-bairro');
  if (!select) return;
  
  // Limpa opções existentes exceto a primeira
  select.innerHTML = '<option value="">Selecione seu bairro...</option>';

  listaFretes.forEach(item => {
    let opt = document.createElement('option');
    opt.value = item.taxa;
    opt.textContent = `${item.bairro} - R$ ${parseFloat(item.taxa).toFixed(2).replace('.', ',')}`;
    select.appendChild(opt);
  });
}

function add(btn, name, price, isComplex) {
  if (companyStatus !== 'Aberto') return notify("Loja fechada no momento!");

  let opts = [];
  if (isComplex) {
    const container = btn.closest('.item-details').querySelector('.options-and-footer-container');
    container.style.display = 'block'; // Mostra opções se for complexo
    
    container.querySelectorAll('input').forEach(i => {
      if (parseInt(i.value) > 0)
        opts.push({name: i.dataset.opt, qty: i.value});
    });

    if (!opts.length) return notify("Escolha as opções antes de adicionar");
  }

  const key = name + JSON.stringify(opts);
  const ex = cart.find(c => c.key === key);

  if (ex) ex.qty++;
  else cart.push({key, name, price, opts, qty: 1});

  updateUI();
  notify("Adicionado à sacola!");
}

function updateUI() {
  const list = document.getElementById('cart-items');
  let subtotal = 0, count = 0;
  list.innerHTML = '';

  cart.forEach((item, idx) => {
    const totalItem = item.price * item.qty;
    subtotal += totalItem;
    count += item.qty;

    list.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
        <div>
          <strong>${item.qty}x ${item.name}</strong><br>
          <small>${item.opts.map(o => o.name).join(', ')}</small>
        </div>
        <div style="text-align:right">
          <span>R$ ${totalItem.toFixed(2)}</span><br>
          <button onclick="remove(${idx})" style="color:red; border:none; background:none; cursor:pointer; font-size:0.8em;">Remover</button>
        </div>
      </div>
    `;
  });

  window.totalCarrinho = subtotal; 
  document.getElementById('cart-count').textContent = count;
  
  // Atualiza o resumo de valores se o select de bairro existir
  if (document.getElementById('select-bairro')) {
    atualizarTotalComFrete();
  }
}

function atualizarTotalComFrete() {
  const select = document.getElementById('select-bairro');
  const taxa = parseFloat(select.value) || 0;
  const subtotal = window.totalCarrinho || 0;
  const total = subtotal + taxa;

  document.getElementById('subtotal-carrinho').innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('taxa-entrega-display').innerText = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
  document.getElementById('total-geral').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function remove(i) {
  if (cart[i].qty > 1) cart[i].qty--;
  else cart.splice(i, 1);
  updateUI();
}

function finalizarPedido() {
  const nome = document.getElementById('client-name').value.trim();
  const selectBairro = document.getElementById('select-bairro');
  const taxaEntrega = parseFloat(selectBairro.value) || 0;
  const bairroTexto = selectBairro.options[selectBairro.selectedIndex].text;

  if (companyStatus !== 'Aberto') return notify("Loja Fechada!");
  if (!cart.length) return notify("Seu carrinho está vazio!");
  if (!nome) return notify("Por favor, informe seu nome.");
  if (selectBairro.options.length > 1 && !selectBairro.value) return notify("Selecione o bairro para entrega.");

  let msg = `*Novo Pedido - ${companyName}*%0A`;
  msg += `*Cliente:* ${nome}%0A`;
  msg += `*Entrega:* ${bairroTexto}%0A`;
  msg += `--------------------------%0A`;

  cart.forEach(item => {
    msg += `%0A*${item.qty}x ${item.name}*%0A`;
    if (item.opts.length > 0) {
       msg += item.opts.map(o => `• ${o.qty}x ${o.name}`).join('%0A') + '%0A';
    }
    msg += `Subtotal: R$ ${(item.price * item.qty).toFixed(2).replace('.', ',')}%0A`;
  });

  const totalFinal = (window.totalCarrinho || 0) + taxaEntrega;
  msg += `%0A--------------------------%0A`;
  msg += `*Subtotal:* R$ ${window.totalCarrinho.toFixed(2).replace('.', ',')}%0A`;
  msg += `*Taxa de Entrega:* R$ ${taxaEntrega.toFixed(2).replace('.', ',')}%0A`;
  msg += `*TOTAL: R$ ${totalFinal.toFixed(2).replace('.', ',')}*`;

  if (!companyWhatsApp) return notify("Erro: WhatsApp não configurado.");
  
  const fone = companyWhatsApp.replace(/\D/g, '');
  window.open(`https://wa.me/${fone}?text=${msg}`, '_blank');
  
  // Limpeza pós-pedido
  cart = [];
  document.getElementById('client-name').value = '';
  selectBairro.selectedIndex = 0;
  updateUI();
  document.getElementById('cart-modal').style.display = 'none';
}

function setupUI() {
  const modal = document.getElementById('cart-modal');
  document.getElementById('cart-float').onclick = () => {
    modal.style.display = 'block';
    updateUI(); // Garante que o total esteja atualizado ao abrir
  };
  document.getElementById('close-cart').onclick = () => modal.style.display = 'none';
}

// Funções de auxiliares de renderização de opções (mantenha as suas originais)
function renderOptions(item) {
  let h = '';
  for (let k in item) {
    if (item[k]?.items) {
      h += `<div class="option-group">
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

function qty(btn, d) {
  const input = btn.parentElement.querySelector('input');
  const limit = parseInt(input.dataset.limit);
  const group = btn.closest('.option-group');
  
  const totalNoGrupo = Array.from(group.querySelectorAll('input'))
    .reduce((acc, i) => acc + parseInt(i.value), 0);

  let cur = parseInt(input.value);
  if (d > 0 && totalNoGrupo >= limit) return notify("Limite atingido!");
  
  input.value = Math.max(0, cur + d);
}
