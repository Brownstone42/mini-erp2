# CI: ตรวจ tests และ production build

Workflow อยู่ที่ `.github/workflows/ci.yml` ทำงานเมื่อ push, เปิด/อัปเดต pull request หรือกด Run workflow บน GitHub Actions เมื่อไฟล์อยู่ใน repository ที่เปิดใช้ Actions แล้ว

CI เปรียบเหมือนผู้ตรวจงานอัตโนมัติ: ทุกครั้งที่ส่งโค้ดขึ้น GitHub จะจัดเครื่องใหม่ ติดตั้งโปรเจกต์ และตรวจซ้ำด้วยข้อมูลสมมติ ถ้าขั้นใดผิดจะหยุดและแสดงสถานะไม่ผ่าน ไม่มีขั้น deploy หรือเชื่อม DBF

## สิ่งที่ตรวจ

1. ใช้ Node.js 22 และติดตั้ง dependencies ตาม `package-lock.json` ด้วย `npm ci --ignore-scripts` แล้วสร้าง Prisma client โดยตรง
2. ติดตั้ง Chromium สำหรับ Playwright
3. `npm run ci:check` สร้าง Next route types → ตรวจ TypeScript → Vitest → production build → Playwright
4. Browser tests ใน CI เปิดเว็บด้วย `next start` จาก build ที่เพิ่งสร้าง จึงตรวจแอปในโหมด production รวมถึงการบันทึกวันทบทวนลง PostgreSQL จริง ส่วนการทดสอบปกติบนเครื่องยังใช้ dev server
5. เก็บรายงาน JUnit, HTML และภาพ/trace เมื่อ browser test ล้มเหลว เป็น artifact 7 วัน แม้ขั้นตรวจไม่ผ่าน

ใช้ PostgreSQL 17 ชั่วคราว ชื่อ `mini_erp_test` ที่พอร์ต 55433 รหัสผ่านใน workflow เป็นค่าทดสอบเท่านั้น ไม่ใช่ secret ของฐานจริง ไม่ใช้ฐาน demo, `.env` บนเครื่อง หรือ `Y:\IG60` และไม่ส่ง image ไป registry

ตั้ง `forbidOnly` เพื่อไม่ให้เผลอส่ง `test.only` แล้วข้าม tests ที่เหลือ และใช้ browser worker เดียวเพราะ tests บางข้อเขียนวันที่ใน record เดียวกัน

## ทดลองขั้นตรวจบน Linux ในเครื่อง

```sh
docker compose -f compose.ci.yaml up --build --abort-on-container-exit --exit-code-from checks
```

คำสั่งคืน exit code ของขั้นตรวจ: 0 หมายถึงผ่าน ใช้ project `mini-erp2-ci` แยกจาก `mini-erp2-demo` ฐานเป็น tmpfs และไม่มีพอร์ตเปิดออก host; ตัวตรวจแชร์ network ของฐานเพื่อใช้ URL ทดสอบเดิมได้ ไม่ต้องหยุด demo ที่พอร์ต 3300

ก่อนปิดชุดทดสอบ สามารถเก็บรายงานในโฟลเดอร์ที่สร้างไว้ เช่น `test-results/ci-linux`:

```sh
docker compose -f compose.ci.yaml cp checks:/app/reports test-results/ci-linux/reports
docker compose -f compose.ci.yaml cp checks:/app/playwright-report test-results/ci-linux/playwright-report
docker compose -f compose.ci.yaml down
```

ฐานชั่วคราวถูกทิ้งเมื่อหยุด container การตรวจบนเครื่องนี้ทดสอบคำสั่งเดียวกับ workflow แต่ไม่ได้จำลอง event, token, cache หรือการอัปโหลด artifact ของ GitHub ต้องรันจริงบน GitHub เพื่อยืนยันส่วนเหล่านั้น

## วิธีอ่านผลบน GitHub

เปิด repository → Actions → Mini-ERP CI → เลือกรอบล่าสุด สีเขียวแปลว่าชุดตรวจผ่าน สีแดงให้เปิดขั้นที่ล้มเหลวเพื่ออ่าน log และดาวน์โหลด test-reports ที่ส่วน Artifacts ด้านล่าง เปิด `playwright-report/index.html` เพื่อดูรายละเอียด browser tests

การตั้งให้ห้าม merge เมื่อ CI ไม่ผ่านเป็น branch protection ของ repository แยกจาก workflow นี้ ยังไม่ได้ตั้ง และยังไม่มี ESLint ในโปรเจกต์: TypeScript check ไม่ใช่ lint

## สถานะการเปิดใช้งาน

ผลตรวจบนเครื่องวันที่ 10 พ.ย. 2026: actionlint ผ่าน; Linux Docker รัน `ci:check` จาก dependencies ที่ติดตั้งใหม่ ผ่าน TypeScript, Vitest 45 tests, production build และ Playwright 23 tests รวม migration และบันทึก/อ่านวันทบทวนกับ PostgreSQL จริง คำสั่งคืน exit code 0 รายงานเก็บใน `test-results/ci-linux/` (ไม่เข้า Git)

สร้าง [Brownstone42/mini-erp2](https://github.com/Brownstone42/mini-erp2) แบบ **public** ตามคำขอผู้ใช้แล้ว ใช้ branch `main` และ remote `origin` ชี้ไป repository นี้ การ push เริ่ม [CI ครั้งแรก](https://github.com/Brownstone42/mini-erp2/actions/runs/42820067852) โดยอัตโนมัติ

ผล CI จริงวันที่ 10 พ.ย. 2026 ของ commit `30dd528`: ทุกขั้นผ่าน รวม TypeScript, tests, production build และการอัปโหลด test reports สามารถเปิด run ด้านบนเพื่อตรวจ log และดาวน์โหลด artifact ได้

Git เก็บเวอร์ชันบนเครื่อง ส่วน GitHub เก็บเวอร์ชันที่ส่งขึ้นไป: หลังแก้ไฟล์ ให้ตรวจ `git diff` แล้วเลือกไฟล์ด้วย `git add <ไฟล์>` บันทึกด้วย `git commit -m "คำอธิบาย"` และส่งด้วย `git push` จากนั้นดูผลในแท็บ Actions ไฟล์ `.env`, ฐานข้อมูล local, dependencies และรายงานทดสอบไม่ถูกส่งขึ้น GitHub ตาม `.gitignore`
