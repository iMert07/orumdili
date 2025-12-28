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
let lastClickedText = ""; 
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
        'title': 'Orum Dili', 'about_page_text': 'Çeviri', 'feedback_button_text': 'Geri Bildirim',
        'search_placeholder': 'Kelime ara...', 'about_title': 'Hoş Geldiniz',
        'about_text_1': 'Bu sözlük, Orum Diline ait kelimeleri ve kökenlerini keşfetmeniz için hazırlanmıştır. Bu dil, Anadolu Türkçesinin özleştirilmesiyle ve kolaylaştırılmasıyla ve ayrıca Azerbaycan Türkçesinden esintilerle oluşturulan yapay bir dildir. Amacım, dilimizin öz zenginliğini kanıtlamaktır. Ancak yapay etkiler görebileceğinizi de unutmayın.',
        'about_text_2': 'Herhangi bir geri bildiriminiz, öneriniz veya yeni sözcük ekleme isteğiniz varsa; lütfen yukarıdaki menüden "Geri Bildirim" butonunu kullanarak bana ulaşın. Katkılarınızla bu sözlüğü daha da zenginleştirebiliriz!',
        'feedback_title': 'Geri Bildirim', 'feedback_placeholder': 'Geri bildiriminizi buraya yazın...',
        'feedback_cancel': 'İptal', 'feedback_send': 'Gönder',
        'synonyms_title': 'Eş Anlamlılar', 'description_title': 'Açıklama',
        'example_title': 'Örnek', 'etymology_title': 'Köken', 'no_result': 'Sonuç bulunamadı'
    },
    'gr': {}
};

function normalizeString(str) {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR');
}

function convertToGreek(text) {
    if (!text) return '';
    let res = '';
    for (let c of text) { res += latinToGreekMap[c] || c; }
    return res;
}

function updateText(lang) {
    const textElements = document.querySelectorAll('[data-key]');
    textElements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations['tr'][key]) {
            let finalStr = translations['tr'][key];
            if (lang === 'gr') finalStr = convertToGreek(finalStr);
            
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = finalStr;
                el.onfocus = () => { el.dataset.tempPlaceholder = el.placeholder; el.placeholder = ''; };
                el.onblur = () => { if (el.placeholder === '') el.placeholder = el.dataset.tempPlaceholder; };
            } else {
                el.textContent = finalStr;
            }
        }
    });
}

function calculateStats() {
    const statsSentence = document.getElementById('stats-sentence');
    if (!statsSentence) return;
    const validEntries = allWords.filter(row => row.Sözcük && row.Sözcük.trim() !== "");
    const entryCount = validEntries.length;
    let totalWordCount = 0;
    validEntries.forEach(row => {
        totalWordCount += 1;
        if (row['Eş Anlamlılar']) {
            totalWordCount += row['Eş Anlamlılar'].split(',').filter(s => s.trim() !== '').length;
        }
    });
    let sentence = `Şu an bu sözlükte ${entryCount} madde altında toplam ${totalWordCount} kelime bulunmaktadır.`;
    if (isGreek) sentence = convertToGreek(sentence);
    statsSentence.innerHTML = sentence.replace(entryCount, `<span class="text-primary font-bold">${entryCount}</span>`).replace(totalWordCount, `<span class="text-primary font-bold">${totalWordCount}</span>`);
}

async function fetchWords() {
    const url = `https://opensheet.elk.sh/1R01aIajx6dzHlO-KBiUXUmld2AEvxjCQkUTFGYB3EDM/Sözlük`;
    try {
        const response = await fetch(url);
        allWords = await response.json();
        setupSearch();
        setupAlphabetToggle();
        showPage('home');
        updateText('tr');
        calculateStats();
    } catch (error) { console.error('Hata:', error); }
}

