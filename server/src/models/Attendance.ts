import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import type { Shift } from '../domain/attendance';

const id = { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true };
const integer = { type: DataTypes.INTEGER, allowNull: false };
const text = { type: DataTypes.STRING(255), allowNull: false };
const json = { type: DataTypes.JSON, allowNull: false };

export class AttendanceStation extends Model {
  declare id: number; declare name: string; declare timeZone: string;
}
// Sequelize mutates attribute definitions (including field names). Never share an attribute object.
AttendanceStation.init({ id: { ...id }, name: { ...text, unique: true }, timeZone: { ...text, defaultValue: 'America/Mexico_City' } }, { sequelize, tableName: 'attendance_stations' });

// Authority is bound to a stable account id, never the editable users.estacion field.
export class AttendanceStationUser extends Model {
  declare userId: number; declare stationId: number;
}
AttendanceStationUser.init({ userId: { ...integer, primaryKey: true }, stationId: { ...integer } }, { sequelize, tableName: 'attendance_station_users' });

export class AttendanceEmployee extends Model {
  declare id: number; declare stationId: number; declare number: string; declare name: string;
  declare photo: string | null; declare active: boolean; declare version: number;
}
AttendanceEmployee.init({ id: { ...id }, stationId: { ...integer }, number: { ...text, unique: true }, name: { ...text },
  photo: { type: DataTypes.TEXT('medium'), allowNull: true }, active: { type: DataTypes.BOOLEAN, defaultValue: true },
  version: { ...integer, defaultValue: 1 },
}, { sequelize, tableName: 'attendance_employees', indexes: [{ fields: ['stationId', 'active'] }] });

export class AttendanceWeek extends Model {
  declare id: number; declare stationId: number; declare weekStart: string; declare status: 'draft' | 'submitted' | 'approved';
  declare plan: Shift[]; declare version: number; declare toleranceMinutes: number;
  declare approvedBy: number | null; declare approvedAt: Date | null;
}
AttendanceWeek.init({ id: { ...id }, stationId: { ...integer }, weekStart: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'approved'), allowNull: false, defaultValue: 'draft' },
  plan: { ...json }, version: { ...integer, defaultValue: 1 }, toleranceMinutes: { ...integer, defaultValue: 15 },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true }, approvedAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'attendance_weeks', indexes: [{ unique: true, fields: ['stationId', 'weekStart'] }] });

export class AttendanceChange extends Model {
  declare id: number; declare weekId: number; declare baseVersion: number; declare proposedPlan: Shift[];
  declare reason: string; declare requestedBy: number; declare status: string; declare decisionReason: string | null;
}
AttendanceChange.init({ id: { ...id }, weekId: { ...integer }, baseVersion: { ...integer }, proposedPlan: { ...json }, reason: { type: DataTypes.TEXT, allowNull: false },
  requestedBy: { ...integer }, status: { ...text, defaultValue: 'pending' }, decidedBy: { type: DataTypes.INTEGER, allowNull: true },
  decisionReason: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'attendance_changes', indexes: [{ fields: ['weekId', 'status'] }] });

export class AttendancePunch extends Model {
  declare id: number; declare weekId: number; declare employeeId: number; declare date: string;
  declare kind: 'entry' | 'exit'; declare occurredAt: Date; declare source: string; declare reason: string;
  declare requestId: string; declare createdBy: number; declare shiftSnapshot: Shift; declare scheduleVersion: number;
}
AttendancePunch.init({ id: { ...id }, weekId: { ...integer }, employeeId: { ...integer }, date: { type: DataTypes.DATEONLY, allowNull: false },
  kind: { type: DataTypes.ENUM('entry', 'exit'), allowNull: false }, occurredAt: { type: DataTypes.DATE, allowNull: false },
  source: { ...text, defaultValue: 'manual_rh' }, reason: { type: DataTypes.TEXT, allowNull: false }, createdBy: { ...integer },
  requestId: { type: DataTypes.STRING(64), allowNull: false, unique: true }, shiftSnapshot: { ...json }, scheduleVersion: { ...integer },
}, { sequelize, tableName: 'attendance_punches', updatedAt: false, indexes: [{ unique: true, fields: ['weekId', 'employeeId', 'date', 'kind'] }] });

export class AttendanceCorrection extends Model {
  declare id: number; declare punchId: number; declare occurredAt: Date | null; declare reason: string;
}
AttendanceCorrection.init({ id: { ...id }, punchId: { ...integer }, occurredAt: { type: DataTypes.DATE, allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: false }, createdBy: { ...integer },
}, { sequelize, tableName: 'attendance_corrections', updatedAt: false, indexes: [{ fields: ['punchId'] }] });

export class AttendanceAudit extends Model {}
AttendanceAudit.init({ id: { ...id }, actorId: { ...integer }, actorName: { ...text }, action: { ...text }, entity: { ...text }, entityId: { ...integer },
  before: { type: DataTypes.JSON, allowNull: true }, after: { type: DataTypes.JSON, allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: false },
}, { sequelize, tableName: 'attendance_audit', updatedAt: false, indexes: [{ fields: ['entity', 'entityId'] }] });

// Private PDFs: never stored in public/ or returned by metadata listings.
export class AttendanceDocument extends Model {
  declare id: number; declare stationId: number; declare employeeId: number | null;
  declare category: string; declare title: string; declare filename: string;
  declare size: number; declare sha256: string; declare content: Buffer; declare uploadedBy: number;
}
AttendanceDocument.init({ id: { ...id }, stationId: { ...integer }, employeeId: { type: DataTypes.INTEGER, allowNull: true },
  category: { type: DataTypes.STRING(40), allowNull: false }, title: { ...text }, filename: { ...text },
  size: { ...integer }, sha256: { type: DataTypes.STRING(64), allowNull: false }, uploadedBy: { ...integer },
  content: { type: DataTypes.BLOB('long'), allowNull: false },
}, { sequelize, tableName: 'attendance_documents', updatedAt: false, indexes: [{ fields: ['stationId', 'createdAt'] }, { fields: ['stationId', 'category'] }] });
