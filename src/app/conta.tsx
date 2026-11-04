import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { MainApp } from "../components/AppScreens";

export default function AccountRoute() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) setUser(currentUser);
    else router.replace("/");
    setChecking(false);
  }), [router]);

  if (checking || !user) {
    return <View style={styles.loading}><ActivityIndicator color="#167A57" size="large" /></View>;
  }

  return <MainApp user={user} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: "#F5F7F3", alignItems: "center", justifyContent: "center" },
});
