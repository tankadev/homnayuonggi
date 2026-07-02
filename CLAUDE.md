# Today Uống Gì? — project brief

Vietnamese collaborative group-ordering web app for food delivery (Shopee Food / Now.vn).
Users join a **room**, one person creates a **bình chọn** (delivery poll) with a shop URL,
everyone in the room **places orders** from that menu in real time, the order person
finalises the bill, then everyone **splits & marks paid**.

## Project status — redesign in progress

- **Phase 1 done (May 2026)**: full visual redesign of the **place-order** screen using a
  new design system (10-palette theme switcher, Be Vietnam Pro, managed 3-col scroll).
  Phase 1 lives at `src/app/` and uses **mock data only** — no Firebase writes yet.
- **Legacy code preserved** at `src/app-legacy/` for reference (NOT bootstrapped, not
  built). Use it to read original component logic, pipes, dialog wiring, etc. when
  rebuilding subsequent screens.
- **ng-zorro removed.** Phase 2+ rewrites everything in plain HTML/CSS — do NOT add
  ng-zorro back. See `src/styles/` for tokens + palettes + animations.
- **Plan file**: `~/.claude/plans/playful-plotting-unicorn.md` has the Phase 1 plan and
  the deferred items (vote feature was dropped; per-user theme sync, real Firebase
  wiring for cart/history/notes, remaining screens — all Phase 2+).

Stack (current): Angular 19 (standalone:false, NgModules) · @angular/fire 19 ·
Firebase Realtime Database (NOT Firestore) · Firebase Cloud Messaging · SCSS only.
No router — root template renders header + place-order directly in Phase 1. Phase 2
restores state-flag switching for login/rooms/create-delivery/split-money.

Below documents the **legacy** data model and screens — Phase 2 will reuse the same
RTDB shapes, so this is still the source of truth for Firebase data.

## Run

```
npm start          # ng serve → http://localhost:4200
npm run build      # ng build (uses environment.prod.ts)
```

Node 22.x. `useEmulators` is `true` in dev `environment.ts` but the codebase doesn't
actually wire emulators — points at the live Asia-Southeast1 DB either way. Be careful.

## Firebase

- Project: `homnaychonmongi`
- RTDB: `https://homnaychonmongi-default-rtdb.asia-southeast1.firebasedatabase.app`
- Remote Config key `api_url` overrides `environment.apiURL` at runtime
  (fallback: prod `https://todayuonggi-api.vilinga.com`, dev `http://localhost:3000`)
- Auth: **none**. Identity is a self-declared username stored in localStorage
  (`user_info`). Rooms are gated by an AES-encrypted password (master key
  `environment.pwd = 'EMBEXINHDEP'`, via `crypto-js`).

## RTDB data model

All paths are top-level. `key` is the Firebase auto-id pushed by the client and stored
back inside the record. Cross-references are by these `key` strings.

### `/rooms` — RoomRO
```
key          string
name         string
description  string
password     string     // AES-encrypted with environment.pwd
isPrivate    boolean
createUser   string     // → /users key
unPaidPayment?: string
```
Service: `RoomsService` — `getAll()` (live), `create(RoomDTO)`, `update(key, value)`.

### `/users` — UserRO
```
key          string
username     string     // /^[a-z]*$/, unique
displayName  string
phone?       string
payment?     UserPaymentModel[]   // [{label, value, disabled?, checked?}]
fcmToken?    string
```
Service: `UserService` — `getAll()` (live), `create(UserDTO)`, `update(key, value)`.

### `/orders` — OrderRO (one record per dish ordered in a room)
```
key        string
roomKey    string                 // → /rooms key
dish       Dish                   // from Shopee Food scrape (id, name, price, photos, …)
userNotes  { userId, content, quantity }[]
```
Service: `OrderService` — `getListOrders()` (live), `addOrder`, `updateOrder(key,…)`,
`deleteOrder(key)`, `deleteAllListOrders()` (purges every order whose roomKey matches the
currently selected room — used on "Hủy bình chọn" / delivery reset).

