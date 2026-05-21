import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class ActivityLog extends Model {
  public id!: number;
  public usuarioId!: number | null;
  public usuarioNombre!: string;
  public usuarioRol!: string;
  public accion!: string;
  public entidad!: string;
  public entidadId!: number | null;
  public detalle!: string;
  public ip!: string;
  public readonly createdAt!: Date;
}

ActivityLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuarioId: { type: DataTypes.INTEGER, allowNull: true },
    usuarioNombre: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Sistema' },
    usuarioRol: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '-' },
    accion: { type: DataTypes.STRING(100), allowNull: false },
    entidad: { type: DataTypes.STRING(50), allowNull: false },
    entidadId: { type: DataTypes.INTEGER, allowNull: true },
    detalle: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    ip: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '-' },
  },
  {
    sequelize,
    tableName: 'activity_logs',
    timestamps: true,
    updatedAt: false,
  }
);

export default ActivityLog;
