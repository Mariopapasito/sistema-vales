import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Bitacora extends Model {
  public id!: number;
  public tipo!: 'station' | 'weekly';
  public nombre!: string;
  public estacion!: string;
  public fecha!: string;
  public folio!: string;
  public payload!: Record<string, any>;
  public userId!: number;
  public legacyId?: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Bitacora.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.ENUM('station', 'weekly'),
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    folio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    legacyId: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Bitacora',
    tableName: 'bitacoras',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['estacion'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default Bitacora;
