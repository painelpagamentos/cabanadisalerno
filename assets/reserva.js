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
                    <!-- Step 1: Datas -->
                    <div id="step1" class="step active">
                        <h3>1. Seleção de Datas</h3>
                        <div id="selectedCabinNameDisplay"></div>
                        <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">Selecione a data de chegada e depois a de saída no calendário abaixo:</p>
                        <div id="userInlinePicker" style="margin-bottom: 15px;"></div>
                        <div style="text-align: center; margin-bottom: 15px;">
                            <button onclick="clearDateSelection()" style="background: #eee; border: 1px solid #ccc; padding: 5px 15px; border-radius: 5px; cursor: pointer; font-size: 0.8em;">Limpar Seleção</button>
                        </div>
                        <p id="diariasInfo" style="font-weight: bold; color: #3d85c6; text-align: center;"></p>
                    </div>

                    <!-- Step 2: Dados -->
                    <div id="step2" class="step">
                        <h3>2. Seus Dados</h3>
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

                    <!-- Step 3: Pagamento Pix -->
                    <div id="step3" class="step">
                        <h3>3. Pagamento de Sinal (50%)</h3>
                        <div id="summaryContent" class="summary-box" style="margin-bottom: 20px; padding: 10px; background: #f9f9f9; border-radius: 8px; font-size: 0.9em;"></div>
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

function selectCabin(id) {
    reservaAtual.cabanaId = id;

    const cabana = cabanas.find(c => c.id === id);
    if (cabana) {
        const display = document.getElementById('selectedCabinNameDisplay');
        if (display) display.innerText = "Você está reservando: " + cabana.nome;
    }

    // Atualizar datas bloqueadas no calendário para esta cabana
    const bloqueiosCabana = bloqueios
        .filter(b => b.cabanaId === id)
        .map(b => ({ from: b.inicio, to: b.fim }));
    
    if (datePicker) datePicker.set('disable', bloqueiosCabana);
}

function iniciarReservaDireta(id) {
    // Definir a cabana selecionada globalmente
    selectCabin(id);
    
    // Abrir o modal de reserva
    openModalReserva();
}

function moveStep(dir) {
    if (dir === 1 && !validateStep(stepAtual)) return;
    stepAtual += dir;

    // Atualizar visibilidade dos passos
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const currentStepEl = document.getElementById(`step${stepAtual}`);
    if (currentStepEl) currentStepEl.classList.add('active');

    updateButtonVisibility();
}

function updateButtonVisibility() {
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnConfirm = document.getElementById('btnConfirm');

    if (!btnPrev || !btnNext || !btnConfirm) return;

    // Botão Voltar: Oculto no primeiro passo
    btnPrev.style.visibility = stepAtual === 1 ? 'hidden' : 'visible';
    
    // Alternar entre Próximo e Confirmar Pagamento
    if (stepAtual === 3) {
        btnNext.style.display = 'none';
        btnConfirm.style.display = 'block';
        updateSummary();
    } else {
        btnNext.style.display = 'block';
        btnConfirm.style.display = 'none';
        btnNext.innerText = 'Próximo';
    }
}

function validateStep(step) {
    if (step === 1) {
        if (!reservaAtual.cabanaId) return alert('Selecione uma cabana primeiro.');
        if (!reservaAtual.checkIn || !reservaAtual.checkOut) return alert('Selecione o período.');
    }
    if (step === 2) {
        const nome = document.getElementById('respNome').value;
        const cpf = document.getElementById('respCpf').value;
        const tel = document.getElementById('respTel').value;
        if (!nome || cpf.length < 14 || tel.length < 14) return alert('Preencha seus dados corretamente.');
        reservaAtual.nome = nome;
        reservaAtual.cpf = cpf;
        reservaAtual.telefone = tel;
    }
    return true;
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
    // Calculate total amount to charge (using signal 50% as per UI)
    const amount = reservaAtual.sinal;
    const description = `Sinal Reserva Cabana ${reservaAtual.cabanaId} - ${reservaAtual.checkIn} to ${reservaAtual.checkOut}`;
    try {
        const pixData = await createPixCharge(amount, description);
        // Update UI with PIX info
        const pixImg = document.querySelector('#step3 .qr-placeholder img');
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

function openModal() {
    document.getElementById('modalReserva').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function openModalReserva() {
    // Garantir que comece no primeiro passo
    stepAtual = 1;
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    
    updateButtonVisibility();
    openModal();
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

window.copyPix = copyPix;
window.iniciarReservaDireta = iniciarReservaDireta;
window.clearDateSelection = clearDateSelection;
window.openModalReserva = openModalReserva;
window.selectCabin = selectCabin;
