# Database Schema (Firestore)

## Collections

### `users`
Stores user profile and role information.
```json
{
  "uid": "string (auth uid)",
  "email": "string",
  "displayName": "string",
  "role": "free | vip | superadmin",
  "createdAt": "timestamp",
  "vipExpiresAt": "timestamp (optional)",
  "settings": {
    "theme": "dark | light"
  }
}
```

### `websites`
Stores generated websites.
```json
{
  "id": "string (uuid)",
  "userId": "string (ref: users.uid)",
  "name": "string",
  "subdomain": "string",
  "url": "string",
  "status": "live | draft",
  "createdAt": "timestamp"
}
```

### `payment_pages`
Stores payment page configurations.
```json
{
  "id": "string (uuid)",
  "userId": "string (ref: users.uid)",
  "title": "string",
  "slug": "string",
  "methods": [
    {
      "id": "dana | ovo | ...",
      "name": "string",
      "value": "string (number/id)"
    }
  ],
  "createdAt": "timestamp"
}
```

### `testimonials`
Stores user testimonials.
```json
{
  "id": "string (uuid)",
  "userId": "string (ref: users.uid)",
  "product": "string",
  "specs": "string",
  "price": "string",
  "image": "string (url)",
  "createdAt": "timestamp"
}
```

### `linktrees`
Stores bio page profiles.
```json
{
  "id": "string (uuid)",
  "userId": "string (ref: users.uid)",
  "name": "string",
  "bio": "string",
  "image": "string (url)",
  "links": [
    {
      "id": "string",
      "title": "string",
      "url": "string"
    }
  ],
  "createdAt": "timestamp"
}
```

### `system_logs`
Stores system events for admin.
```json
{
  "id": "string",
  "type": "login | push | error | admin_action",
  "userId": "string",
  "details": "string",
  "timestamp": "timestamp"
}
```
