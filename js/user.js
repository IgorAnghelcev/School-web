var host = CONFIG.host;

async function handleRegister(e) {
    const form = document.querySelector('.form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Получаем значения полей
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Подготовка тела запроса
        const body = {name, email, password};

        try {
            const response = await fetch(`${host}/api/v1/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                // Если сервер вернул ошибку (например, 400)
                const errorData = await response.json();
                console.error('Ошибка сервера:', errorData);
                alert(`Ошибка: ${errorData.message || response.statusText}`);
                return;
            }

            const data = await response.json();
            console.log('Успех:', data);
            alert('Регистрация прошла успешно!');
            // Можно очистить форму или перенаправить пользователя
            form.reset();
        } catch (err) {
            console.error('Сетевая ошибка:', err);
            alert('Не удалось связаться с сервером.');
        }
    });
};

// helper: получить пользователя из localStorage
function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

// helper: установить пользователя
function setUser(userObj) {
    localStorage.setItem('user', JSON.stringify(userObj));
}

// helper: очистить
function clearUser() {
    localStorage.removeItem('user');
}


function renderAuthMenu() {
    const menu = document.getElementById('auth-menu');
    menu.innerHTML = ''; // очистить

    const user = getUser();
    if (user) {
        // Если залогинен — одна кнопка «Выход»
        const li = document.createElement('li');
        const btn = document.createElement('a');
        btn.href = '#';
        btn.textContent = 'Выход';
        btn.addEventListener('click', e => {
            e.preventDefault();
            clearUser();
            window.location.href = 'index.html';
        });
        li.appendChild(btn);
        menu.appendChild(li);
        console.log('exit button created')
    } else {
        // Иначе — «Регистрация» и «Вход»
        ['Регистрация', 'Вход'].forEach(text => {
            const li = document.createElement('li');
            const btn = document.createElement('a');
            btn.href = '#';
            btn.textContent = text;
            btn.addEventListener('click', e => {
                e.preventDefault();
                // показать нужную форму, скрыть другую
                document.getElementById('register-container').style.display = (text === 'Регистрация' ? 'block' : 'none');
                document.getElementById('login-container').style.display = (text === 'Вход' ? 'block' : 'none');
            });
            li.appendChild(btn);
            menu.appendChild(li);
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const body = {email, password};

    try {
        // предполагаемая точка входа на логин:
        const res = await fetch(`${host}/api/v1/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const err = await res.json();
            alert(`Ошибка входа: ${err.message || res.statusText}`);
            return;
        }
        const user = await res.json();

        setUser(user);
        alert(`Добро пожаловать, ${user.name}!`);
        location.reload();
    } catch (err) {
        console.error(err);
        alert('Сетевая ошибка при входе');
    }
}


let currentPage = 1;
let totalPages = Infinity;
let isLoading = false;

const feedContainer = document.getElementById('feed');
let feedType = null;
if (feedContainer) {
    feedType = feedContainer.dataset.feedType || 'NEWS';
}

async function loadPosts() {
    if (isLoading || currentPage > totalPages) return;
    isLoading = true;

    try {
        const res = await fetch(
            `${host}/api/v1/posts?page=${currentPage}&limit=10&type=${encodeURIComponent(feedType)}`,
            {credentials: 'include'}
        );
        if (!res.ok) throw new Error(res.statusText);

        const {data, meta} = await res.json();
        totalPages = parseInt(meta.totalPages, 10);

        data.forEach(post => {
            const postEl = document.createElement('div');
            postEl.classList.add('post');
            postEl.dataset.postId = post.id;
            postEl.style.position = 'relative';

            // --- Рендерим стандартный VIEW режима ---
            renderPostView(postEl, post);


// --- Если админ — добавляем кнопки «×» и «✎» ---
            if (isAdmin) {
                renderAdminPostButtons(post, postEl);
            }

            feedContainer.appendChild(postEl);
        });

        currentPage++;
    } catch (err) {
        console.error('Ошибка при загрузке постов:', err);
    } finally {
        isLoading = false;
    }
}

function renderAdminPostButtons(post, postEl) {
    // DELETE
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.title = 'Удалить пост';
    Object.assign(delBtn.style, {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'transparent',
        border: 'none',
        fontSize: '30px',
        color: 'red',
        cursor: 'pointer',
    });
    delBtn.addEventListener('click', () => deletePost(post.id, postEl));
    postEl.appendChild(delBtn);

    // EDIT
    const editBtn = document.createElement('button');
    editBtn.textContent = '✎';
    editBtn.title = 'Редактировать пост';
    Object.assign(editBtn.style, {
        position: 'absolute',
        top: '8px',
        right: '48px',
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        color: '#333',
        cursor: 'pointer',
    });
    editBtn.addEventListener('click', () => openEditForm(post, postEl));
    postEl.appendChild(editBtn);
}

// Вынесем рендер «просмотра» поста в функцию, чтобы можно было легко ре-рендерить после сохранения
function renderPostView(postEl, post) {
    let filesHtml = '';
    if (post.files?.length) {
        filesHtml = '<div class="post-files">';
        post.files.forEach(file => {
            const {url, mimeType, id: fileId} = file;
            const prettyName = url.split('/').pop();
            filesHtml += `<div class="file-item ${mimeType.startsWith('image/') ? 'file-item--image' : ''}" data-file-id="${fileId}">
        ${mimeType.startsWith('image/')
                ? `<img src="${url}" alt="${prettyName}">`
                : `<a href="${url}" target="_blank" rel="noopener noreferrer">${prettyName}</a>`}
      </div>`;
        });
        filesHtml += '</div>';
    }

    postEl.innerHTML = `
    <div class="post-header">
      <span class="post-author">${'Лицей им. С. Барановского'}</span>
      <span class="post-date">${new Date(post.createdAt).toLocaleString('ru-RU')}</span>
    </div>
    <h3 class="post-title">${post.title}</h3>
    <div class="post-content">${post.content || ''}</div>
    ${filesHtml}
  `;

    // картинки кликабельны
    postEl.querySelectorAll('.file-item--image img').forEach(imgEl => {
        imgEl.style.cursor = 'pointer';
        imgEl.addEventListener('click', () => openImageModal(imgEl.src));
    });
}

// Открывает форму редактирования
function openEditForm(post, postEl) {
    // Сохраняем текущие данные
    const {id, title, content, files = []} = post;

    // Строим HTML-форму
    postEl.innerHTML = `
    <form class="edit-post-form">
      <label>
        Заголовок:<br>
        <input name="title" type="text" value="${title}">
      </label><br><br>
      <label>
        Содержимое:<br>
        <textarea name="content" rows="4">${content}</textarea>
      </label><br><br>
      <label>
        Добавить файлы:<br>
        <input name="newFiles" type="file" multiple>
      </label><br><br>
      <div class="existing-files">
        ${files.map(f => `
          <div class="existing-file" data-file-id="${f.id}">
            ${f.url.split('/').pop()}
            <button type="button" class="remove-file-btn" title="Удалить файл">&times;</button>
          </div>
        `).join('')}
      </div><br>
      <button type="submit">Сохранить</button>
      <button type="button" class="cancel-edit">Отмена</button>
    </form>
  `;

    // Обработчики
    // удаление уже существующего файла
    postEl.querySelectorAll('.remove-file-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const fileDiv = e.target.closest('.existing-file');
            const fileId = fileDiv.dataset.fileId;
            if (!confirm('Удалить этот файл?')) return;
            try {
                const res = await fetch(`${host}/api/v1/files/${fileId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (!res.ok) throw new Error(res.statusText);
                fileDiv.remove();
            } catch (err) {
                console.error(err);
                alert('Не удалось удалить файл');
            }
        });
    });

    // сабмит формы
    postEl.querySelector('.edit-post-form').addEventListener('submit', async e => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData();
        formData.append('title', form.title.value);
        formData.append('content', form.content.value);
        const newFiles = form.newFiles.files;
        for (let file of newFiles) formData.append('files', file);

        try {
            const res = await fetch(`${host}/api/v1/posts/${id}`, {
                method: 'PATCH',
                credentials: 'include',
                body: formData
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || res.statusText);
            }
            const updated = await res.json();
            // обновляем локальный объект и ре-рендерим
            Object.assign(post, updated);
            renderPostView(postEl, post);
            // снова повесим админ-кнопки
            if (isAdmin) {
                // кнопка удаления поста
                const delBtn = document.createElement('button');
                delBtn.textContent = '×';
                delBtn.title = 'Удалить пост';
                Object.assign(delBtn.style, {
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    fontSize: '30px',
                    color: 'red',
                    cursor: 'pointer'
                });
                delBtn.addEventListener('click', () => deletePost(id, postEl));
                postEl.appendChild(delBtn);
                // кнопка редактирования
                const editBtn = document.createElement('button');
                editBtn.textContent = '✎';
                editBtn.title = 'Редактировать пост';
                Object.assign(editBtn.style, {
                    position: 'absolute',
                    top: '8px',
                    right: '48px',
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#333',
                    cursor: 'pointer'
                });
                editBtn.addEventListener('click', () => openEditForm(post, postEl));
                postEl.appendChild(editBtn);
            }
        } catch (err) {
            console.error(err);
            alert(`Ошибка обновления: ${err.message}`);
        }
    });

    // отмена редактирования
    postEl.querySelector('.cancel-edit').addEventListener('click', () => {
        renderPostView(postEl, post);
        if (isAdmin) {
            renderAdminPostButtons(post, postEl);
        }
    });
}

// Функция удаления поста на сервере и из DOM
async function deletePost(postId, postEl) {
    if (!confirm('Вы действительно хотите удалить этот пост?')) return;
    try {
        const res = await fetch(`${host}/api/v1/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message || res.statusText);
        }
        postEl.remove();
        console.log(`Пост ${postId} удалён`);
    } catch (e) {
        console.error('Ошибка при удалении поста:', e);
        alert(`Не удалось удалить пост: ${e.message}`);
    }
}

// Функция открытия модалки с увеличенным изображением
function openImageModal(imgSrc) {
    const modal = document.getElementById('image-modal');
    const modalImg = modal.querySelector('.image-modal__content');
    modalImg.src = imgSrc;
    modal.classList.remove('hidden');
}

// Функция скрытия модалки
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    modal.classList.add('hidden');
    // На всякий случай обнулим src, чтобы браузер не держал лишний ресурс
    const modalImg = modal.querySelector('.image-modal__content');
    modalImg.src = '';
}


