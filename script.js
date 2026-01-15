/* ===== VARIÁVEIS GLOBAIS ===== */
let cart = [];
let companyWhatsApp = '';
let themeColor = "#388e3c";
let companyStatus = "Aberto";

/* ===== FUNÇÃO DE INICIALIZAÇÃO MESTRE ===== */
async function iniciarCardapio(urlJson) {
  const progressBar = document.getElementById('main-progress-bar');
  if (progressBar) progressBar.style.width = '15%';

  try {
    // Busca os dados dinâmicos do cliente
    const response = await fetch(urlJson + '?v=' + Date.now());
    if (!response.ok) throw new Error('Falha ao carregar dados do cliente');
    const res = await response.json();

    if (res.success) {
      const info = res.info;
      const data = res.menu;

      // 1. Configurações de Identidade
      themeColor = info.siteColor || "#388e3c";
      companyWhatsApp = info.whatsappNumber || '';
      companyStatus = info.status || 'Aberto';
      
      // 2. APLICA A COR DINÂMICA NO CSS (Variável Global)
      document.documentElement.style.setProperty('--primary-color', themeColor);
      
      // 3. Preenche textos e Logo
      document.getElementById('company-name').textContent = info.companyName;
      document.title = info.companyName;
      
      if (info.logoUrl) {
        document.getElementById('company-logo').src = info.logoUrl;
        document.getElementById('company-logo').style.display = 'block';
        const loaderImg = document.getElementById('loader-logo-img');
        if (loaderImg) {
          loaderImg.src = info.logoUrl;
          loaderImg.style.display = 'block';
        }
      }

      // 4. Renderiza o Cardápio
      renderMenu(data);
      
      // Finaliza carregamento visual
      if (progressBar) {
        progressBar.style.backgroundColor = themeColor;
        progressBar.style.width = '100%';
      }
      setTimeout(finalizarCarregamento, 600);

    } else {
      notify("Erro: Dados incompletos.");
    }
  } catch (err) {
    console.error("Erro no Motor Mestre:", err);
    notify("Sem conexão com o cardápio.");
  }
  setupUI();
}

/* ===== FUNÇÕES DE SUPORTE ===== */
function finalizarCarregamento() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 500);
  }
}

function notify(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
}

/* ===== LÓGICA DO CARDÁPIO (COLE SUAS FUNÇÕES ABAIXO) ===== */
// Aqui você mantém: renderMenu, renderItem, renderOptions, toggle, qty, add, updateUI, remove, finalizarPedido, setupUI

