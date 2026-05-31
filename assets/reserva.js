// Gerenciamento de Dados via API
let cabanas = [];
let bloqueios = [];

let reservaAtual = {
    cabanaId: null,
    checkIn: '',
    checkOut: '',
    diarias: 0,
    adultos: 1,
    criancas: 0,
    nome: '',
    cpf: '',
    telefone: '',
    total: 0,
    sinal: 0,
    restante: 0
};

let stepAtual = 1;
let datePicker = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Carregar dados iniciais da API
    await carregarDados();

    // Inserir Modal de Reserva no Body
    const modalHtml = `
        <div id="modalReserva" class="reserva-modal">
            <div class="reserva-content">
                <span class="close-reserva">&times;</span>
                <div class="reserva-header">
                    <h2>Fazer Minha Reserva</h2>
                </div>
                <div class="reserva-body">
                    <!-- Step 1: Cabanas -->
                    <div id="step1" class="step active">
                        <h3>1. Escolha sua Cabana</h3>
                        <div id="cabanasList">Carregando cabanas...</div>
                    </div>

                    <!-- Step 2: Datas -->
                    <div id="step2" class="step">
                        <h3>2. Seleção de Datas</h3>
                        <div id="selectedCabinNameDisplay"></div>
                        <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Selecione a data de chegada e depois a de saída no calendário abaixo:</p>
                        <div id="userInlinePicker" style="margin-bottom: 15px;"></div>
                        <div style="text-align: center; margin-bottom: 15px;">
                            <button onclick="clearDateSelection()" style="background: #eee; border: 1px solid #ccc; padding: 5px 15px; border-radius: 5px; cursor: pointer; font-size: 0.8em;">Limpar Seleção</button>
                        </div>
                        <p id="diariasInfo" style="font-weight: bold; color: #3d85c6; text-align: center;"></p>
                    </div>

                    <!-- Step 3: Hóspedes -->
                    <div id="step3" class="step">
                        <h3>3. Quantidade de Hóspedes</h3>
                        <div class="guest-counter">
                            <span>Adultos:</span>
                            <div class="counter-btns">
                                <button onclick="changeGuest('adultos', -1)">-</button>
                                <span id="countAdultos">1</span>
                                <button onclick="changeGuest('adultos', 1)">+</button>
                            </div>
                        </div>
                        <div class="guest-counter">
                            <span>Crianças (até 11 anos):</span>
                            <div class="counter-btns">
                                <button onclick="changeGuest('criancas', -1)">-</button>
                                <span id="countCriancas">0</span>
                                <button onclick="changeGuest('criancas', 1)">+</button>
                            </div>
                        </div>
                        <p id="capacityWarning" class="capacity-warning">Limite de hóspedes da cabana atingido!</p>
                    </div>

                    <!-- Step 4: Dados -->
                    <div id="step4" class="step">
                        <h3>4. Dados do Responsável</h3>
                        <div class="form-group">
                            <label>Nome Completo</label>
                            <input type="text" id="respNome" placeholder="Seu nome completo">
                        </div>
                        <div class="form-group">
                            <label>CPF</label>
                            <input type="text" id="respCpf" placeholder="000.000.000-00">
                        </div>
                        <div class="form-group">
                            <label>WhatsApp</label>
                            <input type="text" id="respTel" placeholder="(00) 00000-0000">
                        </div>
                    </div>

                    <!-- Step 5: Resumo -->
                    <div id="step5" class="step">
                        <h3>5. Resumo da Reserva</h3>
                        <div id="summaryContent" class="summary-box"></div>
                    </div>

                    <!-- Step 6: Pagamento Pix -->
                    <div id="step6" class="step">
                        <h3>6. Pagamento de Sinal (50%)</h3>
                        <div class="pix-container">
                            <p>Escaneie o QR Code abaixo para pagar o sinal de 50%:</p>
                            <div class="qr-placeholder">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Reserva_Cabanas_di_Salerno" alt="QR Code Pix Mock">
                            </div>
                            <p>Ou utilize o código Copia e Cola:</p>
                            <div class="pix-code" id="pixCode">00020126360014BR.GOV.BCB.PIX011412345678901234520400005303986540510.005802BR5913DI_SALERNO_RES6007Pirenopolis62070503***6304</div>
                            <button class="copy-btn" onclick="copyPix()">Copiar Código Pix</button>
                            <div style="margin-top: 20px; font-weight: bold; color: #ff9900;">
                                Status: Aguardando pagamento...
                            </div>
                            <p style="font-size: 0.8em; margin-top: 10px;">(Simulação: O botão abaixo confirmará o pagamento)</p>
                        </div>
                    </div>
                </div>
                <div class="reserva-footer">
                    <button id="btnPrev" class="btn-prev" style="visibility: hidden;">Anterior</button>
                    <button id="btnNext" class="btn-next">Próximo</button>
                    <button id="btnConfirm" class="btn-finish" style="display: none;">Confirmar Pagamento</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    configurarEventos();
    renderizarCabanas();
});

async function carregarDados() {
    const [resC, resB] = await Promise.all([
        fetch('/api/cabanas'),
        fetch('/api/bloqueios')
    ]);
    cabanas = await resC.json();
    bloqueios = await resB.json();
}

function configurarEventos() {
    document.querySelector('.close-reserva').onclick = () => closeModal();
    document.getElementById('btnNext').onclick = () => moveStep(1);
    document.getElementById('btnPrev').onclick = () => moveStep(-1);
    document.getElementById('btnConfirm').onclick = () => finishBooking();

    datePicker = flatpickr("#userInlinePicker", {
        inline: true,
        mode: "range",
        minDate: "today",
        dateFormat: "Y-m-d",
        locale: "pt",
        theme: "dark",
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                const start = selectedDates[0];
                const end = selectedDates[1];
                const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                reservaAtual.diarias = diff;
                reservaAtual.checkIn = start.toISOString().split('T')[0];
                reservaAtual.checkOut = end.toISOString().split('T')[0];
                document.getElementById('diariasInfo').innerText = `Total de diárias: ${diff}`;
            } else {
                reservaAtual.diarias = 0;
                reservaAtual.checkIn = '';
                reservaAtual.checkOut = '';
                document.getElementById('diariasInfo').innerText = '';
            }
        }
    });

    document.getElementById('respCpf').oninput = (e) => maskCpf(e.target);
    document.getElementById('respTel').oninput = (e) => maskTel(e.target);
}

function renderizarCabanas() {
    const list = document.getElementById('cabanasList');
    list.innerHTML = '';
    cabanas.forEach(c => {
        const item = document.createElement('div');
        item.className = 'cabin-item-wrapper'; // Wrapper para conter o card e o botão
        item.innerHTML = `
            <div class="cabin-item" onclick="selectCabin('${c.id}', this)">
                <img src="${c.foto}" class="cabin-img">
                <div class="cabin-info">
                    <h3>${c.nome}</h3>
                    <p>Capacidade: ${c.capacidade} pessoas</p>
                    <p class="cabin-price">R$ ${c.valor.toFixed(2)} / diária</p>
                </div>
            </div>
            <button class="btn-reserva-main btn-reserva-inline" onclick="iniciarReservaDireta('${c.id}')">FAZER MINHA RESERVA</button>
        `;
        list.appendChild(item);
    });
}

function iniciarReservaDireta(id) {
    console.log('FAZER MINHA RESERVA clicked, id:', id);
    // Abre o modal sempre
    openModal();
    alert('Função iniciarReservaDireta executada'); // Debug alert
    console.log('Modal opened');
    // Seleciona a cabana visualmente na lista dentro do modal
    const items = document.querySelectorAll('.cabin-item');
    items.forEach(item => {
        // Encontrar o card correspondente ao ID
        if (item.getAttribute('onclick').includes(id)) {
            selectCabin(id, item);
        }
    });
    // Pula para o próximo passo (Datas)
    moveStep(1);
}

window.iniciarReservaDireta = iniciarReservaDireta;

function selectCabin(id, element) {
    reservaAtual.cabanaId = id;
    document.querySelectorAll('.cabin-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    const cabana = cabanas.find(c => c.id === id);
    if (cabana) {
        const display = document.getElementById('selectedCabinNameDisplay');
        if (display) display.innerText = "Você está reservando: " + cabana.nome;
    }

    // Atualizar datas bloqueadas no calendário para esta cabana
    const bloqueiosCabana = bloqueios
        .filter(b => b.cabanaId === id)
        .map(b => ({ from: b.inicio, to: b.fim }));
    
    datePicker.set('disable', bloqueiosCabana);
}

function moveStep(dir) {
    if (dir === 1 && !validateStep(stepAtual)) return;
    stepAtual += dir;

    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${stepAtual}`).classList.add('active');

    document.getElementById('btnPrev').style.visibility = stepAtual === 1 ? 'hidden' : 'visible';
    
    if (stepAtual === 6) {
        document.getElementById('btnNext').style.display = 'none';
        document.getElementById('btnConfirm').style.display = 'block';
    } else {
        document.getElementById('btnNext').style.display = 'block';
        document.getElementById('btnConfirm').style.display = 'none';
        document.getElementById('btnNext').innerText = stepAtual === 5 ? 'Fazer Reserva' : 'Próximo';
    }

    if (stepAtual === 5) updateSummary();
}

