const table = document.querySelector("#accounts-table");
const searchInput = document.querySelector("#search-input");
const feedback = document.querySelector("#feedback");
const modal = document.querySelector("#modal");
const form = document.querySelector("#account-form");
const formError = document.querySelector("#form-error");
let accounts = [];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function initials(name) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function avatarClass(index) {
  return ["", "orange", "blue"][index % 3];
}

function renderAccounts(list = accounts) {
  if (!list.length) {
    table.innerHTML = '<tr><td colspan="5" class="loading">Nenhuma conta encontrada.</td></tr>';
  } else {
    table.innerHTML = list.map((account) => {
      const originalIndex = accounts.findIndex((item) => item.id === account.id);
      return `<tr>
        <td><div class="account-cell"><span class="account-avatar ${avatarClass(originalIndex)}">${initials(account.holderName)}</span><div><span class="account-name">${account.accountNumber}</span><span class="account-id">${account.id}</span></div></div></td>
        <td>${account.holderName}</td>
        <td class="balance">${currency.format(account.balance)}</td>
        <td><span class="status"><i></i>Ativa</span></td>
        <td><button class="row-menu" aria-label="Mais opções">•••</button></td>
      </tr>`;
    }).join("");
  }

  document.querySelector("#table-count").textContent = `${list.length} ${list.length === 1 ? "conta" : "contas"}`;
}

function updateMetrics() {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const average = accounts.length ? total / accounts.length : 0;
  document.querySelector("#total-balance").textContent = currency.format(total);
  document.querySelector("#account-count").textContent = accounts.length;
  document.querySelector("#average-balance").textContent = currency.format(average);
}

async function loadAccounts() {
  try {
    const response = await fetch("/accounts");
    if (!response.ok) throw new Error("Não foi possível carregar as contas.");
    accounts = await response.json();
    renderAccounts();
    updateMetrics();
  } catch (error) {
    table.innerHTML = `<tr><td colspan="5" class="loading">${error.message}</td></tr>`;
  }
}

function setModal(open) {
  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", String(!open));
  if (open) form.elements.holderName.focus();
}

document.querySelector("#open-modal").addEventListener("click", () => setModal(true));
document.querySelector("#close-modal").addEventListener("click", () => setModal(false));
modal.addEventListener("click", (event) => {
  if (event.target === modal) setModal(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setModal(false);
});

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase().trim();
  const filtered = accounts.filter((account) => `${account.holderName} ${account.accountNumber} ${account.id}`.toLowerCase().includes(query));
  renderAccounts(filtered);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  const data = new FormData(form);
  const payload = {
    holderName: data.get("holderName"),
    balance: Number(data.get("balance"))
  };

  try {
    const response = await fetch("/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const account = await response.json();
    if (!response.ok) throw new Error(account.message || "Não foi possível criar a conta.");
    accounts.push(account);
    renderAccounts();
    updateMetrics();
    form.reset();
    setModal(false);
    feedback.textContent = "Conta criada com sucesso.";
    setTimeout(() => { feedback.textContent = ""; }, 3500);
  } catch (error) {
    formError.textContent = error.message;
  }
});

loadAccounts();