function renderMenu(data) { /* seu código... */ }
function renderItem(item) { /* seu código... */ }
// ... e assim por diante 
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
      document.getElementById('loading-overlay').style.opacity = '0';
      setTimeout(() => document.getElementById('loading-overlay').style.display = 'none', 500);
    }

    function renderItem(item) {
      const content = document.getElementById('menu-content');
      const div = document.createElement('div');
      div.className = 'menu-item';
      const img = item['Imagem'] || item['URL da Imagem'];
      
      div.innerHTML = `
        ${img ? `<img src="${img}" class="item-image" loading="lazy">` : ''}
        <div class="item-details">
          <div class="item-header-clickable" onclick="toggle(this, ${item.type === 'complex'})">
            <span class="item-name">${item.Nome}</span>
            ${item.type === 'complex' ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
          </div>
          <div class="item-description">${item.Descrição || ''}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="item-price">R$ ${parseFloat(item.Valor).toFixed(2).replace('.', ',')}</span>
            ${item.type === 'simple' ? `<button class="add-to-cart-btn" onclick="add(this, '${item.Nome}', ${item.Valor}, false)">Adicionar</button>` : ''}
          </div>
          <div class="options-and-footer-container">
            ${item.type === 'complex' ? renderOptions(item) : ''}
            <div class="footer-action">
              <button class="add-to-cart-btn" onclick="add(this, '${item.Nome}', ${item.Valor}, true)">Adicionar</button>
            </div>
          </div>
        </div>
      `;
      content.appendChild(div);
    }

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

    function toggle(el, isComplex) {
      if(!isComplex) return;
      const box = el.parentElement.querySelector('.options-and-footer-container');
      const icon = el.querySelector('.toggle-icon');
      const open = box.style.display === 'block';
      box.style.display = open ? 'none' : 'block';
      icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    function qty(btn, d) {
      const i = btn.parentElement.querySelector('input');
      const group = i.closest('.option-group').querySelectorAll('input');
      let t = 0; group.forEach(g => t += parseInt(g.value));
      let cur = parseInt(i.value);
      if(d > 0 && t < i.dataset.limit) i.value = cur + 1;
      else if(d < 0 && cur > 0) i.value = cur - 1;
      else if(d > 0) notify("Limite atingido!");
    }

    function add(btn, name, price, isComplex) {
      if(companyStatus !== 'Aberto') return notify("Loja Fechada!");
      let opts = [];
      if(isComplex) {
        btn.closest('.options-and-footer-container').querySelectorAll('input').forEach(i => {
          if(parseInt(i.value) > 0) opts.push({name: i.dataset.opt, qty: i.value});
        });
        if(!opts.length) return notify("Escolha uma opção!");
        btn.closest('.options-and-footer-container').querySelectorAll('input').forEach(i => i.value = 0);
        toggle(btn.closest('.item-details').querySelector('.item-header-clickable'), true);
      }
      const key = name + JSON.stringify(opts);
      const ex = cart.find(c => c.key === key);
      if(ex) ex.qty++; else cart.push({key, name, price, opts, qty: 1});
      updateUI();
      notify("Adicionado!");
    }

    function updateUI() {
      const list = document.getElementById('cart-items');
      let t = 0, c = 0; list.innerHTML = '';
      cart.forEach((item, idx) => {
        t += item.price * item.qty; c += item.qty;
        list.innerHTML += `<div style="padding:10px 0; border-bottom:1px solid #eee; font-size: 0.9em;">
          <b>${item.qty}x ${item.name}</b> <span style="float:right">R$ ${(item.price*item.qty).toFixed(2)}</span>
          <div style="font-size:0.85em; color:#888">${item.opts.map(o => o.qty+'x '+o.name).join(', ')}</div>
          <button onclick="remove(${idx})" style="color:red; border:none; background:none; cursor:pointer; padding:0; font-size:0.85em">Remover</button>
        </div>`;
      });
      document.getElementById('cart-count').textContent = c;
      document.getElementById('cart-total').textContent = t.toFixed(2).replace('.', ',');
    }

    function remove(i) {
      if(cart[i].qty > 1) cart[i].qty--; else cart.splice(i,1);
      updateUI();
    }
function finalizarPedido() {
  const nomeCliente = document.getElementById('client-name').value.trim();
  
  // Validações
  if (companyStatus !== 'Aberto') return notify("Loja Fechada!");
  if (!cart.length) return notify("Sacola vazia!");
  if (!nomeCliente) return notify("Por favor, informe seu nome."); 

  let mensagem = 'Olá, gostaria de fazer o pedido:%0A';
  mensagem += `*Cliente:* ${nomeCliente}%0A`;
  let totalGeral = 0;

  cart.forEach(item => {
    const subTotal = item.price * item.qty;
    totalGeral += subTotal;

    // Item principal
    mensagem += `%0A${item.qty}x ${item.name} - R$ ${subTotal.toFixed(2).replace('.', ',')}%0A`;

    // Opcionais (um embaixo do outro)
    if (item.opts && item.opts.length > 0) {
      mensagem += item.opts.map(o => `• ${o.qty}x ${o.name}`).join('%0A') + '%0A';
    }
  });

  // Total no final
  mensagem += `%0A*Total do Pedido: R$ ${totalGeral.toFixed(2).replace('.', ',')}*`;

  if (!companyWhatsApp) return notify("WhatsApp não configurado!");

  window.open(`https://wa.me/${companyWhatsApp}?text=${mensagem}`, '_blank');

  // Limpa o carrinho e fecha o modal
  cart = [];
  document.getElementById('client-name').value = '';
  updateUI();
  document.getElementById('cart-modal').style.display = 'none';
  notify("Pedido enviado!");
}

  function setupUI() {
  const modal = document.getElementById('cart-modal');

  document.getElementById('cart-float').onclick = () => {
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
  };

  document.getElementById('close-cart').onclick = () => {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  };

  document.getElementById('search-input').oninput = (e) => {
    const v = e.target.value.toLowerCase();
    document.querySelectorAll('.menu-item').forEach(i =>
      i.style.display = i.innerText.toLowerCase().includes(v) ? 'flex' : 'none'
    );
  };
}
