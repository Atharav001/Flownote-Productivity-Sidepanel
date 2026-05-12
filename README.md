# Flownote - Brave Sidepanel Productivity Extension

<div align="center">
  <img src="icon.png" alt="Flownote Logo" width="100"/>
  <h3>Your Ultimate Sidepanel Companion</h3>
</div>

Flownote is a premium, beautifully crafted sidepanel productivity extension designed specifically for Chromium-based browsers (Brave, Chrome, Edge). It acts as a continuous, distraction-free workspace that persists alongside your browsing experience. 

Built with modern web technologies, Flownote utilizes a stunning glassmorphism design system, smooth Framer Motion animations, and strict privacy-focused local storage to keep your thoughts organized.

---

## 📸 Screenshots

*(Replace the placeholder URLs below with your actual screenshots after pushing the repository)*

| Sidebar View | Full Notes Editor | Sticky Notes |
|:---:|:---:|:---:|
| <img src="https://via.placeholder.com/250x400.png?text=Sidebar+Screenshot+Here" width="250" /> | <img src="https://via.placeholder.com/250x400.png?text=Full+Notes+Screenshot" width="250" /> | <img src="https://via.placeholder.com/250x400.png?text=Sticky+Notes+Screenshot" width="250" /> |

---

## 🛠️ System Architecture (How It Is Made)

If you are a developer looking to understand how modern Chromium extensions are built, Flownote serves as a perfect boilerplate. 

### **The Technology Stack**
- **React 19:** Powers the user interface, enabling component-driven design and complex state management across tabs (Todos, Sticky Notes, Editor).
- **Vite 6:** The lightning-fast build tool used to bundle the React application into the static `HTML/JS/CSS` files required by the browser extension engine.
- **Tailwind CSS 4:** Used extensively for rapid UI development. We utilize advanced Tailwind features to achieve the frosted glass (glassmorphism) look, vibrant neon gradients, and responsive layouts.
- **Framer Motion:** Handles all the silky-smooth layout transitions, hover states, and exit/entry animations.
- **Chrome Extensions API (Manifest V3):** The core engine. It utilizes the `chrome.sidePanel` API to render the React app in the browser sidebar, and `chrome.storage.local` to persist data.

### **How the Code Works**
1. **Manifest File (`manifest.json`):** This is the blueprint. It tells the browser what permissions the extension needs (`sidePanel`, `storage`) and where the entry HTML file is located (`index.html`).
2. **State Persistence:** Inside `App.jsx`, a custom React Hook (`useChromeStorage`) is used. Every time a user types a note or checks a task, this hook automatically bridges React's state with the browser's hidden `chrome.storage.local` database. This ensures zero data loss even if the browser crashes.
3. **The View Layer:** The app is a Single Page Application (SPA). The main `App.jsx` router switches between `<TodosView>`, `<NotesView>`, and `<RichEditorView>` instantly without page reloads, relying on Framer Motion to animate the transitions between these states.

---

## 🌐 Supported Browsers

Flownote leverages the modern **Manifest V3** architecture and the `chrome.sidePanel` API. It is natively compatible with all modern Chromium-based browsers:
- **Brave Browser** (Highly Recommended)
- **Google Chrome**
- **Microsoft Edge**
- **Opera / Vivaldi**

---

## 🚀 Setup & Installation Guide

To run Flownote locally on your machine, follow these steps:

### 1. Build the Extension
Because Flownote uses React, the source code must be compiled into standard web files.

```bash
# Install all required dependencies
npm install

# Compile the project into the /dist directory
npm run build
```
*Note: A `/dist` folder will be generated. This folder contains the final code the browser will execute.*

### 2. Load into Your Browser
The process is nearly identical across all supported Chromium browsers:

1. Open a new tab and navigate to your browser's extension management page:
   - **Brave:** `brave://extensions/`
   - **Chrome:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
   - **Opera:** `opera://extensions/`
2. In the top right corner (or bottom left for Edge), toggle the **Developer mode** switch to ON.
3. Click the **Load unpacked** button (usually in the top left).
4. Navigate to your downloaded project folder and select the newly generated `/dist` directory.
5. The Flownote extension will appear in your list! Click the Flownote icon in your top toolbar to open the side panel.

### 3. Setting Up Shortcuts (Optional)
Browser security prevents extensions from automatically hijacking your keyboard shortcuts. To set one up manually:
1. Go to `brave://extensions/shortcuts`
2. Scroll down to Flownote.
3. Click the pencil icon next to "Open Flownote" and type your preferred shortcut (e.g., `Cmd+Shift+X` or `Ctrl+Shift+X`).

---

## ✨ Features & Usage

* **To-Do Management:** Automatically split into **Inbox**, **Today**, and **Upcoming**. 
  - *Click* any task to mark it complete. 
  - *Double-click* the text to instantly edit it inline.
* **Custom Color Themes:** Click the color dot next to any category or sticky note to pop open a vibrant color palette.
* **Full Screen Sticky Notes:** Click on any sticky note card to open it in a beautiful, distraction-free fullscreen editor.
* **Rich Text Editing:** Use the third tab to create long-form notes. You can bold, italicize, create lists, and even press `Cmd+V` to paste an image directly from your clipboard!
* **Universal Search:** Instantly filter across all your tasks and notes simultaneously using the top search bar.

---
**Tags:** `#Productivity` `#React19` `#Vite` `#TailwindCSS` `#ChromeExtension` `#ManifestV3` `#Glassmorphism` `#ProfessionalTools`
