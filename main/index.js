// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Variáveis globais
let entradas = [];
let saidas = [];
let currentUser = null;
let isAdmin = false;

// Observador de estado de autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';

        // Carregar dados do usuário
        loadUserData();

        // Atualizar último login
        db.collection('users').doc(user.uid).set({
            lastLogin: new Date()
        }, { merge: true });

    } else {
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('main-container').style.display = 'none';
    }
});


// Função para salvar dados no Firebase
function saveData() {
    if (!currentUser) return;

    const userRef = db.collection('users').doc(currentUser.uid);

    userRef.set({
        entradas: entradas,
        saidas: saidas,
        lastUpdate: new Date()
    }, { merge: true })
        .then(() => {
            console.log('Dados salvos com sucesso!');
            showSyncStatus('Dados salvos na nuvem!', 'success');
        })
        .catch(error => {
            console.error('Erro ao salvar dados:', error);
            showSyncStatus('Erro ao salvar dados!', 'error');
        });
}

// Função para carregar dados do Firebase
function loadUserData() {
    if (!currentUser) return;

    const userRef = db.collection('users').doc(currentUser.uid);

    userRef.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            entradas = data.entradas || [];
            saidas = data.saidas || [];

            // Atualizar interface
            renderizarTabelas();
            calcularTotais();

            showSyncStatus('Dados carregados!', 'success');
        } else {
            // Primeiro acesso - criar documento
            userRef.set({
                entradas: [],
                saidas: [],
                created: new Date()
            });
        }
    }).catch(error => {
        console.error('Erro ao carregar dados:', error);
        showSyncStatus('Erro ao carregar dados!', 'error');
    });
}

// Função de login
function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => showSyncStatus('Login realizado!', 'success'))
        .catch(error => {
            console.error('Erro de login:', error);
            showSyncStatus(`Erro: ${error.message}`, 'error');
        });
}

// Função de logout

function logout() {
    auth.signOut()
        .then(() => {
            showSyncStatus('Logout realizado com sucesso!', 'success');
        })
        .catch((error) => {
            showSyncStatus(`Erro: ${error.message}`, 'error');
        });
}



function showRegister() {
    // Remova esta linha: closeModal('loginModal'); 
    const registerModal = document.getElementById('registerModal');
    registerModal.style.display = 'block';
}



function backToLogin() {
    const registerModal = document.getElementById('registerModal');
    registerModal.style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
}


function closeModal(modalId) {
    let modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none"; // Esconde o modal
    } else {
        console.error(`Erro: O modal com ID '${modalId}' não foi encontrado.`);
    }
}



function register() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-password-confirm').value;

    if (password !== confirmPassword) {
        showSyncStatus('As senhas não coincidem!', 'error');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            closeModal('registerModal');
            showSyncStatus('Conta criada com sucesso!', 'success');
        })
        .catch(error => showSyncStatus(`Erro: ${error.message}`, 'error'));
}

function showSyncStatus(message, type) {
    alert(message); // Simples para testes; pode customizar depois
}

// Registrar o Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(() => console.log('Service Worker registrado!'))
        .catch(error => console.error('Erro ao registrar Service Worker:', error));
}


function adicionarEntrada() {
    const descricao = document.getElementById('descricaoEntrada').value;
    const valor = parseFloat(document.getElementById('valorEntrada').value);

    if (descricao && !isNaN(valor)) {
        entradas.push({ descricao, valor });
        renderizarTabelas();
        calcularTotais();
        saveData();
    }
}

function adicionarSaida() {
    const descricao = document.getElementById('descricaoSaida').value;
    const valor = parseFloat(document.getElementById('valorSaida').value);

    if (descricao && !isNaN(valor)) {
        saidas.push({ descricao, valor });
        renderizarTabelas();
        calcularTotais();
        saveData();
    }
}

function removerEntrada(index) {
    entradas.splice(index, 1);
    renderizarTabelas();
    calcularTotais();
    saveData();
}

function removerSaida(index) {
    saidas.splice(index, 1);
    renderizarTabelas();
    calcularTotais();
    saveData();
}



// Função de salvamento ÚNICA
function saveData() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).set({
        entradas: entradas,
        saidas: saidas,
        lastUpdate: new Date()
    }, { merge: true }) // IMPORTANTE: merge mantém outros campos
        .then(() => console.log("Dados salvos!"))
        .catch(error => console.error("Erro ao salvar:", error));
}

