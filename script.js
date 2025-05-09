const API_KEY = ''; 
const speedLimit = 80;
let warningTimeout = null;
let isVideoPaused = false;
let currentSpeed = 0;
let isOverspeeding = false;
let warningStartTime = null;
const warningSound = new Audio('warning.mp3');
warningSound.loop = true;

// DOM Elements
const searchInput = document.getElementById('search-input');
const mobileSearchInput = document.getElementById('mobile-search-input');
const searchBtn = document.getElementById('search-btn');
const mobileSearchBtn = document.getElementById('mobile-search-btn');
const videoContainer = document.querySelector('.video-container');
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const speedText = document.getElementById('speed-text');
const speedStatusDiv = document.getElementById('speed-status');
const warningMessage = document.getElementById('warning-message');
const closeWarningBtn = document.getElementById('close-warning');
const modal = document.getElementById('video-modal');
const modalClose = document.querySelector('.modal-close');
const videoPlayer = document.getElementById('video-player');
const modalContent = document.querySelector('.modal-content');

// Sidebar Toggle
menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('sidebar-hidden');
  sidebar.classList.toggle('sidebar-visible');
});

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
  if (window.innerWidth < 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    sidebar.classList.add('sidebar-hidden');
    sidebar.classList.remove('sidebar-visible');
  }
});

// Close warning message
closeWarningBtn.addEventListener('click', () => {
  warningMessage.classList.add('hidden');
  warningSound.pause();
});

// Open video modal
function openVideoModal(videoId) {
  videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  modalContent.innerHTML = `
    <span class="modal-close absolute top-2 right-4 text-3xl cursor-pointer text-gray-600 hover:text-gray-900">×</span>
    <iframe id="video-player" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full" style="aspect-ratio: 16/9;"></iframe>
  `;
  modal.classList.remove('hidden');
  isVideoPaused = false;

  // Re-attach modal close event
  document.querySelector('.modal-close').addEventListener('click', closeVideoModal);

  // Check if video is embeddable
  fetch(`https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoId}&key=${API_KEY}`)
    .then(response => response.json())
    .then(data => {
      if (data.items && data.items.length > 0 && !data.items[0].status.embeddable) {
        modalContent.innerHTML = `
          <span class="modal-close absolute top-2 right-4 text-3xl cursor-pointer text-gray-600 hover:text-gray-900">×</span>
          <div class="text-center p-6">
            <p class="text-lg text-gray-800 mb-4">This video cannot be embedded.</p>
            <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Watch on YouTube</a>
          </div>
        `;
        document.querySelector('.modal-close').addEventListener('click', closeVideoModal);
      }
    })
    .catch(error => console.error('Error checking video embeddability:', error));
}

// Close video modal
function closeVideoModal() {
  videoPlayer.src = '';
  modalContent.innerHTML = `
    <span class="modal-close absolute top-2 right-4 text-3xl cursor-pointer text-gray-600 hover:text-gray-900">×</span>
    <iframe id="video-player" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full" style="aspect-ratio: 16/9;"></iframe>
  `;
  modal.classList.add('hidden');
  isVideoPaused = true;
  warningMessage.classList.add('hidden');
  warningSound.pause();
  if (warningTimeout) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
  }
}

modalClose.addEventListener('click', closeVideoModal);
window.addEventListener('click', (e) => {
  if (e.target === modal) closeVideoModal();
});

// YouTube Search
function searchVideos(query) {
  fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=12&videoEmbeddable=true&key=${API_KEY}`)
    .then(response => response.json())
    .then(data => {
      videoContainer.innerHTML = '';
      if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
          const videoId = item.id.videoId;
          const title = item.snippet.title;
          const thumbnail = item.snippet.thumbnails.medium.url;
          const channel = item.snippet.channelTitle;
          const publishedAt = item.snippet.publishedAt;
          const card = document.createElement('div');
          card.className = 'video-card bg-white rounded-lg overflow-hidden';
          card.innerHTML = `
            <img src="${thumbnail}" alt="${title}" class="video-thumbnail w-full h-48 object-cover cursor-pointer">
            <div class="p-4">
              <h3 class="video-title text-base font-medium line-clamp-2">${title}</h3>
              <p class="video-channel text-sm text-gray-600 mt-1">${channel}</p>
              <p class="video-views text-sm text-gray-600">${new Date(publishedAt).toLocaleDateString()}</p>
            </div>
          `;
          card.querySelector('.video-thumbnail').addEventListener('click', () => {
            openVideoModal(videoId);
          });
          videoContainer.appendChild(card);
        });
      } else {
        videoContainer.innerHTML = '<p class="text-center text-gray-600">No embeddable videos found.</p>';
      }
    })
    .catch(error => {
      console.error('Error fetching videos:', error);
      videoContainer.innerHTML = '<p class="text-center text-red-600">Error loading videos. Check API key or quota.</p>';
    });
}

// Search Handlers
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) searchVideos(query);
});
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) searchVideos(query);
  }
});
mobileSearchBtn.addEventListener('click', () => {
  const query = mobileSearchInput.value.trim();
  if (query) searchVideos(query);
});
mobileSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = mobileSearchInput.value.trim();
    if (query) searchVideos(query);
  }
});

// Speed Monitoring
function monitorSpeed() {
  currentSpeed = Math.floor(Math.random() * 121); // Random speed 0-120 km/h
  let status;

  if (currentSpeed > speedLimit) {
    if (!isOverspeeding) {
      isOverspeeding = true;
      warningStartTime = Date.now();
      warningSound.play().catch(error => console.error('Error playing warning sound:', error));
    }
    status = (Date.now() - warningStartTime < 10000) ? 'warning' : 'danger';
  } else {
    if (isOverspeeding) {
      isOverspeeding = false;
      warningSound.pause();
    }
    status = 'safe';
  }

  return { speed: currentSpeed, status };
}

function updateSpeed() {
  const { speed, status } = monitorSpeed();

  const statusText = `Speed: ${speed} km/h (${status.charAt(0).toUpperCase() + status.slice(1)})`;
  speedText.textContent = statusText;
  speedStatusDiv.className = `mb-4平原 p-3 bg-gray-900 rounded-lg flex items-center gap-3 text-${
    status === 'safe' ? 'green-400' : status === 'warning' ? 'yellow-400' : 'red-400'
  }`;

  if (status === 'warning' && !modal.classList.contains('hidden')) {
    warningMessage.classList.remove('hidden');
    if (!warningTimeout) {
      warningTimeout = setTimeout(() => {
        closeVideoModal();
      }, 3000); // 3 seconds
    }
  } else if (status === 'danger' && !modal.classList.contains('hidden')) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
    warningMessage.classList.remove('hidden');
    closeVideoModal();
  } else {
    clearTimeout(warningTimeout);
    warningTimeout = null;
    warningMessage.classList.add('hidden');
    warningSound.pause();
  }
}

// Initial Setup
searchVideos('trending');
setInterval(updateSpeed, 2000); // Update every 2 seconds
updateSpeed();
