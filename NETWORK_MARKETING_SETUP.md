# Network Marketing - Plan Binario v1 (MVP)

Suscripción $200/mes con red binaria. Bono directo 15% on payment.
Las fases siguientes (binario sobre pata débil, matching, pool) se construyen encima.

---

## Que se entrega en este MVP

- ✅ Link de invitación único por usuario: `trustmind.online/r/{CODIGO}`
- ✅ Captura del sponsor en signup (pending placement)
- ✅ Sponsor coloca al nuevo en pata izquierda o derecha
- ✅ Spillover automático si la pata ya está ocupada
- ✅ Bono directo 15% al sponsor cada vez que el directo paga (regla *pago para cobrar*)
- ✅ Página `/network` con: link, árbol, directos, pendings, comisiones, historial
- ✅ Idempotencia en webhook (no doble pago)
- ❌ Bono binario sobre pata débil (Fase 2)
- ❌ Matching multinivel (Fase 2)
- ❌ Pool de rangos (Fase 2)
- ❌ Compresión dinámica (Fase 2)
- ❌ Pagos automáticos a afiliados via Stripe Connect (Fase 3)

---

## Despliegue (orden)

### 1. Migración SQL en Supabase

Ir a **Supabase > SQL Editor** y ejecutar:
```bash
supabase-network-marketing.sql
```

### 2. Seed de los 4 socios fundadores

Una vez que Dante, Flavio, Estefany y Pedro tengan cuenta en `auth.users`,
abrir el archivo `supabase-network-marketing.sql`, descomentar el bloque
`DO $$` al final, reemplazar los UUIDs y ejecutar.

Encontrar los UUIDs:
```sql
SELECT id, email FROM auth.users
WHERE email IN ('danteod99@gmail.com', '...', '...', '...');
```

Estructura final:
```
                 DANTE (top, founder)
                /                 \
            FLAVIO              ESTEFANY
            (left)               (right)
                                    \
                                  PEDRO
                                  (left bajo Estefany)
```

### 3. Variables de entorno (Vercel)

Verificar que estén:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL` (ej: `https://www.trustmind.online`)

### 4. Stripe webhook

El webhook ya escucha `invoice.paid` e `invoice.payment_succeeded`.
Verificar que estos eventos estén suscritos en el endpoint Stripe:
- Stripe Dashboard > Webhooks > endpoint
- Eventos: `customer.subscription.*`, `invoice.paid`, `invoice.payment_succeeded`,
  `invoice.payment_failed`

### 5. Smoke test

1. Login como Dante.
2. Ir a `/network`. Verificar que aparece el link y código.
3. Compartir el link con un email de prueba.
4. Registrar nueva cuenta usando el link.
5. Volver a `/network` como Dante. Verificar que el nuevo aparece en *Pendientes*.
6. Click en *Izquierda* o *Derecha* para colocar.
7. Verificar que ahora aparece en el árbol y en *Directos*.
8. Hacer pago de prueba con la cuenta nueva (Stripe test).
9. Verificar que en `/network` de Dante aparece la comisión de 15%.

---

## Endpoints API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/api/network/me` | Resumen completo de mi red (link, posición, directos, comisiones) |
| GET | `/api/network/referral-code` | Solo mi código y link de invitación |
| POST | `/api/network/place` | Sponsor coloca un pending en izq o der. Body: `{ user_id, leg }` |
| GET | `/r/{code}` | Short link público — setea cookie `ref` y redirige a `/` |
| POST | `/api/auth/register` | Acepta `ref` opcional → crea pending placement |
| POST | `/api/stripe/webhook` | Stripe → genera bono directo 15% |

---

## Tablas Supabase

| Tabla | Para qué |
|---|---|
| `network_referral_codes` | 1 código único por usuario |
| `network_positions` | Árbol binario: sponsor, placement_parent, leg, position_path |
| `network_pending_placements` | Signups esperando colocación del sponsor |
| `network_commissions` | Histórico de comisiones generadas |

---

## Funciones RPC

| Función | Para qué |
|---|---|
| `network_generate_referral_code(p_user_id)` | Crea/devuelve código único |
| `network_place_user(p_sponsor_id, p_user_id, p_leg)` | Coloca con spillover automático |
| `network_grant_direct_bonus(p_payer_id, p_payment_amount, p_invoice_id)` | Bono directo 15% al sponsor |

---

## Próxima iteración (Fase 2)

1. **Bono binario** — Cron mensual que calcula 10% sobre el volumen de la pata débil de cada usuario, con carry over.
2. **Matching** — 50% del binario de cada directo personal.
3. **Pool de rangos** — 5% del MRR repartido entre top performers.
4. **Compresión dinámica** — Si un upline está inactivo, sus comisiones bajan al siguiente activo.
5. **Dashboard avanzado** — Árbol visual interactivo (zoom, navegación).
6. **Pagos automáticos** — Stripe Connect para enviar comisiones aprobadas.