// Função de carregamento ÚNICA
function loadUserData() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                entradas = data.entradas || [];
                saidas = data.saidas || [];
                renderizarTabelas();
                calcularTotais();
            }
        })
        .catch(error => console.error("Erro ao carregar:", error));
}

function checkAdminStatus() {
    if (!currentUser) return;

    db.collection('admins').doc(currentUser.uid).get()
        .then(doc => {
            isAdmin = doc.exists;
        });
}


// Funções principais
function renderizarTabelas() {
    renderEntradas();
    renderSaidas();
}

function renderEntradas() {
    const tbody = document.querySelector('#tblEntradas tbody');
    tbody.innerHTML = '';

    entradas.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.descricao}</td>
            <td>${formatarMoeda(item.valor)}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="editarEntrada(${index})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="removerEntrada(${index})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSaidas() {
    const tbody = document.querySelector('#tblSaidas tbody');
    tbody.innerHTML = '';

    saidas.forEach((item, index) => {
        const tr = document.createElement('tr');

        // Obter cor da categoria
        const bgColor = getCategoriaColor(item.categoria);

        // Aplicar estilo de cor
        tr.style.backgroundColor = bgColor + '22';  // Adiciona transparência
        tr.style.borderLeft = `4px solid ${bgColor}`;

        tr.innerHTML = `
        <td>${item.categoria}</td>
        <td>${item.descricao}</td>
        <td>${formatarMoeda(item.valor)}</td>
        <td class="${item.status === 'Pago' ? 'pago' : 'pendente'}">${item.status}</td>
        <td class="actions">
            <button class="btn btn-primary btn-sm" onclick="editarSaida(${index})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="removerSaida(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
        tbody.appendChild(tr);
    });
}

// Função para obter cores em hexadecimal
function getCategoriaColor(categoria) {
    const colorMap = {
        "💳 Cartão de Crédito": "#4e73df",
        "🌐 Internet & Celular": "#1cc88a",
        "🧾 Contas Fixas": "#36b9cc",
        "💇 Cuidado Pessoal": "#f6c23e",
        "🔧 Manutenção": "#e74a3b",
        "🍔 Alimentação": "#858796",
        "⚰️ Outros Gastos": "#5a5c69",
        "💸 Outros Gastos": "#5a5c69"
    };
    return colorMap[categoria] || "#5a5c69";
}


function calcularTotais() {
    // Entradas
    const totalEntradas = entradas.reduce((sum, item) => sum + item.valor, 0);
    document.getElementById('totalEntradas').textContent = formatarMoeda(totalEntradas);
    document.getElementById('resumoEntradas').textContent = formatarMoeda(totalEntradas);
    document.getElementById('dashboard-entradas').textContent = formatarMoeda(totalEntradas);

    // Saídas
    const totalSaidas = saidas.reduce((sum, item) => sum + item.valor, 0);
    document.getElementById('totalSaidas').textContent = formatarMoeda(totalSaidas);
    document.getElementById('resumoSaidas').textContent = formatarMoeda(totalSaidas);
    document.getElementById('dashboard-saidas').textContent = formatarMoeda(totalSaidas);

    // Saldo
    const saldo = totalEntradas - totalSaidas;
    document.getElementById('saldoFinal').textContent = formatarMoeda(saldo);
    document.getElementById('dashboard-saldo').textContent = formatarMoeda(saldo);

    // Estilização do saldo
    const saldoElem = document.getElementById('dashboard-saldo');
    saldoElem.className = 'value ' + (saldo < 0 ? 'negative' : 'positive');

    // Salvar dados no Firebase
    saveData();

    // Atualizar gráficos
    if (document.getElementById('graficos').style.display !== 'none') {
        renderizarGraficos();
    }
}

// Funções para adicionar/editar entradas
function addEntrada() {
    document.getElementById('entradaDescricao').value = '';
    document.getElementById('entradaValor').value = '';
    openModal('entradaModal');
}

function saveEntrada() {
    const descricao = document.getElementById('entradaDescricao').value;
    const valor = parseFloat(document.getElementById('entradaValor').value.replace(',', '.'));

    if (!descricao || isNaN(valor)) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }

    entradas.push({ descricao, valor });
    closeModal('entradaModal');
    renderizarTabelas();
    calcularTotais();
}

function editarEntrada(index) {
    document.getElementById('entradaDescricao').value = entradas[index].descricao;
    document.getElementById('entradaValor').value = entradas[index].valor;
    openModal('entradaModal');

    // Substitui a entrada ao salvar
    const saveBtn = document.querySelector('#entradaModal .btn');
    saveBtn.onclick = function () {
        const descricao = document.getElementById('entradaDescricao').value;
        const valor = parseFloat(document.getElementById('entradaValor').value.replace(',', '.'));

        if (!descricao || isNaN(valor)) {
            alert('Por favor, preencha todos os campos corretamente!');
            return;
        }

        entradas[index] = { descricao, valor };
        closeModal('entradaModal');
        renderizarTabelas();
        calcularTotais();
    };
}

function removerEntrada(index) {
    if (confirm('Tem certeza que deseja remover esta entrada?')) {
        entradas.splice(index, 1);
        renderEntradas();
        calcularTotais();
    }
}

// Funções para adicionar/editar saídas
function addSaida() {
    document.getElementById('saidaCategoria').value = '💳 Cartão de Crédito';
    document.getElementById('saidaDescricao').value = '';
    document.getElementById('saidaValor').value = '';
    document.getElementById('saidaStatus').value = 'Pendente';
    document.getElementById('saidaVencimento').value = '';
    openModal('saidaModal');
}

function saveSaida() {
    const categoria = document.getElementById('saidaCategoria').value;
    const descricao = document.getElementById('saidaDescricao').value;
    const valor = parseFloat(document.getElementById('saidaValor').value.replace(',', '.'));
    const status = document.getElementById('saidaStatus').value;
    const vencimento = document.getElementById('saidaVencimento').value;

    if (!descricao || isNaN(valor)) {
        alert('Por favor, preencha todos os campos corretamente!');
        return;
    }

    saidas.push({ categoria, descricao, valor, status, vencimento });
    closeModal('saidaModal');
    renderizarTabelas();
    calcularTotais();

    // Verificar se é necessário enviar notificação
    if (vencimento) {
        const hoje = new Date();
        const dataVencimento = new Date(vencimento);
        const diffDias = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));

        if (diffDias <= 3 && diffDias >= 0) {
            const notification = {
                title: 'Conta próxima do vencimento',
                message: `A conta "${descricao}" vence em ${diffDias} dias`,
                timestamp: new Date().getTime()
            };
            saveNotification(notification);
        }
    }
}

function editarSaida(index) {
    document.getElementById('saidaCategoria').value = saidas[index].categoria;
    document.getElementById('saidaDescricao').value = saidas[index].descricao;
    document.getElementById('saidaValor').value = saidas[index].valor;
    document.getElementById('saidaStatus').value = saidas[index].status;
    document.getElementById('saidaVencimento').value = saidas[index].vencimento || '';
    openModal('saidaModal');

    // Substitui a saída ao salvar
    const saveBtn = document.querySelector('#saidaModal .btn');
    saveBtn.onclick = function () {
        const categoria = document.getElementById('saidaCategoria').value;
        const descricao = document.getElementById('saidaDescricao').value;
        const valor = parseFloat(document.getElementById('saidaValor').value.replace(',', '.'));
        const status = document.getElementById('saidaStatus').value;
        const vencimento = document.getElementById('saidaVencimento').value;

        if (!descricao || isNaN(valor)) {
            alert('Por favor, preencha todos os campos corretamente!');
            return;
        }

        saidas[index] = { categoria, descricao, valor, status, vencimento };
        closeModal('saidaModal');
        renderizarTabelas();
        calcularTotais();
    };
}

function removerSaida(index) {
    if (confirm('Tem certeza que deseja remover esta saída?')) {
        saidas.splice(index, 1);
        renderSaidas();
        calcularTotais();
    }
}

// Funções de gráficos
function renderizarGraficos() {
    // Gráfico de categorias
    const categorias = {};
    saidas.forEach(saida => {
        if (categorias[saida.categoria]) {
            categorias[saida.categoria] += saida.valor;
        } else {
            categorias[saida.categoria] = saida.valor;
        }
    });

    const categoriaCtx = document.getElementById('categoriaChart').getContext('2d');
    new Chart(categoriaCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categorias),
            datasets: [{
                data: Object.values(categorias),
                backgroundColor: [
                    'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
                    'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Gráfico de status
    const statusCount = {
        'Pago': saidas.filter(s => s.status === 'Pago').length,
        'Pendente': saidas.filter(s => s.status === 'Pendente').length
    };

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Pago', 'Pendente'],
            datasets: [{
                data: [statusCount.Pago, statusCount.Pendente],
                backgroundColor: ['var(--success)', 'var(--warning)']
            }]
        },
        options: {
            responsive: true
        }
    });

    // Gráfico comparativo
    const totalEntradas = entradas.reduce((sum, item) => sum + item.valor, 0);
    const totalSaidas = saidas.reduce((sum, item) => sum + item.valor, 0);

    const comparativoCtx = document.getElementById('comparativoChart').getContext('2d');
    new Chart(comparativoCtx, {
        type: 'bar',
        data: {
            labels: ['Entradas', 'Saídas'],
            datasets: [{
                label: 'Valores',
                data: [totalEntradas, totalSaidas],
                backgroundColor: ['var(--success)', 'var(--danger)']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico de evolução mensal (simulado)
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const entradasMensais = meses.map(() => Math.floor(Math.random() * 5000) + 2000);
    const saidasMensais = meses.map(() => Math.floor(Math.random() * 4500) + 1500);

    const evolucaoCtx = document.getElementById('evolucaoChart').getContext('2d');
    new Chart(evolucaoCtx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Entradas',
                    data: entradasMensais,
                    borderColor: 'var(--success)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Saídas',
                    data: saidasMensais,
                    borderColor: 'var(--danger)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Funções de notificação
function saveNotification(notification) {
    if (!currentUser) return;

    db.collection('notifications').add({
        userId: currentUser.uid,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        read: false
    });
}

function loadNotifications() {
    if (!currentUser) return;

    db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            const notificationList = document.getElementById('notification-list');
            notificationList.innerHTML = '';

            snapshot.forEach(doc => {
                const notification = doc.data();
                const item = document.createElement('div');
                item.className = 'notification-item';
                item.innerHTML = `
                    <strong>${notification.title}</strong>
                    <p>${notification.message}</p>
                    <small>${new Date(notification.timestamp).toLocaleString()}</small>
                `;
                notificationList.appendChild(item);
            });
        });
}

function sendNotification() {
    const email = document.getElementById('notification-email').value;
    const subject = document.getElementById('notification-subject').value;
    const message = document.getElementById('notification-message').value;

    if (!email || !subject || !message) {
        showSyncStatus('Por favor, preencha todos os campos!', 'error');
        return;
    }

    // Simulação de envio de email
    showSyncStatus(`Notificação enviada para ${email}`, 'success');

    // Limpar campos
    document.getElementById('notification-email').value = '';
    document.getElementById('notification-subject').value = '';
    document.getElementById('notification-message').value = '';
}

// Funções administrativas
function checkAdminStatus() {
    if (!currentUser) return;

    // Verificar se o usuário é admin (neste exemplo, qualquer usuário é admin)
    isAdmin = true;
    document.getElementById('admin-tab').style.display = isAdmin ? 'block' : 'none';

    if (isAdmin) {
        loadAdminUsers();
        loadNotifications();
    }
}

function loadAdminUsers() {
    db.collection('users').get().then(snapshot => {
        const usersTable = document.getElementById('admin-users');
        usersTable.innerHTML = '';

        snapshot.forEach(doc => {
            const user = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</td>
            `;
            usersTable.appendChild(tr);
        });
    });
}

