<div align="center">
  <img src="icon.png" alt="Flownote Logo" width="120" style="border-radius: 20%; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"/>
  <h1>Flownote</h1>
  <h3>Your Ultimate Sidepanel Companion</h3>
  <p><i>A premium, beautifully crafted productivity suite that persists alongside your browsing experience.</i></p>
  
  [![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
  [![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](#)
  [![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](#)
</div>

<br/>

## 📸 Interface Preview

<div align="center">
  <table width="100%">
    <tr>
      <td width="33%" align="center"><b>Smart Task Organization</b></td>
      <td width="33%" align="center"><b>Distraction-Free Sticky Notes</b></td>
      <td width="33%" align="center"><b>Rich Text Editor</b></td>
    </tr>
    <tr>
      <td align="center"><img src="https://github.com/user-attachments/assets/a0eb9686-5810-4686-a3f2-703a1d3f6ec0" 
 width="100%" style="border-radius:12px;"/></td>
      <td align="center"><img src="https://github.com/user-attachments/assets/d26e376d-9784-4d6e-b563-15b9258a065c" 
 width="100%" style="border-radius:12px;"/></td>
      <td align="center"><img src="https://github.com/user-attachments/assets/3e39168d-5d01-4ab1-b54b-3ed2cd7bdb61"
 width="100%" style="border-radius:12px;"/></td>
    </tr>
  </table>
</div>

---

## ✨ Features at a Glance

* **Smart To-Do Interactions:** Click the checkbox to toggle completion, or click directly on the text to edit it inline instantly. Press `Enter` to auto-save tasks.
* **Persistent Local State:** Powered by `chrome.storage.local`. Your notes and tasks survive browser crashes and restarts.
* **Frosted Glassmorphism Theme:** Custom vibrant neon palettes with dynamically adapting translucent layouts.
* **Immersive Note Editing:** Click any Sticky Note to expand it into a gorgeous fullscreen editing canvas.
* **Real-time Color Theming:** Dynamically customize the accent colors of your categories and notes.

---

## 🛠️ System Architecture

Flownote serves as a masterclass boilerplate for building sophisticated, React-powered Chromium sidepanel extensions.

<details>
<summary><b>View the Technical Stack</b></summary>
<br/>

- **React 19:** Orchestrates the Single Page Application (SPA), allowing seamless switching between Todos, Sticky Notes, and the Rich Editor without page reloads.
- **Framer Motion:** Handles all layout transitions, hover interactions, and entry/exit animations, providing a silky-smooth native feel.
- **Tailwind CSS 4:** Drives the glassmorphism aesthetic with custom drop shadows, CSS filters (`backdrop-blur`), and utility classes for layout structuring.
- **Custom React Hooks:** A centralized `useChromeStorage` hook acts as a bridge between React's state memory and the browser's persistent `chrome.storage.local` API.
</details>

---

## 🌐 Supported Browsers

Flownote leverages the modern **Manifest V3** architecture and the `chrome.sidePanel` API. It is natively compatible with:
- **Brave Browser** (Highly Recommended)
- **Google Chrome**
- **Microsoft Edge**
- **Opera / Vivaldi**

---

## 🚀 Setup & Installation

Get Flownote running on your machine in 3 simple steps:

### 1. Build the Source
```bash
# Install dependencies
npm install

# Compile the React app into the static /dist folder
npm run build
```

### 2. Load the Extension
Open a new tab and navigate to your browser's extension management page:
- **Brave:** `brave://extensions/`
- **Chrome:** `chrome://extensions/`
- **Edge:** `edge://extensions/`

Toggle the **Developer mode** switch ON. Click **Load unpacked** and select the `/dist` directory generated from step 1.

### 3. Quick Access (Optional)
Navigate to `brave://extensions/shortcuts` and bind a keyboard shortcut (e.g., `Cmd+Shift+X`) to instantly toggle your Flownote sidepanel!

---
<div align="center">
  <i>Designed for deep focus.</i><br/>
  <b>#Productivity</b> • <b>#React19</b> • <b>#ProfessionalTools</b> • <b>#Glassmorphism</b>
</div>
