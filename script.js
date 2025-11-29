// Dizeleri standart bir formata dönüştürür (küçük harfe çevirme gibi).
// Bu, arama ve eşleştirme işlemlerinin daha tutarlı olmasını sağlar.
function normalizeString(str) {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR');
}

// Uygulamanın genel durumunu tutan değişkenler.
let allWords = [];
let lastSelectedWord = null;
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let isGreek = false; // Alfabenin başlangıç durumu (Latin)

// Harf dönüşüm eşleşmelerini burada tanımlayalım.
const latinToGreekMap = {
    "a":"Α","A":"Α",
    "e":"Ε","E":"Ε",
    "i":"Ͱ","İ":"Ͱ",
    "ı":"Ь","I":"Ь",
    "n":"Ν","N":"Ν",
    "r":"Ρ","R":"Ρ",
    "l":"L","L":"L",
    "k":"Κ","K":"Κ",
    "d":"D","D":"D",
    "m":"Μ","M":"Μ",
    "t":"Τ","T":"Τ",
    "y":"J","Y":"J",
    "s":"Σ","S":"Σ",
    "u":"Υ","U":"Υ",
    "o":"Ϙ","O":"Ϙ",
    "ö":"Ω","Ö":"Ω",
    "b":"Β","B":"Β",
    "ş":"Ш","Ş":"Ш",
    "ü":"U","Ü":"U",
    "z":"Ζ","Z":"Ζ",
    "g":"Γ","G":"Γ",
    "ç":"C","Ç":"C",
    "ğ":"R","Ğ":"R",
    "v":"F","V":"F",
    "c":"G","C":"G",
    "h":"Η","H":"Η",
    "p":"Π","P":"Π",
    "f":"V","F":"V",
    "x":"Ψ","X":"Ψ",
    "j":"Ϸ","J":"Ϸ"
};

const translations = {
    'tr': {
        'title': 'Orum Dili',
        'about_page_text': 'Hakkında',
        'feedback_button_text': 'Geri Bildirim',
        'search_placeholder': 'Kelime ara...',
        'about_title': 'Hakkında',
        'about_text_1': 'Bu sözlük, Orum Diline ait kelimeleri ve kökenlerini keşfetmeniz için hazırlanmıştır. Bu dil Anadolu Türkçesinin özleştirilmesiyle ve kolaylaştırılmasıyla oluşan yapay bir dildir. Amacım, dilimizin öz zenginliğini kanıtlamaktır.',
        'about_text_2': 'Herhangi bir geri bildiriminiz, öneriniz veya yeni sözcük ekleme isteğiniz varsa; lütfen yukarıdaki menüden "Geri Bildirim" butonunu kullanarak bana ulaşın. Katkılarınızla bu sözlüğü daha da zenginleştirebiliriz!',
        'feedback_title': 'Geri Bildirim',
        'feedback_placeholder': 'Geri bildiriminizi buraya yazın...',
        'feedback_cancel': 'İptal',
        'feedback_send': 'Gönder',
        'word_title': 'Sözcük',
        'synonyms_title': 'Eş Anlamlılar',
        'description_title': 'Açıklama',
        'type_title': 'Tür',
        'example_title': 'Örnek',
        'etymology_title': 'Köken',
        'no_result': 'Sonuç bulunamadı'
    },
    'gr': {} // Bu kısım convertToGreek fonksiyonuyla dinamik olarak doldurulacak
};

// Sayfadaki metinleri günceller.
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

// Google Sheets'ten verileri çeker.
async function fetchWords() {
    const sheetId = '1R01aIajx6dzHlO-KBiUXUmld2AEvxjCQkUTFGYB3EDM';
    const sheetName = 'Sözlük';
    const url = `https://opensheet.elk.sh/${sheetId}/${sheetName}`;

    try {
        const response = await fetch(url);
        allWords = await response.json();
        setupSearch();
        setupAlphabetToggle(); // Yeni eklenen alfabe tuşunu kurar
        showPage('home'); // Sayfa yüklendiğinde ana sayfayı gösterir.
        // Başlangıçta Türkçe metinleri ayarlayalım.
        updateText('tr');
    } catch (error) {
        console.error('VERİ ÇEKME HATASI:', error);
        document.getElementById('result').innerHTML =
            '<p style="color: red;">VERİLER YÜKLENİRKEN HATA OLUŞTU. LÜTFEN SAYFAYI YENİLEYİN.</p>';
    }
}