function getDayName(dayOfWeek) {
    switch (dayOfWeek) {
        case 1:
            return 'Понедельник';
        case 2:
            return 'Вторник';
        case 3:
            return 'Среда';
        case 4:
            return 'Четверг';
        case 5:
            return 'Пятница';
        case 6:
            return 'Суббота';
        case 7:
            return 'Воскресенье';
        default:
            return '—';
    }
}

async function loadClassSchedules() {
    const container = document.getElementById('classes-schedule');
    if (!container) return;

    try {
        // 1. Получаем полный список классов
        const resClasses = await fetch(`${host}/api/v1/classes`);
        if (!resClasses.ok) throw new Error('Ошибка при загрузке списка классов');
        let classes = await resClasses.json();

        // 2. Сортируем по grade, а затем по section
        classes.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            return a.section.localeCompare(b.section, 'ru');
        });

        // 3. Для каждого класса делаем fetch расписания и рендерим
        for (const cls of classes) {
            // Создаем обертку для одного класса
            const classDiv = document.createElement('div');
            classDiv.classList.add('class-schedule');

            // Заголовок: "Класс 2A" или "Класс 12Б" и т.д.
            const header = document.createElement('h3');
            header.textContent = `Класс ${cls.grade}${cls.section}`;
            classDiv.appendChild(header);

            // Делаем запрос расписания именно этого класса
            const resSched = await fetch(`${host}/api/v1/schedules/${cls.id}`);
            if (!resSched.ok) {
                // Если что-то пошло не так, просто выводим сообщение
                const errorP = document.createElement('p');
                errorP.textContent = 'Не удалось загрузить расписание.';
                classDiv.appendChild(errorP);
                container.appendChild(classDiv);
                continue;
            }

            const schedules = await resSched.json();

            if (!schedules.length) {
                const noSched = document.createElement('p');
                noSched.textContent = 'Расписание пока не задано.';
                classDiv.appendChild(noSched);
            } else {
                // Для каждого объекта schedule (каждый день недели)
                for (const schedule of schedules) {
                    const dayName = getDayName(schedule.dayOfWeek);
                    const dayHeader = document.createElement('h4');
                    dayHeader.textContent = dayName;
                    classDiv.appendChild(dayHeader);

                    // Построить таблицу уроков
                    const table = document.createElement('table');
                    table.classList.add('schedule-table');

                    // Заголовок таблицы
                    const thead = document.createElement('thead');
                    thead.innerHTML = '<tr><th>Счёт урока</th><th>Предмет</th></tr>';
                    table.appendChild(thead);

                    const tbody = document.createElement('tbody');
                    // schedule.lessons может быть undefined или пустым
                    if (Array.isArray(schedule.lessons) && schedule.lessons.length) {
                        for (const lesson of schedule.lessons) {
                            const row = document.createElement('tr');
                            const tdPeriod = document.createElement('td');
                            tdPeriod.textContent = lesson.period;
                            const tdSubject = document.createElement('td');
                            tdSubject.textContent = lesson.subject;
                            row.appendChild(tdPeriod);
                            row.appendChild(tdSubject);
                            tbody.appendChild(row);
                        }
                    } else {
                        // Если нет уроков, вывести одну строку “Нет уроков”
                        const emptyRow = document.createElement('tr');
                        const td = document.createElement('td');
                        td.setAttribute('colspan', '2');
                        td.textContent = 'Нет уроков';
                        emptyRow.appendChild(td);
                        tbody.appendChild(emptyRow);
                    }
                    table.appendChild(tbody);

                    classDiv.appendChild(table);
                }
            }

            // Прикрепляем карточку класса к контейнеру
            container.appendChild(classDiv);
        }
    } catch (err) {
        console.error(err);
        const errMsg = document.createElement('p');
        errMsg.style.color = 'red';
        errMsg.textContent = 'Ошибка при загрузке расписания всех классов.';
        container.appendChild(errMsg);
    }
}

