var host = CONFIG.host;
const form = document.getElementById('create-post-form');
const msg = document.getElementById('post-message');

async function generateJwt(userId) {
    try {
        const response = await fetch(`${host}/api/v1/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({id: userId})
        });

        if (!response.ok) {
            // Попробуем прочитать текст ошибки из ответа
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}`);
        }

        // Успешно: JWT пришёл в http-only cookie, читать JSON не нужно
        return true;
    } catch (err) {
        console.error('Ошибка при генерации JWT:', err);
        return false;
    }
}

const modal = document.getElementById('schedule-modal');
const detailsDiv = document.getElementById('schedule-details');

// Функция рендеринга расписания
function renderSchedule(schedules) {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    let html = `
      <div class="createButton">
        <label for="day-select">День недели:</label>
        <select id="day-select">
          ${days.map((d, i) => `<option value="${i + 1}">${d}</option>`).join('')}
        </select>
        <button id="create-schedule-btn">Создать расписание</button>
      </div>
    `;

    schedules.forEach(sch => {
        html += `
      <div class="day-block" data-schedule-id="${sch.id}">
        <h4>
          ${days[sch.dayOfWeek - 1]}
          <button class="delete-schedule-btn" title="Удалить расписание">❌</button>
        </h4>
    `;
        if (sch.lessons.length) {
            html += '<ul>';
            sch.lessons.forEach(lesson => {
                html += `
                  <li data-lesson-id="${lesson.id}">
                    Урок ${lesson.period}: ${lesson.subject}
                    <button class="delete-lesson-btn" title="Удалить урок">❌</button>
                  </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Нет уроков</p>';
        }

        // Форма добавления нового урока: админ вводит номер урока и предмет
        html += `
          <div class="add-lesson" data-schedule-id="${sch.id}">
            <input type="number" class="new-period" min="1" placeholder="Номер урока" />
            <input type="text"   class="new-subject" placeholder="Название предмета" />
            <button class="add-lesson-btn">Добавить урок</button>
          </div>
        </div>`;
    });

    return html;
}

// Вызов при загрузке:
document.addEventListener('DOMContentLoaded', () => {
    const item = localStorage.getItem('user');
    if (!item) return console.warn('Нет user в localStorage');
    const user = JSON.parse(item);
    generateJwt(user.id).then(ok => {
        if (ok) console.log('JWT установлен в куку');
    });
});


const filesContainer = document.getElementById('files-container');
const addPhotoBtn     = document.getElementById('add-photo-btn');
addPhotoBtn.addEventListener('click', () => {
    const currentCount = filesContainer.querySelectorAll('input[name="files"]').length;
    if (currentCount >= 10) {
        return alert('Максимум 10 фотографий');
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'files';
    filesContainer.appendChild(input);
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = '';
    msg.classList.remove('success');

    // собираем FormData
    const formData = new FormData();
    formData.append('title', form.title.value.trim());
    formData.append('content', form.content.value.trim());
    let value = form.type.value;

    console.log(value);
    if (value) {
        formData.append('type', value);
    }
    // собираем файлы из всех input[name="photos"]
    const fileInputs = filesContainer.querySelectorAll('input[name="files"]');
    fileInputs.forEach(input => {
        if (input.files[0]) {
            formData.append('files', input.files[0]);
        }
    });
    try {
        const res = await fetch(`${host}/api/v1/posts`, {
            method: 'POST',
            credentials: "include",
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || res.statusText);
        }


        msg.textContent = 'Пост успешно создан!';
        msg.classList.add('success');
        form.reset();

        filesContainer.innerHTML = `<input type="file" name="files"`;
    } catch (error) {
        console.error('Create post error:', error);
        msg.textContent = `Ошибка: ${error.message}`;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.querySelector('#classes-list .class-list');
    const modal = document.getElementById('schedule-modal');
    const detailsDiv = document.getElementById('schedule-details');
    const closeBtn = modal.querySelector('.close');

    // Функция открытия модалки с заданным содержимым
    function openModal(html) {
        detailsDiv.innerHTML = html;
        modal.style.display = 'block';
    }

    // Закрытие
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // После загрузки списка классов: вешаем data-id и клик
    fetch(`${host}/api/v1/classes`)
        .then(r => r.json())
        .then(classes => {
            classes.sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));
            classes.forEach(cls => {
                // создаём li
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';
                li.style.padding = '4px 0';

                // текст и открытие модалки
                const span = document.createElement('span');
                span.textContent = `Класс ${cls.grade}${cls.section}`;
                span.style.cursor = 'pointer';
                span.addEventListener('click', () => {
                    fetch(`${host}/api/v1/schedules/${cls.id}`)
                        .then(r => r.ok ? r.json() : Promise.reject(r.status))
                        .then(schedules => showScheduleModal(schedules, cls))
                        .catch(err => openModal(`<p>Ошибка загрузки: ${err}</p>`));
                });

                // кнопка удаления класса
                const delBtn = document.createElement('button');
                delBtn.textContent = '❌';
                delBtn.title = 'Удалить класс';
                delBtn.style.marginLeft = '8px';
                delBtn.addEventListener('click', () => {
                    if (!confirm(`Удалить класс ${cls.grade}${cls.section}?`)) return;
                    fetch(`${host}/api/v1/classes/${cls.id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    })
                        .then(res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            // убираем li из списка
                            li.remove();
                        })
                        .catch(err => {
                            console.error('Ошибка удаления класса:', err);
                            alert('Не удалось удалить класс');
                        });
                });

                // собираем li
                li.appendChild(span);
                li.appendChild(delBtn);
                listContainer.appendChild(li);
            });
        })
        .catch(err => {
            console.error(err);
            listContainer.innerHTML = '<li>Не удалось загрузить классы</li>';
        });

