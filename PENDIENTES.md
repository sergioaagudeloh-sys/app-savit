# 📋 Tareas Pendientes para Producción

Este documento sirve como recordatorio de todas las cosas que deben eliminarse, configurarse o ajustarse antes del lanzamiento final de la aplicación.

## 🔴 URGENCIAS Y SEGURIDAD
- [ ] **Eliminar acceso hardcodeado temporal:** En `src/context/AuthContext.jsx` se agregaron accesos directos con `admin@savit.com` (admin123) y `cliente@savit.com` (cliente123). **¡DEBEN BORRARSE** antes de publicar!
- [ ] **Configurar Auth en Firebase:** Activar el proveedor "*Email/Password*" en Firebase Console.
- [ ] **Activar Storage (Nube de Fotos) en Firebase:** La funcionalidad de subida local ya está terminada. **Para que Firebase reciba los archivos hay que pasarse a Blaze (o activar Storage)**:
  1. Entrar a Firebase Console (Proyecto `tumercadosavit`).
  2. Ir a "Build" -> "Storage" y apretar el botón de "Comenzar" o Start.
  3. Elegir "Modo Producción" y misma región (us-central o nam5).
  4. Desde la terminal correr: `npx firebase deploy --only storage` (para subir las reglas de seguridad).
- [ ] **Reglas de Firestore (Seguridad):** Desplegar o confirmar que `firestore.rules` esté aplicado y activo en la nube.
- [ ] **Agregar variables `.env` originales:** Actualmente se corre en modo Demo Offline por falta de `VITE_FIREBASE_API_KEY` y los otros valores.

## 🟡 TAREAS SECUNDARIAS
- [ ] Conectar la Pasarela de Pago (Próxima fase: Wompi/PayU/MercadoPago).
- [ ] Reemplazar imágenes por defecto restantes.
- [x] **Cargador de Imágenes (Firebase Storage):** Interfaz y lógica completadas (Compresión y Auth integrados). Falta el paso en consola detallado arriba.
- [ ] **Modo Invitado:** Pulido y funcional.