// Hangi sayfanın (ana sayfa veya hakkında) görüntüleneceğini kontrol eder.
function showPage(pageId) {
    const homeContent = document.getElementById('home-content');
    const aboutContent = document.getElementById('about-content');
    const searchInput = document.getElementById('searchInput');

    homeContent.classList.add('hidden');
    aboutContent.classList.add('hidden');
    searchInput.disabled = true;

    if (pageId === 'home') {
        homeContent.classList.remove('hidden');
        searchInput.disabled = false;
        clearResult();
    } else if (pageId === 'about') {
        aboutContent.classList.remove('hidden');
    }
}


// Arama kutusu ve önerilerle ilgili olay dinleyicilerini kurar.
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultDiv = document.getElementById('result');

    displaySearchHistory();

    searchInput.addEventListener('input', function () {
        const rawQuery = this.value.trim();
        const query = normalizeString(rawQuery); // Doğrudan normalize et, dönüştürme yapma

        if (!query) {
            suggestionsDiv.innerHTML = '';
            resultDiv.innerHTML = '';
            displaySearchHistory();
            return;
        }

        const matches = [];
        allWords.forEach(row => {
            const mainWord = row.Sözcük || '';
            const mainNorm = normalizeString(mainWord);
            
            // Eş Anlamlılar: Virgülle ayırıp temizle
            const synonyms = row['Eş Anlamlılar']
                ? row['Eş Anlamlılar'].split(',').map(s => s.trim())
                : [];
            
            // YENİ: Tür: Virgülle ayırıp temizle, bu sayede "İsim, Latince Ad" gibi değerler aranabilir olur.
            const types = row.Tür
                ? row.Tür.split(',').map(s => s.trim())
                : [];

            let alreadyMatched = false;

            // 1. Sözcük eşleşmesi (En yüksek öncelik)
            if (mainNorm.startsWith(query)) {
                matches.push({ type: 'main', word: mainWord, data: row });
                alreadyMatched = true;
                return; // Ana kelime eşleştiyse diğer kontrollere gerek yok.
            }
            
            // 2. Eş anlamlı kelime eşleşmesi
            let synonymMatch = false;
            synonyms.forEach(syn => {
                if (normalizeString(syn).startsWith(query)) {
                    if (!synonymMatch) { // Sadece ilk eşleşmeyi ekle
                         matches.push({ type: 'synonym', synonym: syn, main: mainWord, data: row });
                         synonymMatch = true;
                         alreadyMatched = true;
                    }
                }
            });
            
            // Eş anlamlıda eşleştiyse, Tür kontrolüne gerek kalmaz.
            if (alreadyMatched) {
                return;
            }

            // 3. Tür eşleşmesi (Her bir terimi kontrol et)
            types.forEach(typeValue => {
                if (normalizeString(typeValue).startsWith(query)) {
                    // Sadece daha önce eşleşmediyse ekle
                     if (!alreadyMatched) {
                        // typeValue: Kullanıcının arama yaptığı terim (örn: "camelus")
                        matches.push({ type: 'type', word: mainWord, typeValue: typeValue, data: row });
                        alreadyMatched = true; // Sadece bir kere eklenmesini sağla
                    }
                }
            });
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

    if (lastSelectedWord) {
        showResult(lastSelectedWord);
    }
}

// Alfabe değiştirme tuşu için olay dinleyicilerini kurar.
function setupAlphabetToggle() {
    const toggleButton = document.getElementById('alphabet-toggle');
    toggleButton.addEventListener('click', toggleAlphabet);
}

// Harfleri değiştirme fonksiyonu
function toggleAlphabet() {
    isGreek = !isGreek;
    
    // Simgeyi değiştirir
    document.getElementById('alphabet-toggle-latin').classList.toggle('hidden', isGreek);
    document.getElementById('alphabet-toggle-cyrillic').classList.toggle('hidden', !isGreek);

    // Tüm arayüz metinlerini günceller.
    const lang = isGreek ? 'gr' : 'tr';
    updateText(lang);

    // Sonuç sayfasındaki metni günceller.
    if (lastSelectedWord) {
        showResult(lastSelectedWord);
    }
    // Arama geçmişini günceller
    displaySearchHistory();
}

// Eşleşen sözcükler için öneri listesini görüntüler.
function displaySuggestions(matches, query) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    const suggestionsContainer = document.getElementById('suggestions-container');

    if (matches.length === 0) {
        const noResultText = isGreek ? convertToGreek(translations.tr.no_result) : translations.tr.no_result;
        suggestionsDiv.innerHTML = `<div class="p-4 text-muted-light dark:text-muted-dark">${noResultText}</div>`;
        suggestionsContainer.classList.remove('hidden');
        return;
    }

    matches.sort((a, b) => {
        // Sıralama için ana kelimeyi (Sözcük) kullanmaya devam edelim
        const aWord = a.data.Sözcük; 
        const bWord = b.data.Sözcük;
        return normalizeString(aWord).localeCompare(normalizeString(bWord));
    }).slice(0, 12).forEach(match => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';

        let primaryMatchText = ''; // Solda kalın gösterilecek (Aranan terim veya Ana Kelime)
        let secondaryInfo = '';     // Sağda hafif gösterilecek (Ana Madde Adı)

        
        if (match.type === 'main') {
            // Ana Kelime Araması: Solda Ana Kelime
            primaryMatchText = match.word;
            secondaryInfo = '';
        } else if (match.type === 'synonym') {
            // Eş Anlamlı Araması: Solda Eş Anlamlı (Aranan), Sağda Ana Kelime
            primaryMatchText = match.synonym; 
            secondaryInfo = match.main; // Ana kelime (madde adı)
        } else if (match.type === 'type') {
            // Tür Araması (İstenen Mantık): Solda Tür Değeri (Aranan), Sağda Ana Kelime
            primaryMatchText = match.typeValue; // Örneğin "camelus" veya "isim"
            secondaryInfo = match.word;        // Örneğin "Deve" veya "Kitap"
        }


        // Rum alfabesine dönüştürme
        if (isGreek) {
            primaryMatchText = convertToGreek(primaryMatchText);
            secondaryInfo = convertToGreek(secondaryInfo);
        }
        
        // Öneri görünümünü ayarla
        if (match.type === 'main') {
            // Sadece ana kelimeyi göster
            suggestion.innerHTML = `<span class="font-bold">${primaryMatchText}</span>`;
        } else {
            // Eş anlamlı veya Tür araması: Solda aranan terim, sağda Ana kelime/Madde Adı
             suggestion.innerHTML = `
                <span class="font-bold">${primaryMatchText}</span>
                <span class="text-muted-light dark:text-muted-dark ml-2 text-sm">${secondaryInfo}</span>
            `;
        }

        suggestion.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectWord(match.data);
            document.getElementById('searchInput').focus(); // Arama kutusunun odaklanmasını korur
        });
        suggestionsDiv.appendChild(suggestion);
    });

    suggestionsContainer.classList.remove('hidden');
}

