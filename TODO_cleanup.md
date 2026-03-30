# TODO - CLEANUP FILES DƯ THỪA

## Files XÓA NGAY:

```
rm backend/database.js          # SQLite cũ
rm backend/fix-admin.js         # Script 1 lần
rm backend/update_db.js         # Script 1 lần
rm -rf "backend/DoAn1"          # Project cũ trống
rm package.json package-lock.json # Root trống
rm frontend/text.html           # File test
```

## Sau cleanup:

```
✅ Giữ: backend/server.js + backend/package*.json
✅ Giữ: frontend/ full (html/js/css/images)
✅ .gitignore += node_modules/ .env
```

**Chạy lệnh trên → Project clean 95%!**
