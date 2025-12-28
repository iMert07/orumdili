// --- TEMA YÖNETİMİ ---
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const themeToggleButton = document.getElementById('theme-toggle');

if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    themeToggleLightIcon?.classList.remove('hidden');
} else {
    themeToggleDarkIcon?.classList.remove('hidden');
}

themeToggleButton?.addEventListener('click', function() {
    themeToggleDarkIcon.classList.toggle('hidden');
    themeToggleLightIcon.classList.toggle('hidden');
    
    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
});

// --- DEĞİŞKENLER VE AYARLAR ---
let allWords = [];
let lastSelectedWord = null;
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let isGreek = false;

const latinToGreekMap = {
    "a":"Α","A":"Α", "e":"Ε","E":"Ε", "i":"Ͱ","İ":"Ͱ", "n":"Ν","N":"Ν",
    "r":"Ρ","R":"Ρ", "l":"L","L":"L", "ı":"Ь","I":"Ь", "k":"Κ","K":"Κ",
    "d":"D","D":"D", "m":"Μ","M":"Μ", "t":"Τ","T":"Τ", "y":"R","Y":"R",
    "s":"S","S":"S", "u":"U","U":"U", "o":"Q","O":"Q", "b":"Β","B":"Β",
    "ş":"Ш","Ş":"Ш", "ü":"Υ","Ü":"Υ", "z":"Ζ","Z":"Ζ", "g":"G","G":"G",
    "ç":"C","Ç":"C", "ğ":"Γ","Ğ":"Γ", "v":"V","V":"V", "c":"J","C":"J",
    "h":"Η","H":"Η", "p":"Π","P":"Π", "ö":"Ω","Ö":"Ω", "f":"F","F":"F",
    "x":"Ψ","X":"Ψ", "j":"Σ","J":"Σ", "0":"θ"
};

const translations = {
    'tr': {
        'title': 'Orum Dili',
        'about_page_text': 'Çeviri',
        'feedback_button_text': 'Geri Bildirim',
        'search_placeholder': 'Kelime ara...',
        'about_title': 'Hoş Geldiniz',
        'about_text_1': 'Bu sözlük, Orum Diline ait kelimeleri ve kökenlerini keşfetmeniz için hazırlanmıştır. Bu dil, Anadolu Türkçesinin özleştirilmesiyle ve kolaylaştırılmasıyla ve ayrıca Azerbaycan Türkçesinden esintilerle oluşturulan yapay bir dildir. Amacım, dilimizin öz zenginliğini kanıtlamaktır. Ancak yapay etkiler görebileceğinizi de unutmayın.',
        'about_text_2': 'Herhangi bir geri bildiriminiz, öneriniz veya yeni sözcük ekleme isteğiniz varsa; lütfen yukarıdaki menüden "Geri Bildirim" butonunu kullanarak bana ulaşın. Katkılarınızla bu sözlüğü daha da zenginleştirebiliriz!',
        'feedback_title': 'Geri Bildirim',
        'feedback_placeholder': 'Geri bildiriminizi buraya yazın...',
        'feedback_cancel': 'İptal',
        'feedback_send': 'Gönder',
        'synonyms_title': 'Eş Anlamlılar',
        'description_title': 'Açıklama',
        'example_title': 'Örnek',
        'etymology_title': 'Köken',
        'no_result': 'Sonuç bulunamadı'
    },
    'gr': {}
};

// --- FONKSİYONLAR ---

function normalizeString(str) {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR');
}

function updateText(lang) {
    const textElements = document.querySelectorAll('[data-key]');
    textElements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        } else if (lang === 'gr' && translations['tr'][key]) {
            el.textContent = convertToGreek(translations['tr'][key]);
        }
    });

    const placeholderElements = document.querySelectorAll('[data-key][placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        } else if (lang === 'gr' && translations['tr'][key]) {
            el.placeholder = convertToGreek(translations['tr'][key]);
        }
    });
}

async function fetchWords() {
    const sheetId = '1R01aIajx6dzHlO-KBiUXUmld2AEvxjCQkUTFGYB3EDM';
    const sheetName = 'Sözlük';
    const url = `https://opensheet.elk.sh/${sheetId}/${sheetName}`;

    try {
        const response = await fetch(url);
        allWords = await response.json();
        setupSearch();
        setupAlphabetToggle();
        showPage('home');
        updateText('tr');
    } catch (error) {
        console.error('VERİ ÇEKME HATASI:', error);
    }
}

