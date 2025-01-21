// Polyfills para navegadores antiguos
if (!Array.from) {
    Array.from = (function () {
        var toStr = Object.prototype.toString;
        var isCallable = function (fn) {
            return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
        };
        var toInteger = function (value) {
            var number = Number(value);
            return isNaN(number) ? 0 : number;
        };
        var maxSafeInteger = Math.pow(2, 53) - 1;
        var toLength = function (value) {
            var len = toInteger(value);
            return Math.min(Math.max(len, 0), maxSafeInteger);
        };

        return function from(arrayLike) {
            var C = this;
            var items = Object(arrayLike);
            if (arrayLike == null) {
                throw new TypeError('Array.from requires an array-like object - not null or undefined');
            }
            var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
            var T;
            if (typeof mapFn !== 'undefined') {
                if (!isCallable(mapFn)) {
                    throw new TypeError('Array.from: when provided, the second argument must be a function');
                }
                if (arguments.length > 2) {
                    T = arguments[2];
                }
            }
            var len = toLength(items.length);
            var A = isCallable(C) ? Object(new C(len)) : new Array(len);
            var k = 0;
            var kValue;
            while (k < len) {
                kValue = items[k];
                if (mapFn) {
                    A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                } else {
                    A[k] = kValue;
                }
                k += 1;
            }
            A.length = len;
            return A;
        };
    }());
}

// Polyfill para Element.matches
if (!Element.prototype.matches) {
    Element.prototype.matches = 
        Element.prototype.matchesSelector || 
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector || 
        Element.prototype.oMatchesSelector || 
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;            
        };
}

// Variables globales
let database = JSON.parse(localStorage.getItem('advancedEditorDB') || '[]');
let currentTags = [];
let searchQuery = '';
let editingEntryId = null;

function addTag(tag) {
    tag = tag.trim();
    if (tag.endsWith(',')) {
        tag = tag.slice(0, -1).trim();
    }
    
    if (!tag) return;
    
    if (currentTags.includes(tag)) {
        showToast('Esta etiqueta ya existe', 'error');
        return;
    }

    const tagsList = document.getElementById('tagsList');
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.innerHTML = `
        ${tag}
        <button onclick="removeTag(this)">×</button>
    `;
    tagsList.appendChild(tagElement);
    currentTags.push(tag);
}

function removeTag(button) {
    const tagElement = button.parentElement;
    const tagText = tagElement.textContent.trim();
    currentTags = currentTags.filter(tag => tag !== tagText);
    tagElement.remove();
}

// Función para detectar soporte de características
const supports = {
    grid: window.CSS && CSS.supports && CSS.supports('display', 'grid'),
    flexbox: window.CSS && CSS.supports && CSS.supports('display', 'flex'),
    contentEditable: 'contentEditable' in document.documentElement,
    fileReader: typeof FileReader !== 'undefined',
    localStorage: (function() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch(e) {
            return false;
        }
    })()
};

// Funciones de utilidad
function addEvent(element, event, handler) {
    if (element.addEventListener) {
        element.addEventListener(event, handler, false);
    } else if (element.attachEvent) {
        element.attachEvent('on' + event, handler);
    } else {
        element['on' + event] = handler;
    }
}

function toggleClass(element, className) {
    if (element.classList) {
        element.classList.toggle(className);
    } else {
        var classes = element.className.split(' ');
        var existingIndex = classes.indexOf(className);

        if (existingIndex >= 0)
            classes.splice(existingIndex, 1);
        else
            classes.push(className);

        element.className = classes.join(' ');
    }
}

// Funciones de manejo de entradas
function createEntry() {
    const title = document.getElementById('titleInput').value;
    const content = document.getElementById('contentInput').innerHTML;
    const tags = Array.from(document.querySelectorAll('.tag')).map(tag => tag.textContent.trim());

    if (!title.trim()) {
        showToast('El título es obligatorio', 'error');
        return;
    }

    const entry = {
        id: editingEntryId || Date.now().toString(),
        title,
        content,
        tags,
        date: new Date().toISOString()
    };

    if (editingEntryId) {
        const index = database.findIndex(item => item.id === editingEntryId);
        if (index !== -1) {
            database[index] = entry;
        }
        editingEntryId = null;
    } else {
        database.push(entry);
    }

    saveDatabase();
    renderEntries();
    closeModal();
    clearForm();
    showToast('Entrada guardada correctamente', 'success');
}

function deleteEntry(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta entrada?')) {
        database = database.filter(entry => entry.id !== id);
        saveDatabase();
        renderEntries();
        showToast('Entrada eliminada correctamente', 'success');
    }
}

function editEntry(id) {
    const entry = database.find(entry => entry.id === id);
    if (!entry) return;

    editingEntryId = id;
    document.getElementById('titleInput').value = entry.title;
    document.getElementById('contentInput').innerHTML = entry.content;
    
    // Limpiar tags existentes
    document.getElementById('tagsList').innerHTML = '';
    entry.tags.forEach(tag => addTag(tag));

    openModal();
}

