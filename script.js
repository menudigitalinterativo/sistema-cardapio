 let cart = [];
let companyWhatsApp = '';
let themeColor = "#388e3c";
let companyStatus = "Aberto";
let optionNames = {}; 

    function notify(msg) {
      const container = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      container.appendChild(t);
      setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
    }
function formatarPreco(valor) {
  const num = parseFloat(valor);

  if (isNaN(num) || valor === '' || valor === null || valor === undefined) {
    return '';
  }

  return `R$ ${num.toFixed(2).replace('.', ',')}`;
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
function aplicarFooter(info) {
  if (!info) return;

  // Nome
  const nome = document.getElementById('footer-name');
  if (nome) nome.textContent = info.companyName || '';

  // Endereço
  const endereco = document.getElementById('footer-address');
  if (endereco) endereco.textContent = info.address || '';

  // Telefone
  const telefone = document.getElementById('footer-phone');
  if (telefone) telefone.textContent = info.whatsappNumber || '';

  // Instagram
  const insta = document.getElementById('footer-instagram');
  if (insta && info.instagram) {
    insta.href = info.instagram;
    insta.style.display = 'inline-block';
  } else if (insta) {
    insta.style.display = 'none';
  }

  // Facebook
  const face = document.getElementById('footer-facebook');
  if (face && info.facebook) {
    face.href = info.facebook;
    face.style.display = 'inline-block';
  } else if (face) {
    face.style.display = 'none';
  }

  // WhatsApp
  const whats = document.getElementById('footer-whatsapp');
  if (whats && info.whatsappNumber) {
    whats.href = `https://wa.me/${info.whatsappNumber}`;
    whats.style.display = 'inline-block';
  } else if (whats) {
    whats.style.display = 'none';
  }

  // Linha com cor do tema
  const line = document.querySelector('.footer-line');
  if (line) {
    line.style.background = info.siteColor || '#388e3c';
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
      const fretes = res.fretes || [];
     
     optionNames = (info && info.optionNames) ? info.optionNames : {};
     
      // Configurações visuais (Cores e WhatsApp)
      themeColor = info.siteColor || "#388e3c";
      companyWhatsApp = info.whatsappNumber || '';
      companyStatus = info.status || 'Aberto';

     aplicarStatus(info);
     iniciarSistemaHorarios(res.horarios); // 👈 ADICIONE APENAS ISSO
     carregarBairros(fretes);
     aplicarFooter(info);
     
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
         <div class="item-details" data-categoria="${item.Categoria || ''}">
          <div class="item-header-clickable" onclick="toggle(this, ${item.type === 'complex'})">
            <span class="item-name">${item.Nome}</span>
            ${item.type === 'complex' ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
          </div>
          <div class="item-description">${item.Descrição || ''}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="item-price">${formatarPreco(item.Valor)}</span>
            ${item.type === 'simple' ? `<button class="add-to-cart-btn" onclick="add(this, '${item.Nome}', '${item.Valor}', false)">Adicionar</button>` : ''}
          </div>
          <div class="options-and-footer-container">
            ${item.type === 'complex' ? renderOptions(item) : ''}
            <div class="footer-action">
            <button class="add-to-cart-btn" onclick="add(this, '${item.Nome}', '${item.Valor}', true)">Adicionar</button>
            </div>
          </div>
        </div>
      `;
      content.appendChild(div);
    }
function renderOptions(item) {
  let h = '';

  for (let k in item) {
    if (!item[k] || !item[k].items) continue;

    const grupo = item[k];

    // 🔥 TÍTULO PERSONALIZADO
    const match = k.match(/Opção\s+(\d+)/i);
    let titulo = k;

    if (match && optionNames) {
      const idx = match[1];
      const personalizado = optionNames[idx];

      if (personalizado && personalizado.trim()) {
        titulo = personalizado.trim();
      }
    }

    h += `
      <div class="option-group">
        <h4>${titulo} (Até ${grupo.limit})</h4>
    `;

    h += grupo.items.flatMap(str => {

      if (!str) return [];

      // 🔥 Se vier como string com vários itens
      const lista = typeof str === 'string'
        ? str.split(',')
        : [str];

      return lista.map(item => {

        let nomeBruto = '';
        let extra = 0;

        // 🧠 OBJETO (formato antigo)
        if (typeof item === 'object') {
          nomeBruto = item.name || item.nome || '';
          extra = parseFloat(item.extra || item.valor || 0) || 0;
        }

        // 🧠 STRING (formato planilha)
        else {
          const partes = String(item).trim().split('|');

          nomeBruto = (partes[0] || '').trim();

          if (partes[1]) {
            extra = parseFloat(partes[1].replace(',', '.')) || 0;
          }
        }

        const extraLabel = extra > 0
          ? ` <small style="color:#888;">(+ R$ ${extra.toFixed(2).replace('.', ',')})</small>`
          : '';

        return `
          <div class="option-list-item">
            <span>${nomeBruto}${extraLabel}</span>
            <div class="quantity-controls">
              <button onclick="qty(this,-1)">-</button>
              <input type="number" value="0"
                     data-opt="${nomeBruto}"
                     data-extra="${extra}"
                     data-limit="${grupo.limit}"
                     readonly>
              <button onclick="qty(this,1)">+</button>
            </div>
          </div>
        `;
      });

    }).join('');

    h += `</div>`;
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
     let t = 0; group.forEach(g => t += parseInt(g.value) || 0);
     let cur = parseInt(i.value) || 0;
      if(d > 0 && t < i.dataset.limit) i.value = cur + 1;
      else if(d < 0 && cur > 0) i.value = cur - 1;
      else if(d > 0) notify("Limite atingido!");
    }

    function add(btn, name, price, isComplex) {
     price = parseFloat(String(price).replace(',', '.')) || 0;
      if(companyStatus !== 'Aberto') return notify("Loja Fechada!");
      let opts = [];

if (isComplex) {
  btn.closest('.options-and-footer-container').querySelectorAll('input').forEach(i => {
    const qtd = parseInt(i.value);
    if (qtd > 0) {
      const extra = parseFloat(i.dataset.extra || '0');
      opts.push({
        name: i.dataset.opt,
        qty: qtd,
        extra: extra
      });
    }
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
  let t = 0, c = 0;
  list.innerHTML = '';

  cart.forEach((item, idx) => {
    const price = parseFloat(item.price) || 0;
    let itemBase = price * item.qty;
    let adicionais = 0;

    if (item.opts && item.opts.length) {
      item.opts.forEach(o => {
        const extra = parseFloat(o.extra) || 0;
        adicionais += extra * o.qty * item.qty;
      });
    }
    const totalItem = itemBase + adicionais;
    t += totalItem;
    c += item.qty;

    list.innerHTML += `
      <div style="padding:10px 0; border-bottom:1px solid #eee; font-size: 0.9em;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
  
  <div>
    <b>${item.name}</b>

    <div style="display:flex; align-items:center; gap:8px; margin-top:5px;">
      <button onclick="alterarQtd(${idx}, -1)"
        style="width:25px; height:25px; border:none; border-radius:50%; cursor:pointer;">
        -
      </button>

      <span>${item.qty}</span>

      <button onclick="alterarQtd(${idx}, 1)"
        style="width:25px; height:25px; border:none; border-radius:50%; cursor:pointer;">
        +
      </button>
    </div>
  </div>

  <span>${formatarPreco(totalItem)}</span>
</div>
        <div style="font-size:0.85em; color:#888">
          ${(item.opts || []).map(o => {
            const extraTxt = o.extra && o.extra > 0
              ? ` (+R$ ${o.extra.toFixed(2).replace('.', ',')})`
              : '';
            return `${o.qty}x ${o.name}${extraTxt}`;
          }).join(', ')}
        </div>

        <button onclick="removeItem(${idx})"
          style="color:red; border:none; background:none; cursor:pointer; padding:0; font-size:0.85em">
          Remover
        </button>
      </div>
    `;
  });

  document.getElementById('cart-count').textContent = c;
  window.totalCarrinho = t;

  atualizarTotalComFrete();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateUI();
}
function alterarQtd(index, delta) {
  if (!cart[index]) return;

  cart[index].qty += delta;

  // Se zerar, remove o item
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  updateUI();
}
function finalizarPedido() {
  const nomeCliente = document.getElementById('client-name').value.trim();
  const tipoEntrega = document.getElementById('tipo-entrega').value;
  const selectBairro = document.getElementById('select-bairro');
  const taxaEntrega = parseFloat(selectBairro.value) || 0;
  
  // Validações
  if (companyStatus !== 'Aberto') return notify("Loja Fechada!");
  if (!cart.length) return notify("Sacola vazia!");
  if (!nomeCliente) return notify("Por favor, informe seu nome."); 
  if (!tipoEntrega) return notify("Selecione o tipo de entrega.");
 
  if (tipoEntrega === 'delivery' && !selectBairro.value) {
    return notify("Selecione o bairro para entrega.");
  }

  let mensagem = 'Olá, gostaria de fazer o pedido:%0A';
  mensagem += `*Cliente:* ${nomeCliente}%0A`;
 
 // 🔥 Tipo de entrega
  mensagem += `*Entrega:* ${tipoEntrega === 'delivery' ? 'Delivery' : 'Retirada no local'}%0A`;

  // 🔥 Bairro se for delivery
  if (tipoEntrega === 'delivery') {
    const nomeBairro = selectBairro.options[selectBairro.selectedIndex].text;
    mensagem += `*Bairro:* ${nomeBairro}%0A`;
  }
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

 // 🔥 Soma frete se for delivery
  if (tipoEntrega === 'delivery') {
    mensagem += `%0A*Taxa de entrega:* R$ ${taxaEntrega.toFixed(2).replace('.', ',')}%0A`;
    totalGeral += taxaEntrega;
  }

  // 🔥 Total final
  mensagem += `%0A*Total do Pedido: R$ ${totalGeral.toFixed(2).replace('.', ',')}*`;

  // 🔥 Observação pagamento
  mensagem += `%0A%0AForma de pagamento será combinada na confirmação.`;

  if (!companyWhatsApp) return notify("WhatsApp não configurado!");

  window.open(`https://wa.me/${companyWhatsApp}?text=${mensagem}`, '_blank');

  // Limpa o carrinho e fecha o modal
  cart = [];
  document.getElementById('client-name').value = '';
  document.getElementById('tipo-entrega').value = '';
  document.getElementById('select-bairro').value = '';
  document.getElementById('box-bairro').style.display = 'none';

  updateUI();
  document.getElementById('cart-modal').style.display = 'none';
  notify("Pedido enviado!");
}
function setupUI() {
  const modal = document.getElementById('cart-modal');

  document.getElementById('cart-float').onclick = () => {
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    atualizarTotalComFrete(); // 🔥 atualiza ao abrir
  };

  document.getElementById('close-cart').onclick = () => {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  };

  document.getElementById('search-input').oninput = (e) => {
  const termo = normalizarTexto(e.target.value);

  let encontrou = false;

  document.querySelectorAll('.menu-item').forEach(item => {
    const nome = normalizarTexto(item.querySelector('.item-name')?.innerText || '');
    const desc = normalizarTexto(item.querySelector('.item-description')?.innerText || '');
    const categoria = normalizarTexto(item.querySelector('.item-details')?.dataset.categoria || '');

    const match =
    nome.includes(termo) ||
    desc.includes(termo) ||
    categoria.includes(termo);

    item.style.display = match ? 'flex' : 'none';

    if (match) encontrou = true;
  });

  // 🔥 (opcional) mensagem se não encontrou
  let aviso = document.getElementById('nenhum-resultado');

  if (!encontrou) {
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'nenhum-resultado';
      aviso.style.padding = '20px';
      aviso.style.textAlign = 'center';
      aviso.style.color = '#888';
      aviso.innerText = 'Nenhum item encontrado';
      document.getElementById('menu-content').appendChild(aviso);
    }
  } else {
    if (aviso) aviso.remove();
  }
};
 // 🔥 REFINO DA BUSCA
 function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, ""); // remove símbolos tipo "-"
}
  // 🔥 CONTROLE DO TIPO DE ENTREGA
  document.getElementById('tipo-entrega').onchange = function () {
    const box = document.getElementById('box-bairro');

    if (this.value === 'delivery') {
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
      document.getElementById('select-bairro').value = '';
    }

    atualizarTotalComFrete(); // 🔥 recalcula ao mudar tipo
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
  if (modal) modal.style.display = 'flex';
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
function iniciarSistemaHorarios(horarios) {
  if (!horarios || !Array.isArray(horarios)) {
    console.warn("Horários não encontrados ou inválidos");
    return;
  }

  // Renderiza os horários no modal
  renderHorarios(horarios);

  // Inicia o relógio em tempo real
  iniciarRelogio();
}