function showPage(pageId) {
    const homeContent = document.getElementById('home-content');
    const searchInput = document.getElementById('searchInput');

    if (pageId === 'home') {
        homeContent.classList.remove('hidden');
        searchInput.disabled = false;
        clearResult();
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultDiv = document.getElementById('result');
    const welcomeBox = document.getElementById('welcome-box');

    displaySearchHistory();

    searchInput.addEventListener('input', function () {
        const rawQuery = this.value.trim();
        const query = normalizeString(rawQuery);

        if (!query) {
            suggestionsDiv.innerHTML = '';
            resultDiv.innerHTML = '';
            welcomeBox.classList.remove('hidden');
            displaySearchHistory();
            return;
        }

        const matches = [];
        allWords.forEach(row => {
            const mainWord = row.Sözcük || '';
            const mainNorm = normalizeString(mainWord);
            const synonyms = row['Eş Anlamlılar'] ? row['Eş Anlamlılar'].split(',').map(s => s.trim()) : [];
            const scientific = row['Bilimsel'] || '';

            let alreadyMatched = false;

            if (mainNorm.startsWith(query)) {
                matches.push({ type: 'main', word: mainWord, data: row });
                alreadyMatched = true;
                return;
            }
            
            synonyms.forEach(syn => {
                if (normalizeString(syn).startsWith(query)) {
                    if (!alreadyMatched) {
                         matches.push({ type: 'synonym', synonym: syn, main: mainWord, data: row });
                         alreadyMatched = true;
                    }
                }
            });
            
            if (scientific && normalizeString(scientific).startsWith(query)) {
                if (!alreadyMatched) {
                    matches.push({ type: 'scientific', scientificValue: scientific, word: mainWord, data: row });
                    alreadyMatched = true;
                }
            }
        });

        displaySuggestions(matches, query);
    });

    searchInput.addEventListener('focus', () => {
        if (!searchInput.value.trim()) displaySearchHistory();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstSuggestion = suggestionsDiv.querySelector('.suggestion');
            if (firstSuggestion) firstSuggestion.click();
        }
    });

    if (lastSelectedWord) showResult(lastSelectedWord);
}

function displaySuggestions(matches, query) {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionsContainer = document.getElementById('suggestions-container');
    suggestionsDiv.innerHTML = '';

    if (matches.length === 0) {
        const noResultText = isGreek ? convertToGreek(translations.tr.no_result) : translations.tr.no_result;
        suggestionsDiv.innerHTML = `<div class="p-4 text-muted-light dark:text-muted-dark">${noResultText}</div>`;
        suggestionsContainer.classList.remove('hidden');
        return;
    }

    matches.sort((a, b) => normalizeString(a.data.Sözcük).localeCompare(normalizeString(b.data.Sözcük)))
    .slice(0, 12).forEach(match => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';

        let primaryMatchText = '';
        let secondaryInfo = '';

        if (match.type === 'main') {
            primaryMatchText = match.word;
        } else if (match.type === 'synonym') {
            primaryMatchText = match.synonym; 
            secondaryInfo = match.main;
        } else if (match.type === 'scientific') {
            primaryMatchText = match.scientificValue;
            secondaryInfo = match.word;
        }

        if (isGreek) {
            primaryMatchText = convertToGreek(primaryMatchText);
            secondaryInfo = convertToGreek(secondaryInfo);
        }
        
        if (match.type === 'main') {
            suggestion.innerHTML = `<span class="font-bold">${primaryMatchText}</span>`;
        } else {
             suggestion.innerHTML = `<span class="font-bold">${primaryMatchText}</span><span class="text-muted-light dark:text-muted-dark ml-2 text-sm">${secondaryInfo}</span>`;
        }

        suggestion.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectWord(match.data);
            document.getElementById('searchInput').focus();
        });
        suggestionsDiv.appendChild(suggestion);
    });

    suggestionsContainer.classList.remove('hidden');
}

function selectWord(word) {
    lastSelectedWord = word;
    document.getElementById('welcome-box').classList.add('hidden');
    document.getElementById('searchInput').value = isGreek ? convertToGreek(word.Sözcük) : word.Sözcük;
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    showResult(word);
    updateSearchHistory(word.Sözcük);
}

