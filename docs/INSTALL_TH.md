# คู่มือการติดตั้ง Sawrin

## การติดตั้งแบบ Internal Library

Sawrin ออกแบบเป็นเครื่องมือ internal สำหรับทีมพัฒนา ให้ clone, build, และติดตั้งในเครื่องก่อนนำไปใช้ในโปรเจคอื่น

## ความต้องการเบื้องต้น

- Node.js 18+
- npm หรือ pnpm
- Git

## ขั้นตอนการติดตั้ง

### 1. Clone Repository

```bash
git clone https://github.com/your-org/sawrin.git
cd sawrin
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

คอมไพล์ TypeScript ไปยัง `dist/` directory

### 4. Link แบบ Global

```bash
npm link
```

หลังจาก link แล้ว คำสั่ง `sawrin` จะใช้งานได้ทั่วทั้งเครื่อง

### 5. ตรวจสอบการติดตั้ง

```bash
sawrin --version
sawrin --help
```

## การใช้งานในโปรเจคอื่น

### วิธี A: npm link (สำหรับ Development)

ในโปรเจคที่ต้องการใช้งาน:

```bash
cd /path/to/your-project
npm link sawrin
```

จากนั้นรัน:

```bash
npx sawrin
```

### วิธี B: ติดตั้งจาก Local Path

```bash
cd /path/to/your-project
npm install /path/to/sawrin
```

### วิธี C: ติดตั้งจาก Git URL

```bash
npm install git+https://github.com/your-org/sawrin.git
```

### วิธี D: Pack แล้วติดตั้ง

ใน sawrin directory:

```bash
npm pack
```

สร้างไฟล์ `sawrin-0.1.0.tgz` จากนั้นติดตั้งในโปรเจคเป้าหมาย:

```bash
npm install /path/to/sawrin-0.1.0.tgz
```

## การอัปเดต

### หลังจากมีการเปลี่ยนแปลงโค้ด

```bash
cd /path/to/sawrin
git pull
npm install
npm run build
```

ถ้าใช้ npm link การเปลี่ยนแปลงจะมีผลทันที

ถ้าใช้ local install ต้องติดตั้งใหม่:

```bash
cd /path/to/your-project
npm install /path/to/sawrin
```

## การถอนการติดตั้ง

### ลบ Global Link

```bash
cd /path/to/sawrin
npm unlink -g
```

### ลบจากโปรเจค

```bash
cd /path/to/your-project
npm unlink sawrin
# หรือ
npm uninstall sawrin
```

## การแก้ปัญหา

### Command Not Found

ตรวจสอบว่า npm global bin อยู่ใน PATH:

```bash
npm bin -g
# เพิ่ม path นี้ใน PATH environment variable
```

### Permission Errors (Linux/Mac)

```bash
sudo npm link
```

หรือตั้งค่า npm ให้ใช้ directory อื่น:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### TypeScript Errors ตอน Build

```bash
rm -rf node_modules dist
npm install
npm run build
```
