export function getFriendlyFirebaseError(errorCode) {
  const errors = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password should be at least 6 characters.",
  };

  return errors[errorCode] || "Something went wrong. Please try again.";
}
