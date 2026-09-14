# Backend API README

This file documents backend endpoints needed by this frontend.

## Base URL

- Current frontend default uses: `http://localhost:8000`
- Recommended env setup for future:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`

## Live Endpoints (Already Used by Frontend)

## 1. Student Registration

- Method: `POST`
- Path: `/students`
- Content-Type: `application/json`

Request body:

```json
{
  "full_name": "string",
  "student_id": "string (exactly 10 digits)",
  "email": "string (frontend sends lowercase)",
  "password": "string",
  "phone_number": "string",
  "hall_name": "string",
  "department": "string"
}
```

Frontend validation rules before request:

- `student_id` must match `^[0-9]{10}$`
- all fields are required

Success response expected by frontend:

- Any `2xx` status is treated as success
- Body is optional

Error response expected by frontend:

```json
{
  "message": "string (optional)",
  "error": "string (optional)"
}
```

Frontend behavior:

- Shows `message` first, then `error`, else fallback text

## 2. Student Login

- Method: `POST`
- Path: `/students/login`
- Content-Type: `application/json`

Request body:

```json
{
  "student_id": "string (exactly 10 digits)",
  "email": "string (frontend sends lowercase)",
  "password": "string"
}
```

Frontend validation rules before request:

- `student_id` must match `^[0-9]{10}$`
- `email` and `password` required

Success response expected by frontend:

```json
{
  "message": "string (optional)",
  "full_name": "string (optional)",
  "name": "string (optional)",
  "student": {
    "full_name": "string (optional)",
    "name": "string (optional)"
  }
}
```

Notes:

- frontend uses `student.full_name`, `student.name`, `full_name`, or `name` as display name
- if none exists, frontend still logs in with default role name

Error response expected by frontend:

```json
{
  "message": "string (optional)",
  "error": "string (optional)"
}
```

## cURL Quick Test

Registration:

```bash
curl -X POST http://localhost:8000/students \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"Test Student",
    "student_id":"1234567890",
    "email":"test@student.com",
    "password":"secret123",
    "phone_number":"01700000000",
    "hall_name":"Sher-e-Bangla Hall",
    "department":"CSE"
  }'
```

Login:

```bash
curl -X POST http://localhost:8000/students/login \
  -H "Content-Type: application/json" \
  -d '{
    "student_id":"1234567890",
    "email":"test@student.com",
    "password":"secret123"
  }'
```

## Planned Endpoints (Frontend Features Still Local Storage Based)

These are recommended backend endpoints for features already present in UI logic.

## 1. Approval Queue

- `GET /admin/approvals`
- `POST /admin/approvals`
- `PATCH /admin/approvals/{requestId}`

Used for:

- kitchen registration approval
- delivery registration approval
- food listing approval

## 2. Kitchen Menu

- `GET /kitchens/{kitchenUserId}/menu`
- `POST /kitchens/{kitchenUserId}/menu`
- `PATCH /kitchens/{kitchenUserId}/menu/{foodId}`
- `DELETE /kitchens/{kitchenUserId}/menu/{foodId}`
- `PATCH /kitchens/{kitchenUserId}/menu/{foodId}/approval`

## 3. Food Browse Catalog

- `GET /foods`

Suggested query params:

- `search`
- `providerType` (`Hall`, `Campus Kitchen`, `Student Homemade`)
- `minPrice`
- `maxPrice`
- `sortBy` (`rating`, `price`, `popularity`)
- `freeDelivery`
- `pointsOnly`
- `page`
- `limit`

## 4. Cart + Checkout

- `GET /students/{studentUserId}/cart`
- `PUT /students/{studentUserId}/cart`
- `POST /orders`

## 5. Delivery Orders

- `GET /delivery-orders`
- `POST /delivery-orders/{orderId}/accept`
- `POST /delivery-orders/{orderId}/complete`
- `POST /delivery-orders/{orderId}/forward-to-paid`

Expected frontend workflow:

- new student orders enter the `free-first` queue
- approved free partners can accept within 5 minutes of order creation
- after 5 minutes, admin can forward unclaimed orders to the paid/permanent queue

## 6. Student Points

- `GET /students/{studentUserId}/points`
- `POST /students/{studentUserId}/points/redeem`
- `POST /students/{studentUserId}/points/transfer`
- `POST /students/{studentUserId}/points/bonus`
- `POST /students/{studentUserId}/activate-free-delivery`

Frontend note:

- point expiry is currently hidden/disabled in the product experience

## 7. Hall Fest (Hall Kitchen)

- `GET /kitchens/{kitchenUserId}/hall-fests`
- `POST /kitchens/{kitchenUserId}/hall-fests`
- `PATCH /kitchens/{kitchenUserId}/hall-fests/{festId}`
- `DELETE /kitchens/{kitchenUserId}/hall-fests/{festId}`

## 8. Session/Profile (Optional)

- `GET /auth/me`
- `PATCH /students/{studentUserId}/profile`

## Suggested Standard Error Shape

Use a consistent JSON error body:

```json
{
  "message": "Human readable error",
  "error": "Optional machine code"
}
```
