import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Importing Icons
import { FiLink, FiTrash2, FiUser, FiLogOut, FiPlus, FiLock, FiGlobe, FiAlertCircle } from 'react-icons/fi';

function App() {
  // State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(localStorage.getItem('user') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Inputs
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Feedback
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Initial Load
  useEffect(() => {
    fetchArticles();
  }, []);

  // Helpers
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    try {
      await axios.post('/register', { username, password });
      showToast('Account created! You can now login.');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogin = async () => {
    setError('');
    try {
      const res = await axios.post('/login', { username, password });
      // Save Auth Data
      const { token, username: u, role: r, id: uid } = res.data;
      setToken(token);
      setUser(u);
      setRole(r);
      setUserId(uid);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', u);
      localStorage.setItem('role', r);
      localStorage.setItem('userId', uid);
      
      showToast(`Welcome back, ${u}!`);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setError("Too many attempts. Please wait 15 minutes.");
      } else {
        setError('Invalid credentials');
      }
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser('');
    localStorage.clear();
    showToast('Logged out successfully');
  };

  const handlePost = async () => {
    if (!url) return;
    try {
      await axios.post('/articles', { url }, { headers: { Authorization: `Bearer ${token}` } });
      setUrl('');
      fetchArticles();
      showToast('Link posted successfully!');
    } catch (err) {
      showToast('Error: ' + (err.response?.data?.error || 'Failed to post'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await axios.delete(`/articles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchArticles();
      showToast('Article deleted.');
    } catch (err) {
      showToast('Unauthorized action.');
    }
  };

  const canDelete = (articleUid) => {
    return role === 'admin' || parseInt(userId) === articleUid;
  };

  // --- RENDER ---

  // 1. Auth Screen
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#4f46e5' }}>
            <FiGlobe size={40} />
          </div>
          <h2>Article Share</h2>
          <p>Join the community curating the best of the web.</p>
          
          {error && <div className="error-banner"><FiAlertCircle style={{verticalAlign: 'middle'}}/> {error}</div>}
          
          <div className="input-group">
            <FiUser className="input-icon" />
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="input-group">
            <FiLock className="input-icon" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button className="primary" onClick={handleLogin}>Log In</button>
          <button className="secondary" onClick={handleRegister}>Create Account</button>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  // 2. Main App Screen
  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo"><FiGlobe /> ArticleShare</div>
        <div className="user-menu">
          <FiUser /> {user} 
          <span style={{opacity: 0.5}}>|</span>
          <button onClick={handleLogout} className="logout-btn"><FiLogOut /> Logout</button>
        </div>
      </nav>

      {/* Create Post */}
      <div className="create-post-card">
        <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
          <FiLink className="input-icon" />
          <input 
            placeholder="Paste a URL (https://...)" 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
          />
        </div>
        <button className="primary" onClick={handlePost} style={{ width: 'auto' }}>
          <FiPlus /> Post
        </button>
      </div>

      {/* Article List */}
      <div className="article-list">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <FiGlobe size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No articles yet. Be the first to share something!</p>
          </div>
        ) : (
          articles.map(art => (
            <div key={art.id} className="article-card">
              <div className="article-content">
                <a href={art.url} target="_blank" rel="noreferrer" className="article-link">
                  {art.url}
                </a>
                <div className="article-meta">
                  <span>Shared by <b>{art.username}</b></span>
                </div>
              </div>
              
              {canDelete(art.user_id) && (
                <button onClick={() => handleDelete(art.id)} className="danger-icon" title="Delete Post">
                  <FiTrash2 size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Toast Notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;