// Bir sözcük seçildiğinde sonuçları gösterir ve geçmişi günceller.
function selectWord(word) {
    lastSelectedWord = word;
    document.getElementById('searchInput').value = isGreek ? convertToGreek(word.Sözcük) : word.Sözcük;
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    showResult(word);
    updateSearchHistory(word.Sözcük);
}

// Seçilen sözcüğün detaylarını ekranda görüntüler.
function showResult(word) {
    const resultDiv = document.getElementById('result');
    
    let wordToDisplay = word.Sözcük || '';
    let synonymsToDisplay = word['Eş Anlamlılar'] || '';
    let descriptionToDisplay = word.Açıklama || '';
    let typeToDisplay = word.Tür || '';
    let exampleToDisplay = word.Örnek || '';
    let etymologyToDisplay = word.Köken || '';

    if (isGreek) {
      wordToDisplay = convertToGreek(wordToDisplay);
      synonymsToDisplay = convertToGreek(synonymsToDisplay);
      descriptionToDisplay = convertToGreek(descriptionToDisplay);
      typeToDisplay = convertToGreek(typeToDisplay);
      exampleToDisplay = convertToGreek(exampleToDisplay);
      etymologyToDisplay = convertToGreek(etymologyToDisplay);
    }

    const synonymsTitle = isGreek ? convertToGreek(translations.tr.synonyms_title) : translations.tr.synonyms_title;
    const descriptionTitle = isGreek ? convertToGreek(translations.tr.description_title) : translations.tr.description_title;
    const typeTitle = isGreek ? convertToGreek(translations.tr.type_title) : translations.tr.type_title;
    const exampleTitle = isGreek ? convertToGreek(translations.tr.example_title) : translations.tr.example_title;
    const etymologyTitle = isGreek ? convertToGreek(translations.tr.etymology_title) : translations.tr.etymology_title;

    resultDiv.innerHTML = `
        <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg sm:rounded-xl overflow-hidden p-4 sm:p-6">
            <h2 class="text-3xl font-bold mb-4">${wordToDisplay}</h2>
            ${typeToDisplay ? `<p class="text-sm text-muted-light dark:text-muted-dark mb-4">${typeToDisplay}</p>` : ''}
            
            <hr class="border-t border-subtle-light dark:border-subtle-dark my-4">

            ${descriptionToDisplay ? `
            <div class="mb-4">
                <span class="font-bold text-lg">${descriptionTitle}</span>
                <p class="text-base mt-1">${descriptionToDisplay}</p>
            </div>` : ''}

            <hr class="border-t border-subtle-light dark:border-subtle-dark my-4">

            ${etymologyToDisplay ? `
            <div class="mb-4">
                <span class="font-bold text-lg">${etymologyTitle}</span>
                <p class="text-base mt-1">${etymologyToDisplay}</p>
            </div>` : ''}

            <hr class="border-t border-subtle-light dark:border-subtle-dark my-4">

            ${exampleToDisplay ? `
            <div class="mb-4">
                <span class="font-bold text-lg">${exampleTitle}</span>
                <p class="text-base mt-1">${exampleToDisplay}</p>
            </div>` : ''}

            <hr class="border-t border-subtle-light dark:border-subtle-dark my-4">

            ${synonymsToDisplay ? `
            <div class="mb-4">
                <span class="font-bold text-lg">${synonymsTitle}</span>
                <p class="text-base mt-1">${synonymsToDisplay}</p>
            </div>` : ''}
        </div>
    `;
}

