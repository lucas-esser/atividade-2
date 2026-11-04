import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { AuthScreen } from "../components/AppScreens";

export default function SignInRoute() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (user) router.replace("/conta");
    else setChecking(false);
  }), [router]);

  if (checking) {
    return <View style={styles.loading}><ActivityIndicator color="#167A57" size="large" /></View>;
  }

  return <AuthScreen />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#F5F7F3", alignItems: "center", justifyContent: "center" },
});
