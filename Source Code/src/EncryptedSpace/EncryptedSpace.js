import React, { useEffect, useState, useRef, useCallback } from 'react'; 
import { ToastContainer, toast } from "react-toastify"; 
import 'react-toastify/dist/ReactToastify.css'; 
import './EncryptedSpace.css'; 
import '../LoginForm/LoginForm.css';
import { encryptTwofish256ECB, decryptTwofish256ECB } from '../cryptographicPrimitives/twofish';
import { pbkdf2, createSHA512, createHMAC, whirlpool } from 'hash-wasm';
import { ChaCha20 } from 'mipher';
import CryptoJS from 'crypto-js';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection } from "firebase/firestore"; 

const EncryptedSpace = ({ user, userData }) => { 
    const [logins, setLogins] = useState([]); 
    const [isScrollable, setIsScrollable] = useState(false); 
    const [showForm, setShowForm] = useState(false); 
    const [formMode, setFormMode] = useState('add'); 
    const [currentRecord, setCurrentRecord] = useState(null); 
    const [isDarkMode, setIsDarkMode] = useState(false); 
    const [showConfirmPopUp, setShowConfirmPopUp] = useState(false); // State for confirmation pop-up
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [popupMessageLine1, setPopupMessageLine1] = useState('');
    const [popupMessageLine2, setPopupMessageLine2] = useState('');
    const linesRef = useRef(null); 

    const showTwoLinedPopup = (messageLine1, messageLine2) => {
      setIsPopupVisible(false);
      setPopupMessageLine1(messageLine1);
      setPopupMessageLine2(messageLine2);
      setIsPopupVisible(true);
    };


    useEffect(() => {
      // Check user data validity
      if (userData.masterKey instanceof Uint8Array && userData.masterKey.length === 272 && typeof userData.numofitr === 'number' && userData.numofitr > 0) {
        toast.success("Successfully logged in as: " + userData.origUsername);
      } else {
        toast.error("Something went wrong; please re-log in.");
      }
  
      // Function to fetch records from Firebase
      const fetchRecords = async () => {
        showTwoLinedPopup("Fetching and Decrypting Your Records", "Please wait for a while");
        try {
          const querySnapshot = await getDocs(collection(db, user.email));
          const fetchedRecords = [];
  
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const ciphertext = data.ciphertext; // Assuming ciphertext is stored in this field
            //console.log(doc.id);
            //console.log(ciphertext);
  
            // Decrypt the ciphertext
            decryptStringWithTwoCiphers(ciphertext)
              .then((decrypted_blob) => {
                const decryptedBytes = decrypted_blob[0];
                const integrityCheckPassed = decrypted_blob[1] === false; // Integrity check
  
                // Split the byte array into segments using 0x1F as the delimiter
                const segments = [];
                let currentSegment = [];
  
                for (let byte of decryptedBytes) {
                  if (byte === 0x1F) {
                    if (currentSegment.length > 0) {
                      segments.push(currentSegment);
                      currentSegment = []; // Reset for the next segment
                    }
                  } else {
                    currentSegment.push(byte);
                  }
                }
  
                // Push any remaining bytes as a final segment
                if (currentSegment.length > 0) {
                  segments.push(currentSegment);
                }
  
                // Decode each segment into ASCII strings
                const decodedStrings = segments.map(segment => bytesToAscii(segment));
  
                const [title, username, password, website] = decodedStrings;

                // Create a record object with integrity flag
                const record = {
                  id: doc.id,
                  title,
                  username,
                  password,
                  website,
                  integrityFailed: !integrityCheckPassed // Mark as integrity failed if check failed
                };

                // Add to fetched records
                fetchedRecords.push(record);
              })
              .catch(error => {
                toast.error('Decryption error for record ID: ' + data.id + ': ' + error.message);
              });
          });
  
          // Update logins state after processing all records
          setLogins(fetchedRecords);
        } catch (error) {
          toast.error("Error fetching records: " + error.message);
        }
        setIsPopupVisible(false);
      };
  
      fetchRecords();
    }, [user, userData]);

    const addRecord = (id, title, username, password, website) => {
      const recordToAdd = {
        id,
        title,
        username,
        password,
        website,
        integrityFailed: false
      };

      setLogins(prevLogins => [...prevLogins, recordToAdd]);
    };

    useEffect(() => { 
        checkScrollable(); 
        window.addEventListener('resize', checkScrollable); 
        return () => window.removeEventListener('resize', checkScrollable); 
    }, [logins]); 

    useEffect(() => { 
        document.documentElement.style.setProperty('--background-color', isDarkMode ? '#161618' : '#eee5e5'); 
        document.documentElement.style.setProperty('--font-color', isDarkMode ? '#eeeeee' : '#37392e'); 
        document.documentElement.style.setProperty('--line-color', isDarkMode ? '#3a62be' : '#28afb0'); 
    }, [isDarkMode]); 

    const Button = ({ children, onClick, type, className }) => ( 
        <a href="#" className={`button ${className}`} onClick={onClick}> 
            <div className="wave"></div> 
            <div className="wave"></div> 
            <div className="wave"></div> 
            <div className="wave"></div> 
            <div className="fish"></div> {/* Fish element */} 
            <div className="bubble"></div> 
            <div className="bubble"></div> 
            <div className="bubble"></div> 
            <div className="bubble"></div> 
            <span className="button__text">{children}</span> 
        </a> 
    ); 

    const hexStringToArray = (hexString) => {
        // Check if the input is a valid hex string
        if (!/^[0-9A-Fa-f]+$/.test(hexString)) {
            throw new Error("Invalid hex string");
        }
    
        if (hexString.length % 2 !== 0) {
            throw new Error("Invalid hex string");
        }
    
        const resultArray = [];
        for (let i = 0; i < hexString.length; i += 2) {
            const hexPair = hexString.substring(i, i + 2);
            resultArray.push(parseInt(hexPair, 16)); // Convert hex pair to integer
        }
    
        return resultArray;
    };

    const derive224BytesUsingHMACSHA512 = useCallback(async (password, salt, iterations) => {
        const derivedKey = await pbkdf2({
          password,
          salt,
          iterations,
          hashLength: 224,
          hashFunction: createSHA512(),
          outputType: 'binary',
        });
        return new Uint8Array(derivedKey);
      }, []);

    const encryptStringWithTwoCiphers = async (title, username, password, website) => {
        const iterations = Math.floor(4000 + (userData.numofitr / 6));
        //console.log(iterations);
        // Concatenate the input strings with the delimiter
        const input = [title, username, password, website].join(String.fromCharCode(0x1F));
    
        // Convert the concatenated string to bytes
        const bytes = new TextEncoder().encode(input);
        //console.log('Plaintext (raw):', bytes);
        //console.log('Iterations:' + iterations);
        //console.log('Master Key', userData.masterKey);
        const salt = window.crypto.getRandomValues(new Uint8Array(32));
        const chunkSize = 256 * 1024;
        let offset = 0;
    
        const encryptedChunks = [];
        salt.forEach(byte => encryptedChunks.push(byte));
        const derivedKey = await derive224BytesUsingHMACSHA512(userData.masterKey, salt, iterations);
        let chacha20key = new Uint8Array(derivedKey.slice(0, 64));
        const blockCipherKey = derivedKey.slice(64, 96);
        const hmacKey = derivedKey.slice(96);
        const tag = await computeTagForStringUsingHMACSHA512(hmacKey, bytes);
        const tag_and_data = new Uint8Array([...tag, ...bytes]);
        const encryptedData = new Uint8Array(tag_and_data.length);
        const totalSize = tag_and_data.length;
    
        while (offset < totalSize) {
          const input = Array.from(chacha20key).map(byte => byte.toString(16).padStart(2, '0')).join('');
          const sha512_output = CryptoJS.SHA512(input).toString();
          const sha512Array = hexStringToArray(sha512_output);
          const byteArray = new Uint8Array(sha512Array);
          const generatedHash = await whirlpool(byteArray);
          chacha20key = new Uint8Array(hexStringToArray(generatedHash));
        
          const chunk = tag_and_data.slice(offset, Math.min(offset + chunkSize, totalSize));
          const nonce = chacha20key.slice(32, 40);
          const chacha20 = new ChaCha20();
          const encryptedChunk = chacha20.encrypt(chacha20key.slice(0, 32), chunk, nonce);
          
          // Push encrypted chunk element by element
          for (let i = 0; i < encryptedChunk.length; i++) {
            encryptedData[offset + i] = encryptedChunk[i];
          }
          
          offset += chunk.length;
        }
    
        const blockcipher_chunk_size = 16;
        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        
        let encryptFunction = encryptTwofish256ECB;
        
        const encryptedIV = await encryptFunction(iv, blockCipherKey);
        encryptedIV.forEach(byte => encryptedChunks.push(byte));
        
        let previousCiphertext = iv;
        
        for (let i = 0; i < encryptedData.length; i += blockcipher_chunk_size) {
          let chunk = encryptedData.slice(i, i + blockcipher_chunk_size);
          if (chunk.length < blockcipher_chunk_size) {
            const padding = blockcipher_chunk_size - chunk.length;
            const paddedChunk = new Uint8Array(blockcipher_chunk_size);
            paddedChunk.set(chunk);
            paddedChunk.fill(padding, chunk.length);
            chunk = paddedChunk;
          }
          let xorChunk = chunk.map((byte, index) => byte ^ previousCiphertext[index]);
          let encryptedChunk = await encryptFunction(xorChunk, blockCipherKey);
          encryptedChunk.forEach(byte => encryptedChunks.push(byte));
          previousCiphertext = encryptedChunk;
        }
    
        return Array.from(encryptedChunks).map(byte => byte.toString(16).padStart(2, '0')).join('');
      }
    
      const computeTagForStringUsingHMACSHA512 = useCallback(async (key, data) => {
        const hmac = await createHMAC(createSHA512(), key);
        hmac.init();
        hmac.update(data);
        const signature = hmac.digest('binary');
        return new Uint8Array(signature);
      }, []);
    
      function pkcs7PaddingConsumed(data) {
        let allTen = true;
        for (let i = 0; i < 16; i++) {
          if (data[i] !== 0x10) {
            allTen = false;
            break;
          }
        }
        if (allTen) {
          return 16;
        }
        const paddingValue = data[15];
        if (paddingValue < 1 || paddingValue > 16) {
          return 0;
        }
        for (let i = 1; i <= paddingValue; i++) {
          if (data[16 - i] !== paddingValue) {
            return 0;
          }
        }
        return paddingValue;
      }
    
      const decryptStringWithTwoCiphers = async (input) => {
        const bytes = new Uint8Array(input.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const salt = bytes.slice(0, 32);
        const iterations = Math.floor(4000 + (userData.numofitr / 6));
        const chunkSize = 16;
        const derivedKey = await derive224BytesUsingHMACSHA512(userData.masterKey, salt, iterations);
        let chacha20key = new Uint8Array(derivedKey.slice(0, 64));
        const blockCipherKey = derivedKey.slice(64, 96);
        const hmacKey = derivedKey.slice(96);
      
        let decryptFunction = decryptTwofish256ECB;
      
        const extractedIV = bytes.slice(32, 48);
        const decryptedIV = await decryptFunction(extractedIV, blockCipherKey);
        let previousCiphertext = decryptedIV;
        const decryptedData = [];
        const decryptedDataForWrite = [];
        let dataLengthNoLC = bytes.length - chunkSize;
        for (let i = 48; i < dataLengthNoLC; i += chunkSize) {
          let chunk = bytes.slice(i, i + chunkSize);
          let decryptedChunk = await decryptFunction(chunk, blockCipherKey);
          let xorChunk = decryptedChunk.map((byte, index) => byte ^ previousCiphertext[index]);
          xorChunk.forEach(byte => decryptedData.push(byte));
          previousCiphertext = chunk;
        }
      
        // Handle padding in the last block
        let encryptedLastBlock = bytes.slice(bytes.length - chunkSize);
        let decryptedLastBlock = await decryptFunction(encryptedLastBlock, blockCipherKey);
        let decryptedLastBlockXORed = decryptedLastBlock.map((byte, index) => byte ^ previousCiphertext[index]);
        let paddingLength = pkcs7PaddingConsumed(decryptedLastBlockXORed);
        let invalidPadding = false;
        if (paddingLength === 0) {
          invalidPadding = true;
        } else if (paddingLength === 16) {
          // Do nothing
        } else {
          let unpaddedLastBlock = decryptedLastBlockXORed.slice(0, 16 - paddingLength);
          unpaddedLastBlock.forEach(byte => decryptedData.push(byte));
        }
    
        const decryptedDataUint8Array = new Uint8Array(decryptedData);
    
        const chunkSizeForStreamCipher = 256 * 1024; // 256 KB chunks
        let streamCipherOffset = 0;
        const decryptedTag = new Uint8Array(64);
        const decryptedChunks = new Uint8Array(decryptedDataUint8Array.length - 64);
        let decryptedOffset = 0;
        
        let isFirstChunk = true;
        
        while (streamCipherOffset < decryptedDataUint8Array.length) {
          const input = Array.from(chacha20key).map(byte => byte.toString(16).padStart(2, '0')).join('');
          const sha512_output = CryptoJS.SHA512(input).toString();
          const sha512Array = hexStringToArray(sha512_output);
          const byteArray = new Uint8Array(sha512Array);
          const generatedHash = await whirlpool(byteArray);
          chacha20key = new Uint8Array(hexStringToArray(generatedHash));
        
          const chunk = decryptedDataUint8Array.slice(streamCipherOffset, Math.min(streamCipherOffset + chunkSizeForStreamCipher, decryptedDataUint8Array.length));
          const nonce = chacha20key.slice(32, 40);
          const chacha20 = new ChaCha20();
          const decryptedChunk = chacha20.decrypt(chacha20key.slice(0, 32), chunk, nonce);
        
          if (isFirstChunk) {
            decryptedTag.set(decryptedChunk.slice(0, 64));
            decryptedChunks.set(decryptedChunk.slice(64), 0);
            decryptedOffset = decryptedChunk.length - 64;
            isFirstChunk = false;
          } else {
            decryptedChunks.set(decryptedChunk, decryptedOffset);
            decryptedOffset += decryptedChunk.length;
          }
        
          streamCipherOffset += chunk.length;
        }
        
        const decryptedWithStreamCipher = decryptedChunks.slice(0, decryptedOffset);
        const newTag = await computeTagForStringUsingHMACSHA512(hmacKey, decryptedWithStreamCipher);
        let integrityFailed = false;
        for (let i = 0; i < 64; i++) {
          if (decryptedTag[i] !== newTag[i]) {
            integrityFailed = true;
            break;
          }
        }
        return [decryptedWithStreamCipher, integrityFailed];
    };
      
      function bytesToAscii(bytes) {
        return Array.from(bytes).map(byte => {
          if (byte >= 32 && byte <= 126) {
            return String.fromCharCode(byte);
          } else {
            return '.';
          }
        }).join('');
      };

    const checkScrollable = () => { 
        if (linesRef.current) { 
            const isContentScrollable = linesRef.current.scrollHeight > linesRef.current.clientHeight; 
            setIsScrollable(isContentScrollable); 
        } 
    }; 

    const handleAddRecord = () => { 
        setFormMode('add'); 
        setCurrentRecord(null); 
        setShowForm(true); 
    }; 

    const handleRecordClick = (id) => { 
        const record = logins.find(p => p.id === id); 
        setCurrentRecord(record); 
        setFormMode('view'); 
        setShowForm(true); // Show form when record is clicked
    }; 

    const handleFormSubmit = (event) => {
        event.preventDefault(); // Prevent default form submission
      };


    const handleRecordAddition = async () => {
       // Get form data
       const title = document.querySelector('input[name="title"]').value;
       const username = document.querySelector('input[name="username"]').value;
       const password = document.querySelector('input[name="password"]').value;
       const website = document.querySelector('input[name="website"]').value;
       //console.log('Plaintext:');
       //console.log('Title:', title);
       //console.log('Username:', username);
       //console.log('Password:', password);
       //console.log('Website:', website);
       try {
        const ciphertext = await encryptStringWithTwoCiphers(title, username, password, website);
        //console.log('Ciphertext:', ciphertext);
        showTwoLinedPopup("Adding Encrypted Record to Firebase", "Please wait for a while");
        // Generate a unique ID and check if it exists in Firestore
        let uniqueId;
        let isUnique = false;

        while (!isUnique) {
            uniqueId = generateUniqueId();
            const docRef = doc(db, user.email, uniqueId);
            const docSnap = await getDoc(docRef);
            isUnique = !docSnap.exists();
        }

        // Add the record to Firestore
        const recordData = {
            ciphertext: ciphertext
        };

        await setDoc(doc(db, user.email, uniqueId), recordData);
        toast.success('Record added successfully!');
        setIsPopupVisible(false);
        addRecord(uniqueId, title, username, password, website);
        setShowForm(false);

        } catch (error) {
            toast.error("Error: " + error.message);
            setIsPopupVisible(false);
        }
        setIsPopupVisible(false);
    };

    const generateUniqueId = () => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const randomValues = window.crypto.getRandomValues(new Uint8Array(10));
      return Array.from(randomValues, (byte) => charset[byte % charset.length]).join('');
    };

    const handleDeleteConfirmation = () => {
        setShowConfirmPopUp(true); // Show confirmation pop-up
    };

    const handleDelete = async () => {
      toast.info('Attempting to Delete Record');
      await deleteRecord(user.email, currentRecord.id);
      // Close pop-up and form after deletion
      setShowConfirmPopUp(false);
      setShowForm(false);
      setIsPopupVisible(false);
    };

    async function deleteRecord(collectionName, documentId) {
      try {
          // Reference to the document
          const docRef = doc(db, collectionName, documentId);
          
          // Delete the document
          await deleteDoc(docRef);
  
          // Verify if the document still exists
          const docSnapshot = await getDoc(docRef);
          if (!docSnapshot.exists()) {
            setLogins(logins.filter(p => p.id !== currentRecord.id)); // Delete the record
            toast.dismiss();
            toast.success('Record deleted successfully!');
          } else {
            toast.dismiss();
            toast.error('Failed to delete record');
          }
      } catch (error) {
          toast.dismiss();
          toast.error('Error removing document: ' + error);
      }
  }

    const handleCancelDelete = () => {
        setShowConfirmPopUp(false); // Close confirmation pop-up without deleting
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode); // Toggle dark mode
    }; 

    return (  
      <div className="encrypted-space">  
          <div className="encrypted-space-theme-switch-wrapper">  
              <div className="encrypted-space-theme-switch-toggleWrapper">  
                  <input type="checkbox" className="encrypted-space-theme-switch-dn" id="encrypted-space-theme-switch-dn" checked={isDarkMode} onChange={toggleTheme} />  
                  <label htmlFor="encrypted-space-theme-switch-dn" className="encrypted-space-theme-switch-toggle">  
                      <span className="encrypted-space-theme-switch-toggle__handler">  
                          <span className="encrypted-space-theme-switch-crater encrypted-space-theme-switch-crater--1"></span>  
                          <span className="encrypted-space-theme-switch-crater encrypted-space-theme-switch-crater--2"></span>  
                          <span className="encrypted-space-theme-switch-crater encrypted-space-theme-switch-crater--3"></span>  
                      </span>  
                      <span className="encrypted-space-theme-switch-star encrypted-space-theme-switch-star--1"></span>  
                      <span className="encrypted-space-theme-switch-star encrypted-space-theme-switch-star--2"></span>  
                      <span className="encrypted-space-theme-switch-star encrypted-space-theme-switch-star--3"></span>  
                      <span className="encrypted-space-theme-switch-star encrypted-space-theme-switch-star--4"></span>  
                      <span className="encrypted-space-theme-switch-star encrypted-space-theme-switch-star--5"></span>  
                      <span className="encrypted-space-theme-switch-star encrypted-space-theme-switch-star--6"></span>  
                  </label>  
              </div>  
          </div>  

          <main className="encrypted-space-main">  
              <div className="encrypted-space-paper">  

                  {/* Vertical Line */}
                  <div className="encrypted-space-line-or-scroll"></div>

                  {/* Holes on the Left Side */}
                  <div className="encrypted-space-holes">  
                      {/* Ensure these divs have appropriate styles in your CSS */}
                      <div className="encrypted-space-hole"></div>  
                      <div className="encrypted-space-hole"></div>  
                      <div className="encrypted-space-hole"></div>
                  </div>

                  {/* Main Content */}
                  <div className={`encrypted-space-lines ${isScrollable ? 'scrollable' : ''}`} ref={linesRef}>  
                      <div className="encrypted-space-user">{`${userData.origUsername}'s stuff`}</div>
                      <div className="encrypted-space-add-record" onClick={handleAddRecord}> Click here to add a new record. </div>  
                      {logins.map((login) => (
          <div 
            key={login.id} 
            className="encrypted-space-record" 
            onClick={() => handleRecordClick(login.id)} 
            style={login.integrityFailed ? { color: 'red', textDecoration: 'line-through' } : {}}
          >
            {login.title.length > 26 ? `${login.title.substring(0, 25)}...` : login.title}
          </div>
        ))}

<div style={{ height: '50px', lineHeight: '50px', userSelect: 'none', WebkitUserSelect: 'none', msUserSelect: 'none', cursor: 'default' }}>&nbsp;</div>
                      <div className="encrypted-space-record" onClick={()=>auth.signOut()}> Log out </div>  
                  </div>

                  {/* Confirmation Pop-Up */}
                  {showConfirmPopUp && (
                    <div className="encrypted-space-confirm-pop-up-modal">
                        {/* Moving Background for Pop-Up */}
                        <div className="encrypted-space-confirm-pop-up-background"></div>
                        <p className="encrypted-space-confirm-pop-up-message">Are you sure you want to delete this record?</p>
                        <div className="encrypted-space-confirm-pop-up-options">
                            <button
                                className="encrypted-space-confirm-pop-up-btn"
                                onClick={handleDelete}
                            >
                                Yes
                            </button>
                            <button
                                className="encrypted-space-confirm-pop-up-btn"
                                onClick={handleCancelDelete}
                            >
                                No
                            </button>
                        </div>
                    </div>
                  )}
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
                  {/* Form Pop-Up */}
                  {showForm && (  
                      <div className="encrypted-space-pop-up-form-wrapper">  
                          <div className="encrypted-space-pop-up-form">  
                              <div className="encrypted-space-pop-up-form-face">  
                                  <div className="encrypted-space-pop-up-form-content">  
                                      <h2>{formMode === 'add' ? 'New Record' : 'View Record'}</h2>  

                                      {/* Form Submission */}
                                      <form>  

                                          {/* Form Fields */}
                                          <div className="encrypted-space-pop-up-form-field-wrapper">  
                                              <input type="text" name="title" placeholder="Title" defaultValue={currentRecord?.title} readOnly={formMode === 'view'} required />  
                                              <label>Title</label>  
                                          </div>  

                                          <div className="encrypted-space-pop-up-form-field-wrapper">  
                                              <input type="text" name="username" placeholder="Username" defaultValue={currentRecord?.username} readOnly={formMode === 'view'} required />  
                                              <label>Username</label>  
                                          </div>

                                          <div className="encrypted-space-pop-up-form-field-wrapper">  
                                              <input type="text" name="password" placeholder="Password" defaultValue={currentRecord?.password} readOnly={formMode === 'view'} required />  
                                              <label>Password</label>  
                                          </div>

                                          <div className="encrypted-space-pop-up-form-field-wrapper">  
                                              <input type="text" name="website" placeholder="Website" defaultValue={currentRecord?.website} readOnly={formMode === 'view'} required />  
                                              <label>Website</label>  
                                          </div>

                                          {/* Buttons */}
                                          <div className={`encrypted-space-pop-up-form-buttons`}>  

                                              {formMode === 'add' ? (   
                                                  <>   
                                                      {/* Add button and cancel button */}
                                                      <Button 
                                                        type="submit" 
                                                        className={`button--2`} 
                                                        onClick={async (e) => {
                                                          e.preventDefault(); // Prevent the default form submission
                                                          
                                                          // Show the popup
                                                          showTwoLinedPopup("Encrypting Record", "Please wait for a while");
                                                          
                                                          // Wait for 100ms
                                                          await new Promise(resolve => setTimeout(resolve, 100));
                                                          
                                                          try {
                                                            await handleRecordAddition();

                                                          } catch (error) {

                                                          } finally {

                                                          }
                                                        }}
                                                      >
                                                        Add
                                                      </Button>
                                                      <Button type={`button`} className={`button--3`} onClick={() => setShowForm(false)}>Cancel</Button>
                                                  </>) : (
                                                  <>
                                                      {/* OK button and Delete button */}
                                                      {/* Change delete button to handle confirmation */}
                                                      {/* Use delete confirmation instead of direct delete */}
                                                      <Button type={`button`} className={`button--2`} onClick={() => setShowForm(false)}>OK</Button>
                                                      {/* Change delete button to show confirmation pop-up */}
                                                      <Button type={`button`} className={`button--1`} onClick={handleDeleteConfirmation}>Delete</Button>
                                                  </>
                                              )}  

                                          </div>
                                      </form>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  
                  {/* Toast Notifications */}
                  <ToastContainer
                    position="bottom-right"
                    style={{ bottom: '50px' }}
                    />
              </div>
          </main>
      </div>
  );   
}; 

export default EncryptedSpace;