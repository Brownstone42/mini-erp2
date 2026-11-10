# รัน Mini-ERP R2 ด้วย Docker Compose

ชุดนี้สำหรับตรวจรับบนเครื่องด้วยข้อมูลสมมติ เปิดเว็บเฉพาะ localhost ไม่มีการเชื่อม DBF และไม่มีการย้ายข้อมูลจากฐานพัฒนาเดิม

## โครงสร้าง

- `compose.docker.yaml` ใช้ชื่อโปรเจกต์ `mini-erp2-demo` แยกจาก `compose.yaml` เดิม
- `app`: Next.js production standalone ฟังที่ `127.0.0.1:3300` บนเครื่อง
- `db`: PostgreSQL 17 ฐาน `mini_erp_docker` ไม่มีการเปิดพอร์ตฐานข้อมูลออกบนเครื่อง ใช้ network ภายใน Docker
- `migrate`: รอฐาน healthy แล้วรัน Prisma migrations; แอปรอ migration สำเร็จก่อนเริ่ม
- named volume `mini-erp2-demo_review_data` เก็บฐานข้อมูลแยกจากอายุ container
- `.env`, `.local-postgres`, Windows node_modules และ generated client เดิมไม่เข้า image; สร้าง Prisma client ใหม่บน Linux
- health endpoint `/api/health` อ่านตารางจริงผ่าน Prisma ตอบ 200 เมื่อพร้อม และ 503 เมื่อฐาน/ตารางไม่พร้อม โดยไม่ส่งรายละเอียด error ของฐานออกมา

ฐานทางสำรองเดิมที่พอร์ต 55432/55433 และข้อมูลใน `.local-postgres` ไม่ถูกใช้โดยชุดนี้ วันทบทวนเดิมจึงไม่ได้ถูกคัดลอกมาอัตโนมัติ ในฐาน Docker จะเริ่มว่างเมื่อสร้าง volume ครั้งแรก

## เปิดและปิด

ต้องเปิด Docker Desktop และให้ Engine พร้อมก่อน จากโฟลเดอร์โปรเจกต์:

```sh
npm run docker:up
npm run docker:status
```

เปิด http://127.0.0.1:3300 คำสั่ง up จะ build image, สร้างฐาน, apply migration และรอ health checks

```sh
npm run docker:down
npm run docker:up
```

`down` เอา containers และ network ออก แต่คง named volume ไว้ จึงสร้าง containers ใหม่และอ่านวันเดิมกลับได้ ห้ามเพิ่ม `-v` / `--volumes` ถ้าต้องการรักษาข้อมูล เพราะเป็นคำสั่งลบ volume ฐานข้อมูล

ถ้าต้องการหยุดชั่วคราวโดยไม่เอา containers ออก:

```sh
docker compose -f compose.docker.yaml stop
docker compose -f compose.docker.yaml start
```

ดู log:

```sh
docker compose -f compose.docker.yaml logs --tail 100 app migrate db
```

## ทดสอบการเก็บวันทบทวน

เปิดชุด Docker แล้วรัน:

```sh
npm run test:docker
```

คำสั่งนี้ใช้ฐาน Docker demo จริง และเปลี่ยนวันของ VINYL-001 เป็น **25 พ.ย. 2026** โดย:

1. ตรวจยอดสมมติ 150/180/70 ผ่านหน้าเว็บ production แล้วบันทึกวันด้วยฟอร์ม
2. อ่าน PostgreSQL แยกเพื่อยืนยันว่าบันทึกแล้ว
3. ปิด browser และทำ compose down โดยไม่มี `-v`
4. สร้าง containers ใหม่ด้วย up ตรวจว่า container IDs เปลี่ยน และฐานยังมีวันเดิม
5. เปิด browser ใหม่ ตรวจวันและหน้ารายละเอียดค้างส่ง รวมถึง health endpoint

ผล JSON และภาพก่อน/หลังอยู่ `test-results/docker/` ทดสอบนี้ไม่ล้างฐานพัฒนาเดิม และจงใจเก็บวันตัวอย่างไว้ในฐาน Docker ให้เปิดดูต่อได้

## ผลตรวจครั้งแรก

- Build Next.js production ใน Linux image สำเร็จ และ Prisma migration สำเร็จ (exit 0)
- แอปและ PostgreSQL healthy; เปิดพอร์ตเว็บเฉพาะ `127.0.0.1:3300` ฐานไม่มี host port
- `npm run test:docker` ผ่าน: บันทึก 25 พ.ย. 2026 ผ่านฟอร์ม ตรวจ SQL แล้วทำ down/up; IDs ของ app และ db เปลี่ยน แต่วันเดิมยังอยู่ทั้ง SQL และ browser ใหม่
- ยอดสมมติ 150/180/70 หน้ารายละเอียดค้างส่ง และ health endpoint ผ่าน ตรวจภาพหลังเปิดใหม่แล้ว
- `npm test` ผ่าน 45 tests และ `npm run typecheck` ผ่าน ไม่ได้รัน browser suite R2 ทั้งชุดซ้ำในรอบนี้ เพราะไม่ได้แก้พฤติกรรม R2; ใช้ smoke/persistence test บน production Docker เพิ่มเติม

## Configuration และขอบเขตการใช้งาน

รหัสผ่านเริ่มต้น `docker_local_only` ใช้เฉพาะชุด local demo นี้ เปลี่ยนได้ด้วย environment variable `DOCKER_DB_PASSWORD` ก่อนเปิดครั้งแรก (ใช้ตัวอักษร/ตัวเลขเพื่อไม่ต้อง URL-encode) ถ้า volume ถูกสร้างแล้ว การเปลี่ยน environment ไม่เปลี่ยนรหัสผ่านในฐานเดิม ต้องจัดการรหัสผ่านฐานให้ตรงกันด้วย

เว็บยังเป็น demo ไม่มี login และไม่ได้เปิดรับจากเครือข่ายภายนอก ขั้น CI/CD, registry, staging, backup/restore และ rollback ยังเป็นงานถัดไป named volume ช่วยให้ข้อมูลอยู่หลังเปลี่ยน container แต่ไม่ใช่ backup

อ้างอิง [ลำดับเริ่มบริการของ Compose](https://docs.docker.com/compose/how-tos/startup-order/) และ [การคงข้อมูลด้วย Compose volume](https://docs.docker.com/compose/gettingstarted/)
