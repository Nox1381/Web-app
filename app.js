import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ---------- FIREBASE CONFIG ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyCCJqmgiZ2hQXPk5Ww7_6zZFJx1pcI5DDg",
  authDomain: "kerux-668cb.firebaseapp.com",
  projectId: "kerux-668cb",
  storageBucket: "kerux-668cb.firebasestorage.app",
  messagingSenderId: "1003479552994",
  appId: "1:1003479552994:web:d7567e35b7cce8a6381fbb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- DEVICE ID ---------- */
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
  deviceId = crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);
}

/* ---------- DOM ELEMENTS ---------- */
const form = document.querySelector(".chat-input");
const input = form.querySelector("input[type='text']");
const imageInput = form.querySelector("input[type='file']");
const chatBox = document.querySelector(".chat-messages");

/* ---------- MAX MESSAGES ---------- */
const MAX_MESSAGES = 25;

/* ---------- IMAGE COMPRESSION ---------- */
function compressImage(
  file,
  { maxWidth = 800, maxHeight = 800, quality = 0.7 } = {}
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result;
    };

    img.onload = () => {
      let { width, height } = img;

      // Keep aspect ratio
      const scale = Math.min(
        maxWidth / width,
        maxHeight / height,
        1
      );

      width = Math.floor(width * scale);
      height = Math.floor(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL(
        "image/jpeg",
        quality
      );

      resolve(compressedBase64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- ENFORCE MESSAGE CAP ---------- */
async function enforceMessageCap() {
  const messagesRef = collection(db, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  if (snapshot.size > MAX_MESSAGES) {
    const excess = snapshot.size - MAX_MESSAGES;
    const docsToDelete = snapshot.docs.slice(0, excess);
    const batch = writeBatch(db);

    docsToDelete.forEach((d) =>
      batch.delete(doc(db, "messages", d.id))
    );

    await batch.commit();
  }
}

/* ---------- SEND MESSAGE ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  const file = imageInput.files[0];

  if (!text && !file) return;

  try {
    let imageBase64 = null;

    if (file) {
      imageBase64 = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7
      });
    }

    await addDoc(collection(db, "messages"), {
      text: text || null,
      image: imageBase64,
      sender: deviceId,
      timestamp: Date.now()
    });

    input.value = "";
    imageInput.value = "";

    await enforceMessageCap();
  } catch (err) {
    console.error("Message send failed:", err);
  }
});

/* ---------- RECEIVE MESSAGES ---------- */
const q = query(collection(db, "messages"), orderBy("timestamp"));

onSnapshot(q, (snapshot) => {
  chatBox.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");

    div.className =
      data.sender === deviceId
        ? "message-sent"
        : "message-received";

    if (data.text) {
      const p = document.createElement("p");
      p.textContent = data.text;
      div.appendChild(p);
    }

    if (data.image) {
      const img = document.createElement("img");
      img.src = data.image;
      img.style.maxWidth = "220px";
      img.style.borderRadius = "14px";
      img.style.marginTop = "6px";
      img.loading = "lazy";
      div.appendChild(img);
    }

    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
});
