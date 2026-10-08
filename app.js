// Registar o Service Worker para PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker Registado com Sucesso.'))
    .catch(err => console.error('Erro ao registar Service Worker:', err));
}

// Elementos da Interface
const cepInput = document.getElementById('cep-input');
const searchCepBtn = document.getElementById('search-cep-btn');
const geoBtn = document.getElementById('geo-btn');
const locationInfo = document.getElementById('location-info');

// Variáveis Globais de Estado
let currentLat = -25.4284; // Coordenadas padrão (Curitiba / Santa Felicidade)
let currentLon = -49.2733;
let currentCityName = "Curitiba, PR";
let cachedPlaces = [];

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
  fetchCurrencies();
  fetchXTicker();
  fetchYouTubeCarousel();
  fetchNews();

  // Carrega localização salva no localStorage ou aplica padrão
  const savedCity = localStorage.getItem('user_city');
  if (savedCity) {
    currentCityName = savedCity;
  }
  
  // Executa busca do clima e locais iniciais
  getWeather(currentLat, currentLon, currentCityName);
});

// 1. Cotações de Moedas (AwesomeAPI)
async function fetchCurrencies() {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
    const data = await response.json();
    
    if (data.USDBRL) document.getElementById('usd-val').textContent = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
    if (data.EURBRL) document.getElementById('eur-val').textContent = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
    if (data.BTCBRL) document.getElementById('btc-val').textContent = `R$ ${parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR')}`;
  } catch (error) {
    console.error('Erro ao procurar cotações:', error);
  }
}

// 2. Previsão do Tempo (Open-Meteo API)
async function getWeather(lat, lon, cityName) {
  currentLat = lat;
  currentLon = lon;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.current_weather) {
      const current = data.current_weather;
      
      document.getElementById('weather-temp').textContent = `${Math.round(current.temperature)}°C`;
      document.getElementById('weather-wind').textContent = `${current.windspeed} km/h`;
      document.getElementById('weather-desc').textContent = getWeatherDescription(current.weathercode);
      
      const humidity = (data.hourly && data.hourly.relativehumidity_2m) ? data.hourly.relativehumidity_2m[0] : '--';
      document.getElementById('weather-humidity').textContent = `${humidity}%`;
    }

    if (cityName) {
      currentCityName = cityName;
      locationInfo.textContent = `Localização: ${cityName}`;
      localStorage.setItem('user_city', cityName);

      // Atualiza atalhos de mapas e trânsito
      document.getElementById('link-maps').href = `https://www.google.com/maps/search/transito+em+${encodeURIComponent(cityName)}`;
      document.getElementById('link-waze').href = `https://www.waze.com/live-map?q=${encodeURIComponent(cityName)}`;
    }

    // Carrega estabelecimentos próximos para a localização atual
    fetchNearbyPlaces(lat, lon);
  } catch (error) {
    console.error('Erro ao procurar clima:', error);
    document.getElementById('weather-temp').textContent = '--°C';
    document.getElementById('weather-desc').textContent = 'Indisponível';
  }
}

// Dicionário do Código do Clima
function getWeatherDescription(code) {
  const codes = {
    0: 'Céu Limpo',
    1: 'Predom. Limpo',
    2: 'Parcial. Nublado',
    3: 'Nublado',
    45: 'Névoa',
    51: 'Garoa Leve',
    61: 'Chuva Leve',
    63: 'Chuva Moderada',
    65: 'Chuva Forte',
    80: 'Pancadas Chuva',
    95: 'Trovoada'
  };
  return codes[code] || 'Variável';
}

// 3. Ticker de Notícias do X (Twitter)
async function fetchXTicker() {
  const tickerContainer = document.getElementById('x-ticker-content');
  const xRssUrl = 'https://news.google.com/rss/search?q=site:x.com+OR+twitter&hl=pt-BR&gl=BR&ceid=BR:pt-419';
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(xRssUrl)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items && data.items.length > 0) {
      tickerContainer.innerHTML = '';
      data.items.slice(0, 8).forEach(item => {
        const tickerItem = document.createElement('a');
        tickerItem.href = item.link;
        tickerItem.target = '_blank';
        tickerItem.rel = 'noopener noreferrer';
        tickerItem.className = 'hover:text-sky-600 transition flex items-center gap-2';
        tickerItem.innerHTML = `
          <span class="text-sky-600 font-bold">•</span>
          <span>${item.title}</span>
        `;
        tickerContainer.appendChild(tickerItem);
      });
    } else {
      renderFallbackXTicker();
    }
  } catch (error) {
    console.error('Erro ao procurar X Ticker:', error);
    renderFallbackXTicker();
  }
}

