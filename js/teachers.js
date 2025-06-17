// ../js/initTeachers.js
document.addEventListener('DOMContentLoaded', async () => {
    // Хелпер для рендера фоток в заданый контейнер
    async function loadGrid(jsonPath, gridId, imgBasePath, roleLabels) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        try {
            const res = await fetch(jsonPath);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const items = await res.json();  // [{name: "...jpg"}, ...]

            items.forEach(({ name }, index) => {
                const col = document.createElement('div');
                col.className = 'col-6 col-sm-4 col-md-3 text-center';

                // Определяем роль по индексу, если переданы метки
                let label = '';
                if (roleLabels && Array.isArray(roleLabels)) {
                    label = roleLabels[index] || '';
                }

                col.innerHTML = `
          <div class="card h-100 border-0 shadow-sm">
            <img
              src="${imgBasePath}/${encodeURIComponent(name)}"
              class="card-img-top img-fluid rounded-circle p-2"
              alt="${name.replace(/\.[^/.]+$/, '')}"
              style="height:360px; object-fit:cover;"
            >
            <div class="card-body p-2">
              <small class="d-block fw-bold">${name.replace(/\.[^/.]+$/, '')}</small>
              ${label ? `<small class="text-muted d-block">${label}</small>` : ''}
            </div>
          </div>
        `;
                grid.append(col);
            });
        } catch (err) {
            console.error(`Не удалось загрузить ${jsonPath}:`, err);
            grid.innerHTML = `<p class="text-danger">Ошибка загрузки данных.</p>`;
        }
    }

    // 1) Загружаем администрацию: директору и двум завучам
    await loadGrid(
        '../img/teachers/administratiya/administratiya.json',  // путь к JSON
        'teachers-administration-grid',                        // id контейнера
        '../img/teachers/administratiya',                       // папка с картинками
        ['Директор', 'Завуч', 'Завуч']                          // подписи для трех ролей
    );

    // 2) Затем остальных педагогов без ролей
    await loadGrid(
        '../img/teachers/teachers.json',  // путь к JSON
        'teachers-grid',                  // id контейнера
        '../img/teachers'                 // папка с картинками
    );
});
