import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  addDoc, collection, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

const firebaseConfigured = true;

const C = {
  ink: '#13221D', muted: '#718079', paper: '#F5F7F3', white: '#FFFFFF',
  green: '#167A57', green2: '#0D6547', mint: '#E5F2EB', line: '#E8EDE8',
  red: '#C2544D', redPale: '#FAECEA', gold: '#E8B85A', dark: '#123B2E',
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const todayGreeting = () => new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(new Date()).toUpperCase();
const dateToBR = (iso = '') => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const formatMoney = (cents = 0) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseAmount = (raw) => {
  const cleaned = raw.trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!cleaned) return NaN;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
};
const validDate = (raw) => {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return null;
  return `${yyyy}-${mm}-${dd}`;
};
const friendlyAuthError = (code) => ({
  'auth/invalid-email': 'Confira o formato do e-mail.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/wrong-password': 'A senha não confere.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já tem uma conta.',
  'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
  'auth/network-request-failed': 'Sem conexão. Confira a internet e tente de novo.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
}[code] || 'Não foi possível concluir. Tente novamente.');

function Wordmark({ light = false }) {
  return <View style={styles.wordmark}><View style={styles.brandIcon}><Text style={styles.brandGlyph}>c</Text></View><Text style={[styles.brandName, light && { color: C.white }]}>conta clara</Text></View>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, autoCapitalize = 'none', hint }) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A5AEA8"
      keyboardType={keyboardType || 'default'} secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize}
      style={styles.input} selectionColor={C.green} />
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>;
}

export function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async () => {
    if (!firebaseConfigured) {
      Alert.alert('Falta configurar o Firebase', 'Copie .env.example para .env, preencha os dados do app Web do Firebase e reinicie o Expo.');
      return;
    }
    if (!email.trim() || !password) { Alert.alert('Preencha os campos', 'Informe seu e-mail e sua senha para continuar.'); return; }
    setBusy(true);
    try {
      if (signup) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) { Alert.alert('Não foi possível entrar', friendlyAuthError(e.code)); }
    finally { setBusy(false); }
  };
  const resetPassword = async () => {
    if (!email.trim()) { Alert.alert('Informe seu e-mail', 'Digite o e-mail da sua conta no campo acima.'); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); Alert.alert('E-mail enviado', 'Siga o link que enviamos para criar uma nova senha.'); }
    catch (e) { Alert.alert('Não foi possível enviar', friendlyAuthError(e.code)); }
  };

  return <SafeAreaView style={styles.authSafe}>
    <ExpoStatusBar style="dark" />
    <KeyboardAvoidingView style={styles.authRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <View style={styles.authTop}><Wordmark /><View style={styles.authOrb}><Text style={styles.authOrbIcon}>↗</Text></View></View>
        <View style={styles.authCopy}><Text style={styles.eyebrow}>SEU DINHEIRO, MAIS CLARO</Text><Text style={styles.authTitle}>{signup ? 'Comece com\nclareza.' : 'Tudo no lugar.\nNo seu ritmo.'}</Text><Text style={styles.authSub}>Acompanhe o que entra e sai, sem complicar.</Text></View>
        <View style={styles.authCard}>
          <View style={styles.authTabs}>
            <Pressable onPress={() => setMode('login')} style={[styles.authTab, !signup && styles.authTabActive]}><Text style={[styles.authTabText, !signup && styles.authTabTextActive]}>Entrar</Text></Pressable>
            <Pressable onPress={() => setMode('signup')} style={[styles.authTab, signup && styles.authTabActive]}><Text style={[styles.authTabText, signup && styles.authTabTextActive]}>Criar conta</Text></Pressable>
          </View>
          <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" />
          <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry />
          {!signup ? <Pressable style={styles.forgot} onPress={resetPassword}><Text style={styles.forgotText}>Esqueci minha senha</Text></Pressable> : null}
          <Pressable style={[styles.primaryButton, busy && styles.buttonBusy]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryButtonText}>{signup ? 'Criar minha conta' : 'Entrar na minha conta'} <Text style={styles.buttonArrow}>→</Text></Text>}
          </Pressable>
          {!firebaseConfigured ? <Text style={styles.setupNote}>Configure seu projeto Firebase para habilitar o acesso.</Text> : null}
          <Text style={styles.privacyNote}>Seus lançamentos são privados e ligados à sua conta.</Text>
        </View>
        <Text style={styles.authFoot}>Simples de acompanhar. Fácil de cuidar.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function TransactionRow({ item }) {
  const income = item.type === 'income';
  return <View style={styles.transactionRow}>
    <View style={[styles.transactionIcon, income ? styles.incomeIcon : styles.expenseIcon]}><Text style={[styles.transactionIconText, { color: income ? C.green : C.red }]}>{income ? '↙' : '↗'}</Text></View>
    <View style={styles.transactionInfo}><Text style={styles.transactionTitle} numberOfLines={1}>{item.description}</Text><Text style={styles.transactionDate}>{dateToBR(item.date)}</Text></View>
    <Text style={[styles.transactionAmount, { color: income ? C.green : C.ink }]}>{income ? '+' : '−'} {formatMoney(item.amountCents)}</Text>
  </View>;
}

