import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, useColorScheme, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  onAbout: () => void;
};

const SURVEY_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfkRZMNzNRLjtLiZD6D56pXnp13e8uByYI3ZwWpSuBROXymKw/viewform?usp=header';

const openSurveyExternal = async () => {
  try {
    const supported = await Linking.canOpenURL(SURVEY_URL);
    if (supported) await Linking.openURL(SURVEY_URL);
  } catch {}
};

export default function MenuSheet({ visible, onClose, onAdd, onAbout }: Props) {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#1a2233' : '#f0f0f0';
  const fg = scheme === 'dark' ? '#fff' : '#000';
  const sub = scheme === 'dark' ? '#ccc' : '#555';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap outside to close */}
        <Pressable style={styles.overlayTop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <Text style={[styles.sheetTitle, { color: fg }]}>Menu</Text>

          <Pressable style={styles.option} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={22} color={fg} />
            <Text style={[styles.optionText, { color: fg }]}>Add Reminder</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={openSurveyExternal}>
            <Ionicons name="open-outline" size={22} color={fg} />
            <Text style={[styles.optionText, { color: fg }]}>Beta Survey</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onAbout}>
            <Ionicons name="information-circle-outline" size={22} color={fg} />
            <Text style={[styles.optionText, { color: fg }]}>About</Text>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: sub }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  overlayTop: { flex: 1 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  optionText: { fontSize: 16 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 15 },
});
