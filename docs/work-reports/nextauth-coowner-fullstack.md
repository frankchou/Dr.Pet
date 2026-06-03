# 工作報告 — Google OAuth + 共同飼主功能
**角色：** fullstack-engineer  
**日期：** 2026-06-02  
**負責人：** Phase NextAuth + CoOwner 全端工程師

---

## 新增 / 修改的檔案

### 套件安裝
- `next-auth@^5.0.0-beta.31`
- `@auth/prisma-adapter@^2.11.2`
- `qrcode` + `@types/qrcode`

### Prisma Schema 變更
`prisma/schema.prisma`：
- `User` model — 新增 NextAuth 欄位（`name`, `email`, `emailVerified`, `image`）；`nickname` 改為可空（`String?`）
- 新增 `Account` model（NextAuth OAuth 帳號綁定）
- 新增 `PetMember` model（`petId + userId + role(owner/co_owner) + joinedAt`，`@@unique([petId, userId])`）
- 新增 `PetInvitation` model（`token @unique`, `targetEmail`, `status`, `expiresAt`, `acceptedAt`, `acceptedBy`）
- `Pet` model — 新增 `members PetMember[]` 和 `invitations PetInvitation[]` relations

### NextAuth 設定
- `src/lib/auth.ts` — NextAuth v5，Google Provider，JWT strategy，callbacks 注入 `user.id` → `token.id` → `session.user.id`
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler（GET + POST）
- `src/types/next-auth.d.ts` — 擴充 `Session.user.id` 型別宣告
- `src/components/layout/SessionProviderWrapper.tsx` — Client Component 包裝 `SessionProvider`
- `src/app/layout.tsx` — 加入 `SessionProviderWrapper`

### 認證流程改寫
`src/components/layout/ClientShell.tsx`：
- 移除 mock localStorage login
- 改用 `useSession()` 判斷登入狀態
- 未登入 → `signIn('google')` 啟動 OAuth flow
- 登入後同步 `session.user.id` 和 `session.user.name` 到 localStorage（保留相容性）
- `/invite` 公開路徑跳過登入檢查

### 授權 Helper
`src/lib/petAccess.ts`：
- `requirePetAccess(petId, userId)` → `{ ok: true; role }` 或 `{ ok: false; status; error }`
- 查 `PetMember` 確認存取權

### Pet 建立流程
`src/app/api/pets/route.ts`（POST）：
- 建立 Pet 後同步建立 `PetMember { role: "owner", userId: session.user.id }`

### 邀請 API
- `src/app/api/pets/[id]/invitations/route.ts` — GET（查邀請列表）、POST（建立邀請，targetEmail 必填，重複 email 防護，7 天有效期）
- `src/app/api/pets/[id]/members/route.ts` — GET（查成員列表，含 User 資料）
- `src/app/api/invite/[token]/route.ts` — GET 公開查詢（回傳 petName、inviterName、targetEmail、status、expiresAt）
- `src/app/api/invite/[token]/accept/route.ts` — POST 接受邀請（email 驗證、自我邀請防護、`upsert` 防重複成員）

### 邀請接受頁
- `src/app/invite/[token]/page.tsx` — Server Component，取邀請資訊，未登入自動導向 Google OAuth
- `src/app/invite/[token]/AcceptInviteClient.tsx` — Client Component，PurePaw 視覺，email 不符顯示錯誤

### 設定頁加入共同飼主管理
`src/app/settings/page.tsx`（新增 `CoOwnerSection` 元件）：
- 顯示現有共同飼主列表（從 `GET /api/pets/[id]/members`）
- 待接受邀請列表（從 `GET /api/pets/[id]/invitations`）
- Email 輸入欄 → POST 建立邀請
- QR Code 按鈕 → Modal 顯示 QR Code（`qrcode` 套件生成 base64 圖片）

### UI Layout 結構修復
`src/components/layout/AppShell.tsx`（新建）：
- 完整還原 Layout.jsx 結構：`h-[100dvh] overflow-hidden` 滾動容器
- Sticky 透明 header（頁面標題/副標 + 手機用戶頭像 + 鈴鐺，scroll fade 動畫）
- 桌面版白色圓角內容卡（`md:bg-white md:rounded-[40px] md:shadow-sm md:border`）
- Landing/Invite 路徑跳過 App chrome

---

## 主要實作決策

| 決策 | 理由 |
|---|---|
| JWT session 策略 | Turso 遠端 DB，避免每次請求 session lookup 的網路延遲 |
| `User.nickname` 改可空 | NextAuth adapter 建立 User 時不帶 nickname，不可為空會造成衝突 |
| `upsert` 防重複成員 | 接受邀請時若對方已是成員，不拋錯直接返回成功 |
| QR Code 用 base64 | 不需要額外 API endpoint，直接在 Client 生成 |
| `targetEmail` 必填 | 設計要求：指定對方 email 才能邀請，不支援通用連結 |

---

## Build 結果
`npm run build` ✅ 乾淨通過  
`npx tsc -b` ✅ 零型別錯誤