function showResult(word) {
    const resultDiv = document.getElementById('result');
    const t = (key) => isGreek ? convertToGreek(translations.tr[key]) : translations.tr[key];
    const convert = (val) => isGreek ? convertToGreek(val) : val;

    let fields = {
        word: word.Sözcük || '',
        synonyms: word['Eş Anlamlılar'] || '',
        desc: word.Açıklama || '',
        type: word.Tür || '',
        scientific: word['Bilimsel'] || '',
        example: word.Örnek || '',
        ety: word.Köken || ''
    };

    resultDiv.innerHTML = `
        <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg sm:rounded-xl overflow-hidden p-4 sm:p-6 shadow-md border border-subtle-light dark:border-subtle-dark">
            <div class="mb-5">
                <h2 class="text-4xl font-bold text-primary">${convert(fields.word)}</h2>
                ${fields.scientific ? `<p class="text-xl italic text-muted-light dark:text-muted-dark mt-1">${convert(fields.scientific)}</p>` : ''}
                ${fields.type ? `<p class="text-sm opacity-70 mt-1">${convert(fields.type)}</p>` : ''}
            </div>
            
            <hr class="border-t border-subtle-light dark:border-subtle-dark my-5">
            
            <div class="space-y-6">
                ${fields.desc ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('description_title')}</h3><p class="text-base leading-relaxed">${convert(fields.desc)}</p></div>` : ''}
                ${fields.ety ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('etymology_title')}</h3><p class="text-base leading-relaxed">${convert(fields.ety)}</p></div>` : ''}
                ${fields.example ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('example_title')}</h3><p class="text-base italic border-l-4 border-primary/40 pl-4 py-1">"${convert(fields.example)}"</p></div>` : ''}
                ${fields.synonyms ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('synonyms_title')}</h3><p class="text-base">${convert(fields.synonyms)}</p></div>` : ''}
            </div>
        </div>`;
}

function clearResult() {
    document.getElementById('result').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    document.getElementById('welcome-box').classList.remove('hidden');
    displaySearchHistory();
}

function updateSearchHistory(query) {
    const historyIndex = searchHistory.indexOf(query);
    if (historyIndex > -1) searchHistory.splice(historyIndex, 1);
    searchHistory.unshift(query);
    if (searchHistory.length > 12) searchHistory.pop();
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function displaySearchHistory() {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const searchInput = document.getElementById('searchInput');

    if (searchInput === document.activeElement && !searchInput.value.trim() && searchHistory.length > 0) {
        suggestionsDiv.innerHTML = '';
        searchHistory.slice(0, 12).forEach(history => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark border-b border-subtle-light dark:border-subtle-dark last:border-b-0';
            let historyToDisplay = isGreek ? convertToGreek(history) : history;
            suggestion.innerHTML = `<span class="font-bold">${historyToDisplay}</span>`;
            suggestion.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const selectedWord = allWords.find(row => row.Sözcük === history);
                if (selectedWord) selectWord(selectedWord);
            });
            suggestionsDiv.appendChild(suggestion);
        });
        suggestionsContainer.classList.remove('hidden');
    }
}

function setupAlphabetToggle() {
    const toggleButton = document.getElementById('alphabet-toggle');
    toggleButton?.addEventListener('click', toggleAlphabet);
}

function toggleAlphabet() {
    isGreek = !isGreek;
    document.getElementById('alphabet-toggle-latin').classList.toggle('hidden', isGreek);
    document.getElementById('alphabet-toggle-cyrillic').classList.toggle('hidden', !isGreek);
    updateText(isGreek ? 'gr' : 'tr');
    if (lastSelectedWord) showResult(lastSelectedWord);
}

function toggleFeedbackForm() {
    document.getElementById('feedbackModal').classList.toggle('hidden');
}

function submitFeedback() {
    const feedbackText = document.getElementById('feedbackText').value.trim();
    if (!feedbackText) return;
    const tarih = new Date().toLocaleString('tr-TR');
    fetch('https://sheetdb.io/api/v1/mt09gl0tun8di', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { "Tarih": tarih, "Mesaj": feedbackText } })
    })
    .then(() => toggleFeedbackForm());
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function convertToGreek(text) {
    if (!text) return '';
    let convertedText = '';
    for (let char of text) {
        const greekChar = latinToGreekMap[char];
        convertedText += greekChar || char;
    }
    return convertedText;
}

fetchWords();
