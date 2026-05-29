// Dados das Cabanas
const cabanas = [
    {
        id: 'campanella',
        nome: 'Cabana Campanella',
        foto: 'images/cc76537181e343a3bacc8b10ef797810.jpg',
        valor: 850.00,
        capacidade: 2
    },
    {
        id: 'indrieri',
        nome: 'Cabana Indrieri',
        foto: 'images/bc381271a59848728a39e5f1acd61c6d.jpg',
        valor: 900.00,
        capacidade: 2
    },
    {
        id: 'antunia',
        nome: 'Cabana Bella Antunia',
        foto: 'images/3ef4048cb6854a82bf58cdc5ab46a078.jpg',
        valor: 800.00,
        capacidade: 2
    },
    {
        id: 'salerno',
        nome: 'Cabana Salerno',
        foto: 'images/5ccf37b3cf424a2ca0aae0fdec0efcde.jpg',
        valor: 1500.00,
        capacidade: 4
    }
];

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

document.addEventListener('DOMContentLoaded', () => {
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
                        <div id="cabanasList"></div>
                    </div>

                    <!-- Step 2: Datas -->
                    <div id="step2" class="step">
                        <h3>2. Seleção de Datas</h3>
                        <div class="form-group">
                            <label>Período de Estadia (Chegada e Saída)</label>
                            <input type="text" id="dateRange" placeholder="Selecione o período">
                        </div>
                        <p id="diariasInfo" style="font-weight: bold; color: #3d85c6;"></p>
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

    // Event Listeners
    document.querySelector('.close-reserva').onclick = () => closeModal();
    document.getElementById('btnNext').onclick = () => moveStep(1);
    document.getElementById('btnPrev').onclick = () => moveStep(-1);
    document.getElementById('btnConfirm').onclick = () => finishBooking();

    // Init Cabanas List
    const list = document.getElementById('cabanasList');
    cabanas.forEach(c => {
        const item = document.createElement('div');
        item.className = 'cabin-item';
        item.innerHTML = `
            <img src="${c.foto}" class="cabin-img">
            <div class="cabin-info">
                <h3>${c.nome}</h3>
                <p>Capacidade: ${c.capacidade} pessoas</p>
                <p class="cabin-price">R$ ${c.valor.toFixed(2)} / diária</p>
            </div>
        `;
        item.onclick = () => selectCabin(c.id, item);
        list.appendChild(item);
    });

    // Initialize Flatpickr for Date Range
    flatpickr("#dateRange", {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: "pt",
        onClose: function(selectedDates) {
            if (selectedDates.length === 2) {
                const start = selectedDates[0];
                const end = selectedDates[1];
                const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                
                reservaAtual.diarias = diff;
                reservaAtual.checkIn = start.toLocaleDateString('pt-BR');
                reservaAtual.checkOut = end.toLocaleDateString('pt-BR');
                document.getElementById('diariasInfo').innerText = `Total de diárias: ${diff}`;
            } else {
                reservaAtual.diarias = 0;
                document.getElementById('diariasInfo').innerText = '';
            }
        }
    });

    // Masks
    document.getElementById('respCpf').oninput = (e) => maskCpf(e.target);
    document.getElementById('respTel').oninput = (e) => maskTel(e.target);
});

function openModal() {
    document.getElementById('modalReserva').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalReserva').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function selectCabin(id, element) {
    reservaAtual.cabanaId = id;
    document.querySelectorAll('.cabin-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

function moveStep(dir) {
    if (dir === 1 && !validateStep(stepAtual)) return;

    stepAtual += dir;

    // Update UI
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${stepAtual}`).classList.add('active');

    // Footer buttons
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
    if (step === 1) {
        if (!reservaAtual.cabanaId) {
            alert('Por favor, selecione uma cabana.');
            return false;
        }
    }
    if (step === 2) {
        if (!reservaAtual.checkIn || !reservaAtual.checkOut || reservaAtual.diarias <= 0) {
            alert('Selecione o período de estadia (data de entrada e saída).');
            return false;
        }
    }
    if (step === 4) {
        const nome = document.getElementById('respNome').value;
        const cpf = document.getElementById('respCpf').value;
        const tel = document.getElementById('respTel').value;
        if (!nome || cpf.length < 14 || tel.length < 14) {
            alert('Preencha todos os dados corretamente.');
            return false;
        }
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
        if (novo >= 1 && (val < 0 || totalAtual < cabana.capacidade)) {
            reservaAtual.adultos = novo;
        } else if (val > 0) {
            showCapacityWarning();
        }
    } else {
        const novo = reservaAtual.criancas + val;
        if (novo >= 0 && (val < 0 || totalAtual < cabana.capacidade)) {
            reservaAtual.criancas = novo;
        } else if (val > 0) {
            showCapacityWarning();
        }
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

    const html = `
        <div class="summary-row"><span>Cabana:</span> <strong>${cabana.nome}</strong></div>
        <div class="summary-row"><span>Valor da Diária:</span> <strong>R$ ${cabana.valor.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Período:</span> <strong>${reservaAtual.checkIn} até ${reservaAtual.checkOut}</strong></div>
        <div class="summary-row"><span>Diárias:</span> <strong>${reservaAtual.diarias}</strong></div>
        <div class="summary-row"><span>Hóspedes:</span> <strong>${reservaAtual.adultos} Adulto(s), ${reservaAtual.criancas} Criança(s)</strong></div>
        <div class="summary-row summary-total"><span>VALOR TOTAL:</span> <strong>R$ ${reservaAtual.total.toFixed(2)}</strong></div>
        <div class="summary-row summary-pix"><span>SINAL PIX (50%):</span> <strong>R$ ${reservaAtual.sinal.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Restante no Check-in:</span> <strong>R$ ${reservaAtual.restante.toFixed(2)}</strong></div>
    `;
    document.getElementById('summaryContent').innerHTML = html;
}

function finishBooking() {
    alert(`Pagamento Confirmado! Sua reserva na ${reservaAtual.cabanaId} para as datas ${reservaAtual.checkIn} a ${reservaAtual.checkOut} foi salva com sucesso.`);
    
    // Simulação de bloqueio de datas
    const bloqueios = JSON.parse(localStorage.getItem('bloqueios') || '[]');
    bloqueios.push({
        cabanaId: reservaAtual.cabanaId,
        inicio: reservaAtual.checkIn,
        fim: reservaAtual.checkOut
    });
    localStorage.setItem('bloqueios', JSON.stringify(bloqueios));
    
    closeModal();
    window.location.reload();
}

// Masks helpers
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

// Global functions for buttons
window.changeGuest = changeGuest;
window.copyPix = copyPix;
window.openModalReserva = openModal;
