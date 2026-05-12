import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
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

// --- COLECCIONES REALES ---

// 1. INGREDIENTES (30 Reales)
const realIngredients = [
  { name: "Aguacate Haas", price: 2500, category: "Vegetales", active: true },
  { name: "Tocineta Ahumada", price: 3500, category: "Proteínas", active: true },
  { name: "Queso Mozzarella", price: 2000, category: "Lácteos", active: true },
  { name: "Huevo frito", price: 1500, category: "Proteínas", active: true },
  { name: "Mantequilla de Almendras", price: 4000, category: "Extras", active: true },
  { name: "Semillas de Chía", price: 1200, category: "Superfoods", active: true },
  { name: "Miel de Abejas", price: 2000, category: "Extras", active: true },
  { name: "Pollo Desmechado", price: 4500, category: "Proteínas", active: true },
  { name: "Champiñones Salteados", price: 2500, category: "Vegetales", active: true },
  { name: "Tomates Cherry", price: 1800, category: "Vegetales", active: true },
  { name: "Cebolla Caramelizada", price: 1500, category: "Vegetales", active: true },
  { name: "Queso Crema", price: 1500, category: "Lácteos", active: true },
  { name: "Dip de Hummus", price: 3000, category: "Extras", active: true },
  { name: "Salmón Ahumado", price: 8500, category: "Proteínas", active: true },
  { name: "Pesto de Albahaca", price: 2000, category: "Extras", active: true },
  { name: "Frutos Rojos", price: 3500, category: "Frutas", active: true },
  { name: "Granola Artesanal", price: 2500, category: "Cereales", active: true },
  { name: "Coco Rallado", price: 1200, category: "Extras", active: true },
  { name: "Chips de Chocolate", price: 1800, category: "Extras", active: true },
  { name: "Yogurt Griego", price: 3000, category: "Lácteos", active: true },
  { name: "Fresa Fresca", price: 1500, category: "Frutas", active: true },
  { name: "Banano Tajado", price: 1000, category: "Frutas", active: true },
  { name: "Maní Triturado", price: 1000, category: "Extras", active: true },
  { name: "Jarabe de Arce", price: 3500, category: "Extras", active: true },
  { name: "Pechuga de Pavo", price: 4000, category: "Proteínas", active: true },
  { name: "Arúgula Fresca", price: 1500, category: "Vegetales", active: true },
  { name: "Espuma de Leche", price: 1000, category: "Bebidas", active: true },
  { name: "Canela en Polvo", price: 500, category: "Extras", active: true },
  { name: "Frambuesas", price: 4500, category: "Frutas", active: true },
  { name: "Crema Batida", price: 1500, category: "Extras", active: true }
];

