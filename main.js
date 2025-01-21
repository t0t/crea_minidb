let database = JSON.parse(localStorage.getItem('advancedEditorDB') || '[]');
// Migrar entradas antiguas para asegurar que todas tienen tags
database = database.map(entry => ({
    ...entry,
    tags: entry.tags || []
}));
let currentTags = [];

// Función para manejar las etiquetas
window.handleTagInput = function(event) {
    const input = event.target;
    const value = input.value.trim();
    
    if ((event.key === 'Enter' || event.key === ',') && value) {
        event.preventDefault();
        const tag = value.replace(',', '');
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            updateTagDisplay();
            input.value = '';
        }
    }
}

window.removeTag = function(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    updateTagDisplay();
}

window.formatText = function(command) {
    document.execCommand(command, false, null);
}

window.clearEditor = function() {
    document.getElementById('entryTitle').value = '';
    document.getElementById('richTextArea').innerHTML = '';
    currentTags = [];
    updateTagDisplay();
}

window.saveEntry = function() {
    const title = document.getElementById('entryTitle').value;
    const content = document.getElementById('richTextArea').innerHTML;
    
    if (!title || !content) {
        alert('Por favor, añade un título y contenido');
        return;
    }
    
    const entry = {
        id: Date.now(),
        title,
        content,
        tags: [...currentTags],
        timestamp: new Date().toISOString()
    };
    
    database.push(entry);
    updateUI();
    clearEditor();
}

window.deleteEntry = function(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta entrada?')) {
        database = database.filter(entry => entry.id !== id);
        updateUI();
    }
}

window.downloadJSON = function() {
    const dataStr = "data:text/json;charset=utf-8," + 
        encodeURIComponent(JSON.stringify(database, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "minidb_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function updateTagDisplay() {
    const tagsList = document.getElementById('tagsList');
    tagsList.innerHTML = currentTags.map(tag => `
        <div class="tag">
            ${tag}
            <span onclick="removeTag('${tag}')">&times;</span>
        </div>
    `).join('');
}

function updateUI() {
    localStorage.setItem('advancedEditorDB', JSON.stringify(database));
    
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filteredEntries = searchTerm 
        ? database.filter(entry => 
            (entry.tags || []).some(tag => tag.toLowerCase().includes(searchTerm)) ||
            entry.title.toLowerCase().includes(searchTerm)
          )
        : database;
    
    const entriesList = document.getElementById('entriesList');
    if (!entriesList) return;

    entriesList.innerHTML = filteredEntries.map(entry => `
        <article class="entry">
            <button onclick="deleteEntry(${entry.id})" class="delete-btn">
                🗑️
            </button>
            <h3>${entry.title}</h3>
            <div class="content">${entry.content}</div>
            ${(entry.images || []).map(img => `
                <img src="${img}" alt="Imagen adjunta">
            `).join('')}
            <div class="tags">
                ${(entry.tags || []).map(tag => `
                    <span class="tag">${tag}</span>
                `).join('')}
            </div>
            <time datetime="${entry.timestamp}">
                ${new Date(entry.timestamp).toLocaleString()}
            </time>
        </article>
    `).reverse().join('');
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', updateUI);
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.execCommand('insertImage', false, e.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// Inicializar UI
updateUI();