// Arama kutusunu ve sonuçları temizler.
function clearResult() {
    document.getElementById('result').innerHTML = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('suggestions-container').classList.add('hidden');
    displaySearchHistory();
}

// Arama geçmişini localStorage'da günceller.
function updateSearchHistory(query) {
    const historyIndex = searchHistory.indexOf(query);
    if (historyIndex > -1) {
        searchHistory.splice(historyIndex, 1);
    }
    searchHistory.unshift(query);

    if (searchHistory.length > 12) {
        searchHistory.pop();
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

// Arama geçmişini öneri listesi olarak görüntüler.
function displaySearchHistory() {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const searchInput = document.getElementById('searchInput');

    if (searchInput === document.activeElement && !searchInput.value.trim() && searchHistory.length > 0) {
        suggestionsDiv.innerHTML = '';
        searchHistory.slice(0, 12).forEach(history => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion cursor-pointer p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors border-b border-subtle-light dark:border-subtle-dark last:border-b-0';
            
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

// Geri bildirim modalını gösterir veya gizler.
function toggleFeedbackForm() {
    const feedbackModal = document.getElementById('feedbackModal');
    feedbackModal.classList.toggle('hidden');
}

// Geri bildirim verilerini SheetDB'ye gönderir.
function submitFeedback() {
    const feedbackText = document.getElementById('feedbackText').value.trim();
    if (!feedbackText) {
        alert('Lütfen geri bildirim yazın.');
        return;
    }

    const tarih = new Date().toLocaleString('tr-TR');

    fetch('https://sheetdb.io/api/v1/mt09gl0tun8di', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { "Tarih": tarih, "Mesaj": feedbackText } })
    })
        .then(response => response.json())
        .then(() => {
            alert('Geri bildiriminiz alındı, teşekkür ederiz!');
            toggleFeedbackForm();
        })
        .catch(error => {
            console.error('Geri bildirim gönderilirken hata oluştu:', error);
            alert('Bir hata oluştu, lütfen tekrar deneyin.');
        });
}

// Mobil menüyü gösterir veya gizler.
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

// Metni Rum alfabesine dönüştürme fonksiyonu
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