// 2. PRODUCTOS (300 Reales Mapeados)
// Nota: Para optimizar, usaré un sistema de mapeo por categoría
const realProductsBase = [
  // SALUDABLE (40)
  ...Array.from({length: 40}, (_, i) => ({
    name: ["Ensalada Quinoa Real", "Bowl de Salmón & Aguacate", "Poke de Atún Premium", "Wrap de Pollo al Pesto", "Smoothie Verde Detox", "Yogurt con Frutos Rojos", "Avena con Mantequilla de Maní", "Tostadas de Masa Madre & Hummus", "Mix de Semillas Saludables", "Galletas de Avena & Pasas"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Saludable",
    price: 12000 + (i * 200),
    description: "Una opción nutritiva y fresca preparada con los mejores ingredientes de la región.",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80",
    type: "prepared",
    stock: 25,
    active: true
  })),
  // PANADERÍA (40)
  ...Array.from({length: 40}, (_, i) => ({
    name: ["Pan de Masa Madre", "Croissant de Mantequilla", "Bagel de Granos", "Pan Integral con Semillas", "Baguette Tradicional", "Pan de Queso", "Muffin de Arándanos", "Focaccia de Romero", "Pan de Centeno", "Brioche de Canela"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Panadería",
    price: 3500 + (i * 150),
    description: "Horneado diariamente con procesos tradicionales y harinas de alta calidad.",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80",
    type: "fresh",
    stock: 50,
    active: true
  })),
  // BEBIDAS (40)
  ...Array.from({length: 40}, (_, i) => ({
    name: ["Jugo de Naranja Natural", "Kombucha de Jengibre", "Café Cold Brew", "Té Matcha Orgánico", "Limonada de Coco", "Soda Artesanal de Frutos Rojos", "Agua Mineral Premium", "Batido de Proteína Vainilla", "Capuchino de Almendras", "Infusión de Hierbabuena"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Bebidas",
    price: 4500 + (i * 100),
    description: "Bebidas refrescantes y funcionales seleccionadas para acompañar tus mejores momentos.",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f904253db0ad?w=500&q=80",
    type: "fresh",
    stock: 40,
    active: true
  })),
  // FRUTAS (40)
  ...Array.from({length: 40}, (_, i) => ({
    name: ["Manzana Gala Roja", "Bananos Cavendish", "Fresas de Cultivo Limpio", "Aguacate Haas Maduro", "Papaya Hawaiana", "Mango Tomy", "Piña Oro Miel", "Uvas Verdes Sin Semilla", "Mora de Castilla", "Limón Tahití"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Frutas",
    price: 1200 + (i * 50),
    description: "Fruta fresca, seleccionada a mano cada mañana para garantizar la máxima calidad.",
    imageUrl: "https://images.unsplash.com/photo-1610832958506-ee563781f17c?w=500&q=80",
    type: "fresh",
    stock: 60,
    active: true
  })),
  // PROTEÍNAS (40)
  ...Array.from({length: 40}, (_, i) => ({
    name: ["Pechuga de Pollo Premium", "Filete de Salmón", "Costilla de Cerdo Ahumada", "Lomo de Res Madurado", "Huevos Orgánicos x12", "Tofu Natural Orgánico", "Queso Campesino", "Chorizo Artesanal", "Pavo en Lonjas", "Hamburguesa Vegetal"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Proteínas",
    price: 8500 + (i * 300),
    description: "Proteínas de origen controlado, bajas en grasa y ricas en nutrientes.",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80",
    type: "fresh",
    stock: 20,
    active: true
  })),
  // DESPENSA (40)
  ...Array.from({length: 40}, (_, i) => ({
    name: ["Aceite de Oliva Extra Virgen", "Miel de Abejas Pura", "Sal Rosada del Himalaya", "Arroz Integral Organico", "Quinoa Blanca", "Granola de Frutos Secos", "Pasta de Trigo Durum", "Vinagre de Manzana Orgánico", "Mantequilla de Almendras", "Café Molido Gourmet"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Despensa",
    price: 9500 + (i * 400),
    description: "Productos esenciales para tu cocina con los más altos estándares de producción.",
    imageUrl: "https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?w=500&q=80",
    type: "fresh",
    stock: 35,
    active: true
  })),
  // SNACKS (30)
  ...Array.from({length: 30}, (_, i) => ({
    name: ["Chips de Plátano", "Frutos Secos Mix", "Galletas de Arroz", "Barras de Proteína", "Crispetas de Sal Marina", "Almendras Tostadas", "Chocolate 70% Cacao", "Semillas de Calabaza", "Dátiles Rellenos", "Yogurt Bebible"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Snacks",
    price: 2500 + (i * 120),
    description: "Snacks deliciosos y saludables para calmar el hambre entre comidas.",
    imageUrl: "https://images.unsplash.com/photo-1599490659223-930b44acc056?w=500&q=80",
    type: "fresh",
    stock: 45,
    active: true
  })),
  // CUIDADO (30)
  ...Array.from({length: 30}, (_, i) => ({
    name: ["Jabón Líquido Orgánico", "Champú Sin Sulfatos", "Bálsamo Labial Natural", "Crema Hidratante Bio", "Aceite Esencial de Lavanda", "Cepillo de Dientes Bambú", "Protector Solar Mineral", "Desodorante Natural", "Exfoliante de Café", "Vela de Cera de Soya"][i%10] + ` ${Math.floor(i/10 + 1)}`,
    category: "Cuidado",
    price: 15000 + (i * 500),
    description: "Productos para tu bienestar personal libres de tóxicos y amigables con el medio ambiente.",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&q=80",
    type: "fresh",
    stock: 15,
    active: true
  }))
];

// Asegurar que son 300 productos
const finalProducts = realProductsBase.slice(0, 300);

// 3. OFERTAS (5 Reales)
const realOffers = [
  {
    title: "Pack Saludable Mañana",
    productId: "tmp_saludable_1", // Se mapeará después
    productName: "Bowl de Salmón & Aguacate",
    promoPrice: 15000,
    discount: 25,
    active: true,
    banner: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80"
  },
  {
    title: "Panadería Artesanal -20%",
    productId: "tmp_pan_1",
    productName: "Pan de Masa Madre",
    promoPrice: 8000,
    discount: 20,
    active: true,
    banner: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80"
  },
  {
    title: "Fruta de Estación: Uvas",
    productId: "tmp_uvas_1",
    productName: "Uvas Verdes Sin Semilla",
    promoPrice: 4500,
    discount: 50,
    active: true,
    banner: "https://images.unsplash.com/photo-1537640538966-79f369b41e8f?w=800&q=80"
  },
  {
    title: "Café Gourmet Special",
    productId: "tmp_cafe_1",
    productName: "Café Molido Gourmet",
    promoPrice: 12000,
    discount: 30,
    active: true,
    banner: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80"
  },
  {
    title: "Combo Cuidado Detox",
    productId: "tmp_cuidado_1",
    productName: "Aceite Esencial de Lavanda",
    promoPrice: 20000,
    discount: 15,
    active: true,
    banner: "https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=800&q=80"
  }
];

// --- FUNCIONES DE CARGA ---

async function clearCollectionDocs(collectionName) {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const batch = writeBatch(db);
  querySnapshot.docs.forEach(d => {
    batch.delete(d.ref);
  });
  await batch.commit();
  console.log(`🧹 Documentos eliminados en: ${collectionName}`);
}

async function runEliteSeed() {
  console.log("🚀 INICIANDO CARGA ELITE REAL...");

  // 1. Limpieza de documentos
  await clearCollectionDocs("products");
  await clearCollectionDocs("ingredients");
  await clearCollectionDocs("offers");

  // 2. Carga de Ingredientes
  console.log("🥬 Cargando 30 Ingredientes...");
  const ingBatch = writeBatch(db);
  const ingredientIds = [];
  for (const ing of realIngredients) {
    const newRef = doc(collection(db, "ingredients"));
    ingBatch.set(newRef, { ...ing, createdAt: serverTimestamp() });
    ingredientIds.push(newRef.id);
  }
  await ingBatch.commit();
  console.log("✅ Ingredientes cargados.");

  // 3. Carga de Productos (en lotes de 100 para Firestore)
  console.log("🍎 Cargando 300 Productos Reales...");
  const chunks = [];
  for (let i = 0; i < finalProducts.length; i += 100) {
    chunks.push(finalProducts.slice(i, i + 100));
  }

  let count = 0;
  const createdProductMap = {}; // Para las ofertas

  for (const chunk of chunks) {
    const pBatch = writeBatch(db);
    chunk.forEach(p => {
      const newRef = doc(collection(db, "products"));
      
      // Asignar ingredientes aleatorios si es 'prepared'
      let additions = [];
      if (p.type === 'prepared') {
        additions = Array.from({length: 4}, () => ingredientIds[Math.floor(Math.random() * ingredientIds.length)]);
      }

      const pData = { 
        ...p, 
        additions,
        createdAt: serverTimestamp() 
      };
      
      pBatch.set(newRef, pData);
      createdProductMap[p.name] = newRef.id;
    });
    await pBatch.commit();
    count += chunk.length;
    console.log(`✅ ${count}/300 productos procesados...`);
  }

  // 4. Carga de Ofertas
  console.log("🏷️ Cargando 5 Ofertas...");
  const offerBatch = writeBatch(db);
  for (const offer of realOffers) {
    const realId = createdProductMap[offer.productName] || null;
    const newRef = doc(collection(db, "offers"));
    offerBatch.set(newRef, {
      ...offer,
      productId: realId,
      createdAt: serverTimestamp()
    });
    
    // Actualizar el producto con el precio de promo
    if (realId) {
      const pRef = doc(db, "products", realId);
      offerBatch.update(pRef, {
        isPromo: true,
        promoPrice: offer.promoPrice,
        discount: offer.discount
      });
    }
  }
  await offerBatch.commit();
  console.log("✅ Ofertas cargadas y productos actualizados.");

  console.log("✨ SEMBRADO ELITE COMPLETADO EXITOSAMENTE.");
}

runEliteSeed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Error FATAL:", err);
    process.exit(1);
  });