function renderFallbackXTicker() {
  const tickerContainer = document.getElementById('x-ticker-content');
  tickerContainer.innerHTML = `
    <span>• Assuntos mais comentados no Brasil e na sua região em tempo real</span>
    <span>• Acompanhe novidades de trânsito, serviços e eventos no X</span>
  `;
}

// 4. Carrossel de Vídeos do YouTube
async function fetchYouTubeCarousel() {
  const container = document.getElementById('youtube-carousel');
  const ytTrendingRss = 'https://www.youtube.com/feeds/videos.xml?chart=most_popular';
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(ytTrendingRss)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items && data.items.length > 0) {
      container.innerHTML = '';
      data.items.slice(0, 8).forEach(item => {
        const videoId = item.link.split('v=')[1] || '';
        const thumbnailUrl = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : 'https://via.placeholder.com/160x90';

        const card = document.createElement('a');
        card.href = item.link;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = "flex-shrink-0 w-36 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition group";
        
        card.innerHTML = `
          <div class="relative w-full h-20 bg-slate-200 overflow-hidden">
            <img src="${thumbnailUrl}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition">
          </div>
          <div class="p-2">
            <h3 class="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">${item.title}</h3>
            <p class="text-[10px] text-slate-400 mt-1 truncate">${item.author || 'YouTube'}</p>
          </div>
        `;
        container.appendChild(card);
      });
    }
  } catch (error) {
    console.error('Erro ao procurar YouTube:', error);
    container.innerHTML = `<p class="text-xs text-slate-400">Não foi possível carregar os vídeos.</p>`;
  }
}

// 5. Gastronomia Local (OpenStreetMap Overpass API)
async function fetchNearbyPlaces(lat, lon) {
  const container = document.getElementById('places-container');
  container.innerHTML = `<p class="text-xs text-slate-400">A procurar locais no bairro...</p>`;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"restaurant|bar|pub|cafe"](around:1500, ${lat}, ${lon});
      way["amenity"~"restaurant|bar|pub|cafe"](around:1500, ${lat}, ${lon});
    );
    out center 12;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query)
    });
    
    const data = await response.json();
    cachedPlaces = data.elements || [];

    renderPlaces(cachedPlaces);
  } catch (err) {
    console.error('Erro ao procurar locais:', err);
    container.innerHTML = `<p class="text-xs text-slate-400">Não foi possível listar estabelecimentos nesta região.</p>`;
  }
}

function renderPlaces(places, filterType = null) {
  const container = document.getElementById('places-container');
  container.innerHTML = '';

  let filtered = places.filter(p => p.tags && p.tags.name);

  if (filterType) {
    filtered = filtered.filter(p => p.tags.amenity === filterType);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-slate-400 text-xs">Nenhum local encontrado para esta categoria.</p>`;
    return;
  }

  filtered.slice(0, 5).forEach(place => {
    const name = place.tags.name;
    const type = translateAmenity(place.tags.amenity);
    const street = place.tags['addr:street'] ? `${place.tags['addr:street']}` : 'Próximo a si';

    const card = document.createElement('div');
    card.className = "bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex justify-between items-center";
    card.innerHTML = `
      <div>
        <h3 class="font-bold text-slate-800 text-xs">${name}</h3>
        <p class="text-[11px] text-slate-400">${street} • ${type}</p>
      </div>
      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + currentCityName)}" 
         target="_blank" 
         class="text-[11px] font-bold text-sky-600 hover:underline">
        Mapa ↗
      </a>
    `;
    container.appendChild(card);
  });
}

function filterPlaces(type) {
  renderPlaces(cachedPlaces, type);
}

function translateAmenity(tag) {
  const map = {
    'restaurant': 'Restaurante',
    'bar': 'Bar',
    'pub': 'Pub',
    'cafe': 'Café'
  };
  return map[tag] || 'Gastronomia';
}

// 6. Notícias Regionais (Google News RSS)
async function fetchNews(cityName = '') {
  const newsContainer = document.getElementById('news-container');
  newsContainer.innerHTML = `<p class="text-xs text-slate-400">A procurar notícias atualizadas...</p>`;

  const query = cityName ? encodeURIComponent(`noticias ${cityName.split(',')[0]}`) : 'brasil';
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items && data.items.length > 0) {
      renderNews(data.items.slice(0, 4));
    } else {
      fetchGeneralNews();
    }
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    newsContainer.innerHTML = `<p class="text-xs text-slate-400">Não foi possível carregar as notícias.</p>`;
  }
}