function TransactionModal({ visible, onClose, onSave }) {
  const [type, setType] = useState('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dateToBR(todayISO()));
  const [busy, setBusy] = useState(false);
  const close = () => { setType('expense'); setDescription(''); setAmount(''); setDate(dateToBR(todayISO())); onClose(); };
  const save = async () => {
    const amountCents = parseAmount(amount);
    const dateISO = validDate(date);
    if (!description.trim()) { Alert.alert('Adicione uma observação', 'Por exemplo: mercado, salário ou conta de luz.'); return; }
    if (!Number.isInteger(amountCents) || amountCents <= 0) { Alert.alert('Confira o valor', 'Informe um valor maior que zero.'); return; }
    if (!dateISO) { Alert.alert('Confira a data', 'Use o formato DD/MM/AAAA, por exemplo 03/11/2026.'); return; }
    setBusy(true);
    try { await onSave({ type, description: description.trim(), amountCents, date: dateISO, createdAt: serverTimestamp() }); close(); }
    catch { Alert.alert('Não foi possível salvar', 'Confira sua conexão e as regras do Firestore.'); }
    finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeading}><View><Text style={styles.eyebrow}>NOVO LANÇAMENTO</Text><Text style={styles.modalTitle}>O que aconteceu?</Text></View><Pressable onPress={close} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
        <View style={styles.typeSwitch}>
          <Pressable onPress={() => setType('expense')} style={[styles.typeOption, type === 'expense' && styles.typeExpenseActive]}><Text style={[styles.typeOptionText, type === 'expense' && styles.typeExpenseText]}>↗  Saída</Text></Pressable>
          <Pressable onPress={() => setType('income')} style={[styles.typeOption, type === 'income' && styles.typeIncomeActive]}><Text style={[styles.typeOptionText, type === 'income' && styles.typeIncomeText]}>↙  Entrada</Text></Pressable>
        </View>
        <Field label="Valor" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
        <Field label="Observação" value={description} onChangeText={setDescription} placeholder="Ex.: mercado, salário..." autoCapitalize="sentences" />
        <Field label="Data" value={date} onChangeText={setDate} placeholder="DD/MM/AAAA" keyboardType="numeric" hint="Digite no formato dia/mês/ano." />
        <Pressable style={[styles.primaryButton, busy && styles.buttonBusy]} onPress={save} disabled={busy}>{busy ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryButtonText}>Salvar lançamento <Text style={styles.buttonArrow}>→</Text></Text>}</Pressable>
      </View>
    </KeyboardAvoidingView></View>
  </Modal>;
}

