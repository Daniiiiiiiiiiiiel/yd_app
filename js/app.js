import { db } from "./firebase.js";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";



document.addEventListener('DOMContentLoaded', () => {
    // Views
    const dashboardView = document.getElementById('dashboardView');
    const clientDetailsView = document.getElementById('clientDetailsView');

    // UI Elements
    const clientListContainer = document.getElementById('clientList');
    const addClientBtn = document.getElementById('addClientBtn');
    const clientModal = document.getElementById('clientModal');
    const closeModal = document.getElementById('closeModal');
    const clientForm = document.getElementById('clientForm');
    const imageModal = document.getElementById('imageModal');
    const closeImageModal = document.getElementById('closeImageModal');
    const fullImage = document.getElementById('fullImage');
    const paymentProofInput = document.getElementById('paymentProof');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const searchInput = document.getElementById('searchInput');

    // Detail View Elements
    const backBtn = document.getElementById('backBtn');
    const editClientBtn = document.getElementById('editClientBtn');
    const deleteClientBtn = document.getElementById('deleteClientBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editActions = document.getElementById('editActions');

    // Detail Fields & Edit Inputs
    const detailUserNumber = document.getElementById('detailUserNumber');
    const detailProfiles = document.getElementById('detailProfiles');
    const detailPurchaseDate = document.getElementById('detailPurchaseDate');
    const editDetailUserNumber = document.getElementById('editDetailUserNumber');
    const editDetailProfiles = document.getElementById('editDetailProfiles');
    const editDetailPurchaseDate = document.getElementById('editDetailPurchaseDate');

    const viewModes = document.querySelectorAll('.view-mode');
    const editModes = document.querySelectorAll('.edit-mode');

    // Detail Fields
    const detailExp = document.getElementById('detailExp');
    const detailRefund = document.getElementById('detailRefund');
    const detailSupport = document.getElementById('detailSupport');
    const detailPaymentImage = document.getElementById('detailPaymentImage');
    const detailNoPayment = document.getElementById('detailNoPayment');

    let currentImageBase64 = null;
    let currentDetailClientId = null;
    let allClients = [];
    onSnapshot(collection(db, "clientes"), (snapshot) => {
        allClients = [];
        snapshot.forEach((docSnap) => {
            allClients.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        refreshView();
    });


    // Event Listeners
    addClientBtn.addEventListener('click', () => {
        openModal();
    });

    closeModal.addEventListener('click', () => {
        clientModal.classList.add('hidden');
    });

    closeImageModal.addEventListener('click', () => {
        imageModal.classList.add('hidden');
    });

    removeImageBtn.addEventListener('click', () => {
        currentImageBase64 = null;
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        paymentProofInput.value = '';
    });

    paymentProofInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                currentImageBase64 = reader.result;
                imagePreview.src = currentImageBase64;
                imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('clientId').value;
        const userNumber = document.getElementById('userNumber').value;
        const profilesCount = document.getElementById('profilesCount').value;
        const purchaseDate = document.getElementById('purchaseDate').value;

        const clientData = {
            userNumber,
            profilesCount,
            purchaseDate,
            paymentProof: currentImageBase64 // guardamos base64 directo
        };

        if (id) {
            await updateDoc(doc(db, "clientes", id), clientData);
        } else {
            await addDoc(collection(db, "clientes"), clientData);
        }

        clientModal.classList.add('hidden');
    });



    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allClients.filter(c => c.userNumber.toLowerCase().includes(term));
        renderClientList(filtered);
    });

    // Navigation
    backBtn.addEventListener('click', () => {
        toggleEditMode(false);
        clientDetailsView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
    });

    editClientBtn.addEventListener('click', () => {
        toggleEditMode(true);
    });

    saveEditBtn.addEventListener('click', () => {
        if (!currentDetailClientId) return;
        const client = allClients.find(c => c.id === currentDetailClientId);

        const updatedClient = {
            ...client,
            userNumber: editDetailUserNumber.value,
            profilesCount: editDetailProfiles.value,
            purchaseDate: editDetailPurchaseDate.value
        };

        const index = allClients.findIndex(c => c.id === currentDetailClientId);
        allClients[index] = updatedClient;

        refreshView();
        showClientDetails(updatedClient);
        toggleEditMode(false);
    });

    cancelEditBtn.addEventListener('click', () => {
        toggleEditMode(false);
    });

    deleteClientBtn.addEventListener('click', async () => {
        if (!currentDetailClientId) return;

        if (confirm('¿Seguro que quieres eliminar este cliente?')) {
            await deleteDoc(doc(db, "clientes", currentDetailClientId));
            clientDetailsView.classList.add('hidden');
        }
    });



    function toggleEditMode(isEditing) {
        if (isEditing) {
            editClientBtn.classList.add('hidden');
            editActions.classList.remove('hidden');

            const client = allClients.find(c => c.id === currentDetailClientId);
            editDetailUserNumber.value = client.userNumber;
            editDetailProfiles.value = client.profilesCount;
            editDetailPurchaseDate.value = client.purchaseDate;

            viewModes.forEach(el => el.classList.add('hidden'));
            editModes.forEach(el => el.classList.remove('hidden'));
        } else {
            editClientBtn.classList.remove('hidden');
            editActions.classList.add('hidden');
            viewModes.forEach(el => el.classList.remove('hidden'));
            editModes.forEach(el => el.classList.add('hidden'));
        }
    }

    detailPaymentImage.addEventListener('click', () => {
        fullImage.src = detailPaymentImage.src;
        imageModal.classList.remove('hidden');
    });

    // Functions
    function refreshView() {
        allClients.sort((a, b) => parseLocalDate(b.purchaseDate) - parseLocalDate(a.purchaseDate));
        renderClientList(allClients);
    }

    function renderClientList(clients) {
        clientListContainer.innerHTML = '';
        if (clients.length === 0) {
            document.getElementById('emptyState').classList.remove('hidden');
            return;
        }
        document.getElementById('emptyState').classList.add('hidden');

        clients.forEach(client => {
            const card = document.createElement('div');
            card.className = 'client-card';
            card.onclick = () => showClientDetails(client);

            const purchaseDate = parseLocalDate(client.purchaseDate);

            card.innerHTML = `
                <div class="card-info">
                    <h3>${client.userNumber}</h3>
                    <p>Comprado el: ${formatDate(purchaseDate)}</p>
                </div>
                <i data-lucide="chevron-right" class="card-arrow"></i>
            `;
            clientListContainer.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
    }

    function showClientDetails(client) {
        currentDetailClientId = client.id;
        toggleEditMode(false);

        detailUserNumber.innerText = client.userNumber;
        detailProfiles.innerText = client.profilesCount;

        const purchase = parseLocalDate(client.purchaseDate);
        detailPurchaseDate.innerText = formatDate(purchase);

        const expDate = new Date(purchase); expDate.setDate(purchase.getDate() + 30);
        const refundDate = new Date(purchase); refundDate.setDate(purchase.getDate() + 10);
        const supportDate = new Date(purchase); supportDate.setDate(purchase.getDate() + 20);

        const expRemaining = getDaysFromNow(expDate);
        const refundRemaining = getDaysFromNow(refundDate);
        const supportRemaining = getDaysFromNow(supportDate);

        setStatus(detailExp, expRemaining);
        setStatus(detailRefund, refundRemaining);
        setStatus(detailSupport, supportRemaining);

        if (client.paymentProof) {
            detailPaymentImage.src = client.paymentProof;
            detailPaymentImage.classList.remove('hidden');
            detailNoPayment.classList.add('hidden');
        } else {
            detailPaymentImage.classList.add('hidden');
            detailNoPayment.classList.remove('hidden');
        }

        dashboardView.classList.add('hidden');
        clientDetailsView.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function openModal(client = null) {
        document.getElementById('modalTitle').innerText = client ? 'Editar Cliente' : 'Nuevo Cliente';
        document.getElementById('clientId').value = client ? client.id : '';
        document.getElementById('userNumber').value = client ? client.userNumber : '';
        document.getElementById('profilesCount').value = client ? client.profilesCount : '1';
        document.getElementById('purchaseDate').value = client ? client.purchaseDate : new Date().toISOString().split('T')[0];

        currentImageBase64 = client ? client.paymentProof : null;
        if (currentImageBase64) {
            imagePreview.src = currentImageBase64;
            imagePreviewContainer.classList.remove('hidden');
        } else {
            imagePreviewContainer.classList.add('hidden');
            paymentProofInput.value = '';
        }

        clientModal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function parseLocalDate(dateString) {
        if (!dateString) return new Date();
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    function formatDate(date) {
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    function setStatus(element, days) {
        let text = `${days} días`;
        let statusClass = 'status-active';

        if (days < 0) {
            text = 'Expirado';
            statusClass = 'status-expired';
        } else if (days === 0) {
            text = 'Vence Hoy';
            statusClass = 'status-warning';
        } else if (days <= 3) {
            statusClass = 'status-warning';
        }

        element.innerText = text;
        element.className = `status-value ${statusClass}`;
    }

    function getDaysFromNow(targetDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diffTime = targetDate - today;
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }
});
