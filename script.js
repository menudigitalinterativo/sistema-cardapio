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

    document.addEventListener('DOMContentLoaded', () => {
      google.script.run.withSuccessHandler(info => {
        const logo = document.getElementById('company-logo');
        const loaderLogo = document.getElementById('loader-logo-img');
        if (info.logoUrl) {
          logo.src = info.logoUrl; logo.style.display = 'block';
          loaderLogo.src = info.logoUrl; loaderLogo.style.display = 'block';
        }
        document.getElementById('company-name').textContent = info.companyName || '';
        companyWhatsApp = info.whatsappNumber || '';
        companyStatus = info.status || 'Aberto';
        const st = document.getElementById('status-message');
        st.textContent = companyStatus;
        st.style.color = companyStatus === 'Aberto' ? 'green' : 'red';

        if (info.siteColor) {
          themeColor = info.siteColor;
          document.getElementById('main-progress-bar').style.backgroundColor = themeColor;
          const style = document.createElement('style');
          style.textContent = `
            .section-title { border-color: ${themeColor}; color: ${themeColor}; }
            .add-to-cart-btn, #cart-float, .quantity-controls button { background-color: ${themeColor} !important; }
            .item-name { color: ${themeColor}; }
          `;
          document.head.appendChild(style);
        }
        google.script.run.withSuccessHandler(data => renderMenu(data)).getMenuDataForClient();
      }).getCompanyInfo();
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
        ${img ? `<img src="${img}" class="item-image">` : ''}
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
      if(!cart.length) return notify("Sacola vazia!");
      let m = `*PEDIDO*%0A`;
      cart.forEach(i => {
        m += `%0A*${i.qty}x ${i.name}*`;
        i.opts.forEach(o => m += `%0A - ${o.qty}x ${o.name}`);
      });
      window.open(`https://wa.me/${companyWhatsApp}?text=${m}`);
    }

    function setupUI() {
      document.getElementById('cart-float').onclick = () => document.getElementById('cart-modal').style.display='block';
      document.getElementById('close-cart').onclick = () => document.getElementById('cart-modal').style.display='none';
      document.getElementById('search-input').oninput = (e) => {
        const v = e.target.value.toLowerCase();
        document.querySelectorAll('.menu-item').forEach(i => i.style.display = i.innerText.toLowerCase().includes(v) ? 'flex' : 'none');
      };
    }
