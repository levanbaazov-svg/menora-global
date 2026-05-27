# Setup Checklist

Локально уже всё установлено и собрано. Осталось то, что я не могу сделать из Claude Code: настройки в Google Cloud Console и Hasura Cloud Console.

## 1. Google OAuth credentials

1. https://console.cloud.google.com/apis/credentials → выбери (или создай) проект.
2. **Configure consent screen** → External, fill in basic fields.
3. **Create Credentials → OAuth client ID → Web application**.
4. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - (later) `https://<your-vercel-url>`
5. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - (later) `https://<your-vercel-url>/api/auth/callback/google`
6. Copy **Client ID** + **Client secret** → `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

## 2. Hasura Cloud env vars

Hasura Cloud Console → выбери проект → **ENV VARS** (gear icon). Добавь:

### `HASURA_GRAPHQL_JWT_SECRET`
```json
{
  "type": "RS256",
  "jwk_url": "http://host.docker.internal:3000/api/auth/jwks",
  "claims_map": {
    "x-hasura-allowed-roles":         { "path": "$.hasura.allowed_roles",         "default": ["member"] },
    "x-hasura-default-role":          { "path": "$.hasura.default_role",          "default": "member"   },
    "x-hasura-user-id":               { "path": "$.sub" },
    "x-hasura-community-id":          { "path": "$.hasura.community_id",          "default": "00000000-0000-0000-0000-000000000000" },
    "x-hasura-allowed-community-ids": { "path": "$.hasura.allowed_community_ids", "default": "{}" }
  },
  "issuer": "menora-global",
  "allowed_skew": 30
}
```

> **Важно:** `jwk_url` должен быть **публично доступен** для Hasura Cloud. На время dev:
> - использовать `ngrok http 3000` и поставить `https://<ngrok-id>.ngrok-free.app/api/auth/jwks`
> - **или** поднять next.js на Vercel preview сначала, потом поставить ту URL
> - **или** временно использовать `HS256` со shared secret вместо RS256, мы поменяем потом

### `HASURA_GRAPHQL_UNAUTHORIZED_ROLE`
```
anonymous
```
Без этого запросы без JWT будут отвергнуты, а нам нужно чтобы `anonymous` мог резолвить community по slug для landing page.

### (рекомендую) `HASURA_GRAPHQL_ENABLE_CONSOLE`
```
true
```
для удобства dev. Перед production — выключить.

После добавления Hasura перезапустит инстанс автоматически (~30 сек).

## 3. Seed: создать общину + админа

После того, как заполнил Google CLIENT_ID/SECRET в `.env`:

```bash
npm run seed -- you@example.com --community-slug=menorah-tlv --community-name="Menorah Tel Aviv"
```

Это создаст:
- Community `menorah-tlv`
- User с твоим email (заготовка)
- Membership: role=admin, status=active

Когда ты потом войдёшь через Google с этого email — next-auth найдёт существующего user'а (upsert на email) и при формировании JWT увидит активный admin-membership.

## 4. Local dev

```bash
npm run dev          # http://localhost:3000
```

Открой `/` → "Continue with Google" → авторизуйся → вернёшься на `/` с info о session.

Проверь JWKS endpoint:
```bash
curl http://localhost:3000/api/auth/jwks | jq
```

Должно вернуть `{ keys: [{ kty: "RSA", ... }] }`.

## 5. Пригласить кого-то

```bash
npm run invite -- --community=menorah-tlv --email=guest@x.com --role=member
```

Выведет magic link типа `http://localhost:3000/invite?token=...` — отправь приглашаемому. UI для `/invite` ещё надо сделать (на следующей итерации).

## 6. Tooling reference

| Command | Что делает |
|---|---|
| `npm run dev` | Запустить Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TS без эмита |
| `npm run migrate:up` | Применить все непримененные миграции |
| `npm run migrate:list` | Список миграций со статусом |
| `npm run migrate:down` | Откатить последнюю |
| `npm run metadata:apply` | Пересобрать relationships+permissions в Hasura |
| `npm run keys:generate` | Сгенерировать новые JWT keys (раз) |
| `npm run seed -- <email>` | Создать общину + admin |
| `npm run invite -- --community=<slug> --email=<x>` | Выписать invite |

## 7. Что осталось доделать (следующая итерация)

- UI для `/invite` route (читает токен из URL, шлёт POST в `/api/invitations/accept`)
- Multi-step onboarding wizard (8 шагов из MVP-плана)
- Community switcher в header (если user в нескольких общинах)
- Events + RSVP UI
- Requests board UI
- Routines + Check-ins UI
- Rabbi dashboard (pending memberships, audit log)
- Production hardening: allow-lists, rate limits, disable introspection
- Deploy на Vercel
