// Registra o Service Worker para PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker Registrado com Sucesso.'))
    .catch(err => console.error('Erro ao registrar Service Worker:', err));
}

// Elementos da Interface
const cepInput = document.getElementById('cep-input');
const searchCepBtn = document.getElementById('search-cep-btn');
const geoBtn = document.getElementById('geo-btn');
const locationInfo = document.getElementById('location-info');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  fetchCurrencies();
  // Carrega localização padrão ou salva no localStorage
  const savedCity = localStorage.getItem('user_city');
  if (savedCity) {
    locationInfo.textContent = `Localização salva: ${savedCity}`;
  }
  // Tenta geolocalização inicial ou aplica coordenadas padrão (São Paulo)
  getWeather(-23.5505, -46.6333, "São Paulo, SP");
});

// 1. Busca Cotações de Moedas (AwesomeAPI)
async function fetchCurrencies() {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
    const data = await response.json();
    
    document.getElementById('usd-val').textContent = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
    document.getElementById('eur-val').textContent = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
    document.getElementById('btc-val').textContent = `R$ ${parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR')}`;
  } catch (error) {
    console.error('Erro ao buscar cotações:', error);
  }
}

// 2. Busca Previsão do Tempo (Open-Meteo API pública)
async function getWeather(lat, lon, cityName) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;
    const response = await fetch(url);
    const data = await response.json();

    const current = data.current_weather;
    document.getElementById('weather-temp').textContent = `${Math.round(current.temperature)}°C`;
    document.getElementById('weather-wind').textContent = `${current.windspeed} km/h`;
    document.getElementById('weather-desc').textContent = getWeatherDescription(current.weathercode);
    document.getElementById('weather-humidity').textContent = `${data.hourly.relativehumidity_2m[0]}%`;

    if (cityName) {
      locationInfo.textContent = `Localização: ${cityName}`;
      localStorage.setItem('user_city', cityName);
    }
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
  }
}

// Dicionário de Códigos Meteorológicos
function getWeatherDescription(code) {
  const codes = {
    0: 'Céu Limpo',
    1: 'Predominantemente Limpo',
    2: 'Parcialmente Nublado',
    3: 'Nublado',
    45: 'Névoa',
    51: 'Garoa Leve',
    61: 'Chuva Leve',
    63: 'Chuva Moderada',
    65: 'Chuva Forte',
    80: 'Pancadas de Chuva',
    95: 'Tempestade'
  };
  return codes[code] || 'Variável';
}

// 3. Busca por CEP (ViaCEP API)
searchCepBtn.addEventListener('click', async () => {
  const cep = cepInput.value.replace(/\D/g, '');
  if (cep.length !== 8) {
    alert('Digite um CEP válido com 8 dígitos.');
    return;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (data.erro) {
      alert('CEP não encontrado.');
      return;
    }

    const cityLabel = `${data.localidade}, ${data.uf}`;
    // Converte nome da cidade em coordenadas simples usando Geocoding da Open-Meteo
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(data.localidade)}&count=1&language=pt&format=json`);
    const geoData = await geoRes.json();

    if (geoData.results && geoData.results.length > 0) {
      const { latitude, longitude } = geoData.results[0];
      getWeather(latitude, longitude, `${data.bairro ? data.bairro + ' - ' : ''}${cityLabel}`);
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
});

// 4. Geolocalização por GPS
geoBtn.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getWeather(pos.coords.latitude, pos.coords.longitude, "Sua Localização Atual (GPS)");
      },
      () => alert('Não foi possível obter sua localização.')
    );
  } else {
    alert('Geolocalização não é suportada pelo seu navegador.');
  }
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

// Variáveis Globais de Localização Atual
let currentLat = -23.5505;
let currentLon = -46.6333;
let currentCityName = "São Paulo";
let cachedPlaces = [];

// Função expandida para buscar clima e atualizar a localização atual
async function getWeather(lat, lon, cityName) {
  currentLat = lat;
  currentLon = lon;
  
  if (cityName) {
    currentCityName = cityName;
    locationInfo.textContent = `Localização: ${cityName}`;
    localStorage.setItem('user_city', cityName);

    // Atualiza links de eventos dinamicamente com o nome da cidade
    document.getElementById('link-events-google').href = `https://www.google.com/search?q=shows+e+eventos+em+${encodeURIComponent(cityName)}`;
    document.getElementById('link-sympla').href = `https://www.sympla.com.br/eventos/${encodeURIComponent(cityName.split(',')[0].toLowerCase())}`;
    document.getElementById('link-maps-food').href = `https://www.google.com/maps/search/bares+e+restaurantes+em+${encodeURIComponent(cityName)}`;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;
    const response = await fetch(url);
    const data = await response.json();

    const current = data.current_weather;
    document.getElementById('weather-temp').textContent = `${Math.round(current.temperature)}°C`;
    document.getElementById('weather-wind').textContent = `${current.windspeed} km/h`;
    document.getElementById('weather-desc').textContent = getWeatherDescription(current.weathercode);
    document.getElementById('weather-humidity').textContent = `${data.hourly.relativehumidity_2m[0]}%`;

    // Busca locais próximos na Overpass API
    fetchNearbyPlaces(lat, lon);
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
  }
}

