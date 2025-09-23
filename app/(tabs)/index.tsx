import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, Modal, TextInput,
  useColorScheme, Platform, KeyboardAvoidingView, ScrollView, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  getAllSupplies, getSupplyById, createSupply, updateSupplyById,
  deleteSupplyById, markReplacedNowById, updateNotificationId, type SupplyRow
} from '../../lib/db';
import { nextDueDate, scheduleOneShotNotificationFor, cancelNotification } from '../../lib/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';


const INTERVALS = [
  { label: 'Expired', days: 0 },
  { label: 'Test', days: 0 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '3 weeks', days: 21 },
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
];

type Draft = {
  id?: number;
  label: string;
  intervalDays: number;
  time: Date;
};

export default function RemindersScreen() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [rows, setRows] = useState<SupplyRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showTime, setShowTime] = useState(false);

  // const bg = scheme === 'dark' ? '#111' : '#4f586b';
  const cardBg = scheme === 'dark' ? '#09132a' : '#eeeee4';
  const headerFg = scheme === 'dark' ? '#fff' : '#eeeee4';
  const fg = scheme === 'dark' ? '#fff' : '#000';
  const sub = scheme === 'dark' ? '#ccc' : '#555';
  const border = scheme === 'dark' ? '#444' : '#ccc';

  const load = async () => {
    setLoading(true);
    const data = await getAllSupplies();
    setRows(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fmtTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const startAdd = () => {
    const t = new Date();
    t.setHours(21, 0, 0, 0);
    setDraft({ label: '', intervalDays: 7, time: t });
    setShowTime(false);
    setOpen(true);
  };

  const startEdit = (r: SupplyRow) => {
    const t = new Date();
    t.setHours(r.notifyHour, r.notifyMinute, 0, 0);
    setDraft({ id: r.id, label: r.label, intervalDays: r.intervalDays, time: t });
    setShowTime(false);
    setOpen(true);
  };

  const cancelDraft = () => {
    setOpen(false);
    setDraft(null);
    setShowTime(false);
  };

  const saveDraft = async () => {
    if (!draft) return;
    const hour = draft.time.getHours();
    const minute = draft.time.getMinutes();
    const label = (draft.label || '').trim() || 'Untitled';

    if (draft.id) {
      const existing = await getSupplyById(draft.id);
      await updateSupplyById(draft.id, { label, intervalDays: draft.intervalDays, notifyHour: hour, notifyMinute: minute });
      if (existing?.notificationId) {
        await cancelNotification(existing.notificationId);
        await updateNotificationId(draft.id, null);
      }
      const updated = await getSupplyById(draft.id);
      if (updated) {
        const due = nextDueDate(updated.lastReplaced, updated.intervalDays, updated.notifyHour, updated.notifyMinute);
        const newId = await scheduleOneShotNotificationFor(`Replace ${updated.label}`, `Time to replace your ${updated.label}.`, due);
        await updateNotificationId(updated.id, newId);
      }
    } else {
      const created = await createSupply(label, draft.intervalDays, hour, minute);
      const due = nextDueDate(created.lastReplaced, created.intervalDays, created.notifyHour, created.notifyMinute);
      const newId = await scheduleOneShotNotificationFor(`Replace ${created.label}`, `Time to replace your ${created.label}.`, due);
      await updateNotificationId(created.id, newId);
    }

    setOpen(false);
    setDraft(null);
    setShowTime(false);
    await load();
  };

  const onReplaced = async (r: SupplyRow) => {
    const current = await getSupplyById(r.id);
    if (current?.notificationId) {
      await cancelNotification(current.notificationId);
      await updateNotificationId(r.id, null);
    }
    await markReplacedNowById(r.id);
    const due = nextDueDate(new Date().toISOString(), r.intervalDays, r.notifyHour, r.notifyMinute);
    const newId = await scheduleOneShotNotificationFor(`Replace ${r.label}`, `Time to replace your ${r.label}.`, due);
    await updateNotificationId(r.id, newId);
    await load();
  };

  const confirmDelete = async (row: SupplyRow) => {
    Alert.alert(
      'Delete reminder?',
      `This will remove “${row.label}”. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const fresh = await getSupplyById(row.id);
            if (fresh?.notificationId) await cancelNotification(fresh.notificationId);
            await deleteSupplyById(row.id);
            await load();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }: { item: SupplyRow }) => {
    let due = nextDueDate(
      item.lastReplaced,
      item.intervalDays,
      item.notifyHour,
      item.notifyMinute
    );

    const now = Date.now();
    const msDay = 24 * 60 * 60 * 1000;

    if (__DEV__ && item.label === 'Expired') {
      due = new Date(now - 3 * msDay);
      due.setHours(item.notifyHour, item.notifyMinute, 0, 0);
    }

    const diffMs = due.getTime() - now;
    const diffDays = Math.floor(diffMs / msDay);
    const absDays = Math.abs(diffDays);

    let statusText = '';
    let statusColor = sub;
    let isBold = false;

    if (diffDays > 0) {
      statusText = `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
      statusColor = diffDays <= 1 ? '#d9534f' : sub;
    } else if (diffDays === 0) {
      statusText = 'REPLACE TODAY';
      statusColor = '#d9534f';
      isBold = true;
    } else {
      statusText =
        absDays === 0
          ? 'EXPIRED'
          : `EXPIRED: ${absDays} day${absDays === 1 ? '' : 's'}`;
      statusColor = '#d9534f';
      isBold = true;
    }

    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.cardRow}>
          {/* LEFT COLUMN */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: fg }]}>{item.label}</Text>
            <Text style={{ color: sub }}>Interval: {item.intervalDays} days</Text>
            <Text style={{ color: sub }}>
              Next: {due.toLocaleDateString()} {fmtTime(item.notifyHour, item.notifyMinute)}
            </Text>
            <Text
              style={{
                color: statusColor,
                fontWeight: isBold ? '700' : '400',
              }}
            >
              {statusText}
            </Text>
          </View>

          {/* RIGHT COLUMN */}
          <View style={styles.rightCol}>
            <View style={styles.rowBtns}>

              <Pressable style={[styles.btn, styles.replaced]} onPress={() => onReplaced(item)}>
                <Ionicons name="refresh" size={18} color="#fff" />
              </Pressable>

              <Pressable style={[styles.btn, styles.edit]} onPress={() => startEdit(item)}>
                <MaterialIcons name="edit" size={18} color="#fff" />
              </Pressable>

              <Pressable style={[styles.btn, styles.delete]} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash" size={18} color="#fff" />
              </Pressable>

              
            </View>
          </View>
        </View>
      </View>
    );
  };
  // const bg = scheme === 'dark' ? '#111' : '#4f586b';
  return (
    <LinearGradient
      colors={
        scheme === 'dark'
          ? ['#000000', '#19233c', '#000000']   // dark mode gradient
          : ['#4f586b', '#8aa8c1', '#002646']   // light mode gradient
      }
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.side} />
        <Text style={[styles.title, { color: headerFg }]}>CPAPi beta</Text>
        <Pressable style={styles.add} onPress={startAdd}>
          <Text style={styles.addTxt}>+ Add</Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={rows}
        keyExtractor={(it) => String(it.id)}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ color: sub, textAlign: 'center', marginTop: 40 }}>
            No reminders yet. Tap “+ Add” to create one.
          </Text>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={cancelDraft}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={cancelDraft}>
                <Text style={[styles.modalHeaderBtn, { color: '#c62828' }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: fg }]}>
                {draft?.id ? 'Edit Reminder' : 'New Reminder'}
              </Text>
              <Pressable onPress={saveDraft}>
                <Text style={[styles.modalHeaderBtn, { color: '#1976d2' }]}>Save</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: sub }]}>Label</Text>
              <TextInput
                placeholder="e.g., Filter"
                placeholderTextColor="#888"
                value={draft?.label ?? ''}
                onChangeText={(t) => setDraft(d => d ? { ...d, label: t } : d)}
                onSubmitEditing={saveDraft}
                returnKeyType="done"
                style={[styles.input, { color: fg, borderColor: border }]}
              />

              <Text style={[styles.label, { color: sub }]}>Interval</Text>
              <View style={[styles.pickerWrap, { borderColor: border }]}>
                <Picker
                  selectedValue={draft?.intervalDays ?? 7}
                  onValueChange={(v) => setDraft(d => d ? { ...d, intervalDays: Number(v) } : d)}
                >
                  {INTERVALS.map(opt => (
                    <Picker.Item key={opt.days} label={opt.label} value={opt.days} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.label, { color: sub }]}>Notification Time</Text>
              <Pressable style={[styles.timeBtn, { borderColor: border }]} onPress={() => setShowTime(true)}>
                <Text style={{ color: fg }}>
                  {draft
                    ? `${String(draft.time.getHours()).padStart(2, '0')}:${String(draft.time.getMinutes()).padStart(2, '0')}`
                    : '--:--'}
                </Text>
              </Pressable>

              {showTime && draft && (
                <View style={styles.iosTimeWrap}>
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosToolbar}>
                      <Pressable onPress={() => setShowTime(false)}>
                        <Text style={{ color: '#1976d2', fontWeight: '600' }}>Done</Text>
                      </Pressable>
                    </View>
                  )}
                  <DateTimePicker
                    mode="time"
                    value={draft.time}
                    onChange={(e: DateTimePickerEvent, date?: Date) => {
                      if (Platform.OS !== 'ios') setShowTime(false);
                      if (date) setDraft(d => d ? { ...d, time: date } : d);
                    }}
                    display="spinner"
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 12,
  },
  side: { flex: 1 },
  title: {
    flex: 2,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  add: { flex: 1, alignItems: 'flex-end' },
  addTxt: {
    backgroundColor: '#7687a0',
    color: '#fff',
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },

  card: { padding: 18, borderRadius: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },

  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-end' },

  rowBtns: { flexDirection: 'row', gap: 12 },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '700' },
  replaced: { backgroundColor: '#7687a0' },
  edit: { backgroundColor: '#7687a0' },
  delete: { backgroundColor: '#7687a0' },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  modalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderBtn: { fontSize: 16, fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { paddingHorizontal: 16, paddingBottom: 24 },

  label: { fontSize: 12, marginTop: 6, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },

  pickerWrap: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  timeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },

  iosTimeWrap: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  iosToolbar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
});
