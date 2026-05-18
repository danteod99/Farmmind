# Auto-recarga mensual con Stripe en panel SMM

**Fecha:** 2026-05-17
**Proyecto:** farmmind (trustmind.online)
**Scope:** Agregar método de pago "Tarjeta" al panel SMM (`/smm/funds`) como suscripción mensual de auto-recarga. El pago cripto one-time existente queda intacto.

## Contexto

El panel SMM hoy solo acepta cripto via NOWPayments (USDT, BTC, ETH) para recargar saldo. Se requiere ofrecer tarjeta como segundo método. Decisión de producto: la opción tarjeta es **exclusivamente auto-recarga mensual recurrente** (Stripe Subscription). No se ofrece pago único con tarjeta en v1.

Stripe ya está integrado para el plan Pro (`/api/stripe/checkout` modo `subscription`). Se reutiliza el cliente, el webhook y el customer portal existentes.

## Decisiones clave

- **Modelo:** Stripe Subscription mensual con `price_data` recurring inline (sin crear Price objects persistentes en Stripe Dashboard).
- **Distinción Pro vs auto-recarga SMM:** se usa `subscription.metadata.purpose` (`pro` vs `smm_autorecharge`). Un mismo usuario puede tener ambas activas.
- **Webhook:** se reutiliza `/api/stripe/webhook` existente, agregando 2 casos nuevos filtrados por metadata. No se crea webhook separado.
- **Cancelación:** via DELETE al endpoint propio que llama `stripe.subscriptions.cancel()`. El customer portal de Stripe también funciona porque ya está expuesto.
- **Comisión Stripe absorbida:** usuario paga $X → recibe $X en saldo. Pérdida ~3% asumida por el negocio.
- **Mínimo:** $20/mes (por debajo de eso la comisión proporcional es demasiado alta).
- **Frecuencia:** solo mensual en v1.

## Arquitectura

### Cambios de código

| Archivo | Acción |
|---|---|
| `app/api/smm/create-stripe-autorecharge/route.ts` | NUEVO. POST crea Checkout Session subscription |
| `app/api/smm/autorecharge/route.ts` | NUEVO. GET estado, DELETE cancelar |
| `app/api/stripe/webhook/route.ts` | MODIFICAR. Agregar `invoice.paid` + `customer.subscription.deleted` filtrados por `metadata.purpose === "smm_autorecharge"` |
| `app/smm/funds/page.tsx` | MODIFICAR. Sección nueva "Auto-recarga con tarjeta" |

### Schema Supabase

```sql
-- Tabla nueva: configuración de auto-recarga por usuario
CREATE TABLE IF NOT EXISTS smm_autorecharge (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  amount_usd numeric NOT NULL CHECK (amount_usd >= 20 AND amount_usd <= 500),
  interval text NOT NULL DEFAULT 'month',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled', 'past_due')),
  next_charge_at timestamptz,
  last_charged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_smm_autorecharge_sub_id ON smm_autorecharge(stripe_subscription_id);

-- Columnas nuevas en smm_transactions para distinguir provider
ALTER TABLE smm_transactions
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'nowpayments'
    CHECK (payment_provider IN ('nowpayments', 'stripe')),
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_smm_transactions_stripe_invoice
  ON smm_transactions(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
```

### Flujos

**Activación:**
```
[Funds page] "Activar $50/mes" 
  → POST /api/smm/create-stripe-autorecharge { amount: 50 }
  ← { url: "checkout.stripe.com/cs_..." }
[Stripe Checkout] usuario autoriza tarjeta
  → redirect /smm/funds?autorecharge=success
[Webhook customer.subscription.created] purpose=smm_autorecharge
  → upsert smm_autorecharge (status='active', amount, subscription_id)
[Webhook invoice.paid #1 inmediato]
  → RPC increment_balance(user_id, amount)
  → insert smm_transactions (provider='stripe', status='finished', credited=true)
  → update smm_autorecharge.last_charged_at, next_charge_at
```

**Renovación mensual:**
```
[Stripe cada 30 días] charge auto
[Webhook invoice.paid]
  → mismo flujo: increment_balance + insert transaction + update next_charge_at
```

**Cancelación:**
```
[Funds page] "Cancelar auto-recarga"
  → DELETE /api/smm/autorecharge
  → stripe.subscriptions.cancel(sub_id) (cancel_at_period_end: false, inmediato)
[Webhook customer.subscription.deleted]
  → update smm_autorecharge.status='canceled'
```

**Pago fallido (tarjeta expirada/declinada):**
```
[Webhook invoice.payment_failed] (ya existe el handler genérico)
  → no acreditar saldo
  → Stripe maneja retries automáticos (3 intentos por default)
  → si todos fallan: webhook customer.subscription.deleted → status='canceled'
```

## Manejo de errores e idempotencia

- **Idempotencia de webhook:** antes de acreditar, verificar que `stripe_invoice_id` no exista ya en `smm_transactions`. Stripe puede reenviar eventos.
- **Race condition de balance:** se reutiliza RPC `increment_balance` existente (atómico).
- **Subscription creada sin completar Checkout:** Stripe no crea la subscription hasta que el pago inmediato pase. Si el usuario cierra el navegador antes del redirect, la subscription ya existe y `invoice.paid` se dispara igual.
- **Usuario con auto-recarga activa intenta activar otra:** GET `/api/smm/autorecharge` retorna estado actual; el botón en UI cambia a "Cancelar" en lugar de "Activar".
- **Customer Stripe inexistente:** se reutiliza la lógica de `app/api/stripe/checkout/route.ts` (crear si no existe, guardar en `profiles.stripe_customer_id`).

## Testing

**Local:**
1. `npm run dev` en `farmmind/`
2. Login con cuenta de prueba
3. Ir a `/smm/funds` → click "Activar auto-recarga $20/mes" → completar checkout con tarjeta test `4242 4242 4242 4242`
4. Verificar webhook con Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
5. Confirmar:
   - Balance en `/smm/funds` aumentó $20
   - Fila nueva en `smm_transactions` con `payment_provider='stripe'`
   - Fila en `smm_autorecharge` con `status='active'`
6. Click "Cancelar" → verificar `status='canceled'` en DB

**Producción:**
1. Deploy `vercel --prod`
2. En Stripe Dashboard → Webhooks → agregar evento `invoice.paid` si falta
3. Test con tarjeta real, monto mínimo $20

## Out of scope (v1)

- Pago único con tarjeta (solo cripto sigue para one-time)
- Frecuencias distintas a mensual
- Pausar (sin cancelar) auto-recarga
- Notificación por email al cobrar/fallar (Stripe ya envía recibos)
- Promo codes en auto-recarga (solo en cripto por ahora)
- Customer Portal directo desde `/smm/funds` (ya existe en `/api/stripe/portal` accesible desde otra parte del dashboard)