// Funciones de manejo de tags
function handleTagInput(event) {
    const input = event.target;
    const value = input.value;

    // Si presiona Enter
    if (event.key === 'Enter') {
        event.preventDefault();
        if (value.trim()) {
            // Si hay comas, procesar múltiples etiquetas
            if (value.includes(',')) {
                value.split(',').forEach(tag => addTag(tag));
            } else {
                addTag(value);
            }
        }
    }
    // Si escribe una coma
    else if (event.key === ',' || event.data === ',') {
        event.preventDefault();
        const tagText = value.slice(0, -1); // Eliminar la coma
        if (tagText.trim()) {
            addTag(tagText);
        }
    }
}

// Funciones de manejo del modal
function openModal() {
    document.querySelector('.modal-overlay').classList.add('active');
}

function closeModal() {
    document.querySelector('.modal-overlay').classList.remove('active');
    editingEntryId = null;
    clearForm();
}

// Funciones de persistencia
function saveDatabase() {
    try {
        localStorage.setItem('advancedEditorDB', JSON.stringify(database));
    } catch (e) {
        showToast('Error al guardar los datos', 'error');
    }
}

// Funciones de UI
function clearForm() {
    document.getElementById('titleInput').value = '';
    document.getElementById('contentInput').innerHTML = '';
    document.getElementById('tagsList').innerHTML = '';
    currentTags = [];
}

function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        className: type,
        stopOnFocus: true
    }).showToast();
}

function renderEntries() {
    const entriesContainer = document.getElementById('entriesContainer');
    const filteredEntries = filterEntries();

    if (filteredEntries.length === 0) {
        entriesContainer.innerHTML = `
            <div class="no-results">
                <h3>No se encontraron entradas</h3>
                <p>Intenta con otros términos de búsqueda o etiquetas</p>
            </div>
        `;
        return;
    }

    entriesContainer.innerHTML = filteredEntries.map(entry => `
        <div class="entry-item" id="entry-${entry.id}">
            <h3>${entry.title}</h3>
            <div class="entry-content">${entry.content}</div>
            <div class="entry-meta">
                <div class="entry-tags">
                    ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="entry-date">
                    ${formatDate(entry.date)}
                </div>
                <div class="entry-actions">
                    <button class="edit-btn" onclick="editEntry('${entry.id}')">✏️</button>
                    <button class="delete-btn" onclick="deleteEntry('${entry.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterEntries() {
    return database.filter(entry => {
        const titleMatch = entry.title.toLowerCase().includes(searchQuery.toLowerCase());
        const contentMatch = entry.content.toLowerCase().includes(searchQuery.toLowerCase());
        const tagsMatch = entry.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        return titleMatch || contentMatch || tagsMatch;
    });
}

function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}

// Función para mostrar/ocultar el botón de limpiar búsqueda
function toggleSearchClear() {
    const searchInput = document.getElementById('searchInput');
    const clearButton = document.querySelector('.search-clear');
    clearButton.style.display = searchInput.value ? 'block' : 'none';
}

// Función para limpiar la búsqueda
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    toggleSearchClear();
    renderEntries();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Comprobar soporte de características
    if (!supports.localStorage) {
        showToast('⚠️ Tu navegador no soporta almacenamiento local. Los datos no se guardarán.', 'error');
    }
    
    if (!supports.fileReader) {
        showToast('⚠️ Tu navegador no soporta la carga de imágenes.', 'error');
    }

    if (!supports.contentEditable) {
        showToast('⚠️ Tu navegador no soporta edición de texto enriquecido.', 'error');
    }

    // Inicializar la aplicación
    renderEntries();

    // Event listener para añadir tags
    const tagInput = document.getElementById('tagInput');
    
    // Manejar teclas (Enter y coma)
    tagInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            handleTagInput(e);
        }
    });

    // Manejar input (para detectar cuando se pega texto con comas)
    tagInput.addEventListener('input', function(e) {
        if (e.data === ',') {
            handleTagInput(e);
        }
    });

    // Event listener para el botón de crear entrada
    document.querySelector('.create-entry-btn').addEventListener('click', openModal);

    // Event listener para cerrar el modal
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // Event listener para guardar entrada
    document.getElementById('saveEntryBtn').addEventListener('click', createEntry);

    // Event listener para el input de búsqueda
    const searchInput = document.getElementById('searchInput');
    
    // Escuchar cambios en el input de búsqueda
    searchInput.addEventListener('input', function() {
        toggleSearchClear();
        searchQuery = searchInput.value;
        renderEntries();
    });

    // Event listener para limpiar la búsqueda
    document.querySelector('.search-clear').addEventListener('click', clearSearch);
});
