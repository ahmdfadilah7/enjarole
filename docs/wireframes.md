# EnjaRole — Wireframes

## 1. Login Page (`/login`)

```
┌─────────────────────────────────────┐
│           [EnjaRole Logo]           │
│                                     │
│   Email    [________________]       │
│   Password [________________]       │
│                                     │
│          [ Masuk ]                  │
│                                     │
│   Belum punya karakter? Daftar      │
└─────────────────────────────────────┘
```

## 2. Register + Onboarding (`/register`)

**Step 1 — Account**
```
Email, Password, Confirm Password → [Lanjut]
```

**Step 2 — Character Identity**
```
Display Name, Username (@), Avatar upload → [Lanjut]
```

**Step 3 — Character Lore**
```
Bio (short), Backstory (long), Personality traits (tags) → [Buat Karakter]
```

## 3. Feed Page (`/feed`)

```
┌──────────────────────────────────────────────────┐
│ [Logo]  [Search]  [Home][DM][Notif][Profile]     │
├──────────────────────────────────────────────────┤
│  (○)(○)(○)(○)  Story rings                       │
├──────────────────────────────────────────────────┤
│  [Following] [Explore]                           │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │ @username · 2h ago                         │  │
│  │ Post content text here...                  │  │
│  │ [══════════ image ══════════]              │  │
│  │ ♥ 24   💬 5                                │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │ ...more posts...                           │  │
│  └────────────────────────────────────────────┘  │
│  [+ Create Post FAB]                             │
└──────────────────────────────────────────────────┘
```

## 4. Character Profile (`/@username`)

```
┌──────────────────────────────────────┐
│  (avatar)  Display Name              │
│            @username                 │
│  Bio text here...                    │
│  Backstory expandable...             │
│  [Follow] [Message]                  │
│  120 posts · 500 followers · 80 following │
├──────────────────────────────────────┤
│  [Posts Grid — 3 columns]          │
│  [img] [img] [img]                   │
│  [img] [img] [img]                   │
└──────────────────────────────────────┘
```

## 5. Direct Messages (`/messages`)

```
┌──────────────┬───────────────────────────────┐
│ Conversations│  @username                    │
│              │  ─────────────────────────    │
│ @user1       │  Their message bubble           │
│ @user2  ●    │              My message bubble│
│ @user3       │  Their message bubble           │
│              │  ─────────────────────────    │
│              │  [Type a message...] [Send]   │
└──────────────┴───────────────────────────────┘
```

## 6. Story Viewer (fullscreen overlay)

```
┌──────────────────────────────────────┐
│ ████████████ progress bar ██████████ │
│                                      │
│  @username · 3h ago                  │
│                                      │
│         [ Fullscreen Image ]         │
│                                      │
│  ← tap left    tap right →           │
└──────────────────────────────────────┘
```

## 7. Notifications (`/notifications`)

```
┌──────────────────────────────────────┐
│  Notifications                       │
├──────────────────────────────────────┤
│  ● @user liked your post      2m     │
│  ● @user started following    1h     │
│  ○ @user commented on post    3h     │
└──────────────────────────────────────┘
```
