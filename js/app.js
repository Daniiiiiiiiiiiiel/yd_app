import { db } from "./firebase.js";
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // === VIEWS ===
    const dashboardView = document.getElementById('dashboardView');
    const accountDetailsView = document.getElementById('accountDetailsView');
    const profileDetailsView = document.getElementById('profileDetailsView');

    // === DASHBOARD ELEMENTS ===
    const accountListContainer = document.getElementById('accountList');
    const searchInput = document.getElementById('searchInput');
    const addAccountBtn = document.getElementById('addAccountBtn');

    // === ACCOUNT MODAL ELEMENTS ===
    const accountModal = document.getElementById('accountModal');
    const closeAccountModal = document.getElementById('closeAccountModal');
    const accountForm = document.getElementById('accountForm');
    const accountNameInput = document.getElementById('accountNameInput');
    const accountDateInput = document.getElementById('accountDateInput');
    const cancelAccountBtn = document.getElementById('cancelAccountBtn');
    const accountIdHidden = document.getElementById('accountId');
    const modalAccountTitle = document.getElementById('modalAccountTitle');

    // === PROFILE MODAL ELEMENTS ===
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const profileForm = document.getElementById('profileForm');
    const profileNumberInput = document.getElementById('profileNumberInput');
    const profileDateInput = document.getElementById('profileDateInput');
    const profilePaymentProof = document.getElementById('profilePaymentProof');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const profileImagePreviewContainer = document.getElementById('profileImagePreviewContainer');
    const removeProfileImageBtn = document.getElementById('removeProfileImageBtn');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const modalProfileTitle = document.getElementById('modalProfileTitle');

    // === ACCOUNT DETAILS VIEW ELEMENTS ===
    const backToDashBtn = document.getElementById('backToDashBtn');
    const editAccountBtn = document.getElementById('editAccountBtn');
    const editAccountActions = document.getElementById('editAccountActions');
    const saveAccountEditBtn = document.getElementById('saveAccountEditBtn');
    const cancelAccountEditBtn = document.getElementById('cancelAccountEditBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    const detailAccountName = document.getElementById('detailAccountName');
    const detailAccountDate = document.getElementById('detailAccountDate');
    const editDetailAccountName = document.getElementById('editDetailAccountName');
    const editDetailAccountDate = document.getElementById('editDetailAccountDate');

    const profilesList = document.getElementById('profilesList');

    // === PROFILE DETAILS VIEW ELEMENTS ===
    const backToAccountBtn = document.getElementById('backToAccountBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileActions = document.getElementById('editProfileActions');
    const saveProfileEditBtn = document.getElementById('saveProfileEditBtn');
    const cancelProfileEditBtn = document.getElementById('cancelProfileEditBtn');
    const deleteProfileBtn = document.getElementById('deleteProfileBtn');

    const detailProfileNumber = document.getElementById('detailProfileNumber');
    const detailProfileDate = document.getElementById('detailProfileDate');
    const editDetailProfileNumber = document.getElementById('editDetailProfileNumber');
    const editDetailProfileDate = document.getElementById('editDetailProfileDate');

    const profileExp = document.getElementById('profileExp');
    const profileRefund = document.getElementById('profileRefund');
    const profileSupport = document.getElementById('profileSupport');

    const detailPaymentImage = document.getElementById('detailPaymentImage');
    const detailNoPayment = document.getElementById('detailNoPayment');
    const editProfileImageContainer = document.getElementById('editProfileImageContainer');
    const editPaymentProof = document.getElementById('editPaymentProof');

    const imageModal = document.getElementById('imageModal');
    const closeImageModal = document.getElementById('closeImageModal');
    const fullImage = document.getElementById('fullImage');

    // === NEW PAYMENT ELEMENTS ===
    const profilePaymentMethod = document.getElementById('profilePaymentMethod');
    const profileDigitalContent = document.getElementById('profileDigitalContent');
    const editProfilePaymentMethod = document.getElementById('editProfilePaymentMethod');
    const editProfileMethodContainer = document.getElementById('editProfileMethodContainer');
    const detailPhysicalPayment = document.getElementById('detailPhysicalPayment');


    // === STATE ===
    let allAccounts = [];
    let currentAccount = null;
    let currentProfileIndex = null; // 0-4
    let tempProfileImageBase64 = null;
    let tempEditProfileImageBase64 = null;

    // === REALTIME DB ===
    onSnapshot(collection(db, "cuentas"), (snapshot) => {
        allAccounts = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // Normalize profiles to 5 fixed slots
            let profilesFixed = [null, null, null, null, null];
            if (data.profiles && Array.isArray(data.profiles)) {
                for (let i = 0; i < 5; i++) {
                    profilesFixed[i] = data.profiles[i] || null;
                }
            }

            allAccounts.push({
                id: docSnap.id,
                accountName: data.accountName || "",
                defaultDate: data.defaultDate || "",
                profiles: profilesFixed
            });
        });
        refreshDashboard();

        // Handle Active Account Updates
        if (currentAccount) {
            const updated = allAccounts.find(a => a.id === currentAccount.id);
            if (updated) {
                currentAccount = updated;

                // ALWAYS re-render the Account List view, so if we go "Back" it is fresh
                renderAccountDetails(updated);

                // If we are specifically viewing a profile, verify/render it too
                if (!profileDetailsView.classList.contains('hidden') && currentProfileIndex !== null) {
                    if (updated.profiles[currentProfileIndex]) {
                        renderProfileDetails(updated, currentProfileIndex);
                    } else {
                        // Profile deleted remotely?
                        goAccountView();
                    }
                }
            } else {
                // Account deleted
                goHome();
            }
        }
    });

    function goBackToAccount() {
        if (currentAccount) {
            goAccountView();
        } else {
            goHome();
        }
    }


    // === NAVIGATION ===
    function goHome() {
        dashboardView.classList.remove('hidden');
        accountDetailsView.classList.add('hidden');
        profileDetailsView.classList.add('hidden');
        currentAccount = null;
        currentProfileIndex = null;
        closeAccountModalFn();
        closeProfileModalFn();
    }

    function goAccountView() {
        dashboardView.classList.add('hidden');
        accountDetailsView.classList.remove('hidden');
        profileDetailsView.classList.add('hidden');
        currentProfileIndex = null;
    }

    function goProfileView() {
        dashboardView.classList.add('hidden');
        accountDetailsView.classList.add('hidden');
        profileDetailsView.classList.remove('hidden');
    }

    backToDashBtn.addEventListener('click', goHome);
    backToAccountBtn.addEventListener('click', goAccountView);


    // === DASHBOARD LOGIC ===
    function refreshDashboard() {
        allAccounts.sort((a, b) => new Date(b.defaultDate) - new Date(a.defaultDate));
        searchAndRender(searchInput.value);
    }

    searchInput.addEventListener('input', (e) => searchAndRender(e.target.value));

    function searchAndRender(term) {
        term = term.toLowerCase();
        accountListContainer.innerHTML = '';

        const filtered = allAccounts.filter(acc => {
            if (acc.accountName.toLowerCase().includes(term)) return true;
            return acc.profiles.some(p => p && p.number && p.number.toLowerCase().includes(term));
        });

        if (filtered.length === 0) {
            document.getElementById('emptyState').classList.remove('hidden');
        } else {
            document.getElementById('emptyState').classList.add('hidden');
            filtered.forEach(acc => {
                const card = document.createElement('div');
                card.className = 'client-card';
                card.onclick = () => showAccount(acc);

                const date = parseLocalDate(acc.defaultDate);
                const profCount = acc.profiles.filter(p => p !== null).length;

                card.innerHTML = `
                    <div class="card-info">
                        <h3>${acc.accountName}</h3>
                        <p>Fecha Compra: ${formatDate(date)}</p>
                        <p style="font-size: 0.8rem; margin-top: 4px; color: #aaa;">
                           ${profCount} / 5 Perfiles
                        </p>
                    </div>
                    <i data-lucide="chevron-right" class="card-arrow"></i>
                `;
                accountListContainer.appendChild(card);
            });
        }
        if (window.lucide) lucide.createIcons();
    }


    // === CREATE ACCOUNT LOGIC ===
    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', () => {
            openAccountModal();
        });
    }

    function openAccountModal(account = null) {
        modalAccountTitle.innerText = account ? 'Editar Cuenta' : 'Nueva Cuenta';
        accountIdHidden.value = account ? account.id : '';
        accountNameInput.value = account ? account.accountName : '';
        accountDateInput.value = account ? account.defaultDate : new Date().toISOString().split('T')[0];
        accountModal.classList.remove('hidden');
    }

    function closeAccountModalFn() {
        accountModal.classList.add('hidden');
        accountForm.reset();
    }

    closeAccountModal.addEventListener('click', closeAccountModalFn);
    cancelAccountBtn.addEventListener('click', closeAccountModalFn);

    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = accountNameInput.value;
        const date = accountDateInput.value;
        const id = accountIdHidden.value;

        if (id) {
            // Edit Account Info Only
            await updateDoc(doc(db, "cuentas", id), {
                accountName: name,
                defaultDate: date
            });
        } else {
            // Create New
            await addDoc(collection(db, "cuentas"), {
                accountName: name,
                defaultDate: date,
                profiles: [null, null, null, null, null]
            });
        }
        closeAccountModalFn();
    });


    // === ACCOUNT DETAILS LOGIC ===
    function showAccount(account) {
        currentAccount = account;
        renderAccountDetails(account);
        toggleAccountEditMode(false);
        goAccountView();
    }

    function renderAccountDetails(account) {
        detailAccountName.innerText = account.accountName;
        detailAccountDate.innerText = formatDate(parseLocalDate(account.defaultDate));

        profilesList.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const profile = account.profiles[i];

            const card = document.createElement('div');
            card.className = 'profile-item';

            if (profile) {
                // Occupied
                card.style.cursor = 'pointer';
                card.onclick = () => showProfile(i);
                card.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <span class="profile-index" style="background:var(--primary-color); color:white;">#${i + 1}</span>
                        <div style="display:flex; flex-direction:column; margin-left:8px;">
                            <span class="profile-number" style="font-weight:bold;">${profile.number}</span>
                            <span style="font-size:0.75rem; color:#aaa;">${formatDate(parseLocalDate(profile.purchaseDate))}</span>
                        </div>
                    </div>
                    <i data-lucide="chevron-right" style="width:16px; color:#666;"></i>
                `;
            } else {
                // Empty
                card.style.opacity = '0.7';
                card.style.border = '1px dashed #555';
                card.style.cursor = 'pointer';
                card.onclick = () => openProfileModal(i);

                card.innerHTML = `
                    <div style="display:flex; align-items:center;">
                         <span class="profile-index" style="background:transparent; color:#555;">#${i + 1}</span>
                         <span style="margin-left:10px; color:#777; font-style:italic;">Disponible</span>
                    </div>
                    <div style="background: var(--surface-light); padding: 5px; border-radius: 50%; display: flex;">
                        <i data-lucide="plus" style="width:16px; height:16px; color:var(--primary-color);"></i>
                    </div>
                `;
            }
            profilesList.appendChild(card);
        }

        if (window.lucide) lucide.createIcons();
    }

    function toggleAccountEditMode(isEditing) {
        if (isEditing) {
            editAccountBtn.classList.add('hidden');
            editAccountActions.classList.remove('hidden');
            editDetailAccountName.value = currentAccount.accountName;
            editDetailAccountDate.value = currentAccount.defaultDate;
            detailAccountName.classList.add('hidden');
            detailAccountDate.classList.add('hidden');
            editDetailAccountName.classList.remove('hidden');
            editDetailAccountDate.classList.remove('hidden');
        } else {
            editAccountBtn.classList.remove('hidden');
            editAccountActions.classList.add('hidden');
            detailAccountName.classList.remove('hidden');
            detailAccountDate.classList.remove('hidden');
            editDetailAccountName.classList.add('hidden');
            editDetailAccountDate.classList.add('hidden');
        }
    }

    editAccountBtn.addEventListener('click', () => toggleAccountEditMode(true));
    cancelAccountEditBtn.addEventListener('click', () => toggleAccountEditMode(false));

    saveAccountEditBtn.addEventListener('click', async () => {
        if (!currentAccount) return;
        await updateDoc(doc(db, "cuentas", currentAccount.id), {
            accountName: editDetailAccountName.value,
            defaultDate: editDetailAccountDate.value
        });
        toggleAccountEditMode(false);
    });

    deleteAccountBtn.addEventListener('click', async () => {
        if (!currentAccount) return;
        showConfirm("¿Eliminar Cuenta?", "Se borrarán todos los perfiles asociados. No se puede deshacer.", async () => {
            await deleteDoc(doc(db, "cuentas", currentAccount.id));
            // goHome handled by onSnapshot
        });
    });


    // === CUSTOM CONFIRM MODAL ===
    const customConfirmModal = document.getElementById('customConfirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const btnConfirmCancel = document.getElementById('btnConfirmCancel');
    const btnConfirmOk = document.getElementById('btnConfirmOk');

    let confirmCallback = null;

    function showConfirm(title, message, onConfirm) {
        confirmTitle.innerText = title;
        confirmMessage.innerText = message;
        confirmCallback = onConfirm;
        customConfirmModal.classList.add('active');
    }

    function closeConfirm() {
        customConfirmModal.classList.remove('active');
        confirmCallback = null;
    }

    btnConfirmCancel.addEventListener('click', closeConfirm);

    btnConfirmOk.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });


    // === ADD/EDIT PROFILE MODAL LOGIC ===
    function openProfileModal(slotIndex) {
        currentProfileIndex = slotIndex; // The slot attempting to add to (e.g., clicked empty slot #3)

        profileForm.reset();
        tempProfileImageBase64 = null;
        profileImagePreviewContainer.classList.add('hidden');

        // Defaults
        if (profilePaymentMethod) profilePaymentMethod.value = 'digital';
        if (profileDigitalContent) profileDigitalContent.classList.remove('hidden');

        profileDateInput.value = currentAccount.defaultDate;

        modalProfileTitle.innerText = `Nuevo Perfil`;

        // Default select to the clicked slot
        const slotSelect = document.getElementById('profileSlotSelect');
        if (slotSelect) slotSelect.value = slotIndex.toString();

        profileModal.classList.remove('hidden');
    }

    function closeProfileModalFn() {
        profileModal.classList.add('hidden');
    }

    closeProfileModal.addEventListener('click', closeProfileModalFn);
    cancelProfileBtn.addEventListener('click', closeProfileModalFn);

    // Toggle content based on selection
    if (profilePaymentMethod) {
        profilePaymentMethod.addEventListener('change', (e) => {
            if (e.target.value === 'physical') {
                profileDigitalContent.classList.add('hidden');
            } else {
                profileDigitalContent.classList.remove('hidden');
            }
        });
    }

    profilePaymentProof.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                tempProfileImageBase64 = reader.result;
                profileImagePreview.src = tempProfileImageBase64;
                profileImagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    removeProfileImageBtn.addEventListener('click', () => {
        tempProfileImageBase64 = null;
        profileImagePreview.src = "";
        profileImagePreviewContainer.classList.add('hidden');
        profilePaymentProof.value = "";
    });

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const number = profileNumberInput.value;
        const date = profileDateInput.value;
        const method = profilePaymentMethod ? profilePaymentMethod.value : 'digital';

        // Get the desired Target Slot from dropdown
        const slotSelect = document.getElementById('profileSlotSelect');
        const targetSlotIndex = parseInt(slotSelect.value); // 0-4

        let finalProof = null;
        if (method === 'physical') {
            finalProof = "PHYSICAL_PAYMENT";
        } else {
            finalProof = tempProfileImageBase64;
        }

        const newProfileData = {
            id: Date.now().toString(),
            number: number,
            purchaseDate: date,
            paymentProof: finalProof
        };

        const newProfiles = [...currentAccount.profiles];

        // Logic:
        // We started at 'currentProfileIndex' (the empty slot we clicked).
        // User wants to put it in 'targetSlotIndex'.

        if (targetSlotIndex === currentProfileIndex) {
            // Standard case: Put in the slot we clicked
            newProfiles[targetSlotIndex] = newProfileData;
        } else {
            // Swap Case:
            // Put NEW profile in TARGET slot.
            // Move WHATEVER was in TARGET slot (null or profile) to CURRENT slot.
            const existingInTarget = newProfiles[targetSlotIndex];
            newProfiles[targetSlotIndex] = newProfileData;
            newProfiles[currentProfileIndex] = existingInTarget;
        }

        await updateDoc(doc(db, "cuentas", currentAccount.id), {
            profiles: newProfiles
        });

        closeProfileModalFn();
        // No reload needed; onSnapshot updates UI
    });


    // === PROFILE DETAILS VIEW (Edit/Delete) ===
    function showProfile(index) {
        currentProfileIndex = index;
        const profile = currentAccount.profiles[index];
        if (!profile) return;

        renderProfileDetails(currentAccount, index);
        toggleProfileEditMode(false);
        goProfileView();
    }

    function renderProfileDetails(account, index) {
        const profile = account.profiles[index];
        // Safety check if profile disappeared (e.g. swapped out while viewing?)
        if (!profile) return;

        // Show Slot info
        const detailProfileSlot = document.getElementById('detailProfileSlot');
        if (detailProfileSlot) detailProfileSlot.innerText = `Perfil #${index + 1}`;

        // Pre-set select value for edit mode
        const editDetailProfileSlot = document.getElementById('editDetailProfileSlot');
        if (editDetailProfileSlot) editDetailProfileSlot.value = index.toString();

        detailProfileNumber.innerText = profile.number;
        detailProfileDate.innerText = formatDate(parseLocalDate(profile.purchaseDate));

        // Status
        const purchase = parseLocalDate(profile.purchaseDate);
        const expDate = new Date(purchase); expDate.setDate(purchase.getDate() + 30);
        const refundDate = new Date(purchase); refundDate.setDate(purchase.getDate() + 10);
        const supportDate = new Date(purchase); supportDate.setDate(purchase.getDate() + 20);

        setStatus(profileExp, getDaysFromNow(expDate));
        setStatus(profileRefund, getDaysFromNow(refundDate));
        setStatus(profileSupport, getDaysFromNow(supportDate));

        // Image or Physical View
        if (profile.paymentProof === "PHYSICAL_PAYMENT") {
            // Show Physical Card
            if (detailPaymentImage) detailPaymentImage.classList.add('hidden');
            if (detailNoPayment) detailNoPayment.classList.add('hidden');
            if (detailPhysicalPayment) detailPhysicalPayment.classList.remove('hidden');
        } else if (profile.paymentProof) {
            // Show Digital Image
            if (detailPaymentImage) {
                detailPaymentImage.src = profile.paymentProof;
                detailPaymentImage.classList.remove('hidden');
            }
            if (detailNoPayment) detailNoPayment.classList.add('hidden');
            if (detailPhysicalPayment) detailPhysicalPayment.classList.add('hidden');
        } else {
            // Nothing
            if (detailPaymentImage) detailPaymentImage.classList.add('hidden');
            if (detailPhysicalPayment) detailPhysicalPayment.classList.add('hidden');
            if (detailNoPayment) detailNoPayment.classList.remove('hidden');
        }
    }

    function toggleProfileEditMode(isEditing) {
        if (isEditing) {
            editProfileBtn.classList.add('hidden');
            editProfileActions.classList.remove('hidden');

            const profile = currentAccount.profiles[currentProfileIndex];
            editDetailProfileNumber.value = profile.number;
            editDetailProfileDate.value = profile.purchaseDate;
            tempEditProfileImageBase64 = profile.paymentProof;

            // Toggle Slot Selector
            const detailProfileSlot = document.getElementById('detailProfileSlot');
            const editDetailProfileSlot = document.getElementById('editDetailProfileSlot');
            if (detailProfileSlot) detailProfileSlot.classList.add('hidden');
            if (editDetailProfileSlot) editDetailProfileSlot.classList.remove('hidden');

            detailProfileNumber.classList.add('hidden');
            detailProfileDate.classList.add('hidden');
            editDetailProfileNumber.classList.remove('hidden');
            editDetailProfileDate.classList.remove('hidden');

            // Toggle Method Selector
            if (editProfileMethodContainer) editProfileMethodContainer.classList.remove('hidden');

            // Decide initial state of inputs based on current proof
            if (profile.paymentProof === "PHYSICAL_PAYMENT") {
                editProfilePaymentMethod.value = "physical";
                editProfileImageContainer.classList.add('hidden');
            } else {
                editProfilePaymentMethod.value = "digital";
                editProfileImageContainer.classList.remove('hidden');
            }

        } else {
            editProfileBtn.classList.remove('hidden');
            editProfileActions.classList.add('hidden');

            const detailProfileSlot = document.getElementById('detailProfileSlot');
            const editDetailProfileSlot = document.getElementById('editDetailProfileSlot');
            if (detailProfileSlot) detailProfileSlot.classList.remove('hidden');
            if (editDetailProfileSlot) editDetailProfileSlot.classList.add('hidden');

            detailProfileNumber.classList.remove('hidden');
            detailProfileDate.classList.remove('hidden');
            editDetailProfileNumber.classList.add('hidden');
            editDetailProfileDate.classList.add('hidden');

            if (editProfileMethodContainer) editProfileMethodContainer.classList.add('hidden');
            editProfileImageContainer.classList.add('hidden');
        }
    }

    editProfileBtn.addEventListener('click', () => toggleProfileEditMode(true));
    cancelProfileEditBtn.addEventListener('click', () => toggleProfileEditMode(false));

    // Handle change in Edit Mode
    if (editProfilePaymentMethod) {
        editProfilePaymentMethod.addEventListener('change', (e) => {
            if (e.target.value === 'physical') {
                editProfileImageContainer.classList.add('hidden');
            } else {
                editProfileImageContainer.classList.remove('hidden');
            }
        });
    }

    editPaymentProof.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                tempEditProfileImageBase64 = reader.result;
                detailPaymentImage.src = tempEditProfileImageBase64;
                detailPaymentImage.classList.remove('hidden');
                if (detailNoPayment) detailNoPayment.classList.add('hidden');
                if (detailPhysicalPayment) detailPhysicalPayment.classList.add('hidden'); // Hide physical if previewing
            };
            reader.readAsDataURL(file);
        }
    });

    saveProfileEditBtn.addEventListener('click', async () => {
        // Get target slot from dropdown
        const editDetailProfileSlot = document.getElementById('editDetailProfileSlot');
        const targetSlotIndex = parseInt(editDetailProfileSlot.value);
        const method = editProfilePaymentMethod ? editProfilePaymentMethod.value : 'digital';

        let finalProof = null;
        if (method === 'physical') {
            finalProof = "PHYSICAL_PAYMENT";
        } else {
            // Digital logic
            if (tempEditProfileImageBase64 === "PHYSICAL_PAYMENT") {
                // If it was physical, and we switched to digital but didn't upload...
                // Ideally this shouldn't happen if UI forces upload, but let's assume null.
                // Or maybe we should keep it null.
                finalProof = null;
            } else {
                finalProof = tempEditProfileImageBase64;
            }
        }

        const updatedProfile = {
            ...currentAccount.profiles[currentProfileIndex],
            number: editDetailProfileNumber.value,
            purchaseDate: editDetailProfileDate.value,
            paymentProof: finalProof
        };

        const newProfiles = [...currentAccount.profiles];

        if (targetSlotIndex === currentProfileIndex) {
            newProfiles[currentProfileIndex] = updatedProfile;
        } else {
            // Swap Logic
            const otherProfile = newProfiles[targetSlotIndex];
            newProfiles[targetSlotIndex] = updatedProfile;
            newProfiles[currentProfileIndex] = otherProfile;

            // IMPORTANT: If we moved OUR profile to a new slot, 
            // we must update 'currentProfileIndex' so the MAIN VIEW keeps following it.
            currentProfileIndex = targetSlotIndex;
        }

        await updateDoc(doc(db, "cuentas", currentAccount.id), {
            profiles: newProfiles
        });

        toggleProfileEditMode(false);
        // No reload needed. OnSnapshot will receive the update.
        // If we swapped, 'currentProfileIndex' is already updated above, 
        // ensuring renderProfileDetails(..., currentProfileIndex) shows the correct (moved) profile.
    });

    deleteProfileBtn.addEventListener('click', async () => {
        showConfirm("¿Eliminar Perfil?", "El espacio quedará libre. Esta acción no se puede deshacer.", async () => {
            const newProfiles = [...currentAccount.profiles];
            newProfiles[currentProfileIndex] = null;

            await updateDoc(doc(db, "cuentas", currentAccount.id), {
                profiles: newProfiles
            });
            // Firestore update triggers listener
            // Listener says: if(updated.profiles[currentProfileIndex]) is null -> goBackToAccount
            // So logic is already handled!
        });
    });

    detailPaymentImage.addEventListener('click', () => {
        fullImage.src = detailPaymentImage.src;
        imageModal.classList.remove('hidden');
    });
    closeImageModal.addEventListener('click', () => imageModal.classList.add('hidden'));


    // === UTILS ===
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
        if (days < 0) { text = 'Expirado'; statusClass = 'status-expired'; }
        else if (days === 0) { text = 'Vence Hoy'; statusClass = 'status-warning'; }
        else if (days <= 3) { statusClass = 'status-warning'; }
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
