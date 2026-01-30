# แนะนำฟีเจอร์เพิ่มเติมสำหรับ Sawrin (Roadmap)

จากการวิเคราะห์เอกสาร Architecture และ Heuristics ปัจจุบัน นี่คือฟีเจอร์ที่แนะนำให้พัฒนาเพิ่มเพื่อให้ Sawrin มีความสมบูรณ์และใช้งานได้จริงในระดับ Production มากขึ้น

## 1. Configuration File Support (`.sawrinrc`)

ปัจจุบัน Sawrin ใช้ "Convention over Configuration" แต่ในโปรเจคจริงมักมีข้อยกเว้น
**สิ่งที่ควรเพิ่ม:**

- รองรับไฟล์ config เช่น `.sawrinrc.json` หรือ `sawrin.config.ts`
- กำหนด `ignorePatterns` สำหรับไฟล์ที่ไม่ต้องการวิเคราะห์
- ปรับแต่ง Risk Weights ได้เอง (เช่น บางทีมอาจมองว่าแก้ไฟล์ config ไม่เสี่ยงมาก)
- กำหนด Folder Mapping เองได้ (กรณีไม่ได้วาง structure ตามมาตรฐาน)

## 2. CI/CD Integration Output

เพื่อให้ใช้งานใน Jenkins, GitHub Actions หรือ GitLab CI ได้ดีขึ้น
**สิ่งที่ควรเพิ่ม:**

- **GitHub Actions Reporter:** output ในรูปแบบที่ GitHub Annotation อ่านได้ (ขีดเส้นใต้ไฟล์ที่แก้พัง)
- **JUnit XML Report:** export ผลลัพธ์เป็น xml เพื่อให้ CI tool แสดงผลเป็น Test Report ได้
- **Exit Code Control:** กำหนดได้ว่าถ้าเจอความเสี่ยงระดับ HIGH ให้ process exit 1 (fail build)

## 3. Visualization Graph

บางครั้ง Text output อธิบายได้ไม่เห็นภาพว่าทำไมแก้ไฟล์ A แล้วกระทบไฟล์ Z
**สิ่งที่ควรเพิ่ม:**

- สร้างไฟล์ Mermaid diagram (`.mmd`) แสดงเส้นทางการ dependency
- `npx sawrin --graph output.svg`
- ช่วยให้ dev เข้าใจ structure ของโปรเจคตัวเองได้ด้วย

## 4. Smart Caching

การ build dependency graph ทุกครั้งในโปรเจคใหญ่จะช้า
**สิ่งที่ควรเพิ่ม:**

- Cache dependency graph ไว้ใน `.cache/sawrin/`
- Re-analyze เฉพาะไฟล์ที่มีการเปลี่ยนแปลง (File watcher mode)
- ช่วยให้รันซ้ำได้เร็วขึ้นมาก (Instant feedback)

## 5. Plugin System

เพื่อให้รองรับ Framework อื่นๆ นอกเหนือจาก NestJS/Express/Bruno
**สิ่งที่ควรเพิ่ม:**

- เปิดช่องให้เขียน Plugin เสริมได้
- ตัวอย่าง: `sawrin-plugin-k6` (สำหรับ K6 load test), `sawrin-plugin-robot` (สำหรับ Robot Framework)

## 6. Monorepo Support (Nx / Turborepo)

โปรเจคสมัยใหม่มักเป็น Monorepo
**สิ่งที่ควรเพิ่ม:**

- เข้าใจ `package.json` หลายใบในโปรเจค
- วิเคราะห์ Cross-package dependency (แก้ Shared Lib -> กระทบ App A, App B)

## 7. Interactive Selection Mode

แทนที่จะแค่ report, ให้ช่วยรัน test เลย
**สิ่งที่ควรเพิ่ม:**

- `npx sawrin --interactive`
- แสดง list test ที่กระทบ แล้วให้ติวเลือกเพื่อสั่งรัน test ทันที

## 8.Support Makefile and Taskfile

- รองรับการอ่านคำสั่งจาก Makefile และ Taskfile (go-task)
- รองรับการสั่งรันคำสั่งจาก Makefile และ Taskfile (go-task)

## สรุปลำดับความสำคัญ (Priority)

1. **Config & CI Integration** (สำคัญสุดเพื่อให้ทีมนำไปใช้ใน workflow จริงได้)
2. **Smart Caching** (จำเป็นถ้าโปรเจคเริ่มใหญ่)
3. **Monorepo Support** (จำเป็นถ้าองค์กรใช้ Monorepo)