async function fetchGeneralNews() {
  const rssUrl = `https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.items) {
      renderNews(data.items.slice(0, 4));
    }
  } catch (err) {
    console.error('Erro nas notícias:', err);
  }
}

function renderNews(newsItems) {
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  newsItems.forEach(item => {
    const pubDate = new Date(item.pubDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const card = document.createElement('article');
    card.className = "bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 hover:border-sky-300 transition";
    card.innerHTML = `
      <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block">
        <h3 class="text-xs font-bold text-slate-800 leading-snug mb-1 hover:text-sky-600 transition">
          ${item.title}
        </h3>
        <div class="flex justify-between items-center text-[10px] text-slate-400 font-medium">
          <span>${item.author || 'Notícias'}</span>
          <span>${pubDate} ↗</span>
        </div>
      </a>
    `;
    container.appendChild(card);
  });
}

// 7. Eventos dos Botões de Pesquisa (CEP e GPS)
searchCepBtn.addEventListener('click', async () => {
  const cep = cepInput.value.replace(/\D/g, '');
  if (cep.length !== 8) {
    alert('Por favor, digite um CEP válido com 8 dígitos.');
    return;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (data.erro) {
      alert('CEP não encontrado.');
      return;
    }

    const cityLabel = `${data.bairro ? data.bairro + ' - ' : ''}${data.localidade}, ${data.uf}`;
    
    // Converte a cidade encontrada em coordenadas de latitude e longitude
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(data.localidade)}&count=1&language=pt&format=json`);
    const geoData = await geoRes.json();

    if (geoData.results && geoData.results.length > 0) {
      const { latitude, longitude } = geoData.results[0];
      getWeather(latitude, longitude, cityLabel);
      fetchNews(data.localidade);
    }
  } catch (error) {
    console.error('Erro ao procurar CEP:', error);
  }
});

geoBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getWeather(pos.coords.latitude, pos.coords.longitude, "Sua Localização (GPS)");
      },
      () => alert('Não foi possível obter a sua localização por GPS.')
    );
  } else {
    alert('Geolocalização não é suportada pelo seu navegador.');
  }
});

// Eventos dos botões de atualização manual
document.getElementById('fetch-places-btn').addEventListener('click', () => {
  fetchNearbyPlaces(currentLat, currentLon);
});

document.getElementById('refresh-news-btn').addEventListener('click', () => {
  fetchNews(currentCityName);
});

// Prompt de Instalação PWA
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      installBtn.classList.add('hidden');
    });
  }
});

// Adicione a chamada do Instagram dentro do DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  fetchCurrencies();
  fetchXTicker();
  fetchYouTubeCarousel();
  fetchInstagramFeed();
  fetchNews();

  const savedCity = localStorage.getItem('user_city');
  if (savedCity) {
    currentCityName = savedCity;
  }
  
  getWeather(currentLat, currentLon, currentCityName);
});

// Lógica para carregar os últimos posts do Instagram
async function fetchInstagramFeed(cityName = '') {
  const container = document.getElementById('instagram-container');
  container.innerHTML = `<p class="text-xs text-slate-400">A procurar publicações do Instagram...</p>`;

  const targetCity = cityName || currentCityName;
  const searchTag = targetCity.split(',')[0].replace(/\s+/g, '').toLowerCase();
  
  // Utiliza feed público direcionado a notícias/tendências do Instagram
  const rssUrl = `https://news.google.com/rss/search?q=site:instagram.com+${encodeURIComponent(targetCity)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items && data.items.length > 0) {
      container.innerHTML = '';
      
      data.items.slice(0, 3).forEach(item => {
        const card = document.createElement('article');
        card.className = "bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 hover:border-pink-300 transition";
        card.innerHTML = `
          <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-pink-600 font-bold text-xs">📸 Instagram</span>
              <span class="text-[10px] text-slate-400">• #${searchTag}</span>
            </div>
            <h3 class="text-xs font-bold text-slate-800 leading-snug hover:text-pink-600 transition">
              ${item.title}
            </h3>
            <span class="text-[10px] text-pink-600 font-semibold mt-1 block">Ver no Instagram ↗</span>
          </a>
        `;
        container.appendChild(card);
      });
    } else {
      renderFallbackInstagram(searchTag);
    }
  } catch (error) {
    console.error('Erro ao carregar Instagram:', error);
    renderFallbackInstagram(searchTag);
  }
}

function renderFallbackInstagram(tag) {
  const container = document.getElementById('instagram-container');
  container.innerHTML = `
    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center space-y-2">
      <p class="text-xs text-slate-600">Explore as fotos e reels em alta na sua região no Instagram.</p>
      <a href="https://www.instagram.com/explore/tags/${tag}/" target="_blank" rel="noopener noreferrer" 
         class="inline-block bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-bottom">
        Ver #${tag} no Instagram ↗
      </a>
    </div>
  `;
}