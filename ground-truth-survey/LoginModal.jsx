import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://txjbfqrbbtvzlxpeegkv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo';
const supabase = createClient(supabaseUrl, supabaseKey);

const LoginModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First check if the user exists and get their password_hash
      const { data: users, error: fetchError } = await supabase
        .from('divisional_users')
        .select('id, password_hash, full_name, division_id, division_name, role, is_active')
        .eq('username', username)
        .single();

      if (fetchError || !users) {
        throw new Error('Invalid username or password');
      }

      if (!users.is_active) {
        throw new Error('Your account is inactive. Please contact an administrator.');
      }

      // Here you would need to verify the password against the hash
      // This is a simplified example - in a real application, you should use a proper password verification method
      // For example, you might have a serverless function that handles password verification
      const isPasswordValid = await verifyPassword(password, users.password_hash);
      
      if (!isPasswordValid) {
        throw new Error('Invalid username or password');
      }

      // Update the last_login timestamp
      await supabase
        .from('divisional_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', users.id);

      // Store user data in session or state management
      const userData = {
        id: users.id,
        username,
        fullName: users.full_name,
        divisionId: users.division_id,
        divisionName: users.division_name,
        role: users.role
      };

      // Store in localStorage or state management solution
      localStorage.setItem('user', JSON.stringify(userData));

      // Close modal and redirect
      onClose();
      // Redirect based on role
      redirectBasedOnRole(users.role);
      
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // This function would need to be implemented based on your password hashing method
  const verifyPassword = async (password, storedHash) => {
    // This is where you would implement password verification
    // For example, using bcrypt or another secure method
    // This is a placeholder - DO NOT use this in production
    return true; // Replace with actual verification
  };

  const redirectBasedOnRole = (role) => {
    switch(role) {
      case 'admin':
        window.location.href = '/admin-dashboard';
        break;
      case 'manager':
        window.location.href = '/manager-dashboard';
        break;
      default:
        window.location.href = '/user-dashboard';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Divisional Login</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
      
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-container {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          width: 400px;
          max-width: 90%;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
        
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-weight: 500;
        }
        
        .form-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .login-button {
          background-color: #4285f4;
          color: white;
          padding: 12px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .login-button:hover {
          background-color: #3367d6;
        }
        
        .login-button:disabled {
          background-color: #b8b8b8;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #d32f2f;
          background-color: #ffebee;
          padding: 10px;
          border-radius: 4px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default LoginModal;

