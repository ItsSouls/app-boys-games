# Guía Rápida: Configurar Stripe en Render

Esta es una guía paso a paso para configurar Stripe en tu proyecto desplegado en Render.

## Paso 1: Configurar Stripe

### 1.1 Crear Producto y Precio

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/test/products) (modo test)
2. Click **+ Add product**
3. Configura:
   - Nombre: `Licencia App Boys Games`
   - Precio: Por ejemplo `$50.00 USD`
   - Tipo: **One-time payment**
4. Click **Save**
5. **Copia el Price ID** (formato: `price_xxxxxxxxxxxxx`)

### 1.2 Obtener API Key

1. Ve a [API Keys](https://dashboard.stripe.com/test/apikeys)
2. **Copia la Secret key** (formato: `sk_test_xxxxxxxxxxxxx`)

## Paso 2: Configurar Webhook en Stripe

1. Ve a [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **+ Add endpoint**
3. Ingresa tu URL de Render:
   ```
   https://TU-SERVICIO.onrender.com/api/billing/webhook
   ```
   Ejemplo: `https://app-boys-games-api.onrender.com/api/billing/webhook`

4. En "Select events to listen to":
   - Busca `checkout.session.completed`
   - Marca el checkbox
   - Click **Add events**

5. Click **Add endpoint**

6. En la página del endpoint recién creado:
   - Click **Reveal** en "Signing secret"
   - **Copia el webhook secret** (formato: `whsec_xxxxxxxxxxxxx`)

## Paso 3: Configurar Variables de Entorno en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Selecciona tu servicio backend
3. Ve a **Environment** en el menú izquierdo
4. Añade las siguientes variables (click **Add Environment Variable** para cada una):

```bash
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxx
FRONTEND_BASE_URL=https://tu-frontend.vercel.app
```

**Nota:** Reemplaza los valores `xxxxx` con tus claves reales de Stripe.

5. Click **Save Changes**
6. Render **redesplegará automáticamente** tu servicio con las nuevas variables

## Paso 4: Verificar Configuración

### Verificar que el backend está corriendo

1. Abre tu URL de Render: `https://TU-SERVICIO.onrender.com/api/health`
2. Deberías ver: `{"ok":true}`

### Probar el flujo de compra

1. Ve a tu frontend en Vercel
2. Regístrate como usuario
3. Navega a `/purchase`
4. Click en **Comprar licencia**
5. Usa una tarjeta de prueba:
   ```
   Número: 4242 4242 4242 4242
   Fecha: 12/34
   CVC: 123
   ```
6. Completa el pago
7. Deberías ser redirigido a `/purchase/success`

### Verificar el webhook

1. Ve a [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click en tu endpoint
3. Ve a la pestaña **Event history**
4. Deberías ver el evento `checkout.session.completed` con status **Succeeded**

### Verificar logs en Render

1. Ve a tu servicio en Render
2. Click en **Logs** en el menú
3. Busca: `Purchase activated and user promoted to admin:`

### Verificar que eres admin

1. Cierra sesión en tu app
2. Vuelve a iniciar sesión
3. Deberías ver el botón **⚙️ Alumnos** en el header
4. Click en él para ir al panel de gestión de alumnos

## Resumen de URLs Importantes

| Recurso | URL |
|---------|-----|
| Stripe Dashboard | https://dashboard.stripe.com/test |
| Productos Stripe | https://dashboard.stripe.com/test/products |
| API Keys Stripe | https://dashboard.stripe.com/test/apikeys |
| Webhooks Stripe | https://dashboard.stripe.com/test/webhooks |
| Render Dashboard | https://dashboard.render.com/ |
| Backend Health Check | https://TU-SERVICIO.onrender.com/api/health |

## Variables de Entorno Completas en Render

Tu servicio en Render debe tener estas variables:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxx
FRONTEND_BASE_URL=https://tu-frontend.vercel.app

# MongoDB (ya configuradas)
MONGODB_URI=mongodb+srv://...
MONGO_DB=app_boys_games

# Auth (ya configuradas)
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7

# CORS (ya configurada)
CORS_ORIGIN=https://tu-frontend.vercel.app
```

## Troubleshooting

### Error: "STRIPE_SECRET_KEY not configured"
→ Verifica que la variable esté en Render Environment y que el servicio se haya redesplegado

### El webhook no se ejecuta
→ Verifica que la URL del webhook en Stripe Dashboard sea exactamente la URL de tu backend en Render + `/api/billing/webhook`

### El usuario no se actualiza a admin
1. Ve a Stripe Dashboard → Webhooks → Tu endpoint → Event history
2. Verifica que el evento `checkout.session.completed` aparezca
3. Si aparece pero tiene errores, click en él para ver el detalle
4. Revisa los logs de Render para más información

### Error: "Webhook signature verification failed"
→ Verifica que `STRIPE_WEBHOOK_SECRET` en Render coincida exactamente con el "Signing secret" del webhook endpoint en Stripe Dashboard

## Pasar a Modo Live (Pagos Reales)

**SOLO cuando estés listo para aceptar pagos reales:**

1. Cambia el toggle en Stripe Dashboard de "Test" a "Live"
2. Crea el producto nuevamente en modo Live
3. Obtén la nueva Secret Key (`sk_live_...`)
4. Crea el webhook nuevamente en modo Live
5. Actualiza las 3 variables en Render con los valores Live:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`

**¡Importante!** Los pagos en modo Live son reales y se te cobrarán comisiones. Prueba siempre en modo Test primero.
