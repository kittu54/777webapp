import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(localStorage.getItem('user') || '');
  const [articles, setArticles] = useState([]);
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Fetch articles on load
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await axios.get('/articles');
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post('/register', { username, password });
      alert('Registration successful! Please login.');
    } catch (err) {
      setError('Registration failed (Username might be taken)');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post('/login', { username, password });
      setToken(res.data.token);
      setUser(res.data.username);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', res.data.username);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('userId', res.data.id);
      setError('');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser('');
    localStorage.clear();
  };

  const handlePost = async () => {
    if (!url) return;
    try {
      await axios.post('/articles', { url }, { headers: { Authorization: `Bearer ${token}` } });
      setUrl('');
      fetchArticles();
    } catch (err) {
      alert('Failed to post');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/articles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchArticles();
    } catch (err) {
      alert('Unauthorized to delete this post');
    }
  };

  const canDelete = (article) => {
    const role = localStorage.getItem('role');
    const currentUserId = parseInt(localStorage.getItem('userId'));
    return role === 'admin' || currentUserId === article.user_id;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Article Share</h1>

      {/* LOGIN / REGISTER SECTION */}
      {!token ? (
        <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>Login / Register</h3>
          <input placeholder="Username" onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <br /><br />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleRegister} style={{ marginLeft: '10px' }}>Register</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <p>Welcome, <b>{user}</b>! <button onClick={handleLogout}>Logout</button></p>
          
          <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
            <h3>Post New Article</h3>
            <input 
              placeholder="http://example.com" 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              style={{ width: '300px' }}
            />
            <button onClick={handlePost}>Post</button>
          </div>
        </div>
      )}

      {/* ARTICLE LIST SECTION */}
      <h3>Recent Articles</h3>
      <ul>
        {articles.map(art => (
          <li key={art.id} style={{ marginBottom: '10px' }}>
            <a href={art.url} target="_blank" rel="noreferrer">{art.url}</a> 
            <span style={{ color: 'gray', fontSize: '0.8em', marginLeft: '10px' }}>
              (posted by {art.username})
            </span>
            {token && canDelete(art) && (
              <button 
                onClick={() => handleDelete(art.id)} 
                style={{ marginLeft: '10px', color: 'red', cursor: 'pointer' }}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;