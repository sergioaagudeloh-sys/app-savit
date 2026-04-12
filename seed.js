import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQKgh9MC-R4a0T_rPdFMCHu6P9CrO4GJ8",
  authDomain: "tumercadosavit.firebaseapp.com",
  projectId: "tumercadosavit",
  storageBucket: "tumercadosavit.firebasestorage.app",
  messagingSenderId: "750604922017",
  appId: "1:750604922017:web:53c6e70ef6df0114af14e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categories = [
  { name: "Saludable", icon: "🥙" },
  { name: "Panadería", icon: "🥖" },
  { name: "Bebidas", icon: "🥤" },
  { name: "Snacks", icon: "🍓" }
];

const products = [
  { name: "Ensalada César", description: "Pollo a la plancha, lechuga romana, crutones y aderezo.", price: 18000, stock: 15, category: "Saludable", imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=60", active: true },
  { name: "Pan Integral", description: "Pan de masa madre 100% integral sin conservantes.", price: 12000, stock: 10, category: "Panadería", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60", active: true },
  { name: "Jugos Verdes", description: "Manzana verde, apio, espinaca y limón.", price: 8500, stock: 20, category: "Bebidas", imageUrl: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=500&auto=format&fit=crop&q=60", active: true }
];

async function seed() {
  console.log("🚀 Iniciando carga completa de base de datos...");
  
  // 1. Configuración de la Tienda
  console.log("⚙️ Configurando tienda...");
  await setDoc(doc(db, "config", "store"), {
    isOpen: true,
    whatsappNumber: "573216513171",
    storeName: "Sávit - Mercado Saludable",
    scheduleEnabled: false,
    openTime: "09:00",
    closeTime: "18:00",
    updatedAt: serverTimestamp()
  });

  // 2. Categorías
  for (const cat of categories) {
    await addDoc(collection(db, "categories"), { ...cat, createdAt: serverTimestamp() });
    console.log(`✅ Categoría: ${cat.name}`);
  }

  // 3. Productos
  for (const prod of products) {
    await addDoc(collection(db, "products"), { ...prod, createdAt: serverTimestamp() });
    console.log(`✅ Producto: ${prod.name}`);
  }

  // 4. Pedido de Ejemplo
  console.log("📦 Creando pedido de prueba...");
  await addDoc(collection(db, "orders"), {
    orderId: "SAV-0001",
    customerName: "Usuario de Prueba",
    customerPhone: "3101234567",
    items: [products[0]],
    total: 18000,
    status: "pending",
    deliveryMethod: "domicilio",
    address: "Calle Falsa 123",
    createdAt: serverTimestamp()
  });

  // 5. Notificación de Ejemplo
  console.log("🔔 Creando notificación de prueba...");
  await addDoc(collection(db, "notifications"), {
    title: "¡Bienvenido a Firebase! 🚀",
    message: "Tu aplicación ya está conectada y lista para recibir pedidos.",
    type: "info",
    targetRole: "admin",
    read: false,
    createdAt: serverTimestamp()
  });
  
  console.log("✨ Base de datos inicializada correctamente.");
}

seed().then(() => process.exit(0)).catch(err => {
  console.error("❌ Error en la carga:", err);
  process.exit(1);
});
