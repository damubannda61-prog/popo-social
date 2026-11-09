
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  ConfirmationResult
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { UserProfile, PrivateUserInfo } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  privateInfo: PrivateUserInfo | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier;
  sendPhoneCode: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  toggleBlockUser: (targetUserId: string) => Promise<boolean>;
  toggleSavePost: (postId: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'ddamubannda@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<PrivateUserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncUserProfile = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const isDefaultAdmin = user.email === ADMIN_EMAIL;

      if (!userDoc.exists()) {
        const usernameBase = (user.email?.split('@')[0] || user.phoneNumber || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_.]/g, '');
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const finalUsername = `${usernameBase}${randomSuffix}`;

        const initialProfile: UserProfile = {
          uid: user.uid,
          username: finalUsername,
          displayName: user.displayName || user.email?.split('@')[0] || 'POPO User',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          bio: 'Hey there! I am using POPO.',
          website: '',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          role: isDefaultAdmin ? 'admin' : 'user',
          isBlocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);

        if (isDefaultAdmin) {
          const adminRef = doc(db, 'admins', user.uid);
          await setDoc(adminRef, {
            uid: user.uid,
            email: user.email,
            role: 'superadmin',
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }

        const privateRef = doc(db, 'users', user.uid, 'private', 'info');
        const initialPrivate: PrivateUserInfo = {
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          blockedUserIds: [],
          savedPostIds: [],
          updatedAt: new Date().toISOString(),
        };
        await setDoc(privateRef, initialPrivate);
        setPrivateInfo(initialPrivate);
      } else {
        const data = userDoc.data() as UserProfile;
        setUserProfile(data);
      }

      if (isDefaultAdmin) {
        setIsAdmin(true);
      } else {
        try {
          const adminCheckDoc = await getDoc(doc(db, 'admins', user.uid));
          setIsAdmin(adminCheckDoc.exists());
        } catch {
          setIsAdmin(false);
        }
      }
    } catch (err) {
      console.error('Error synchronizing user profile:', err);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribePrivate: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthError(null);

      if (user) {
        await syncUserProfile(user);

        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          }
        }, (error) => {
          console.warn('Profile snapshot warning:', error);
        });

        const privateRef = doc(db, 'users', user.uid, 'private', 'info');
        unsubscribePrivate = onSnapshot(privateRef, (snap) => {
          if (snap.exists()) {
            setPrivateInfo(snap.data() as PrivateUserInfo);
          }
        }, (error) => {
          console.warn('Private info snapshot warning:', error);
        });
      } else {
        setUserProfile(null);
        setPrivateInfo(null);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribePrivate) unsubscribePrivate();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      setAuthError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {}
    });
  };

  const sendPhoneCode = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    try {
      setAuthError(null);
      return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send SMS code';
      setAuthError(msg);
      throw err;
    }
  };

  const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      await confirmationResult.confirm(code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid SMS confirmation code';
      setAuthError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setPrivateInfo(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updatedFields = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, updatedFields);
      setUserProfile((prev) => prev ? { ...prev, ...updatedFields } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const toggleBlockUser = async (targetUserId: string): Promise<boolean> => {
    if (!currentUser) return false;

    const isCurrentlyBlocked = privateInfo?.blockedUserIds?.includes(targetUserId);

    try {
      const privateRef = doc(db, 'users', currentUser.uid, 'private', 'info');

      if (isCurrentlyBlocked) {
        await updateDoc(privateRef, {
          blockedUserIds: arrayRemove(targetUserId),
          updatedAt: new Date().toISOString()
        });
        return false;
      }

      await updateDoc(privateRef, {
        blockedUserIds: arrayUnion(targetUserId),
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/private/info`);
      return !!isCurrentlyBlocked;
    }
  };

  const toggleSavePost = async (postId: string): Promise<boolean> => {
    if (!currentUser) return false;

    const isSaved = privateInfo?.savedPostIds?.includes(postId);

    try {
      const privateRef = doc(db, 'users', currentUser.uid, 'private', 'info');

      if (isSaved) {
        await updateDoc(privateRef, {
          savedPostIds: arrayRemove(postId),
          updatedAt: new Date().toISOString()
        });
        return false;
      }

      await updateDoc(privateRef, {
        savedPostIds: arrayUnion(postId),
        updatedAt: new Date().toISOString()
      });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/private/info`);
      return !!isSaved;
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        privateInfo,
        isAdmin,
        loading,
        authError,
        signInWithGoogle,
        setupRecaptcha,
        sendPhoneCode,
        verifyPhoneCode,
        signOutUser,
        updateUserProfile,
        toggleBlockUser,
        toggleSavePost,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
