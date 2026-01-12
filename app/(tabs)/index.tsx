import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ColorValue,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  getAllSupplies,
  getSupplyById,
  createSupply,
  updateSupplyById,
  deleteSupplyById,
  markReplacedNowById,
  updateNotificationId,
  type SupplyRow,
} from '../../lib/db';
import { nextDueDate } from '../../lib/notifications';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MenuSheet from './Reminders/MenuSheet';
import BackgroundStars from './Reminders/BackgroundStars';
import type { DateTriggerInput } from 'expo-notifications';
import { BlurView } from 'expo-blur';

const INTERVALS = [
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

  // Sheets / modals
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  // Add/Edit modal state
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showTime, setShowTime] = useState(false);

  // selection
  const [selectedItem, setSelectedItem] = useState<SupplyRow | null>(null);

  // small util to sequence UI safely
  const afterCloseRef = useRef<number | null>(null);
  const runNextFrame = (fn: () => void) => {
    if (afterCloseRef.current != null) cancelAnimationFrame(afterCloseRef.current);
    afterCloseRef.current = requestAnimationFrame(fn);
  };

  // Translucent list cards so stars shine through
  const cardBg = scheme === 'dark' ? 'rgba(9, 19, 42, 0.72)' : '#eeeee4';
  const selectedBg = scheme === 'dark' ? 'rgba(19, 40, 75, 0.78)' : '#c9d6e6';

  // Opaque "sheet" background (match your Menu background vibe)
  const sheetBg = scheme === 'dark' ? '#1a2233' : '#f0f0f0';

  // first value is dark, second is light
  const headerFg = scheme === 'dark' ? '#fff' : '#0b1a30';
  const fg = scheme === 'dark' ? '#fff' : '#000';
  const sub = scheme === 'dark' ? '#ccc' : '#555';
  const border = scheme === 'dark' ? 'rgba(255,255,255,0.18)' : '#ccc';
  const replaceBtnBg = scheme === 'dark' ? '#31394d' : '#7687a0';


  const gradientColors: readonly [ColorValue, ColorValue, ...ColorValue[]] =
  scheme === 'dark'
    ? ['#000208', '#19233c', '#000208']
    : ['#4f586b', '#8aa8c1', '#002646'];

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllSupplies();
      setRows(data);
    } catch (e) {
      console.error('Failed to load supplies:', e);
      Alert.alert('Load error', 'Could not load reminders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmtTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  /** ---------- Notification helpers (12h “nag” chain) ---------- */
  const NAG_COUNT = 10; // 5 days of 12h nags
  const MS_12H = 12 * 60 * 60 * 1000;

  const parseIds = (raw?: string | null) =>
    (raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : []) as string[];

  const cancelAllByRaw = async (raw?: string | null) => {
    const ids = parseIds(raw);
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  };

  // Ensure we never schedule in the past (Expo behavior can be odd otherwise)
  const ensureFuture = (d: Date) => {
    const now = Date.now();
    const t = d.getTime();
    if (t <= now) return new Date(now + 5000); // 5s in the future
    return d;
  };

  const scheduleOneShotAt = async (title: string, body: string, when: Date) => {
    const trigger: DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: ensureFuture(when),
    };

    return Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger,
    });
  };

  const scheduleDueWithNags = async (supplyId: number, label: string, due: Date) => {
    const title = `Replace ${label}`;
    const body = `Time to replace your ${label}.`;

    const ids: string[] = [];
    const dueSafe = ensureFuture(due);

    ids.push(await scheduleOneShotAt(title, body, dueSafe));

    for (let k = 1; k <= NAG_COUNT; k++) {
      const t = new Date(dueSafe.getTime() + k * MS_12H);
      ids.push(await scheduleOneShotAt(title, body, t));
    }

    await updateNotificationId(supplyId, ids.join(','));
    return ids;
  };

  /** ---------- Add/Edit flows ---------- */
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

  // Safe openers that always close any sheet before opening the modal
  const openAddSafely = () => {
    setMenuVisible(false);
    setActionsVisible(false);
    runNextFrame(startAdd);
  };

  const openEditSafely = (item: SupplyRow) => {
    setMenuVisible(false);
    setActionsVisible(false);
    runNextFrame(() => startEdit(item));
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

      if (existing?.notificationId) {
        await cancelAllByRaw(existing.notificationId);
        await updateNotificationId(draft.id, null);
      }

      await updateSupplyById(draft.id, {
        label,
        intervalDays: draft.intervalDays,
        notifyHour: hour,
        notifyMinute: minute,
      });

      const updated = await getSupplyById(draft.id);
      if (updated) {
        const due = nextDueDate(
          updated.lastReplaced,
          updated.intervalDays,
          updated.notifyHour,
          updated.notifyMinute
        );
        await scheduleDueWithNags(updated.id, updated.label, due);
      }

      setSelectedItem(null);
      setActionsVisible(false);
    } else {
      const created = await createSupply(label, draft.intervalDays, hour, minute);
      const due = nextDueDate(
        created.lastReplaced,
        created.intervalDays,
        created.notifyHour,
        created.notifyMinute
      );
      await scheduleDueWithNags(created.id, created.label, due);
    }

    setOpen(false);
    setDraft(null);
    setShowTime(false);
    await load();
  };

  /** ---------- Delete flow ---------- */
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
            if (fresh?.notificationId) await cancelAllByRaw(fresh.notificationId);
            await deleteSupplyById(row.id);
            if (selectedItem?.id === row.id) setSelectedItem(null);
            setActionsVisible(false);
            await load();
          },
        },
      ],
      { cancelable: true }
    );
  };

  /** ---------- Replace flow (confirm + act) ---------- */
  const actuallyReplace = async (r: SupplyRow) => {
    const current = await getSupplyById(r.id);
    if (current?.notificationId) {
      await cancelAllByRaw(current.notificationId);
      await updateNotificationId(r.id, null);
    }

    await markReplacedNowById(r.id);

    // Compute due using the same helper UI uses
    const due = nextDueDate(
      new Date().toISOString(),
      r.intervalDays,
      r.notifyHour,
      r.notifyMinute
    );

    await scheduleDueWithNags(r.id, r.label, due);
    await load();
  };

  const confirmReplace = (r: SupplyRow) => {
    Alert.alert(
      'Confirm Replace',
      `Did you replace “${r.label}”?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => actuallyReplace(r) },
      ],
      { cancelable: true }
    );
  };

  /** ---------- Card render ---------- */
  const renderItem = ({ item }: { item: SupplyRow }) => {
    const isSelected = selectedItem?.id === item.id;

    const toggleSelect = () => {
      setSelectedItem(prev => {
        if (prev?.id === item.id) {
          setActionsVisible(false);
          return null;
        } else {
          setActionsVisible(true);
          return item;
        }
      });
    };

    const last = item.lastReplaced ? new Date(item.lastReplaced) : null;

    // ✅ Unified due logic: use nextDueDate everywhere
    const due = nextDueDate(
      item.lastReplaced,
      item.intervalDays,
      item.notifyHour,
      item.notifyMinute
    );

    const now = Date.now();
    const msDay = 24 * 60 * 60 * 1000;
    const diffMs = due.getTime() - now;

    // ✅ Fix negative rounding so "overdue by minutes" doesn't become -1 day
    const diffDays = diffMs >= 0 ? Math.floor(diffMs / msDay) : Math.ceil(diffMs / msDay);
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
      statusText = `EXPIRED: ${absDays} day${absDays === 1 ? '' : 's'}`;
      statusColor = '#d9534f';
      isBold = true;
    }

    return (
      <Pressable onPress={toggleSelect}>
        <View style={isSelected ? styles.glowWrap : undefined}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isSelected ? selectedBg : cardBg,
                borderColor: border,
              },
            ]}
          >
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: fg }]}>{item.label}</Text>

                <Text style={{ color: sub }}>
                  <Text style={styles.metaLabel}>Interval: </Text>
                  <Text style={styles.metaValue}>{item.intervalDays} days</Text>
                </Text>

                <Text style={{ color: sub }}>
                  <Text style={styles.metaLabel}>Next: </Text>
                  <Text style={styles.metaValue}>
                    {due.toLocaleDateString()} {fmtTime(item.notifyHour, item.notifyMinute)}
                  </Text>
                </Text>

                <Text style={{ color: sub }}>
                  <Text style={styles.metaLabel}>Last replaced: </Text>
                  <Text style={styles.metaValue}>{last ? last.toLocaleDateString() : 'N/A'}</Text>
                </Text>

                <Text style={{ color: statusColor, fontWeight: isBold ? '700' : '400' }}>
                  {statusText}
                </Text>
              </View>

              <View style={styles.rightCol}>
                <Pressable style={[styles.btn, { backgroundColor: replaceBtnBg }]} onPress={() => confirmReplace(item)}>
                  <Ionicons name="refresh" size={30} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>

          {isSelected && Platform.OS === 'android' && (
            <View pointerEvents="none" style={styles.glowRing} />
          )}
        </View>
      </Pressable>
    );
  };

  /** About content */
  const renderAboutContent = () => (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: scheme === 'dark' ? '#fff' : '#000' }}>
        CPAPi (Beta)
      </Text>
      <Text style={{ color: scheme === 'dark' ? '#ccc' : '#555', lineHeight: 22 }}>
        A lightweight reminder app to keep CPAP supplies on schedule.
      </Text>
      <View style={{ gap: 6 }}>
        <Text style={{ color: scheme === 'dark' ? '#ccc' : '#555' }}>• Intervals: weekly to 6 months</Text>
        <Text style={{ color: scheme === 'dark' ? '#ccc' : '#555' }}>• 12-hour follow-up notifications</Text>
        <Text style={{ color: scheme === 'dark' ? '#ccc' : '#555' }}>• One-tap replace confirmations</Text>
      </View>
      <Text style={{ color: scheme === 'dark' ? '#ccc' : '#555' }}>
        Thanks for testing the beta. Your feedback shapes the next build.
      </Text>
    </View>
  );

  return (
    <>
      <LinearGradient colors={gradientColors} style={styles.container}>
        <BackgroundStars visible={scheme === 'dark'} seed={42} />

        <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
          <View pointerEvents="none" style={styles.headerBackdrop}>
            <BlurView
              intensity={35}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />

            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor:
                    scheme === 'dark'
                      ? 'rgba(0, 2, 8, 0.35)'
                      : 'rgba(255,255,255,0.18)',
                },
              ]}
            />

            {/* ✅ Now defined in StyleSheet */}
            <View style={styles.headerDivider} />
          </View>

          <View style={styles.headerRow}>
            <View style={styles.side}>
              <Ionicons
                name="menu"
                size={28}
                color={headerFg}
                onPress={() => setMenuVisible(true)}
              />
            </View>

            <Text style={[styles.title, { color: headerFg }]}>CPAPi</Text>

            <View style={styles.side} />
          </View>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(it) => String(it.id)}
          refreshing={loading}
          onRefresh={load}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={false}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={{ color: sub, textAlign: 'center', marginTop: 40 }}>
              No reminders yet. Tap the menu to add one.
            </Text>
          }
        />
      </LinearGradient>

      <MenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onAdd={() => openAddSafely()}
        onAbout={() => {
          setMenuVisible(false);
          runNextFrame(() => setAboutVisible(true));
        }}
      />

      <Modal
        visible={actionsVisible && !!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setActionsVisible(false);
          setSelectedItem(null);
        }}
      >
        <View style={actionsStyles.overlay}>
          <Pressable
            style={actionsStyles.overlayTop}
            onPress={() => {
              setActionsVisible(false);
              setSelectedItem(null);
            }}
          />
          <View
            style={[
              actionsStyles.sheet,
              { backgroundColor: scheme === 'dark' ? '#1a2233' : '#f0f0f0' },
            ]}
          >
            <Text
              style={[
                actionsStyles.sheetTitle,
                { color: scheme === 'dark' ? '#fff' : '#000' },
              ]}
            >
              {selectedItem ? selectedItem.label : 'Selected'}
            </Text>

            <Pressable
              style={actionsStyles.option}
              onPress={() => selectedItem && openEditSafely(selectedItem)}
            >
              <Ionicons
                name="build-outline"
                size={22}
                color={scheme === 'dark' ? '#fff' : '#000'}
              />
              <Text
                style={[
                  actionsStyles.optionText,
                  { color: scheme === 'dark' ? '#fff' : '#000' },
                ]}
              >
                Edit Reminder
              </Text>
            </Pressable>

            <Pressable
              style={actionsStyles.option}
              onPress={() => selectedItem && confirmDelete(selectedItem)}
            >
              <Ionicons name="trash-outline" size={22} color="#d9534f" />
              <Text style={[actionsStyles.optionText, { color: '#d9534f' }]}>
                Delete Reminder
              </Text>
            </Pressable>

            <Pressable
              style={actionsStyles.cancelBtn}
              onPress={() => {
                setActionsVisible(false);
                setSelectedItem(null);
              }}
            >
              <Text
                style={[
                  actionsStyles.cancelText,
                  { color: scheme === 'dark' ? '#ccc' : '#555' },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={open} animationType="slide" transparent onRequestClose={cancelDraft}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
        >
          <View style={[styles.modalCard, { backgroundColor: sheetBg }]}>
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
                onChangeText={(t) => setDraft(d => (d ? { ...d, label: t } : d))}
                onSubmitEditing={saveDraft}
                returnKeyType="done"
                style={[styles.input, { color: fg, borderColor: border }]}
              />

              <Text style={[styles.label, { color: sub }]}>Interval</Text>
              <View style={[styles.pickerWrap, { borderColor: border }]}>
                <Picker
                  selectedValue={draft?.intervalDays ?? 7}
                  onValueChange={(v) =>
                    setDraft(d => (d ? { ...d, intervalDays: Number(v) } : d))
                  }
                >
                  {INTERVALS.map(opt => (
                    <Picker.Item key={opt.days} label={opt.label} value={opt.days} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.label, { color: sub }]}>Notification Time</Text>
              <Pressable
                style={[styles.timeBtn, { borderColor: border }]}
                onPress={() => setShowTime(true)}
              >
                <Text style={{ color: fg }}>
                  {draft
                    ? `${String(draft.time.getHours()).padStart(2, '0')}:${String(
                        draft.time.getMinutes()
                      ).padStart(2, '0')}`
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
                      if (date) setDraft(d => (d ? { ...d, time: date } : d));
                    }}
                    display="spinner"
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={aboutStyles.overlay}>
          <Pressable style={aboutStyles.backdrop} onPress={() => setAboutVisible(false)} />
          <View
            style={[
              aboutStyles.card,
              {
                backgroundColor: sheetBg,
                borderColor: scheme === 'dark' ? '#2b3a54' : '#e4e4e4',
                // backgroundColor: scheme === 'dark' ? '#0f1a2a' : '#ffffff',
                // borderColor: scheme === 'dark' ? '#2b3a54' : '#e4e4e4',
              },
            ]}
          >
            <View style={aboutStyles.header}>
              <Text style={[aboutStyles.title, { color: scheme === 'dark' ? '#fff' : '#000' }]}>
                About CPAPi
              </Text>
              <Pressable onPress={() => setAboutVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={scheme === 'dark' ? '#fff' : '#000'} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={aboutStyles.content}>{renderAboutContent()}</ScrollView>

            <Pressable style={aboutStyles.closeBtn} onPress={() => setAboutVisible(false)}>
              <Text style={aboutStyles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerWrap: {
    position: 'relative',
    zIndex: 10,
  },

  headerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },

  // ✅ Added back so styles.headerDivider is valid
  headerDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },

  headerRow: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 12,
  },

  side: { flex: 1, alignItems: 'flex-start', justifyContent: 'center' },
  title: { flex: 2, fontSize: 24, fontWeight: '700', textAlign: 'center' },

  metaLabel: { fontWeight: '600' },
  metaValue: { fontWeight: '400' },

  // ✅ Added subtle border so translucent cards still read well
  card: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },

  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  rightCol: { alignItems: 'flex-end', justifyContent: 'flex-end' },

  list: { overflow: 'visible', zIndex: 0 },
  listContent: { paddingBottom: 24, paddingTop: 8, overflow: 'visible' },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  glowWrap: {
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 5,
      },
      android: {},
    }),
  },

  glowRing: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    left: -4,
    right: -4,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
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
  timeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  iosTimeWrap: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  iosToolbar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
});

const actionsStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayTop: { flex: 1 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  optionText: { fontSize: 16 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 15 },
});

const aboutStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  card: {
    width: '88%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  content: { paddingVertical: 4 },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#7687a0',
  },
  closeText: { color: '#fff', fontWeight: '700' },
});