// Busca Bares, Restaurantes e Cafés via Overpass API (OpenStreetMap)
async function fetchNearbyPlaces(lat, lon) {
  const placesContainer = document.getElementById('places-container');
  placesContainer.innerHTML = `<p class="text-slate-400 text-xs col-span-2">Buscando estabelecimentos perto de você...</p>`;

  // Consulta Overpass num raio de ~1.5km (1500m) por amenidades de alimentação/lazer
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"~"restaurant|bar|pub|cafe|fast_food"](around:1500, ${lat}, ${lon});
      way["amenity"~"restaurant|bar|pub|cafe|fast_food"](around:1500, ${lat}, ${lon});
    );
    out center 15;
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
    console.error('Erro ao buscar estabelecimentos:', err);
    placesContainer.innerHTML = `
      <p class="text-slate-400 text-xs col-span-2">
        Não foi possível carregar via OpenStreetMap. 
        <a href="https://www.google.com/maps/search/restaurantes+e+bares/@${lat},${lon},15z" target="_blank" class="text-rose-400 underline">Clique aqui para ver no Google Maps</a>.
      </p>`;
  }
}

// Renderiza a lista de lugares na tela
function renderPlaces(places, filterType = null) {
  const container = document.getElementById('places-container');
  container.innerHTML = '';

  let filtered = places.filter(p => p.tags && p.tags.name);

  if (filterType) {
    filtered = filtered.filter(p => p.tags.amenity === filterType);
  }

  if (filtered.length === 0) {
    container.innerHTML = `<p class="text-slate-400 text-xs col-span-2">Nenhum local nomeado encontrado neste filtro na região próxima.</p>`;
    return;
  }

  filtered.slice(0, 6).forEach(place => {
    const name = place.tags.name;
    const type = translateAmenity(place.tags.amenity);
    const street = place.tags['addr:street'] ? `${place.tags['addr:street']}` : 'Próximo a você';
    const cuisine = place.tags.cuisine ? `• ${place.tags.cuisine}` : '';

    const card = document.createElement('div');
    card.className = "bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-1">
          <h3 class="font-semibold text-slate-100 text-sm leading-snug">${name}</h3>
          <span class="text-[10px] bg-slate-800 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">${type}</span>
        </div>
        <p class="text-xs text-slate-400">${street} ${cuisine}</p>
      </div>
      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + currentCityName)}" 
         target="_blank" 
         class="text-[11px] text-rose-400 hover:underline mt-2 inline-block">
        Ver no Mapa ↗
      </a>
    `;
    container.appendChild(card);
  });
}

// Filtra estabelecimentos pelos botões de categoria
function filterPlaces(type) {
  renderPlaces(cachedPlaces, type);
}

// Tradutor simples de tags do OpenStreetMap
function translateAmenity(tag) {
  const map = {
    'restaurant': 'Restaurante',
    'bar': 'Bar',
    'pub': 'Pub / Bar',
    'cafe': 'Café',
    'fast_food': 'Lanche'
  };
  return map[tag] || 'Gastronomia';
}

// Evento de recarregar locais manualmente
document.getElementById('fetch-places-btn').addEventListener('click', () => {
  fetchNearbyPlaces(currentLat, currentLon);
});

// Função para buscar notícias em tempo real (Google News Brasil via RSS2JSON)
async function fetchNews(cityName = '') {
  const newsContainer = document.getElementById('news-container');
  newsContainer.innerHTML = `<p class="text-slate-400 text-xs">Buscando manchetes atualizadas...</p>`;

  // Termo de busca: se houver cidade definida, busca notícias regionais; caso contrário, notícias gerais do Brasil
  const query = cityName ? encodeURIComponent(`noticias ${cityName.split(',')[0]}`) : 'brasil';
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items && data.items.length > 0) {
      renderNews(data.items.slice(0, 4)); // Exibe as 4 principais notícias
    } else {
      // Fallback para notícias gerais do Brasil se não achar da cidade
      fetchGeneralNews();
    }
  } catch (error) {
    console.error('Erro ao carregar notícias:', error);
    newsContainer.innerHTML = `<p class="text-slate-400 text-xs">Não foi possível carregar as notícias no momento.</p>`;
  }
}

// Fallback de Notícias Principais do Brasil
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
    console.error('Erro no fallback de notícias:', err);
  }
}

// Renderiza os cards de notícia na tela
function renderNews(newsItems) {
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  newsItems.forEach(item => {
    const pubDate = new Date(item.pubDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const card = document.createElement('article');
    card.className = "bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition";
    card.innerHTML = `
      <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block group">
        <h3 class="text-sm font-semibold text-slate-100 group-hover:text-sky-400 transition leading-snug mb-1">
          ${item.title}
        </h3>
        <div class="flex justify-between items-center text-[11px] text-slate-400 mt-2">
          <span>${item.author || 'Fonte de Notícias'}</span>
          <span>${pubDate} ↗</span>
        </div>
      </a>
    `;
    container.appendChild(card);
  });
}

// Conectar à inicialização e atualização do app
document.addEventListener('DOMContentLoaded', () => {
  fetchNews(); // Carrega na abertura
});

document.getElementById('refresh-news-btn').addEventListener('click', () => {
  fetchNews(currentCityName);
});