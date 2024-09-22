import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX,
  authDomain: "database-name-default-rtdb.firebaseapp.com",
  projectId: "database-name-default-rtdb",
  storageBucket: "databaseforpasswordvault.appspot.com",
  messagingSenderId: "111111111111",
  appId: "1:111111111111:web:abcdefghjklmnopqrstuvw"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth()
export const db = getFirestore()
export const storage = getStorage()