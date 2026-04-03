 let cart = [];
    let companyWhatsApp = '';
    let themeColor = "#388e3c";
    let companyStatus = "Aberto";

    function notify(msg) {
      const container = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      container.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
    }
function aplicarStatus(info) {
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-indicator");

  if (!statusText || !statusDot) return;

  if (info.status === "Aberto") {
    statusText.textContent = "Aberto";
    statusDot.style.background = "green";
  } else {
    statusText.textContent = "Fechado";
    statusDot.style.background = "red";
  }
}
document.addEventListener('DOMContentLoaded', async () => {
  const progressBar = document.getElementById('main-progress-bar');
  if (progressBar) progressBar.style.width = '15%';

  try {
    // 🚀 AJUSTE DE CAMINHO: Aponta para a pasta que vimos na sua foto
   const response = await fetch('./dados/cardapio.json?v=' + Date.now());
    
    if (!response.ok) throw new Error('Arquivo não encontrado no servidor');
    
    const res = await response.json();

    if (res.success) {
      const info = res.info;
      const data = res.menu;

      // Configurações visuais (Cores e WhatsApp)
      themeColor = info.siteColor || "#388e3c";
      companyWhatsApp = info.whatsappNumber || '';
      companyStatus = info.status || 'Aberto';

     aplicarStatus(info);
     iniciarSistemaHorarios(info); // 👈 ADICIONE APENAS ISSO
      document.getElementById('company-name').textContent = info.companyName;
      if (info.logoUrl) {
        document.getElementById('company-logo').src = info.logoUrl;
        document.getElementById('company-logo').style.display = 'block';
        if (document.getElementById('loader-logo-img')) {
          document.getElementById('loader-logo-img').src = info.logoUrl;
          document.getElementById('loader-logo-img').style.display = 'block';
        }
      }

      // Aplica o tema dinâmico
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
      }

      renderMenu(data);

      setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => overlay.style.display = 'none', 500);
        }
      }, 600);

    } else {
      notify("Erro: Os dados do cardápio estão incompletos.");
    }
  } catch (err) {
    console.error("Erro técnico:", err);
    notify("Sem conexão com o cardápio. Clique em 'Publicar' no Admin.");
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

    atualizarTotalComFrete(); // 🔥 já atualiza ao abrir
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

  // 🔥 Atualiza quando muda o bairro
  document.getElementById('select-bairro').onchange = atualizarTotalComFrete;
}
// =========================
// 🔥 FORA DA FUNÇÃO (GLOBAL)
// =========================

function atualizarTotalComFrete() {
  const select = document.getElementById('select-bairro');
  const taxa = parseFloat(select.value) || 0;

  const subtotal = window.totalCarrinho || 0; 
  const total = subtotal + taxa;

  document.getElementById('subtotal-carrinho').innerText =
    `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

  document.getElementById('taxa-entrega-display').innerText =
    `R$ ${taxa.toFixed(2).replace('.', ',')}`;

  document.getElementById('total-geral').innerText =
    `R$ ${total.toFixed(2).replace('.', ',')}`;
}


// =========================
// 🔥 CARREGAR BAIRROS
// =========================

function carregarBairros(listaFretes) {
  const select = document.getElementById('select-bairro');

  select.innerHTML = '<option value="">Selecione o bairro</option>';

  listaFretes.forEach(item => {
    let opt = document.createElement('option');
    opt.value = item.taxa;
    opt.textContent = `${item.bairro} - R$ ${item.taxa.toFixed(2)}`;
    select.appendChild(opt);
  });
}
// =========================
// 🔥 MODAL HORÁRIOS
// =========================

function abrirHorarios() {
  const modal = document.getElementById('modal-horarios');
  if (modal) modal.style.display = 'block';
}

function fecharHorarios() {
  const modal = document.getElementById('modal-horarios');
  if (modal) modal.style.display = 'none';
}

// Fecha clicando fora
window.addEventListener('click', function(e) {
  const modal = document.getElementById('modal-horarios');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});


// =========================
// 🔥 RELÓGIO EM TEMPO REAL
// =========================

function iniciarRelogio() {
  function atualizar() {
    const agora = new Date();

    const hora = agora.toLocaleTimeString('pt-BR');

    const data = agora.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const elHora = document.getElementById('relogio');
    const elData = document.getElementById('data-atual');

    if (elHora) elHora.innerText = hora;
    if (elData) elData.innerText = data;
  }

  atualizar();
  setInterval(atualizar, 1000);
}


// =========================
// 🔥 RENDERIZAR HORÁRIOS
// =========================

function renderHorarios(horarios) {
  const container = document.getElementById('horarios-container');
  if (!container || !horarios) return;

  container.innerHTML = '';

  const hoje = new Date().getDay();

  const diasMap = {
    "Domingo": 0,
    "Segunda": 1,
    "Terça": 2,
    "Quarta": 3,
    "Quinta": 4,
    "Sexta": 5,
    "Sábado": 6
  };

  horarios.forEach(d => {
    const isHoje = diasMap[d.dia] === hoje;

    const horariosTexto = (d.horarios && d.horarios.length)
      ? d.horarios.join(' • ')
      : 'Fechado';

    const div = document.createElement('div');
    div.style.padding = "10px 0";
    div.style.borderBottom = "1px solid #eee";

    div.innerHTML = `
      <strong style="${isHoje ? 'color: green;' : ''}">
        ${d.dia} ${isHoje ? ' (Hoje)' : ''}
      </strong><br>
      <span style="font-size:0.9em;">
        ${horariosTexto}
      </span>
    `;

    container.appendChild(div);
  });
}

// =========================
// 🔥 INTEGRAÇÃO AUTOMÁTICA
// =========================

// Chame isso depois que carregar o JSON (onde já usa "info")
function iniciarSistemaHorarios(info) {
  if (!info) return;

  // Renderiza horários
  renderHorarios(info.horarios);

  // Inicia relógio
  iniciarRelogio();
}