let isAdmin = false;

async function generateJwt(userId) {
    try {
        const response = await fetch(`${host}/api/v1/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({id: userId})
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            const message = errData?.error ?? `HTTP ${response.status}`;
            throw new Error(message);
        }

        // Сначала ждём полного разбора тела
        const data = await response.json();
        // А потом берём роль
        const userRole = data.user.role;

        if (userRole === 'ADMIN') {
            isAdmin = true;
            console.log('Пользователь — админ');
        }

        return true;
    } catch (err) {
        console.error('Ошибка при генерации JWT:', err);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const item = localStorage.getItem('user');
    if (!item) return console.warn('Нет user в localStorage');
    const user = JSON.parse(item);
    generateJwt(user.id).then(ok => {
        if (ok) console.log('JWT установлен в куку');
    });


    console.log('loaded');
    if (document.getElementById('auth-menu')) {
        renderAuthMenu();
    }


    // Вешаем сабмит-хендлеры на формы
    let elementById = document.getElementById('form-register');
    if (elementById) {
        elementById.addEventListener('submit', handleRegister);
    }
    let elementById1 = document.getElementById('form-login');
    if (elementById1) {
        elementById1.addEventListener('submit', handleLogin);

    }

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 100 && feedContainer) {
            loadPosts();
        }
    });
    if (feedContainer) {
        loadPosts();
    }

    loadClassSchedules();

    const closeBtn = document.querySelector('.image-modal__close');
    if (closeBtn) {
        // При клике на крестик закрываем
        closeBtn.addEventListener('click', () => {
            closeImageModal();
        });
    }
    const modal = document.getElementById('image-modal');
    if (modal) {
        // Если пользователь кликнул вне картинки (по самому фону оверлея), тоже закрываем
        modal.addEventListener('click', event => {
            // Если клик не по самому <img>, а по фону (контейнеру), закрываем
            if (event.target === modal) {
                closeImageModal();
            }
        });
    }

});
