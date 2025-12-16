# Sistema de Licencias y Pagos - Guía de Configuración

Este documento describe cómo configurar y probar el sistema de venta de licencias con Stripe Checkout.

## Resumen de Funcionalidades

- **Compra de Licencia**: Los usuarios pueden comprar una licencia de la aplicación mediante Stripe Checkout
- **Promoción a Admin**: Tras completar el pago, la cuenta del usuario se actualiza automáticamente a `role: 'admin'`
- **Gestión de Alumnos**: Los administradores pueden crear hasta 30 cuentas de alumnos desde el panel `/admin/students`
- **Sistema de Puntuación**: Las cuentas de alumnos son usuarios normales (`role: 'user'`) que pueden usar el sistema de puntuación de juegos

## Configuración de Stripe

### 1. Crear Cuenta de Stripe (Modo Test)

1. Regístrate en [Stripe](https://stripe.com)
2. Activa el **modo de prueba** (toggle en la esquina superior izquierda del dashboard)

### 2. Obtener Claves API

En el [Dashboard de Stripe](https://dashboard.stripe.com/test/apikeys):

1. Copia la **Secret key** (`sk_test_...`)
2. Añádela a tu `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_your_actual_key_here
   ```

### 3. Crear un Producto y Precio

En [Productos de Stripe](https://dashboard.stripe.com/test/products):

1. Clic en **+ Add product**
2. Nombre: "Licencia App Boys Games"
3. Precio: Define el monto (ej: $50.00 USD)
4. Tipo de precio: **One-time** (pago único)
5. Guarda el **Price ID** (`price_...`)
6. Añádelo a tu `.env`:
   ```
   STRIPE_PRICE_ID=price_your_actual_price_id_here
   ```

### 4. Configurar Webhooks

#### Opción A: Producción en Render (Recomendado)

**Este proyecto está desplegado en Render**, por lo que debes configurar el webhook apuntando a tu backend en producción.

1. **Ir a Stripe Dashboard** → [Webhooks](https://dashboard.stripe.com/test/webhooks)

2. **Click en "+ Add endpoint"**

3. **Configurar endpoint:**
   ```
   Endpoint URL: https://your-backend.render.com/api/billing/webhook
   ```
   Ejemplo: `https://app-boys-games-api.onrender.com/api/billing/webhook`

4. **Seleccionar eventos a escuchar:**
   - Busca y selecciona: `checkout.session.completed`

5. **Click en "Add endpoint"**

6. **Copiar el Signing secret:**
   - En la página del endpoint, haz click en "Reveal" en la sección "Signing secret"
   - Copia el valor (`whsec_...`)

7. **Añadir a variables de entorno en Render:**
   - Ve a tu servicio backend en Render
   - Settings → Environment
   - Añade: `STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret`

#### Opción B: Desarrollo Local con Stripe CLI (Opcional)

Si necesitas probar webhooks en desarrollo local:

**Instalación de Stripe CLI:**

**Windows:**
```bash
scoop install stripe
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

**Configurar:**

1. **Autenticar Stripe CLI:**
   ```bash
   stripe login
   ```

2. **Iniciar túnel de webhooks** (en una terminal separada):
   ```bash
   stripe listen --forward-to http://localhost:4000/api/billing/webhook
   ```

3. **Copiar el webhook secret** que aparece en la terminal (`whsec_...`)
4. Añádelo a tu `.env` local:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_cli
   ```

**Nota:** Este método solo funciona para desarrollo local. Para producción en Render, usa la Opción A.

### 5. Variables de Entorno Completas

Tu `.env` debe contener:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
FRONTEND_BASE_URL=http://localhost:5173

# Otras variables existentes
JWT_SECRET=...
JWT_REFRESH_SECRET=...
MONGODB_URI=...
CORS_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:4000/api
```

## Probar el Flujo Completo

### Entorno de Producción (Render + Vercel)

Tu proyecto ya está desplegado:
- Backend: Render (ej: `https://app-boys-games-api.onrender.com`)
- Frontend: Vercel (ej: `https://app-boys-games.vercel.app`)

**Variables de entorno requeridas en Render:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Del endpoint configurado en Stripe Dashboard
STRIPE_PRICE_ID=price_...
FRONTEND_BASE_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app
MONGODB_URI=mongodb+srv://...  # MongoDB Atlas
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

### Entorno de Desarrollo Local (Opcional)

Si quieres probar en local:

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Stripe CLI (solo si pruebas local):**
```bash
stripe listen --forward-to http://localhost:4000/api/billing/webhook
```

### 2. Flujo de Compra

1. **Registro**: Crea una cuenta de usuario normal
2. **Navegar a Purchase**: Ve a `/purchase` o usa el enlace en el home
3. **Click en "Comprar licencia"**: Redirige a Stripe Checkout
4. **Usar tarjeta de prueba**:
   ```
   Número: 4242 4242 4242 4242
   Fecha: Cualquier fecha futura (ej: 12/34)
   CVC: Cualquier 3 dígitos (ej: 123)
   ZIP: Cualquier código postal
   ```
5. **Completar pago**: Stripe redirige a `/purchase/success`
6. **Verificar**: Cierra sesión y vuelve a iniciar sesión. Deberías ver el botón "⚙️ Alumnos" en el header

### 3. Gestionar Alumnos (Solo Admin)

1. **Acceder al panel**: Click en "⚙️ Alumnos" en el header
2. **Crear alumno**:
   - Nombre completo
   - Nombre de usuario (mínimo 3 caracteres)
   - Contraseña (mínimo 6 caracteres)
3. **Límites**:
   - Máximo 30 alumnos por licencia
   - Los nombres de usuario deben ser únicos en toda la plataforma
4. **Eliminar alumno**: Click en "Eliminar" en la lista de alumnos

### 4. Verificar Webhook

**En producción (Render):**
- Ve a Stripe Dashboard → [Webhooks](https://dashboard.stripe.com/test/webhooks)
- Click en tu endpoint
- Ve a la pestaña "Event history"
- Deberías ver el evento `checkout.session.completed` con status "Succeeded"

**En Render logs:**
- Ve a tu servicio backend en Render
- Click en "Logs"
- Busca: `Purchase activated and user promoted to admin: [userId]`

**En desarrollo local:**
En la terminal donde corre `stripe listen`, deberías ver:
```
✔ Received event: checkout.session.completed
✔ Forwarded to http://localhost:4000/api/billing/webhook
```

## Tarjetas de Prueba de Stripe

| Escenario | Número de Tarjeta |
|-----------|-------------------|
| Pago exitoso | 4242 4242 4242 4242 |
| Requiere autenticación | 4000 0025 0000 3155 |
| Pago rechazado | 4000 0000 0000 9995 |
| Fondos insuficientes | 4000 0000 0000 9995 |

Más tarjetas: [Stripe Testing Docs](https://stripe.com/docs/testing)

## Endpoints de API

### Billing

- `POST /api/billing/checkout` - Crear sesión de Stripe (auth requerido)
- `POST /api/billing/webhook` - Webhook de Stripe (raw body, sin auth)

### Gestión de Alumnos

- `GET /api/admin/students` - Lista de alumnos del admin (auth + admin)
- `POST /api/admin/students` - Crear alumno (auth + admin)
- `DELETE /api/admin/students/:id` - Eliminar alumno (auth + admin)

## Modelos de Datos

### Purchase
```javascript
{
  userId: ObjectId,        // Usuario que compró
  status: 'pending|active', // Estado de la compra
  stripeSessionId: String,  // ID de sesión de Stripe
  stripeCustomerId: String, // ID de cliente en Stripe
  priceId: String,          // ID del precio en Stripe
  amount: Number,           // Monto en centavos
  currency: String,         // Moneda (USD, EUR, etc.)
  createdAt: Date,
  updatedAt: Date
}
```

### User (actualizado)
```javascript
{
  name: String,
  username: String,
  passwordHash: String,
  role: 'user|admin',
  ownerAdmin: ObjectId,    // ← NUEVO: Admin propietario (solo para alumnos)
  createdAt: Date,
  updatedAt: Date
}
```

## Archivos Modificados

### Backend
- `server/models/Purchase.js` - Nuevo modelo
- `server/models/User.js` - Campo `ownerAdmin` añadido
- `server/routes/billing.js` - Nuevas rutas de facturación
- `server/routes/admin/students.js` - Gestión de alumnos
- `server/routes/admin/index.js` - Registro de rutas de students
- `server/app.js` - Registro de rutas de billing
- `server/index.js` - Sincronización de índices

### Frontend
- `src/js/services/api.js` - Métodos `checkout()`, `getStudents()`, `createStudent()`, `deleteStudent()`
- `src/js/views/purchase.js` - Vista de compra
- `src/js/views/adminStudents.js` - Panel de gestión de alumnos
- `src/js/app/init.js` - Registro de rutas y event listeners
- `src/js/app/user.js` - Mostrar/ocultar botón admin
- `src/css/purchase.css` - Estilos de compra
- `src/css/students.css` - Estilos de gestión de alumnos
- `src/css/main.css` - Importación de nuevos estilos
- `index.html` - Botón de admin en header

### Configuración
- `.env.example` - Variables de Stripe añadidas
- `package.json` - Dependencia `stripe` añadida

## Troubleshooting

### Error: "STRIPE_SECRET_KEY not configured"
→ Verifica que el archivo `.env` tenga la variable `STRIPE_SECRET_KEY`

### Error: "Webhook signature verification failed"
→ Asegúrate de que `STRIPE_WEBHOOK_SECRET` coincida con el de `stripe listen`

### Webhook no se recibe
→ Verifica que `stripe listen` esté corriendo y apuntando al puerto correcto

### Usuario no se actualiza a admin
→ Revisa los logs del servidor para ver si el webhook `checkout.session.completed` se procesó correctamente

### No se puede crear más de 30 alumnos
→ Este es el comportamiento esperado. El límite está hardcodeado en `server/routes/admin/students.js`

## Configuración en Render (Producción)

### 1. Variables de Entorno en Render

Configurar en **Render Dashboard** → Tu servicio backend → **Environment**:

```bash
# Stripe (Modo Test primero, luego Live)
STRIPE_SECRET_KEY=sk_test_...          # Usar sk_live_... para producción real
STRIPE_WEBHOOK_SECRET=whsec_...        # Del webhook endpoint configurado
STRIPE_PRICE_ID=price_...              # Price ID de tu producto
FRONTEND_BASE_URL=https://your-app.vercel.app

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/app_boys_games

# Auth
JWT_SECRET=your-strong-random-secret
JWT_REFRESH_SECRET=your-other-strong-secret
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7

# CORS
CORS_ORIGIN=https://your-app.vercel.app
```

### 2. Variables de Entorno en Vercel

Configurar en **Vercel Dashboard** → Tu proyecto → **Settings** → **Environment Variables**:

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

### 3. Cambiar a Modo Live (Producción Real)

Cuando estés listo para aceptar pagos reales:

1. **En Stripe Dashboard:**
   - Desactiva el modo test (toggle arriba a la derecha)
   - Ve a [API Keys](https://dashboard.stripe.com/apikeys)
   - Copia la **Live Secret Key** (`sk_live_...`)

2. **Crear producto en modo Live:**
   - Ve a [Products](https://dashboard.stripe.com/products)
   - Crea el mismo producto
   - Copia el nuevo **Price ID** (`price_...`)

3. **Configurar webhook en modo Live:**
   - Ve a [Webhooks](https://dashboard.stripe.com/webhooks)
   - Añade endpoint con la misma URL de Render
   - Copia el nuevo **Signing Secret** (`whsec_...`)

4. **Actualizar variables en Render:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...       # ← Cambiado
   STRIPE_WEBHOOK_SECRET=whsec_...     # ← Nuevo secret de producción
   STRIPE_PRICE_ID=price_...           # ← Nuevo price ID
   ```

## Soporte

Para más información sobre Stripe:
- [Documentación de Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Webhooks de Stripe](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
