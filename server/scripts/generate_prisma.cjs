const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

console.log(`[PRISMA-GEN] Configuring datasource provider for ${targetProvider} (from DATABASE_URL protocol)...`);

schema = schema.replace(/provider\s*=\s*"(postgresql|sqlite)"/, `provider = "${targetProvider}"`);
fs.writeFileSync(schemaPath, schema, 'utf8');

try {
  execSync('npx prisma generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log(`[PRISMA-GEN] Prisma client generated successfully for ${targetProvider}.`);
} catch (e) {
  console.error('[PRISMA-GEN] Error generating Prisma client:', e);
  process.exit(1);
}