// Получаем строку из localStorage
    const item = localStorage.getItem('user');

    if (item) {
        // Парсим в объект
        const user = JSON.parse(item);
        const userId = user.id;

        console.log('User ID:', userId); // теперь всё верно

        // Вызываем генерацию JWT
        generateJwt(userId);
    }


    const addGradeInput   = document.getElementById('new-grade');
    const addSectionInput = document.getElementById('new-section');
    const addClassBtn     = document.getElementById('add-class-btn');


    addClassBtn.addEventListener('click', () => {
        const grade   = parseInt(addGradeInput.value, 10);
        const section = addSectionInput.value.trim();
        if (!grade || grade < 1 || grade > 12) {
            return alert('Введите номер класса от 1 до 12');
        }
        if (!section) {
            return alert('Введите секцию');
        }

        fetch(`${host}/api/v1/classes`, {
            method: 'POST',
            credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ grade, section })
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(newClass => {
                // Добавляем новый <li> в конец списка
                const li = document.createElement('li');
                li.textContent = `Класс ${newClass.grade}${newClass.section}`;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    fetch(`${host}/api/v1/schedules/${newClass.id}`)
                        .then(r => r.ok ? r.json() : Promise.reject(r.status))
                        .then(schedules => showScheduleModal(schedules, newClass))
                        .catch(err => openModal(`<p>Ошибка загрузки: ${err}</p>`));
                });
                document.querySelector('#classes-list .class-list')
                    .appendChild(li);

                // Сброс полей
                addGradeInput.value = '';
                addSectionInput.value = '';
            })
            .catch(err => {
                console.error('Ошибка создания класса:', err);
                alert('Не удалось создать класс');
            });
    });


});


// 1. Показываем и навешиваем всё в одном месте
function showScheduleModal(schedules, cls) {
    // 1.1. Рендерим HTML
    detailsDiv.innerHTML = renderSchedule(schedules);

    // 1.2. Заголовок и показ модалки
    document.querySelector('#schedule-modal h3').textContent =
        `Расписание класса ${cls.grade}${cls.section}`;
    modal.style.display = 'block';

// 1.3. Навешиваем лисенеры на все кнопки "Добавить урок"
    detailsDiv.querySelectorAll('.add-lesson').forEach(container => {
        const scheduleId = container.dataset.scheduleId;
        const btn = container.querySelector('.add-lesson-btn');
        const subjectInput = container.querySelector('.new-subject');
        const periodInput = container.querySelector('.new-period');

        btn.addEventListener('click', () => {
            const subject = subjectInput.value.trim();
            const period = parseInt(periodInput.value, 10);

            if (!subject) {
                return alert('Введите название предмета');
            }
            if (!period || period < 1) {
                return alert('Введите корректный номер урока (положительное число)');
            }

            fetch(`${host}/api/v1/lessons`, {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({scheduleId, period, subject})
            })
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return fetch(`${host}/api/v1/schedules/${cls.id}`);
                })
                .then(r => r.json())
                .then(updatedSchedules => {
                    // Рекурсивно перерендерить и навесить лисенеры заново
                    showScheduleModal(updatedSchedules, cls);
                })
                .catch(err => {
                    console.error(err);
                    alert('Не удалось добавить урок');
                });
        });
    });

    // 1.4. Навешиваем лисенер на кнопку "Создать расписание"
    const createBtn = detailsDiv.querySelector('#create-schedule-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            const day = +detailsDiv.querySelector('#day-select').value;
            fetch(`${host}/api/v1/schedules`, {
                method: 'POST',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({classId: cls.id, dayOfWeek: day})
            })
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return fetch(`${host}/api/v1/schedules/${cls.id}`);
                })
                .then(r => r.json())
                .then(updatedSchedules => {
                    showScheduleModal(updatedSchedules, cls);
                })
                .catch(err => {
                    alert('Ошибка при создании: ' + err.message);
                });
        });
    }


    detailsDiv.querySelectorAll('.delete-lesson-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const li = btn.closest('li');
            const lessonId = li.dataset.lessonId;

            fetch(`${host}/api/v1/lessons/${lessonId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {'Content-Type': 'application/json'}
            })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    // после удаления заново подгружаем расписание
                    return fetch(`${host}/api/v1/schedules/${cls.id}`);
                })
                .then(res => res.json())
                .then(updatedSchedules => {
                    showScheduleModal(updatedSchedules, cls);
                })
                .catch(err => {
                    console.error('Ошибка при удалении урока:', err);
                    alert('Не удалось удалить урок');
                });
        });
    });

    detailsDiv.querySelectorAll('.delete-schedule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const dayBlock  = btn.closest('.day-block');
            const scheduleId = dayBlock.dataset.scheduleId;

            if (!confirm('Удалить всё расписание этого дня?')) return;

            fetch(`${host}/api/v1/schedules/${scheduleId}`, {
                method: 'DELETE',
                credentials: 'include'
            })
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    // после удаления – обновляем данные
                    return fetch(`${host}/api/v1/schedules/${cls.id}`);
                })
                .then(r => r.json())
                .then(updatedSchedules => {
                    showScheduleModal(updatedSchedules, cls);
                })
                .catch(err => {
                    console.error('Ошибка удаления расписания:', err);
                    alert('Не удалось удалить расписание');
                });
        });
    });
}
