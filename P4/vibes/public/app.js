document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const userInfo = document.getElementById('user-info');
  const usernameDisplay = document.getElementById('username-display');
  const roleBadge = document.getElementById('role-badge');
  const logoutBtn = document.getElementById('logout-btn');

  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');

  const articleForm = document.getElementById('article-form');
  const articleUrlInput = document.getElementById('article-url');
  const articleError = document.getElementById('article-error');
  const articleSuccess = document.getElementById('article-success');
  const articlesList = document.getElementById('articles-list');

  let currentUser = null;

  checkAuth();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (tabName === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
      }

      hideMessages();
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(loginError, data.error);
        return;
      }

      currentUser = data.user;
      showDashboard();
    } catch (error) {
      showError(loginError, 'Network error. Please try again.');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
      showError(registerError, 'Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(registerError, data.error);
        return;
      }

      currentUser = data.user;
      showDashboard();
    } catch (error) {
      showError(registerError, 'Network error. Please try again.');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      currentUser = null;
      showAuth();
    } catch (error) {
      console.error('Logout error:', error);
    }
  });

  articleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const url = articleUrlInput.value.trim();

    try {
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        showError(articleError, data.error);
        return;
      }

      showSuccess(articleSuccess, 'Article shared successfully!');
      articleUrlInput.value = '';
      loadArticles();
    } catch (error) {
      showError(articleError, 'Network error. Please try again.');
    }
  });

  async function checkAuth() {
    try {
      const response = await fetch('/api/me');
      
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        showDashboard();
      } else {
        showAuth();
      }
    } catch (error) {
      showAuth();
    }
  }

  function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    userInfo.classList.add('hidden');
    
    loginForm.reset();
    registerForm.reset();
    hideMessages();
  }

  function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userInfo.classList.remove('hidden');

    usernameDisplay.textContent = currentUser.username;
    roleBadge.textContent = currentUser.role;
    roleBadge.className = `badge ${currentUser.role}`;

    loadArticles();
  }

  async function loadArticles() {
    articlesList.innerHTML = '<div class="loading">Loading articles...</div>';

    try {
      const response = await fetch('/api/articles');
      const data = await response.json();

      if (!response.ok) {
        articlesList.innerHTML = '<div class="error">Failed to load articles</div>';
        return;
      }

      if (data.articles.length === 0) {
        articlesList.innerHTML = `
          <div class="no-articles">
            <h4>No articles yet</h4>
            <p>Be the first to share an interesting article!</p>
          </div>
        `;
        return;
      }

      articlesList.innerHTML = data.articles.map(article => createArticleCard(article)).join('');

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteArticle(btn.dataset.id));
      });
    } catch (error) {
      articlesList.innerHTML = '<div class="error">Network error. Please refresh.</div>';
    }
  }

  function createArticleCard(article) {
    const canDelete = currentUser.role === 'admin' || article.user_id === currentUser.id;
    const date = new Date(article.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="article-card" data-id="${article.id}">
        <div class="article-info">
          <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="article-url">
            ${escapeHtml(article.url)}
          </a>
          <div class="article-meta">
            <span>Shared by <strong>${escapeHtml(article.username)}</strong></span>
            <span>${date}</span>
          </div>
        </div>
        ${canDelete ? `
          <div class="article-actions">
            <button class="btn btn-danger delete-btn" data-id="${article.id}">Delete</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }

    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      }

      loadArticles();
    } catch (error) {
      alert('Network error. Please try again.');
    }
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
  }

  function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
      element.classList.remove('show');
    }, 3000);
  }

  function hideMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => {
      el.classList.remove('show');
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
