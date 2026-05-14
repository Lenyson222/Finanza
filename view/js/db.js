// Dashboard/db.js
// Banco de Dados Local com IndexedDB (Motor principal de armazenagem)

const DB_NAME = "FinanzaDB";
const DB_VERSION = 1;
const STORE_NAME = "despesas";

let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Criação da tabela (store), 'id' gerado automaticamente
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function (event) {
            console.error("Erro ao abrir IndexedDB", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// Retorna todos os itens do IndexedDB
window.buscarItens = async function () {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
};

// Adiciona ou edita um item
window.adicionarItem = async function (item) {
    if (!db) await initDB();
    
    // Convertendo dados se tiverem vírgula para floats (caso seja número puro). Deixamos apenas manter o que já estava.
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        // O Put funciona tanto para Insert quanto Update pelo keyPath (id)
        const request = store.put(item);

        request.onsuccess = function (event) {
            resolve(event.target.result); // retorna o ID (novo ou atualizado)
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
};

// Deleta um item específico
window.deletarItem = async function (id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
};

window.limparTodosItens = async function () {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = function () {
            resolve();
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
};

// Auto inicialização na importação
initDB();
