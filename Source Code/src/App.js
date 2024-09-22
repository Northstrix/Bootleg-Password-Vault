// App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import backgroundImage from './Assets/urban-1905188.jpg';
import LoginForm from './LoginForm/LoginForm';
import EncryptedSpace from './EncryptedSpace/EncryptedSpace';
import Disclaimer from './Notice/Notice';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setShowLoginForm(true);
    });
    return () => {
      unSub();
    };
  }, []);

  const handleLogin = (loginData) => {
    setUserData(loginData);
    setShowLoginForm(false);
  };

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    setShowLoginForm(true);
  };

  return (
    <div className="App" style={{ backgroundImage: `url(${backgroundImage})` }}>
      {showDisclaimer ? (
        <Disclaimer onAccept={handleDisclaimerAccept} />
      ) : showLoginForm ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        user && <EncryptedSpace user={user} userData={userData} />
      )}
      <footer>
        <p>
          Made by{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.github.com/Northstrix"
          >
            Maxim Bortnikov
          </a>{' '}
          with the help of{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.perplexity.ai/"
          >
            Perplexity
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;