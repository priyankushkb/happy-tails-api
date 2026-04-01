# Happy Tails API Deploy Checklist

## Before deploy
- [ ] Production database created
- [ ] DATABASE_URL set
- [ ] JWT_SECRET set to a strong secret
- [ ] CORS_ORIGINS set to real frontend/admin URLs
- [ ] NODE_ENV=production
- [ ] Backend build passes locally
- [ ] Prisma migrations committed

## Deploy steps
- [ ] Install dependencies
- [ ] Run `npm run prisma:deploy`
- [ ] Run `npm run build`
- [ ] Start server with `npm run start`

## After deploy
- [ ] Test `/api/health`
- [ ] Test admin login
- [ ] Test customer login
- [ ] Test booking creation
- [ ] Test admin booking status update
- [ ] Test customer/admin messaging
- [ ] Confirm audit logs are being written