### `/orderDetail` — OrderDetailRO (singleton, **not** a collection)
Aggregated totals for the current order session. Shared across the room.
```
lastPrice       number
totalPrice      number
sponsorUserId   string[]
sponsorPrice    number
```
Service: `OrderService` — `getOrderDetail()`, `createOrderDetail`, `updateOrderDetail`,
`removeOrderDetail`. ⚠️ Because this is a single doc, two rooms ordering simultaneously
will collide. Likely a bug to fix during the redesign.

### `/ordersHistory` — OrderHistoryRO (activity log per room)
```
key        string
action     number       // 0 = add, 1 = remove
userId     string       // → /users key
dishName   string
createAt   string       // ISO
roomKey    string       // → /rooms key
```
Service: `OrderHistoryService` — `getAll()` (live), `create`, `update(key,…)`,
`removeAll()` (purges entries for current room).

### `/deliveries` — DeliveryRO (one active poll per room at a time)
```
key              string
roomKey          string                       // → /rooms key
userCreate?      string                       // → /users key (creator of the poll)
assignUserId?    string                       // → /users key (collects payment)
isEdit?          boolean                      // form is open
isCreate?        boolean                      // poll committed (menu fetched)
isCompleted?     boolean                      // moved to split-money phase
createDateTime?  string                       // ISO
remainingTime?   number                       // ms countdown
delivery?        DeliveryDetailNowAPI         // scraped restaurant + menu + vouchers
shippingFee?     number
serviceFee?      number
sponsorPrice?    number
splitMoney?      { type: 0|1|2, sponsorUserId }   // 0 = chia đều, 1 = sponsor trọn, 2 = ?
deliveryStatus?  number                       // 1 = delivering, 2 = received
```
Service: `DeliveryService` — `getAll()` (live), `create(DeliveryDTO)`,
`update(key, value)`, `remove(key)`,
`getDetailDeliveryFromShopeeFoodApi(url)` → HTTP `GET {apiURL}/get-detail?url=…` to the
external scraper (`vilinga.com` in prod).

Lifecycle flags drive the UI router:
`isCreate=false` → show **create-delivery** ·
`isCreate=true && !isCompleted` → **place-order** ·
`isCompleted=true` → **split-money**.

### `/paymentsPaid` — PaymentPaidRO (one record per finalised delivery, chia-đều case)
```
key              string
deliveryId       string           // → /deliveries key
roomId           string           // → /rooms key
orderDate        string           // ISO
userOrderId      string           // → /users key (order person, the one who collects)
deliveryName     string
deliveryAddress  string
totalBill        number
usersPaid        { userId, moneyPaid, isPaid }[]
```
Service: `PaymentPaidService` — `getAll()` (live), `create`, `update(key,…)`,
`remove(key)`. When every `usersPaid[].isPaid === true` the record is removed.

### `/wheelSpins` — WheelSpinRO (lucky-wheel anti-cheat log, per delivery)
One record per spin (incl. re-spins) so members can watch the result feed live.
Only the orderer writes; wiped when a new order starts.
```
key            string
roomKey        string     // → /rooms key
deliveryId     string     // → /deliveries key
spinnerId      string     // → /users key (must be the orderer)
winnerId       string     // → /users key picked by this spin
winnerName     string     // denormalised for display
candidateCount number     // people on the wheel for this spin
createAt       string     // ISO
```
Service: `WheelSpinService` — `getAll()` (live), `create`, `removeOne(key)`,
`removeForDelivery(deliveryId, spins)` (called from payment-review `cleanupForNextPoll`).

