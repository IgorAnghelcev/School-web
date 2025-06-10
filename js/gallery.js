// user.js

var host = CONFIG.host;

const gallery    = document.querySelector('.gallery');
const loadingDiv = document.getElementById('loading');
let page         = 1;
let totalPages;
let isLoading    = false;

// Загружаем фото на страницу и навешиваем click→openImageModal
async function loadPhotos() {
    if (isLoading) return;
    if (totalPages && page > totalPages) return;

    isLoading = true;
    loadingDiv.style.display = 'block';

    try {
        const res = await fetch(
            `${host}/api/v1/posts/photos?page=${page}&limit=20`,
            { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        const { data, meta } = await res.json();
        totalPages = meta.totalPages;

        data.forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = 'Фото';
            img.loading = 'lazy';

            // Навешиваем клик на каждую миниатюру
            img.addEventListener('click', () => {
                openImageModal(photo.url);
            });

            gallery.appendChild(img);
        });

        page++;
    } catch (err) {
        console.error('Ошибка загрузки фото:', err);
    } finally {
        isLoading = false;
        loadingDiv.style.display = 'none';
    }
}

// Функция открывает лайтбокс и подставляет src
function openImageModal(imgSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = modal.querySelector('.image-modal__content');
    modalImg.src = imgSrc;
    modal.classList.remove('hidden');
}

// Функция закрывает лайтбокс
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    const modalImg = modal.querySelector('.image-modal__content');
    modal.classList.add('hidden');
    modalImg.src = '';
}

// При загрузке страницы навешиваем инициализацию
document.addEventListener('DOMContentLoaded', () => {
    // 1) Подгружаем первые фото
    loadPhotos();

    // 2) При скролле подгружаем страницу за страницей
    window.addEventListener('scroll', () => {
        const nearBottom =
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
        if (nearBottom) loadPhotos();
    });

    // 3) Навешиваем обработчики закрытия модалки
    const modal = document.getElementById('image-modal');
    const closeBtn = modal.querySelector('.image-modal__close');

    // Закрываем при клике на крестик
    closeBtn.addEventListener('click', () => {
        closeImageModal();
    });

    // Закрываем при клике по фону оверлея (но не по самой картинке)
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeImageModal();
        }
    });
});
