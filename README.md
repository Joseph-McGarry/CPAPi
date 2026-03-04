# CPAPi

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK%2052-000.svg?style=flat&logo=expo" />
  <img src="https://img.shields.io/badge/React%20Native-0.74-61dafb.svg?style=flat&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6.svg?style=flat&logo=typescript" />
  <img src="https://img.shields.io/badge/SQLite-local%20storage-003b57.svg?style=flat&logo=sqlite" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

### 🫁 CPAP Supply Reminder App

**CPAPi** helps users track and replace their CPAP supplies on time.  
Supplies include **Mask, Nose Cushion, Hose, Water Supply, and Filter**.

- ✅ Add, edit, and delete reminders  
- ✅ Reset reminders when equipment is replaced  
- ✅ Scheduled **local notifications** at a chosen bedtime  
- ✅ Automatic defaults on first launch  
- 🕓 Roadmap: Snooze overdue reminders, backup/export, theming  

---

## 📸 Screenshots

<p align="center">
  <img src="docs/screenshots/home.png" alt="Reminders Screen" width="250" />
  <img src="docs/screenshots/details.png" alt="Settings Screen" width="250" />
  <img src="docs/screenshots/add.png" alt="Notification Example" width="250" />
  <img src="docs/screenshots/dark.png" alt="Notification Example" width="250" />
</p>

---

## 🚀 Getting Started

### 1. Clone and Install
```bash
git clone https://github.com/Joseph-McGarry/cpapi.git
cd cpapi
npm install
```

### 2. Run with Expo
```bash
npx expo start
```

Press `i` → iOS Simulator  
Press `a` → Android Emulator  
Or scan the QR code in Expo Go  

---

## 📂 Project Structure
```
app/                # Screens and navigation
  (tabs)/           # Reminders + Settings
  _layout.tsx       # Root layout
lib/                # Local database + notifications
  db.ts             # SQLite helpers
  notifications.ts  # Notification scheduling
```

---

## 🗄️ Database

**Powered by Expo SQLite**  

**Table: supplies**  

**Columns:**  
- id (PK)  
- skey (stable key)  
- label (display name)  
- intervalDays (when to replace)  
- lastReplaced (date)  
- notifyHour + notifyMinute (bedtime notifications)  
- notificationId (tracks scheduled reminder)  
- snoozedUntil (future feature)  

Auto-seeds defaults on first run  

---

## 🔔 Notifications

Uses **expo-notifications**  
- Scheduled local notifications only (no remote push yet)  
- Notifications are canceled + re-scheduled automatically when:  
  - A reminder is edited  
  - A supply is replaced  
  - A reminder is deleted  

⚠️ Note: Expo Go has limitations — use a development build for full notification support.  

---

## 🛠️ Scripts
```bash
npm start       # Start Expo bundler
npm run ios     # Run on iOS simulator
npm run android # Run on Android emulator
npm run web     # Run in web (limited support)
```

---

## 📝 Roadmap

- Add / Edit / Delete reminders  
- Local notifications at custom times  
- Confirm before deleting  
- Snooze overdue reminders by +1 day  
- Light/Dark mode toggle  
- Export/Import backup of reminders  

---

## 🤝 Contributing

PRs and issues welcome! Please fork the repo and open a pull request with clear commit history.  
For major changes, open an issue first to discuss what you’d like to change.  

---

## ⚖️ License

MIT License © 2025 Joseph McGarry
