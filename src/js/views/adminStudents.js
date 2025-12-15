import { api } from '../services/api.js';

export async function renderAdminStudents() {
  const main = document.querySelector('main');

  // Check if user is admin
  try {
    const user = await api.me();
    if (user.role !== 'admin') {
      main.innerHTML = `
        <div class="students-container">
          <div class="error-card">
            <h1>Acceso denegado</h1>
            <p>Solo los administradores pueden acceder a esta sección.</p>
            <button class="abg-btn" onclick="window.router.navigate('/')">Ir al inicio</button>
          </div>
        </div>
      `;
      return;
    }
  } catch (error) {
    main.innerHTML = `
      <div class="students-container">
        <div class="error-card">
          <h1>Error de autenticación</h1>
          <p>Por favor, inicia sesión para continuar.</p>
          <button class="abg-btn" onclick="window.router.navigate('/')">Ir al inicio</button>
        </div>
      </div>
    `;
    return;
  }

  main.innerHTML = `
    <div class="students-container">
      <div class="students-header">
        <h1>Gestión de Alumnos</h1>
        <button class="back-btn" onclick="window.router.navigate('/')">← Volver al inicio</button>
      </div>

      <div class="students-content">
        <div class="create-student-card">
          <h2>Crear nuevo alumno</h2>
          <form id="create-student-form">
            <div class="form-group">
              <label for="student-name">Nombre completo</label>
              <input type="text" id="student-name" name="name" required minlength="2">
            </div>
            <div class="form-group">
              <label for="student-username">Nombre de usuario</label>
              <input type="text" id="student-username" name="username" required minlength="3">
            </div>
            <div class="form-group">
              <label for="student-password">Contraseña</label>
              <input type="password" id="student-password" name="password" required minlength="6">
            </div>
            <div class="form-actions">
              <button type="submit" class="abg-btn">Crear alumno</button>
            </div>
            <div id="create-error" class="error-message" style="display: none;"></div>
          </form>
        </div>

        <div class="students-list-card">
          <div class="students-list-header">
            <h2>Lista de alumnos</h2>
            <span id="students-count" class="students-count">Cargando...</span>
          </div>
          <div id="students-list" class="students-list">
            <div class="loading">Cargando alumnos...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load students
  await loadStudents();

  // Add form submit handler
  const form = document.getElementById('create-student-form');
  form.addEventListener('submit', handleCreateStudent);
}

async function loadStudents() {
  const listContainer = document.getElementById('students-list');
  const countElement = document.getElementById('students-count');

  try {
    const { students, count, limit } = await api.getStudents();

    countElement.textContent = `${count} / ${limit} alumnos`;

    if (students.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>No has creado ningún alumno todavía.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = students
      .map(
        (student) => `
        <div class="student-item" data-id="${student._id}">
          <div class="student-info">
            <div class="student-name">${student.name}</div>
            <div class="student-username">@${student.username}</div>
          </div>
          <button class="delete-btn" data-id="${student._id}">Eliminar</button>
        </div>
      `
      )
      .join('');

    // Add delete handlers
    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        handleDeleteStudent(id);
      });
    });
  } catch (error) {
    console.error('Error loading students:', error);
    listContainer.innerHTML = `
      <div class="error-state">
        <p>Error al cargar los alumnos: ${error.message}</p>
      </div>
    `;
  }
}

async function handleCreateStudent(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    username: formData.get('username'),
    password: formData.get('password'),
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById('create-error');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creando...';
  errorDiv.style.display = 'none';

  try {
    await api.createStudent(data);

    // Reset form
    form.reset();

    // Reload students list
    await loadStudents();

    // Show success (optional)
    alert('Alumno creado correctamente');
  } catch (error) {
    console.error('Error creating student:', error);
    errorDiv.textContent = error.message || 'Error al crear el alumno';
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Crear alumno';
  }
}

async function handleDeleteStudent(studentId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
    return;
  }

  try {
    await api.deleteStudent(studentId);
    await loadStudents();
  } catch (error) {
    console.error('Error deleting student:', error);
    alert(error.message || 'Error al eliminar el alumno');
  }
}