export function MainApp({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('home');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const firstName = (user.email || 'Olá').split('@')[0].split(/[._-]/)[0];
  const txQuery = useMemo(() => query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')), [user.uid]);
  useEffect(() => onSnapshot(txQuery, (snapshot) => {
    setTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  }, () => { setLoading(false); Alert.alert('Não foi possível carregar', 'Confira sua conexão e as regras do Firestore.'); }), [txQuery]);

  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + (t.amountCents || 0), 0);
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + (t.amountCents || 0), 0);
  const balance = income - expenses;
  const visibleTx = transactions.filter((t) => filter === 'all' || t.type === filter);
  const addTransaction = (entry) => addDoc(collection(db, 'users', user.uid, 'transactions'), entry);

  return <SafeAreaView style={styles.appSafe} edges={['top']}>
    <ExpoStatusBar style="dark" />
    <View style={styles.appTop}><Wordmark /><Pressable onPress={() => signOut(auth)} style={styles.avatar}><Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.appContent} showsVerticalScrollIndicator={false}>
      {screen === 'home' ? <>
        <View style={styles.greetingRow}><View><Text style={styles.greetingSmall}>{todayGreeting()}</Text><Text style={styles.greeting}>Olá, {firstName} <Text style={styles.wave}>✳</Text></Text></View><View style={styles.onlineDot} /></View>
        <View style={styles.balanceCard}>
          <View style={styles.balanceDecorOne} /><View style={styles.balanceDecorTwo} />
          <View style={styles.balanceTop}><Text style={styles.balanceLabel}>SALDO ATUAL</Text><View style={styles.balanceLive}><View style={styles.liveDot} /><Text style={styles.liveText}>ATUALIZADO</Text></View></View>
          <Text style={styles.balanceValue}>{formatMoney(balance)}</Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceBottom}><View><Text style={styles.balanceFootLabel}>Uma visão clara, sempre.</Text><Text style={styles.balanceFoot}>Seu resumo financeiro</Text></View><View style={styles.balanceArrow}><Text style={styles.balanceArrowText}>↗</Text></View></View>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}><View style={styles.summaryHeading}><View style={styles.summaryIconIn}><Text style={styles.summaryIconTextIn}>↙</Text></View><Text style={styles.summaryLabel}>ENTRADAS</Text></View><Text style={[styles.summaryValue, { color: C.green }]}>{formatMoney(income)}</Text><Text style={styles.summaryCaption}>no total</Text></View>
          <View style={styles.summaryCard}><View style={styles.summaryHeading}><View style={styles.summaryIconOut}><Text style={styles.summaryIconTextOut}>↗</Text></View><Text style={styles.summaryLabel}>SAÍDAS</Text></View><Text style={styles.summaryValue}>{formatMoney(expenses)}</Text><Text style={styles.summaryCaption}>no total</Text></View>
        </View>
        <View style={styles.actionRow}><Pressable style={styles.addButton} onPress={() => setModalOpen(true)}><Text style={styles.addButtonPlus}>＋</Text><Text style={styles.addButtonText}>Novo lançamento</Text></Pressable><View style={styles.actionHint}><Text style={styles.actionHintTop}>Um passo</Text><Text style={styles.actionHintBottom}>de cada vez.</Text></View></View>
        <View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Movimentações</Text><Text style={styles.sectionSub}>Suas atividades recentes</Text></View><Pressable onPress={() => setScreen('statement')}><Text style={styles.seeAll}>Ver extrato <Text style={styles.seeArrow}>→</Text></Text></Pressable></View>
        <View style={styles.listCard}>{loading ? <ActivityIndicator color={C.green} style={{ padding: 24 }} /> : transactions.length ? transactions.slice(0, 4).map((item) => <TransactionRow item={item} key={item.id} />) : <EmptyState onAdd={() => setModalOpen(true)} />}</View>
        <View style={styles.quoteCard}><Text style={styles.quoteMark}>“</Text><Text style={styles.quoteText}>Cuidar do seu dinheiro também é cuidar de você.</Text><Text style={styles.quoteBy}>CONTA CLARA</Text></View>
      </> : <>
        <View style={styles.statementTitleRow}><View><Text style={styles.eyebrow}>SUA CONTA</Text><Text style={styles.statementTitle}>Extrato</Text></View><Pressable style={styles.smallAdd} onPress={() => setModalOpen(true)}><Text style={styles.smallAddText}>＋ Novo</Text></Pressable></View>
        <View style={styles.statementBalance}><Text style={styles.summaryLabel}>SALDO ATUAL</Text><Text style={styles.statementBalanceValue}>{formatMoney(balance)}</Text></View>
        <View style={styles.filterRow}>{[['all', 'Tudo'], ['income', 'Entradas'], ['expense', 'Saídas']].map(([key, label]) => <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterChip, filter === key && styles.filterChipActive]}><Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text></Pressable>)}</View>
        <Text style={styles.statementCount}>{visibleTx.length} {visibleTx.length === 1 ? 'lançamento' : 'lançamentos'} · mais recentes primeiro</Text>
        <View style={styles.listCard}>{loading ? <ActivityIndicator color={C.green} style={{ padding: 24 }} /> : visibleTx.length ? visibleTx.map((item) => <TransactionRow item={item} key={item.id} />) : <EmptyState onAdd={() => setModalOpen(true)} />}</View>
      </>}
      <View style={{ height: 24 }} />
    </ScrollView>
    <View style={styles.bottomNav}>
      <Pressable onPress={() => setScreen('home')} style={styles.navItem}><Text style={[styles.navIcon, screen === 'home' && styles.navIconActive]}>⌂</Text><Text style={[styles.navLabel, screen === 'home' && styles.navLabelActive]}>Início</Text></Pressable>
      <Pressable onPress={() => setScreen('statement')} style={styles.navItem}><Text style={[styles.navIcon, screen === 'statement' && styles.navIconActive]}>▤</Text><Text style={[styles.navLabel, screen === 'statement' && styles.navLabelActive]}>Extrato</Text></Pressable>
      <Pressable onPress={() => setModalOpen(true)} style={styles.navAdd}><Text style={styles.navAddIcon}>＋</Text></Pressable>
      <Pressable onPress={() => setScreen('statement')} style={styles.navItem}><Text style={styles.navIcon}>◷</Text><Text style={styles.navLabel}>Atividade</Text></Pressable>
      <Pressable onPress={() => signOut(auth)} style={styles.navItem}><Text style={styles.navIcon}>◉</Text><Text style={styles.navLabel}>Conta</Text></Pressable>
    </View>
    <TransactionModal visible={modalOpen} onClose={() => setModalOpen(false)} onSave={addTransaction} />
  </SafeAreaView>;
}

