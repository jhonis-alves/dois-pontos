import { config } from '../config.js';
import { openDatabase } from '../lib/db.js';
import { runMigrations } from '../lib/migrations.js';

const db = openDatabase(config.databasePath);

try {
  const result = runMigrations(db, config.migrationsDir);
  if (result.applied.length === 0) {
    console.log('Banco já está atualizado. Nenhuma migração pendente.');
  } else {
    console.log(`Migrações aplicadas: ${result.applied.join(', ')}`);
  }
  console.log(`Banco: ${config.databasePath}`);
} finally {
  db.close();
}
