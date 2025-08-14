import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../../firebase";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "135933024414-e2166mmkopeqdf3cna5g1lq17vpb3hqt.apps.googleusercontent.com", // Web client ID
    redirectUri: "https://auth.expo.io/@mutahir1212/freefire-tournament", // Expo Auth Redirect
  });

  async function handleGoogleSignIn() {
    try {
      const result = await promptAsync({ useProxy: false });
      if (result?.type === "success") {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        await signInWithCredential(auth, credential);
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  }

  return { handleGoogleSignIn, request };
}
