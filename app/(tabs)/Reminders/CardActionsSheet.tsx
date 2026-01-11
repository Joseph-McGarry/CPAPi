import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function CardActionsSheet({ visible, onClose, onEdit, onDelete }: Props) {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#1a2233' : '#f0f0f0';
  const fg = scheme === 'dark' ? '#fff' : '#000';
  const danger = '#d9534f';
  const sub = scheme === 'dark' ? '#ccc' : '#555';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: bg }]}>
          <Text style={[styles.title, { color: fg }]}>Selected reminder</Text>

          <Pressable style={styles.option} onPress={onEdit} accessibilityLabel="Edit reminder">
            <MaterialIcons name="edit" size={22} color={fg} />
            <Text style={[styles.optionText, { color: fg }]}>Edit</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onDelete} accessibilityLabel="Delete reminder">
            <Ionicons name="trash-outline" size={22} color={danger} />
            <Text style={[styles.optionText, { color: danger }]}>Delete</Text>
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
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  optionText: { fontSize: 16 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 15 },
});
