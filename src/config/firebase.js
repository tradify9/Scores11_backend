import admin from 'firebase-admin';
import crypto from 'crypto';
import config from './env.js';

let firebaseInitialized = false;
let firebaseCertCache = { expiresAt: 0, certs: {} };

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  return Buffer.from(padded, 'base64');
};

const decodeJwtPart = (value) => JSON.parse(base64UrlDecode(value).toString('utf8'));

const getFirebasePublicCerts = async () => {
  if (firebaseCertCache.expiresAt > Date.now()) {
    return firebaseCertCache.certs;
  }
  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) {
    throw new Error(`Unable to fetch Firebase public certificates (${response.status})`);
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
  firebaseCertCache = {
    expiresAt: Date.now() + maxAgeMs,
    certs: await response.json()
  };
  return firebaseCertCache.certs;
};

const verifyFirebaseIdTokenWithPublicCerts = async (idToken) => {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Invalid Firebase ID token format');
  }

  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);
  const allowedProjectIds = [...new Set(config.firebase.authProjectIds || [])];

  if (!allowedProjectIds.includes(payload.aud)) {
    throw new Error(`Firebase ID token project mismatch. Expected ${allowedProjectIds.join(', ')}, got ${payload.aud}`);
  }
  if (payload.iss !== `https://securetoken.google.com/${payload.aud}`) {
    throw new Error('Firebase ID token issuer is invalid');
  }
  if (!payload.sub) {
    throw new Error('Firebase ID token subject is missing');
  }
  if (payload.exp * 1000 <= Date.now()) {
    throw new Error('Firebase ID token has expired');
  }

  const certs = await getFirebasePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Firebase ID token certificate is not recognized');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(cert, base64UrlDecode(encodedSignature));
  if (!valid) {
    throw new Error('Firebase ID token signature is invalid');
  }

  return payload;
};

export const initializeFirebase = () => {
  if (firebaseInitialized) return admin;
  
  try {
    const serviceAccount = {
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail
    };
    
    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      console.warn('Firebase credentials not configured. Push notifications will be disabled.');
      return null;
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: config.firebase.databaseUrl
    });
    
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
    return admin;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
};

export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error('Firebase ID token is required');
  }
  try {
    const firebaseAdmin = initializeFirebase();
    if (!firebaseAdmin) {
      throw new Error('Firebase Admin is not configured');
    }
    return await firebaseAdmin.auth().verifyIdToken(idToken, true);
  } catch (error) {
    return verifyFirebaseIdTokenWithPublicCerts(idToken);
  }
};

export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const firebaseAdmin = initializeFirebase();
    if (!firebaseAdmin) {
      console.warn('Firebase not initialized. Push notification skipped.');
      return false;
    }
    
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      token: fcmToken
    };
    
    await firebaseAdmin.messaging().send(message);
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
};

export const sendMultiplePushNotifications = async (fcmTokens, title, body, data = {}) => {
  try {
    const firebaseAdmin = initializeFirebase();
    if (!firebaseAdmin) return false;
    
    const messages = fcmTokens.map(token => ({
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      token
    }));
    
    await firebaseAdmin.messaging().sendAll(messages);
    return true;
  } catch (error) {
    console.error('Multiple push notifications error:', error);
    return false;
  }
};

export const subscribeToTopic = async (fcmTokens, topic) => {
  try {
    const firebaseAdmin = initializeFirebase();
    if (!firebaseAdmin) return false;
    
    await firebaseAdmin.messaging().subscribeToTopic(fcmTokens, topic);
    return true;
  } catch (error) {
    console.error('Subscribe to topic error:', error);
    return false;
  }
};

export default initializeFirebase;
