import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyCn3dggYjAo8aeots1DE_gjRuSDFRSfz1k',
    authDomain: 'parkit-e31d9.firebaseapp.com',
    projectId: 'parkit-e31d9',
    storageBucket: 'parkit-e31d9.firebasestorage.app',
    messagingSenderId: '378006348497',
    appId: '1:378006348497:web:4b039db8d70c80ae2e5bf0',
    measurementId: 'G-S03TH5GSXF',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
