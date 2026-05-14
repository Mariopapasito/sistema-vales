import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class MaterialUsage extends Model {
  public id!: number;
  public workReportId!: number;
  public materialId!: number;
  public quantity!: number;
  public quantityReturned!: number;
  public costTotal?: number;
  public notes?: string;
}

MaterialUsage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    workReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'work_reports',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    materialId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'materials',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quantityReturned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    costTotal: {
      type: DataTypes.DECIMAL(10, 2),
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: 'MaterialUsage',
    tableName: 'material_usage',
    timestamps: true,
  }
);

export default MaterialUsage;
