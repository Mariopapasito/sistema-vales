import sequelize from './database';

interface Migration {
  id: string;
  up: () => Promise<void>;
}

const hasColumn = async (table: string, column: string): Promise<boolean> => {
  const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\``);
  return Array.isArray(rows) && rows.some((row: any) => row.Field === column);
};

const hasIndex = async (table: string, index: string): Promise<boolean> => {
  const [rows] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
  return Array.isArray(rows) && rows.some((row: any) => row.Key_name === index);
};

const migrations: Migration[] = [
  {
    id: '001_push_subscriptions',
    up: async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh VARCHAR(255) NOT NULL,
          auth VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_endpoint (endpoint(255)),
          INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    },
  },
  {
    id: '002_bitacora_legacy_id',
    up: async () => {
      if (!(await hasColumn('bitacoras', 'legacyId'))) {
        await sequelize.query('ALTER TABLE bitacoras ADD COLUMN legacyId VARCHAR(191) NULL');
      }
      if (!(await hasIndex('bitacoras', 'bitacoras_user_legacy'))) {
        await sequelize.query('CREATE UNIQUE INDEX bitacoras_user_legacy ON bitacoras (userId, legacyId)');
      }
    },
  },
  {
    id: '003_user_roles',
    up: async () => {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN rol
        ENUM('jefe','sistemas','estacion','compras','almacen','constructora','marketing')
        NOT NULL DEFAULT 'estacion'
      `);
    },
  },
  {
    id: '004_nullable_user_station',
    up: async () => {
      await sequelize.query('ALTER TABLE users MODIFY COLUMN estacion VARCHAR(255) NULL');
    },
  },
  {
    id: '005_report_photo_type',
    up: async () => {
      if (!(await hasColumn('report_photos', 'tipo'))) {
        await sequelize.query(`
          ALTER TABLE report_photos
          ADD COLUMN tipo ENUM('estacion','jefe') NOT NULL DEFAULT 'estacion'
        `);
      }
      await sequelize.query("UPDATE report_photos SET tipo = 'estacion' WHERE tipo IS NULL OR tipo = ''");
    },
  },
  {
    id: '006_notification_comment_type',
    up: async () => {
      await sequelize.query(`
        ALTER TABLE notifications MODIFY COLUMN tipo
        ENUM('NEW_ORDER','ORDER_STATUS_CHANGED','CALENDAR_EVENT','SYSTEM','MENTION','COMMENT') NOT NULL
      `);
    },
  },
  {
    id: '007_monthly_order_types',
    up: async () => {
      await sequelize.query(`
        ALTER TABLE monthly_orders MODIFY COLUMN tipo
        ENUM('aceites','papeleria','limpieza','toner','imprenta') NOT NULL
      `);
    },
  },
];

export const runSchemaMigrations = async (): Promise<void> => {
  await sequelize.sync({ force: false, alter: false });
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(191) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [rows] = await sequelize.query('SELECT id FROM schema_migrations');
  const applied = new Set((rows as Array<{ id: string }>).map((row) => row.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    await migration.up();
    await sequelize.query('INSERT INTO schema_migrations (id) VALUES (?)', { replacements: [migration.id] });
  }
};