### `/waterHistory` — WaterHistoryRO ("ai đã từng đi lấy nước", per room, max 20)
Long-lived; written when the orderer confirms the wheel result. NOT cleared per order.
```
key         string
roomKey     string                     // → /rooms key
deliveryId  string                     // → /deliveries key
spinnerId   string                     // → /users key (orderer who confirmed)
winners     { userId, name }[]         // people chosen to fetch drinks
spinCount   number                     // spins before confirming — anti-cheat signal
createAt    string                     // ISO
```
Service: `WaterHistoryService` — `getAll()` (live), `create(dto, existingForRoom)`
(pushes then trims the room back to `MAX_PER_ROOM = 20`), `removeForRoom(roomKey, list)`.

### External: ShopeeFood scraper
`GET {apiURL}/get-detail?url={shopeeFoodUrl}` → `DeliveryDetailNowAPI`
(restaurant info, menus, dishes, vouchers, result status). Wired in `DeliveryService`.

### External: FCM push
`FcmService.sendNotificationWhenDeliverySuccess(tokens[])` POSTs to backend
`/send-message-delivery-success`. Tokens are read from `/users/*/fcmToken`.
Service worker: `src/firebase-messaging-sw.js`.

## localStorage keys (`src/app/const/local-storage.ts`)

| key                  | value                              |
| -------------------- | ---------------------------------- |
| `user_info`          | current `UserRO`                   |
| `user_list`          | mirror of `/users`                 |
| `rooms_list`         | mirror of `/rooms`                 |
| `selected_room`      | current `RoomRO`                   |
| `room_pwd_list`      | `[{ key, pwd }]` AES-encrypted     |
| `delivery_list`      | mirror of `/deliveries`            |
| `orders_list`        | mirror of `/orders`                |
| `order_info`         | current draft `OrderRO`            |
| `orders_history`     | mirror of `/ordersHistory`         |
| `payment_paid_list`  | mirror of `/paymentsPaid`          |
| `fcm_token`          | string                             |

`LocalStorageService` is the only place that reads/writes these — go through it.

## App shell — state-driven, no router

`app-routing.module.ts` is empty. `app.component.html` switches by flags:

```
header (always)
└─ !isLoginIn               → <need-login>
   └─ !isSelectedRoom       → <rooms>
      └─ delivery.isCreate?
         ├─ !isCompleted    → <place-order [deliveryInfo]>
         └─ isCompleted     → <split-money [deliveryInfo] [paymentPaid]>
         (else)             → <create-delivery [deliveryInfo] [user]>
```

Flags live in `AppService` (`getLoginStatus`, `getSelectedRoomStatus`,
`getDeliveryStatus`), backed by `LocalStorageService`. `AppComponent` subscribes to
`/deliveries`, `/orders`, `/ordersHistory`, `/paymentsPaid` on init and writes each
snapshot into localStorage — every child component reads through the storage service.

## Screens (folders under `src/app/ui/`)

