import React, { useState, useEffect, useCallback, useRef } from 'react';
import './LoginForm.css';
import CryptoJS from 'crypto-js';
import { pbkdf2, createSHA512, whirlpool } from 'hash-wasm';
import { encryptTwofish256ECB } from '../cryptographicPrimitives/twofish';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from '../lib/firebase';

const LoginForm = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupMessageLine1, setPopupMessageLine1] = useState('');
  const [popupMessageLine2, setPopupMessageLine2] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signinUsernameRef, signinPasswordRef] = [useRef(), useRef()];
  const [notifications, setNotifications] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  const toggleForm = () => {
    setIsSignUp(!isSignUp);
  };

  const showTwoLinedPopup = (messageLine1, messageLine2) => {
    setIsPopupVisible(false);
    setPopupMessageLine1(messageLine1);
    setPopupMessageLine2(messageLine2);
    setIsPopupVisible(true);
    // Close any active notifications when processing starts
    closeRectangleNotification();
  };

  const derive336BytesUsingHMACSHA512 = useCallback(async (password, salt, iterations) => {
    const derivedKey = await pbkdf2({
      password,
      salt,
      iterations,
      hashLength: 336,
      hashFunction: createSHA512(),
      outputType: 'binary',
    });
    return new Uint8Array(derivedKey);
  }, []);

  const hexStringToArray = (hexString) => {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  };

  const arrayToHexString = (byteArray) => {
    return Array.from(byteArray, byte => 
      ('0' + (byte & 0xFF).toString(16)).slice(-2)
    ).join('');
  };

  const handleSignIn = async (e) => {
    showTwoLinedPopup("Deriving Cryptographic Keys", "Please wait for a while");
    return;
  };

  const handleSignInContinue = async (e) => {
    const sha512_output = CryptoJS.SHA512(signinUsernameRef.current.value).toString();
    const sha512Array = hexStringToArray(sha512_output);
    const byteArray = new Uint8Array(sha512Array);
    const generatedHash = await whirlpool(byteArray);
    const hashedUsername = new Uint8Array(hexStringToArray(generatedHash));
    const salt = hashedUsername .slice(24, 48);
    const iterationBytes = hashedUsername.slice(16);
    const derIterations = iterationBytes.reduce((acc, val) => acc + val, 0);
    const iterations = 100000 + (4 * derIterations % 200001);
    const derivedKey = await derive336BytesUsingHMACSHA512(signinUsernameRef.current.value + signinPasswordRef.current.value, salt, iterations);
    const userID1 = derivedKey.slice(0, 16);
    const userID2 = derivedKey.slice(16, 32);
    let unencryptedPassword = userID1.map((byte, index) => byte ^ userID2[index]);
    const userCredentialEncryptionKey = derivedKey.slice(32, 64);
    const secondHash = await whirlpool(hashedUsername);
    const secondHashArray = new Uint8Array(hexStringToArray(secondHash));
    const secondHashArray1 = secondHashArray.slice(0, 16);
    const secondHashArray2 = secondHashArray.slice(16, 32);
    let unencryptedUsername = secondHashArray1.map((byte, index) => byte ^ secondHashArray2[index]);
    const encryptedUsername = encryptTwofish256ECB(unencryptedUsername, userCredentialEncryptionKey);
    const encryptedUserPassword = encryptTwofish256ECB(unencryptedPassword, userCredentialEncryptionKey);
    
    const origUsername = signinUsernameRef.current.value;
    const numofitr = 4 * derIterations % 200001;
    const masterKey = derivedKey.slice(64);
    //console.log(origUsername);
    //console.log(numofitr)
    
    try {
      const res = await signInWithEmailAndPassword(auth, uint8ArrayToString(encryptedUsername) + "@notanemail.com", arrayToHexString(encryptedUserPassword));
      onLogin({ masterKey, origUsername, numofitr });
    } catch (error) {
        if (error.code === 'auth/invalid-credential') {
          showRectangleNotification('error',"Account doesn't exist", 'Check the credentials.');

        } else {
            showRectangleNotification('error','Something went wrong', 'Check the console.');
            console.log("Can't sign in; error:", error.message);
        }
    }
    setIsPopupVisible(false);
  }

  const handleSignUp = async (e) => {
    if (password !== confirmPassword) {
      showNotification("Passwords Don't Match!", true);
      return;
    }
    showTwoLinedPopup("Deriving Cryptographic Keys", "Please wait for a while");
    return;
  };

  const handleSignUpContinue = async (e) => {
    if (password !== confirmPassword) {
      return;
    }
    const sha512_output = CryptoJS.SHA512(username).toString();
    const sha512Array = hexStringToArray(sha512_output);
    const byteArray = new Uint8Array(sha512Array);
    const generatedHash = await whirlpool(byteArray);
    const hashedUsername = new Uint8Array(hexStringToArray(generatedHash));
    const salt = hashedUsername .slice(24, 48);
    const iterationBytes = hashedUsername.slice(16);
    const derIterations = iterationBytes.reduce((acc, val) => acc + val, 0);
    const iterations = 100000 + (4 * derIterations % 200001);
    const derivedKey = await derive336BytesUsingHMACSHA512(username + password, salt, iterations);
    const userID1 = derivedKey.slice(0, 16);
    const userID2 = derivedKey.slice(16, 32);
    let unencryptedPassword = userID1.map((byte, index) => byte ^ userID2[index]);
    const userCredentialEncryptionKey = derivedKey.slice(32, 64);
    const secondHash = await whirlpool(hashedUsername);
    const secondHashArray = new Uint8Array(hexStringToArray(secondHash));
    const secondHashArray1 = secondHashArray.slice(0, 16);
    const secondHashArray2 = secondHashArray.slice(16, 32);
    let unencryptedUsername = secondHashArray1.map((byte, index) => byte ^ secondHashArray2[index]);
    const encryptedUsername = encryptTwofish256ECB(unencryptedUsername, userCredentialEncryptionKey);
    const encryptedUserPassword = encryptTwofish256ECB(unencryptedPassword, userCredentialEncryptionKey);
    //console.log("Username:" + uint8ArrayToString(encryptedUsername));
    //console.log("Password:" + arrayToHexString(encryptedUserPassword));
    try {
      const res = await createUserWithEmailAndPassword(auth, uint8ArrayToString(encryptedUsername) + "@notanemail.com", arrayToHexString(encryptedUserPassword));
      showRectangleNotification('success', 'Account created successfully', 'You can sign in now!');

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          showRectangleNotification('error','That username is taken', 'Try using a different one.');

        } else {
            showRectangleNotification('error','Something went wrong', 'Check the console.');
            console.log("User registration error:", error.message);
        }
    }
  };

  function uint8ArrayToString(uint8Array) {
    return Array.from(uint8Array).map(num => {
        // Map the number to a letter from 'a' to 'z'
        return String.fromCharCode((num % 26) + 97);
    }).join('');
  }

  const showRectangleNotification = (type, message, message1) => {
    setIsPopupVisible(false);
    setActiveNotification({ type, message, message1 });
    const container = document.getElementById('sign-up-rectangle-notification-container');
    container.style.display = 'flex';
  };

  const closeRectangleNotification = () => {
    setActiveNotification(null);
    const container = document.getElementById('sign-up-rectangle-notification-container');
    container.style.display = 'none';
  };

  const showNotification = (message, isError = false) => {
    const newNotification = { id: Date.now(), message, isError };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== newNotification.id));
    }, 3000); // This notification will disappear after 3 seconds
  };

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], fadeOut: true };
          return updated;
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  return (
    <div className={`login-page-container ${isSignUp ? 'right-panel-active' : ''}`}>
      <div className="notification-container">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification-toast ${notification.isError ? 'error' : ''} ${notification.fadeOut ? 'fade-out' : ''}`}>
            {notification.message}
          </div>
        ))}
      </div>
      <div className="login-page-form-container login-page-sign-up-container">
  <form className="login-page-sign-up-form" onSubmit={handleSignUp}>
    <h1 className="h1-20px-bottom">New Account</h1>
    <input
      type="text"
      placeholder="Username"
      required
      value={username}
      onChange={(e) => setUsername(e.target.value)}
    />
    <input
      type="password"
      placeholder="Password"
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
    <input
      type="password"
      placeholder="Confirm Password"
      required
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
    />
    <button
      className="blue-button-hover"
      type="submit"
      onClick={(e) => {
        e.preventDefault(); // Prevent the default form submission
        handleSignUp(); // Call the first function

        // Call the second function after a delay of 100ms
        setTimeout(() => {
          handleSignUpContinue(); // Replace with the actual second function you want to call
        }, 100);
      }}
    >
      Sign Up
    </button>
  </form>
</div>

<div className="login-page-form-container login-page-sign-in-container">
  <form className="login-page-sign-in-form" onSubmit={handleSignIn}>
    <h1>Welcome Back!</h1>
    <p>Sign in to your account</p>
    <input
      type="text"
      placeholder="Username"
      required
      ref={signinUsernameRef}
    />
    <input
      type="password"
      placeholder="Password"
      required
      ref={signinPasswordRef}
    />
    <button
      className="blue-button-hover"
      type="submit"
      onClick={(e) => {
        e.preventDefault(); // Prevent the default form submission
        handleSignIn(); // Call the first function

        // Call the second function after a delay of 100ms
        setTimeout(() => {
          handleSignInContinue(); // Replace with the actual second function you want to call
        }, 100);
      }}
    >
      Sign In
    </button>
  </form>
</div>
      <div className="login-page-overlay-container">
        <div className="login-page-overlay">
          <div className="login-page-overlay-panel login-page-overlay-left">
            <h1>Already Have</h1>
            <h1>an Account?</h1>
            <p>Sign in to access your encrypted data.</p>
            <button className="login-page-ghost1" id="signIn" onClick={toggleForm}>Sign In</button>
          </div>
          <div className="login-page-overlay-panel login-page-overlay-right">
            <h1>New Here?</h1>
            <p>Create an account to start using the service.</p>
            <button className="login-page-ghost" id="signUp" onClick={toggleForm}>Sign Up</button>
          </div>
        </div>
      </div>
      {isPopupVisible && (
        <div className="pop-up-login-container-overlay">
          <div id="file-processing-popup" className="pop-up-login-container">
            <div className="pop-up-login-container-main">
              <div className="pop-up-login-container-content">
                <p className="pop-up-login-container-message-text">{popupMessageLine1}</p>
                <p className="pop-up-login-container-message-text">{popupMessageLine2}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div id="sign-up-rectangle-notification-container" className="sign-up-rectangle-notification-container" style={{ display: activeNotification ? 'flex' : 'none' }}>
        {activeNotification && (
          <div className={`sign-up-rectangle-notification-box ${activeNotification.type === 'success' ? 'sign-up-rectangle-notification-success-box' : 'sign-up-rectangle-notification-error-box'}`}>
            <div className={`sign-up-rectangle-notification-face ${activeNotification.type === 'success' ? '' : 'face2'}`}>
              <div className="sign-up-rectangle-notification-eye"></div>
              <div className="sign-up-rectangle-notification-eye right"></div>
              <div className={`sign-up-rectangle-notification-mouth ${activeNotification.type === 'success' ? 'happy' : 'sad'}`}></div>
            </div>
            <div className={`sign-up-rectangle-notification-shadow ${activeNotification.type === 'success' ? 'scale' : 'move'}`}></div>
            <div className="sign-up-rectangle-notification-message">
              <h1 className="alert">{activeNotification.type === 'success' ? 'Done!' : 'Error!'}</h1>
              <p className="rectangle-notification-text">{activeNotification.message}</p>
              {activeNotification.message1 && <p className="rectangle-notification-text1">{activeNotification.message1}</p>}
            </div>
            <button className="sign-up-rectangle-notification-button-box" onClick={closeRectangleNotification}>OK</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;