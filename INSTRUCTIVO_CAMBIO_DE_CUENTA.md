# 🔄 Instructivo: ¿Cómo Alternar Cuentas de Firebase sin Conflictos?

Este manual práctico te guiará paso a paso para cambiar de cuenta de Google/Gmail en la terminal de tu computadora de forma segura. Úsalo cada vez que necesites trabajar en otro proyecto y luego regresar a **Sávit** sin que se desconfigure nada.

---

## 🔍 Paso 1: Verificar qué cuenta está activa actualmente
Antes de desplegar o cambiar nada, es útil saber qué correo tiene el control de tu terminal en este momento. Corre el siguiente comando:

```bash
npx firebase login
```

*   **¿Qué verás?**
    *   Si ya tienes una sesión activa, la terminal te responderá:
        `✔ Already logged in as tu_correo@gmail.com`
    *   Si no hay ninguna sesión activa, te abrirá el navegador para iniciar sesión.

---

## 🚪 Paso 2: Cerrar la sesión actual (Logout)
Para poder cambiarte a una cuenta de Gmail diferente, primero debes cerrar la sesión de la cuenta que está activa actualmente en tu máquina:

```bash
npx firebase logout
```

*   **Resultado:** Se cerrará la sesión de forma global en tu computadora y la terminal quedará libre.

---

## 🔑 Paso 3: Iniciar sesión con la nueva cuenta (Login)
Ahora, inicia sesión en la cuenta de Gmail del proyecto en el que vas a trabajar:

```bash
npx firebase login
```

*   **¿Qué pasará?**
    1.  Se abrirá una ventana automática en tu navegador de internet.
    2.  Selecciona o inicia sesión con el correo de Google que corresponda a ese proyecto.
    3.  Haz clic en **"Permitir"** para otorgar los accesos al CLI de Firebase.
    4.  ¡Listo! Tu terminal ahora operará bajo ese correo de Gmail.

---

## ⚙️ Paso 4: Asegurar el proyecto correcto en App Sávit (Solo si regresas aquí)
Cuando regreses a trabajar en la **App Sávit**, tras haber iniciado sesión en `appssft1@gmail.com` siguiendo los pasos anteriores, ejecuta este comando en la raíz del proyecto para asegurar que tu terminal use la base de datos correcta (`tumercadosavit`):

```bash
npx firebase use tumercadosavit
```

*   **Resultado:** Tu terminal responderá `Now using project tumercadosavit`.

---

## 🚀 Paso 5: Comando de Despliegue Oficial en Sávit
Una vez que estés en la cuenta correcta, compila y despliega tu aplicación web a producción con tu comando de siempre:

```bash
cmd /c "npm run build && npx firebase deploy --only hosting"
```

---

> 💡 **Consejo Pro:** Guarda este archivo en tu editor de código preferido. Siempre que tengas problemas de permisos o sientas que Firebase está intentando acceder a otro proyecto, haz un `npx firebase logout` e inicia sesión nuevamente con el correo correcto.
