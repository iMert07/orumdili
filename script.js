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
    if (localStorage.getItem('color-theme') === 'light') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
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
        console.error('Hata:', error);
    }
}

function showPage(pageId) {
    if (pageId === 'home') {
        clearResult();
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const welcomeBox = document.getElementById('welcome-box');

    searchInput.addEventListener('input', function () {
        const query = normalizeString(this.value.trim());
        if (!query) {
            suggestionsDiv.innerHTML = '';
            document.getElementById('result').innerHTML = '';
            welcomeBox.classList.remove('hidden');
            displaySearchHistory();
            return;
        }

        const matches = [];
        allWords.forEach(row => {
            const word = row.Sözcük || '';
            const scientific = row.Bilimsel || '';
            const synonyms = row['Eş Anlamlılar'] ? row['Eş Anlamlılar'].split(',').map(s => s.trim()) : [];

            let alreadyMatched = false;
            if (normalizeString(word).startsWith(query)) {
                matches.push({ type: 'main', word: word, data: row });
                alreadyMatched = true;
                return;
            }
            synonyms.forEach(syn => {
                if (normalizeString(syn).startsWith(query) && !alreadyMatched) {
                    matches.push({ type: 'synonym', synonym: syn, main: word, data: row });
                    alreadyMatched = true;
                }
            });
            if (scientific && normalizeString(scientific).startsWith(query) && !alreadyMatched) {
                matches.push({ type: 'scientific', value: scientific, main: word, data: row });
                alreadyMatched = true;
            }
        });
        displaySuggestions(matches);
    });
}

function displaySuggestions(matches) {
    const suggestionsDiv = document.getElementById('suggestions');
    const container = document.getElementById('suggestions-container');
    suggestionsDiv.innerHTML = '';

    if (matches.length === 0) {
        suggestionsDiv.innerHTML = `<div class="p-4 text-sm opacity-50">${isGreek ? convertToGreek('Sonuç bulunamadı') : 'Sonuç bulunamadı'}</div>`;
        container.classList.remove('hidden');
        return;
    }

    matches.sort((a, b) => normalizeString(a.data.Sözcük).localeCompare(normalizeString(b.data.Sözcük)))
    .slice(0, 10).forEach(match => {
        const div = document.createElement('div');
        div.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark border-b border-subtle-light dark:border-subtle-dark last:border-b-0';
        let primary = match.word || match.synonym || match.value;
        let secondary = (match.type !== 'main') ? match.main : '';
        if (isGreek) { primary = convertToGreek(primary); secondary = convertToGreek(secondary); }
        div.innerHTML = `<span class="font-bold">${primary}</span> ${secondary ? `<span class="ml-2 text-sm opacity-50">${secondary}</span>` : ''}`;
        div.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectWord(match.data);
        });
        suggestionsDiv.appendChild(div);
    });
    container.classList.remove('hidden');
}

function selectWord(word) {
    lastSelectedWord = word;
    document.getElementById('welcome-box').classList.add('hidden');
    document.getElementById('searchInput').value = isGreek ? convertToGreek(word.Sözcük) : word.Sözcük;
    document.getElementById('suggestions-container').classList.add('hidden');
    showResult(word);
    updateSearchHistory(word.Sözcük);
}

function showResult(word) {
    const resultDiv = document.getElementById('result');
    const t = (key) => isGreek ? convertToGreek(translations.tr[key]) : translations.tr[key];
    const convert = (val) => isGreek ? convertToGreek(val) : val;

    resultDiv.innerHTML = `
        <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg sm:rounded-xl overflow-hidden p-4 sm:p-6 shadow-md border border-subtle-light dark:border-subtle-dark">
            <div class="mb-5">
                <h2 class="text-4xl font-bold text-primary">${convert(word.Sözcük)}</h2>
                ${word.Bilimsel ? `<p class="text-base text-muted-light dark:text-muted-dark opacity-70 mt-1">${convert(word.Bilimsel)}</p>` : ''}
                ${word.Tür ? `<p class="text-sm opacity-60 mt-0.5">${convert(word.Tür)}</p>` : ''}
            </div>
            <hr class="border-t border-subtle-light dark:border-subtle-dark my-5">
            <div class="space-y-6">
                ${word.Açıklama ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('description_title')}</h3><p class="text-base leading-relaxed">${convert(word.Açıklama)}</p></div>` : ''}
                ${word.Köken ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('etymology_title')}</h3><p class="text-base leading-relaxed">${convert(word.Köken)}</p></div>` : ''}
                ${word.Örnek ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('example_title')}</h3><p class="text-base border-l-4 border-primary/40 pl-4 py-1">${convert(word.Örnek)}</p></div>` : ''}
                ${word['Eş Anlamlılar'] ? `<div><h3 class="text-primary font-bold text-lg mb-1">${t('synonyms_title')}</h3><p class="text-base">${convert(word['Eş Anlamlılar'])}</p></div>` : ''}
            </div>
        </div>`;
}

function clearResult() {
    lastSelectedWord = null; // Seçili kelimeyi temizle
    document.getElementById('result').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    document.getElementById('welcome-box').classList.remove('hidden');
}

function updateSearchHistory(query) {
    const idx = searchHistory.indexOf(query);
    if (idx > -1) searchHistory.splice(idx, 1);
    searchHistory.unshift(query);
    if (searchHistory.length > 12) searchHistory.pop();
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function displaySearchHistory() {
    const suggestionsDiv = document.getElementById('suggestions');
    const container = document.getElementById('suggestions-container');
    const input = document.getElementById('searchInput');
    if (input === document.activeElement && !input.value.trim() && searchHistory.length > 0) {
        suggestionsDiv.innerHTML = '';
        searchHistory.forEach(h => {
            const div = document.createElement('div');
            div.className = 'suggestion p-4 hover:bg-background-light dark:hover:bg-background-dark border-b border-subtle-light dark:border-subtle-dark last:border-b-0 cursor-pointer';
            div.innerHTML = `<span class="font-bold">${isGreek ? convertToGreek(h) : h}</span>`;
            div.addEventListener('mousedown', (e) => { e.preventDefault(); const word = allWords.find(r => r.Sözcük === h); if (word) selectWord(word); });
            suggestionsDiv.appendChild(div);
        });
        container.classList.remove('hidden');
    }
}

function setupAlphabetToggle() {
    document.getElementById('alphabet-toggle').onclick = () => {
        isGreek = !isGreek;
        document.getElementById('alphabet-toggle-latin').classList.toggle('hidden');
        document.getElementById('alphabet-toggle-cyrillic').classList.toggle('hidden');
        updateText(isGreek ? 'gr' : 'tr');
        // Sadece bir kelime kartı açıksa güncelle
        if (lastSelectedWord) {
            showResult(lastSelectedWord);
        } else {
            // Ana sayfadaysak sonucu temiz tut
            document.getElementById('result').innerHTML = '';
        }
    };
}

function toggleFeedbackForm() { document.getElementById('feedbackModal').classList.toggle('hidden'); }
function submitFeedback() {
    const txt = document.getElementById('feedbackText').value.trim();
    if (!txt) return;
    const tarih = new Date().toLocaleString('tr-TR');
    fetch('https://sheetdb.io/api/v1/mt09gl0tun8di', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { "Tarih": tarih, "Mesaj": txt } }) })
    .then(() => toggleFeedbackForm());
}
function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }
function convertToGreek(text) {
    if (!text) return '';
    let res = '';
    for (let c of text) { res += latinToGreekMap[c] || c; }
    return res;
}
fetchWords();
