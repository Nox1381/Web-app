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

  if (file) {
    const reader = new FileReader();
    reader.onload = async () => {
      await addDoc(collection(db, "messages"), {
        text: text || null,
        image: reader.result,
        sender: deviceId,
        timestamp: Date.now()
      });

      input.value = "";
      imageInput.value = "";
      await enforceMessageCap();
    };
    reader.readAsDataURL(file);
  } else {
    await addDoc(collection(db, "messages"), {
      text,
      image: null,
      sender: deviceId,
      timestamp: Date.now()
    });

    input.value = "";
    await enforceMessageCap();
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
      div.appendChild(img);
    }

    chatBox.appendChild(div);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
});