- **need-login/** — login gate, shows `<drink-animate>`, opens `JoinToAppComponent`.
- **rooms/** — room grid + "Add room" → `CreateRoomComponent`. Click private room →
  `JoinRoomPwdComponent`. Pipes: `findRoomInOrders`, `deliveryDetail`.
- **header/** — global bar: room name + edit (if creator, gated by `*isAllow`),
  refresh API URL (Remote Config reload), unpaid drawer trigger, user avatar,
  quit-room, logout.
- **create-delivery/** — "TẠO BÌNH CHỌN" button → spawns Delivery with `isEdit=true`.
  Child `create-delivery-form` fetches the shop menu via the scraper and sets
  `assignUserId` + `remainingTime`.
- **place-order/** — 3-col layout. Left: `shop-info`, `history-order`. Center:
  `list-dish` (add to cart → upserts `OrderRO`). Right: `list-order` (live order list,
  countdown, "Chọn xong" / "Hủy bình chọn" / "Thanh toán" — last opens
  `PlaceOrderDialogComponent` 2-step wizard that writes fees, split type, payment
  methods and emits `PaymentPaidDTO`).
- **split-money/** — 3-col layout. `info-user-payment` (order person + payment QR/info),
  `info-order` (delivery summary), `info-payment` (per-user breakdown — handles both
  type-0 chia-đều prorating and type-1 sponsor-all). `list-split-money` is the right
  column, only present when a `PaymentPaidRO` exists; checkboxes there call
  `PaymentPaidService.update()`.
- **unpaid-list/** — header drawer; tabbed view of every open `PaymentPaidRO` involving
  the current user, with mark-paid checkboxes gated by `isAllow`.
- **dialogs/** — `join-to-app`, `create-room`, `join-room-pwd`, `place-order-dialog`,
  `note-dialog`, `confirm-dialog`.
- **cat-animate/**, **drink-animate/** — decorative inline SVGs (empty / login states).

## Permissions

Pure client-side, no server enforcement:

- `*isAllow="userId"` (directive) / `userId | isAllow` (pipe) — visible/true only when
  `userId === current user_info.key`. Gates room edit, "mark paid" checkboxes, etc.
- `delivery | isUserPermission:user` — true if user is `userCreate` OR `assignUserId`.
  Gates "Chọn xong" / "Hủy bình chọn" / "Thanh toán" actions.

⚠️ Anyone with DB write access can bypass these. If extending features, keep this in
mind — there is no security-rules layer documented in this repo.

## Pipes (`src/app/share/`)

Lookup / formatting: `displayNameUser`, `displayUserInfo`, `displayImage`,
`displayOption`, `firstCharOfEachWord`, `formatNameTo2Char`, `processTime`,
`displayTabNameUnpaid`.
Filter / aggregate: `deliveryDetail` (delivery for a room), `findRoomInOrders`,
`totalOrder`, `dishTotalQuantity`, `displayUserOrder`, `paymentPaidByRoom`,
`unPaidListByRoom`, `unpaidListSort`, `unpaidUserList`.
Auth: `isAllow`, `isUserPermission`.

## Theme & visual language (current)

- Font: **Dosis** (200–700, self-hosted in `assets/fonts/`).
- ng-zorro primary: `#407F55` (forest green) — see `styles.less`.
- Modal accent: header bg `#F7E0E5`, title `#C73050`, radius `20px`.
- Select inputs: bg `#F9FAFE`, border `#ECF3FE`, hover blue tint.
- Animations: `showOut` (scale 0→1), `moveIn` (slide-in from right).
- Icons via `@ant-design/icons-angular` (registered in `app.module.ts`/`zoro.module.ts`).
- Empty / hero states use the SVG cat & drink components.

The redesign should preserve the state-driven layout switching above unless we
explicitly introduce real routing — many pipes and storage paths assume "single
selected room, single active delivery."

## Conventions

- **DTO** = payload sent up to RTDB (`src/app/dto/`).
- **RO** = response object read back from RTDB (`src/app/ro/`).
- **model** = client-only helper types (`src/app/models/`).
- Components are NgModule-based (`standalone: false`) and registered in `app.module.ts`.
- Vietnamese in UI strings — keep it. Tech identifiers stay English.
- No tests in the repo despite karma config; don't add a test gate to PRs unless asked.

## Known smells worth fixing during the redesign

- `/orderDetail` is a singleton — collides across rooms (see above).
- Empty `app-routing.module.ts` — deep links / refresh-to-same-screen don't work.
- `useEmulators: true` in dev env is unused — misleading.
- All AES room passwords share one hard-coded master key in `environment.ts`.
- No RTDB security rules referenced; client-only permission gating.
- `unpaid_payment` flag on Room exists but unclear who writes it.

## Next steps

User will deliver new UI mockups. Once received, plan the redesign on top of the
existing state machine and Firebase paths above — most data shapes can stay; UI
components can be rewritten freely. Discuss whether to also: (a) introduce the Angular
router, (b) fix the `/orderDetail` singleton, (c) tighten room-password security,
(d) add new features (multi-active deliveries per room? per-dish notes? archive view?).