function validateStep(step) {
    if (step === 1 && !reservaAtual.cabanaId) return alert('Selecione uma cabana.');
    if (step === 2 && (!reservaAtual.checkIn || !reservaAtual.checkOut)) return alert('Selecione o período.');
    if (step === 4) {
        const nome = document.getElementById('respNome').value;
        const cpf = document.getElementById('respCpf').value;
        const tel = document.getElementById('respTel').value;
        if (!nome || cpf.length < 14 || tel.length < 14) return alert('Preencha seus dados.');
        reservaAtual.nome = nome;
        reservaAtual.cpf = cpf;
        reservaAtual.telefone = tel;
    }
    return true;
}

function changeGuest(type, val) {
    const cabana = cabanas.find(c => c.id === reservaAtual.cabanaId);
    const totalAtual = reservaAtual.adultos + reservaAtual.criancas;
    if (type === 'adultos') {
        const novo = reservaAtual.adultos + val;
        if (novo >= 1 && (val < 0 || totalAtual < cabana.capacidade)) reservaAtual.adultos = novo;
        else if (val > 0) showCapacityWarning();
    } else {
        const novo = reservaAtual.criancas + val;
        if (novo >= 0 && (val < 0 || totalAtual < cabana.capacidade)) reservaAtual.criancas = novo;
        else if (val > 0) showCapacityWarning();
    }
    document.getElementById('countAdultos').innerText = reservaAtual.adultos;
    document.getElementById('countCriancas').innerText = reservaAtual.criancas;
}

