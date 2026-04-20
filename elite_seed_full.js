import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";

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
  { name: "Snacks", icon: "🍓" },
  { name: "Frutas", icon: "🍎" },
  { name: "Proteínas", icon: "🍗" },
  { name: "Despensa", icon: "🥫" },
  { name: "Cuidado", icon: "🌿" }
];

const productPrefix = ["Orgánico", "Fresh", "Súper", "Premium", "Natural", "Bio", "Eco", "Fitness", "Sávit", "Integral"];
const productTypes = ["Granola", "Muesli", "Jugo Verde", "Pan de Masa Madre", "Kombucha", "Frutos Secos", "Aceite de Coco", "Proteína de Arveja", "Snack de Manzana", "Yogurt Griego", "Avena Trasnochada", "Mix de Semillas", "Galletas de Arroz", "Miel de Abejas", "Café de Especialidad"];
const productSuffix = ["con Chía", "Sin Azúcar", "Alta Proteína", "Crunchy", "Original", "Artesanal", "de la Casa", "Vegano", "100% Natural", "Gold Label"];

const imagePool = [
  "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&q=80",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80",
  "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=500&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80",
  "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=80",
  "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500&q=80",
  "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=500&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&q=80",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&q=80"
];

async function clearCollection(collectionName) {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  console.log(`🧹 Colección despejada: ${collectionName}`);
}

async function eliteSeed() {
  console.log("🚀 RE-INICIANDO CARGA ELITE (SIN STOCK)...");

  // Solo limpiamos productos para esta corrección rápida
  await clearCollection("products");

  // 1. Cargando 300 Productos (SIN CAMPO STOCK)
  console.log("🍎 Generando 300 Productos Limpios...");
  const productPromises = [];
  for (let i = 1; i <= 300; i++) {
    const pre = productPrefix[Math.floor(Math.random() * productPrefix.length)];
    const typ = productTypes[Math.floor(Math.random() * productTypes.length)];
    const suf = productSuffix[Math.floor(Math.random() * productSuffix.length)];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    
    const name = `${pre} ${typ} ${suf}`;
    const price = Math.floor(Math.random() * 45000 + 5000);
    
    const productData = {
      name,
      description: `Nuestro ${name} es ideal para tu dieta diaria. Ingredientes de origen controlado y calidad ${pre}.`,
      price,
      // ELIMINADO EL CAMPO STOCK
      category: cat.name,
      imageUrl: imagePool[Math.floor(Math.random() * imagePool.length)],
      active: true,
      createdAt: serverTimestamp()
    };
    
    productPromises.push(addDoc(collection(db, "products"), productData));
    
    if (productPromises.length === 50) {
      await Promise.all(productPromises);
      productPromises.length = 0;
      console.log(`✅ Procesados ${i} productos sin stock...`);
    }
  }
  if (productPromises.length > 0) await Promise.all(productPromises);

  console.log("✨ PRODUCTOS ACTUALIZADOS CORRECTAMENTE (SIN STOCK).");
}

eliteSeed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
