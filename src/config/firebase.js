import admin from 'firebase-admin';
import config from './env.js';

let firebaseInitialized = false;

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
