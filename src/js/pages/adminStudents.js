import { api } from '../services/api.js';
import { t, updatePageTranslations } from '../i18n/translations.js';

export async function renderAdminStudents() {
  const container = document.getElementById('admin-students-content');
  if (!container) return;

  // Check if user is admin
  try {
    const { user } = await api.me();
    if (!user || user.role !== 'admin') {
      container.innerHTML = `
        <div class="students-container">
          <div class="error-card">
            <h1 data-i18n="accessDenied"></h1>
            <p data-i18n="accessDeniedDesc"></p>
            <button class="abg-btn" id="error-home-btn" data-i18n="goToHome"></button>
          </div>
        </div>
      `;
      updatePageTranslations();
      // Wire error button
      const errorBtn = document.getElementById('error-home-btn');
      if (errorBtn) {
        errorBtn.addEventListener('click', () => window.router.navigate('/'));
      }
      return;
    }
  } catch (error) {
    container.innerHTML = `
      <div class="students-container">
        <div class="error-card">
          <h1 data-i18n="authError"></h1>
          <p data-i18n="authErrorDesc"></p>
          <button class="abg-btn" id="auth-error-home-btn" data-i18n="goToHome"></button>
        </div>
      </div>
    `;
    updatePageTranslations();
    // Wire error button
    const authErrorBtn = document.getElementById('auth-error-home-btn');
    if (authErrorBtn) {
      authErrorBtn.addEventListener('click', () => window.router.navigate('/'));
    }
    return;
  }

  container.innerHTML = `
    <div class="students-container">
      <div class="students-header">
        <button class="back-btn" id="admin-students-back-btn">← <span data-i18n="back"></span></button>
        <h1 data-i18n="studentsManagement"></h1>
      </div>

      <div class="students-content">
        <div class="create-student-card">
          <h2 data-i18n="createNewStudent"></h2>
          <form id="create-student-form">
            <div class="form-group">
              <label for="student-name" data-i18n="fullName"></label>
              <input type="text" id="student-name" name="name" required minlength="2">
            </div>
            <div class="form-group">
              <label for="student-email">Email (opcional)</label>
              <input type="email" id="student-email" name="email" placeholder="Dejar vacío para auto-generar">
            </div>
            <div class="form-group">
              <label for="student-username" data-i18n="username"></label>
              <input type="text" id="student-username" name="username" required minlength="3">
            </div>
            <div class="form-group">
              <label for="student-password" data-i18n="password"></label>
              <input type="password" id="student-password" name="password" required minlength="6">
            </div>
            <div class="form-actions">
              <button type="submit" class="abg-btn" data-i18n="createStudent"></button>
            </div>
            <div id="create-error" class="error-message" style="display: none;"></div>
          </form>
        </div>

        <div class="students-list-card">
          <div class="students-list-header">
            <h2 data-i18n="studentsList"></h2>
            <span id="students-count" class="students-count" data-i18n="loading"></span>
          </div>
          <div id="students-list" class="students-list">
            <div class="loading" data-i18n="loadingStudents"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Update translations
  updatePageTranslations();

  // Wire back button
  const backBtn = document.getElementById('admin-students-back-btn');
  if (backBtn && !backBtn.__wired) {
    backBtn.__wired = true;
    backBtn.addEventListener('click', () => window.router.navigate('/'));
  }

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

    // Fijar contador y evitar que i18n lo sobreescriba
    if (countElement) {
      countElement.removeAttribute('data-i18n');
      countElement.textContent = `${count} / ${limit} alumnos`;
    }

    if (students.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p data-i18n="noStudentsYet"></p>
        </div>
      `;
      updatePageTranslations();
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
          <button class="delete-btn" data-id="${student._id}" data-i18n="delete"></button>
        </div>
      `
      )
      .join('');

    // Update translations
    updatePageTranslations();

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
        <p>${t('loadingStudentsError')}: ${error.message}</p>
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

  // Add email if provided (optional field)
  const email = formData.get('email');
  if (email && email.trim()) {
    data.email = email.trim();
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById('create-error');

  submitBtn.disabled = true;
  submitBtn.textContent = t('creating');
  errorDiv.style.display = 'none';

  try {
    await api.createStudent(data);

    // Reset form
    form.reset();

    // Reload students list
    await loadStudents();

    // Show success (optional)
    alert(t('studentCreatedSuccess'));
  } catch (error) {
    console.error('Error creating student:', error);
    errorDiv.textContent = error.message || t('createStudentError');
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t('createStudent');
  }
}

async function handleDeleteStudent(studentId) {
  if (!confirm(t('confirmDeleteStudent'))) {
    return;
  }

  try {
    await api.deleteStudent(studentId);
    await loadStudents();
  } catch (error) {
    console.error('Error deleting student:', error);
    alert(error.message || t('deleteStudentError'));
  }
}
