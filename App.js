import React, { useState, useEffect, useCallback } from 'react';
import { 
  Text, View, StyleSheet, TextInput, ScrollView, 
  SafeAreaView, TouchableOpacity, Share, Alert, Modal, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [mode, setMode] = useState('Electricity');
  const [date] = useState(new Date().toLocaleDateString());
  const [prevSub, setPrevSub] = useState('');
  const [currSub, setCurrSub] = useState('');
  const [majorCons, setMajorCons] = useState('');
  const [majorBill, setMajorBill] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const unit = mode === 'Electricity' ? 'units' : 'm³';
  const themeColor = mode === 'Electricity' ? '#FFD700' : '#007bff';
  const storageKeyPrev = mode === 'Electricity' ? 'elec_prev' : 'water_prev';
  const storageKeyHist = mode === 'Electricity' ? 'elec_hist' : 'water_hist';

  const loadData = useCallback(async () => {
    try {
      const savedPrev = await AsyncStorage.getItem(storageKeyPrev);
      const savedHistory = await AsyncStorage.getItem(storageKeyHist);
      setPrevSub(savedPrev || '0');
      setHistory(savedHistory ? JSON.parse(savedHistory) : []);
    } catch (e) { console.log("Storage load error"); }
  }, [storageKeyPrev, storageKeyHist]);

  useEffect(() => { loadData(); }, [loadData]);

  const subCons = (parseFloat(currSub) || 0) - (parseFloat(prevSub) || 0);
  const isError = parseFloat(currSub) < parseFloat(prevSub) && currSub !== '';
  const subBill = (majorCons > 0 && !isError) ? (subCons / parseFloat(majorCons)) * parseFloat(majorBill) : 0;

  const saveData = async () => {
    if (!currSub || isError) return Alert.alert("Error", "Check your readings");
    const newEntry = { id: Date.now(), date, consumption: subCons.toFixed(2), bill: subBill.toFixed(2) };
    try {
      let updatedHistory = [newEntry, ...history].slice(0, 12);
      await AsyncStorage.setItem(storageKeyPrev, currSub);
      await AsyncStorage.setItem(storageKeyHist, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      setPrevSub(currSub);
      setCurrSub('');
      Alert.alert("Success", `${mode} record saved.`);
    } catch (e) { Alert.alert("Error", "Save failed."); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Utility Share Pro</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, mode === 'Electricity' && {backgroundColor: '#FFD700'}]} 
          onPress={() => setMode('Electricity')}>
          <Text style={styles.tabText}>⚡ Electricity</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, mode === 'Water' && {backgroundColor: '#007bff'}]} 
          onPress={() => setMode('Water')}>
          <Text style={[styles.tabText, mode === 'Water' && {color: '#fff'}]}>💧 Water</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Reading Date: {date}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>Previous Reading ({unit})</Text>
          <Text style={styles.prevDisplay}>{prevSub}</Text>
          <Text style={styles.label}>Current Reading ({unit})</Text>
          <TextInput 
            style={[styles.input, isError && styles.inputError]} 
            keyboardType="numeric" value={currSub} onChangeText={setCurrSub}
            placeholder="0.00"
          />
          {isError && <Text style={styles.errorText}>⚠️ Must be higher than {prevSub}</Text>}
          <Text style={styles.label}>Total Major Usage ({unit})</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={majorCons} onChangeText={setMajorCons} placeholder="0.00" />
          <Text style={styles.label}>Total Major Bill Amount ($)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={majorBill} onChangeText={setMajorBill} placeholder="0.00" />
        </View>

        <View style={[styles.card, styles.finalCard, {backgroundColor: themeColor}]}>
          <Text style={[styles.finalLabel, mode === 'Water' && {color: '#eee'}]}>{mode} Sub-Bill</Text>
          <Text style={[styles.finalValue, mode === 'Water' && {color: '#fff'}]}>${!isError ? subBill.toFixed(2) : '0.00'}</Text>
        </View>

        <View style={styles.buttonGrid}>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745'}]} onPress={saveData}><Text style={styles.btnText}>💾 Save</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#17a2b8'}]} onPress={() => Share.share({message: `Utility Bill (${mode}): $${subBill.toFixed(2)}`})}><Text style={styles.btnText}>🔗 Share</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#6610f2'}]} onPress={() => setShowHistory(true)}><Text style={styles.btnText}>📜 History</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, {backgroundColor: '#6c757d'}]} onPress={() => {setCurrSub(''); setMajorCons(''); setMajorBill('');}}><Text style={styles.btnText}>Clear</Text></TouchableOpacity>
        </View>

        <Modal visible={showHistory} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{mode} History</Text>
              <ScrollView>
                {history.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={{fontWeight: 'bold'}}>{item.date}</Text>
                    <Text>{item.consumption} {unit} | ${item.bill}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowHistory(false)}><Text style={styles.btnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  headerBar: { padding: 20, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ddd' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  tabContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff' },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 10, marginHorizontal: 5, backgroundColor: '#f8f9fa' },
  tabText: { fontWeight: 'bold', color: '#444' },
  scroll: { padding: 15 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#999', marginTop: 15, textTransform: 'uppercase' },
  prevDisplay: { fontSize: 20, fontWeight: 'bold', color: '#333', paddingVertical: 5 },
  input: { borderBottomWidth: 2, borderColor: '#eee', padding: 10, fontSize: 18, color: '#000' },
  inputError: { borderColor: '#dc3545' },
  errorText: { color: '#dc3545', fontSize: 12, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  finalCard: { padding: 25, borderRadius: 15, alignItems: 'center', elevation: 5 },
  finalLabel: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  finalValue: { fontSize: 42, fontWeight: 'bold' },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  btn: { width: '48%', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  historyItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  closeBtn: { marginTop: 20, backgroundColor: '#333', padding: 15, borderRadius: 12, alignItems: 'center' }
});