function EmptyState({ onAdd }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>↗</Text></View><Text style={styles.emptyTitle}>Comece por aqui</Text><Text style={styles.emptyText}>Seus lançamentos vão aparecer nesta lista, organizados por data.</Text><Pressable onPress={onAdd}><Text style={styles.emptyLink}>Adicionar primeiro lançamento →</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  authSafe: { flex: 1, backgroundColor: C.paper }, authRoot: { flex: 1 }, authContent: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 30 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandIcon: { width: 31, height: 31, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }] }, brandGlyph: { color: C.white, fontSize: 22, fontWeight: '800', marginTop: -2 }, brandName: { color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  authTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, authOrb: { width: 47, height: 47, borderRadius: 18, backgroundColor: C.mint, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '9deg' }] }, authOrbIcon: { color: C.green, fontSize: 26, fontWeight: '600' },
  authCopy: { marginTop: 38, marginBottom: 26 }, eyebrow: { color: C.green, fontSize: 10, letterSpacing: 1.8, fontWeight: '800' }, authTitle: { color: C.ink, fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -1.3, marginTop: 12 }, authSub: { color: C.muted, fontSize: 14, marginTop: 11 },
  authCard: { backgroundColor: C.white, borderRadius: 23, padding: 21, shadowColor: '#18372A', shadowOpacity: 0.07, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 4 }, authTabs: { flexDirection: 'row', backgroundColor: C.paper, padding: 4, borderRadius: 13, marginBottom: 23 }, authTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 }, authTabActive: { backgroundColor: C.white, shadowColor: '#172B20', shadowOpacity: 0.07, shadowRadius: 6, elevation: 1 }, authTabText: { color: C.muted, fontWeight: '600', fontSize: 13 }, authTabTextActive: { color: C.ink, fontWeight: '700' },
  fieldWrap: { marginBottom: 16 }, label: { color: C.ink, fontWeight: '700', fontSize: 12, marginBottom: 8 }, input: { height: 50, borderWidth: 1, borderColor: C.line, backgroundColor: '#FCFDFC', borderRadius: 12, paddingHorizontal: 14, color: C.ink, fontSize: 14 }, hint: { color: C.muted, fontSize: 10, marginTop: 6 }, forgot: { alignSelf: 'flex-end', marginTop: -5, marginBottom: 17 }, forgotText: { color: C.green, fontWeight: '700', fontSize: 11 },
  primaryButton: { height: 53, backgroundColor: C.green, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 3 }, buttonBusy: { opacity: 0.7 }, primaryButtonText: { color: C.white, fontWeight: '700', fontSize: 14 }, buttonArrow: { fontSize: 17 }, setupNote: { textAlign: 'center', color: C.red, fontSize: 11, marginTop: 13, lineHeight: 17 }, privacyNote: { color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 14 }, authFoot: { color: '#A3ADA6', fontSize: 11, textAlign: 'center', marginTop: 22 },
  appSafe: { flex: 1, backgroundColor: C.paper }, appTop: { height: 55, paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.paper }, avatar: { width: 36, height: 36, borderRadius: 14, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.green, fontSize: 14, fontWeight: '800' }, appContent: { paddingHorizontal: 21, paddingTop: 15, paddingBottom: 12 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 }, greetingSmall: { fontSize: 9, letterSpacing: 1.25, color: C.muted, fontWeight: '700' }, greeting: { color: C.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.7, marginTop: 4, textTransform: 'capitalize' }, wave: { color: C.gold, fontSize: 21 }, onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#58A879', marginRight: 3 },
  balanceCard: { overflow: 'hidden', backgroundColor: C.dark, borderRadius: 22, padding: 20, minHeight: 174 }, balanceDecorOne: { position: 'absolute', width: 205, height: 205, borderRadius: 103, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', top: -126, right: -38 }, balanceDecorTwo: { position: 'absolute', width: 142, height: 142, borderRadius: 71, backgroundColor: 'rgba(255,255,255,.035)', bottom: -90, right: 57 }, balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, balanceLabel: { color: 'rgba(255,255,255,.66)', fontSize: 9, letterSpacing: 1.8, fontWeight: '700' }, balanceLive: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,.09)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#70D5A0' }, liveText: { color: 'rgba(255,255,255,.72)', fontSize: 7, letterSpacing: 0.8, fontWeight: '700' }, balanceValue: { color: C.white, fontSize: 31, fontWeight: '700', letterSpacing: -1, marginTop: 11 }, balanceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,.12)', marginTop: 15, marginBottom: 11 }, balanceBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, balanceFootLabel: { color: C.white, fontSize: 10, fontWeight: '600' }, balanceFoot: { color: 'rgba(255,255,255,.53)', fontSize: 9, marginTop: 3 }, balanceArrow: { height: 28, width: 28, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', justifyContent: 'center', alignItems: 'center' }, balanceArrowText: { color: C.white, fontSize: 15 },
  summaryGrid: { flexDirection: 'row', gap: 11, marginTop: 13 }, summaryCard: { flex: 1, backgroundColor: C.white, borderRadius: 17, padding: 13, borderWidth: 1, borderColor: '#EDF0EC' }, summaryHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, summaryIconIn: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }, summaryIconOut: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.redPale, alignItems: 'center', justifyContent: 'center' }, summaryIconTextIn: { color: C.green, fontSize: 15, fontWeight: '700' }, summaryIconTextOut: { color: C.red, fontSize: 15, fontWeight: '700' }, summaryLabel: { color: C.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: '800' }, summaryValue: { color: C.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.4, marginTop: 10 }, summaryCaption: { color: '#9AA49D', fontSize: 9, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 }, addButton: { backgroundColor: C.green, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, height: 50, gap: 8 }, addButtonPlus: { color: C.white, fontSize: 19, fontWeight: '300', marginTop: -2 }, addButtonText: { color: C.white, fontWeight: '700', fontSize: 12 }, actionHint: { width: 75 }, actionHintTop: { color: C.muted, fontSize: 10 }, actionHintBottom: { color: C.ink, fontSize: 10, fontWeight: '700', marginTop: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, marginBottom: 11 }, sectionTitle: { color: C.ink, fontWeight: '800', fontSize: 17, letterSpacing: -0.4 }, sectionSub: { color: C.muted, fontSize: 10, marginTop: 3 }, seeAll: { color: C.green, fontWeight: '700', fontSize: 10, marginBottom: 2 }, seeArrow: { fontSize: 14 }, listCard: { borderRadius: 17, backgroundColor: C.white, paddingHorizontal: 14, borderWidth: 1, borderColor: '#EDF0EC' }, transactionRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F2F0', gap: 10 }, transactionIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, incomeIcon: { backgroundColor: C.mint }, expenseIcon: { backgroundColor: C.redPale }, transactionIconText: { fontSize: 17, fontWeight: '700' }, transactionInfo: { flex: 1 }, transactionTitle: { color: C.ink, fontSize: 12, fontWeight: '700' }, transactionDate: { color: '#9AA49D', fontSize: 9, marginTop: 4 }, transactionAmount: { fontWeight: '700', fontSize: 11 },
  quoteCard: { marginTop: 14, backgroundColor: '#EAF1E9', borderRadius: 16, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 13 }, quoteMark: { color: '#95AE98', fontSize: 23, height: 17, fontWeight: '800' }, quoteText: { color: '#365143', fontSize: 11, fontWeight: '600', marginTop: 2 }, quoteBy: { color: '#819789', fontSize: 7, letterSpacing: 1.5, fontWeight: '800', marginTop: 7 },
  bottomNav: { height: 63, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopColor: C.line, borderTopWidth: 1, paddingHorizontal: 5 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }, navIcon: { color: '#9AA59E', fontSize: 19, height: 22 }, navIconActive: { color: C.green }, navLabel: { color: '#9AA59E', fontSize: 8, fontWeight: '600' }, navLabelActive: { color: C.green, fontWeight: '800' }, navAdd: { width: 43, height: 43, borderRadius: 15, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: -20, borderWidth: 4, borderColor: C.paper }, navAddIcon: { color: C.white, fontSize: 22, marginTop: -2 },
  statementTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 16 }, statementTitle: { color: C.ink, fontSize: 29, fontWeight: '800', letterSpacing: -0.9, marginTop: 3 }, smallAdd: { backgroundColor: C.mint, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9 }, smallAddText: { color: C.green, fontWeight: '700', fontSize: 11 }, statementBalance: { backgroundColor: C.dark, borderRadius: 18, padding: 18, marginBottom: 14 }, statementBalanceValue: { color: C.white, fontWeight: '800', fontSize: 24, marginTop: 7 }, filterRow: { flexDirection: 'row', gap: 8, marginBottom: 13 }, filterChip: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: C.white, borderWidth: 1, borderColor: C.line }, filterChipActive: { backgroundColor: C.green, borderColor: C.green }, filterText: { color: C.muted, fontSize: 10, fontWeight: '700' }, filterTextActive: { color: C.white }, statementCount: { color: C.muted, fontSize: 10, marginBottom: 9 },
  emptyState: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 28 }, emptyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center' }, emptyIconText: { color: C.green, fontSize: 21, fontWeight: '700' }, emptyTitle: { color: C.ink, fontSize: 14, fontWeight: '800', marginTop: 11 }, emptyText: { color: C.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 5 }, emptyLink: { color: C.green, fontSize: 10, fontWeight: '800', marginTop: 11 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(11,27,20,.47)', justifyContent: 'flex-end' }, modalKeyboard: { width: '100%' }, modalSheet: { backgroundColor: C.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 22, paddingTop: 11, paddingBottom: Platform.OS === 'ios' ? 35 : 22 }, modalHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#DDE4DE', alignSelf: 'center', marginBottom: 19 }, modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, modalTitle: { color: C.ink, fontSize: 21, fontWeight: '800', marginTop: 4 }, closeButton: { height: 31, width: 31, backgroundColor: C.paper, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, closeText: { color: C.muted, fontSize: 22, marginTop: -3 }, typeSwitch: { flexDirection: 'row', gap: 9, marginBottom: 18 }, typeOption: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: C.paper }, typeOptionText: { color: C.muted, fontSize: 12, fontWeight: '700' }, typeExpenseActive: { backgroundColor: C.redPale }, typeExpenseText: { color: C.red }, typeIncomeActive: { backgroundColor: C.mint }, typeIncomeText: { color: C.green },
  loadingScreen: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 13 }, loadingText: { color: C.muted, fontSize: 12 },
});


