# Sawrin Tutorial (Thai)

## ภาพรวม

Sawrin เป็นเครื่องมือ CLI สำหรับวิเคราะห์ git diff และระบุว่า test ใดได้รับผลกระทบจากการเปลี่ยนแปลงโค้ด ใช้ heuristics ไม่ใช่ AI

## การติดตั้ง

```bash
cd your-project
npm install sawrin
```

หรือรันโดยตรง:

```bash
npx sawrin
```

## การใช้งานพื้นฐาน

### วิเคราะห์การเปลี่ยนแปลงที่ยังไม่ commit

```bash
npx sawrin
```

วิเคราะห์การเปลี่ยนแปลงเทียบกับ HEAD

### เปรียบเทียบกับ branch

```bash
npx sawrin --base main
```

เปรียบเทียบ HEAD ปัจจุบันกับ branch `main`

### เปรียบเทียบ commit ที่ระบุ

```bash
npx sawrin --base HEAD~5 --head HEAD
```

วิเคราะห์การเปลี่ยนแปลงระหว่างสอง commit

### วิเคราะห์เฉพาะ staged changes

```bash
npx sawrin --staged
```

## รูปแบบ Output

### Output มาตรฐาน

```bash
npx sawrin
```

แสดงรายงานแบบมีสี

### Verbose Output

```bash
npx sawrin --verbose
```

แสดงเหตุผลทั้งหมดสำหรับแต่ละ test ที่ได้รับผลกระทบ

### JSON Output

```bash
npx sawrin --json
```

แสดงผลเป็น JSON สำหรับใช้งานแบบโปรแกรม

## การใช้งานกับ Bruno

Sawrin ตรวจจับ Bruno API tests ที่ได้รับผลกระทบ ระบุ path:

```bash
npx sawrin --bruno ./api-tests
```

Path เริ่มต้นที่ค้นหา: `bruno/`, `api-tests/`, `tests/bruno/`

## การอ่าน Output

### Changed Files

รายการไฟล์ที่เปลี่ยนแปลงพร้อมประเภท:

- `+` เพิ่มใหม่
- `~` แก้ไข
- `-` ลบ
- `>` เปลี่ยนชื่อ

### Impacted Unit Tests

Tests ที่ตรวจพบจาก:

- ไฟล์ถูกแก้ไขโดยตรง
- Import dependency
- ชื่อไฟล์ตรงกัน
- อยู่ในโฟลเดอร์เดียวกัน

### Impacted API Tests

Bruno tests ที่จับคู่จาก:

- URL route ตรงกัน
- ชื่อโฟลเดอร์คล้ายกัน
- Tag ตรงกัน

### Risk Level

- **LOW**: เปลี่ยนแค่ test, module เดียว
- **MEDIUM**: shared services, auth files
- **HIGH**: core utilities, database, หลาย modules

## Heuristics Reference

| Heuristic         | กฎ                                           |
| ----------------- | -------------------------------------------- |
| Import Graph      | ไฟล์ที่ import ไฟล์ที่เปลี่ยนจะได้รับผลกระทบ |
| Naming Convention | `foo.ts` ตรงกับ `foo.spec.ts`, `foo.test.ts` |
| Folder Convention | Tests ใน `__tests__/` ตรงกับ parent folder   |
| Route Pattern     | Express/NestJS routes ตรงกับ Bruno URLs      |
| Risk Scoring      | Auth +4, Database +3, Config +2, Shared +2   |

## ตัวอย่างการใช้งาน

### CI Integration

```bash
# Exit with error ถ้า high risk
result=$(npx sawrin --json)
risk=$(echo $result | jq -r '.risk.level')
if [ "$risk" = "HIGH" ]; then
  echo "High risk change detected"
  exit 1
fi
```

### รันเฉพาะ Impacted Tests

```bash
# ดึงรายการ test files ที่ได้รับผลกระทบ
npx sawrin --json | jq -r '.impactedUnitTests[].path' > impacted.txt

# รันด้วย vitest
npx vitest run $(cat impacted.txt | tr '\n' ' ')
```

## ข้อจำกัด

- รองรับเฉพาะ TypeScript/JavaScript projects
- ความแม่นยำประมาณ 70% (ใช้ heuristic)
- ไม่มี coverage data integration
- ไม่มี deep AST analysis