function showPage(pageId) { if (pageId === 'home') clearResult(); }

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const welcomeBox = document.getElementById('welcome-box');
    const statsCard = document.getElementById('stats-card');

    searchInput.addEventListener('input', function () {
        const query = normalizeString(this.value.trim());
        if (!query) {
            document.getElementById('suggestions').innerHTML = '';
            document.getElementById('result').innerHTML = '';
            welcomeBox.classList.remove('hidden');
            statsCard.classList.remove('hidden');
            displaySearchHistory();
            return;
        }
        const matches = [];
        allWords.filter(row => row.Sözcük).forEach(row => {
            const word = row.Sözcük;
            const scientific = row.Bilimsel || '';
            const synonyms = row['Eş Anlamlılar'] ? row['Eş Anlamlılar'].split(',').map(s => s.trim()) : [];

            if (normalizeString(word).startsWith(query)) {
                matches.push({ type: 'main', primary: word, secondary: '', data: row });
            }
            synonyms.forEach(syn => {
                if (normalizeString(syn).startsWith(query)) {
                    matches.push({ type: 'synonym', primary: syn, secondary: word, data: row });
                }
            });
            if (scientific && normalizeString(scientific).startsWith(query)) {
                matches.push({ type: 'scientific', primary: scientific, secondary: word, data: row });
            }
        });
        displaySuggestions(matches);
    });
    
    searchInput.addEventListener('focus', () => { if (!searchInput.value.trim()) displaySearchHistory(); });
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
    matches.sort((a,b) => normalizeString(a.primary).localeCompare(normalizeString(b.primary))).slice(0, 12).forEach(match => {
        const div = document.createElement('div');
        div.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark border-b border-subtle-light dark:border-subtle-dark last:border-b-0';
        let pText = isGreek ? convertToGreek(match.primary) : match.primary;
        let sText = match.secondary ? (isGreek ? convertToGreek(match.secondary) : match.secondary) : '';
        div.innerHTML = `<span class="font-bold">${pText}</span> ${sText ? `<span class="ml-2 text-sm opacity-50">${sText}</span>` : ''}`;
        div.addEventListener('mousedown', (e) => { 
            e.preventDefault(); 
            selectWord(match.data, match.primary, match.secondary); 
        });
        suggestionsDiv.appendChild(div);
    });
    container.classList.remove('hidden');
}

function selectWord(wordData, pText, sText) {
    lastSelectedWord = wordData;
    lastClickedText = pText;
    document.getElementById('welcome-box').classList.add('hidden');
    document.getElementById('stats-card').classList.add('hidden');
    document.getElementById('searchInput').value = isGreek ? convertToGreek(pText) : pText;
    document.getElementById('suggestions-container').classList.add('hidden');
    showResult(wordData);
    updateSearchHistory(pText, sText, wordData.Sözcük);
}

function updateSearchHistory(p, s, main) {
    const historyObj = { p, s, main };
    searchHistory = searchHistory.filter(h => !(h.p === p && h.main === main));
    searchHistory.unshift(historyObj);
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
            let pText = isGreek ? convertToGreek(h.p) : h.p;
            let sText = h.s ? (isGreek ? convertToGreek(h.s) : h.s) : '';
            div.innerHTML = `<span class="text-primary">↺</span> <span class="ml-2 font-bold">${pText}</span> ${sText ? `<span class="ml-2 text-sm opacity-50">${sText}</span>` : ''}`;
            div.addEventListener('mousedown', (e) => { 
                e.preventDefault(); 
                const target = allWords.find(r => r.Sözcük === h.main);
                if (target) selectWord(target, h.p, h.s);
            });
            suggestionsDiv.appendChild(div);
        });
        container.classList.remove('hidden');
    }
}

function showResult(word) {
    const resultDiv = document.getElementById('result');
    const t = (key) => isGreek ? convertToGreek(translations['tr'][key]) : translations['tr'][key];
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
    lastSelectedWord = null; lastClickedText = "";
    document.getElementById('result').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    document.getElementById('welcome-box').classList.remove('hidden');
    document.getElementById('stats-card').classList.remove('hidden');
}

function setupAlphabetToggle() {
    document.getElementById('alphabet-toggle').onclick = () => {
        isGreek = !isGreek;
        document.getElementById('alphabet-toggle-latin').classList.toggle('hidden');
        document.getElementById('alphabet-toggle-cyrillic').classList.toggle('hidden');
        updateText(isGreek ? 'gr' : 'tr');
        calculateStats(); 
        if (lastSelectedWord) {
            document.getElementById('searchInput').value = isGreek ? convertToGreek(lastClickedText) : lastClickedText;
            showResult(lastSelectedWord);
        }
    };
}

function toggleFeedbackForm() { document.getElementById('feedbackModal').classList.toggle('hidden'); }
function submitFeedback() {
    const txt = document.getElementById('feedbackText').value.trim();
    if (!txt) return;
    fetch('https://sheetdb.io/api/v1/mt09gl0tun8di', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { "Tarih": new Date().toLocaleString('tr-TR'), "Mesaj": txt } }) })
    .then(() => toggleFeedbackForm());
}
function toggleMobileMenu() { document.getElementById('mobile-menu').classList.toggle('hidden'); }

fetchWords();
