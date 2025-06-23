document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const startNowBtn = document.getElementById('startNowBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const modal = document.getElementById('taskModal');
    const closeModalBtn = document.querySelector('.close-btn');
    const taskForm = document.getElementById('taskForm');
    const modalTitle = document.getElementById('modalTitle');
    const taskIdInput = document.getElementById('taskId');
    const taskTitleInput = document.getElementById('taskTitle');
    const taskDescInput = document.getElementById('taskDesc');
    const taskUrgentInput = document.getElementById('taskUrgent');
    const taskImportantInput = document.getElementById('taskImportant');
    
    // Progress Page Elements
    const totalTasksSpan = document.getElementById('total-tasks');
    const completedTasksSpan = document.getElementById('completed-tasks');
    const progressChartCanvas = document.getElementById('progressChart');
    const quadrant4Warning = document.getElementById('quadrant-4-warning');

    // Settings Page Elements
    const darkModeToggle = document.getElementById('darkModeToggle');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    
    let tasks = [];
    let progressChart = null;
    let draggedTask = null;

    // --- Data Persistence (localStorage) ---
    const saveTasks = () => {
        localStorage.setItem('myMatrixTasks', JSON.stringify(tasks));
    };

    const loadTasks = () => {
        const storedTasks = localStorage.getItem('myMatrixTasks');
        tasks = storedTasks ? JSON.parse(storedTasks) : [];
    };

    // --- Page Navigation ---
    const showPage = (pageId) => {
        pages.forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${pageId}`).classList.add('active');

        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === pageId);
        });
        
        if (pageId === 'progress') {
            updateProgressReport();
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(link.dataset.page);
        });
    });

    startNowBtn.addEventListener('click', () => showPage('matrix'));

    // --- Modal Management ---
    const showModal = (isEdit = false, task = null) => {
        taskForm.reset();
        if (isEdit && task) {
            modalTitle.textContent = 'تعديل المهمة';
            taskIdInput.value = task.id;
            taskTitleInput.value = task.title;
            taskDescInput.value = task.description;
            taskUrgentInput.checked = task.isUrgent;
            taskImportantInput.checked = task.isImportant;
        } else {
            modalTitle.textContent = 'إضافة مهمة جديدة';
            taskIdInput.value = '';
        }
        modal.classList.add('show');
    };

    const hideModal = () => {
        modal.classList.remove('show');
    };

    addTaskBtn.addEventListener('click', () => showModal());
    closeModalBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // --- Task Logic ---
    const getQuadrant = (isUrgent, isImportant) => {
        if (isImportant && isUrgent) return 1;
        if (isImportant && !isUrgent) return 2;
        if (!isImportant && isUrgent) return 3;
        if (!isImportant && !isUrgent) return 4;
    };

    const renderTasks = () => {
        // Clear all quadrants
        document.querySelectorAll('.tasks-container').forEach(container => container.innerHTML = '');

        tasks.forEach(task => {
            const quadrantEl = document.getElementById(`quadrant-${task.quadrant}`);
            if (!quadrantEl) return;

            const tasksContainer = quadrantEl.querySelector('.tasks-container');
            const taskCard = document.createElement('div');
            taskCard.className = `task-card ${task.isDone ? 'done' : ''}`;
            taskCard.setAttribute('draggable', true);
            taskCard.dataset.taskId = task.id;

            taskCard.innerHTML = `
                <h4>${task.title}</h4>
                <p>${task.description || ''}</p>
                <div class="task-actions">
                    <button class="complete-btn" title="إكمال المهمة">${task.isDone ? '↩️' : '✅'}</button>
                    <button class="edit-btn" title="تعديل">✏️</button>
                    <button class="delete-btn" title="حذف">🗑️</button>
                </div>
            `;

            tasksContainer.appendChild(taskCard);
        });
        
        addEventListenersToTasks();
    };
    
    const addEventListenersToTasks = () => {
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const taskId = card.dataset.taskId;
                const task = tasks.find(t => t.id == taskId);

                if (e.target.classList.contains('edit-btn')) {
                    showModal(true, task);
                }
                if (e.target.classList.contains('delete-btn')) {
                    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                        tasks = tasks.filter(t => t.id != taskId);
                        saveAndRender();
                    }
                }
                if (e.target.classList.contains('complete-btn')) {
                    task.isDone = !task.isDone;
                    saveAndRender();
                }
            });

            // Drag and Drop
            card.addEventListener('dragstart', (e) => {
                draggedTask = card;
                setTimeout(() => card.classList.add('dragging'), 0);
            });

            card.addEventListener('dragend', () => {
                draggedTask.classList.remove('dragging');
                draggedTask = null;
            });
        });
    };

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = taskIdInput.value;
        const title = taskTitleInput.value.trim();
        if (!title) return alert('الرجاء إدخال عنوان للمهمة.');

        const taskData = {
            title: title,
            description: taskDescInput.value.trim(),
            isUrgent: taskUrgentInput.checked,
            isImportant: taskImportantInput.checked,
            quadrant: getQuadrant(taskUrgentInput.checked, taskImportantInput.checked),
            isDone: false,
        };

        if (id) { // Editing existing task
            const taskIndex = tasks.findIndex(t => t.id == id);
            tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
        } else { // Adding new task
            tasks.push({ id: Date.now(), ...taskData });
        }

        hideModal();
        saveAndRender();
    });

    const saveAndRender = () => {
        saveTasks();
        renderTasks();
    };

    // --- Drag and Drop Logic ---
    document.querySelectorAll('.quadrant').forEach(quadrant => {
        quadrant.addEventListener('dragover', (e) => {
            e.preventDefault();
            const container = quadrant.querySelector('.tasks-container');
            container.classList.add('drag-over');
        });

        quadrant.addEventListener('dragleave', () => {
            const container = quadrant.querySelector('.tasks-container');
            container.classList.remove('drag-over');
        });

        quadrant.addEventListener('drop', (e) => {
            e.preventDefault();
            const container = quadrant.querySelector('.tasks-container');
            container.classList.remove('drag-over');
            
            if (draggedTask) {
                const taskId = draggedTask.dataset.taskId;
                const task = tasks.find(t => t.id == taskId);
                const newQuadrantId = parseInt(quadrant.dataset.quadrant);

                if (task && task.quadrant !== newQuadrantId) {
                    task.quadrant = newQuadrantId;
                    switch(newQuadrantId) {
                        case 1: task.isUrgent = true; task.isImportant = true; break;
                        case 2: task.isUrgent = false; task.isImportant = true; break;
                        case 3: task.isUrgent = true; task.isImportant = false; break;
                        case 4: task.isUrgent = false; task.isImportant = false; break;
                    }
                    saveAndRender();
                }
            }
        });
    });

    // --- Progress Report Logic ---
    const updateProgressReport = () => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.isDone).length;
        
        totalTasksSpan.textContent = total;
        completedTasksSpan.textContent = completed;

        const quadrantCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        tasks.forEach(task => {
            quadrantCounts[task.quadrant]++;
        });

        // Show warning for Q4
        const q4Percentage = total > 0 ? (quadrantCounts[4] / total) * 100 : 0;
        quadrant4Warning.classList.toggle('hidden', q4Percentage < 30); // Show if > 30%

        // Update Chart
        if (progressChart) {
            progressChart.destroy();
        }
        
        progressChart = new Chart(progressChartCanvas, {
            type: 'pie',
            data: {
                labels: ['الربع 1: عاجل وهام', 'الربع 2: هام وغير عاجل', 'الربع 3: عاجل وغير هام', 'الربع 4: غير عاجل وغير هام'],
                datasets: [{
                    label: 'توزيع المهام',
                    data: [quadrantCounts[1], quadrantCounts[2], quadrantCounts[3], quadrantCounts[4]],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.7)',
                        'rgba(0, 123, 255, 0.7)',
                        'rgba(255, 193, 7, 0.7)',
                        'rgba(220, 53, 69, 0.7)'
                    ],
                    borderColor: [
                        '#1e7e34', '#0056b3', '#b28900', '#a71d2a'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                         labels: {
                            font: { family: "'Cairo', sans-serif" }
                        }
                    },
                    title: {
                        display: true,
                        text: 'توزيع المهام على المربعات الأربعة',
                        font: { size: 16, family: "'Cairo', sans-serif" }
                    }
                }
            }
        });
    };

    // --- Settings Logic ---
    const applyDarkMode = (isDark) => {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('myMatrixDarkMode', isDark);
    };

    darkModeToggle.addEventListener('change', (e) => {
        applyDarkMode(e.target.checked);
    });

    exportPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // jsPDF doesn't support Arabic out of the box. This is a very basic export.
        // For full Arabic support, a custom font needs to be added.
        doc.text("MyMatrix Tasks Report", 10, 10);
        let y = 20;

        for (let i = 1; i <= 4; i++) {
            doc.text(`--- Quadrant ${i} ---`, 10, y);
            y += 7;
            const quadrantTasks = tasks.filter(t => t.quadrant === i);
            if (quadrantTasks.length === 0) {
                 doc.text("No tasks.", 15, y);
                 y += 7;
            } else {
                quadrantTasks.forEach(task => {
                    if (y > 280) { // New page
                        doc.addPage();
                        y = 10;
                    }
                    doc.text(`${task.isDone ? '[X]' : '[ ]'} ${task.title}`, 15, y);
                    y += 7;
                });
            }
        }
        doc.save('mymatrix-tasks.pdf');
    });
    
    deleteAllBtn.addEventListener('click', () => {
        if (confirm('تحذير! سيتم حذف جميع مهامك وبياناتك نهائيًا. هل أنت متأكد؟')) {
            tasks = [];
            saveAndRender();
        }
    });

    // --- Initial Load ---
    const savedDarkMode = localStorage.getItem('myMatrixDarkMode') === 'true';
    darkModeToggle.checked = savedDarkMode;
    applyDarkMode(savedDarkMode);

    loadTasks();
    renderTasks();
    showPage('home');
});