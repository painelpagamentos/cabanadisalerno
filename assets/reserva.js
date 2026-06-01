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

                    <!-- Step 3: Resumo -->
                    <div id="step3" class="step">
                        <h3>3. Resumo da Reserva</h3>
                        <div id="summaryContent" class="summary-box"></div>
                    </div>

                    <!-- Step 4: Pagamento Pix -->
                    <div id="step4" class="step">
                        <h3>4. Pagamento de Sinal (50%)</h3>
                        <div id="summaryContentPayment" class="summary-box" style="margin-bottom: 20px;"></div>
                        <div class="pix-container">
                            <p>Escaneie o QR Code abaixo para pagar o sinal de 50%:</p>
                            <div class="qr-placeholder">
                                <img id="pixQrImg" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Reserva_Cabanas_di_Salerno" alt="QR Code Pix">
                            </div>
                            <p>Ou utilize o código Copia e Cola:</p>
                            <div class="pix-code" id="pixCode">Aguardando geração do PIX...</div>
                            <button class="copy-btn" onclick="copyPix()">Copiar Código Pix</button>
                            <div style="margin-top: 20px; font-weight: bold; color: #ff9900;">
                                Status: Aguardando pagamento...
                            </div>
                        </div>
                    </div>
                </div>
                <div class="reserva-footer">
                    <button id="btnPrev" class="btn-prev" style="visibility: hidden;">Anterior</button>
                    <button id="btnNext" class="btn-next">Próximo</button>
                    <button id="btnConfirm" class="btn-finish" style="display: none;">Confirmar e Ir para Pagamento</button>
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
    document.getElementById('btnConfirm').onclick = () => confirmarEIrParaPagamento();

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
        
        // Atualizar datas bloqueadas no calendário IMEDIATAMENTE para esta cabana
        const bloqueiosCabana = bloqueios
            .filter(b => b.cabanaId === id)
            .map(b => ({ from: b.inicio, to: b.fim }));
        
        if (datePicker) {
            datePicker.clear(); // Limpa seleção anterior se houver
            datePicker.set('disable', bloqueiosCabana);
        }
    }
}

function iniciarReservaDireta(id) {
    // Definir a cabana selecionada e configurar calendário ANTES de abrir o modal
    selectCabin(id);
    
    // Abrir o modal de reserva já no passo 1 (Datas)
    openModalReserva();
}

function moveStep(dir) {
    if (dir === 1 && !validateStep(stepAtual)) return;
    stepAtual += dir;
    if (stepAtual < 1) stepAtual = 1;
    if (stepAtual > 4) stepAtual = 4;

    // Atualizar visibilidade dos passos
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const currentStepEl = document.getElementById(`step${stepAtual}`);
    if (currentStepEl) currentStepEl.classList.add('active');

    if (stepAtual === 3 || stepAtual === 4) updateSummary();

    updateButtonVisibility();
}

function updateButtonVisibility() {
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnConfirm = document.getElementById('btnConfirm');

    if (!btnPrev || !btnNext || !btnConfirm) return;

    // Botão Voltar: Oculto no primeiro passo
    btnPrev.style.visibility = stepAtual === 1 ? 'hidden' : 'visible';
    
    if (stepAtual === 3) {
        btnNext.style.display = 'none';
        btnConfirm.style.display = 'block';
        btnConfirm.innerText = 'Confirmar e Ir para Pagamento';
    } else if (stepAtual === 4) {
        btnNext.style.display = 'none';
        btnConfirm.style.display = 'none';
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
    if (!cabana) return;

    reservaAtual.total = cabana.valor * reservaAtual.diarias;
    reservaAtual.sinal = reservaAtual.total * 0.5;
    reservaAtual.restante = reservaAtual.total - reservaAtual.sinal;

    const summaryHtml = `
        <div class="summary-row"><span>Cabana:</span> <strong>${cabana.nome}</strong></div>
        <div class="summary-row"><span>Diária:</span> <strong>R$ ${cabana.valor.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Período:</span> <strong>${reservaAtual.checkIn} a ${reservaAtual.checkOut}</strong></div>
        <div class="summary-row"><span>Diárias:</span> <strong>${reservaAtual.diarias}</strong></div>
        <div class="summary-row summary-total"><span>TOTAL:</span> <strong>R$ ${reservaAtual.total.toFixed(2)}</strong></div>
        <div class="summary-row summary-pix"><span>SINAL (50%):</span> <strong>R$ ${reservaAtual.sinal.toFixed(2)}</strong></div>
    `;

    const summaryEl = document.getElementById('summaryContent');
    if (summaryEl) summaryEl.innerHTML = summaryHtml;

    const summaryPaymentEl = document.getElementById('summaryContentPayment');
    if (summaryPaymentEl) summaryPaymentEl.innerHTML = summaryHtml;
}

// Blackcat Pay integration via Backend
async function createPixCharge(amount, description, customerData) {
    console.log('Frontend: Solicitando geração de PIX ao backend...', { amount, description, customerData });
    try {
        const response = await fetch('/api/pix/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                description: description,
                customer: customerData
            })
        });
        
        const data = await response.json();
        console.log('Frontend: Resposta do backend recebida:', data);

        if (!data.success) {
            console.error('Frontend: Erro retornado pelo backend:', data.message);
            throw new Error(data.message || 'Falha ao criar cobrança PIX');
        }
        
        return {
            qrCodeUrl: data.qrCodeUrl,
            copyPaste: data.copyPaste
        };
    } catch (err) {
        console.error('Frontend: Falha na requisição de PIX:', err);
        throw err;
    }
}

function prepararTelaPagamento() {
    const pixImg = document.getElementById('pixQrImg');
    if (pixImg) pixImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Reserva_Cabanas_di_Salerno';
    const pixCodeEl = document.getElementById('pixCode');
    if (pixCodeEl) pixCodeEl.innerText = 'Gerando PIX...';
}

async function confirmarEIrParaPagamento() {
    updateSummary();
    stepAtual = 4;
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step4').classList.add('active');
    updateButtonVisibility();

    prepararTelaPagamento();
    await gerarPix();
}

async function gerarPix() {
    // Calculate total amount to charge (using signal 50% as per UI)
    const amount = reservaAtual.sinal;
    const description = `Sinal Reserva Cabana ${reservaAtual.cabanaId} - ${reservaAtual.checkIn} to ${reservaAtual.checkOut}`;
    
    console.log('Iniciando gerarPix...', { amount, description });

    const customerData = {
        name: reservaAtual.nome,
        cpf: reservaAtual.cpf,
        phone: reservaAtual.telefone,
        email: 'contato@cabanasdisalerno.com.br' // E-mail padrão já que não pedimos no form
    };

    try {
        const pixData = await createPixCharge(amount, description, customerData);
        console.log('PIX gerado com sucesso!', pixData);

        // Update UI with PIX info
        const pixImg = document.getElementById('pixQrImg');
        if (pixImg && pixData.qrCodeUrl) {
            pixImg.src = pixData.qrCodeUrl;
        }
        const pixCodeEl = document.getElementById('pixCode');
        if (pixCodeEl) {
            pixCodeEl.innerText = pixData.copyPaste;
        }
    } catch (e) {
        console.error('Erro detalhado no gerarPix:', e);
        alert('Erro ao gerar PIX: ' + e.message);
    }
}

function openModal() {
    document.getElementById('modalReserva').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function openModalReserva() {
    if (!reservaAtual.cabanaId) {
        alert('Selecione uma cabana clicando em "FAZER MINHA RESERVA".');
        return;
    }

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
