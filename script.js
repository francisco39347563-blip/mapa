// 🔐 Controle admin
const USER_MODE = window.USER_MODE || 'viewer';
const isAdmin = USER_MODE === 'admin';

// 📍 INPE - coordenadas fixas
 const inpeCoords = [-23.2076, -45.8581];

// Elementos HTML
const btn = document.getElementById("btnLocalizar");
const btnCentralizar = document.getElementById("btnCentralizar");
const telaInicial = document.getElementById("telaInicial");
const mapDiv = document.getElementById("map");
const infoModal = document.getElementById("infoModal");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalSlider = document.getElementById("modalSlider");
const sliderPrev = document.getElementById("sliderPrev");
const sliderNext = document.getElementById("sliderNext");
const sliderImage = document.getElementById("sliderImage");
const sliderCaption = document.getElementById("sliderCaption");
const sliderCounter = document.getElementById("sliderCounter");
const closeModalButton = document.getElementById("closeModal");

const markerFormModal = document.getElementById("markerFormModal");
const markerForm = document.getElementById("markerForm");
const markerNameInput = document.getElementById("markerName");
const markerStatusInput = document.getElementById("markerStatus");
const markerDescriptionInput = document.getElementById("markerDescription");
const imageDropZone = document.getElementById("imageDropZone");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const cancelMarkerButton = document.getElementById("cancelMarkerButton");

let map;          // mapa global
let userMarker = null;
let userCoords = null;
let routeLayer = null;
let routeLine = null;
let routeDestinationMarker = null;
let currentRouteDestination = null;
const ARRIVAL_DISTANCE_METERS = 20;
let pendingMarkerData = null;
let selectedFiles = [];
let modalPhotos = [];
let modalPhotoIndex = 0;
let hoveredMapLatLng = null;
let suppressNextMapClick = false;

