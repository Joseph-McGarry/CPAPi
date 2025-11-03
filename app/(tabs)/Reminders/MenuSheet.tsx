// import React from 'react';
// import { Modal, View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
// import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// type MenuSheetProps = {
//   visible: boolean;
//   onClose: () => void;
//   onAdd: () => void;
//   onEdit?: () => void;
//   onDelete?: () => void;
// };

// export default function MenuSheet({ visible, onClose, onAdd, onEdit, onDelete }: MenuSheetProps) {
//   const scheme = useColorScheme();
//   const bg = scheme === 'dark' ? '#1a2233' : '#f0f0f0';
//   const fg = scheme === 'dark' ? '#fff' : '#000';
//   const sub = scheme === 'dark' ? '#ccc' : '#555';

//   return (
//     <Modal
//       animationType="slide"
//       transparent
//       visible={visible}
//       onRequestClose={onClose}
//     >
//       <Pressable style={styles.overlay} onPress={onClose}>
//         <View style={[styles.sheet, { backgroundColor: bg }]}>
//           <Text style={[styles.title, { color: fg }]}>Menu</Text>

//           <Pressable style={styles.option} onPress={onAdd}>
//             <Ionicons name="add-circle-outline" size={22} color={fg} />
//             <Text style={[styles.optionText, { color: fg }]}>Add Reminder</Text>
//           </Pressable>

//           {onEdit && (
//             <Pressable style={styles.option} onPress={onEdit}>
//               <MaterialIcons name="edit" size={22} color={fg} />
//               <Text style={[styles.optionText, { color: fg }]}>Edit Reminder</Text>
//             </Pressable>
//           )}

//           {onDelete && (
//             <Pressable style={styles.option} onPress={onDelete}>
//               <Ionicons name="trash-outline" size={22} color="#d9534f" />
//               <Text style={[styles.optionText, { color: '#d9534f' }]}>Delete Reminder</Text>
//             </Pressable>
//           )}

//           <Pressable onPress={onClose} style={styles.cancelBtn}>
//             <Text style={[styles.cancelText, { color: sub }]}>Cancel</Text>
//           </Pressable>
//         </View>
//       </Pressable>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     backgroundColor: 'rgba(0,0,0,0.4)',
//   },
//   sheet: {
//     borderTopLeftRadius: 16,
//     borderTopRightRadius: 16,
//     padding: 20,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: '700',
//     marginBottom: 10,
//   },
//   option: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     gap: 12,
//   },
//   optionText: {
//     fontSize: 16,
//   },
//   cancelBtn: {
//     marginTop: 10,
//     alignItems: 'center',
//     paddingVertical: 10,
//   },
//   cancelText: {
//     fontSize: 15,
//   },
// });


import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit?: () => void;   // present only if a card is selected
  onDelete?: () => void; // present only if a card is selected
};

export default function MenuSheet({ visible, onClose, onAdd, onEdit, onDelete }: Props) {
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

          {onEdit && (
            <Pressable style={styles.option} onPress={onEdit}>
              <MaterialIcons name="edit" size={22} color={fg} />
              <Text style={[styles.optionText, { color: fg }]}>Edit Reminder</Text>
            </Pressable>
          )}

          {onDelete && (
            <Pressable style={styles.option} onPress={onDelete}>
              <Ionicons name="trash-outline" size={22} color="#d9534f" />
              <Text style={[styles.optionText, { color: '#d9534f' }]}>Delete Reminder</Text>
            </Pressable>
          )}

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
  overlayTop: { flex: 1 }, // important: captures taps outside the sheet
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  optionText: { fontSize: 16 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 15 },
});