function showCapacityWarning() {
    const el = document.getElementById('capacityWarning');
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function updateSummary() {
    const cabana = cabanas.find(c => c.id === reservaAtual.cabanaId);
    reservaAtual.total = cabana.valor * reservaAtual.diarias;
    reservaAtual.sinal = reservaAtual.total * 0.5;
    reservaAtual.restante = reservaAtual.total - reservaAtual.sinal;

    document.getElementById('summaryContent').innerHTML = `
        <div class="summary-row"><span>Cabana:</span> <strong>${cabana.nome}</strong></div>
        <div class="summary-row"><span>Diária:</span> <strong>R$ ${cabana.valor.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Período:</span> <strong>${reservaAtual.checkIn} a ${reservaAtual.checkOut}</strong></div>
        <div class="summary-row"><span>Diárias:</span> <strong>${reservaAtual.diarias}</strong></div>
        <div class="summary-row summary-total"><span>TOTAL:</span> <strong>R$ ${reservaAtual.total.toFixed(2)}</strong></div>
        <div class="summary-row summary-pix"><span>SINAL (50%):</span> <strong>R$ ${reservaAtual.sinal.toFixed(2)}</strong></div>
    `;
}

// Blackcat Pay integration
async function createPixCharge(amount, description) {
    // TODO: Replace with your actual Blackcat Pay API credentials
    const API_KEY = 'YOUR_BLACKCAT_API_KEY';
    const response = await fetch('https://api.blackcatpay.com.br/v1/pix', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            amount: amount,
            description: description,
            // optional: payer information, expiration, etc.
        })
    });
    if (!response.ok) {
        throw new Error('Failed to create PIX charge');
    }
    const data = await response.json();
    // Expected fields: qrCodeUrl, copyPaste (Copia e Cola)
    return {
        qrCodeUrl: data.qrCodeUrl || data.qr_image,
        copyPaste: data.copyPaste || data.copiable || ''
    };
}

// Updated finishBooking to generate PIX before sending reservation
async function finishBooking() {
    // Calculate total amount to charge (already stored in reservaAtual.total)
    const amount = reservaAtual.total;
    const description = `Reserva Cabana ${reservaAtual.cabanaId} - ${reservaAtual.checkIn} to ${reservaAtual.checkOut}`;
    try {
        const pixData = await createPixCharge(amount, description);
        // Update UI with PIX info
        const pixImg = document.querySelector('#step6 .qr-placeholder img');
        if (pixImg && pixData.qrCodeUrl) {
            pixImg.src = pixData.qrCodeUrl;
        }
        const pixCodeEl = document.getElementById('pixCode');
        if (pixCodeEl) {
            pixCodeEl.innerText = pixData.copyPaste;
        }
        // Show confirmation button only after PIX is ready
        document.getElementById('btnConfirm').style.display = 'block';
    } catch (e) {
        alert('Erro ao gerar PIX: ' + e.message);
        return;
    }

    // Send reservation data to backend after payment is confirmed (simulated here)
    const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservaAtual)
    });
    const data = await res.json();
    if (data.success) {
        alert('Reserva enviada com sucesso! Pagamento confirmado.');
        location.reload();
    }
}


}

function openModal() {
    document.getElementById('modalReserva').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalReserva').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function maskCpf(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    i.value = v;
}

function maskTel(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    i.value = v;
}

function copyPix() {
    const code = document.getElementById('pixCode').innerText;
    navigator.clipboard.writeText(code).then(() => alert('Código Pix copiado!'));
}

function clearDateSelection() {
    if(datePicker) datePicker.clear();
    reservaAtual.diarias = 0;
    reservaAtual.checkIn = '';
    reservaAtual.checkOut = '';
    document.getElementById('diariasInfo').innerText = '';
}

window.changeGuest = changeGuest;
window.copyPix = copyPix;
window.iniciarReservaDireta = iniciarReservaDireta;
window.clearDateSelection = clearDateSelection;