// Ícones personalizados
const userIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const blueIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const restaurantIcon = L.divIcon({
    className: 'category-div-icon category-restaurant',
    html: '🍽️',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const gasStationIcon = L.divIcon({
    className: 'category-div-icon category-gas',
    html: '⛽',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const parkIcon = L.divIcon({
    className: 'category-div-icon category-park',
    html: '🌳',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const libraryIcon = L.divIcon({
    className: 'category-div-icon category-library',
    html: '📚',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const labIcon = L.divIcon({
    className: 'category-div-icon category-lab',
    html: '🧪',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const observatoryIcon = L.divIcon({
    className: 'category-div-icon category-observatory',
    html: '🔭',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const carIcon = L.divIcon({
    className: 'category-div-icon category-car',
    html: '🚗',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const ambulanceIcon = L.divIcon({
    className: 'category-div-icon category-ambulance',
    html: '🚑',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const satelliteIcon = L.divIcon({
    className: 'category-div-icon category-satellite',
    html: '🛰️',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const restroomIcon = L.divIcon({
    className: 'category-div-icon category-restroom',
    html: '🚻',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const climateIcon = L.divIcon({
    className: 'category-div-icon category-climate',
    html: '☁️',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const museumIcon = L.divIcon({
    className: 'category-div-icon category-museum',
    html: '🏛️',
    iconSize: [34, 34],
    iconAnchor: [17, 33]
});

const placeIcon = redIcon;
const internalRouteIcon = L.divIcon({
    className: 'category-div-icon',
    html: '•',
    iconSize: [8, 8],
    iconAnchor: [4, 4]
});

function getIconByCategory(category) {
    const icons = {
        restaurante: restaurantIcon,
        posto: gasStationIcon,
        parque: parkIcon,
        biblioteca: libraryIcon,
        laboratorio: labIcon,
        observatorio: observatoryIcon,
        ambulancia: ambulanceIcon,
        satelite: satelliteIcon,
        banheiros: restroomIcon,
        clima: climateIcon,
        museu: museumIcon,
        carro: carIcon,
        rota_interna: internalRouteIcon
    };
    return icons[category] || placeIcon;
}

async function saveMarker(markerData) {
    try {
        const response = await fetch('/api/markers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(markerData)
        });
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error('Erro ao salvar marcador:', error);
        return null;
    }
}

function buildMarkerPopupHtml(marker, photos) {
    const photoData = encodeURIComponent(JSON.stringify(photos || []));
    return `<b>${escapeHtml(marker.nome)}</b><br>${escapeHtml(marker.categoria)}<br>Status: ${escapeHtml(marker.status)}<br>Fotos: ${photos ? photos.length : 0}<br><a href="#" class="popup-link saiba-mais" data-name="${escapeHtml(marker.nome)}" data-descricao="${escapeHtml(marker.descricao)}" data-photos="${photoData}">Saiba mais</a> | <a href="#" class="popup-link route-to" data-id="${marker.id}" data-lat="${marker.latitude}" data-lng="${marker.longitude}" data-name="${escapeHtml(marker.nome)}">Traçar rota</a>`;
}

function updatePreview() {
    imagePreview.innerHTML = '';
    selectedFiles.forEach((file) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        const label = document.createElement('span');
        label.textContent = file.name;
        item.appendChild(img);
        item.appendChild(label);
        imagePreview.appendChild(item);
    });
}

function openMarkerFormModal() {
    markerFormModal.classList.remove('hidden');
    markerNameInput.focus();
}

function closeMarkerFormModal() {
    markerFormModal.classList.add('hidden');
    markerForm.reset();
    selectedFiles = [];
    updatePreview();
    pendingMarkerData = null;
}

function addFiles(files) {
    const newFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    selectedFiles = selectedFiles.concat(newFiles);
    updatePreview();
}

if (isAdmin && imageDropZone && imageInput && cancelMarkerButton && markerForm) {
    imageDropZone.addEventListener('click', () => imageInput.click());
    imageDropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        imageDropZone.classList.add('dragover');
    });
    imageDropZone.addEventListener('dragleave', () => imageDropZone.classList.remove('dragover'));
    imageDropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        imageDropZone.classList.remove('dragover');
        addFiles(event.dataTransfer.files);
    });
    imageInput.addEventListener('change', () => addFiles(imageInput.files));

    cancelMarkerButton.addEventListener('click', closeMarkerFormModal);
    markerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!pendingMarkerData) return;

    const nome = markerNameInput.value.trim();
    const status = markerStatusInput.value;
    const descricao = markerDescriptionInput.value.trim();

    if (!nome || !descricao) {
        alert('Preencha o nome e a descrição.');
        return;
    }

    const markerId = await saveMarker({
        nome,
        descricao,
        status,
        categoria: pendingMarkerData.categoriaValue,
        latitude: pendingMarkerData.lat,
        longitude: pendingMarkerData.lng
    });

    if (!markerId) {
        alert('Não foi possível salvar o marcador. Tente novamente.');
        return;
    }

    if (selectedFiles.length > 0) {
        const formData = new FormData();
        for (const file of selectedFiles) {
            formData.append('photo', file);
        }
        formData.append('mapa_id', markerId);
        formData.append('descricao', descricao);

        try {
            await fetch('/api/photos', {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Erro ao enviar imagens:', error);
        }
    }

    const popupHtml = buildMarkerPopupHtml(
        {
            id: markerId,
            nome,
            categoria: pendingMarkerData.categoriaTexto,
            status,
            descricao,
            latitude: pendingMarkerData.lat,
            longitude: pendingMarkerData.lng
        },
        []
    );
    L.marker([pendingMarkerData.lat, pendingMarkerData.lng], { icon: pendingMarkerData.iconSelecionado })
        .addTo(map)
        .bindPopup(popupHtml)
        .openPopup();

    closeMarkerFormModal();
    });
}

async function loadMarkers() {
    try {
        const response = await fetch('/api/markers');
        if (!response.ok) throw new Error(response.statusText);
        const markers = await response.json();
        markers.forEach((marker) => {
            const icon = getIconByCategory(marker.categoria);
            const popupHtml = buildMarkerPopupHtml(marker, marker.fotos || []);
            L.marker([marker.latitude, marker.longitude], { icon })
                .addTo(map)
                .bindPopup(popupHtml);
        });
    } catch (error) {
        console.error('Erro ao carregar marcadores:', error);
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function clearRoute(options = {}) {
    const { keepDestination = false } = options;
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }
    if (routeDestinationMarker) {
        map.removeLayer(routeDestinationMarker);
        routeDestinationMarker = null;
    }
    if (!keepDestination) {
        currentRouteDestination = null;
    }
}

function getDistanceMeters(pointA, pointB) {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const dLat = toRadians(pointB.lat - pointA.lat);
    const dLng = toRadians(pointB.lng - pointA.lng);
    const lat1 = toRadians(pointA.lat);
    const lat2 = toRadians(pointB.lat);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

function shouldIgnoreHotkey(event) {
    if (!event || !event.target) return false;
    const target = event.target;
    return target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable;
}

function openCategoryPrompt(latlng) {
    const categoria = prompt(
        "Escolha a categoria do local:\n" +
        "1 - Restaurante\n" +
        "2 - Posto de gasolina\n" +
        "3 - Parque\n" +
        "4 - Biblioteca\n" +
        "5 - Laboratório\n" +
        "6 - Observatório\n" +
        "7 - Ambulância\n" +
        "8 - Satélite\n" +
        "9 - Banheiros\n" +
        "10 - Clima\n" +
        "11 - Museu\n" +
        "12 - Carro\n" +
        "13 - Outro\n" +
        "Digite 1 a 13:"
    );

    let iconSelecionado;
    let categoriaTexto;
    let categoriaValue;
    if (categoria === '1') {
        iconSelecionado = restaurantIcon;
        categoriaTexto = 'Restaurante';
        categoriaValue = 'restaurante';
    } else if (categoria === '2') {
        iconSelecionado = gasStationIcon;
        categoriaTexto = 'Posto de gasolina';
        categoriaValue = 'posto';
    } else if (categoria === '3') {
        iconSelecionado = parkIcon;
        categoriaTexto = 'Parque';
        categoriaValue = 'parque';
    } else if (categoria === '4') {
        iconSelecionado = libraryIcon;
        categoriaTexto = 'Biblioteca';
        categoriaValue = 'biblioteca';
    } else if (categoria === '5') {
        iconSelecionado = labIcon;
        categoriaTexto = 'Laboratório';
        categoriaValue = 'laboratorio';
    } else if (categoria === '6') {
        iconSelecionado = observatoryIcon;
        categoriaTexto = 'Observatório';
        categoriaValue = 'observatorio';
    } else if (categoria === '7') {
        iconSelecionado = ambulanceIcon;
        categoriaTexto = 'Ambulância';
        categoriaValue = 'ambulancia';
    } else if (categoria === '8') {
        iconSelecionado = satelliteIcon;
        categoriaTexto = 'Satélite';
        categoriaValue = 'satelite';
    } else if (categoria === '9') {
        iconSelecionado = restroomIcon;
        categoriaTexto = 'Banheiros';
        categoriaValue = 'banheiros';
    } else if (categoria === '10') {
        iconSelecionado = climateIcon;
        categoriaTexto = 'Clima';
        categoriaValue = 'clima';
    } else if (categoria === '11') {
        iconSelecionado = museumIcon;
        categoriaTexto = 'Museu';
        categoriaValue = 'museu';
    } else if (categoria === '12') {
        iconSelecionado = carIcon;
        categoriaTexto = 'Carro';
        categoriaValue = 'carro';
    } else {
        iconSelecionado = placeIcon;
        categoriaTexto = 'Outro';
        categoriaValue = 'outro';
    }

    pendingMarkerData = {
        categoriaValue,
        categoriaTexto,
        iconSelecionado,
        lat: latlng.lat,
        lng: latlng.lng
    };
    openMarkerFormModal();
}

async function drawRoute(start, end) {
    currentRouteDestination = end;
    clearRoute();

    const routeCoords = [
        [start.lat, start.lng],
        [end.lat, end.lng]
    ];

    routeLine = L.polyline(routeCoords, { color: '#007bff', weight: 5, opacity: 0.85, dashArray: '10,10' }).addTo(map);

    routeDestinationMarker = L.circleMarker([end.lat, end.lng], {
        radius: 7,
        color: '#0b5ed7',
        fillColor: '#0b5ed7',
        fillOpacity: 0.9,
        weight: 2
    }).addTo(map);
    routeDestinationMarker.bindPopup('Destino selecionado');

    const bounds = L.latLngBounds(routeCoords);
    bounds.extend([start.lat, start.lng]);
    bounds.extend([end.lat, end.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
}

function refreshRouteLine(start, end) {
    if (!currentRouteDestination || !routeLine) return;

    const routeCoords = [
        [start.lat, start.lng],
        [end.lat, end.lng]
    ];

    routeLine.setLatLngs(routeCoords);
    if (routeDestinationMarker) {
        routeDestinationMarker.setLatLng([end.lat, end.lng]);
    } else {
        routeDestinationMarker = L.circleMarker([end.lat, end.lng], {
            radius: 7,
            color: '#0b5ed7',
            fillColor: '#0b5ed7',
            fillOpacity: 0.9,
            weight: 2
        }).addTo(map);
        routeDestinationMarker.bindPopup('Destino selecionado');
    }
}

async function getMarkerById(markerId) {
    try {
        const response = await fetch(`/api/markers/${markerId}`);
        if (!response.ok) throw new Error('Marcador não encontrado');
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar marcador:', error);
        return null;
    }
}

function getCurrentUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalização não suportada.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

async function routeToCoordinates(lat, lng, name) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        alert('Coordenadas do destino inválidas.');
        return;
    }

    let origin = userCoords;
    if (!origin) {
        try {
            origin = await getCurrentUserLocation();
            userCoords = origin;
        } catch (error) {
            console.error('Erro ao obter localização do usuário:', error);
            alert('Não foi possível obter sua localização atual. Verifique as permissões do navegador.');
            return;
        }
    }

    drawRoute(origin, { lat: parsedLat, lng: parsedLng });
}

async function routeToMarker(markerId, name, fallbackLat, fallbackLng) {
    let origin = userCoords;
    if (!origin) {
        try {
            origin = await getCurrentUserLocation();
            userCoords = origin;
        } catch (error) {
            console.error('Erro ao obter localização do usuário:', error);
            alert('Não foi possível obter sua localização atual. Verifique as permissões do navegador.');
            return;
        }
    }

    const marker = await getMarkerById(markerId);
    if (!marker) {
        console.warn('Não foi possível obter o marcador via API; usando as coordenadas do link como fallback.');
        if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
            drawRoute(origin, { lat: fallbackLat, lng: fallbackLng });
            return;
        }
        alert('Não foi possível obter o ponto no banco de dados.');
        return;
    }

    const destinationLat = Number(marker.latitude);
    const destinationLng = Number(marker.longitude);
    if (!Number.isFinite(destinationLat) || !Number.isFinite(destinationLng)) {
        console.warn('Coordenadas do marcador inválidas; usando coordenadas do link como fallback.');
        if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
            drawRoute(origin, { lat: fallbackLat, lng: fallbackLng });
            return;
        }
        alert('O marcador selecionado não possui coordenadas válidas.');
        return;
    }

    drawRoute(origin, { lat: destinationLat, lng: destinationLng });
}

function renderModalSlider() {
    if (!modalPhotos || modalPhotos.length === 0) {
        modalSlider.classList.add('hidden');
        sliderCounter.textContent = '';
        return;
    }

    modalSlider.classList.remove('hidden');
    const photo = modalPhotos[modalPhotoIndex];
    sliderImage.src = photo.referencia;
    sliderImage.alt = photo.referencia.split('/').pop() || 'Imagem do local';
    sliderCaption.textContent = photo.descricao || photo.referencia.split('/').pop();
    sliderCounter.textContent = `Imagem ${modalPhotoIndex + 1} de ${modalPhotos.length}`;
}

function openModal(nome, descricao, photos = []) {
    modalTitle.textContent = nome;
    modalDescription.textContent = descricao;
    modalPhotos = photos;
    modalPhotoIndex = 0;
    renderModalSlider();
    infoModal.classList.remove('hidden');
}

function closeModal() {
    infoModal.classList.add('hidden');
}

sliderPrev.addEventListener('click', () => {
    if (modalPhotos.length === 0) return;
    modalPhotoIndex = (modalPhotoIndex - 1 + modalPhotos.length) % modalPhotos.length;
    renderModalSlider();
});

sliderNext.addEventListener('click', () => {
    if (modalPhotos.length === 0) return;
    modalPhotoIndex = (modalPhotoIndex + 1) % modalPhotos.length;
    renderModalSlider();
});

closeModalButton.addEventListener('click', closeModal);
infoModal.addEventListener('click', function(event) {
    if (event.target === infoModal) {
        closeModal();
    }
});

document.addEventListener('click', function(event) {
    if (event.target.matches('.saiba-mais')) {
        event.preventDefault();
        const nome = event.target.dataset.name || '';
        const descricao = event.target.dataset.descricao || '';
        const photos = event.target.dataset.photos ? JSON.parse(decodeURIComponent(event.target.dataset.photos)) : [];
        openModal(nome, descricao, photos);
    }

    const routeLink = event.target.closest('.route-to');
    if (routeLink) {
        event.preventDefault();
        const lat = parseFloat(routeLink.dataset.lat);
        const lng = parseFloat(routeLink.dataset.lng);
        const markerId = parseInt(routeLink.dataset.id, 10);
        if (!isNaN(markerId)) {
            routeToMarker(markerId, routeLink.dataset.name || 'Destino', lat, lng);
        } else if (!isNaN(lat) && !isNaN(lng)) {
            routeToCoordinates(lat, lng, routeLink.dataset.name || 'Destino');
        } else {
            alert('Não foi possível identificar o destino da rota.');
        }
    }

});

// Quando clicar em "Localizar-me"
btn.addEventListener("click", () => {

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                iniciarMapa(position.coords.latitude, position.coords.longitude);
            },
            () => {
                alert("Não foi possível obter localização. Usando INPE.");
                iniciarMapa(inpeCoords[0], inpeCoords[1]);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Geolocalização não suportada. Usando INPE.");
        iniciarMapa(inpeCoords[0], inpeCoords[1]);
    }

});

// Função para iniciar o mapa
function iniciarMapa(lat, lng) {

    // Esconder tela inicial e mostrar mapa
    telaInicial.style.display = "none";
    mapDiv.style.display = "block";

    // Criar mapa
    map = L.map('map', { doubleClickZoom: false }).setView([lat, lng], 15);

    // Adicionar tiles do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Marcador fixo do INPE
    L.marker(inpeCoords, { icon: placeIcon })
        .addTo(map)
        .bindPopup("INPE - Instituto Nacional de Pesquisas Espaciais");

    loadMarkers();

    // Atualizar posição do usuário em tempo real
    if (navigator.geolocation) {
        if (btnCentralizar) {
            btnCentralizar.addEventListener('click', () => {
                if (userCoords && map) {
                    map.setView([userCoords.lat, userCoords.lng], map.getZoom());
                }
            });
        }

        navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (!userMarker) {
                    userMarker = L.marker([lat, lng], { icon: userIcon })
                        .addTo(map)
                        .bindPopup("Você está aqui")
                        .openPopup();
                } else {
                    userMarker.setLatLng([lat, lng]);
                }
                userCoords = { lat, lng };

                if (currentRouteDestination) {
                    const distanceToDestination = getDistanceMeters(userCoords, currentRouteDestination);
                    if (distanceToDestination <= ARRIVAL_DISTANCE_METERS) {
                        clearRoute();
                        alert('Você chegou ao destino!');
                    } else {
                        refreshRouteLine(userCoords, currentRouteDestination);
                    }
                }

                // Não reposicionar o mapa automaticamente para permitir navegação do usuário.
            },
            (error) => console.log("Erro de localização:", error),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    }

    // Modo administrador: adicionar marcadores clicando
    if (isAdmin) {
        map.on('mousemove', function(e) {
            hoveredMapLatLng = e.latlng;
        });
        map.on('mouseout', function() {
            hoveredMapLatLng = null;
        });
        map.on('click', function(e) {
            if (suppressNextMapClick) {
                suppressNextMapClick = false;
                return;
            }
            openCategoryPrompt(e.latlng);
        });
    }
}