// Funções de persistência

function saveData() {
    if (!currentUser) return;

    const data = {
        entradas: entradas,
        saidas: saidas,
        timestamp: new Date().getTime()
    };

    db.collection('users').doc(currentUser.uid).set(data, { merge: true })
        .then(() => {
            console.log('Dados salvos no Firebase');
        })
        .catch(error => {
            console.error('Erro ao salvar dados:', error);
        });
}

function loadUserData() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                entradas = data.entradas || [];
                saidas = data.saidas || [];
                renderizarTabelas();
                calcularTotais();

                // Atualizar último login
                db.collection('users').doc(currentUser.uid).set({
                    email: currentUser.email,
                    lastLogin: new Date().getTime()
                }, { merge: true });
            }
        });
}

// Funções auxiliares
function formatarMoeda(valor) {
    return 'R$ ' + parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName).style.display = 'block';
    event.currentTarget.classList.add('active');

    if (tabName === 'graficos') {
        renderizarGraficos();
    } else if (tabName === 'admin' && isAdmin) {
        loadAdminUsers();
        loadNotifications();
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function resetData() {
    if (confirm('Tem certeza que deseja reiniciar todos os dados? Isso apagará todas as informações atuais.')) {
        entradas = [];
        saidas = [];
        renderizarTabelas();
        calcularTotais();
    }
}

function showSyncStatus(message, type = 'info') {
    const syncStatus = document.getElementById('syncStatus');
    const syncMessage = document.getElementById('syncMessage');

    syncMessage.textContent = message;
    syncStatus.className = 'sync-status';

    // Define a cor baseada no tipo
    if (type === 'success') {
        syncStatus.style.backgroundColor = 'var(--success)';
    } else if (type === 'error') {
        syncStatus.style.backgroundColor = 'var(--danger)';
    } else if (type === 'warning') {
        syncStatus.style.backgroundColor = 'var(--warning)';
        syncMessage.style.color = '#000';
    } else {
        syncStatus.style.backgroundColor = 'var(--primary)';
    }

    // Esconde após 3 segundos
    setTimeout(() => {
        syncStatus.className = 'sync-status hidden';
    }, 3000);
}

// Geração de PDF
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.text("Relatório Financeiro", 105, 20, null, null, 'center');
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 105, 28, null, null, 'center');

    // Tabela de Entradas
    doc.autoTable({
        startY: 35,
        head: [['Descrição', 'Valor (R$)']],
        body: entradas.map(item => [item.descricao, formatarMoeda(item.valor)]),
        theme: 'grid',
        headStyles: { fillColor: [26, 42, 108] },
        margin: { top: 10 }
    });

    // Tabela de Saídas
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Categoria', 'Descrição', 'Valor (R$)', 'Status']],
        body: saidas.map(item => [item.categoria, item.descricao, formatarMoeda(item.valor), item.status]),
        theme: 'grid',
        headStyles: { fillColor: [26, 42, 108] },
        didDrawCell: function (data) {
            if (data.section === 'body' && data.column.index === 3) {
                if (data.cell.raw === 'Pago') {
                    doc.setTextColor(21, 87, 36);
                    doc.setFillColor(212, 237, 218);
                } else {
                    doc.setTextColor(133, 100, 4);
                    doc.setFillColor(255, 243, 205);
                }
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                doc.text(data.cell.raw, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2, { align: 'center' });
                return false;
            }
        }
    });

    // Resumo
    const totalEntradas = entradas.reduce((a, b) => a + b.valor, 0);
    const totalSaidas = saidas.reduce((a, b) => a + b.valor, 0);
    const saldo = totalEntradas - totalSaidas;

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        body: [
            ['Total de Entradas', formatarMoeda(totalEntradas)],
            ['Total de Saídas', formatarMoeda(totalSaidas)],
            ['Saldo Final', formatarMoeda(saldo)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [26, 42, 108] },
        bodyStyles: { fontSize: 14 },
        styles: { fontStyle: 'bold' },
        didDrawCell: function (data) {
            if (data.section === 'body' && data.row.index === 2) {
                doc.setTextColor(saldo < 0 ? 231 : 46, saldo < 0 ? 76 : 204, saldo < 0 ? 60 : 113);
            }
        }
    });

    doc.save(`relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Funções de backup
function exportData() {
    const data = {
        entradas: entradas,
        saidas: saidas
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup-financeiro.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    showSyncStatus('Backup exportado com sucesso!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            entradas = data.entradas || [];
            saidas = data.saidas || [];
            renderizarTabelas();
            calcularTotais();
            showSyncStatus('Dados importados com sucesso!', 'success');
        } catch (error) {
            showSyncStatus('Erro ao importar dados. Arquivo inválido!', 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}

// Funções de compartilhamento
function generateShareLink() {
    const shareLink = `${window.location.origin}${window.location.pathname}?share=true`;
    document.getElementById('shareLink').value = shareLink;
    showSyncStatus('Link gerado com sucesso!', 'success');
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    showSyncStatus('Link copiado para a área de transferência!', 'success');
}

// Funções de sincronização
function saveToCloud() {
    showSyncStatus('Salvando dados na nuvem...', 'info');
    saveData();
    setTimeout(() => {
        showSyncStatus('Dados salvos na nuvem com sucesso!', 'success');
    }, 1500);
}

function loadFromCloud() {
    showSyncStatus('Carregando dados da nuvem...', 'info');
    loadUserData();
    setTimeout(() => {
        showSyncStatus('Dados carregados da nuvem com sucesso!', 'success');
    }, 1500);
}

// PWA: Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration.scope);
            })
            .catch(error => {
                console.log('Falha ao registrar Service Worker:', error);
            });
    });
}

// PWA: Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostrar botão de instalação
    const installBtn = document.createElement('button');
    installBtn.textContent = 'Instalar App';
    installBtn.className = 'btn btn-primary';
    installBtn.style.position = 'fixed';
    installBtn.style.bottom = '20px';
    installBtn.style.left = '20px';
    installBtn.style.zIndex = '1000';

    installBtn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choiceResult => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuário aceitou a instalação');
            }
            deferredPrompt = null;
        });
    });

    document.body.appendChild(installBtn);
});
